// Tarea en segundo plano (expo-background-task): con la app cerrada, más o
// menos cada hora,
// - mira los avisos de AEMET de la provincia elegida en Actualidad y notifica
//   los naranjas y rojos nuevos (si están encendidas las notificaciones y ese
//   tipo en Ajustes);
// - pone al día el widget de los días.
//
// Cuándo corre lo decide Android (WorkManager): nunca antes de 15 minutos y
// solo si hay conexión. Según la documentación de Expo, si se cierra la app a
// la fuerza la tarea se para hasta que se vuelve a abrir, y quitarla de
// recientes depende del fabricante. Por eso esto ayuda, pero no sustituye a
// ES-Alert, que llega solo al móvil.
//
// La tarea se define al cargar este fichero: tiene que importarse al arrancar
// (lo hace src/app/_layout.tsx).

import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { gravesSinAvisar, leerAemet, provinciaPorIne, urlAemet, type AvisoMet } from './avisos';
import { useAvisos } from './avisos-estado';
import { calcular } from './calculo';
import { contenidoAemet } from './notificaciones';
import { escenarioEfectivo, horasSinLuz, useAguante } from './store';
import { actualizarWidget } from './widget';

const TAREA = 'aguante-segundo-plano';
const CADA_MINUTOS = 60;

type ConPersist = { persist: { hasHydrated: () => boolean; onFinishHydration: (f: () => void) => () => void } };

/** Con la app cerrada los datos se leen del almacén al arrancar la tarea: hay que esperar a que estén. */
function hidratado(store: ConPersist): Promise<void> {
  if (store.persist.hasHydrated()) return Promise.resolve();
  return new Promise((listo) => {
    const tope = setTimeout(listo, 8000);
    const quitar = store.persist.onFinishHydration(() => {
      clearTimeout(tope);
      quitar();
      listo();
    });
  });
}

async function avisarAemet(): Promise<void> {
  const s = useAguante.getState();
  if (!s.avisos || !s.notificar.aemet) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  const a = useAvisos.getState();
  const p = provinciaPorIne(a.provincia);
  if (!p) return;
  const ctrl = new AbortController();
  const tope = setTimeout(() => ctrl.abort(), 20_000);
  let avisos: AvisoMet[];
  try {
    const r = await fetch(urlAemet(p.ccaa), { signal: ctrl.signal });
    if (!r.ok) return;
    avisos = leerAemet(await r.text());
  } finally {
    clearTimeout(tope);
  }
  const ahora = Date.now();
  const nuevos = gravesSinAvisar(avisos, p, ahora, a.avisados);
  for (const aviso of nuevos) {
    await Notifications.scheduleNotificationAsync({ content: contenidoAemet(aviso), trigger: null });
  }
  // Se recuerdan los avisados que siguen en pie; los acabados se olvidan
  const vigentes = new Set(avisos.filter((x) => x.fin > ahora).map((x) => x.id));
  useAvisos.setState({ avisados: [...a.avisados.filter((id) => vigentes.has(id)), ...nuevos.map((x) => x.id)] });
}

function widgetAlDia(): void {
  const s = useAguante.getState();
  const esc = escenarioEfectivo(s);
  actualizarWidget(calcular(s.personas, s.mascotas, s.productos, s.modo, esc, new Date(), s.manual, horasSinLuz(s.emergencia, esc)));
}

/** Lo que hace la tarea cada vez que corre. */
async function tarea(): Promise<void> {
  await Promise.all([hidratado(useAguante), hidratado(useAvisos)]);
  widgetAlDia();
  await avisarAemet();
}

TaskManager.defineTask(TAREA, async () => {
  try {
    await tarea();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Para el panel de admin: corre la tarea ahora mismo, con la app abierta. */
export async function ejecutarTareaAhora(): Promise<void> {
  await tarea();
}

/** Para el panel de admin: si Android deja tareas en segundo plano y si la nuestra está registrada. */
export async function estadoSegundoPlano(): Promise<{ disponible: boolean; registrada: boolean }> {
  const estado = await BackgroundTask.getStatusAsync();
  return { disponible: estado === BackgroundTask.BackgroundTaskStatus.Available, registrada: await TaskManager.isTaskRegisteredAsync(TAREA) };
}

/** Se registra una vez; si el sistema no deja tareas en segundo plano, no pasa nada. */
export async function registrarSegundoPlano(): Promise<void> {
  const estado = await BackgroundTask.getStatusAsync();
  if (estado !== BackgroundTask.BackgroundTaskStatus.Available) return;
  if (await TaskManager.isTaskRegisteredAsync(TAREA)) return;
  await BackgroundTask.registerTaskAsync(TAREA, { minimumInterval: CADA_MINUTOS });
}
