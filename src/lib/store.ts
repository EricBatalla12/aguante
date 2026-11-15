// Estado de la app, guardado en el móvil.
//
// Todo vive en local (SQLite clave-valor de Expo): en una emergencia lo
// normal es no tener internet, así que la app no depende de ningún servidor.

import { almacen } from './almacen';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  aguaPersona,
  descontarAgua,
  devolverAgua,
  kcalPersona,
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
import type { Aparato, Epoca, FuenteEnergia, Zona } from './energia';
import { t } from '@/lib/i18n';

/** Algo que se ha marcado como comido hoy, para poder deshacerlo. */
export type Comido = { id: string; productoId: string; nombre: string; unidades: number; kcal: number };

export type Emergencia = {
  inicio: string; // ISO
  sinLuzDesde?: string; // ISO: cuándo se fue la luz, para las horas de nevera y congelador
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
  escenario: Escenario;
  objetivoDias: number;
  kit: Record<string, boolean>;
  kitPropio: ElementoKit[]; // lo que añade cada casa al kit de serie
  emergencia: Emergencia | null;
  tema: Tema;
  idioma: Idioma;
  avisos: boolean;
  energia: Energia;
  trueque: string; // nota libre: lo que se ofrece o se busca
};

type Estado = Datos & {
  guardarPersona: (p: Persona) => void;
  borrarPersona: (id: string) => void;
  guardarMascota: (m: Mascota) => void;
  borrarMascota: (id: string) => void;
  guardarProducto: (p: Producto) => void;
  borrarProducto: (id: string) => void;
  setModo: (m: Modo) => void;
  setRacion: (id: string, r: Racion) => void;
  copiarManualDe: (modo: ModoAuto) => void;
  setEscenario: (e: Escenario) => void;
  setObjetivo: (dias: number) => void;
  alternarKit: (id: string) => void;
  anadirKit: (que: string) => void;
  borrarKit: (id: string) => void;
  setTema: (t: Tema) => void;
  setAvisos: (v: boolean) => void;
  setIdioma: (i: Idioma) => void;
  guardarFuente: (f: FuenteEnergia) => void;
  borrarFuente: (id: string) => void;
  guardarAparato: (a: Aparato) => void;
  borrarAparato: (id: string) => void;
  setZonaSolar: (zona: Zona, epoca: Epoca) => void;
  setTrueque: (texto: string) => void;
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
  objetivoDias: 7,
  kit: {},
  kitPropio: [],
  emergencia: null,
  tema: 'sistema',
  idioma: 'sistema',
  avisos: false,
  energia: { fuentes: [], aparatos: [], zona: 'centro', epoca: 'invierno' },
  trueque: '',
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
    objetivoDias: s.objetivoDias,
    kit: s.kit,
    kitPropio: s.kitPropio,
    emergencia: s.emergencia,
    tema: s.tema,
    idioma: s.idioma,
    avisos: s.avisos,
    energia: s.energia,
    trueque: s.trueque,
  };
}

export const useAguante = create<Estado>()(
  persist(
    (set, get) => ({
      ...INICIAL,

      guardarPersona: (p) => set((s) => ({ personas: upsert(s.personas, p) })),
      borrarPersona: (id) =>
        set((s) => ({ personas: s.personas.filter((p) => p.id !== id), manual: sin(s.manual, id) })),
      guardarMascota: (m) => set((s) => ({ mascotas: upsert(s.mascotas, m) })),
      borrarMascota: (id) =>
        set((s) => ({ mascotas: s.mascotas.filter((m) => m.id !== id), manual: sin(s.manual, id) })),
      guardarProducto: (p) => set((s) => ({ productos: upsert(s.productos, p) })),
      borrarProducto: (id) => set((s) => ({ productos: s.productos.filter((p) => p.id !== id) })),
      setModo: (modo) => set({ modo }),
      setRacion: (id, r) => set((s) => ({ manual: { ...s.manual, [id]: { ...s.manual[id], ...r } } })),
      // Punto de partida para el reparto manual: las raciones de uno de los
      // modos calculados. Las mascotas se quedan con su ración completa.
      copiarManualDe: (modo) =>
        set((s) => {
          const manual: Manual = {};
          for (const p of s.personas) {
            manual[p.id] = {
              kcal: Math.round(kcalPersona(p, modo) / 50) * 50,
              litros: Math.ceil(aguaPersona(p, modo, s.escenario) * 4) / 4,
            };
          }
          return { manual };
        }),
      // En plena emergencia, apunto cuándo se va la luz: de eso depende cuánto
      // aguantan la nevera y el congelador.
      setEscenario: (escenario) =>
        set((s) => {
          if (!s.emergencia || !!escenario.sinLuz === !!s.escenario.sinLuz) return { escenario };
          return {
            escenario,
            emergencia: { ...s.emergencia, sinLuzDesde: escenario.sinLuz ? new Date().toISOString() : undefined },
          };
        }),
      setObjetivo: (objetivoDias) => set({ objetivoDias }),
      alternarKit: (id) => set((s) => ({ kit: { ...s.kit, [id]: !s.kit[id] } })),
      anadirKit: (que) => set((s) => ({ kitPropio: [...s.kitPropio, { id: `propio-${nuevoId()}`, que }] })),
      borrarKit: (id) => set((s) => ({ kitPropio: s.kitPropio.filter((k) => k.id !== id), kit: sin(s.kit, id) })),
      setTema: (tema) => set({ tema }),
      setAvisos: (avisos) => set({ avisos }),
      setIdioma: (idioma) => set({ idioma }),
      guardarFuente: (f) => set((s) => ({ energia: { ...s.energia, fuentes: upsert(s.energia.fuentes, f) } })),
      borrarFuente: (id) =>
        set((s) => ({ energia: { ...s.energia, fuentes: s.energia.fuentes.filter((f) => f.id !== id) } })),
      guardarAparato: (a) => set((s) => ({ energia: { ...s.energia, aparatos: upsert(s.energia.aparatos, a) } })),
      borrarAparato: (id) =>
        set((s) => ({ energia: { ...s.energia, aparatos: s.energia.aparatos.filter((a) => a.id !== id) } })),
      setZonaSolar: (zona, epoca) => set((s) => ({ energia: { ...s.energia, zona, epoca } })),
      setTrueque: (trueque) => set({ trueque }),

      empezarEmergencia: (escenario) =>
        set((s) => {
          const esc = escenario ?? s.escenario;
          const ahora = new Date().toISOString();
          return {
            escenario: esc,
            emergencia: {
              inicio: ahora,
              sinLuzDesde: esc.sinLuz ? ahora : undefined,
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

      borrarTodo: () => set({ ...INICIAL, tema: get().tema, idioma: get().idioma }),
    }),
    {
      name: 'aguante',
      version: 3,
      storage: createJSONStorage(() => almacen),
      // v1 no tenía el registro de lo comido; v2 no tenía energía, idioma ni
      // dónde se guarda cada producto.
      migrate: (guardado) => normalizar({ ...INICIAL, ...(guardado as Partial<Datos>) }) as Estado,
    },
  ),
);

/** Completa lo que falte en datos de versiones anteriores (guardados o importados). */
function normalizar(d: Datos): Datos {
  return {
    ...d,
    energia: { ...INICIAL.energia, ...d.energia },
    // El antiguo «necesita frío» pasa a «se guarda en la nevera»
    productos: d.productos.map((p) =>
      p.conservacion || !p.necesitaFrio ? p : { ...p, conservacion: 'nevera' as const, necesitaFrio: undefined },
    ),
    emergencia: normalizarEmergencia(d.emergencia ?? null),
  };
}

function normalizarEmergencia(e: Emergencia | null): Emergencia | null {
  if (!e) return null;
  return {
    inicio: e.inicio,
    sinLuzDesde: e.sinLuzDesde,
    aguaHoy: e.aguaHoy ?? { fecha: hoyISO(), litros: 0 },
    comidoHoy: e.comidoHoy ?? { fecha: hoyISO(), items: [] },
  };
}
