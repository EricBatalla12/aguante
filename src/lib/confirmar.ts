import { Alert, Platform } from 'react-native';
import { t } from './i18n';

/**
 * Pide confirmación antes de algo que no tiene vuelta atrás. En la web
 * `Alert.alert` no enseña botones, así que allí se usa el diálogo del navegador.
 */
export function confirmar(titulo: string, mensaje: string, accion: string, alAceptar: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n\n${mensaje}`)) alAceptar();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: t('Cancelar'), style: 'cancel' },
    { text: accion, style: 'destructive', onPress: alAceptar },
  ]);
}
