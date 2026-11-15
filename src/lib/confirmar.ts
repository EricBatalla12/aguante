import { Alert, Platform } from 'react-native';

import type { NombreIcono } from '@/components/ui';

import { t } from './i18n';

/** Lo que enseña el diálogo de confirmación (src/components/dialogo.tsx). */
export type Confirmacion = {
  titulo: string;
  /** Lo que se va a quitar, en grande debajo del título. */
  nombre?: string;
  mensaje?: string;
  /** Texto del botón que confirma. */
  accion: string;
  icono?: NombreIcono;
  /** Foto del producto, si la hay. */
  imagen?: string;
  /** «peligro» (por defecto) pinta el botón en rojo; «normal», en el color principal. */
  tono?: 'peligro' | 'normal';
  alAceptar: () => void;
};

// El diálogo se registra aquí al montarse en el layout raíz
let abrir: ((c: Confirmacion) => void) | null = null;

export function registrarDialogo(f: (c: Confirmacion) => void) {
  abrir = f;
  return () => {
    if (abrir === f) abrir = null;
  };
}

/**
 * Pide confirmación antes de algo que no tiene vuelta atrás. Si el diálogo
 * propio no está montado (no debería pasar), se usa el del sistema.
 */
export function confirmar(c: Confirmacion) {
  if (abrir) return abrir(c);
  const texto = [c.nombre, c.mensaje].filter(Boolean).join('\n\n');
  if (Platform.OS === 'web') {
    if (window.confirm(`${c.titulo}\n\n${texto}`)) c.alAceptar();
    return;
  }
  Alert.alert(c.titulo, texto, [
    { text: t('Cancelar'), style: 'cancel' },
    { text: c.accion, style: c.tono === 'normal' ? 'default' : 'destructive', onPress: c.alAceptar },
  ]);
}
