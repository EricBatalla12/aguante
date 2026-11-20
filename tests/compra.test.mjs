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
  presupuestoParaMeses,
  preciosConTienda,
  proponer,
  proximosRecordatorios,
  repartir,
} from '../src/lib/compra.ts';
import { cadenasDeOsm, cantidadDe, deFilaPrecio, esAguaParaBeber, etiquetaTienda, juntarCatalogos, leerCatalogo } from '../src/lib/catalogo.ts';
import { readFileSync } from 'node:fs';
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

// ------------------------------------------------------------- Tiendas

// Respuestas reales de la búsqueda de Open Food Facts (Mercadona, 20/11/2026), recortadas
const json = (n) => JSON.parse(readFileSync(new URL(`./datos/off-mercadona-${n}.json`, import.meta.url), 'utf8'));

test('la etiqueta de la tienda es como la de Open Food Facts', () => {
  assert.equal(etiquetaTienda('El Corte Inglés'), 'el-corte-ingles');
  assert.equal(etiquetaTienda('  Dia  '), 'dia');
  assert.equal(etiquetaTienda('Más y Más'), 'mas-y-mas');
});

test('la cantidad sale del campo numérico o del texto', () => {
  assert.deepEqual(cantidadDe({ product_quantity: 1000, product_quantity_unit: 'g' }), { gramos: 1000 });
  assert.deepEqual(cantidadDe({ product_quantity: '6000', product_quantity_unit: 'ml' }), { litros: 6 });
  assert.deepEqual(cantidadDe({ quantity: '420 gr neto' }), { gramos: 420 });
  assert.deepEqual(cantidadDe({ quantity: '1,5 L' }), { litros: 1.5 });
  assert.deepEqual(cantidadDe({ quantity: '425' }), {});
});

test('de las conservas se quedan las que dan energía', () => {
  const c = leerCatalogo(json('conservas'), 'mercadona', 'lista');
  assert.ok(c.length >= 10, `solo ${c.length}`);
  for (const p of c) {
    assert.ok(p.kcal100g >= 80 && p.gramos > 0, p.nombre);
    assert.deepEqual(p.tiendas, ['mercadona']);
  }
  assert.ok(!c.some((p) => /^(pepinillos|champiñones)/i.test(p.nombre)));
  assert.ok(c.some((p) => /fabada/i.test(p.nombre)));
});

test('del arroz, el crudo de 250 g o más; del agua, sin gas y de 1,5 L o más', () => {
  const arroz = leerCatalogo(json('arroz'), 'mercadona', 'cocinar');
  assert.ok(arroz.length > 0);
  for (const p of arroz) assert.ok(p.kcal100g >= 300 && p.gramos >= 250, p.nombre);
  assert.ok(!arroz.some((p) => /cocido|risotto/i.test(p.nombre)));
  const agua = leerCatalogo(json('agua'), 'mercadona', 'agua');
  assert.ok(agua.length > 0);
  for (const p of agua) assert.ok(p.litros >= 1.5 && !/gas/i.test(p.nombre), p.nombre);
});

test('también se lee la respuesta de search.openfoodfacts.org', () => {
  const j = JSON.parse(readFileSync(new URL('./datos/sal-lidl-conservas.json', import.meta.url), 'utf8'));
  const c = leerCatalogo(j, 'lidl', 'lista');
  assert.ok(c.length >= 5, `solo ${c.length}`);
  assert.ok(c.every((p) => p.kcal100g >= 80 && p.gramos > 0 && p.tiendas[0] === 'lidl'));
  assert.ok(c.some((p) => p.marca && !p.marca.includes(',')));
});

test('agua para beber: sin gas, sin sabor y nada de gaseosas ni tónicas', () => {
  for (const n of ['Agua mineral grande Bronchales', 'Agua mineral natural sin gas', 'Agua de manantial'])
    assert.ok(esAguaParaBeber(n), n);
  // La que se coló en la primera carga de Mercadona (20/11/2026)
  for (const n of ['Gaseosa grande Hacendado', 'Agua con gas', 'Agua con sabor a limón', 'Tónica', 'Agua sin gas sabor fresa'])
    assert.ok(!esAguaParaBeber(n), n);
});

test('un producto de dos tiendas sale una vez, con las dos', () => {
  const a = { codigo: '1', nombre: 'Atún', tipo: 'lista', tiendas: ['mercadona'], gramos: 100, kcal100g: 200 };
  const juntos = juntarCatalogos([[a], [{ ...a, tiendas: ['dia'] }]]);
  assert.equal(juntos.length, 1);
  assert.deepEqual(juntos[0].tiendas, ['mercadona', 'dia']);
});

const atun = { codigo: '111', tipo: 'lista', nombre: 'Atún', gramos: 200, kcal100g: 250 }; // 500 kcal
const fabada = { codigo: '222', tipo: 'lista', nombre: 'Fabada', gramos: 400, kcal100g: 150 }; // 600 kcal
const arroz = { codigo: '333', tipo: 'cocinar', nombre: 'Arroz', gramos: 1000, kcal100g: 350 }; // 3.500 kcal
const garrafa = { codigo: '444', tipo: 'agua', nombre: 'Agua', litros: 8 };

test('con productos elegidos, lo que falta se reparte entre ellos', () => {
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
  // Atún fijado en 4 (2.000 kcal) y sin más elegidos: faltan 4.000 → 8 botes
  const lista = listaCompra({ ...entrada, faltanKcal: 6000 }, [{ ...atun, unidades: 4 }]);
  assert.equal(lista.find((a) => a.clave === 'prod:111').unidades, 4);
  assert.equal(lista.find((a) => a.clave === 'lista').unidades, Math.ceil(4000 / KCAL_BOTE));
});

test('el arroz elegido suma su agua de cocer, en proporción a su peso', () => {
  // 14.000 kcal: 6.000 sin cocinar y 8.000 de arroz de 3.500 → 3 kg, que piden 3 × 2,56 L
  const lista = listaCompra({ ...entrada, faltanKcal: 14000 }, [arroz, garrafa]);
  assert.equal(lista.find((a) => a.clave === 'prod:333').unidades, 3);
  assert.equal(lista.find((a) => a.clave === 'prod:444').unidades, Math.ceil((3 * 2.56) / 8));
  assert.deepEqual(aporteDe(arroz), { kcal: 3500, litrosCocer: 2.56 });
  // Sin cocina, el arroz elegido no entra
  assert.equal(listaCompra({ ...entrada, faltanKcal: 14000, sinCocina: true }, [arroz]).find((a) => a.clave === 'prod:333'), undefined);
});

test('proponer: cuatro conservas, un arroz y la garrafa más grande; con precio, lo que más rinde', () => {
  const catalogo = [
    ...leerCatalogo(json('conservas'), 'mercadona', 'lista'),
    ...leerCatalogo(json('arroz'), 'mercadona', 'cocinar'),
    ...leerCatalogo(json('agua'), 'mercadona', 'agua'),
  ];
  const p = proponer(catalogo);
  const conservas = p.filter((e) => e.tipo === 'lista');
  assert.equal(conservas.length, 4);
  // Sin repetir familia y de las que más energía tienen
  assert.equal(new Set(conservas.map((e) => e.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]+/)[0])).size, 4);
  assert.ok(conservas.every((e) => e.kcal100g >= 150), conservas.map((e) => `${e.nombre} ${e.kcal100g}`).join(', '));
  assert.equal(p.filter((e) => e.tipo === 'cocinar').length, 1);
  const agua = p.filter((e) => e.tipo === 'agua');
  assert.equal(agua.length, 1);
  assert.equal(agua[0].litros, Math.max(...catalogo.filter((c) => c.tipo === 'agua').map((c) => c.litros)));
  // Si una conserva tiene precio y rinde, va la primera
  const ultima = catalogo.filter((c) => c.tipo === 'lista').at(-1);
  const conPrecio = proponer(catalogo, { [`prod:${ultima.codigo}`]: 0.5 });
  assert.equal(conPrecio.find((e) => e.tipo === 'lista').codigo, ultima.codigo);
});

test('lo escaneado se reconoce: el mismo producto, o lo genérico de su tipo', () => {
  const lista = listaCompra({ ...entrada, faltanKcal: 6000, faltanLitros: 10 }, [atun]);
  assert.deepEqual(lineaDe({ codigo: '0111', categoria: 'comida' }, lista), { clave: 'prod:111', exacto: true });
  assert.deepEqual(lineaDe({ codigo: '999', categoria: 'agua' }, lista), { clave: 'agua', exacto: false });
  assert.equal(lineaDe({ codigo: '999', categoria: 'mascota' }, lista), null);
});

test('una fila de precios de la tienda se lee como producto, con su precio', () => {
  const p = deFilaPrecio({ tienda: 'mercadona', id: '5044', ean: '8480000050441', nombre: 'Arroz redondo', marca: 'Hacendado', tipo: 'cocinar', gramos: '1000', kcal100g: '344', precio: '1.15', enlace: 'https://tienda.mercadona.es/product/5044', actualizado: '2026-11-23T05:30:00Z' });
  assert.deepEqual(
    { codigo: p.codigo, gramos: p.gramos, kcal100g: p.kcal100g, precio: p.precio, fecha: p.fecha, tiendas: p.tiendas },
    { codigo: '8480000050441', gramos: 1000, kcal100g: 344, precio: 1.15, fecha: '2026-11-23', tiendas: ['mercadona'] },
  );
  // Sin código de barras, el de la tienda; sin precio o con un tipo raro, nada
  assert.equal(deFilaPrecio({ tienda: 'mercadona', id: '7', nombre: 'Agua', tipo: 'agua', litros: 8, precio: 1 }).codigo, 'mercadona-7');
  assert.equal(deFilaPrecio({ tienda: 'mercadona', id: '7', nombre: 'X', tipo: 'otro', precio: 1 }), null);
  assert.equal(deFilaPrecio({ tienda: 'mercadona', id: '8', nombre: 'Gaseosa grande Hacendado', tipo: 'agua', litros: 1.5, precio: 0.55 }), null);
  assert.equal(deFilaPrecio({ tienda: 'mercadona', id: '7', nombre: 'X', tipo: 'lista', precio: 0 }), null);
});

test('el precio que pone cada uno manda sobre el de la tienda', () => {
  const elegidos = [{ ...atun, precio: 1.2 }, { ...fabada, precio: 2 }];
  assert.deepEqual(preciosConTienda({ 'prod:111': 0.99 }, elegidos), { 'prod:111': 0.99, 'prod:222': 2 });
});

test('con precios de la tienda se propone lo que más da por euro', () => {
  const caro = { codigo: '1', tipo: 'lista', nombre: 'Bonito', tiendas: ['m'], gramos: 100, kcal100g: 300, precio: 3 }; // 100 kcal/€
  const barato = { codigo: '2', tipo: 'lista', nombre: 'Garbanzos', tiendas: ['m'], gramos: 400, kcal100g: 120, precio: 0.8 }; // 600 kcal/€
  const p = proponer([caro, barato], {}, { agua: 1, lista: 1, cocinar: 1 });
  assert.equal(p[0].codigo, '2');
  assert.equal(p[0].precio, 0.8);
});

test('las cadenas cercanas salen de OpenStreetMap, de más a menos tiendas', () => {
  // Supermercados a 1,5 km del centro de Alicante (Overpass, 20/11/2026)
  const osm = JSON.parse(readFileSync(new URL('./datos/osm-alicante.json', import.meta.url), 'utf8'));
  const cadenas = [
    { clave: 'mercadona', nombre: 'Mercadona' },
    { clave: 'carrefour', nombre: 'Carrefour' },
    { clave: 'spar', nombre: 'Spar' },
  ];
  const c = cadenasDeOsm(osm, cadenas);
  assert.deepEqual(c[0], { clave: 'mercadona', nombre: 'Mercadona', tiendas: 7 });
  // «Carrefour City» cuenta como Carrefour
  assert.ok(c.some((x) => x.clave === 'carrefour'));
  assert.ok(!c.some((x) => x.clave === 'carrefour-city'));
  // Las que no se conocen salen con su nombre
  assert.ok(c.some((x) => x.nombre === 'masymas'));
  assert.deepEqual(cadenasDeOsm({ elements: [{ tags: {} }] }, cadenas), []);
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
