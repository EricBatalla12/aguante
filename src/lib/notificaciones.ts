// Avisos locales: caducidad, día de compra y «Gasta esto esta semana».
//
// Se reprograman todos cada vez que cambia la despensa: es lo más simple y,
// con unas decenas de productos, no cuesta nada. Son notificaciones locales,
// que funcionan sin internet (y en Expo Go en Android).
//
// El texto de cada aviso sale de las funciones `contenido…`: las usa también
// el panel de admin (src/app/admin.tsx) para probarlos tal cual.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { diasHasta, gastarEstaSemana, proximosLunes, type Producto } from './calculo';
import { proximosRecordatorios } from './compra';
import type { ElementoKit } from '../constants/kit';
import { textoFenomeno } from '../components/avisos';
import type { AvisoMet } from './avisos';
import { textoMomento } from './fechas';
import { t } from '@/lib/i18n';

// Cuántos días antes de caducar se avisa. Dos meses dan margen para comerse
// el producto en el día a día y reponerlo: la rotación de toda la vida.
const AVISO_DIAS = 60;
const RECORDATORIO_DIAS = 7;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function pedirPermiso(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

/** Si el sistema deja notificar, sin preguntar. Null en la web, donde no hay avisos. */
export async function permisoConcedido(): Promise<boolean | null> {
  if (Platform.OS === 'web') return null;
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Fecha a las 10:00 de `n` días antes de la caducidad, o null si ya pasó. */
function fechaAviso(caducidad: string, n: number): Date | null {
  const [a, m, d] = caducidad.split('-').map(Number);
  const f = new Date(a, m - 1, d - n, 10, 0, 0);
  return f.getTime() > Date.now() ? f : null;
}

export type Contenido = { title: string; body: string };

/** Aviso de caducidad: a los 60 días o a la semana. */
export function contenidoCaducidad(nombre: string, diasAntes: number, kit: boolean): Contenido {
  return {
    title: diasAntes === AVISO_DIAS ? t('{nombre} caduca en 2 meses', { nombre }) : t('{nombre} caduca en 1 semana', { nombre }),
    body: kit ? t('Es del kit de emergencia: cámbialo por uno nuevo.') : t('Gástalo en el día a día y repón la reserva.'),
  };
}

/** Aviso del día de compra. */
export function contenidoCompra(): Contenido {
  return { title: t('Hoy toca la compra de la reserva'), body: t('Mira en el plan de compra de Aguante qué toca este mes.') };
}

/** Aviso de los lunes: lo que conviene gastar esa semana. Null si no hay nada. */
export function contenidoSemana(productos: Producto[], dia: Date): Contenido | null {
  const g = gastarEstaSemana(productos, dia);
  if (g.length === 0) return null;
  const nombres = g.slice(0, 3).map((x) => (x.estaSemana > 1 ? t('{nombre} ({n})', { nombre: x.nombre, n: x.estaSemana }) : x.nombre));
  const lista = g.length > 3 ? t('{lista} y {n} más', { lista: nombres.join(', '), n: g.length - 3 }) : nombres.join(', ');
  return { title: t('Esta semana, gasta esto'), body: t('{lista}: caducan pronto. Gástalo en el día a día y repón la reserva.', { lista }) };
}

/** Aviso naranja o rojo de AEMET (lo manda la tarea en segundo plano). */
export function contenidoAemet(aviso: AvisoMet): Contenido {
  const fenomeno = textoFenomeno(aviso.fenomeno).toLowerCase();
  return {
    title: aviso.nivel === 'rojo' ? t('Aviso rojo de AEMET: {fenomeno}', { fenomeno }) : t('Aviso naranja de AEMET: {fenomeno}', { fenomeno }),
    body: t('{zona}. De {inicio} a {fin}.', { zona: aviso.zona, inicio: textoMomento(aviso.inicio), fin: textoMomento(aviso.fin) }),
  };
}

/** Manda un aviso dentro de `segundos` (para probarlo desde el panel de admin). False si no hay permiso. */
export async function probarAviso(contenido: Contenido, segundos = 5): Promise<boolean> {
  if (!(await pedirPermiso())) return false;
  await Notifications.scheduleNotificationAsync({
    content: contenido,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, segundos) },
  });
  return true;
}

/** Los avisos que hay programados, por orden de fecha (para el panel de admin). */
export async function avisosProgramados(): Promise<{ titulo: string; fecha: number | null }[]> {
  if (Platform.OS === 'web') return [];
  const todos = await Notifications.getAllScheduledNotificationsAsync();
  return todos
    .map((n) => {
      const tr = n.trigger as { value?: number; date?: number | string } | null;
      const f = tr?.value ?? (tr?.date !== undefined ? new Date(tr.date).getTime() : null);
      return { titulo: n.content.title ?? '', fecha: typeof f === 'number' && Number.isFinite(f) ? f : null };
    })
    .sort((a, b) => (a.fecha ?? Infinity) - (b.fecha ?? Infinity));
}

export async function cancelarAvisos(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Avisa de los productos de la despensa y de lo del kit con caducidad
 * (medicinas, pilas…), si se ha elegido, del día de compra de cada mes y, con
 * `semana`, de lo que conviene gastar cada lunes (`despensaSemana`: la
 * despensa entera, aunque estén apagados sus avisos de caducidad). Del día de
 * compra y de los lunes se programan los tres próximos: como esto se
 * reprograma cada vez que se abre la app o cambia la despensa, siempre quedan
 * por delante.
 */
export async function reprogramarAvisos(
  productos: Producto[],
  kit: ElementoKit[] = [],
  diaCompra?: number,
  despensaSemana: Producto[] = [],
): Promise<void> {
  if (Platform.OS === 'web') return;
  const permiso = await Notifications.getPermissionsAsync();
  if (!permiso.granted) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const hoy = new Date();
  const conFecha = [
    ...productos.filter((p) => p.cantidad > 0).map((p) => ({ nombre: p.nombre, caducidad: p.caducidad, kit: false })),
    ...kit.map((k) => ({ nombre: k.que, caducidad: k.caducidad, kit: true })),
  ];
  for (const p of conFecha) {
    if (!p.caducidad) continue;
    const dias = diasHasta(p.caducidad, hoy);
    for (const n of [AVISO_DIAS, RECORDATORIO_DIAS]) {
      if (dias < n) continue; // ese aviso ya habría saltado
      const date = fechaAviso(p.caducidad, n);
      if (!date) continue;
      await Notifications.scheduleNotificationAsync({
        content: contenidoCaducidad(p.nombre, n, p.kit),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    }
  }
  for (const date of proximosLunes(new Date())) {
    const contenido = contenidoSemana(despensaSemana, date);
    if (!contenido) continue;
    await Notifications.scheduleNotificationAsync({
      content: contenido,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  }
  if (!diaCompra) return;
  for (const date of proximosRecordatorios(diaCompra, new Date())) {
    await Notifications.scheduleNotificationAsync({
      content: contenidoCompra(),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  }
}
