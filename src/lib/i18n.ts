// Idiomas de la app.
//
// El texto en español es la clave: `t('Añadir producto')` devuelve el mismo
// texto en español o su traducción de src/i18n/en.ts. Así el código se sigue
// leyendo en español y una traducción que falte no rompe nada: sale en
// español. El test tests/i18n.test.mjs comprueba que no falte ninguna.
//
// Las variables van entre llaves: t('Quedan {n} días', { n: 3 }).

import { getLocales } from 'expo-localization';

import { EN } from '@/i18n/en';

import { fijarFormatoNumero } from './calculo';
import { fijarIdiomaFechas } from './fechas';

export type Lengua = 'es' | 'en';

let actual: Lengua = 'es';

// En España mucha gente tiene el móvil en catalán, gallego o euskera: para
// ellos el español está más cerca que el inglés.
const CERCANOS_AL_ESPANOL = ['es', 'ca', 'gl', 'eu'];

export function lenguaDelSistema(): Lengua {
  try {
    const codigo = getLocales()[0]?.languageCode ?? 'es';
    return CERCANOS_AL_ESPANOL.includes(codigo) ? 'es' : 'en';
  } catch {
    return 'es';
  }
}

export function fijarLengua(l: Lengua) {
  actual = l;
  fijarFormatoNumero(l);
  fijarIdiomaFechas(l);
}

export const lenguaActual = () => actual;

export function t(es: string, vars?: Record<string, string | number>): string {
  let texto = actual === 'en' ? (EN[es] ?? es) : es;
  if (vars) texto = texto.replace(/\{(\w+)\}/g, (todo, k: string) => (k in vars ? String(vars[k]) : todo));
  return texto;
}

/** Singular o plural: tn(n, '{n} día', '{n} días'). */
export function tn(n: number, uno: string, varios: string, vars: Record<string, string | number> = {}): string {
  return t(n === 1 ? uno : varios, { n, ...vars });
}

/**
 * Marca un texto para traducir sin traducirlo aún: para constantes fuera de
 * los componentes, que se traducen al pintarlas con t(). El test de idiomas
 * busca tanto t('…') como tx('…').
 */
export const tx = (es: string) => es;
