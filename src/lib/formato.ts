import type { Paleta } from '@/constants/colores';

import { diasHasta, estadoCaducidad, type Categoria, type Producto } from './calculo';

/** «24 días», «3 meses», «1 año y 7 meses»… */
export function textoCaducidad(p: Producto, hoy = new Date()): string {
  if (!p.caducidad) return 'Sin fecha';
  const d = diasHasta(p.caducidad, hoy);
  if (d < 0) return 'Caducado';
  if (d === 0) return 'Hoy';
  if (d < 60) return `${d} ${d === 1 ? 'día' : 'días'}`;
  const meses = Math.floor(d / 30.44);
  if (meses < 12) return `${meses} meses`;
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  const a = `${anios} ${anios === 1 ? 'año' : 'años'}`;
  return resto ? `${a} y ${resto} ${resto === 1 ? 'mes' : 'meses'}` : a;
}

export function coloresCaducidad(p: Producto, C: Paleta, hoy = new Date()) {
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
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

/** Acepta «1,5» y «1.5». Devuelve NaN si no es un número. */
export function numero(t: string): number {
  return t.trim() === '' ? NaN : Number(t.replace(',', '.'));
}

/** Número para rellenar un campo de texto: con coma, y vacío si no hay dato. */
export function aCampo(n?: number): string {
  return n === undefined || Number.isNaN(n) ? '' : String(n).replace('.', ',');
}
