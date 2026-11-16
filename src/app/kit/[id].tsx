// Cambiar algo que la casa ha añadido al kit: nombre, lista y caducidad.

import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BotonCalendario } from '@/components/boton-calendario';
import { Boton, Campo, CampoFecha, Pantalla, Segmentado, Tarjeta, Texto } from '@/components/ui';
import { LISTAS_KIT, listaDe, type ElementoKit } from '@/constants/kit';
import { confirmar } from '@/lib/confirmar';
import { componerFecha, partesDeFecha, textoFechaLarga } from '@/lib/fechas';
import { t } from '@/lib/i18n';
import { volver } from '@/lib/navegacion';
import { useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';

export default function EditarKit() {
  const C = useC();
  const { id } = useLocalSearchParams<{ id: string }>();
  const elemento = useAguante((s) => s.kitPropio.find((k) => k.id === id));

  if (!elemento) {
    return (
      <Pantalla>
        <Texto color={C.suave}>{t('Esto ya no está en el kit.')}</Texto>
      </Pantalla>
    );
  }
  return <Formulario inicial={elemento} />;
}

function Formulario({ inicial }: { inicial: ElementoKit }) {
  const C = useC();
  const guardar = useAguante((s) => s.guardarKit);
  const borrar = useAguante((s) => s.borrarKit);
  const [que, setQue] = useState(inicial.que);
  const [lista, setLista] = useState(listaDe(inicial));
  const [fecha, setFecha] = useState(partesDeFecha(inicial.caducidad, inicial.caducidadSinDia));
  const caducidad = componerFecha(fecha);
  const valido = que.trim() !== '' && caducidad.estado !== 'error' && caducidad.estado !== 'incompleta';

  return (
    <Pantalla>
      <Tarjeta style={{ gap: 14 }}>
        <Campo etiqueta={t('Qué es')} valor={que} onChange={setQue} />
        <View style={{ gap: 6 }}>
          <Texto tam={14} peso="600" color={C.texto2}>
            {t('Lista')}
          </Texto>
          <Segmentado opciones={LISTAS_KIT} valor={lista} onChange={setLista} />
        </View>
        <CampoFecha
          etiqueta={t('Caducidad (si tiene)')}
          valor={fecha}
          onChange={setFecha}
          ayuda={caducidad.estado === 'ok' ? t('Caduca {cuando}.', { cuando: textoFechaLarga(caducidad.iso, caducidad.sinDia) }) : undefined}
          error={caducidad.estado === 'error' ? caducidad.mensaje : undefined}
        />
      </Tarjeta>
      <Boton
        icono="check"
        deshabilitado={!valido}
        onPress={() => {
          const conFecha = caducidad.estado === 'ok' ? caducidad : null;
          guardar({
            ...inicial,
            que: que.trim(),
            lista,
            caducidad: conFecha?.iso,
            caducidadSinDia: conFecha?.sinDia || undefined,
          });
          volver();
        }}>
        {t('Guardar cambios')}
      </Boton>
      {inicial.caducidad && <BotonCalendario nombre={inicial.que} caducidad={inicial.caducidad} sinDia={inicial.caducidadSinDia} delKit />}
      <Boton
        variante="secundario"
        icono="trash-can-outline"
        onPress={() =>
          confirmar({
            titulo: t('¿Quitar del kit?'),
            nombre: inicial.que,
            mensaje: t('Deja de salir en la lista.'),
            accion: t('Quitar'),
            icono: 'clipboard-check-outline',
            alAceptar: () => {
              borrar(inicial.id);
              volver();
            },
          })
        }>
        {t('Quitar del kit')}
      </Boton>
    </Pantalla>
  );
}
