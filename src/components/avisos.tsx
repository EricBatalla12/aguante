// Textos y colores de los avisos de AEMET, para la pantalla de avisos y la
// tarjeta de Inicio.

import type { Paleta } from '@/constants/colores';
import type { Nivel } from '@/lib/avisos';
import { t, tx } from '@/lib/i18n';

// Los fenómenos de AEMET (Meteoalerta) que se traducen; si llega otro, se enseña tal cual
const FENOMENOS: Record<string, string> = {
  Vientos: tx('Vientos'),
  Lluvias: tx('Lluvias'),
  Tormentas: tx('Tormentas'),
  Nevadas: tx('Nevadas'),
  'Temperaturas máximas': tx('Temperaturas máximas'),
  'Temperaturas mínimas': tx('Temperaturas mínimas'),
  Costeros: tx('Costeros'),
  Nieblas: tx('Nieblas'),
  'Polvo en suspensión': tx('Polvo en suspensión'),
  Aludes: tx('Aludes'),
  Deshielos: tx('Deshielos'),
  Galernas: tx('Galernas'),
  Rissagas: tx('Rissagas'),
};

const NIVELES: Record<Nivel, string> = { amarillo: tx('Nivel amarillo'), naranja: tx('Nivel naranja'), rojo: tx('Nivel rojo') };

export const textoFenomeno = (f: string) => (FENOMENOS[f] ? t(FENOMENOS[f]) : f);

export function coloresNivel(n: Nivel, C: Paleta) {
  if (n === 'rojo') return { color: C.rojo, fondo: C.rojoTinte };
  if (n === 'naranja') return { color: C.comida, fondo: C.comidaTinte };
  return { color: C.ambar, fondo: C.ambarTinte };
}

export const textoNivel = (n: Nivel) => t(NIVELES[n]);
