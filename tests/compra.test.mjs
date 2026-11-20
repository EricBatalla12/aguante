// Plan de compra por meses y avisos en el calendario.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  APORTE_REFERENCIA,
  KCAL_BOTE,
  KCAL_PAQUETE,
  LITROS_COCER_PAQUETE,
  aporteDe,
  gastadoEnMes,
  lineaDe,
  listaCompra,
  mesDe,
  mesReal,
  porReponer,
  esCodigoBarras,
  necesidades,
  presupuestoParaMeses,
  proximosRecordatorios,
  repartir,
  tipoDe,
} from '../src/lib/compra.ts';
import { GENERICOS } from '../src/constants/genericos.ts';
import { diaAviso, enlaceCalendario } from '../src/lib/calendario.ts';

// ------------------------------------------------------------- La lista

const entrada = {
  faltanLitros: 0,
  faltanKcal: 0,
  faltanKcalMascotas: 0,
  kcalDia: 2000,
  kcalSinCocinar: 0,
  objetivoDias: 7,
  sinCocina: false,
  kit: [],
  reponer: [],
};

test('las unidades de referencia salen de las kcal de genericos.ts', () => {
  const kcal = (fdc) => GENERICOS.find((g) => g.fdc === fdc).kcal100g;
  assert.equal(KCAL_BOTE, Math.round((400 * kcal(173800)) / 100));
  assert.equal(KCAL_PAQUETE, 10 * kcal(169756));
  // 2 tazas de 236,588 mL por cada 185 g de arroz
  assert.equal(LITROS_COCER_PAQUETE, 2.56);
});

test('sin nada que falte la lista está vacía', () => {
  assert.deepEqual(listaCompra(entrada), []);
});

test('los 3 primeros días van en comida sin cocinar y el resto se cocina', () => {
  // 7 días de 2.000 kcal: 6.000 sin cocinar (11 botes) y 8.000 para cocinar (3 paquetes)
  const lista = listaCompra({ ...entrada, faltanKcal: 14000 });
  const de = (c) => lista.find((a) => a.categoria === c)?.unidades ?? 0;
  assert.equal(de('lista'), Math.ceil(6000 / KCAL_BOTE));
  assert.equal(de('cocinar'), Math.ceil(8000 / KCAL_PAQUETE));
  // Cocer 3 kg de arroz pide 7,68 L: 2 garrafas
  assert.equal(de('agua'), 2);
});

test('lo que ya hay sin cocinar cuenta para esos 3 días', () => {
  const lista = listaCompra({ ...entrada, faltanKcal: 8000, kcalSinCocinar: 6000 });
  assert.equal(lista.find((a) => a.categoria === 'lista'), undefined);
  assert.equal(lista.find((a) => a.categoria === 'cocinar').unidades, 3);
});

test('sin cocina toda la comida es lista para comer y no hay agua de cocer', () => {
  const lista = listaCompra({ ...entrada, faltanKcal: 14000, faltanLitros: 10, sinCocina: true });
  assert.equal(lista.find((a) => a.categoria === 'cocinar'), undefined);
  assert.equal(lista.find((a) => a.categoria === 'lista').unidades, Math.ceil(14000 / KCAL_BOTE));
  assert.equal(lista.find((a) => a.categoria === 'agua').unidades, 2);
});

test('mascotas como un lote, el kit uno a uno y las reposiciones con su mes', () => {
  const lista = listaCompra({
    ...entrada,
    faltanKcalMascotas: 300,
    kit: [{ id: 'radio', que: 'Radio a pilas o de dinamo' }],
    reponer: [{ id: 'p1', nombre: 'Atún', unidades: 3, mes: 1 }],
  });
  assert.deepEqual(
    lista.map((a) => [a.clave, a.unidades]),
    [
      ['reponer:p1', 3],
      ['mascotas', 1],
      ['kit:radio', 1],
    ],
  );
  assert.equal(lista[0].mes, 1);
});

// ------------------------------------------------------------- Meses y reposiciones

test('meses contados desde el de hoy', () => {
  const hoy = new Date(2026, 10, 20); // noviembre
  assert.equal(mesDe('2026-11-30', hoy), 0);
  assert.equal(mesDe('2027-01-01', hoy), 2);
  assert.deepEqual(mesReal(2, hoy), { anio: 2027, mes: 1 });
  assert.deepEqual(mesReal(0, hoy), { anio: 2026, mes: 11 });
});

test('se repone lo que caduca dentro del plan, no lo caducado ni lo de después', () => {
  const hoy = new Date(2026, 10, 20);
  const productos = [
    { id: 'a', nombre: 'Atún', cantidad: 2.5, caducidad: '2027-01-15' },
    { id: 'b', nombre: 'Caducado', cantidad: 1, caducidad: '2026-11-01' },
    { id: 'c', nombre: 'Lejos', cantidad: 1, caducidad: '2027-02-01' },
    { id: 'd', nombre: 'Gastado', cantidad: 0, caducidad: '2026-12-01' },
    { id: 'e', nombre: 'Sin fecha', cantidad: 4 },
  ];
  assert.deepEqual(porReponer(productos, hoy, 3), [{ id: 'a', nombre: 'Atún', unidades: 3, mes: 2 }]);
});

// ------------------------------------------------------------- El reparto

// Una garrafa (5 L) da 0,5 días y un bote (556 kcal), 0,1
const dias = { agua: 3, comida: 6, porLitro: 0.1, porKcal: 0.1 / 556 };
const precios = { agua: 1, lista: 2, cocinar: 1.5, mascotas: 12, 'kit:radio': 25 };

test('sin nada que comprar no hay meses', () => {
  const plan = repartir({ articulos: [], precios, presupuesto: 10, dias });
  assert.deepEqual(plan.meses, []);
  assert.equal(plan.mesDias, null);
});

test('empieza por lo que menos días da y no se pasa del presupuesto', () => {
  const articulos = [
    { clave: 'agua', categoria: 'agua', unidades: 8 },
    { clave: 'lista', categoria: 'lista', unidades: 4 },
  ];
  const plan = repartir({ articulos, precios, presupuesto: 10, dias });
  for (const m of plan.meses) assert.ok(m.coste <= 10);
  // Mes 1: 6 garrafas (agua 3 → 6); empatan y va agua (6,5 días, 7 €); toca comida (9 €); el bote ya no
  // cabe, pero la última garrafa sí (10 €)
  assert.deepEqual(plan.meses[0], {
    indice: 0,
    lineas: [
      { clave: 'agua', unidades: 8, coste: 8 },
      { clave: 'lista', unidades: 1, coste: 2 },
    ],
    coste: 10,
  });
  assert.equal(plan.total, 16);
  assert.equal(plan.mesDias, 1);
});

test('lo que no hay que cocinar va antes que lo que se cocina, y el kit al final', () => {
  const articulos = [
    { clave: 'kit:radio', categoria: 'kit', unidades: 1 },
    { clave: 'cocinar', categoria: 'cocinar', unidades: 1 },
    { clave: 'lista', categoria: 'lista', unidades: 1 },
  ];
  // 26 €: arroz y bote (3,5 €) entran; la radio de 25 € ya no cabe y pasa al mes siguiente
  const plan = repartir({ articulos, precios, presupuesto: 26, dias: { ...dias, agua: 10 } });
  assert.ok(APORTE_REFERENCIA.cocinar.litrosCocer > 0);
  assert.deepEqual(
    plan.meses[0].lineas.map((l) => l.clave),
    ['lista', 'cocinar'],
  );
  assert.deepEqual(plan.meses[1].lineas.map((l) => l.clave), ['kit:radio']);
  assert.equal(plan.mesDias, 0);
  assert.equal(plan.mesFin, 1);
});

test('las reposiciones se compran el mes en que caducan y van primero', () => {
  const articulos = [
    { clave: 'reponer:p1', categoria: 'reponer', unidades: 2, mes: 1 },
    { clave: 'agua', categoria: 'agua', unidades: 20 },
  ];
  const plan = repartir({ articulos, precios: { ...precios, 'reponer:p1': 3 }, presupuesto: 10, dias });
  assert.deepEqual(plan.meses[0].lineas, [{ clave: 'agua', unidades: 10, coste: 10 }]);
  assert.deepEqual(plan.meses[1].lineas, [
    { clave: 'reponer:p1', unidades: 2, coste: 6 },
    { clave: 'agua', unidades: 4, coste: 4 },
  ]);
});

test('este mes cuenta lo ya gastado', () => {
  const articulos = [{ clave: 'agua', categoria: 'agua', unidades: 5 }];
  const plan = repartir({ articulos, precios, presupuesto: 4, gastadoEsteMes: 3, dias });
  assert.deepEqual(
    plan.meses.map((m) => [m.indice, m.coste]),
    [
      [0, 1],
      [1, 4],
    ],
  );
});

test('sin precio no entra, y lo que no cabe en un mes se avisa', () => {
  const articulos = [
    { clave: 'agua', categoria: 'agua', unidades: 1 },
    { clave: 'kit:linterna', categoria: 'kit', unidades: 1 },
    { clave: 'kit:radio', categoria: 'kit', unidades: 1 },
  ];
  const plan = repartir({ articulos, precios, presupuesto: 20, dias });
  assert.deepEqual(plan.sinPrecio, ['kit:linterna']);
  assert.deepEqual(plan.noCaben, ['kit:radio']);
  assert.equal(plan.total, 1);
});

test('más de diez años de compras no se planifica', () => {
  const articulos = [{ clave: 'agua', categoria: 'agua', unidades: 2000 }];
  assert.equal(repartir({ articulos, precios, presupuesto: 1, dias }).demasiado, true);
});

test('para una fecha: el presupuesto más bajo que acaba a tiempo', () => {
  // 12 garrafas de 1 € en 3 meses: 4 € al mes
  const articulos = [{ clave: 'agua', categoria: 'agua', unidades: 12 }];
  const r = presupuestoParaMeses({ articulos, precios, dias }, 3);
  assert.equal(r.presupuesto, 4);
  assert.equal(r.plan.mesFin, 2);
  // Con un artículo indivisible de 25 € y 3 € de agua en 2 meses: 25 € al mes
  const r2 = presupuestoParaMeses(
    { articulos: [...articulos.map((a) => ({ ...a, unidades: 3 })), { clave: 'kit:radio', categoria: 'kit', unidades: 1 }], precios, dias },
    2,
  );
  assert.equal(r2.presupuesto, 25);
  assert.equal(presupuestoParaMeses({ articulos: [{ clave: 'kit:x', categoria: 'kit', unidades: 1 }], precios, dias }, 2), null);
});

test('lo gastado por meses y los recordatorios del día de compra', () => {
  const hoy = new Date(2026, 10, 20, 12);
  const hechas = [
    { fecha: '2026-11-02', coste: 4.5 },
    { fecha: '2026-11-19', coste: 1.25 },
    { fecha: '2026-10-30', coste: 9 },
  ];
  assert.equal(gastadoEnMes(hechas, 0, hoy), 5.75);
  assert.equal(gastadoEnMes(hechas, -1, hoy), 9);
  // El día 5 de este mes ya pasó: el primero es el 5 de diciembre
  const f = proximosRecordatorios(5, hoy);
  assert.deepEqual(
    f.map((d) => [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()]),
    [
      [2026, 12, 5, 10],
      [2027, 1, 5, 10],
      [2027, 2, 5, 10],
    ],
  );
  assert.equal(proximosRecordatorios(31, hoy)[0].getDate(), 28);
});

// ------------------------------------------------------------- Tu lista

const atun = { codigo: '111', tipo: 'lista', nombre: 'Atún', gramos: 200, kcal100g: 250 }; // 500 kcal
const fabada = { codigo: '222', tipo: 'lista', nombre: 'Fabada', gramos: 400, kcal100g: 150 }; // 600 kcal
const arroz = { codigo: '333', tipo: 'cocinar', nombre: 'Arroz', gramos: 1000, kcal100g: 350 }; // 3.500 kcal
const garrafa = { codigo: '444', tipo: 'agua', nombre: 'Agua', litros: 8 };

test('con productos en tu lista, lo que falta se reparte entre ellos', () => {
  // 3 primeros días de 2.000 kcal sin cocinar: 6.000 kcal entre atún y fabada
  const lista = listaCompra({ ...entrada, faltanKcal: 6000, faltanLitros: 20 }, [atun, fabada, garrafa]);
  const de = (clave) => lista.find((a) => a.clave === clave)?.unidades ?? 0;
  const kcal = de('prod:111') * 500 + de('prod:222') * 600;
  assert.ok(kcal >= 6000 && kcal < 6000 + 600, String(kcal));
  assert.ok(Math.abs(de('prod:111') - de('prod:222')) <= 1);
  assert.equal(de('lista'), 0);
  // 20 L en garrafas de 8: 3
  assert.equal(de('prod:444'), 3);
  assert.equal(de('agua'), 0);
});

test('las unidades fijadas a mano cuentan y lo que no se cubre va en referencia', () => {
  // Atún fijado en 4 (2.000 kcal) y sin más productos: faltan 4.000 → 8 botes
  const lista = listaCompra({ ...entrada, faltanKcal: 6000 }, [{ ...atun, unidades: 4 }]);
  assert.equal(lista.find((a) => a.clave === 'prod:111').unidades, 4);
  assert.equal(lista.find((a) => a.clave === 'lista').unidades, Math.ceil(4000 / KCAL_BOTE));
});

test('el arroz de tu lista suma su agua de cocer, en proporción a su peso', () => {
  // 14.000 kcal: 6.000 sin cocinar y 8.000 de arroz de 3.500 → 3 kg, que piden 3 × 2,56 L
  const lista = listaCompra({ ...entrada, faltanKcal: 14000 }, [arroz, garrafa]);
  assert.equal(lista.find((a) => a.clave === 'prod:333').unidades, 3);
  assert.equal(lista.find((a) => a.clave === 'prod:444').unidades, Math.ceil((3 * 2.56) / 8));
  assert.deepEqual(aporteDe(arroz), { kcal: 3500, litrosCocer: 2.56 });
  // Sin cocina, el arroz de la lista no entra
  assert.equal(listaCompra({ ...entrada, faltanKcal: 14000, sinCocina: true }, [arroz]).find((a) => a.clave === 'prod:333'), undefined);
});

test('lo escaneado se reconoce: el mismo producto, o lo genérico de su tipo', () => {
  const lista = listaCompra({ ...entrada, faltanKcal: 6000, faltanLitros: 10 }, [atun]);
  assert.deepEqual(lineaDe({ codigo: '0111', categoria: 'comida' }, lista), { clave: 'prod:111', exacto: true });
  assert.deepEqual(lineaDe({ codigo: '999', categoria: 'agua' }, lista), { clave: 'agua', exacto: false });
  assert.equal(lineaDe({ codigo: '999', categoria: 'mascota' }, lista), null);
});

test('lo que falta de cada tipo, con el agua de cocer lo que se compra', () => {
  // 14.000 kcal: 6.000 sin cocinar y 8.000 para cocinar; en paquetes de arroz de 3.650 → 3, que piden 3 × 2,56 L
  const n = necesidades({ ...entrada, faltanKcal: 14000, faltanLitros: 10 });
  assert.equal(n.lista, 6000);
  assert.equal(n.cocinar, 8000);
  assert.ok(Math.abs(n.agua - (10 + 3 * LITROS_COCER_PAQUETE)) < 1e-9);
  // Sin cocina, toda la comida es lista para comer y no hay agua de cocer
  assert.deepEqual(necesidades({ ...entrada, faltanKcal: 14000, faltanLitros: 10, sinCocina: true }), { agua: 10, lista: 14000, cocinar: 0 });
});

test('lo de la despensa va a su tipo y solo los códigos de barras cuentan como tales', () => {
  assert.equal(tipoDe({ categoria: 'agua' }), 'agua');
  assert.equal(tipoDe({ categoria: 'comida' }), 'lista');
  assert.equal(tipoDe({ categoria: 'comida', necesitaCocinar: true }), 'cocinar');
  assert.equal(tipoDe({ categoria: 'mascota' }), null);
  assert.ok(esCodigoBarras('8480000050441'));
  assert.ok(!esCodigoBarras('man:abc123'));
  assert.ok(!esCodigoBarras(undefined));
});

test('algo de la despensa sin peso aporta las kcal de su unidad y el agua de cocer que tenga', () => {
  assert.deepEqual(aporteDe({ codigo: 'man:1', tipo: 'lista', nombre: 'Potaje', kcal: 700 }), { kcal: 700 });
  assert.deepEqual(aporteDe({ codigo: 'man:2', tipo: 'cocinar', nombre: 'Lentejas', kcal: 3520, litrosCocer: 3 }), { kcal: 3520, litrosCocer: 3 });
  // Con peso y kcal por 100 g manda lo de la etiqueta
  assert.equal(aporteDe({ codigo: '1', tipo: 'lista', nombre: 'Atún', gramos: 80, kcal100g: 198 }).kcal, 158.4);
});

// ------------------------------------------------------------- Calendario

test('el aviso del calendario va 60 días antes, o hoy si ya queda menos', () => {
  const hoy = new Date(2026, 10, 16);
  assert.equal(diaAviso('2027-03-01', hoy), '2026-12-31');
  assert.equal(diaAviso('2026-12-01', hoy), '2026-11-16');
});

test('el enlace crea un evento de día entero con el título y el detalle', () => {
  const url = new URL(enlaceCalendario({ titulo: 'Gastar: atún', detalle: 'Caduca el 1 de marzo', dia: '2026-12-31' }));
  assert.equal(url.origin + url.pathname, 'https://calendar.google.com/calendar/render');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
  assert.equal(url.searchParams.get('text'), 'Gastar: atún');
  assert.equal(url.searchParams.get('details'), 'Caduca el 1 de marzo');
  assert.equal(url.searchParams.get('dates'), '20261231/20270101');
});
