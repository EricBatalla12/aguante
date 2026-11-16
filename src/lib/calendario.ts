// Avisos de caducidad en el calendario de cada uno.
//
// Sin módulos nativos (así llega por actualización, sin APK nuevo): se abre la
// página de «crear evento» de Google Calendar con todo relleno y la persona lo
// guarda. En Android abre la app de Calendar si está instalada. Una
// suscripción ICS que se actualice sola necesitaría un servidor.
//
// No importa nada: los tests corren con `node --test` sin compilar.

/** Con cuánto margen se avisa: lo mismo que las notificaciones de la app. */
export const AVISO_CALENDARIO_DIAS = 60;

const dos = (n: number) => String(n).padStart(2, '0');
const aTexto = (d: Date) => `${d.getUTCFullYear()}${dos(d.getUTCMonth() + 1)}${dos(d.getUTCDate())}`;

/** Día del aviso (AAAA-MM-DD): 60 días antes de caducar, o hoy si ya queda menos. */
export function diaAviso(caducidad: string, hoy: Date): string {
  const [a, m, d] = caducidad.split('-').map(Number);
  const aviso = Date.UTC(a, m - 1, d - AVISO_CALENDARIO_DIAS);
  const base = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const f = new Date(Math.max(aviso, base));
  return `${f.getUTCFullYear()}-${dos(f.getUTCMonth() + 1)}-${dos(f.getUTCDate())}`;
}

/** Enlace para crear un evento de día entero en Google Calendar. */
export function enlaceCalendario(o: { titulo: string; detalle: string; dia: string }): string {
  const [a, m, d] = o.dia.split('-').map(Number);
  const inicio = new Date(Date.UTC(a, m - 1, d));
  const fin = new Date(Date.UTC(a, m - 1, d + 1)); // el final de un evento de día entero es exclusivo
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: o.titulo,
    details: o.detalle,
    dates: `${aTexto(inicio)}/${aTexto(fin)}`,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
