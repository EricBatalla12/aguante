// Avisos oficiales: la provincia elegida en este móvil, lo último que se
// descargó y cuándo. Va en su propio almacén (`aguante-avisos`): no entra en
// las copias ni se comparte con la casa, porque cada móvil puede estar en un
// sitio y los avisos caducan solos.
//
// Se descarga al abrir la app y al volver a ella, como mucho cada 30 minutos,
// y siempre que se pulsa «Actualizar». Si no hay conexión se enseña lo último
// que se bajó, con su hora: en una emergencia no hay que depender de internet.

import { AppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { almacen } from './almacen';
import {
  GDACS_RSS,
  IGN_RSS,
  leerAemet,
  leerGdacs,
  leerIgn,
  provinciaPorIne,
  urlAemet,
  type AvisoMet,
  type Desastre,
  type Terremoto,
} from './avisos';

const CADA_MS = 30 * 60_000;
const ESPERA_MAX_MS = 15_000;

type EstadoAvisos = {
  provincia?: string; // código INE
  meteo: AvisoMet[]; // los de la comunidad entera; se filtra al pintar
  terremotos: Terremoto[];
  desastres: Desastre[];
  actualizado?: number; // ms de la última descarga que fue bien
  fallo: boolean; // la última descarga no se pudo hacer
  cargando: boolean;
  setProvincia: (ine: string) => void;
};

export const useAvisos = create<EstadoAvisos>()(
  persist(
    (set) => ({
      meteo: [],
      terremotos: [],
      desastres: [],
      fallo: false,
      cargando: false,
      setProvincia: (provincia) => {
        // Otra comunidad: lo de AEMET de antes ya no vale
        set({ provincia, meteo: [], actualizado: undefined });
        actualizarAvisos(true).catch(() => {});
      },
    }),
    {
      name: 'aguante-avisos',
      version: 1,
      storage: createJSONStorage(() => almacen),
      partialize: (s) => ({
        provincia: s.provincia,
        meteo: s.meteo,
        terremotos: s.terremotos,
        desastres: s.desastres,
        actualizado: s.actualizado,
      }),
    },
  ),
);

async function bajar(url: string): Promise<string> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_MAX_MS);
  try {
    const r = await fetch(url, { signal: control.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(reloj);
  }
}

/**
 * Descarga las tres fuentes. Sin `forzar`, no hace nada si la última
 * descarga tiene menos de 30 minutos. Cada fuente va por su lado: si una
 * falla, se queda lo que había de ella y se apunta el fallo.
 */
export async function actualizarAvisos(forzar = false) {
  const s = useAvisos.getState();
  const p = provinciaPorIne(s.provincia);
  if (!p || s.cargando) return;
  if (!forzar && s.actualizado && Date.now() - s.actualizado < CADA_MS) return;
  useAvisos.setState({ cargando: true });
  const [meteo, ign, gdacs] = await Promise.allSettled([bajar(urlAemet(p.ccaa)), bajar(IGN_RSS), bajar(GDACS_RSS)]);
  const cambios: Partial<EstadoAvisos> = { cargando: false };
  if (meteo.status === 'fulfilled') cambios.meteo = leerAemet(meteo.value);
  if (ign.status === 'fulfilled') cambios.terremotos = leerIgn(ign.value);
  if (gdacs.status === 'fulfilled') cambios.desastres = leerGdacs(gdacs.value);
  const todo = meteo.status === 'fulfilled' && ign.status === 'fulfilled' && gdacs.status === 'fulfilled';
  cambios.fallo = !todo;
  // La hora de actualización es la de AEMET, que es lo que más cambia y lo que se destaca
  if (meteo.status === 'fulfilled') cambios.actualizado = Date.now();
  useAvisos.setState(cambios);
}

let arrancado = false;

/** Al abrir la app y cada vez que se vuelve a ella. */
export function arrancarAvisos() {
  if (arrancado) return;
  arrancado = true;
  const ir = () => actualizarAvisos().catch(() => {});
  if (useAvisos.persist.hasHydrated()) ir();
  else useAvisos.persist.onFinishHydration(ir);
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') ir();
  });
}
