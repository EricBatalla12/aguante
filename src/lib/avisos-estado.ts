// Avisos oficiales: la provincia elegida en este móvil, lo que se ha ido
// descargando (con un mes de historial, para la pestaña Actualidad) y cuándo. Va en su propio almacén (`aguante-avisos`): no entra en
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
  AEMPS_RSS,
  AESAN_ALERTAS,
  COPERNICUS_API,
  GDACS_RSS,
  IGN_RSS,
  NOTICIAS_AEMET_RSS,
  juntarActivaciones,
  juntarDesastres,
  juntarMeteo,
  juntarNoticias,
  juntarTerremotos,
  latin9,
  leerAemet,
  leerAemps,
  leerAesan,
  leerCopernicus,
  leerGdacs,
  leerIgn,
  leerNoticiasAemet,
  provinciaPorIne,
  urlAemet,
  type Activacion,
  type AvisoMet,
  type Desastre,
  type Noticia,
  type Terremoto,
} from './avisos';

const CADA_MS = 30 * 60_000;
const ESPERA_MAX_MS = 15_000;

type EstadoAvisos = {
  provincia?: string; // código INE
  meteo: AvisoMet[]; // los de la comunidad entera y los ya acabados de la provincia; se filtra al pintar
  terremotos: Terremoto[];
  desastres: Desastre[]; // los cerrados llevan `cerrado`
  noticias: Noticia[]; // noticias de AEMET
  activaciones: Activacion[]; // Copernicus
  alimentos: Noticia[]; // alertas de AESAN
  medicamentos: Noticia[]; // alertas de la AEMPS
  actualizado?: number; // ms de la última descarga que fue bien
  fallo: boolean; // la última descarga no se pudo hacer entera
  fallidas: string[]; // qué fuentes fallaron, para decirlo en pantalla
  cargando: boolean;
  /** Avisos de AEMET ya notificados con la app cerrada (sus id), para no repetirlos. */
  avisados: string[];
  setProvincia: (ine: string) => void;
};

export const useAvisos = create<EstadoAvisos>()(
  persist(
    (set) => ({
      avisados: [],
      meteo: [],
      terremotos: [],
      desastres: [],
      noticias: [],
      activaciones: [],
      alimentos: [],
      medicamentos: [],
      fallo: false,
      fallidas: [],
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
        noticias: s.noticias,
        activaciones: s.activaciones,
        alimentos: s.alimentos,
        medicamentos: s.medicamentos,
        actualizado: s.actualizado,
        avisados: s.avisados,
      }),
    },
  ),
);

async function bajar(url: string, enLatin9 = false): Promise<string> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_MAX_MS);
  try {
    const r = await fetch(url, { signal: control.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    // Las noticias de AEMET vienen en ISO-8859-15: se leen los bytes tal cual
    return enLatin9 ? latin9(new Uint8Array(await r.arrayBuffer())) : await r.text();
  } finally {
    clearTimeout(reloj);
  }
}

/**
 * Descarga las siete fuentes y las junta con lo que ya había. Sin `forzar`,
 * no hace nada si la última descarga tiene menos de 30 minutos. Cada fuente
 * va por su lado: si una falla, se queda lo que había de ella y se apunta el
 * fallo.
 */
export async function actualizarAvisos(forzar = false) {
  const s = useAvisos.getState();
  const p = provinciaPorIne(s.provincia);
  if (!p || s.cargando) return;
  if (!forzar && s.actualizado && Date.now() - s.actualizado < CADA_MS) return;
  useAvisos.setState({ cargando: true });
  // Cada lectura va dentro de su promesa: si una página cambia y no se puede leer, cuenta como fallo de esa fuente
  const [meteo, ign, gdacs, noticias, copernicus, aesan, aemps] = await Promise.allSettled([
    bajar(urlAemet(p.ccaa)).then(leerAemet),
    bajar(IGN_RSS).then(leerIgn),
    bajar(GDACS_RSS).then(leerGdacs),
    bajar(NOTICIAS_AEMET_RSS, true).then(leerNoticiasAemet),
    bajar(COPERNICUS_API).then((t) => leerCopernicus(JSON.parse(t))),
    bajar(AESAN_ALERTAS).then(leerAesan),
    bajar(AEMPS_RSS).then(leerAemps),
  ]);
  // Lo de antes se lee ahora y no al empezar: la descarga tarda y puede haber cambiado
  const antes = useAvisos.getState();
  const ahora = Date.now();
  const cambios: Partial<EstadoAvisos> = { cargando: false };
  // Si se cambió de provincia mientras bajaba, lo de AEMET es de la otra: se descarta y se vuelve a bajar
  const otraProvincia = antes.provincia !== p.ine;
  if (meteo.status === 'fulfilled' && !otraProvincia) cambios.meteo = juntarMeteo(antes.meteo, meteo.value, p, ahora);
  if (ign.status === 'fulfilled') cambios.terremotos = juntarTerremotos(antes.terremotos, ign.value, ahora);
  if (gdacs.status === 'fulfilled') cambios.desastres = juntarDesastres(antes.desastres, gdacs.value, ahora);
  if (noticias.status === 'fulfilled') cambios.noticias = juntarNoticias(antes.noticias, noticias.value, ahora);
  if (copernicus.status === 'fulfilled') cambios.activaciones = juntarActivaciones(antes.activaciones, copernicus.value, ahora);
  if (aesan.status === 'fulfilled') cambios.alimentos = juntarNoticias(antes.alimentos, aesan.value, ahora);
  if (aemps.status === 'fulfilled') cambios.medicamentos = juntarNoticias(antes.medicamentos, aemps.value, ahora);
  const nombres = ['AEMET', 'IGN', 'GDACS', 'AEMET (noticias)', 'Copernicus', 'AESAN', 'AEMPS'];
  cambios.fallidas = [meteo, ign, gdacs, noticias, copernicus, aesan, aemps].flatMap((x, i) => (x.status === 'rejected' ? [nombres[i]] : []));
  cambios.fallo = cambios.fallidas.length > 0;
  // La hora de actualización es la de AEMET, que es lo que más cambia y lo que se destaca
  if (meteo.status === 'fulfilled' && !otraProvincia) cambios.actualizado = Date.now();
  useAvisos.setState(cambios);
  if (otraProvincia) await actualizarAvisos(true);
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
