// Registro de errores: cuando la app falla en un móvil, se manda a Supabase
// (tabla `errores`, servidores en Europa) qué falló, sin ningún dato de la
// persona: el mensaje, dónde (la pila), la versión de la app y la
// plataforma. Así Eric se entera de los fallos sin que nadie tenga que
// avisarle. Se puede apagar en Ajustes (`notificar.errores`).
//
// Solo ve los errores de JavaScript; si se cierra la parte nativa no llega
// nada. Como mucho 5 por sesión y sin repetir el mismo.

import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

import { useAguante } from './store';
import { supabase } from './supabase';

const MAXIMO = 5;
let mandados = 0;
const vistos = new Set<string>();
let enMarcha = false;

/** Lo que se manda de un error: nada de la persona, y recortado. */
export function datosError(e: unknown, fatal: boolean) {
  const err = e instanceof Error ? e : new Error(String(e));
  return {
    mensaje: `${err.name}: ${err.message}`.slice(0, 500),
    pila: (err.stack ?? '').slice(0, 4000),
    fatal,
    version: Constants.expoConfig?.version ?? '?',
    actualizacion: Updates.updateId ?? 'integrada',
    plataforma: `${Platform.OS} ${String(Platform.Version)}`,
  };
}

export function apuntarError(e: unknown, fatal = false): void {
  if (!useAguante.getState().notificar.errores || mandados >= MAXIMO) return;
  const d = datosError(e, fatal);
  if (vistos.has(d.mensaje)) return;
  vistos.add(d.mensaje);
  mandados++;
  supabase.rpc('apuntar_error', { p: d }).then(
    () => {},
    () => {},
  );
}

type ManejadorGlobal = (e: unknown, fatal?: boolean) => void;
type ConManejador = { ErrorUtils?: { getGlobalHandler: () => ManejadorGlobal; setGlobalHandler: (h: ManejadorGlobal) => void } };

/** Engancha el manejador de errores de React Native: apunta el error y deja que siga como siempre. */
export function vigilarErrores(): void {
  if (enMarcha || Platform.OS === 'web' || __DEV__) return;
  const eu = (globalThis as ConManejador).ErrorUtils;
  if (!eu) return;
  enMarcha = true;
  const anterior = eu.getGlobalHandler();
  eu.setGlobalHandler((e, fatal) => {
    try {
      apuntarError(e, !!fatal);
    } catch {
      // Apuntar un error no puede romper nada más
    }
    anterior(e, fatal);
  });
}
