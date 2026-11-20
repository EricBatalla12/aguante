// Tests del motor de cálculo. Se ejecutan con `npm test` (node --test).
// Las cifras de referencia salen de las tablas de FAO citadas en
// docs/fuentes-y-reglas.md.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  bmrAdulto,
  kcalMenor,
  kcalBase,
  kcalPersona,
  aguaPersona,
  aguaBeber,
  aguaEFSA,
  aguaDesglose,
  aguaMascota,
  calcular,
  calcularFaltante,
  estadoCaducidad,
  formatoNumero,
  planDelDia,
  descontarAgua,
  limiteDias,
  ordenarParaComer,
  simularConsumo,
  devolverAgua,
  productosConCodigo,
} from '../src/lib/calculo.ts';
import { gastarEstaSemana, proximosLunes } from '../src/lib/calculo.ts';

const HOY = new Date(2026, 10, 11); // 11 nov 2026

const cerca = (real, esperado, tolerancia, msg) =>
  assert.ok(Math.abs(real - esperado) <= tolerancia, `${msg}: ${real} vs ${esperado} ±${tolerancia}`);

const hombre = { id: 'h', nombre: 'H', sexo: 'hombre', edadAnios: 25, pesoKg: 75 };
const mujer = { id: 'm', nombre: 'M', sexo: 'mujer', edadAnios: 29, pesoKg: 62 };
const nina = { id: 'n', nombre: 'N', sexo: 'mujer', edadAnios: 6, pesoKg: 21 };
const perro = { id: 'p', nombre: 'Toby', especie: 'perro', pesoKg: 18 };

test('Schofield adulto coincide con la tabla 5.2 de FAO', () => {
  cerca(bmrAdulto('hombre', 25, 75), 15.057 * 75 + 692.2, 0.01, 'hombre 18-30');
  cerca(bmrAdulto('mujer', 45, 60), 8.126 * 60 + 845.6, 0.01, 'mujer 30-60');
  cerca(bmrAdulto('hombre', 70, 70), 11.711 * 70 + 587.7, 0.01, 'hombre 60+');
});

test('menores: se acerca a las tablas 4.5 y 4.6 de FAO (actividad ligera, 6-7 años)', () => {
  // FAO: niño de 21,7 kg → 1.350 kcal; niña de 20,6 kg → 1.225 kcal
  cerca(kcalMenor('hombre', 21.7), 1350, 30, 'niño 6-7');
  cerca(kcalMenor('mujer', 20.6), 1225, 30, 'niña 6-7');
});

test('un adulto se raciona según el modo', () => {
  const base = kcalBase(hombre);
  cerca(kcalPersona(hombre, 'severo'), base * 0.7, 0.01, 'severo');
  cerca(kcalPersona(hombre, 'extremo'), base * 0.5, 0.01, 'extremo');
});

test('niños, embarazo, lactancia y «no racionar» no se racionan', () => {
  const embarazada = { ...mujer, embarazoTrimestre: 3 };
  const lactante = { ...mujer, lactancia: true };
  const marcado = { ...hombre, noRacionar: true };
  for (const p of [nina, embarazada, lactante, marcado]) {
    assert.equal(kcalPersona(p, 'extremo'), kcalBase(p), p.nombre);
  }
  cerca(kcalBase(embarazada) - kcalBase(mujer), 475, 0.01, 'extra 3.er trimestre');
  cerca(kcalBase(lactante) - kcalBase(mujer), 505, 0.01, 'extra lactancia');
});

test('el agua para beber nunca baja, en ningún modo; solo se recorta la higiene', () => {
  const beber = aguaBeber(hombre);
  cerca(aguaPersona(hombre, 'normal'), beber + 1.5, 1e-9, 'normal');
  cerca(aguaPersona(hombre, 'ligero'), beber + 0.5, 1e-9, 'ligero');
  assert.equal(aguaPersona(hombre, 'severo'), beber);
  assert.equal(aguaPersona(hombre, 'extremo'), beber);
  // Mujer de 62 kg sedentaria: gasta menos de 2.000 kcal, así que manda la EFSA
  assert.equal(aguaPersona(mujer, 'extremo'), 2.0);
});

test('beber: la EFSA es el suelo y 1 mL por kcal lo sube con el peso', () => {
  const grande = { ...hombre, id: 'g', pesoKg: 115 };
  assert.equal(aguaEFSA(grande), 2.5);
  cerca(aguaBeber(grande), kcalBase(grande) / 1000, 1e-9, 'por energía');
  assert.ok(aguaBeber(grande) > 3, 'un hombre de 115 kg bebe más de 3 L');
  // Una niña pequeña gasta poco: manda la tabla de la EFSA
  assert.equal(aguaBeber(nina), aguaEFSA(nina));
});

test('con calor se duplica lo que se bebe y la higiene se sigue sumando', () => {
  const beber = aguaBeber(hombre);
  cerca(aguaBeber(hombre, { calor: true }), beber * 2, 1e-9, 'beber con calor');
  cerca(aguaPersona(hombre, 'normal', { calor: true }), beber * 2 + 1.5, 1e-9, 'normal con calor');
  cerca(aguaPersona(hombre, 'extremo', { calor: true }), beber * 2, 1e-9, 'extremo con calor');
});

test('actividad: sedentaria por defecto; normal sube kcal y agua', () => {
  assert.equal(kcalBase(hombre), kcalBase(hombre, { actividad: 'sedentaria' }));
  cerca(kcalBase(hombre, { actividad: 'normal' }) / kcalBase(hombre), 1.6 / 1.4, 1e-9, 'adulto PAL');
  cerca(kcalBase(nina, { actividad: 'normal' }) / kcalBase(nina), 1 / 0.85, 1e-9, 'menor sin el −15 %');
  assert.ok(aguaBeber(hombre, { actividad: 'normal' }) > aguaBeber(hombre));
  cerca(kcalPersona(hombre, 'severo', {}, { actividad: 'normal' }), kcalBase(hombre, { actividad: 'normal' }) * 0.7, 0.01, 'severo');
  const r = calcular([hombre], [], [], 'normal', { actividad: 'normal' }, HOY);
  cerca(r.kcalDia, kcalBase(hombre, { actividad: 'normal' }), 0.01, 'calcular usa la actividad');
});

test('el resultado separa beber e higiene', () => {
  const r = calcular([hombre, mujer], [perro], [], 'normal', {}, HOY);
  cerca(r.litrosHigieneDia, 3, 1e-9, 'higiene de dos personas');
  cerca(r.litrosBeberDia, aguaBeber(hombre) + aguaBeber(mujer) + aguaMascota(perro), 1e-9, 'beber');
  cerca(r.litrosDia, r.litrosBeberDia + r.litrosHigieneDia, 1e-9, 'total');
  const extremo = calcular([hombre], [], [], 'extremo', {}, HOY);
  assert.equal(extremo.litrosHigieneDia, 0);
  // En manual por debajo de lo que se bebe, la higiene es 0 (no negativa)
  assert.deepEqual(aguaDesglose(hombre, 'manual', {}, { h: { litros: 1 } }), { beber: 1, higiene: 0 });
});

test('un bebé no cuenta comida, pero sí agua', () => {
  const bebe = { id: 'b', nombre: 'B', sexo: 'mujer', edadAnios: 0.5, pesoKg: 7 };
  assert.equal(kcalBase(bebe), 0);
  const r = calcular([bebe], [], [], 'normal', {}, HOY);
  assert.equal(r.hayBebe, true);
});

test('perro de 18 kg: unos 0,98 L de agua (regla de 50-60 mL/kg)', () => {
  cerca(aguaMascota(perro), 0.98, 0.02, 'agua perro');
});

const despensa = [
  { id: '1', nombre: 'Albóndigas', categoria: 'comida', cantidad: 2, kcalPorUnidad: 546, caducidad: '2029-03-15' },
  { id: '2', nombre: 'Arroz', categoria: 'comida', cantidad: 2, kcalPorUnidad: 3500, caducidad: '2027-12-01', necesitaCocinar: true, aguaCocinarPorUnidadL: 2.5 },
  { id: '3', nombre: 'Yogures', categoria: 'comida', cantidad: 4, kcalPorUnidad: 100, caducidad: '2026-11-20', necesitaFrio: true },
  { id: '4', nombre: 'Galletas viejas', categoria: 'comida', cantidad: 1, kcalPorUnidad: 3500, caducidad: '2026-10-01' },
  { id: '5', nombre: 'Garrafas', categoria: 'agua', cantidad: 6, litrosPorUnidad: 5 },
  { id: '6', nombre: 'Pienso', categoria: 'mascota', cantidad: 1, kcalPorUnidad: 10500 },
];

test('balance: no cuenta lo caducado y descuenta el agua para cocinar', () => {
  const r = calcular([hombre], [], despensa, 'normal', {}, HOY);
  assert.equal(r.kcalTotal, 2 * 546 + 2 * 3500 + 4 * 100);
  assert.deepEqual(r.caducados, ['Galletas viejas']);
  assert.equal(r.litrosCocinar, 5);
  cerca(r.diasAgua, (30 - 5) / aguaPersona(hombre, 'normal'), 0.001, 'días de agua');
  assert.equal(r.dias, Math.floor(Math.min(r.diasAgua, r.diasComida)));
});

test('escenarios: sin cocina quita el arroz y su agua; sin luz, la nevera solo dura 4 horas', () => {
  const r = calcular([hombre], [], despensa, 'normal', { sinCocina: true, sinLuz: true }, HOY);
  // Los 4 yogures (400 kcal) caben en las primeras 4 horas: 4/24 de ~2.600 kcal
  assert.equal(r.kcalTotal, 2 * 546 + 400);
  assert.equal(r.litrosCocinar, 0);
  // Con 20 yogures, la mayoría se estropea antes de poder comerlos
  const muchos = despensa.map((p) => (p.id === '3' ? { ...p, cantidad: 20 } : p));
  const r2 = calcular([hombre], [], muchos, 'normal', { sinCocina: true, sinLuz: true }, HOY);
  cerca(r2.kcalTotal, 2 * 546 + r2.kcalDia * (4 / 24), 0.01, 'kcal útiles');
  assert.deepEqual(r2.perdidos.map((p) => p.nombre), ['Yogures']);
});

test('la comida de mascota solo cuenta para mascotas y el agua es común', () => {
  const r = calcular([hombre], [perro], despensa, 'normal', {}, HOY);
  assert.ok(r.mascotas);
  cerca(r.mascotas.diasComida, 10500 / r.mascotas.kcalDia, 0.001, 'días de pienso');
  cerca(r.litrosDia, aguaPersona(hombre, 'normal') + aguaMascota(perro), 0.001, 'agua diaria');
});

test('un modo más severo nunca da menos días', () => {
  const casa = [hombre, mujer, nina];
  const dias = ['normal', 'ligero', 'severo', 'extremo'].map(
    (m) => calcular(casa, [perro], despensa, m, {}, HOY).dias,
  );
  for (let i = 1; i < dias.length; i++) assert.ok(dias[i] >= dias[i - 1], dias.join(','));
});

test('faltante para el objetivo en modo normal', () => {
  const f = calcularFaltante([hombre], [], despensa, 7, HOY);
  cerca(f.faltanLitros, 7 * aguaPersona(hombre, 'normal') + 5 - 30, 0.001, 'litros');
  assert.equal(f.cumplido, false);
  const sobrado = calcularFaltante([hombre], [], despensa, 0, HOY);
  assert.equal(sobrado.cumplido, true);
});

test('caducidad: rojo a 30 días o menos y ámbar a 90 o menos', () => {
  const p = (caducidad) => ({ id: 'x', nombre: 'x', categoria: 'comida', cantidad: 1, caducidad });
  assert.equal(estadoCaducidad(p('2026-11-10'), HOY), 'caducado');
  assert.equal(estadoCaducidad(p('2026-12-11'), HOY), 'rojo');
  assert.equal(estadoCaducidad(p('2027-02-01'), HOY), 'ambar');
  assert.equal(estadoCaducidad(p('2028-01-01'), HOY), 'ok');
});

test('plan del día: primero lo que caduca antes y sin pasarse de lo que hay', () => {
  const plan = planDelDia(despensa, 3000, {}, HOY);
  // Los yogures caducan antes; las galletas están caducadas y no salen
  assert.equal(plan[0].nombre, 'Yogures');
  assert.equal(plan[0].unidades, 4);
  assert.ok(!plan.some((r) => r.nombre === 'Galletas viejas'));
  const total = plan.reduce((s, r) => s + r.kcal, 0);
  assert.ok(total >= 3000, `total ${total}`);
  // Sin cocina, el arroz no entra
  const sinCocina = planDelDia(despensa, 3000, { sinCocina: true }, HOY);
  assert.ok(!sinCocina.some((r) => r.nombre === 'Arroz'));
});

test('formato español de números', () => {
  assert.equal(formatoNumero(31000), '31.000');
  assert.equal(formatoNumero(3.45, 1), '3,5');
  assert.equal(formatoNumero(999), '999');
});

// ------------------------------------------------------------ Modo manual

test('manual: usa las raciones fijadas y, si faltan, las del modo normal', () => {
  const manual = { h: { kcal: 1500, litros: 2 } };
  assert.equal(kcalPersona(hombre, 'manual', manual), 1500);
  assert.equal(aguaPersona(hombre, 'manual', {}, manual), 2);
  // La mujer no tiene ración fijada: come y bebe como en normal
  cerca(kcalPersona(mujer, 'manual', manual), kcalBase(mujer), 0.001, 'kcal sin fijar');
  cerca(aguaPersona(mujer, 'manual', {}, manual), aguaPersona(mujer, 'normal'), 1e-9, 'agua sin fijar');
});

test('manual: los días salen de las raciones fijadas, también las de las mascotas', () => {
  const productos = [
    { id: 'a', nombre: 'Agua', categoria: 'agua', cantidad: 4, litrosPorUnidad: 5 },
    { id: 'c', nombre: 'Latas', categoria: 'comida', cantidad: 10, kcalPorUnidad: 600 },
    { id: 'p', nombre: 'Pienso', categoria: 'mascota', cantidad: 1, kcalPorUnidad: 4000 },
  ];
  const manual = { h: { kcal: 1500, litros: 2 }, p: { kcal: 500, litros: 0.5 } };
  const r = calcular([hombre], [perro], productos, 'manual', {}, HOY, manual);
  assert.equal(r.kcalDia, 1500);
  assert.equal(r.litrosDia, 2.5);
  assert.equal(r.diasComida, 4); // 6.000 / 1.500
  assert.equal(r.diasAgua, 8); // 20 / 2,5
  assert.equal(r.dias, 4);
  assert.equal(r.mascotas.diasComida, 8); // 4.000 / 500
});

test('manual: un bebé sigue sin contar comida', () => {
  const bebe = { id: 'b', nombre: 'B', sexo: 'mujer', edadAnios: 0.5, pesoKg: 7 };
  assert.equal(kcalPersona(bebe, 'manual', { b: { kcal: 800 } }), 0);
});

// ------------------------------------------------------------ Agua bebida

const agua = [
  { id: 'vieja', nombre: 'Botella', categoria: 'agua', cantidad: 1, litrosPorUnidad: 1.5, caducidad: '2027-01-01' },
  { id: 'nueva', nombre: 'Garrafa', categoria: 'agua', cantidad: 2, litrosPorUnidad: 5, caducidad: '2028-01-01' },
  { id: 'lata', nombre: 'Lata', categoria: 'comida', cantidad: 3, kcalPorUnidad: 400 },
];
const cantidad = (lista, id) => lista.find((p) => p.id === id).cantidad;

test('descontarAgua: gasta primero la que caduca antes y pasa a la siguiente', () => {
  const tras = descontarAgua(agua, 2, HOY);
  assert.equal(cantidad(tras, 'vieja'), 0);
  assert.equal(cantidad(tras, 'nueva'), 1.9); // (10 − 0,5) / 5
  assert.equal(cantidad(tras, 'lata'), 3);
});

test('descontarAgua: si no hay bastante, se queda a cero sin pasar a negativo', () => {
  const tras = descontarAgua(agua, 50, HOY);
  assert.equal(cantidad(tras, 'vieja'), 0);
  assert.equal(cantidad(tras, 'nueva'), 0);
});

test('devolverAgua: deshace un apunte y el total de litros vuelve a cuadrar', () => {
  const litros = (lista) =>
    lista.filter((p) => p.categoria === 'agua').reduce((s, p) => s + p.cantidad * p.litrosPorUnidad, 0);
  const tras = devolverAgua(descontarAgua(agua, 0.5, HOY), 0.5, HOY);
  cerca(litros(tras), 11.5, 0.001, 'litros tras beber y deshacer');
  const tras2 = devolverAgua(descontarAgua(agua, 2, HOY), 0.25, HOY);
  cerca(litros(tras2), 11.5 - 2 + 0.25, 0.001, 'litros tras beber 2 y devolver 0,25');
});

test('descontarAgua: no toca el agua caducada', () => {
  const lista = [{ id: 'cad', nombre: 'Vieja', categoria: 'agua', cantidad: 1, litrosPorUnidad: 5, caducidad: '2026-01-01' }];
  assert.equal(cantidad(descontarAgua(lista, 1, HOY), 'cad'), 1);
});

// ------------------------------------------------------------ Conservación

test('solo cuenta lo que da tiempo a comer antes de que caduque', () => {
  // 10.000 kcal que caducan en 2 días y 2.000 kcal al día: se aprovechan 3 días
  // (hoy, mañana y pasado, hasta el final del día de caducidad)
  const lotes = [{ id: 'a', nombre: 'Pan', categoria: 'comida', cantidad: 1, kcalPorUnidad: 10000, caducidad: '2026-11-13' }];
  const c = simularConsumo(lotes, 2000, {}, HOY);
  assert.equal(c.dias, 3);
  assert.equal(c.kcalUtiles, 6000);
  assert.deepEqual(c.perdidos, [{ id: 'a', nombre: 'Pan', kcal: 4000 }]);
});

test('lo que caduca antes se come antes y no hace perder lo que dura más', () => {
  const lotes = [
    { id: 'lata', nombre: 'Lata', categoria: 'comida', cantidad: 1, kcalPorUnidad: 4000 },
    { id: 'pan', nombre: 'Pan', categoria: 'comida', cantidad: 1, kcalPorUnidad: 2000, caducidad: '2026-11-11' },
  ];
  const c = simularConsumo(lotes, 2000, {}, HOY);
  assert.equal(c.dias, 3);
  assert.equal(c.perdidos.length, 0);
});

test('sin luz: orden nevera, congelador y despensa', () => {
  const p = [
    { id: 'lata', nombre: 'Lata', categoria: 'comida', cantidad: 1, kcalPorUnidad: 400 },
    { id: 'cong', nombre: 'Croquetas', categoria: 'comida', cantidad: 1, kcalPorUnidad: 400, conservacion: 'congelador' },
    { id: 'nev', nombre: 'Leche', categoria: 'comida', cantidad: 1, kcalPorUnidad: 400, conservacion: 'nevera' },
  ];
  const orden = ordenarParaComer(p, { sinLuz: true }, HOY).map((x) => x.id);
  assert.deepEqual(orden, ['nev', 'cong', 'lata']);
  // Con luz no hay prisa por la nevera, pero a igualdad va primero
  assert.deepEqual(ordenarParaComer(p, {}, HOY).map((x) => x.id), ['nev', 'cong', 'lata']);
});

test('sin luz: el congelador dura 24 h a medias y 48 h lleno; cuentan las horas ya pasadas', () => {
  const croquetas = { id: 'c', nombre: 'C', categoria: 'comida', cantidad: 1, kcalPorUnidad: 400, conservacion: 'congelador' };
  assert.equal(limiteDias(croquetas, { sinLuz: true }, HOY), 1);
  assert.equal(limiteDias(croquetas, { sinLuz: true, congeladorLleno: true }, HOY), 2);
  assert.equal(limiteDias(croquetas, { sinLuz: true }, HOY, 30), 0);
  // El antiguo «necesita frío» equivale a nevera
  const yogur = { id: 'y', nombre: 'Y', categoria: 'comida', cantidad: 1, kcalPorUnidad: 100, necesitaFrio: true };
  assert.equal(limiteDias(yogur, { sinLuz: true }, HOY, 1), 3 / 24);
  assert.equal(limiteDias(yogur, {}, HOY), Infinity);
});

test('plan del día: no propone lo que ya se ha calentado', () => {
  const p = [
    { id: 'nev', nombre: 'Leche', categoria: 'comida', cantidad: 1, kcalPorUnidad: 600, conservacion: 'nevera' },
    { id: 'lata', nombre: 'Lata', categoria: 'comida', cantidad: 5, kcalPorUnidad: 400 },
  ];
  assert.equal(planDelDia(p, 1000, { sinLuz: true }, HOY, 0)[0].productoId, 'nev');
  assert.ok(planDelDia(p, 1000, { sinLuz: true }, HOY, 5).every((x) => x.productoId !== 'nev'));
});

test('productosConCodigo: ceros delante, sin existencias y orden por caducidad', () => {
  const productos = [
    { id: 'a', nombre: 'Arroz tarde', categoria: 'comida', cantidad: 2, codigo: '0012345678905', caducidad: '2028-01-01' },
    { id: 'b', nombre: 'Arroz pronto', categoria: 'comida', cantidad: 1, codigo: '012345678905', caducidad: '2027-01-01' },
    { id: 'c', nombre: 'Arroz gastado', categoria: 'comida', cantidad: 0, codigo: '12345678905' },
    { id: 'd', nombre: 'Sin fecha', categoria: 'comida', cantidad: 3, codigo: '12345678905' },
    { id: 'e', nombre: 'Otra cosa', categoria: 'comida', cantidad: 3, codigo: '999' },
    { id: 'f', nombre: 'Sin código', categoria: 'comida', cantidad: 3 },
  ];
  assert.deepEqual(productosConCodigo(productos, '12345678905').map((p) => p.id), ['b', 'a', 'd']);
  assert.deepEqual(productosConCodigo(productos, ' 000 '), []);
  assert.deepEqual(productosConCodigo(productos, '111'), []);
});

// ------------------------------------------------------- Gasta esto esta semana

test('gasta esta semana: lo que caduca en 60 días, primero lo más próximo y repartido por semanas', () => {
  const hoy = new Date(2026, 10, 23); // lunes 23/11/2026
  const productos = [
    { id: 'a', nombre: 'Atún', categoria: 'comida', cantidad: 8, caducidad: '2026-12-21' }, // 28 días: 4 semanas → 2
    { id: 'b', nombre: 'Leche', categoria: 'comida', cantidad: 3, caducidad: '2026-11-27' }, // 4 días → todo
    { id: 'c', nombre: 'Arroz', categoria: 'comida', cantidad: 2, caducidad: '2027-06-01' }, // fuera de la ventana
    { id: 'd', nombre: 'Pasta', categoria: 'comida', cantidad: 1, caducidad: '2026-11-20' }, // ya caducado: no
    { id: 'e', nombre: 'Agua', categoria: 'agua', cantidad: 0, caducidad: '2026-12-01' }, // no queda
    { id: 'f', nombre: 'Galletas', categoria: 'comida', cantidad: 5 }, // sin fecha
    { id: 'g', nombre: 'Garbanzos', categoria: 'comida', cantidad: 1, caducidad: '2027-01-22' }, // 60 días justos → 1
  ];
  const g = gastarEstaSemana(productos, hoy);
  assert.deepEqual(g.map((x) => [x.id, x.dias, x.estaSemana]), [['b', 4, 3], ['a', 28, 2], ['g', 60, 1]]);
});

test('el aviso semanal va los lunes a las 10, sin contar hoy si ya han pasado', () => {
  const fmt = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}`;
  // Lunes a las 9: hoy cuenta
  assert.deepEqual(proximosLunes(new Date(2026, 10, 23, 9), 2).map(fmt), ['2026-11-23 10', '2026-11-30 10']);
  // Lunes a las 11: el siguiente
  assert.deepEqual(proximosLunes(new Date(2026, 10, 23, 11), 1).map(fmt), ['2026-11-30 10']);
  // Sábado
  assert.deepEqual(proximosLunes(new Date(2026, 10, 21, 18), 1).map(fmt), ['2026-11-23 10']);
});
