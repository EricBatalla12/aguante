import { Linking, Pressable, View } from 'react-native';

import { Aviso, Icono, IconoCaja, Pantalla, Pastilla, Tarjeta, Texto } from '@/components/ui';
import { BLOQUES, FECHA_CONSULTA } from '@/constants/fuentes';
import { useC } from '@/lib/tema';

export default function Fuentes() {
  const C = useC();
  return (
    <Pantalla>
      <Texto color={C.texto2}>
        Cada cifra que usa la app sale de una de estas fuentes. Lo que es una decisión nuestra, sin fuente detrás, va
        marcado como «criterio propio».
      </Texto>
      <Aviso
        tono="ambar"
        texto="Es una estimación orientativa para prepararse: no sustituye el consejo médico. Si alguien en casa tiene una enfermedad o una dieta especial, consulta a su médico."
      />

      {BLOQUES.map((b) => (
        <Tarjeta key={b.titulo} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconoCaja name={b.icono} fondo={C.segmento} color={C.tinta} tam={40} />
            <Texto tam={18} peso="800" style={{ flex: 1 }}>
              {b.titulo}
            </Texto>
          </View>
          {b.puntos.map((p) => (
            <View key={p.texto} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.suave, marginTop: 8 }} />
              <View style={{ flex: 1, gap: 4, alignItems: 'flex-start' }}>
                <Texto tam={14} color={C.texto2}>
                  {p.texto}
                </Texto>
                {p.propio && <Pastilla texto="Criterio propio" fondo={C.ambarTinte} color={C.ambar} />}
              </View>
            </View>
          ))}
          {b.enlaces.length > 0 && (
            <View style={{ borderTopWidth: 1, borderTopColor: C.linea, paddingTop: 4 }}>
              {b.enlaces.map((e) => (
                <Pressable
                  key={e.url}
                  accessibilityRole="link"
                  onPress={() => Linking.openURL(e.url)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 44,
                    paddingVertical: 6,
                    opacity: pressed ? 0.6 : 1,
                  })}>
                  <Icono name="open-in-new" color={C.enlace} size={16} />
                  <Texto tam={14} peso="600" color={C.enlace} style={{ flex: 1 }}>
                    {e.nombre}
                  </Texto>
                </Pressable>
              ))}
            </View>
          )}
        </Tarjeta>
      ))}

      <Texto tam={12} color={C.suave}>
        Fuentes consultadas el {FECHA_CONSULTA}. Los enlaces se abren en el navegador y necesitan conexión.
      </Texto>
    </Pantalla>
  );
}
