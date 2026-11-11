import { router } from 'expo-router';

/** Vuelve atrás o, si se abrió la pantalla directamente (sin historial), a Inicio. */
export function volver() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
