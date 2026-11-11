// Tests de las fechas de caducidad y de la lectura de cantidades de la
// etiqueta. Se ejecutan con `npm test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { componerFecha, diasDelMes, partesDeFecha, textoDia, textoFecha, textoFechaLarga } from '../src/lib/fechas.ts';
import { parsearCantidad } from '../src/lib/off.ts';
import { genericosPara } from '../src/constants/genericos.ts';

test('componerFecha: sin día se toma el último día del mes', () => {
  assert.deepEqual(componerFecha({ dia: '', mes: '12', anio: '2028' }), { estado: 'ok', iso: '2028-12-31', sinDia: true });
  assert.deepEqual(componerFecha({ dia: '', mes: '2', anio: '2028' }), { estado: 'ok', iso: '2028-02-29', sinDia: true });
  assert.deepEqual(componerFecha({ dia: '', mes: '02', anio: '2027' }), { estado: 'ok', iso: '2027-02-28', sinDia: true });
});

test('componerFecha: con día, y con el año en dos cifras', () => {
  assert.deepEqual(componerFecha({ dia: '5', mes: '3', anio: '2029' }), { estado: 'ok', iso: '2029-03-05', sinDia: false });
  assert.deepEqual(componerFecha({ dia: '', mes: '06', anio: '28' }), { estado: 'ok', iso: '2028-06-30', sinDia: true });
});

test('componerFecha: vacía, incompleta y errores', () => {
  assert.equal(componerFecha({ dia: '', mes: '', anio: '' }).estado, 'vacia');
  assert.equal(componerFecha({ dia: '', mes: '12', anio: '' }).estado, 'incompleta');
  assert.equal(componerFecha({ dia: '', mes: '12', anio: '202' }).estado, 'incompleta');
  assert.equal(componerFecha({ dia: '15', mes: '', anio: '' }).estado, 'incompleta');
  assert.equal(componerFecha({ dia: '', mes: '13', anio: '2028' }).estado, 'error');
  assert.equal(componerFecha({ dia: '31', mes: '4', anio: '2028' }).estado, 'error');
  assert.equal(componerFecha({ dia: '30', mes: '2', anio: '2028' }).estado, 'error');
  assert.equal(componerFecha({ dia: '', mes: '5', anio: '1999' }).estado, 'error');
});

test('partesDeFecha: deja el día vacío si la etiqueta no lo traía', () => {
  assert.deepEqual(partesDeFecha('2028-12-31', true), { dia: '', mes: '12', anio: '2028' });
  assert.deepEqual(partesDeFecha('2029-03-05', false), { dia: '05', mes: '03', anio: '2029' });
  assert.deepEqual(partesDeFecha(undefined), { dia: '', mes: '', anio: '' });
});

test('textos de fecha', () => {
  assert.equal(diasDelMes(2028, 2), 29);
  assert.equal(textoFecha('2028-12-31', true), 'dic 2028');
  assert.equal(textoFecha('2029-03-05'), '5 mar 2029');
  assert.equal(textoFechaLarga('2028-12-31', true), 'a finales de diciembre de 2028');
  assert.equal(textoFechaLarga('2029-03-05'), 'el 5 de marzo de 2029');
  assert.equal(textoDia(new Date(2026, 10, 19)), 'jueves 19 de noviembre');
});

test('parsearCantidad: lee gramos, kilos, litros y packs', () => {
  assert.deepEqual(parsearCantidad('400 g'), { gramos: 400 });
  assert.deepEqual(parsearCantidad('140 G'), { gramos: 140 });
  assert.deepEqual(parsearCantidad('330g'), { gramos: 330 });
  assert.deepEqual(parsearCantidad('1 kg'), { gramos: 1000 });
  assert.deepEqual(parsearCantidad('3 x 80 g'), { gramos: 240 });
  assert.deepEqual(parsearCantidad('1,5 L'), { litros: 1.5, gramos: 1500 });
  assert.deepEqual(parsearCantidad('33 cl'), { litros: 0.33, gramos: 330 });
  assert.deepEqual(parsearCantidad('500 ml'), { litros: 0.5, gramos: 500 });
  assert.deepEqual(parsearCantidad(''), {});
  assert.deepEqual(parsearCantidad('una lata'), {});
});

test('genericosPara: encuentra el valor típico sin importar tildes ni mayúsculas', () => {
  assert.deepEqual(genericosPara('Garbanzos cocidos Hacendado').map((g) => g.kcal100g), [139]);
  assert.deepEqual(genericosPara('ATÚN en aceite de oliva').map((g) => g.kcal100g), [198, 128]);
  assert.deepEqual(genericosPara('Atún al natural').map((g) => g.kcal100g), [128]);
  assert.deepEqual(genericosPara('Galletas'), []);
  assert.deepEqual(genericosPara('ar'), []);
});
