// Energía propia: cuánto aguanta la casa sin luz de la red con lo que tiene
// para generar y guardar electricidad.

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Boton, Icono, IconoCaja, Interruptor, Pantalla, Segmentado, Seccion, Tarjeta, Texto, type NombreIcono } from '@/components/ui';
import { formatoNumero } from '@/lib/calculo';
import {
  APARATOS_TIPICOS,
  calcularEnergia,
  whDiaAparato,
  whGuardados,
  whSolaresDia,
  type FuenteEnergia,
  type TipoFuente,
} from '@/lib/energia';
import { ICONO_FUENTE, NOMBRE_TIPO } from '@/constants/energia';
import { textoCantidad } from '@/lib/formato';
import { nuevoId, useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { t } from '@/lib/i18n';

export default function Energia() {
  const C = useC();
  const energia = useAguante((s) => s.energia);
  const setZonaSolar = useAguante((s) => s.setZonaSolar);
  const guardarAparato = useAguante((s) => s.guardarAparato);
  const [minimo, setMinimo] = useState(false);
  const e = calcularEnergia(energia.fuentes, energia.aparatos, energia.zona, energia.epoca, minimo);
  const sinDatos = energia.fuentes.length === 0 && energia.aparatos.length === 0;

  const detalleFuente = (f: FuenteEnergia) => {
    if (f.tipo === 'solar') return t('{wh} Wh al día', { wh: formatoNumero(whSolaresDia(f, energia.zona, energia.epoca)) });
    return t('{wh} Wh útiles', { wh: formatoNumero(whGuardados(f)) });
  };

  return (
    <Pantalla>
      <View style={{ backgroundColor: C.heroe, borderColor: C.heroeBorde, borderWidth: 1, borderRadius: 24, padding: 20, gap: 10 }}>
        <Texto tam={14} color={C.heroeSuave}>
          {t('Sin luz de la red, la energía os dura')}
        </Texto>
        <Texto tam={44} peso="800" color={C.heroeTexto} ajustar maxFontSizeMultiplier={1} style={{ lineHeight: 53 }}>
          {e.whConsumoDia <= 0
            ? '—'
            : e.dias === Infinity
              ? t('Con sol, sin fin')
              : t('{n} días', { n: formatoNumero(e.dias, 1) })}
        </Texto>
        <Texto tam={13} color={C.heroeSuave}>
          {e.whConsumoDia <= 0
            ? t('Apunta qué aparatos queréis usar para calcularlo.')
            : t('Guardado {g} Wh · sol {s} Wh/día · gasto {c} Wh/día', {
                g: formatoNumero(e.whGuardados),
                s: formatoNumero(e.whSolaresDia),
                c: formatoNumero(e.whConsumoDia),
              })}
        </Texto>
      </View>

      {sinDatos && (
        <Texto tam={14} color={C.suave}>
          {t('Apunta lo que tienes para generar o guardar electricidad (power banks, baterías, placas, generador) y lo que queréis seguir usando. La app calcula cuántos días aguanta, como con la comida y el agua.')}
        </Texto>
      )}

      <Tarjeta>
        <Interruptor
          etiqueta={t('Solo lo imprescindible')}
          valor={minimo}
          onChange={setMinimo}
          ayuda={t('Cuenta solo los aparatos marcados como imprescindibles: móviles, luz, radio, aparatos médicos.')}
        />
      </Tarjeta>

      <Seccion>{t('Lo que genera y guarda')}</Seccion>
      <Tarjeta style={{ gap: 8 }}>
        {energia.fuentes.length === 0 && (
          <Texto tam={14} color={C.suave}>
            {t('Todavía nada.')}
          </Texto>
        )}
        {energia.fuentes.map((f) => (
          <Fila
            key={f.id}
            icono={ICONO_FUENTE[f.tipo]}
            titulo={`${f.cantidad > 1 ? `${f.cantidad} × ` : ''}${t(f.nombre)}`}
            detalle={detalleFuente(f)}
            onPress={() => router.push(`/energia/fuente/${f.id}`)}
          />
        ))}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(Object.keys(NOMBRE_TIPO) as TipoFuente[]).map((tipo) => (
            <Chip key={tipo} icono={ICONO_FUENTE[tipo]} texto={t(NOMBRE_TIPO[tipo])} onPress={() => router.push(`/energia/fuente/nueva?tipo=${tipo}`)} />
          ))}
        </View>
      </Tarjeta>

      {energia.fuentes.some((f) => f.tipo === 'solar') && (
        <Tarjeta style={{ gap: 10 }}>
          <Texto peso="700">{t('Sol en tu zona')}</Texto>
          <Segmentado
            opciones={[
              { valor: 'norte' as const, etiqueta: 'Norte' },
              { valor: 'centro' as const, etiqueta: 'Centro' },
              { valor: 'sur' as const, etiqueta: 'Sur' },
            ]}
            valor={energia.zona}
            onChange={(z) => setZonaSolar(z, energia.epoca)}
          />
          <Segmentado
            opciones={[
              { valor: 'invierno' as const, etiqueta: 'Peor mes' },
              { valor: 'media' as const, etiqueta: 'Media del año' },
            ]}
            valor={energia.epoca}
            onChange={(ep) => setZonaSolar(energia.zona, ep)}
          />
          <Texto tam={12} color={C.suave}>
            {t('Norte: Galicia, Asturias, Cantabria, País Vasco. Sur: Andalucía, Murcia y Canarias. Datos de PVGIS (Comisión Europea) para una placa bien orientada; tumbada o con sombra da menos.')}
          </Texto>
        </Tarjeta>
      )}

      <Seccion>{t('Lo que gasta la casa')}</Seccion>
      <Tarjeta style={{ gap: 8 }}>
        {energia.aparatos.length === 0 && (
          <Texto tam={14} color={C.suave}>
            {t('Todavía nada. Toca uno de abajo para empezar.')}
          </Texto>
        )}
        {energia.aparatos.map((a) => (
          <Fila
            key={a.id}
            icono={a.imprescindible ? 'star-outline' : 'power-plug-outline'}
            titulo={`${a.cantidad > 1 ? `${a.cantidad} × ` : ''}${t(a.nombre)}`}
            detalle={t('{w} W × {h} h = {wh} Wh al día', { w: formatoNumero(a.vatios), h: textoCantidad(a.horasDia), wh: formatoNumero(whDiaAparato(a)) })}
            onPress={() => router.push(`/energia/aparato/${a.id}`)}
          />
        ))}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {APARATOS_TIPICOS.filter((ap) => !energia.aparatos.some((a) => a.nombre === ap.nombre)).map((ap) => (
            <Chip key={ap.nombre} icono="plus" texto={t(ap.nombre)} onPress={() => guardarAparato({ ...ap, id: nuevoId(), cantidad: 1 })} />
          ))}
          <Chip icono="pencil-outline" texto={t('Otro aparato')} onPress={() => router.push('/energia/aparato/nuevo')} />
        </View>
        <Texto tam={12} color={C.suave}>
          {t('Los vatios de partida son orientativos: toca cada aparato y pon los de su etiqueta.')}
        </Texto>
      </Tarjeta>

      <Boton variante="secundario" icono="book-open-variant" onPress={() => router.push('/fuentes')}>
        {t('De dónde salen las cifras')}
      </Boton>
    </Pantalla>
  );
}

function Fila({ icono, titulo, detalle, onPress }: { icono: NombreIcono; titulo: string; detalle: string; onPress: () => void }) {
  const C = useC();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, opacity: pressed ? 0.6 : 1 })}>
      <IconoCaja name={icono} fondo={C.ambarTinte} color={C.ambar} tam={40} />
      <View style={{ flex: 1 }}>
        <Texto peso="600">{titulo}</Texto>
        <Texto tam={13} color={C.suave}>
          {detalle}
        </Texto>
      </View>
      <Icono name="chevron-right" color={C.suave} />
    </Pressable>
  );
}

function Chip({ icono, texto, onPress }: { icono: NombreIcono; texto: string; onPress: () => void }) {
  const C = useC();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 40,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: C.segmento,
        opacity: pressed ? 0.6 : 1,
        maxWidth: '100%',
      })}>
      <Icono name={icono} size={16} color={C.texto2} />
      <Texto tam={13} peso="600" color={C.texto2}>
        {texto}
      </Texto>
    </Pressable>
  );
}
