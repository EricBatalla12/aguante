import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Aviso, FilaEnlace, Interruptor, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { calcular, type ModoAuto } from '@/lib/calculo';
import { useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { ETIQUETA_MODO, MODOS_AUTO } from '@/lib/use-resultado';

const INFO: Record<ModoAuto, { nivel: number; comida: string; agua: string; fuente: string }> = {
  normal: {
    nivel: 1,
    comida: '100 %',
    agua: '3,8 L o lo que se beba, si es más',
    fuente: 'Agua: 1 galón por persona y día para beber y saneamiento (Ready.gov).',
  },
  ligero: {
    nivel: 2,
    comida: '85 %',
    agua: 'Para beber + 0,5 L de higiene',
    fuente: 'El 85 % y los 0,5 L son valores intermedios nuestros, sin fuente propia.',
  },
  severo: {
    nivel: 3,
    comida: '70 %',
    agua: 'Solo para beber',
    fuente: 'El 70 % es el mínimo de asistencia alimentaria del Food Security Cluster (≈ 1.550 kcal).',
  },
  extremo: {
    nivel: 4,
    comida: '50 %',
    agua: 'Solo para beber',
    fuente: 'FEMA: un adulto sano y con poca actividad puede pasar con la mitad de su comida habitual.',
  },
};

export default function Modos() {
  const C = useC();
  const personas = useAguante((s) => s.personas);
  const mascotas = useAguante((s) => s.mascotas);
  const productos = useAguante((s) => s.productos);
  const escenario = useAguante((s) => s.escenario);
  const setEscenario = useAguante((s) => s.setEscenario);
  const modo = useAguante((s) => s.modo);
  const setModo = useAguante((s) => s.setModo);

  const dias = useMemo(() => {
    const out = {} as Record<ModoAuto, number>;
    for (const m of MODOS_AUTO) out[m] = calcular(personas, mascotas, productos, m, escenario).dias;
    return out;
  }, [personas, mascotas, productos, escenario]);

  const colorNivel: Record<ModoAuto, string> = { normal: C.verde, ligero: C.ambar, severo: C.comida, extremo: C.rojo };

  return (
    <Pantalla>
      <Texto color={C.texto2}>
        Cuanto más racionáis la comida, más días aguantáis, pero con menos energía. Elige el modo según lo que esperes
        que dure la emergencia.
      </Texto>

      <Aviso
        tono="verde"
        texto="El agua para beber nunca se raciona: si se acaba, hay que buscar más (FEMA). Los modos solo recortan la higiene. Los menores, las embarazadas y las mujeres en lactancia comen siempre al 100 %."
      />

      {MODOS_AUTO.map((m) => {
        const i = INFO[m];
        const activo = m === modo;
        return (
          <Pressable
            key={m}
            accessibilityRole="radio"
            accessibilityState={{ checked: activo }}
            onPress={() => setModo(m)}
            style={{
              backgroundColor: C.tarjeta,
              borderRadius: 20,
              padding: 16,
              gap: 12,
              borderWidth: 2,
              borderColor: activo ? C.primario : C.borde,
            }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <View style={{ gap: 6 }}>
                <Texto tam={18} peso="800">
                  {ETIQUETA_MODO[m]}
                </Texto>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {[1, 2, 3, 4].map((n) => (
                    <View key={n} style={{ width: 22, height: 6, borderRadius: 3, backgroundColor: n <= i.nivel ? colorNivel[m] : C.pista }} />
                  ))}
                </View>
              </View>
              {personas.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Texto tam={34} peso="800" style={{ lineHeight: 42 }}>
                    {dias[m]}
                  </Texto>
                  <Texto tam={14} peso="600" color={C.texto2}>
                    {dias[m] === 1 ? 'día' : 'días'}
                  </Texto>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: C.comidaTinte, borderRadius: 12, padding: 10, gap: 2 }}>
                <Texto tam={12} color={C.comidaOscuro}>
                  Comida de los adultos
                </Texto>
                <Texto peso="800" color={C.comidaOscuro}>
                  {i.comida}
                </Texto>
              </View>
              <View style={{ flex: 1, backgroundColor: C.aguaTinte, borderRadius: 12, padding: 10, gap: 2 }}>
                <Texto tam={12} color={C.aguaOscuro}>
                  Agua por persona
                </Texto>
                <Texto tam={14} peso="700" color={C.aguaOscuro}>
                  {i.agua}
                </Texto>
              </View>
            </View>
            <Texto tam={12} color={C.suave}>
              {i.fuente}
            </Texto>
          </Pressable>
        );
      })}

      <Tarjeta style={{ paddingVertical: 6, borderWidth: 2, borderColor: modo === 'manual' ? C.primario : C.borde }}>
        <FilaEnlace
          primera
          icono="tune-variant"
          titulo="Reparto manual"
          detalle={
            modo === 'manual'
              ? 'Activo: las raciones las fijas tú'
              : 'Fija tú las kcal y los litros de cada persona y mascota'
          }
          onPress={() => router.push('/manual')}
        />
      </Tarjeta>

      <Tarjeta>
        <Texto tam={18} peso="800">
          Escenario
        </Texto>
        <Interruptor
          etiqueta="Sin luz"
          valor={!!escenario.sinLuz}
          onChange={(v) => setEscenario({ ...escenario, sinLuz: v })}
          ayuda="Lo que necesita nevera deja de contar."
        />
        <Interruptor
          etiqueta="Sin poder cocinar"
          valor={!!escenario.sinCocina}
          onChange={(v) => setEscenario({ ...escenario, sinCocina: v })}
          ayuda="El arroz, la pasta y lo que haya que cocinar deja de contar."
        />
        <Interruptor
          etiqueta="Hace mucho calor"
          valor={!!escenario.calor}
          onChange={(v) => setEscenario({ ...escenario, calor: v })}
          ayuda="Se bebe el doble (FEMA)."
        />
      </Tarjeta>

      <Tarjeta style={{ paddingVertical: 6 }}>
        <FilaEnlace
          primera
          icono="book-open-variant"
          titulo="Fuentes y método"
          detalle="De dónde sale cada cifra"
          onPress={() => router.push('/fuentes')}
        />
      </Tarjeta>
    </Pantalla>
  );
}
