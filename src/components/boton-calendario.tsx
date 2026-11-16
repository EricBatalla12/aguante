// Botón «Añadir aviso al calendario»: abre Google Calendar con el evento
// relleno (ver src/lib/calendario.ts). Sin módulos nativos.

import { Linking } from 'react-native';

import { Boton } from '@/components/ui';
import { diaAviso, enlaceCalendario } from '@/lib/calendario';
import { textoFechaLarga } from '@/lib/fechas';
import { t } from '@/lib/i18n';

export function BotonCalendario({ nombre, caducidad, sinDia, delKit }: { nombre: string; caducidad: string; sinDia?: boolean; delKit?: boolean }) {
  const abrir = () => {
    const cuando = textoFechaLarga(caducidad, sinDia);
    const url = enlaceCalendario({
      titulo: delKit ? t('Cambiar por uno nuevo: {nombre}', { nombre }) : t('Gastar y reponer: {nombre}', { nombre }),
      detalle: delKit
        ? t('Caduca {cuando}. Es del kit de emergencia: cámbialo por uno nuevo. Aviso de Aguante.', { cuando })
        : t('Caduca {cuando}. Gástalo en el día a día y repón la reserva. Aviso de Aguante.', { cuando }),
      dia: diaAviso(caducidad, new Date()),
    });
    Linking.openURL(url).catch(() => {});
  };
  return (
    <Boton variante="secundario" icono="calendar-plus" onPress={abrir}>
      {t('Añadir aviso al calendario')}
    </Boton>
  );
}
