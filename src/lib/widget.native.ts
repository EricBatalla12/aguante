// Pone al día el widget de la pantalla de inicio (src/widgets/dias.tsx) con
// los días que aguantáis. Se llama al cambiar el cálculo con la app abierta
// y desde la tarea en segundo plano (src/lib/segundo-plano.ts), para que el
// número siga bien aunque no se abra la app (lo que caduca deja de contar).

import { Platform } from 'react-native';

import Dias from '../widgets/dias';
import type { Resultado } from './calculo';
import { t, tn } from './i18n';

let ultimo = '';

export function actualizarWidget(r: Resultado): void {
  if (Platform.OS !== 'android') return;
  const props = r.sinPersonas
    ? { titulo: t('Aguante'), dias: '–', detalle: t('Añade quién vive en casa para calcularlo.') }
    : {
        titulo: t('Aguantáis'),
        dias: tn(r.dias, '{n} día', '{n} días'),
        detalle: r.limita === 'agua' ? t('Lo primero que se acaba es el agua.') : t('Lo primero que se acaba es la comida.'),
      };
  const clave = JSON.stringify(props);
  if (clave === ultimo) return;
  ultimo = clave;
  try {
    Dias.updateSnapshot(props);
  } catch {
    // Sin widget en la pantalla de inicio no pasa nada
  }
}
