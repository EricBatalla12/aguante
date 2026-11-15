// Diálogo de confirmación propio: una hoja que sube desde abajo, con el tema
// de la app. Sustituye al Alert del sistema, que en Android sale con otra
// letra y otros colores y no deja enseñar qué se va a borrar.
//
// Se monta una sola vez en el layout raíz; cualquier pantalla lo abre con
// confirmar() de src/lib/confirmar.ts.

import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton, IconoCaja, Miniatura, Texto } from '@/components/ui';
import { registrarDialogo, type Confirmacion } from '@/lib/confirmar';
import { t } from '@/lib/i18n';
import { useC } from '@/lib/tema';

export function DialogoConfirmar() {
  const C = useC();
  const margenes = useSafeAreaInsets();
  const [actual, setActual] = useState<Confirmacion | null>(null);
  const [visible, setVisible] = useState(false);
  // En un estado y no en un useRef: el compilador de React no deja leer
  // referencias mientras se pinta, y el valor se usa en los estilos
  const [subida] = useState(() => new Animated.Value(0));

  useEffect(
    () =>
      registrarDialogo((c) => {
        setActual(c);
        setVisible(true);
      }),
    [],
  );

  useEffect(() => {
    if (!visible) return;
    subida.setValue(0);
    Animated.timing(subida, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  }, [visible, subida]);

  // Baja la hoja y, al terminar, cierra el modal y hace lo que toque. No
  // depende solo del final de la animación: si no llega a terminar (pantalla
  // en segundo plano, animaciones reducidas…), se cierra a los 200 ms igual.
  const cerrar = (despues?: () => void) => {
    let hecho = false;
    const terminar = () => {
      if (hecho) return;
      hecho = true;
      setVisible(false);
      setActual(null);
      despues?.();
    };
    Animated.timing(subida, { toValue: 0, duration: 160, useNativeDriver: true }).start(terminar);
    setTimeout(terminar, 200);
  };

  if (!actual) return null;
  const peligro = actual.tono !== 'normal';
  const iconoPorDefecto = peligro ? 'trash-can-outline' : 'help-circle-outline';

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={() => cerrar()}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: subida }}>
        <Pressable accessibilityLabel={t('Cancelar')} style={{ flex: 1 }} onPress={() => cerrar()} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          transform: [{ translateY: subida.interpolate({ inputRange: [0, 1], outputRange: [360, 0] }) }],
        }}>
        <View
          style={{
            width: '100%',
            maxWidth: 560,
            backgroundColor: C.tarjeta,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 20 + margenes.bottom,
            gap: 18,
          }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.linea }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {actual.imagen ? (
              <Miniatura
                uri={actual.imagen}
                icono={actual.icono ?? iconoPorDefecto}
                fondo={C.rojoTinte}
                color={C.peligro}
                tam={56}
              />
            ) : (
              <IconoCaja
                name={actual.icono ?? iconoPorDefecto}
                fondo={peligro ? C.rojoTinte : C.segmento}
                color={peligro ? C.peligro : C.tinta}
                tam={56}
              />
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Texto tam={19} peso="800" accessibilityRole="header">
                {actual.titulo}
              </Texto>
              {actual.nombre ? (
                <Texto tam={15} peso="600" color={C.texto2} lineas={2}>
                  {actual.nombre}
                </Texto>
              ) : null}
            </View>
          </View>

          {actual.mensaje ? (
            <Texto tam={14} color={C.suave}>
              {actual.mensaje}
            </Texto>
          ) : null}

          <View style={{ gap: 8 }}>
            <Boton
              variante={peligro ? 'peligro' : 'primario'}
              icono={peligro ? 'trash-can-outline' : undefined}
              onPress={() => cerrar(actual.alAceptar)}>
              {actual.accion}
            </Boton>
            <Boton variante="suave" onPress={() => cerrar()}>
              {t('Cancelar')}
            </Boton>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
