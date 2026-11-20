// Widget de la pantalla de inicio (Android): los días que aguantáis.
//
// Lo dibuja Android con Jetpack Compose (expo-widgets). La función con la
// directiva 'widget' se guarda como texto y se ejecuta aparte de la app: no
// puede usar nada de fuera de ella (ni constantes de este fichero, ni hooks),
// solo los componentes y modificadores de @expo/ui/jetpack-compose. Los datos
// le llegan ya escritos y traducidos por props (ver src/lib/widget.native.ts).

import { Column, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type PropsDias = { titulo: string; dias: string; detalle: string };

function Dias(props: PropsDias, entorno: WidgetEnvironment) {
  'widget';
  // Los mismos colores que la app (src/constants/colores.ts)
  const oscuro = entorno.colorScheme === 'dark';
  const fondo = oscuro ? '#0D1310' : '#F3F4F0';
  const tinta = oscuro ? '#EEF2EE' : '#14211B';
  const suave = oscuro ? '#9AA7A0' : '#5F6A65';
  return (
    <Column modifiers={[fillMaxSize(), background(fondo), cornerRadius(22), paddingAll(14)]} verticalArrangement="center">
      <Text color={suave} style={{ fontSize: 13 }} maxLines={1}>
        {props.titulo}
      </Text>
      <Text color={tinta} style={{ fontSize: 34, fontWeight: 'bold' }} maxLines={1}>
        {props.dias}
      </Text>
      <Text color={suave} style={{ fontSize: 12 }} maxLines={2}>
        {props.detalle}
      </Text>
    </Column>
  );
}

export default createWidget<PropsDias>('Dias', Dias, { titulo: 'Aguante', dias: '–', detalle: 'Abre la app para calcularlo' });
