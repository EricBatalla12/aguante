// Tests de cómo se parte lo compartido en elementos y de quién gana en un
// conflicto (src/lib/compartido.ts).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { aplicarFilas, cambiosEntre, juntarPendientes, planActivo, resolver, tieneDatos, todasLasFilas, vacio } from '../src/lib/compartido.ts';

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
  // Solo viaja dentro de una emergencia
  escenario: {},
});

test('todasLasFilas sube cada elemento y los tres ajustes', () => {
  const filas = todasLasFilas(base(), 5);
  const claves = filas.map((f) => `${f.tipo}:${f.id}`).sort();
  assert.deepEqual(claves, [
    'ajuste:emergencia',
    'ajuste:modo',
    'ajuste:zonaSolar',
    'kit:linterna',
    'persona:ana',
    'producto:p1',
    'producto:p2',
  ]);
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

test('planActivo: sin plan, gratis, caducado, último día y sin caducidad', () => {
  assert.equal(planActivo(null, '2026-11-15'), false);
  assert.equal(planActivo({ pro: false, hasta: null }, '2026-11-15'), false);
  assert.equal(planActivo({ pro: true, hasta: '2026-11-14' }, '2026-11-15'), false);
  assert.equal(planActivo({ pro: true, hasta: '2026-11-15' }, '2026-11-15'), true);
  assert.equal(planActivo({ pro: true, hasta: null }, '2026-11-15'), true);
});

// ------------------------------------------------------------------ Emergencia compartida

const enEmergencia = () => ({
  ...base(),
  emergencia: {
    inicio: '2026-11-16T18:42:00.000Z',
    sinLuzDesde: '2026-11-16T18:42:00.000Z',
    aguaHoy: { fecha: '2026-11-16', litros: 1.5 },
    comidoHoy: { fecha: '2026-11-16', items: [] },
  },
  escenario: { sinLuz: true },
});

test('la emergencia viaja con su escenario y vuelve igual', () => {
  const a = base();
  const b = enEmergencia();
  const filas = cambiosEntre(a, b, 7);
  assert.equal(filas.length, 1);
  assert.equal(filas[0].tipo, 'ajuste');
  assert.equal(filas[0].id, 'emergencia');
  assert.deepEqual(filas[0].datos.escenario, { sinLuz: true });
  // Otro móvil sin emergencia la recibe con su escenario
  const otro = aplicarFilas(base(), filas);
  assert.deepEqual(otro.emergencia, b.emergencia);
  assert.deepEqual(otro.escenario, { sinLuz: true });
});

test('terminar la emergencia viaja como null y los demás la terminan', () => {
  const filas = cambiosEntre(enEmergencia(), { ...enEmergencia(), emergencia: null }, 8);
  assert.deepEqual(filas, [{ tipo: 'ajuste', id: 'emergencia', datos: null, borrado: false, cambiado: 8 }]);
  const otro = aplicarFilas(enEmergencia(), filas);
  assert.equal(otro.emergencia, null);
  // Fuera de la emergencia el escenario no se toca
  assert.deepEqual(otro.escenario, { sinLuz: true });
});

test('apuntar agua cambia la emergencia; el escenario fuera de ella no viaja', () => {
  const a = enEmergencia();
  const b = { ...a, emergencia: { ...a.emergencia, aguaHoy: { fecha: '2026-11-16', litros: 2 } } };
  assert.equal(cambiosEntre(a, b, 9).length, 1);
  assert.deepEqual(cambiosEntre(base(), { ...base(), escenario: { calor: true } }, 9), []);
});

test('una emergencia rota de otro móvil no se mete', () => {
  const rota = [{ tipo: 'ajuste', id: 'emergencia', datos: { inicio: 3 }, borrado: false, cambiado: 9 }];
  assert.equal(aplicarFilas(base(), rota), null);
});

test('la actividad del cálculo viaja como ajuste y se valida', () => {
  const antes = { ...base(), actividad: 'sedentaria' };
  const ahora = { ...antes, actividad: 'normal' };
  const filas = cambiosEntre(antes, ahora, 7);
  assert.deepEqual(
    filas.map((f) => [f.tipo, f.id, f.datos]),
    [['ajuste', 'actividad', 'normal']],
  );
  assert.equal(aplicarFilas(antes, filas).actividad, 'normal');
  // Un valor raro de otro móvil no se mete
  assert.equal(aplicarFilas(antes, [{ tipo: 'ajuste', id: 'actividad', datos: 'atleta', borrado: false, cambiado: 8 }]), null);
  // Sin actividad (datos antiguos) no se sube nada
  assert.ok(!todasLasFilas(base(), 1).some((f) => f.id === 'actividad'));
});

test('el plan familiar viaja entero como un ajuste y lo roto no entra', () => {
  const plan = { encuentro: [{ id: 'e1', lugar: 'La puerta del colegio' }], contactos: [], centros: [], salida: 'Por la calle Mayor' };
  const conPlan = { ...base(), planFamiliar: plan };
  // Sube solo si lo hay, y se ve como un cambio cuando se toca
  assert.ok(todasLasFilas(conPlan, 1).some((f) => f.tipo === 'ajuste' && f.id === 'planFamiliar'));
  assert.ok(!todasLasFilas(base(), 1).some((f) => f.id === 'planFamiliar'));
  const tocado = { ...conPlan, planFamiliar: { ...plan, salida: 'Por el parque' } };
  assert.deepEqual(cambiosEntre(conPlan, tocado, 2).map((f) => f.id), ['planFamiliar']);
  // Llega de otro móvil
  const nuevo = aplicarFilas(base(), [{ tipo: 'ajuste', id: 'planFamiliar', datos: plan, borrado: false, cambiado: 3 }]);
  assert.deepEqual(nuevo.planFamiliar, plan);
  // Sin sus listas no vale
  assert.equal(aplicarFilas(base(), [{ tipo: 'ajuste', id: 'planFamiliar', datos: { salida: 'x' }, borrado: false, cambiado: 3 }]), null);
});
