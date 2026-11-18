// Preguntas frecuentes de Ajustes › Ayuda. Las respuestas resumen lo que hace
// la app: si cambia una regla (docs/fuentes-y-reglas.md), revisar también aquí.

import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icono, Texto } from '@/components/ui';
import { t, tx } from '@/lib/i18n';
import { useC } from '@/lib/tema';

const PREGUNTAS: { p: string; r: string }[] = [
  {
    p: tx('¿Por qué cada persona necesita una cantidad distinta de agua?'),
    r: tx('Lo que se bebe depende del cuerpo. La app usa la tabla de la EFSA por edad y sexo o 1 mL por cada kcal que gasta la persona, lo que sea mayor: así sube con el peso y la actividad. A eso se suma la higiene del modo (1,5 L en el normal), que es igual para todos.'),
  },
  {
    p: tx('¿Se raciona el agua?'),
    r: tx('La de beber, nunca: si se acaba, hay que buscar más. Los modos ligero, severo y extremo solo recortan la higiene, a 0,5 L o a nada.'),
  },
  {
    p: tx('¿Qué es cada modo?'),
    r: tx('Normal: raciones completas. Ligero: los adultos comen un 15 % menos. Severo: un 70 %. Extremo: la mitad. Los menores, las embarazadas, las mujeres en lactancia y quien marques como «no racionar» comen siempre al 100 %.'),
  },
  {
    p: tx('¿Qué cambia la actividad física?'),
    r: tx('Con actividad normal se gasta más energía, así que se come y se bebe más y la reserva da menos días. Por defecto se calcula sedentaria. La del día a día se cambia en Ajustes y, al empezar una emergencia, se elige otra vez.'),
  },
  {
    p: tx('¿Y los bebés?'),
    r: tx('Los menores de 1 año necesitan leche materna o de fórmula, así que su comida no se calcula. Su agua sí cuenta, porque la fórmula se prepara con agua.'),
  },
  {
    p: tx('¿Funciona sin internet?'),
    r: tx('Sí. Todo se guarda en el móvil y el cálculo no necesita conexión. Solo hace falta internet para buscar productos por el código de barras y para sincronizar la casa compartida.'),
  },
  {
    p: tx('¿Qué pasa si se va la luz?'),
    r: tx('Al marcar «sin luz», la nevera aguanta unas 4 horas y el congelador uno o dos días (dos si está lleno). La app propone comer primero lo de la nevera, después lo del congelador y al final la despensa, y deja de contar lo que no dé tiempo a comer.'),
  },
  {
    p: tx('¿Cuánta reserva debería tener?'),
    r: tx('En Preparación eliges cuántos días quieres aguantar y la app te dice cuánta agua y comida os falta. La Comisión Europea recomienda que cada hogar pueda pasar al menos 72 horas por su cuenta.'),
  },
  {
    p: tx('¿Cómo comparto la despensa con mi familia?'),
    r: tx('En Ajustes › Cuenta y casa: entra con tu correo o con Google, crea una casa y pasa el código a los demás. Lo que apunte cualquiera se ve en todos los móviles.'),
  },
  {
    p: tx('¿Dónde están mis datos?'),
    r: tx('En tu móvil. Si usas la casa compartida, también en el servidor de la casa, solo para quienes estén en ella. Puedes guardar una copia en Ajustes › Tus datos.'),
  },
  {
    p: tx('¿De dónde salen los avisos?'),
    r: tx('De fuentes oficiales: AEMET (tiempo en tu provincia), el IGN (terremotos en España) y GDACS (desastres graves en el mundo). Están en la pestaña Actualidad, donde se elige la provincia; se guarda lo del último mes. No sustituyen a Protección Civil ni al 112.'),
  },
  {
    p: tx('¿Son fiables las cifras?'),
    r: tx('Son una estimación con fuentes públicas (FAO, EFSA, Ready.gov, Sphere). Cada cifra y su fuente está en Ajustes › Fuentes y método. No sustituyen el consejo médico.'),
  },
];

function Pregunta({ p, r, primera }: { p: string; r: string; primera: boolean }) {
  const C = useC();
  const [abierta, setAbierta] = useState(false);
  return (
    <View style={{ borderTopWidth: primera ? 0 : 1, borderTopColor: C.linea }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: abierta }}
        onPress={() => setAbierta(!abierta)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minHeight: 52,
          paddingVertical: 10,
          opacity: pressed ? 0.7 : 1,
        })}>
        <Texto peso="600" style={{ flex: 1 }}>
          {t(p)}
        </Texto>
        <Icono name={abierta ? 'chevron-up' : 'chevron-down'} color={C.suave} />
      </Pressable>
      {abierta && (
        <Texto tam={14} color={C.texto2} style={{ paddingBottom: 12 }}>
          {t(r)}
        </Texto>
      )}
    </View>
  );
}

export function PreguntasFrecuentes() {
  return (
    <View>
      {PREGUNTAS.map((q, i) => (
        <Pregunta key={q.p} p={q.p} r={q.r} primera={i === 0} />
      ))}
    </View>
  );
}
