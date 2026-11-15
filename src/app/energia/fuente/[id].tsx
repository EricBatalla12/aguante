import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Boton, Campo, Contador, Icono, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { ICONO_FUENTE, NOMBRE_TIPO } from '@/constants/energia';
import { formatoNumero } from '@/lib/calculo';
import { confirmar } from '@/lib/confirmar';
import { whGuardados, whSolaresDia, type FuenteEnergia, type TipoFuente } from '@/lib/energia';
import { aCampo, numero } from '@/lib/formato';
import { volver } from '@/lib/navegacion';
import { nuevoId, useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { t, tx } from '@/lib/i18n';

const TIPOS: TipoFuente[] = ['powerbank', 'bateria', 'solar', 'generador'];
const CORTO: Record<TipoFuente, string> = {
  powerbank: tx('Power bank'),
  bateria: tx('Batería'),
  solar: tx('Placa'),
  generador: tx('Generador'),
};

export default function EditarFuente() {
  const C = useC();
  const { id, tipo: tipoParam } = useLocalSearchParams<{ id: string; tipo?: TipoFuente }>();
  const existente = useAguante((s) => s.energia.fuentes.find((f) => f.id === id));
  const energia = useAguante((s) => s.energia);
  const guardar = useAguante((s) => s.guardarFuente);
  const borrar = useAguante((s) => s.borrarFuente);

  const [tipo, setTipo] = useState<TipoFuente>(existente?.tipo ?? (TIPOS.includes(tipoParam as TipoFuente) ? (tipoParam as TipoFuente) : 'powerbank'));
  const [nombre, setNombre] = useState(existente?.nombre ?? '');
  const [cantidad, setCantidad] = useState(existente?.cantidad ?? 1);
  const [wh, setWh] = useState(aCampo(existente?.wh));
  const [mah, setMah] = useState(aCampo(existente?.mah));
  const [wp, setWp] = useState(aCampo(existente?.vatiosPico));
  const [vatios, setVatios] = useState(aCampo(existente?.vatios));
  const [litrosHora, setLitrosHora] = useState(aCampo(existente?.litrosHora));
  const [litros, setLitros] = useState(aCampo(existente?.litros));

  const fuente: FuenteEnergia = {
    id: existente?.id ?? nuevoId(),
    nombre: nombre.trim() || t(NOMBRE_TIPO[tipo]),
    tipo,
    cantidad,
    wh: tipo === 'bateria' ? numero(wh) : undefined,
    mah: tipo === 'powerbank' ? numero(mah) : undefined,
    vatiosPico: tipo === 'solar' ? numero(wp) : undefined,
    vatios: tipo === 'generador' ? numero(vatios) : undefined,
    litrosHora: tipo === 'generador' ? numero(litrosHora) : undefined,
    litros: tipo === 'generador' ? numero(litros) : undefined,
  };
  const valida =
    cantidad > 0 &&
    (tipo === 'bateria'
      ? numero(wh) > 0
      : tipo === 'powerbank'
        ? numero(mah) > 0
        : tipo === 'solar'
          ? numero(wp) > 0
          : numero(vatios) > 0 && numero(litrosHora) > 0);
  const resumen =
    tipo === 'solar'
      ? t('Unos {wh} Wh al día con el sol de tu zona.', { wh: formatoNumero(whSolaresDia(fuente, energia.zona, energia.epoca)) })
      : t('Unos {wh} Wh que se pueden usar.', { wh: formatoNumero(whGuardados(fuente)) });

  return (
    <Pantalla>
      <Tarjeta style={{ gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Texto peso="600">{t('Tipo')}</Texto>
          {/* Rejilla de 2 × 2: con cuatro opciones en una fila, «Power bank» no cabía a 320 px */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TIPOS.map((op) => {
              const activo = op === tipo;
              return (
                <Pressable
                  key={op}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                  onPress={() => setTipo(op)}
                  style={{
                    flexBasis: '47%',
                    flexGrow: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 48,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    backgroundColor: activo ? C.primario : C.segmento,
                  }}>
                  <Icono name={ICONO_FUENTE[op]} size={18} color={activo ? C.sobrePrimario : C.texto2} />
                  <Texto tam={14} peso="700" color={activo ? C.sobrePrimario : C.tinta} style={{ flex: 1 }}>
                    {t(CORTO[op])}
                  </Texto>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Campo etiqueta={t('Nombre (opcional)')} valor={nombre} onChange={setNombre} placeholder={NOMBRE_TIPO[tipo]} />
        <View style={{ gap: 6 }}>
          <Texto tam={14} peso="600" color={C.texto2}>
            {t('Cuántas tienes')}
          </Texto>
          <Contador valor={cantidad} onChange={setCantidad} min={1} />
        </View>
        {tipo === 'powerbank' && (
          <Campo
            etiqueta={t('Capacidad')}
            valor={mah}
            onChange={setMah}
            teclado="numeric"
            placeholder="20000"
            sufijo="mAh"
            ayuda={t('La que pone en la caja o detrás. En la práctica da unos dos tercios.')}
          />
        )}
        {tipo === 'bateria' && (
          <Campo
            etiqueta={t('Capacidad')}
            valor={wh}
            onChange={setWh}
            teclado="numeric"
            placeholder="500"
            sufijo="Wh"
            ayuda={t('Estaciones portátiles, baterías con inversor… Se pierde un 15 % por el camino.')}
          />
        )}
        {tipo === 'solar' && (
          <Campo
            etiqueta={t('Potencia de la placa')}
            valor={wp}
            onChange={setWp}
            teclado="numeric"
            placeholder="100"
            sufijo="Wp"
            ayuda={t('Los vatios pico de la etiqueta.')}
          />
        )}
        {tipo === 'generador' && (
          <>
            <Campo etiqueta={t('Potencia que vas a usar')} valor={vatios} onChange={setVatios} teclado="numeric" placeholder="1000" sufijo="W" />
            <Campo
              etiqueta={t('Consumo a esa potencia')}
              valor={litrosHora}
              onChange={setLitrosHora}
              teclado="decimal-pad"
              placeholder="0,5"
              sufijo="L/h"
              ayuda={t('Viene en la ficha técnica del generador.')}
            />
            <Campo etiqueta={t('Combustible guardado')} valor={litros} onChange={setLitros} teclado="decimal-pad" placeholder="10" sufijo="L" />
          </>
        )}
      </Tarjeta>

      {valida && (
        <Texto tam={13} color={C.suave}>
          {resumen}
        </Texto>
      )}

      <Boton
        deshabilitado={!valida}
        onPress={() => {
          guardar(fuente);
          volver();
        }}>
        {t('Guardar')}
      </Boton>
      {existente && (
        <Boton
          variante="secundario"
          onPress={() =>
            confirmar(t('¿Quitar esta fuente?'), existente.nombre, t('Quitar'), () => {
              borrar(existente.id);
              volver();
            })
          }>
          {t('Quitar')}
        </Boton>
      )}
    </Pantalla>
  );
}
