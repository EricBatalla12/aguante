// Plan de compra por meses y avisos en el calendario.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { planCompra } from '../src/lib/calculo.ts';
import { diaAviso, enlaceCalendario } from '../src/lib/calendario.ts';

const base = {
  garrafas: 0,
  botes: 0,
  precioGarrafa: 1,
  precioBote: 2,
  presupuesto: 10,
  diasAgua: 3,
  diasComida: 6,
  diasPorGarrafa: 0.5,
  diasPorBote: 0.1,
};

test('sin nada que comprar no hay meses', () => {
  assert.deepEqual(planCompra(base), []);
});

test('empieza por lo que menos días da y no se pasa del presupuesto', () => {
  // Agua 3 días y comida 6: las 6 primeras garrafas suben el agua a 6
  const plan = planCompra({ ...base, garrafas: 8, botes: 4 });
  assert.ok(plan);
  for (const m of plan) assert.ok(m.coste <= 10);
  assert.equal(plan.reduce((s, m) => s + m.garrafas, 0), 8);
  assert.equal(plan.reduce((s, m) => s + m.botes, 0), 4);
  // Mes 1: 6 garrafas (agua 3 → 6); empatan y va agua (6,5 días, 7 €); toca comida (9 €); el bote ya no
  // cabe, pero la última garrafa sí (10 €)
  assert.deepEqual(plan[0], { garrafas: 8, botes: 1, coste: 10 });
});

test('aprovecha el hueco con lo otro si lo que toca no cabe', () => {
  // Quedan 3 € y la garrafa cuesta 4: entra un bote de 2 €
  const plan = planCompra({ ...base, garrafas: 3, botes: 1, precioGarrafa: 4, presupuesto: 10 });
  assert.deepEqual(plan, [
    { garrafas: 2, botes: 1, coste: 10 },
    { garrafas: 1, botes: 0, coste: 4 },
  ]);
});

test('sin presupuesto suficiente para una unidad no hay plan', () => {
  assert.equal(planCompra({ ...base, garrafas: 1, presupuesto: 0.5 }), null);
  assert.equal(planCompra({ ...base, botes: 1, precioBote: NaN }), null);
  // Lo que no falta no hace falta que tenga precio
  assert.deepEqual(planCompra({ ...base, garrafas: 1, precioBote: NaN }), [{ garrafas: 1, botes: 0, coste: 1 }]);
});

test('más de diez años de compras no se planifica', () => {
  assert.equal(planCompra({ ...base, garrafas: 2000, precioGarrafa: 1, presupuesto: 1 }), null);
});

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
