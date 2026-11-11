// Selector de modo de aguante: los cuatro modos calculados y, debajo, la
// entrada al reparto manual. Va aparte porque con cinco opciones en una fila
// los rótulos no caben en un móvil estrecho.

import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icono, Pastilla, Segmentado, Texto } from '@/components/ui';
import { useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { OPCIONES_MODO } from '@/lib/use-resultado';

export function SelectorModo() {
  const C = useC();
  const modo = useAguante((s) => s.modo);
  const setModo = useAguante((s) => s.setModo);
  const manual = modo === 'manual';
  return (
    <View style={{ gap: 8 }}>
      <Segmentado opciones={OPCIONES_MODO} valor={manual ? null : modo} onChange={setModo} />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/manual')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minHeight: 52,
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderWidth: 1.5,
          borderColor: manual ? C.primario : C.linea,
          backgroundColor: manual ? C.segmento : 'transparent',
          opacity: pressed ? 0.7 : 1,
        })}>
        <Icono name="tune-variant" />
        <View style={{ flex: 1 }}>
          <Texto tam={14} peso="600">
            Reparto manual
          </Texto>
          <Texto tam={12} color={C.suave}>
            {manual ? 'Las raciones las has fijado tú' : 'Decide tú cuánto come y bebe cada uno'}
          </Texto>
        </View>
        {manual && <Pastilla texto="Activo" fondo={C.primario} color={C.sobrePrimario} />}
        <Icono name="chevron-right" color={C.suave} />
      </Pressable>
    </View>
  );
}
