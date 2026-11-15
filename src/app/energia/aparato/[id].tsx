import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Boton, Campo, Contador, Interruptor, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { formatoNumero } from '@/lib/calculo';
import { confirmar } from '@/lib/confirmar';
import { whDiaAparato, type Aparato } from '@/lib/energia';
import { aCampo, numero } from '@/lib/formato';
import { volver } from '@/lib/navegacion';
import { nuevoId, useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { t } from '@/lib/i18n';

export default function EditarAparato() {
  const C = useC();
  const { id } = useLocalSearchParams<{ id: string }>();
  const existente = useAguante((s) => s.energia.aparatos.find((a) => a.id === id));
  const guardar = useAguante((s) => s.guardarAparato);
  const borrar = useAguante((s) => s.borrarAparato);

  const [nombre, setNombre] = useState(existente?.nombre ?? '');
  const [vatios, setVatios] = useState(aCampo(existente?.vatios));
  const [horas, setHoras] = useState(aCampo(existente?.horasDia));
  const [cantidad, setCantidad] = useState(existente?.cantidad ?? 1);
  const [imprescindible, setImprescindible] = useState(!!existente?.imprescindible);

  const aparato: Aparato = {
    id: existente?.id ?? nuevoId(),
    nombre: nombre.trim(),
    vatios: numero(vatios),
    horasDia: Math.min(24, numero(horas)),
    cantidad,
    imprescindible,
  };
  const valida = aparato.nombre !== '' && aparato.vatios > 0 && aparato.horasDia > 0;

  return (
    <Pantalla>
      <Tarjeta style={{ gap: 14 }}>
        <Campo etiqueta={t('Aparato')} valor={nombre} onChange={setNombre} placeholder={t('Ventilador')} />
        <Campo
          etiqueta={t('Potencia')}
          valor={vatios}
          onChange={setVatios}
          teclado="decimal-pad"
          placeholder="40"
          sufijo="W"
          ayuda={t('Viene en la etiqueta o en el cargador. Una nevera gasta a ratos: usa su consumo anual ÷ 8,76 (kWh/año → W de media).')}
        />
        <Campo etiqueta={t('Horas al día')} valor={horas} onChange={setHoras} teclado="decimal-pad" placeholder="3" sufijo="h" />
        <View style={{ gap: 6 }}>
          <Texto tam={14} peso="600" color={C.texto2}>
            {t('Cuántos')}
          </Texto>
          <Contador valor={cantidad} onChange={setCantidad} min={1} />
        </View>
        <Interruptor
          etiqueta={t('Imprescindible')}
          valor={imprescindible}
          onChange={setImprescindible}
          ayuda={t('Lo que usaríais aunque haya que apretarse: móviles, luz, radio, aparatos médicos.')}
        />
      </Tarjeta>

      {valida && (
        <Texto tam={13} color={C.suave}>
          {t('{wh} Wh al día.', { wh: formatoNumero(whDiaAparato(aparato)) })}
        </Texto>
      )}

      <Boton
        deshabilitado={!valida}
        onPress={() => {
          guardar(aparato);
          volver();
        }}>
        {t('Guardar')}
      </Boton>
      {existente && (
        <Boton
          variante="secundario"
          onPress={() =>
            confirmar({
              titulo: t('¿Quitar este aparato?'),
              nombre: t(existente.nombre),
              accion: t('Quitar'),
              icono: 'power-plug-outline',
              alAceptar: () => {
                borrar(existente.id);
                volver();
              },
            })
          }>
          {t('Quitar')}
        </Boton>
      )}
    </Pantalla>
  );
}
