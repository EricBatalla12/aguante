// Tutorial guiado: la capa que oscurece la pantalla menos la parte que se
// explica, y la tarjeta con el texto de cada paso. Se monta una vez en el
// layout raíz. Las pantallas marcan lo que se enseña con <Hueco id="…">.
//
// Sin librerías nativas: se mide con measureInWindow y se pinta con Views,
// así llega por actualización (EAS Update) sin APK nuevo.

import { usePathname } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { View, useWindowDimensions, type HostInstance, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton, Texto } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useC } from '@/lib/tema';
import { PASOS, pasoAnterior, pasoSiguiente, terminarTutorial, useTutorial } from '@/lib/tutorial';

const MARGEN_HUECO = 6;

/** Envuelve lo que un paso del tutorial deja a la vista. Fuera del tutorial no hace nada. */
export function Hueco({ id, children, style }: { id: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  // La vista en un estado y no en un useRef: el compilador de React no deja leer referencias al pintar
  const [vista, setVista] = useState<HostInstance | null>(null);
  const activo = useTutorial((s) => s.paso !== null && PASOS[s.paso].hueco === id);
  const ponerHueco = useTutorial((s) => s.ponerHueco);

  useEffect(() => {
    if (!activo || !vista) return;
    const medir = () =>
      vista.measureInWindow((x, y, ancho, alto) => {
        if (ancho > 0 && alto > 0) ponerHueco(id, { x, y, ancho, alto });
      });
    // Al cambiar de pantalla, lo que hay que medir tarda un poco en colocarse
    const relojes = [setTimeout(medir, 60), setTimeout(medir, 400)];
    return () => relojes.forEach(clearTimeout);
  }, [activo, vista, id, ponerHueco]);

  return (
    <View ref={setVista} collapsable={false} style={style}>
      {children}
    </View>
  );
}

export function CapaTutorial() {
  const C = useC();
  const margenes = useSafeAreaInsets();
  const { width: ancho, height: alto } = useWindowDimensions();
  const ruta = usePathname();
  const paso = useTutorial((s) => s.paso);
  const huecos = useTutorial((s) => s.huecos);
  if (paso === null) return null;

  const p = PASOS[paso];
  const medido = p.hueco ? huecos[p.hueco] : undefined;
  // Solo se recorta si ya estamos en su pantalla y se ve (puede estar fuera por el scroll)
  const r =
    medido && ruta === p.ruta && medido.y + medido.alto > 0 && medido.y < alto
      ? {
          x0: Math.max(0, medido.x - MARGEN_HUECO),
          y0: Math.max(0, medido.y - MARGEN_HUECO),
          x1: Math.min(ancho, medido.x + medido.ancho + MARGEN_HUECO),
          y1: Math.min(alto, medido.y + medido.alto + MARGEN_HUECO),
        }
      : null;
  // La tarjeta va donde no tape lo que se enseña
  const abajo = !r || (r.y0 + r.y1) / 2 < alto / 2;
  const sombra = 'rgba(0, 0, 0, 0.62)';
  const ultimo = paso === PASOS.length - 1;

  return (
    // La capa entera recoge los toques: durante el tutorial no se toca la app de debajo
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} accessibilityViewIsModal>
      {r ? (
        <>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: r.y0, backgroundColor: sombra }} />
          <View style={{ position: 'absolute', left: 0, right: 0, top: r.y1, bottom: 0, backgroundColor: sombra }} />
          <View style={{ position: 'absolute', left: 0, width: r.x0, top: r.y0, height: r.y1 - r.y0, backgroundColor: sombra }} />
          <View style={{ position: 'absolute', left: r.x1, right: 0, top: r.y0, height: r.y1 - r.y0, backgroundColor: sombra }} />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: r.x0,
              top: r.y0,
              width: r.x1 - r.x0,
              height: r.y1 - r.y0,
              borderRadius: 18,
              borderWidth: 2,
              borderColor: C.blanco,
            }}
          />
        </>
      ) : (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: sombra }} />
      )}

      <View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          ...(abajo ? { bottom: margenes.bottom + 16 } : { top: margenes.top + 16 }),
          alignItems: 'center',
        }}>
        <View
          accessibilityRole="summary"
          style={{ width: '100%', maxWidth: 528, backgroundColor: C.tarjeta, borderRadius: 22, padding: 18, gap: 10 }}>
          <Texto tam={12} peso="700" color={C.suave}>
            {t('Paso {n} de {total}', { n: paso + 1, total: PASOS.length })}
          </Texto>
          <Texto tam={19} peso="800">
            {t(p.titulo)}
          </Texto>
          <Texto tam={14} color={C.texto2}>
            {t(p.texto)}
          </Texto>
          <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4 }}>
            {!ultimo && (
              <Boton pequeno variante="secundario" onPress={() => terminarTutorial(true)}>
                {t('Omitir')}
              </Boton>
            )}
            <View style={{ flex: 1 }} />
            {paso > 0 && (
              <Boton pequeno variante="suave" onPress={pasoAnterior}>
                {t('Atrás')}
              </Boton>
            )}
            <Boton pequeno onPress={pasoSiguiente}>
              {ultimo ? t('Entendido') : t('Siguiente')}
            </Boton>
          </View>
        </View>
      </View>
    </View>
  );
}
