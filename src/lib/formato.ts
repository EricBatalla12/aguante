import type { Paleta } from '@/constants/colores';

import { t, tn } from './i18n';
import { diasHasta, estadoCaducidad, separadorDecimal, type Categoria } from './calculo';

/** «24 días», «3 meses», «1 año y 7 meses»… */
export function textoCaducidad(p: { caducidad?: string }, hoy = new Date()): string {
  if (!p.caducidad) return t('Sin fecha');
  const d = diasHasta(p.caducidad, hoy);
  if (d < 0) return t('Caducado');
  if (d === 0) return t('Hoy');
  if (d < 60) return tn(d, '{n} día', '{n} días');
  const meses = Math.floor(d / 30.44);
  if (meses < 12) return t('{n} meses', { n: meses });
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  const a = tn(anios, '{n} año', '{n} años');
  return resto ? t('{a} y {m}', { a, m: tn(resto, '{n} mes', '{n} meses') }) : a;
}

export function coloresCaducidad(p: { caducidad?: string }, C: Paleta, hoy = new Date()) {
  const e = estadoCaducidad(p, hoy);
  if (e === 'caducado' || e === 'rojo') return { fondo: C.rojoTinte, color: C.rojo };
  if (e === 'ambar') return { fondo: C.ambarTinte, color: C.ambar };
  if (e === 'ok') return { fondo: C.verdeTinte, color: C.verde };
  return { fondo: C.segmento, color: C.texto2 };
}

export const ICONO_CATEGORIA = {
  comida: 'food-variant',
  agua: 'water-outline',
  mascota: 'paw',
} as const;

export function colorCategoria(c: Categoria, C: Paleta): { fondo: string; color: string } {
  if (c === 'comida') return { fondo: C.comidaTinte, color: C.comida };
  if (c === 'agua') return { fondo: C.aguaTinte, color: C.agua };
  return { fondo: C.segmento, color: C.texto2 };
}

/** «2», «0,25»: la cantidad con coma decimal. */
export function textoCantidad(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', separadorDecimal());
}

/** Acepta «1,5» y «1.5». Devuelve NaN si no es un número. */
export function numero(t: string): number {
  return t.trim() === '' ? NaN : Number(t.replace(',', '.'));
}

/** Número para rellenar un campo de texto: con coma, y vacío si no hay dato. */
export function aCampo(n?: number): string {
  return n === undefined || Number.isNaN(n) ? '' : String(n).replace('.', separadorDecimal());
}
