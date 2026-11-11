// Avisos locales de caducidad.
//
// Se reprograman todos cada vez que cambia la despensa: es lo más simple y,
// con unas decenas de productos, no cuesta nada. Son notificaciones locales,
// que funcionan sin internet (y en Expo Go en Android).

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { diasHasta, type Producto } from './calculo';

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

/** Fecha a las 10:00 de `n` días antes de la caducidad, o null si ya pasó. */
function fechaAviso(caducidad: string, n: number): Date | null {
  const [a, m, d] = caducidad.split('-').map(Number);
  const f = new Date(a, m - 1, d - n, 10, 0, 0);
  return f.getTime() > Date.now() ? f : null;
}

export async function cancelarAvisos(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function reprogramarAvisos(productos: Producto[]): Promise<void> {
  if (Platform.OS === 'web') return;
  const permiso = await Notifications.getPermissionsAsync();
  if (!permiso.granted) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const hoy = new Date();
  for (const p of productos) {
    if (!p.caducidad || p.cantidad <= 0) continue;
    const dias = diasHasta(p.caducidad, hoy);
    for (const n of [AVISO_DIAS, RECORDATORIO_DIAS]) {
      if (dias < n) continue; // ese aviso ya habría saltado
      const date = fechaAviso(p.caducidad, n);
      if (!date) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${p.nombre} caduca en ${n === AVISO_DIAS ? '2 meses' : '1 semana'}`,
          body: 'Gástalo en el día a día y repón la reserva.',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    }
  }
}
