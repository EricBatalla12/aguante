// Panel de admin: para probar en el móvil lo que normalmente pasa solo y
// tarda (avisos, la tarea en segundo plano, un aviso de AEMET, un error).
// Solo lo ven los correos de src/constants/admin.ts (y cualquiera en
// desarrollo). Todo es de este móvil: no toca los datos de la casa ni el
// servidor, salvo el error de prueba, que va a la tabla `errores`.

import { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { Aviso, Boton, Pantalla, Seccion, Tarjeta, Texto } from '@/components/ui';
import { useEsAdmin } from '@/lib/admin';
import { provinciaPorIne, type AvisoMet } from '@/lib/avisos';
import { useAvisos } from '@/lib/avisos-estado';
import { apuntarError } from '@/lib/errores';
import { textoMomento } from '@/lib/fechas';
import { t } from '@/lib/i18n';
import {
  avisosProgramados,
  contenidoAemet,
  contenidoCaducidad,
  contenidoCompra,
  contenidoSemana,
  permisoConcedido,
  probarAviso,
  reprogramarAvisos,
  type Contenido,
} from '@/lib/notificaciones';
import { ejecutarTareaAhora, estadoSegundoPlano } from '@/lib/segundo-plano';
import { useSincro } from '@/lib/sincro';
import { useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';

/** Los avisos simulados llevan este principio en el id: así se pueden quitar. */
const PRUEBA = 'prueba-admin-';
const HORA = 3_600_000;

type Estado = {
  permiso: boolean | null;
  disponible: boolean;
  registrada: boolean;
  programados: { titulo: string; fecha: number | null }[];
};

export default function PanelAdmin() {
  const C = useC();
  const admin = useEsAdmin();
  const correo = useSincro((s) => s.correo);
  const productos = useAguante((s) => s.productos);
  const kitPropio = useAguante((s) => s.kitPropio);
  const avisos = useAguante((s) => s.avisos);
  const notificar = useAguante((s) => s.notificar);
  const diaCompra = useAguante((s) => s.compra.diaRecordatorio);
  const ineProvincia = useAvisos((s) => s.provincia);
  const meteo = useAvisos((s) => s.meteo);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [mensaje, setMensaje] = useState<{ tono: 'verde' | 'ambar'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const provincia = provinciaPorIne(ineProvincia);
  const simulados = meteo.filter((a) => a.id.startsWith(PRUEBA)).length;

  /** Lee el permiso, la tarea en segundo plano y los avisos programados. */
  const leerEstado = useCallback(
    async (): Promise<Estado> => {
      const permiso = await permisoConcedido().catch(() => null);
      const [sp, programados] = await Promise.all([
        estadoSegundoPlano().catch(() => ({ disponible: false, registrada: false })),
        avisosProgramados().catch(() => []),
      ]);
      return { permiso, ...sp, programados };
    },
    [],
  );
  const mirar = useCallback(() => {
    leerEstado().then(setEstado);
  }, [leerEstado]);

  useEffect(() => {
    let vivo = true;
    leerEstado().then((e) => vivo && setEstado(e));
    return () => {
      vivo = false;
    };
  }, [leerEstado]);

  if (!admin) {
    return (
      <Pantalla>
        <Aviso tono="ambar" texto={t('Este panel solo está para la cuenta de administración.')} />
      </Pantalla>
    );
  }

  /** Corre una prueba, enseña cómo ha ido y vuelve a mirar el estado. */
  const probar = async (accion: () => Promise<string>) => {
    setOcupado(true);
    setMensaje(null);
    try {
      setMensaje({ tono: 'verde', texto: await accion() });
    } catch (e) {
      setMensaje({ tono: 'ambar', texto: t('Ha fallado: {error}', { error: e instanceof Error ? e.message : String(e) }) });
    } finally {
      setOcupado(false);
      mirar();
    }
  };

  const enviar = (contenido: Contenido) =>
    probar(async () => {
      if (Platform.OS === 'web') throw new Error(t('Los avisos solo funcionan en el móvil.'));
      if (!(await probarAviso(contenido, 5))) throw new Error(t('El móvil no ha dado permiso para las notificaciones.'));
      return t('Llegará en 5 segundos. Bloquea el móvil para verlo como de verdad.');
    });

  // Un producto o un elemento del kit de verdad si los hay, para que el aviso se parezca al real
  const unProducto = productos.find((p) => p.cantidad > 0)?.nombre ?? t('Atún en aceite');
  const unoDelKit = kitPropio.find((k) => k.caducidad)?.que ?? t('Pilas de repuesto');
  // Se llama al pulsar, no al pintar: la hora es la de ese momento
  const avisoEjemplo = (nivel: 'naranja' | 'rojo', ahora = Date.now()): AvisoMet => ({
    id: `${PRUEBA}${nivel}-${ahora}`,
    nivel,
    fenomeno: t('Prueba (simulada)'),
    zona: t('{zona} (simulado)', { zona: provincia?.nombre ?? t('Tu zona') }),
    codigoZona: provincia ? `${provincia.ccaa}${provincia.ine}01` : '000000',
    detalle: t('Aviso simulado desde el panel de admin. No es real.'),
    inicio: ahora,
    fin: ahora + 6 * HORA,
    url: 'https://www.aemet.es/es/eltiempo/prediccion/avisos',
  });
  // Con la despensa de verdad; si no hay nada que caduque pronto, con una lata de ejemplo
  const avisoSemana = () => {
    const hoy = new Date();
    const ejemplo = new Date(hoy.getTime() + 20 * 24 * HORA).toISOString().slice(0, 10);
    return (
      contenidoSemana(productos, hoy) ??
      contenidoSemana([{ id: 'x', nombre: t('Atún en aceite'), categoria: 'comida', cantidad: 4, caducidad: ejemplo }], hoy)
    );
  };

  return (
    <Pantalla>
      <Texto tam={13} color={C.suave}>
        {t('Pruebas de este móvil: no cambian los datos de la casa. Lo ve {quien}.', { quien: correo ?? t('cualquiera en desarrollo') })}
      </Texto>
      {mensaje && <Aviso tono={mensaje.tono} texto={mensaje.texto} />}

      <Seccion>{t('Estado')}</Seccion>
      <Tarjeta style={{ gap: 6 }}>
        <Linea etiqueta={t('Notificaciones en Ajustes')} valor={avisos ? t('encendidas') : t('apagadas')} />
        <Linea
          etiqueta={t('Permiso del sistema')}
          valor={estado?.permiso === null || !estado ? t('no aplica') : estado.permiso ? t('concedido') : t('denegado')}
        />
        <Linea
          etiqueta={t('Tipos encendidos')}
          valor={[
            notificar.despensa && t('despensa'),
            notificar.kit && t('kit'),
            notificar.semana !== false && t('semana'),
            notificar.aemet && 'AEMET',
            diaCompra && t('día de compra'),
          ]
            .filter(Boolean)
            .join(', ') || t('ninguno')}
        />
        <Linea etiqueta={t('Segundo plano')} valor={!estado ? '…' : !estado.disponible ? t('no disponible') : estado.registrada ? t('registrada') : t('sin registrar')} />
        <Linea etiqueta={t('Provincia de Actualidad')} valor={provincia?.nombre ?? t('sin elegir')} />
        <Linea etiqueta={t('Avisos programados')} valor={String(estado?.programados.length ?? '…')} />
        {estado?.programados.slice(0, 8).map((p, i) => (
          <Texto key={i} tam={12} color={C.texto2}>
            {p.fecha ? textoMomento(p.fecha) : '—'} · {p.titulo}
          </Texto>
        ))}
        <View style={{ paddingTop: 6 }}>
          <Boton
            pequeno
            variante="suave"
            icono="refresh"
            deshabilitado={ocupado}
            onPress={() =>
              probar(async () => {
                await reprogramarAvisos(
                  notificar.despensa ? productos : [],
                  notificar.kit ? kitPropio : [],
                  diaCompra,
                  notificar.semana !== false ? productos : [],
                );
                return t('Avisos reprogramados.');
              })
            }>
            {t('Reprogramar los avisos')}
          </Boton>
        </View>
      </Tarjeta>

      <Seccion>{t('Probar avisos')}</Seccion>
      <Tarjeta style={{ gap: 8 }}>
        <Texto tam={13} color={C.suave}>
          {t('Cada uno llega a los 5 segundos con el mismo texto que el de verdad.')}
        </Texto>
        <Boton pequeno variante="secundario" deshabilitado={ocupado} onPress={() => enviar(contenidoCaducidad(unProducto, 60, false))}>
          {t('Caducidad: 2 meses antes')}
        </Boton>
        <Boton pequeno variante="secundario" deshabilitado={ocupado} onPress={() => enviar(contenidoCaducidad(unProducto, 7, false))}>
          {t('Caducidad: 1 semana antes')}
        </Boton>
        <Boton pequeno variante="secundario" deshabilitado={ocupado} onPress={() => enviar(contenidoCaducidad(unoDelKit, 60, true))}>
          {t('Caducidad del kit')}
        </Boton>
        <Boton
          pequeno
          variante="secundario"
          deshabilitado={ocupado}
          onPress={() => {
            const c = avisoSemana();
            if (c) enviar(c);
          }}>
          {t('Gasta esto esta semana')}
        </Boton>
        <Boton pequeno variante="secundario" deshabilitado={ocupado} onPress={() => enviar(contenidoCompra())}>
          {t('Día de compra')}
        </Boton>
        <Boton pequeno variante="secundario" deshabilitado={ocupado} onPress={() => enviar(contenidoAemet(avisoEjemplo('naranja')))}>
          {t('Aviso naranja de AEMET')}
        </Boton>
        <Boton pequeno variante="secundario" deshabilitado={ocupado} onPress={() => enviar(contenidoAemet(avisoEjemplo('rojo')))}>
          {t('Aviso rojo de AEMET')}
        </Boton>
      </Tarjeta>

      <Seccion>{t('Segundo plano')}</Seccion>
      <Tarjeta style={{ gap: 8 }}>
        <Texto tam={13} color={C.suave}>
          {t('Hace ahora lo que hace sola más o menos cada hora: pone al día el widget y mira los avisos de AEMET de tu provincia. Solo avisa de los naranjas y rojos que no haya avisado ya.')}
        </Texto>
        <Boton
          pequeno
          icono="play"
          deshabilitado={ocupado}
          onPress={() =>
            probar(async () => {
              if (Platform.OS === 'web') throw new Error(t('En la web no hay tarea en segundo plano.'));
              await ejecutarTareaAhora();
              return t('Tarea hecha. Si había un aviso naranja o rojo nuevo, ya ha llegado.');
            })
          }>
          {t('Ejecutar la tarea ahora')}
        </Boton>
        <Boton
          pequeno
          variante="suave"
          deshabilitado={ocupado}
          onPress={() =>
            probar(async () => {
              useAvisos.setState({ avisados: [] });
              return t('Olvidados: la próxima vez avisará otra vez de los que sigan en pie.');
            })
          }>
          {t('Olvidar los avisos ya notificados')}
        </Boton>
      </Tarjeta>

      <Seccion>{t('Actualidad e Inicio')}</Seccion>
      <Tarjeta style={{ gap: 8 }}>
        <Texto tam={13} color={C.suave}>
          {provincia
            ? t('Mete un aviso rojo falso en {provincia} para ver la tarjeta de Inicio y Actualidad. Se marca como simulado.', { provincia: provincia.nombre })
            : t('Elige primero tu provincia en Actualidad.')}
        </Texto>
        <Boton
          pequeno
          variante="secundario"
          icono="alert-outline"
          deshabilitado={ocupado || !provincia}
          onPress={() =>
            probar(async () => {
              useAvisos.setState((s) => ({ meteo: [...s.meteo, avisoEjemplo('rojo')] }));
              return t('Aviso simulado. Míralo en Inicio y en Actualidad.');
            })
          }>
          {t('Simular un aviso rojo')}
        </Boton>
        {simulados > 0 && (
          <Boton
            pequeno
            variante="suave"
            deshabilitado={ocupado}
            onPress={() =>
              probar(async () => {
                useAvisos.setState((s) => ({ meteo: s.meteo.filter((a) => !a.id.startsWith(PRUEBA)) }));
                return t('Simulación quitada.');
              })
            }>
            {t('Quitar los avisos simulados ({n})', { n: simulados })}
          </Boton>
        )}
      </Tarjeta>

      <Seccion>{t('Registro de errores')}</Seccion>
      <Tarjeta style={{ gap: 8 }}>
        <Texto tam={13} color={C.suave}>
          {notificar.errores
            ? t('Manda un error de prueba a Supabase (tabla errores, en el Table Editor).')
            : t('«Mandar los fallos de la app» está apagado en Ajustes: enciéndelo para probarlo.')}
        </Texto>
        <Boton
          pequeno
          variante="secundario"
          icono="bug-outline"
          deshabilitado={ocupado || !notificar.errores}
          onPress={() =>
            probar(async () => {
              apuntarError(new Error(`Prueba del panel de admin (${new Date().toISOString()})`));
              return t('Mandado. Como mucho 5 por sesión.');
            })
          }>
          {t('Mandar un error de prueba')}
        </Boton>
      </Tarjeta>
    </Pantalla>
  );
}

function Linea({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const C = useC();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Texto tam={14} color={C.texto2} style={{ flexShrink: 1 }}>
        {etiqueta}
      </Texto>
      <Texto tam={14} peso="600" style={{ flexShrink: 1, textAlign: 'right' }}>
        {valor}
      </Texto>
    </View>
  );
}
