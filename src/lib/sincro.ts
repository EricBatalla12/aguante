// Cuenta y casa compartida: sincroniza lo compartido con Supabase.
//
// Sin conexión primero: la app sigue leyendo y escribiendo en el store local
// (src/lib/store.ts) como siempre. Este módulo mira qué cambia en él, lo
// apunta como pendiente (guardado, para que sobreviva a cerrar la app) y lo
// sube cuando hay red. Lo que cambian los demás llega por tiempo real o al
// volver a la app, y se mete en el store. Conflictos: gana el último cambio de
// cada elemento (src/lib/compartido.ts y supabase/esquema.sql).

import type { RealtimeChannel } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { almacen } from './almacen';
import {
  aplicarFilas,
  cambiosEntre,
  clave,
  juntarPendientes,
  resolver,
  todasLasFilas,
  vacio,
  type Compartido,
  type Fila,
} from './compartido';
import { t } from './i18n';
import { useAguante } from './store';
import { supabase } from './supabase';

export type Casa = { id: string; nombre: string; codigo: string };
export type Miembro = { usuario: string; correo: string | null; unido: string };
export type EstadoSincro = 'parado' | 'sincronizando' | 'al-dia' | 'sin-conexion' | 'error';

type Sincro = {
  casa: Casa | null;
  /** Al entrar en una casa: falta la primera bajada, que sustituye lo de este móvil. */
  inicial: boolean;
  /** Hasta dónde se ha bajado (campo `recibido` del servidor). */
  cursor: string | null;
  pendientes: Record<string, Fila>;
  ultima: number | null;
  // Lo de abajo no se guarda
  usuario: string | null;
  correo: string | null;
  estado: EstadoSincro;
  error: string | null;
};

export const useSincro = create<Sincro>()(
  persist(
    (): Sincro => ({
      casa: null,
      inicial: false,
      cursor: null,
      pendientes: {},
      ultima: null,
      usuario: null,
      correo: null,
      estado: 'parado',
      error: null,
    }),
    {
      name: 'aguante-casa',
      version: 1,
      storage: createJSONStorage(() => almacen),
      partialize: (s) => ({ casa: s.casa, inicial: s.inicial, cursor: s.cursor, pendientes: s.pendientes, ultima: s.ultima }),
    },
  ),
);

// ------------------------------------------------------------------ Errores

class SinConexion extends Error {}
/** Un error ya redactado para enseñarlo tal cual. */
class Aviso extends Error {}

/** Traduce un error de Supabase a algo que se entienda. */
function textoError(e: unknown): string {
  if (e instanceof Aviso) return e.message;
  const err = e as { message?: string; code?: string; status?: number; name?: string } | null;
  const m = `${err?.message ?? ''} ${err?.code ?? ''}`;
  if (esDeRed(e)) return t('Sin conexión. Se sincroniza solo cuando vuelva la red.');
  if (/not authorized|email_address_not_authorized/i.test(m)) {
    return t('Ese correo aún no puede recibir códigos: falta configurar el envío de correos en Supabase.');
  }
  if (err?.status === 429 || /rate.?limit|over_email_send/i.test(m)) {
    return t('Se han pedido demasiados códigos. Espera un rato y vuelve a probar.');
  }
  if (/otp_expired|expired|invalid.*(otp|token)|token.*invalid/i.test(m)) {
    return t('El código no es correcto o ha caducado. Pide otro.');
  }
  if (err?.name === 'AuthRetryableFetchError' && (err.status ?? 0) >= 500) {
    return t('El servidor ha fallado ({estado}). Prueba otra vez dentro de un rato.', { estado: err.status ?? 0 });
  }
  if (/demasiados_intentos/.test(m)) return t('Demasiados códigos de casa incorrectos. Prueba dentro de una hora.');
  if (/demasiadas_casas/.test(m)) return t('Ya estás en 5 casas, que es el máximo.');
  if (/PGRST202|42P01|42883|does not exist|Could not find the function/i.test(m)) {
    return t('El servidor aún no está preparado: faltan las tablas de la casa.');
  }
  return t('Algo ha fallado: {error}', { error: err?.message ?? String(e) });
}

function esDeRed(e: unknown): boolean {
  if (e instanceof SinConexion) return true;
  const err = e as { message?: string; name?: string; status?: number } | null;
  // supabase-js llama «reintentable» tanto a quedarse sin red (estado 0)
  // como a un error 5xx del servidor; solo lo primero es estar sin conexión
  if (err?.name === 'AuthRetryableFetchError') return !err.status;
  return /network request failed|failed to fetch|fetch failed|networkerror|load failed/i.test(err?.message ?? '');
}

/** Lanza el error de una respuesta de Supabase, si lo hay. Los fallos de red de PostgREST llegan con `message` de fetch. */
function comprobar<T = unknown>(r: { data?: unknown; error: unknown }): T {
  if (r.error) throw esDeRed(r.error) ? new SinConexion() : r.error;
  return r.data as T;
}

// ------------------------------------------------------------------ Lo compartido del store

const compartidoDe = () => useAguante.getState() as unknown as Compartido;

// Mientras se mete en el store lo que llega del servidor, el vigilante de
// cambios no debe apuntarlo como cambio propio
let aplicando = false;

function meterEnStore(nuevo: Compartido) {
  aplicando = true;
  try {
    useAguante.setState({
      personas: nuevo.personas,
      mascotas: nuevo.mascotas,
      productos: nuevo.productos,
      kitPropio: nuevo.kitPropio,
      kit: nuevo.kit,
      manual: nuevo.manual,
      modo: nuevo.modo,
      energia: nuevo.energia,
    } as never);
  } finally {
    aplicando = false;
  }
}

function aplicarDelServidor(filas: Fila[]) {
  const nuevo = aplicarFilas(compartidoDe(), filas);
  if (nuevo) meterEnStore(nuevo);
}

// ------------------------------------------------------------------ Subir y bajar

type FilaServidor = Fila & { recibido: string };
const COLUMNAS = 'tipo, id, datos, borrado, cambiado, recibido';
const LOTE = 500;
const PAGINA = 1000;

async function subir(casa: Casa) {
  for (;;) {
    const lote = Object.values(useSincro.getState().pendientes).slice(0, LOTE);
    if (lote.length === 0) return;
    const delServidor =
      comprobar<FilaServidor[] | null>(await supabase.rpc('subir_cambios', { p_casa: casa.id, p_cambios: lote })) ?? [];
    if (useSincro.getState().casa?.id !== casa.id) return;
    // Lo subido deja de estar pendiente, salvo que se haya vuelto a tocar
    // mientras tanto. El servidor puede guardar otra hora (recorta las
    // adelantadas), así que se compara con lo que se mandó, no con lo que vuelve.
    const quedan = { ...useSincro.getState().pendientes };
    for (const f of lote) {
      const k = clave(f.tipo, f.id);
      if (quedan[k] && quedan[k].cambiado <= f.cambiado) delete quedan[k];
    }
    // Lo que vuelve es cómo ha quedado cada elemento: si otro móvil lo cambió
    // después, gana lo suyo y se mete aquí
    const { aplicar } = resolver(quedan, delServidor);
    aplicarDelServidor(aplicar);
    useSincro.setState({ pendientes: quedan });
    if (lote.length < LOTE) return;
  }
}

async function bajar(casa: Casa) {
  const { cursor, inicial } = useSincro.getState();
  // Se repasan los últimos 30 s: una fila guardada en una transacción que
  // terminó tarde podría llevar una hora anterior al cursor. Aplicar dos veces
  // lo mismo no cambia nada.
  const desde = cursor && !inicial ? new Date(Date.parse(cursor) - 30_000).toISOString() : null;
  const filas: FilaServidor[] = [];
  for (let desdeFila = 0; ; desdeFila += PAGINA) {
    let q = supabase.from('elementos').select(COLUMNAS).eq('casa_id', casa.id);
    if (desde) q = q.gt('recibido', desde);
    const pagina =
      comprobar<FilaServidor[] | null>(
        await q.order('recibido').order('tipo').order('id').range(desdeFila, desdeFila + PAGINA - 1),
      ) ?? [];
    filas.push(...pagina);
    if (pagina.length < PAGINA) break;
  }
  if (useSincro.getState().casa?.id !== casa.id) return;

  const nuevoCursor = filas.reduce<string | null>((max, f) => (!max || f.recibido > max ? f.recibido : max), cursor);

  if (inicial) {
    if (filas.length === 0) {
      // Casa vacía: lo que hay en este móvil pasa a ser lo de la casa
      useSincro.setState({
        inicial: false,
        cursor: nuevoCursor,
        pendientes: juntarPendientes({}, todasLasFilas(compartidoDe(), Date.now())),
      });
    } else {
      // Casa con datos: sustituyen a los de este móvil
      const base = vacio(compartidoDe());
      meterEnStore(aplicarFilas(base, filas) ?? base);
      useSincro.setState({ inicial: false, pendientes: {}, cursor: nuevoCursor });
    }
    return;
  }

  const r = resolver(useSincro.getState().pendientes, filas);
  aplicarDelServidor(r.aplicar);
  useSincro.setState({ pendientes: r.pendientes, cursor: nuevoCursor });
}

// Una sola sincronización a la vez; si se pide otra mientras, se repite al acabar
let enCurso: Promise<void> | null = null;
let otraVez = false;

export function sincronizar(): Promise<void> {
  if (enCurso) {
    otraVez = true;
    return enCurso;
  }
  enCurso = (async () => {
    do {
      otraVez = false;
      const casa = useSincro.getState().casa;
      if (!casa || !useSincro.getState().usuario) return;
      useSincro.setState({ estado: 'sincronizando' });
      try {
        // Primero se baja: así, al entrar en una casa, lo de este móvil no
        // pisa lo que ya tenía la casa
        await bajar(casa);
        await subir(casa);
        useSincro.setState({ estado: 'al-dia', error: null, ultima: Date.now() });
      } catch (e) {
        if (/no_eres_de_la_casa/.test((e as { message?: string })?.message ?? '')) {
          // Alguien ha borrado la casa o te ha sacado: lo de este móvil se queda
          olvidarCasa();
          useSincro.setState({ estado: 'error', error: t('Ya no estás en esa casa. Lo que tenías se queda en este móvil.') });
          return;
        }
        useSincro.setState({ estado: esDeRed(e) ? 'sin-conexion' : 'error', error: textoError(e) });
      }
    } while (otraVez);
  })().finally(() => {
    enCurso = null;
  });
  return enCurso;
}

// ------------------------------------------------------------------ En marcha

let canal: RealtimeChannel | null = null;
let espera: ReturnType<typeof setTimeout> | null = null;
let reloj: ReturnType<typeof setInterval> | null = null;
let vueltas = 0;

/** Agrupa varias peticiones seguidas (teclear, varios avisos de tiempo real) en una sola sincronización. */
function programar(ms: number) {
  if (espera) clearTimeout(espera);
  espera = setTimeout(() => {
    espera = null;
    sincronizar();
  }, ms);
}

function conectar() {
  const { casa, usuario } = useSincro.getState();
  if (!casa || !usuario || canal) return;
  canal = supabase
    .channel(`casa:${casa.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'elementos', filter: `casa_id=eq.${casa.id}` }, () =>
      programar(400),
    )
    // Al conectarse (o reconectarse) se baja lo que haya cambiado mientras tanto
    .subscribe((estado) => {
      if (estado === 'SUBSCRIBED') programar(100);
    });
  // Por si el tiempo real se cae sin avisar: con la app abierta se sube lo
  // pendiente cada minuto y se baja cada cinco
  reloj ??= setInterval(() => {
    if (AppState.currentState !== 'active') return;
    vueltas += 1;
    const s = useSincro.getState();
    if (Object.keys(s.pendientes).length > 0 || s.estado !== 'al-dia' || vueltas % 5 === 0) sincronizar();
  }, 60_000);
  programar(100);
}

function desconectar() {
  if (canal) supabase.removeChannel(canal);
  canal = null;
  if (reloj) clearInterval(reloj);
  reloj = null;
  if (espera) clearTimeout(espera);
  espera = null;
}

function olvidarCasa() {
  desconectar();
  useSincro.setState({ casa: null, inicial: false, cursor: null, pendientes: {}, ultima: null });
}

let arrancado = false;

const hidratado = (s: { persist: { hasHydrated: () => boolean; onFinishHydration: (f: () => void) => () => void } }) =>
  new Promise<void>((listo) => {
    if (s.persist.hasHydrated()) return listo();
    const quitar = s.persist.onFinishHydration(() => {
      quitar();
      listo();
    });
  });

/**
 * Se llama una vez al arrancar, con los datos ya leídos. Sin cuenta no hace
 * nada más que escuchar si se inicia sesión.
 */
export async function arrancarSincro() {
  if (arrancado) return;
  arrancado = true;
  // Hay que esperar a que los dos stores hayan leído lo guardado: si no, la
  // carga parecería un cambio de todo y se subiría pisando lo de los demás
  await Promise.all([hidratado(useAguante), hidratado(useSincro)]);

  useAguante.subscribe((ahora, antes) => {
    if (aplicando || !useSincro.getState().casa) return;
    const filas = cambiosEntre(antes as unknown as Compartido, ahora as unknown as Compartido, Date.now());
    if (filas.length === 0) return;
    useSincro.setState((s) => ({ pendientes: juntarPendientes(s.pendientes, filas) }));
    programar(1500);
  });

  supabase.auth.onAuthStateChange((evento, sesion) => {
    useSincro.setState({ usuario: sesion?.user.id ?? null, correo: sesion?.user.email ?? null });
    // La documentación de Supabase pide no llamar a Supabase dentro de este
    // aviso: se deja para justo después
    // Si la sesión se cae sola (no con «Cerrar sesión»), la casa y lo
    // pendiente se guardan: al volver a entrar se sigue donde se dejó. Si
    // entra otra cuenta que no es de la casa, el servidor lo dice y se olvida.
    setTimeout(() => {
      if (sesion) conectar();
      else if (evento === 'SIGNED_OUT') desconectar();
    }, 0);
  });

  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') programar(300);
  });
}

// ------------------------------------------------------------------ Acciones de la pantalla de cuenta

/** Devuelven null si ha ido bien o el texto del error. */
async function intentar(f: () => Promise<void>): Promise<string | null> {
  try {
    await f();
    return null;
  } catch (e) {
    return textoError(e);
  }
}

export const enviarCodigo = (correo: string) =>
  intentar(async () => {
    const r = await supabase.auth.signInWithOtp({ email: correo.trim(), options: { shouldCreateUser: true } });
    // Un 500 aquí casi siempre es que el servidor de correo (SMTP) ha
    // rechazado el envío: decirlo así ahorra buscarlo en los registros
    if ((r.error as { status?: number } | null)?.status === 500) {
      throw new Aviso(t('No se ha podido mandar el correo con el código. Prueba más tarde.'));
    }
    comprobar(r);
  });

export const comprobarCodigo = (correo: string, codigo: string) =>
  intentar(async () => {
    comprobar(await supabase.auth.verifyOtp({ email: correo.trim(), token: codigo.trim(), type: 'email' }));
  });

export const cerrarSesion = () =>
  intentar(async () => {
    // Lo pendiente se sube antes, si se puede; lo de este móvil se queda
    await sincronizar();
    comprobar(await supabase.auth.signOut());
    olvidarCasa();
  });

/** Las casas de las que ya eres (al volver a entrar en la cuenta, o en otro móvil). */
export async function misCasas(): Promise<{ casas: Casa[]; error: string | null }> {
  try {
    const casas = comprobar<Casa[] | null>(await supabase.from('casas').select('id, nombre, codigo').order('creada'));
    return { casas: casas ?? [], error: null };
  } catch (e) {
    return { casas: [], error: textoError(e) };
  }
}

export async function miembros(casa: Casa): Promise<Miembro[]> {
  try {
    return comprobar<Miembro[] | null>(await supabase.from('miembros').select('usuario, correo, unido').eq('casa_id', casa.id).order('unido')) ?? [];
  } catch {
    return [];
  }
}

/** Crea una casa con lo que hay en este móvil. */
export const crearCasa = (nombre: string) =>
  intentar(async () => {
    const casa = comprobar<Casa>(await supabase.rpc('crear_casa', { p_nombre: nombre }));
    useSincro.setState({
      casa: { id: casa.id, nombre: casa.nombre, codigo: casa.codigo },
      inicial: false,
      cursor: null,
      pendientes: juntarPendientes({}, todasLasFilas(compartidoDe(), Date.now())),
    });
    conectar();
  });

/** Entra en una casa de la que ya eres miembro: lo que tenga la casa sustituye a lo de este móvil. */
export function entrarEnCasa(casa: Casa) {
  desconectar();
  useSincro.setState({ casa, inicial: true, cursor: null, pendientes: {} });
  conectar();
  return sincronizar();
}

export const unirseACasa = (codigo: string) =>
  intentar(async () => {
    const casa = comprobar<Casa | null>(await supabase.rpc('unirse_casa', { p_codigo: codigo }));
    if (!casa?.id) throw new Aviso(t('No hay ninguna casa con ese código.'));
    await entrarEnCasa({ id: casa.id, nombre: casa.nombre, codigo: casa.codigo });
  });

/** Sale de la casa. Lo que hay en este móvil se queda como copia propia. */
export const salirDeCasa = () =>
  intentar(async () => {
    const casa = useSincro.getState().casa;
    if (!casa) return;
    await sincronizar();
    comprobar(await supabase.rpc('salir_casa', { p_casa: casa.id }));
    olvidarCasa();
  });
