// Tema de la app: paleta clara u oscura y tipo de letra.
//
// La paleta llega por contexto para que una pantalla pueda forzar la suya: el
// modo emergencia va siempre en oscuro, diga lo que diga el ajuste.

import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme, type TextStyle } from 'react-native';

import { CLARO, OSCURO, type Paleta } from '@/constants/colores';

import { useAguante } from './store';

export type Peso = '400' | '500' | '600' | '700' | '800';

// Cada peso es un fichero de fuente con su propio nombre. Con una fuente
// propia no se usa `fontWeight`: Android sintetizaría la negrita por su cuenta
// y mediría el texto con un ancho que no es el que luego pinta, que es una de
// las causas de que un texto salga cortado.
const FAMILIA: Record<Peso, string> = {
  '400': 'Figtree_400Regular',
  '500': 'Figtree_500Medium',
  '600': 'Figtree_600SemiBold',
  '700': 'Figtree_700Bold',
  '800': 'Figtree_800ExtraBold',
};

export type Letra = (peso?: Peso) => TextStyle;

const conFuentePropia: Letra = (peso = '400') => ({ fontFamily: FAMILIA[peso] });
// Si la fuente no se pudo cargar, la del sistema con su peso
const conFuenteSistema: Letra = (peso = '400') => ({ fontWeight: peso });

type Contexto = { C: Paleta; fuentePropia: boolean };

const Ctx = createContext<Contexto>({ C: CLARO, fuentePropia: false });

export function ProveedorTema({
  children,
  forzar,
  fuentePropia,
}: {
  children: ReactNode;
  forzar?: 'claro' | 'oscuro';
  /** Solo lo pasa la raíz; los proveedores anidados lo heredan. */
  fuentePropia?: boolean;
}) {
  const padre = useContext(Ctx);
  const preferencia = useAguante((s) => s.tema);
  const sistema = useColorScheme();
  const elegido = forzar ?? (preferencia === 'sistema' ? (sistema === 'dark' ? 'oscuro' : 'claro') : preferencia);
  const valor: Contexto = {
    C: elegido === 'oscuro' ? OSCURO : CLARO,
    fuentePropia: fuentePropia ?? padre.fuentePropia,
  };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

/** La paleta que toca. Se suele guardar en una constante `C`. */
export const useC = () => useContext(Ctx).C;

export const useOscuro = () => useContext(Ctx).C === OSCURO;

/** Función que da el estilo de letra de un peso: `letra('700')`. */
export const useLetra = (): Letra => (useContext(Ctx).fuentePropia ? conFuentePropia : conFuenteSistema);
