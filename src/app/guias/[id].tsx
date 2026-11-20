// Una guía sin conexión: sus apartados, paso a paso, y de dónde sale.

import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';

import { Aviso, Pantalla, Seccion, Tarjeta, Texto } from '@/components/ui';
import { guiaPorId } from '@/constants/guias';
import { t } from '@/lib/i18n';
import { useC } from '@/lib/tema';

export default function GuiaSinConexion() {
  const C = useC();
  const { id } = useLocalSearchParams<{ id: string }>();
  const g = guiaPorId(id);
  if (!g) {
    return (
      <Pantalla>
        <Aviso tono="ambar" texto={t('Esta guía no existe.')} />
      </Pantalla>
    );
  }
  const hayPropio = g.apartados.some((a) => a.pasos.some((p) => p.propio));
  return (
    <Pantalla>
      <Stack.Screen options={{ title: t(g.titulo) }} />
      {g.aviso && <Aviso tono="ambar" texto={t(g.aviso)} />}
      {g.apartados.map((a) => (
        <View key={a.titulo} style={{ gap: 8 }}>
          <Seccion>{t(a.titulo)}</Seccion>
          <Tarjeta style={{ gap: 10 }}>
            {a.pasos.map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                <Texto tam={15} peso="800" color={C.suave} style={{ width: 20 }}>
                  {i + 1}
                </Texto>
                <Texto tam={15} style={{ flex: 1 }}>
                  {t(p.texto)}
                  {p.propio ? <Texto tam={12} color={C.suave}>{` ${t('(criterio propio)')}`}</Texto> : null}
                </Texto>
              </View>
            ))}
          </Tarjeta>
        </View>
      ))}
      <Tarjeta style={{ gap: 6 }}>
        <Texto tam={13} peso="700" color={C.texto2}>
          {t('Fuentes')}
        </Texto>
        {g.fuentes.map((f) => (
          <Pressable key={f.url} accessibilityRole="link" onPress={() => Linking.openURL(f.url).catch(() => {})} style={{ minHeight: 36, justifyContent: 'center' }}>
            <Texto tam={13} color={C.enlace} style={{ textDecorationLine: 'underline' }}>
              {t(f.nombre)}
            </Texto>
          </Pressable>
        ))}
        {hayPropio && (
          <Texto tam={12} color={C.suave}>
            {t('Lo marcado como criterio propio no sale de la fuente: es cosa de Aguante.')}
          </Texto>
        )}
      </Tarjeta>
    </Pantalla>
  );
}
