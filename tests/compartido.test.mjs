// Tests de cómo se parte lo compartido en elementos y de quién gana en un
// conflicto (src/lib/compartido.ts).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { aplicarFilas, cambiosEntre, juntarPendientes, resolver, tieneDatos, todasLasFilas, vacio } from '../src/lib/compartido.ts';

const base = () => ({
  personas: [{ id: 'ana', nombre: 'Ana' }],
  mascotas: [],
  productos: [
    { id: 'p1', nombre: 'Arroz', cantidad: 2 },
    { id: 'p2', nombre: 'Agua', cantidad: 6 },
  ],
  kitPropio: [],
  kit: { linterna: true },
  manual: {},
  modo: 'normal',
  energia: { fuentes: [], aparatos: [], zona: 'centro', epoca: 'invierno' },
  // Esto es de cada móvil: no debe viajar
  tema: 'oscuro',
  emergencia: null,
});

test('todasLasFilas sube cada elemento y los dos ajustes', () => {
  const filas = todasLasFilas(base(), 5);
  const claves = filas.map((f) => `${f.tipo}:${f.id}`).sort();
  assert.deepEqual(claves, ['ajuste:modo', 'ajuste:zonaSolar', 'kit:linterna', 'persona:ana', 'producto:p1', 'producto:p2']);
  assert.ok(filas.every((f) => f.cambiado === 5 && !f.borrado));
});

test('cambiosEntre solo ve lo que se ha tocado', () => {
  const a = base();
  const b = { ...a, productos: a.productos.map((p) => (p.id === 'p1' ? { ...p, cantidad: 1 } : p)) };
  assert.deepEqual(cambiosEntre(a, b, 9), [
    { tipo: 'producto', id: 'p1', datos: { id: 'p1', nombre: 'Arroz', cantidad: 1 }, borrado: false, cambiado: 9 },
  ]);
  // Cambiar el tema no es un cambio compartido
  assert.deepEqual(cambiosEntre(a, { ...a, tema: 'claro' }, 9), []);
});

test('cambiosEntre apunta lo borrado, lo nuevo y los ajustes', () => {
  const a = base();
  const b = {
    ...a,
    productos: [a.productos[1]],
    kit: { ...a.kit, radio: false },
    modo: 'severo',
    energia: { ...a.energia, zona: 'sur' },
  };
  const filas = cambiosEntre(a, b, 3);
  const por = Object.fromEntries(filas.map((f) => [`${f.tipo}:${f.id}`, f]));
  assert.equal(por['producto:p1'].borrado, true);
  assert.equal(por['kit:radio'].datos, false);
  assert.equal(por['ajuste:modo'].datos, 'severo');
  assert.deepEqual(por['ajuste:zonaSolar'].datos, { zona: 'sur', epoca: 'invierno' });
  assert.equal(filas.length, 4);
});

test('aplicarFilas sustituye en su sitio, añade al final y borra', () => {
  const r = aplicarFilas(base(), [
    { tipo: 'producto', id: 'p1', datos: { id: 'p1', nombre: 'Arroz', cantidad: 5 }, borrado: false, cambiado: 1 },
    { tipo: 'producto', id: 'p3', datos: { id: 'p3', nombre: 'Latas', cantidad: 4 }, borrado: false, cambiado: 1 },
    { tipo: 'persona', id: 'ana', borrado: true, cambiado: 1 },
    { tipo: 'ajuste', id: 'zonaSolar', datos: { zona: 'norte', epoca: 'verano' }, borrado: false, cambiado: 1 },
  ]);
  assert.deepEqual(r.productos.map((p) => [p.id, p.cantidad]), [['p1', 5], ['p2', 6], ['p3', 4]]);
  assert.deepEqual(r.personas, []);
  assert.equal(r.energia.zona, 'norte');
  assert.equal(r.energia.epoca, 'verano');
  // Lo de cada móvil no se toca
  assert.equal(r.tema, 'oscuro');
});

test('aplicarFilas devuelve null si no cambia nada', () => {
  const b = base();
  assert.equal(aplicarFilas(b, todasLasFilas(b, 1)), null);
});

test('aplicarFilas descarta datos rotos y no borra ajustes', () => {
  const b = base();
  assert.equal(
    aplicarFilas(b, [
      { tipo: 'producto', id: 'x', datos: 'no es un objeto', borrado: false, cambiado: 1 },
      { tipo: 'kit', id: 'linterna', datos: 'sí', borrado: false, cambiado: 1 },
      { tipo: 'ajuste', id: 'modo', borrado: true, cambiado: 1 },
      { tipo: 'ajuste', id: 'otro', datos: 1, borrado: false, cambiado: 1 },
    ]),
    null,
  );
  // El id de la fila manda sobre el que traigan los datos
  const r = aplicarFilas(b, [{ tipo: 'producto', id: 'p9', datos: { id: 'otro', nombre: 'X' }, borrado: false, cambiado: 1 }]);
  assert.equal(r.productos.at(-1).id, 'p9');
});

test('juntarPendientes se queda con el último cambio de cada elemento', () => {
  let p = juntarPendientes({}, [{ tipo: 'producto', id: 'p1', datos: { n: 1 }, borrado: false, cambiado: 10 }]);
  p = juntarPendientes(p, [{ tipo: 'producto', id: 'p1', borrado: true, cambiado: 20 }]);
  p = juntarPendientes(p, [{ tipo: 'producto', id: 'p1', datos: { n: 0 }, borrado: false, cambiado: 15 }]);
  assert.deepEqual(Object.values(p), [{ tipo: 'producto', id: 'p1', borrado: true, cambiado: 20 }]);
});

test('resolver: gana el último cambio de cada elemento', () => {
  const pendientes = {
    'producto:p1': { tipo: 'producto', id: 'p1', datos: { n: 'mío' }, borrado: false, cambiado: 200 },
    'producto:p2': { tipo: 'producto', id: 'p2', datos: { n: 'mío' }, borrado: false, cambiado: 100 },
  };
  const servidor = [
    { tipo: 'producto', id: 'p1', datos: { n: 'suyo' }, borrado: false, cambiado: 150 }, // pierde: lo mío es más nuevo
    { tipo: 'producto', id: 'p2', datos: { n: 'suyo' }, borrado: false, cambiado: 300 }, // gana el servidor
    { tipo: 'producto', id: 'p3', datos: { n: 'suyo' }, borrado: false, cambiado: 1 }, // no lo he tocado
  ];
  const r = resolver(pendientes, servidor);
  assert.deepEqual(r.aplicar.map((f) => f.id), ['p2', 'p3']);
  assert.deepEqual(Object.keys(r.pendientes), ['producto:p1']);
});

test('resolver: lo que vuelve igual que lo subido deja de estar pendiente', () => {
  const mio = { tipo: 'kit', id: 'radio', datos: true, borrado: false, cambiado: 50 };
  const r = resolver({ 'kit:radio': mio }, [mio]);
  assert.deepEqual(r.pendientes, {});
});

test('vacio y tieneDatos', () => {
  const v = vacio(base());
  assert.equal(tieneDatos(v), false);
  assert.equal(tieneDatos(base()), true);
  assert.equal(v.modo, 'normal');
  assert.equal(v.tema, 'oscuro');
});
