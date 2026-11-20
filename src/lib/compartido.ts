// Lo que se comparte con la casa, partido en elementos.
//
// Cada producto, persona, mascota, fuente, aparato, casilla del kit, ración
// del reparto manual y ajuste compartido (entre ellos, el plan familiar) es un elemento con su `tipo` y su
// `id`. En el servidor cada elemento es una fila, y en caso de conflicto gana
// el último cambio de ese elemento (ver supabase/esquema.sql): si dos personas
// tocan productos distintos sin conexión, se quedan los dos cambios.
//
// No importa nada: los tests corren con `node --test` sin compilar.

type ConId = { id: string };

/**
 * La parte del estado que se comparte. Tema, idioma, avisos y plan de
 * compra son de cada móvil. La emergencia en curso se comparte entera, con su
 * escenario, como un ajuste: gana el último cambio, como en el resto.
 */
export type Compartido = {
  personas: ConId[];
  mascotas: ConId[];
  productos: ConId[];
  kitPropio: ConId[];
  kit: Record<string, boolean>;
  manual: Record<string, unknown>;
  modo: string;
  actividad?: string; // la del cálculo fuera de la emergencia; la de la emergencia va dentro de ella
  energia: { fuentes: ConId[]; aparatos: ConId[]; zona: string; epoca: string };
  emergencia: Record<string, unknown> | null;
  escenario: Record<string, unknown>;
  /** El plan familiar entero, como un ajuste: se edita poco y gana el último cambio. */
  planFamiliar?: Record<string, unknown>;
};

export type Tipo = 'persona' | 'mascota' | 'producto' | 'kitPropio' | 'kit' | 'manual' | 'fuente' | 'aparato' | 'ajuste';

/** Un elemento tal como viaja al servidor y vuelve. */
export type Fila = { tipo: Tipo; id: string; datos?: unknown; borrado: boolean; cambiado: number };

export const clave = (tipo: string, id: string) => `${tipo}:${id}`;

type Mapa = Map<string, { tipo: Tipo; id: string; valor: unknown }>;

// Listas con id: qué tipo es cada una y dónde vive en el estado
const LISTAS: { tipo: Tipo; leer: (c: Compartido) => ConId[] }[] = [
  { tipo: 'persona', leer: (c) => c.personas },
  { tipo: 'mascota', leer: (c) => c.mascotas },
  { tipo: 'producto', leer: (c) => c.productos },
  { tipo: 'kitPropio', leer: (c) => c.kitPropio },
  { tipo: 'fuente', leer: (c) => c.energia.fuentes },
  { tipo: 'aparato', leer: (c) => c.energia.aparatos },
];

/** Los elementos de cada sección. Cada sección se puede mirar por separado para no recorrerlo todo en cada cambio. */
const SECCIONES: { leer: (c: Compartido) => unknown; elementos: (c: Compartido) => [Tipo, string, unknown][] }[] = [
  ...LISTAS.map((l) => ({
    leer: l.leer,
    elementos: (c: Compartido) => l.leer(c).map((x): [Tipo, string, unknown] => [l.tipo, x.id, x]),
  })),
  { leer: (c) => c.kit, elementos: (c) => Object.entries(c.kit).map(([id, v]): [Tipo, string, unknown] => ['kit', id, v]) },
  {
    leer: (c) => c.manual,
    elementos: (c) => Object.entries(c.manual).map(([id, v]): [Tipo, string, unknown] => ['manual', id, v]),
  },
  { leer: (c) => c.modo, elementos: (c) => [['ajuste', 'modo', c.modo]] },
  {
    leer: (c) => c.actividad,
    elementos: (c) => (c.actividad ? [['ajuste', 'actividad', c.actividad]] : []),
  },
  {
    // Zona y época van juntas: son una sola elección en la pantalla de energía
    leer: (c) => `${c.energia.zona}|${c.energia.epoca}`,
    elementos: (c) => [['ajuste', 'zonaSolar', { zona: c.energia.zona, epoca: c.energia.epoca }]],
  },
  {
    // La emergencia en curso y su escenario (sin luz, sin cocina…). Sin
    // emergencia viaja null: los ajustes no se borran. Fuera de la emergencia
    // el escenario es de cada móvil.
    leer: (c) => JSON.stringify(c.emergencia ? [c.emergencia, c.escenario] : null),
    elementos: (c) => [['ajuste', 'emergencia', c.emergencia ? { ...c.emergencia, escenario: c.escenario } : null]],
  },
  { leer: (c) => c.planFamiliar, elementos: (c) => (c.planFamiliar ? [['ajuste', 'planFamiliar', c.planFamiliar]] : []) },
];

function aMapa(c: Compartido, secciones = SECCIONES): Mapa {
  const m: Mapa = new Map();
  for (const s of secciones) for (const [tipo, id, valor] of s.elementos(c)) m.set(clave(tipo, id), { tipo, id, valor });
  return m;
}

/** Todos los elementos como filas nuevas: para subir lo que hay al crear la casa. */
export function todasLasFilas(c: Compartido, cambiado: number): Fila[] {
  return [...aMapa(c).values()].map((e) => ({ tipo: e.tipo, id: e.id, datos: e.valor, borrado: false, cambiado }));
}

/** Lo que ha cambiado de un estado a otro: elementos nuevos, cambiados y borrados. */
export function cambiosEntre(antes: Compartido, ahora: Compartido, cambiado: number): Fila[] {
  // Solo se recorren las secciones que no son el mismo objeto: zustand crea
  // uno nuevo solo para lo que se toca
  const tocadas = SECCIONES.filter((s) => s.leer(antes) !== s.leer(ahora));
  if (tocadas.length === 0) return [];
  const a = aMapa(antes, tocadas);
  const b = aMapa(ahora, tocadas);
  const filas: Fila[] = [];
  for (const [k, e] of b) {
    const previo = a.get(k);
    if (!previo || JSON.stringify(previo.valor) !== JSON.stringify(e.valor)) {
      filas.push({ tipo: e.tipo, id: e.id, datos: e.valor, borrado: false, cambiado });
    }
  }
  for (const [k, e] of a) if (!b.has(k)) filas.push({ tipo: e.tipo, id: e.id, borrado: true, cambiado });
  return filas;
}

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Comprueba lo que llega del servidor antes de meterlo en el estado: un dato
 * roto de otro móvil (o de otra versión de la app) no debe tumbar esta.
 * Devuelve el valor que se guarda o undefined si no vale.
 */
function valorValido(tipo: Tipo, id: string, datos: unknown): unknown {
  if (LISTAS.some((l) => l.tipo === tipo)) return esObjeto(datos) ? { ...datos, id } : undefined;
  if (tipo === 'kit') return typeof datos === 'boolean' ? datos : undefined;
  if (tipo === 'manual') return esObjeto(datos) ? datos : undefined;
  if (tipo === 'ajuste' && id === 'modo') return typeof datos === 'string' ? datos : undefined;
  if (tipo === 'ajuste' && id === 'actividad') return datos === 'sedentaria' || datos === 'normal' ? datos : undefined;
  if (tipo === 'ajuste' && id === 'zonaSolar') {
    return esObjeto(datos) && typeof datos.zona === 'string' && typeof datos.epoca === 'string' ? datos : undefined;
  }
  if (tipo === 'ajuste' && id === 'planFamiliar') {
    const vale = esObjeto(datos) && ['encuentro', 'contactos', 'centros'].every((k) => Array.isArray(datos[k]));
    return vale ? datos : undefined;
  }
  if (tipo === 'ajuste' && id === 'emergencia') {
    if (datos === null) return null;
    const vale =
      esObjeto(datos) &&
      typeof datos.inicio === 'string' &&
      esObjeto(datos.aguaHoy) &&
      esObjeto(datos.comidoHoy) &&
      Array.isArray(datos.comidoHoy.items) &&
      (datos.escenario === undefined || esObjeto(datos.escenario));
    return vale ? datos : undefined;
  }
  return undefined;
}

/**
 * Aplica filas del servidor al estado. Devuelve el estado nuevo, o null si no
 * cambia nada (así no se repinta la app cada vez que vuelve lo que uno mismo
 * acaba de subir). Las listas mantienen su orden y lo nuevo va al final.
 */
export function aplicarFilas<T extends Compartido>(c: T, filas: Fila[]): T | null {
  const m = aMapa(c);
  let cambia = false;
  for (const f of filas) {
    const k = clave(f.tipo, f.id);
    if (f.borrado) {
      // Los ajustes no se borran nunca
      if (f.tipo !== 'ajuste' && m.delete(k)) cambia = true;
      continue;
    }
    const valor = valorValido(f.tipo, f.id, f.datos);
    if (valor === undefined) continue;
    const previo = m.get(k);
    if (previo && JSON.stringify(previo.valor) === JSON.stringify(valor)) continue;
    // Al sustituir, Map conserva la posición del elemento
    m.set(k, { tipo: f.tipo, id: f.id, valor });
    cambia = true;
  }
  if (!cambia) return null;

  const de = (tipo: Tipo) => [...m.values()].filter((e) => e.tipo === tipo);
  const lista = (tipo: Tipo) => de(tipo).map((e) => e.valor as ConId);
  const mapa = <V>(tipo: Tipo) => Object.fromEntries(de(tipo).map((e) => [e.id, e.valor as V]));
  const ajuste = (id: string) => m.get(clave('ajuste', id))?.valor;
  const zonaSolar = ajuste('zonaSolar') as { zona: string; epoca: string } | undefined;
  const emergencia = m.has(clave('ajuste', 'emergencia'))
    ? (ajuste('emergencia') as (Record<string, unknown> & { escenario?: Record<string, unknown> }) | null)
    : undefined;
  let deEmergencia: Pick<Compartido, 'emergencia' | 'escenario'> = { emergencia: c.emergencia, escenario: c.escenario };
  if (emergencia === null) deEmergencia = { emergencia: null, escenario: c.escenario };
  else if (emergencia) {
    const { escenario, ...resto } = emergencia;
    deEmergencia = { emergencia: resto, escenario: escenario ?? c.escenario };
  }

  return {
    ...c,
    personas: lista('persona'),
    mascotas: lista('mascota'),
    productos: lista('producto'),
    kitPropio: lista('kitPropio'),
    kit: mapa<boolean>('kit'),
    manual: mapa<unknown>('manual'),
    modo: (ajuste('modo') as string | undefined) ?? c.modo,
    actividad: (ajuste('actividad') as string | undefined) ?? c.actividad,
    energia: {
      ...c.energia,
      fuentes: lista('fuente'),
      aparatos: lista('aparato'),
      zona: zonaSolar?.zona ?? c.energia.zona,
      epoca: zonaSolar?.epoca ?? c.energia.epoca,
    },
    ...deEmergencia,
    planFamiliar: (ajuste('planFamiliar') as Record<string, unknown> | undefined) ?? c.planFamiliar,
  };
}

/**
 * Junta cambios pendientes de subir: si un elemento se toca varias veces sin
 * conexión, solo hace falta subir la última.
 */
export function juntarPendientes(pendientes: Record<string, Fila>, nuevas: Fila[]): Record<string, Fila> {
  const r = { ...pendientes };
  for (const f of nuevas) {
    const k = clave(f.tipo, f.id);
    if (!r[k] || r[k].cambiado <= f.cambiado) r[k] = f;
  }
  return r;
}

/**
 * Decide qué filas del servidor se aplican teniendo cambios propios sin subir:
 * si lo de este móvil es más nuevo, se queda (y se subirá); si no, gana el
 * servidor y el cambio propio se descarta. Devuelve qué aplicar y los
 * pendientes que siguen.
 */
export function resolver(
  pendientes: Record<string, Fila>,
  delServidor: Fila[],
): { aplicar: Fila[]; pendientes: Record<string, Fila> } {
  const quedan = { ...pendientes };
  const aplicar: Fila[] = [];
  for (const f of delServidor) {
    const k = clave(f.tipo, f.id);
    const mio = quedan[k];
    if (mio && mio.cambiado > f.cambiado) continue;
    if (mio) delete quedan[k];
    aplicar.push(f);
  }
  return { aplicar, pendientes: quedan };
}

/** Vacía lo compartido: al entrar en una casa que ya tiene datos, se sustituye lo de este móvil. */
export function vacio<T extends Compartido>(c: T): T {
  return {
    ...c,
    personas: [],
    mascotas: [],
    productos: [],
    kitPropio: [],
    kit: {},
    manual: {},
    energia: { ...c.energia, fuentes: [], aparatos: [] },
  };
}

/** Si hay algo apuntado en lo compartido (para avisar antes de sustituirlo). */
export const tieneDatos = (c: Compartido) =>
  c.personas.length + c.mascotas.length + c.productos.length + c.kitPropio.length +
    c.energia.fuentes.length + c.energia.aparatos.length > 0 || Object.values(c.kit).some(Boolean);

/**
 * Si un plan da Pro el día `hoy` (AAAA-MM-DD). El servidor ya mira la fecha al
 * contestar, pero el plan se guarda para usarlo sin conexión y puede caducar
 * mientras tanto. `hasta` es el último día incluido; null, sin caducidad.
 */
export const planActivo = (plan: { pro: boolean; hasta: string | null } | null, hoy: string) =>
  !!plan?.pro && (!plan.hasta || plan.hasta >= hoy);
