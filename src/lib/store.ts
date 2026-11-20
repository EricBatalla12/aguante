// Estado de la app, guardado en el móvil.
//
// Todo vive en local (SQLite clave-valor de Expo): en una emergencia lo
// normal es no tener internet, así que la app no depende de ningún servidor.

import { almacen } from './almacen';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  ACTIVIDAD_POR_DEFECTO,
  aguaPersona,
  descontarAgua,
  devolverAgua,
  kcalPersona,
  type Actividad,
  type Escenario,
  type Manual,
  type Mascota,
  type Modo,
  type ModoAuto,
  type Persona,
  type Producto,
  type Racion,
} from './calculo';
import type { ElementoKit } from '../constants/kit';
import type { Elegido } from './compra';
import type { Aparato, Epoca, FuenteEnergia, Zona } from './energia';
import { t } from '@/lib/i18n';

/** Algo que se ha marcado como comido hoy, para poder deshacerlo. */
export type Comido = { id: string; productoId: string; nombre: string; unidades: number; kcal: number };

export type Emergencia = {
  inicio: string; // ISO
  sinLuzDesde?: string; // ISO: cuándo se fue la luz, para las horas de nevera y congelador
  actividad?: Actividad; // se elige al empezarla; si falta, sedentaria
  aguaHoy: { fecha: string; litros: number };
  comidoHoy: { fecha: string; items: Comido[] };
};

export type Tema = 'sistema' | 'claro' | 'oscuro';
export type Idioma = 'sistema' | 'es' | 'en';

export type Energia = {
  fuentes: FuenteEnergia[];
  aparatos: Aparato[];
  zona: Zona;
  epoca: Epoca;
};

/** Lo que se guarda y lo que viaja en una copia de seguridad. */
type Datos = {
  personas: Persona[];
  mascotas: Mascota[];
  productos: Producto[];
  modo: Modo;
  manual: Manual;
  escenario: Escenario; // sin luz, sin cocina, calor… (la actividad no: va aparte)
  actividad: Actividad; // con la que se calcula fuera de la emergencia; se comparte con la casa
  objetivoDias: number;
  kit: Record<string, boolean>;
  kitPropio: ElementoKit[]; // lo que añade cada casa al kit de serie
  emergencia: Emergencia | null;
  tema: Tema;
  idioma: Idioma;
  avisos: boolean; // interruptor general de las notificaciones
  notificar: Notificar; // de qué se notifica, si están encendidas
  energia: Energia;
  compra: Compra; // presupuesto y precios del plan de compra: de cada móvil, no se comparte
};

/**
 * Plan de compra, de cada móvil (no se comparte con la casa): lo que compra
 * cualquiera va a la despensa o al kit, que sí se comparten, y sale de la
 * lista de todos. Los precios los pone cada uno (en euros).
 */
export type Compra = {
  /** Cómo se planifica: con lo que se puede gastar al mes o para llegar en una fecha. */
  sentido?: 'presupuesto' | 'fecha';
  presupuesto?: number;
  fecha?: string; // AAAA-MM-DD
  /** Último precio de cada cosa, por su clave (ver src/lib/compra.ts). */
  precios?: Record<string, number>;
  hechas?: CompraHecha[];
  /** Día del mes (1–28) del recordatorio; sin él, no hay. */
  diaRecordatorio?: number;
  /** Dónde compra cada uno: la etiqueta de Open Food Facts (`clave`) y el nombre. */
  tiendas?: { clave: string; nombre: string }[];
  /** Productos de esas tiendas elegidos para la lista (ver `Elegido` en compra.ts). */
  elegidos?: Elegido[];
  // Antiguos, del primer plan de compra: pasan a `precios` al normalizar
  precioGarrafa?: number;
  precioBote?: number;
};

/** De qué avisa el móvil. El día de compra va en `compra.diaRecordatorio`. */
export type Notificar = { despensa: boolean; kit: boolean };

/** Algo que se ha comprado siguiendo el plan: para el gasto de cada mes. */
export type CompraHecha = { id: string; clave: string; nombre: string; unidades: number; coste: number; fecha: string };

type Estado = Datos & {
  // Del móvil: no va en las copias ni se comparte
  tutorialVisto: boolean;
  setTutorialVisto: (v: boolean) => void;
  setActividad: (a: Actividad) => void;
  guardarPersona: (p: Persona) => void;
  borrarPersona: (id: string) => void;
  guardarMascota: (m: Mascota) => void;
  borrarMascota: (id: string) => void;
  guardarProducto: (p: Producto) => void;
  borrarProducto: (id: string) => void;
  gastar: (id: string, unidades: number) => void;
  setModo: (m: Modo) => void;
  setRacion: (id: string, r: Racion) => void;
  copiarManualDe: (modo: ModoAuto) => void;
  setEscenario: (e: Escenario) => void;
  setObjetivo: (dias: number) => void;
  alternarKit: (id: string) => void;
  anadirKit: (e: Omit<ElementoKit, 'id'>) => void;
  guardarKit: (e: ElementoKit) => void;
  setCompra: (c: Partial<Compra>) => void;
  setPrecio: (clave: string, precio: number | undefined) => void;
  apuntarCompra: (h: Omit<CompraHecha, 'id'>) => void;
  quitarCompra: (id: string) => void;
  borrarKit: (id: string) => void;
  setTema: (t: Tema) => void;
  setAvisos: (v: boolean) => void;
  setNotificar: (n: Partial<Notificar>) => void;
  setIdioma: (i: Idioma) => void;
  guardarFuente: (f: FuenteEnergia) => void;
  borrarFuente: (id: string) => void;
  guardarAparato: (a: Aparato) => void;
  borrarAparato: (id: string) => void;
  setZonaSolar: (zona: Zona, epoca: Epoca) => void;
  empezarEmergencia: (escenario?: Escenario) => void;
  terminarEmergencia: () => void;
  beber: (litros: number) => void;
  comer: (productoId: string, unidades: number) => void;
  deshacerComido: (id: string) => void;
  exportar: () => string;
  importar: (json: string) => string | null;
  borrarTodo: () => void;
};

const INICIAL: Datos = {
  personas: [],
  mascotas: [],
  productos: [],
  modo: 'normal',
  manual: {},
  escenario: {},
  actividad: ACTIVIDAD_POR_DEFECTO,
  objetivoDias: 7,
  kit: {},
  kitPropio: [],
  emergencia: null,
  tema: 'sistema',
  idioma: 'sistema',
  avisos: false,
  notificar: { despensa: true, kit: true },
  energia: { fuentes: [], aparatos: [], zona: 'centro', epoca: 'invierno' },
  compra: {},
};

/** Sustituye el elemento con el mismo id o lo añade al final. */
function upsert<T extends { id: string }>(lista: T[], x: T): T[] {
  return lista.some((e) => e.id === x.id) ? lista.map((e) => (e.id === x.id ? x : e)) : [...lista, x];
}

function sin<T>(mapa: Record<string, T>, id: string): Record<string, T> {
  const copia = { ...mapa };
  delete copia[id];
  return copia;
}

/** Fecha local en AAAA-MM-DD. */
export const fechaISO = (d: Date) => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export const hoyISO = () => fechaISO(new Date());

/**
 * El escenario con el que se calcula: el guardado más la actividad, que en
 * plena emergencia es la que se eligió al empezarla y, fuera, la de Ajustes.
 */
export function escenarioEfectivo(s: { escenario: Escenario; emergencia: Emergencia | null; actividad: Actividad }): Escenario {
  const actividad = s.emergencia ? (s.emergencia.actividad ?? ACTIVIDAD_POR_DEFECTO) : s.actividad;
  return { ...s.escenario, actividad };
}

/** Quita la actividad del escenario: se guarda aparte. */
function sinActividad(e: Escenario): Escenario {
  const { actividad: _, ...resto } = e;
  return resto;
}

/** Horas desde que se fue la luz en la emergencia en curso (0 si hay luz o no hay emergencia). */
export function horasSinLuz(e: Emergencia | null, esc: Escenario, ahora: number = Date.now()): number {
  if (!e || !esc.sinLuz || !e.sinLuzDesde) return 0;
  return Math.max(0, (ahora - new Date(e.sinLuzDesde).getTime()) / 3_600_000);
}

export const nuevoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Redondeo a centésimas para que sumar y restar cuartos no deje 0,0000001
const centesimas = (n: number) => Math.round(n * 100) / 100;

function soloDatos(s: Estado): Datos {
  return {
    personas: s.personas,
    mascotas: s.mascotas,
    productos: s.productos,
    modo: s.modo,
    manual: s.manual,
    escenario: s.escenario,
    actividad: s.actividad,
    objetivoDias: s.objetivoDias,
    kit: s.kit,
    kitPropio: s.kitPropio,
    emergencia: s.emergencia,
    tema: s.tema,
    idioma: s.idioma,
    avisos: s.avisos,
    notificar: s.notificar,
    energia: s.energia,
    compra: s.compra,
  };
}

export const useAguante = create<Estado>()(
  persist(
    (set, get) => ({
      ...INICIAL,
      tutorialVisto: false,

      setTutorialVisto: (tutorialVisto) => set({ tutorialVisto }),
      // La del día a día (Ajustes). La de la emergencia se cambia con setEscenario.
      setActividad: (actividad) => set({ actividad }),
      guardarPersona: (p) => set((s) => ({ personas: upsert(s.personas, p) })),
      borrarPersona: (id) =>
        set((s) => ({ personas: s.personas.filter((p) => p.id !== id), manual: sin(s.manual, id) })),
      guardarMascota: (m) => set((s) => ({ mascotas: upsert(s.mascotas, m) })),
      borrarMascota: (id) =>
        set((s) => ({ mascotas: s.mascotas.filter((m) => m.id !== id), manual: sin(s.manual, id) })),
      guardarProducto: (p) => set((s) => ({ productos: upsert(s.productos, p) })),
      borrarProducto: (id) => set((s) => ({ productos: s.productos.filter((p) => p.id !== id) })),
      // Fuera de la emergencia: quita unidades sin apuntarlas como comidas
      // (en la emergencia se usa `comer`, que las apunta en el plan del día)
      gastar: (id, unidades) =>
        set((s) => ({
          productos: s.productos.map((p) =>
            p.id === id ? { ...p, cantidad: Math.max(0, centesimas(p.cantidad - unidades)) } : p,
          ),
        })),
      setModo: (modo) => set({ modo }),
      setRacion: (id, r) => set((s) => ({ manual: { ...s.manual, [id]: { ...s.manual[id], ...r } } })),
      // Punto de partida para el reparto manual: las raciones de uno de los
      // modos calculados. Las mascotas se quedan con su ración completa.
      copiarManualDe: (modo) =>
        set((s) => {
          const manual: Manual = {};
          const esc = escenarioEfectivo(s);
          for (const p of s.personas) {
            manual[p.id] = {
              kcal: Math.round(kcalPersona(p, modo, {}, esc) / 50) * 50,
              litros: Math.ceil(aguaPersona(p, modo, esc) * 4) / 4,
            };
          }
          return { manual };
        }),
      // En plena emergencia, apunto cuándo se va la luz: de eso depende cuánto
      // aguantan la nevera y el congelador. Si trae actividad, va a su sitio
      // (la de la emergencia o la de Ajustes), no al escenario.
      setEscenario: (nuevo) =>
        set((s) => {
          const escenario = sinActividad(nuevo);
          const actividad = nuevo.actividad;
          if (!s.emergencia) return actividad ? { escenario, actividad } : { escenario };
          const emergencia = { ...s.emergencia, ...(actividad ? { actividad } : {}) };
          if (!!escenario.sinLuz !== !!s.escenario.sinLuz) {
            emergencia.sinLuzDesde = escenario.sinLuz ? new Date().toISOString() : undefined;
          }
          return { escenario, emergencia };
        }),
      setObjetivo: (objetivoDias) => set({ objetivoDias }),
      alternarKit: (id) => set((s) => ({ kit: { ...s.kit, [id]: !s.kit[id] } })),
      anadirKit: (e) => set((s) => ({ kitPropio: [...s.kitPropio, { ...e, id: `propio-${nuevoId()}` }] })),
      guardarKit: (e) => set((s) => ({ kitPropio: upsert(s.kitPropio, e) })),
      setCompra: (c) => set((s) => ({ compra: { ...s.compra, ...c } })),
      setPrecio: (clave, precio) =>
        set((s) => {
          const precios = { ...s.compra.precios };
          if (precio !== undefined && Number.isFinite(precio) && precio > 0) precios[clave] = precio;
          else delete precios[clave];
          return { compra: { ...s.compra, precios } };
        }),
      // Apunta el gasto y se queda con el precio por unidad para la próxima vez.
      // Se guardan las 300 últimas: de sobra para ver el gasto de cada mes.
      // Si es un producto elegido con las unidades fijadas, se descuentan las compradas.
      apuntarCompra: (h) =>
        set((s) => {
          const precios = { ...s.compra.precios };
          if (h.unidades > 0 && h.coste > 0) precios[h.clave] = Math.round((h.coste / h.unidades) * 100) / 100;
          const hechas = [...(s.compra.hechas ?? []), { ...h, id: nuevoId() }].slice(-300);
          const codigo = h.clave.startsWith('prod:') ? h.clave.slice(5) : null;
          const elegidos = (s.compra.elegidos ?? []).map((e) =>
            // Compradas todas las fijadas, vuelve a la cantidad automática
            e.codigo === codigo && e.unidades !== undefined
              ? { ...e, unidades: e.unidades - h.unidades > 0 ? e.unidades - h.unidades : undefined }
              : e,
          );
          return { compra: { ...s.compra, precios, hechas, elegidos } };
        }),
      quitarCompra: (id) =>
        set((s) => ({ compra: { ...s.compra, hechas: (s.compra.hechas ?? []).filter((h) => h.id !== id) } })),
      borrarKit: (id) => set((s) => ({ kitPropio: s.kitPropio.filter((k) => k.id !== id), kit: sin(s.kit, id) })),
      setTema: (tema) => set({ tema }),
      setAvisos: (avisos) => set({ avisos }),
      setNotificar: (n) => set((s) => ({ notificar: { ...s.notificar, ...n } })),
      setIdioma: (idioma) => set({ idioma }),
      guardarFuente: (f) => set((s) => ({ energia: { ...s.energia, fuentes: upsert(s.energia.fuentes, f) } })),
      borrarFuente: (id) =>
        set((s) => ({ energia: { ...s.energia, fuentes: s.energia.fuentes.filter((f) => f.id !== id) } })),
      guardarAparato: (a) => set((s) => ({ energia: { ...s.energia, aparatos: upsert(s.energia.aparatos, a) } })),
      borrarAparato: (id) =>
        set((s) => ({ energia: { ...s.energia, aparatos: s.energia.aparatos.filter((a) => a.id !== id) } })),
      setZonaSolar: (zona, epoca) => set((s) => ({ energia: { ...s.energia, zona, epoca } })),

      empezarEmergencia: (escenario) =>
        set((s) => {
          const esc = escenario ?? s.escenario;
          const ahora = new Date().toISOString();
          return {
            escenario: sinActividad(esc),
            emergencia: {
              inicio: ahora,
              sinLuzDesde: esc.sinLuz ? ahora : undefined,
              // En una emergencia se hace poco: sedentaria salvo que se diga otra cosa
              actividad: esc.actividad ?? ACTIVIDAD_POR_DEFECTO,
              aguaHoy: { fecha: hoyISO(), litros: 0 },
              comidoHoy: { fecha: hoyISO(), items: [] },
            },
          };
        }),
      terminarEmergencia: () => set({ emergencia: null }),

      // Apunta agua bebida y la descuenta de la reserva. Con litros negativos
      // corrige un apunte: devuelve el agua, sin bajar nunca de cero.
      beber: (litros) =>
        set((s) => {
          if (!s.emergencia) return {};
          const hoy = hoyISO();
          // El contador vuelve a cero cada día
          const previo = s.emergencia.aguaHoy.fecha === hoy ? s.emergencia.aguaHoy.litros : 0;
          const cambio = litros >= 0 ? litros : -Math.min(-litros, previo);
          if (cambio === 0) return {};
          const ahora = new Date();
          return {
            productos:
              cambio > 0 ? descontarAgua(s.productos, cambio, ahora) : devolverAgua(s.productos, -cambio, ahora),
            emergencia: { ...s.emergencia, aguaHoy: { fecha: hoy, litros: centesimas(previo + cambio) } },
          };
        }),

      comer: (productoId, unidades) =>
        set((s) => {
          const p = s.productos.find((x) => x.id === productoId);
          if (!p || !s.emergencia) return {};
          const hoy = hoyISO();
          const real = Math.min(unidades, p.cantidad);
          const previos = s.emergencia.comidoHoy.fecha === hoy ? s.emergencia.comidoHoy.items : [];
          const item: Comido = {
            id: nuevoId(),
            productoId,
            nombre: p.nombre,
            unidades: real,
            kcal: real * (p.kcalPorUnidad ?? 0),
          };
          return {
            productos: s.productos.map((x) =>
              x.id === productoId ? { ...x, cantidad: centesimas(x.cantidad - real) } : x,
            ),
            emergencia: { ...s.emergencia, comidoHoy: { fecha: hoy, items: [...previos, item] } },
          };
        }),

      deshacerComido: (id) =>
        set((s) => {
          const item = s.emergencia?.comidoHoy.items.find((i) => i.id === id);
          if (!item || !s.emergencia) return {};
          return {
            productos: s.productos.map((x) =>
              x.id === item.productoId ? { ...x, cantidad: centesimas(x.cantidad + item.unidades) } : x,
            ),
            emergencia: {
              ...s.emergencia,
              comidoHoy: {
                ...s.emergencia.comidoHoy,
                items: s.emergencia.comidoHoy.items.filter((i) => i.id !== id),
              },
            },
          };
        }),

      exportar: () => JSON.stringify({ app: 'aguante', version: 3, datos: soloDatos(get()) }),

      // Devuelve null si ha ido bien, o el motivo por el que no se ha importado
      importar: (json) => {
        let copia: unknown;
        try {
          copia = JSON.parse(json);
        } catch {
          return t('El texto no es una copia válida: tiene que ser el que da «Exportar», entero.');
        }
        const c = copia as { app?: string; datos?: Partial<Datos> };
        const d = c?.datos;
        if (c?.app !== 'aguante' || !d || !Array.isArray(d.personas) || !Array.isArray(d.productos)) {
          return t('Ese texto no es una copia de Aguante.');
        }
        set(normalizar({ ...INICIAL, ...d }));
        return null;
      },

      borrarTodo: () => set({ ...INICIAL, tema: get().tema, idioma: get().idioma, tutorialVisto: get().tutorialVisto }),
    }),
    {
      name: 'aguante',
      version: 4,
      storage: createJSONStorage(() => almacen),
      // v1 no tenía el registro de lo comido; v2 no tenía energía, idioma ni
      // dónde se guarda cada producto; v3 guardaba solo dos precios en el plan
      // de compra (garrafa y bote).
      migrate: (guardado) => normalizar({ ...INICIAL, ...(guardado as Partial<Datos>) }) as Estado,
    },
  ),
);

/** Completa lo que falte en datos de versiones anteriores (guardados o importados). */
function normalizar(d: Datos): Datos {
  return {
    ...d,
    energia: { ...INICIAL.energia, ...d.energia },
    actividad: d.actividad === 'normal' ? 'normal' : ACTIVIDAD_POR_DEFECTO,
    escenario: sinActividad(d.escenario ?? {}),
    // El antiguo «necesita frío» pasa a «se guarda en la nevera»
    productos: d.productos.map((p) =>
      p.conservacion || !p.necesitaFrio ? p : { ...p, conservacion: 'nevera' as const, necesitaFrio: undefined },
    ),
    emergencia: normalizarEmergencia(d.emergencia ?? null),
    notificar: { ...INICIAL.notificar, ...d.notificar },
    compra: normalizarCompra(d.compra ?? {}),
  };
}

/** Los precios del primer plan de compra (garrafa y bote) pasan a la lista de precios. */
function normalizarCompra(c: Compra): Compra {
  const { precioGarrafa, precioBote, ...resto } = c;
  const precios = { ...resto.precios };
  if (precioGarrafa && precios.agua === undefined) precios.agua = precioGarrafa;
  if (precioBote && precios.lista === undefined) precios.lista = precioBote;
  return { ...resto, precios, hechas: Array.isArray(resto.hechas) ? resto.hechas : [] };
}

function normalizarEmergencia(e: Emergencia | null): Emergencia | null {
  if (!e) return null;
  return {
    inicio: e.inicio,
    sinLuzDesde: e.sinLuzDesde,
    actividad: e.actividad === 'normal' ? 'normal' : e.actividad === 'sedentaria' ? 'sedentaria' : undefined,
    aguaHoy: e.aguaHoy ?? { fecha: hoyISO(), litros: 0 },
    comidoHoy: e.comidoHoy ?? { fecha: hoyISO(), items: [] },
  };
}
