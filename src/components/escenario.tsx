// Interruptores del escenario (actividad, sin luz, sin cocina, calor). Se usan
// en «Modos» para simular y en el modo emergencia, que es donde de verdad se
// sabe qué está pasando.

import { View } from 'react-native';

import { Interruptor, Segmentado, Texto } from '@/components/ui';
import { ACTIVIDAD_POR_DEFECTO, type Escenario } from '@/lib/calculo';
import { t } from '@/lib/i18n';
import { useC } from '@/lib/tema';
import { OPCIONES_ACTIVIDAD } from '@/lib/use-resultado';

/** Sedentaria o normal: cambia las kcal y el agua de beber de todos. */
export function SelectorActividad({ valor, onChange }: { valor: Escenario['actividad']; onChange: (a: NonNullable<Escenario['actividad']>) => void }) {
  const C = useC();
  return (
    <View style={{ gap: 6 }}>
      <Texto tam={14} peso="600">
        {t('Actividad física')}
      </Texto>
      <Segmentado
        opciones={OPCIONES_ACTIVIDAD}
        valor={valor ?? ACTIVIDAD_POR_DEFECTO}
        onChange={onChange}
      />
      <Texto tam={12} color={C.suave}>
        {t('Sedentaria: casi todo el día en casa y sin esfuerzos. Normal: moverse, cargar agua o trabajar con las manos. Con más actividad se come y se bebe más.')}
      </Texto>
    </View>
  );
}

export function ControlesEscenario({ valor, onChange }: { valor: Escenario; onChange: (e: Escenario) => void }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ paddingBottom: 8 }}>
        <SelectorActividad valor={valor.actividad} onChange={(actividad) => onChange({ ...valor, actividad })} />
      </View>
      <Interruptor
        etiqueta={t('Sin luz')}
        valor={!!valor.sinLuz}
        onChange={(v) => onChange({ ...valor, sinLuz: v })}
        ayuda={t('La nevera aguanta unas 4 horas y el congelador 1 o 2 días: se come antes y lo que no dé tiempo deja de contar.')}
      />
      {valor.sinLuz && (
        <Interruptor
          etiqueta={t('El congelador está lleno')}
          valor={!!valor.congeladorLleno}
          onChange={(v) => onChange({ ...valor, congeladorLleno: v })}
          ayuda={t('Lleno aguanta unas 48 horas; a medias, unas 24.')}
        />
      )}
      <Interruptor
        etiqueta={t('Sin poder cocinar')}
        valor={!!valor.sinCocina}
        onChange={(v) => onChange({ ...valor, sinCocina: v })}
        ayuda={t('El arroz, la pasta y lo que haya que cocinar deja de contar.')}
      />
      <Interruptor
        etiqueta={t('Hace mucho calor')}
        valor={!!valor.calor}
        onChange={(v) => onChange({ ...valor, calor: v })}
        ayuda={t('Se bebe el doble (FEMA).')}
      />
    </View>
  );
}
