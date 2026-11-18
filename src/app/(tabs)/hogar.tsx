import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Hueco } from '@/components/tutorial';
import { FilaEnlace, Icono, Pantalla, Pastilla, Tarjeta, Texto, Titulo, Tramo } from '@/components/ui';
import {
  aguaMascota,
  aguaBeber,
  aguaPersona,
  esProtegida,
  formatoNumero,
  kcalBase,
  kcalMascota,
  type Persona,
} from '@/lib/calculo';
import { useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { useEscenario, useResultado } from '@/lib/use-resultado';
import { t, tn } from '@/lib/i18n';

function datos(p: Persona): string {
  const edad =
    p.edadAnios < 1 ? t('{n} meses', { n: Math.round(p.edadAnios * 12) }) : tn(p.edadAnios, '{n} año', '{n} años');
  const quien =
    p.edadAnios < 18 ? (p.sexo === 'hombre' ? t('Niño') : t('Niña')) : p.sexo === 'hombre' ? t('Hombre') : t('Mujer');
  const extra = [
    p.embarazoTrimestre ? t('embarazo ({n}.º trim.)', { n: p.embarazoTrimestre }) : null,
    p.lactancia ? t('lactancia') : null,
  ].filter(Boolean);
  return [quien, edad, `${formatoNumero(p.pesoKg, p.pesoKg % 1 ? 1 : 0)} kg`, ...extra].join(' · ');
}

export default function Hogar() {
  const C = useC();
  const personas = useAguante((s) => s.personas);
  const mascotas = useAguante((s) => s.mascotas);
  const escenario = useEscenario();
  const modo = useAguante((s) => s.modo);
  const normal = useResultado('normal');

  return (
    <Pantalla>
      <Titulo>{t('Hogar')}</Titulo>

      <View style={{ backgroundColor: C.heroe, borderWidth: 1, borderColor: C.heroeBorde, borderRadius: 22, padding: 16, gap: 10 }}>
        <Texto tam={13} color={C.heroeSuave}>
          {t('La casa necesita cada día, en modo normal')}
        </Texto>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Texto tam={28} peso="800" color="#FDBA8C" ajustar>
              {formatoNumero(normal.kcalDia)}
            </Texto>
            <Texto tam={13} color={C.heroeSuave}>
              {t('kcal de comida')}
            </Texto>
          </View>
          <View style={{ flex: 1 }}>
            <Texto tam={28} peso="800" color="#8DB8EE" ajustar>
              {formatoNumero(normal.litrosDia, 1)} L
            </Texto>
            <Texto tam={13} color={C.heroeSuave}>
              {t('de agua')}
            </Texto>
            <Texto tam={12} color={C.heroeSuave}>
              {t('{b} L para beber y {h} L de higiene', {
                b: formatoNumero(normal.litrosBeberDia, 1),
                h: formatoNumero(normal.litrosHigieneDia, 1),
              })}
            </Texto>
          </View>
        </View>
      </View>

      {personas.length + mascotas.length > 0 && (
        <View style={{ gap: 8 }}>
          {personas.map((p) => (
            <Fila
              key={p.id}
              alPulsar={() => router.push(`/persona/${p.id}`)}
              inicial={p.nombre.slice(0, 1).toUpperCase() || '?'}
              nombre={p.nombre}
              insignia={esProtegida(p) ? t('No se raciona') : undefined}
              datos={datos(p)}
              kcal={p.edadAnios < 1 ? t('Leche materna o de fórmula') : `${formatoNumero(kcalBase(p, escenario))} kcal`}
              agua={t('{l} L ({b} para beber)', {
                l: formatoNumero(aguaPersona(p, 'normal', escenario), 1),
                b: formatoNumero(aguaBeber(p, escenario), 1),
              })}
            />
          ))}
          {mascotas.map((m) => (
            <Fila
              key={m.id}
              alPulsar={() => router.push(`/mascota/${m.id}`)}
              inicial={m.nombre.slice(0, 1).toUpperCase() || '?'}
              nombre={m.nombre}
              datos={`${m.especie === 'perro' ? t('Perro') : t('Gato')} · ${formatoNumero(m.pesoKg, m.pesoKg % 1 ? 1 : 0)} kg`}
              kcal={`${formatoNumero(kcalMascota(m))} kcal`}
              agua={`${formatoNumero(aguaMascota(m), 1)} L`}
              mascota
            />
          ))}
        </View>
      )}

      <Hueco id="hogar-anadir" style={{ flexDirection: 'row', gap: 8 }}>
        <BotonAnadir alPulsar={() => router.push('/persona/nueva')} icono="account-plus-outline" texto={t('Persona')} />
        <BotonAnadir alPulsar={() => router.push('/mascota/nueva')} icono="paw" texto={t('Mascota')} />
      </Hueco>

      {personas.length + mascotas.length > 0 && (
        <Tarjeta style={{ paddingVertical: 6 }}>
          <FilaEnlace
            primera
            icono="tune-variant"
            titulo={t('Reparto manual')}
            detalle={modo === 'manual' ? t('Activo: las raciones las fijas tú') : t('Decide tú cuánto come y bebe cada uno')}
            onPress={() => router.push('/manual')}
          />
        </Tarjeta>
      )}

      <Tarjeta style={{ backgroundColor: C.verdeTinte, borderColor: C.verdeTinte }}>
        <Texto tam={13} color={C.verdeOscuro}>
          {t('Los menores, las embarazadas y las mujeres en lactancia nunca se racionan (FEMA). Puedes marcar a cualquier otra persona como «no racionar», por ejemplo si es mayor o está enferma.')}
        </Texto>
      </Tarjeta>
      <Pressable accessibilityRole="link" onPress={() => router.push('/fuentes')}>
        <Texto tam={12} color={C.suave}>
          {t('Calorías: ecuaciones de Schofield (FAO/OMS) con actividad baja. Agua: ingesta adecuada de la EFSA. Mascotas: fórmula RER de la AAHA.')}{' '}
          <Tramo peso="600" color={C.enlace}>{t('Ver las fuentes')}</Tramo>
        </Texto>
      </Pressable>
    </Pantalla>
  );
}

function Fila(props: {
  alPulsar: () => void;
  inicial: string;
  nombre: string;
  insignia?: string;
  datos: string;
  kcal: string;
  agua: string;
  mascota?: boolean;
}) {
  const C = useC();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.alPulsar}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: C.tarjeta,
        borderWidth: 1,
        borderColor: C.borde,
        borderRadius: 18,
        padding: 12,
        opacity: pressed ? 0.7 : 1,
      })}>
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: props.mascota ? C.aguaTinte : C.comidaTinte,
        }}>
        {props.mascota ? (
          <Icono name="paw" color={C.aguaOscuro} />
        ) : (
          <Texto tam={18} peso="800" color={C.comidaOscuro} maxFontSizeMultiplier={1}>
            {props.inicial}
          </Texto>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Texto peso="700">{props.nombre}</Texto>
          {props.insignia && <Pastilla texto={props.insignia} fondo={C.verdeTinte} color={C.verdeOscuro} />}
        </View>
        <Texto tam={13} color={C.suave}>
          {props.datos}
        </Texto>
        <Texto tam={13}>
          <Tramo peso="700" color={C.comida}>
            {props.kcal}
          </Tramo>
          <Tramo color={C.suave}> · </Tramo>
          <Tramo peso="700" color={C.agua}>
            {props.agua}
          </Tramo>
        </Texto>
      </View>
      <Icono name="chevron-right" color={C.suave} />
    </Pressable>
  );
}

function BotonAnadir({ alPulsar, icono, texto }: { alPulsar: () => void; icono: 'account-plus-outline' | 'paw'; texto: string }) {
  const C = useC();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('Añadir {que}', { que: texto.toLowerCase() })}
      onPress={alPulsar}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: 'row',
        gap: 8,
        minHeight: 50,
        borderRadius: 16,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: C.campoBorde,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        opacity: pressed ? 0.6 : 1,
      })}>
      <Icono name={icono} size={18} />
      <Texto tam={14} peso="700">
        {texto}
      </Texto>
    </Pressable>
  );
}
