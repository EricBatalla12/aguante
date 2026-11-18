// Tutorial guiado: los pasos y el estado del recorrido.
//
// Cada paso abre una pantalla y, si tiene `hueco`, deja a la vista una parte
// de ella (la que envuelve <Hueco id="…"> en esa pantalla) y oscurece el
// resto. El estado no se guarda: si se cierra la app a medias, el tutorial no
// vuelve a salir solo (se puede repetir en Ajustes › Ayuda). Lo que sí se
// guarda es si ya se vio, en `tutorialVisto` del store.

import { router, type Href } from 'expo-router';
import { create } from 'zustand';

import { tx } from './i18n';
import { useAguante } from './store';

export type Rect = { x: number; y: number; ancho: number; alto: number };

export type Paso = {
  ruta: Href;
  hueco?: string;
  titulo: string;
  texto: string;
};

export const PASOS: Paso[] = [
  {
    ruta: '/',
    titulo: tx('Te damos la bienvenida a Aguante'),
    texto: tx('Aguante calcula cuántos días podríais pasar en casa con la comida, el agua y la energía que tenéis, y te ayuda a preparar la reserva. Son ocho pasos: puedes omitirlo cuando quieras y repetirlo en Ajustes.'),
  },
  {
    ruta: '/hogar',
    hueco: 'hogar-anadir',
    titulo: tx('Quién vive en casa'),
    texto: tx('Empieza por aquí: apunta a cada persona con su edad, su sexo y su peso, y a las mascotas. De eso sale cuánta comida y agua necesitáis al día.'),
  },
  {
    ruta: '/despensa',
    hueco: 'despensa-anadir',
    titulo: tx('Tu despensa'),
    texto: tx('Añade la comida y el agua que tenéis. Si escaneas el código de barras, la app busca las calorías. Con la fecha de caducidad te avisa antes de que se estropee.'),
  },
  {
    ruta: '/',
    hueco: 'inicio-dias',
    titulo: tx('Cuántos días aguantáis'),
    texto: tx('Aquí ves los días que os da la reserva y qué se acaba antes, el agua o la comida. Cambia el modo (normal, ligero, severo o extremo) para ver cuánto más aguantaríais racionando.'),
  },
  {
    ruta: '/',
    hueco: 'inicio-emergencia',
    titulo: tx('Si empieza una emergencia'),
    texto: tx('Pulsa aquí. Dices si hay luz, si podéis cocinar, si hace calor y si vais a estar sedentarios, y cada día te dice qué comer primero y cuánta agua beber.'),
  },
  {
    ruta: '/preparacion',
    hueco: 'preparacion-objetivo',
    titulo: tx('Prepárate poco a poco'),
    texto: tx('Elige cuántos días quieres aguantar y te dice qué te falta. También tienes el kit de emergencia, la mochila y un plan para comprar poco a poco.'),
  },
  {
    ruta: '/actualidad',
    titulo: tx('Actualidad'),
    texto: tx('Avisos de AEMET en tu provincia, terremotos, desastres graves, alertas de alimentos y medicamentos retirados y noticias, solo de fuentes oficiales. Arriba, lo que está en vigor; debajo, lo que ha pasado en el último mes, con filtros por zona y por tipo.'),
  },
  {
    ruta: '/ajustes',
    hueco: 'ajustes-casa',
    titulo: tx('Ajustes'),
    texto: tx('Comparte la casa con quien vive contigo, elige la actividad con la que se calcula y haz copias de tus datos. Abajo del todo, en Ayuda, puedes repetir este tutorial y leer las preguntas frecuentes.'),
  },
];

type EstadoTutorial = {
  paso: number | null; // null: no hay tutorial en marcha
  bloqueadoHasta: number; // tras cambiar de paso, un momento sin aceptar toques
  origen: Href; // adónde se vuelve al omitirlo
  huecos: Record<string, Rect>;
  ponerHueco: (id: string, r: Rect) => void;
};

export const useTutorial = create<EstadoTutorial>()((set) => ({
  paso: null,
  bloqueadoHasta: 0,
  origen: '/',
  huecos: {},
  ponerHueco: (id, r) => set((s) => ({ huecos: { ...s.huecos, [id]: r } })),
}));

// Lo que tarda en colocarse un paso: mientras, se ignoran los toques para que
// un doble toque no se salte uno
const PAUSA_MS = 450;

/** Va a un paso. Se olvida la medida vieja de su hueco: se vuelve a medir allí. */
function irA(paso: number) {
  const id = PASOS[paso].hueco;
  useTutorial.setState((s) => {
    const huecos = { ...s.huecos };
    if (id) delete huecos[id];
    return { paso, huecos, bloqueadoHasta: Date.now() + PAUSA_MS };
  });
  router.navigate(PASOS[paso].ruta);
}

const bloqueado = () => Date.now() < useTutorial.getState().bloqueadoHasta;

/**
 * Empieza desde el primer paso. `origen` es la pantalla a la que se vuelve si
 * se omite. Al arrancar la app no se navega: ya se está en Inicio y la
 * navegación aún no ha terminado de montarse.
 */
export function empezarTutorial(origen: Href = '/', navegar = true) {
  useTutorial.setState({ origen, huecos: {} });
  if (navegar) irA(0);
  else useTutorial.setState({ paso: 0 });
}

export function pasoSiguiente() {
  const { paso } = useTutorial.getState();
  if (paso === null || bloqueado()) return;
  if (paso + 1 >= PASOS.length) return terminarTutorial(false);
  irA(paso + 1);
}

export function pasoAnterior() {
  const { paso } = useTutorial.getState();
  if (paso !== null && paso > 0 && !bloqueado()) irA(paso - 1);
}

/** Cierra el tutorial y lo da por visto. Al omitirlo se vuelve a donde se empezó. */
export function terminarTutorial(omitido: boolean) {
  const { origen } = useTutorial.getState();
  useTutorial.setState({ paso: null });
  useAguante.getState().setTutorialVisto(true);
  if (omitido) router.navigate(origen);
}

/** La primera vez, con la app vacía, el tutorial sale solo. */
export function debeSalirSolo(s: { tutorialVisto: boolean; personas: unknown[]; productos: unknown[] }) {
  return !s.tutorialVisto && s.personas.length === 0 && s.productos.length === 0;
}
