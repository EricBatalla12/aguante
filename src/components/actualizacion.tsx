// Actualizaciones de EAS Update vistas desde la app.
//
// La app busca actualización cada vez que se abre y la descarga en segundo
// plano, pero no la aplica hasta la siguiente vez que arranca. El 15/11/2026
// las actualizaciones no llegaban al móvil de Eric y desde fuera no había
// forma de saber por qué, así que aquí se enseña:
// - un aviso con «Reiniciar ahora» cuando ya hay una versión descargada, para
//   no tener que cerrar y abrir la app a ciegas;
// - en Ajustes, el canal, la versión de runtime, la última comprobación, el
//   error si lo hubo y un botón para buscar a mano.
// En la web y en desarrollo (Metro) expo-updates está apagado: no se pinta nada.

import * as Updates from 'expo-updates';
import { useState } from 'react';
import { View } from 'react-native';

import { Aviso, Boton, Tarjeta, Texto } from '@/components/ui';
import { textoDia } from '@/lib/fechas';
import { t } from '@/lib/i18n';
import { useC } from '@/lib/tema';

const reiniciar = () => Updates.reloadAsync().catch(() => {});

/** Aviso que sale solo cuando hay una versión descargada esperando. */
export function AvisoVersionNueva() {
  const { isUpdatePending } = Updates.useUpdates();
  if (!Updates.isEnabled || !isUpdatePending) return null;
  return (
    <Tarjeta style={{ gap: 10 }}>
      <Texto peso="700">{t('Hay una versión nueva de Aguante')}</Texto>
      <Texto tam={13}>{t('Ya está descargada. Se aplica al reiniciar la app: no se pierde nada de lo apuntado.')}</Texto>
      <Boton pequeno icono="restart" onPress={reiniciar}>
        {t('Reiniciar ahora')}
      </Boton>
    </Tarjeta>
  );
}

const hora = (d: Date) => `${textoDia(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Estado de las actualizaciones, para Ajustes. */
export function EstadoActualizaciones() {
  const C = useC();
  const u = Updates.useUpdates();
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<{ bien: boolean; texto: string } | null>(null);

  if (!Updates.isEnabled) return null;

  const buscar = async () => {
    setBuscando(true);
    setResultado(null);
    try {
      const r = await Updates.checkForUpdateAsync();
      if (!r.isAvailable) {
        setResultado({ bien: true, texto: t('Tienes la última versión.') });
      } else {
        await Updates.fetchUpdateAsync();
        setResultado({ bien: true, texto: t('Descargada. Reinicia la app para aplicarla.') });
      }
    } catch (e) {
      setResultado({ bien: false, texto: t('No se ha podido buscar: {error}', { error: (e as Error)?.message ?? String(e) }) });
    }
    setBuscando(false);
  };

  const error = u.checkError ?? u.downloadError;
  const lineas = [
    t('Canal: {canal} · Runtime: {runtime}', { canal: Updates.channel ?? '?', runtime: Updates.runtimeVersion ?? '?' }),
    u.lastCheckForUpdateTimeSinceRestart
      ? t('Última comprobación: {cuando}', { cuando: hora(u.lastCheckForUpdateTimeSinceRestart) })
      : t('Aún no ha comprobado desde que se abrió.'),
    u.isChecking ? t('Comprobando…') : u.isDownloading ? t('Descargando…') : null,
  ].filter(Boolean);

  return (
    <Tarjeta style={{ gap: 10 }}>
      {lineas.map((l) => (
        <Texto key={l} tam={12} color={C.suave}>
          {l}
        </Texto>
      ))}
      {error && <Aviso texto={t('Error al actualizar: {error}', { error: error.message })} />}
      {resultado && <Aviso tono={resultado.bien ? 'verde' : 'rojo'} texto={resultado.texto} />}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Boton pequeno variante="suave" icono="cloud-download-outline" deshabilitado={buscando} onPress={buscar}>
            {buscando ? t('Buscando…') : t('Buscar actualización')}
          </Boton>
        </View>
        {u.isUpdatePending && (
          <View style={{ flex: 1 }}>
            <Boton pequeno icono="restart" onPress={reiniciar}>
              {t('Reiniciar ahora')}
            </Boton>
          </View>
        )}
      </View>
    </Tarjeta>
  );
}
