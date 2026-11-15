// Tests de la energía propia (src/lib/energia.ts).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { calcularEnergia, whGuardados, whSolaresDia } from '../src/lib/energia.ts';

const cerca = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} frente a ${b}`);

test('power bank de 20.000 mAh: unos 48 Wh útiles', () => {
  cerca(whGuardados({ id: 'p', nombre: 'P', tipo: 'powerbank', cantidad: 1, mah: 20000 }), 48.1, 0.1, 'Wh');
});

test('batería de 500 Wh con inversor: 425 Wh útiles', () => {
  assert.equal(whGuardados({ id: 'b', nombre: 'B', tipo: 'bateria', cantidad: 1, wh: 500 }), 425);
});

test('generador: litros / consumo × potencia', () => {
  const g = { id: 'g', nombre: 'G', tipo: 'generador', cantidad: 1, vatios: 1000, litrosHora: 0.5, litros: 10 };
  assert.equal(whGuardados(g), 20000);
});

test('placa de 100 Wp en el centro en invierno: 320 Wh al día', () => {
  cerca(whSolaresDia({ id: 's', nombre: 'S', tipo: 'solar', cantidad: 1, vatiosPico: 100 }, 'centro', 'invierno'), 320, 0.01, 'Wh');
});

test('días: lo guardado entre lo que falta cada día; infinito si el sol lo cubre', () => {
  const fuentes = [{ id: 'b', nombre: 'B', tipo: 'bateria', cantidad: 1, wh: 1000 }];
  const aparatos = [
    { id: 'm', nombre: 'Móvil', vatios: 15, horasDia: 1, cantidad: 2, imprescindible: true },
    { id: 'n', nombre: 'Nevera', vatios: 30, horasDia: 24, cantidad: 1 },
  ];
  const todo = calcularEnergia(fuentes, aparatos, 'centro', 'invierno');
  assert.equal(todo.whConsumoDia, 750);
  cerca(todo.dias, 850 / 750, 0.001, 'días');
  const minimo = calcularEnergia(fuentes, aparatos, 'centro', 'invierno', true);
  cerca(minimo.dias, 850 / 30, 0.001, 'días imprescindibles');
  const conSol = calcularEnergia(
    [...fuentes, { id: 's', nombre: 'S', tipo: 'solar', cantidad: 1, vatiosPico: 300 }],
    aparatos,
    'centro',
    'invierno',
  );
  assert.equal(conSol.dias, Infinity);
});
