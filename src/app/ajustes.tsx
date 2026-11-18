import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Share, View } from 'react-native';

import { Aviso, Boton, Campo, FilaEnlace, Interruptor, Pantalla, Seccion, Segmentado, Tarjeta, Texto } from '@/components/ui';
import { EstadoActualizaciones } from '@/components/actualizacion';
import { SelectorActividad } from '@/components/escenario';
import { PreguntasFrecuentes } from '@/components/preguntas';
import { Hueco } from '@/components/tutorial';
import { ENLACE_DONAR } from '@/constants/monetizacion';
import { confirmar } from '@/lib/confirmar';
import { pedirPermiso } from '@/lib/notificaciones';
import { useSincro } from '@/lib/sincro';
import { useAguante, type Idioma, type Tema } from '@/lib/store';
import { useC } from '@/lib/tema';
import { textoDia } from '@/lib/fechas';
import { empezarTutorial } from '@/lib/tutorial';
import { t } from '@/lib/i18n';

const TEMAS: { valor: Tema; etiqueta: string }[] = [
  { valor: 'sistema', etiqueta: 'Sistema' },
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
];

// Los nombres de los idiomas van siempre en su idioma, para encontrarlos
// aunque no entiendas el que está puesto
const IDIOMAS: { valor: Idioma; etiqueta: string }[] = [
  { valor: 'sistema', etiqueta: 'Sistema' },
  { valor: 'es', etiqueta: 'Español' },
  { valor: 'en', etiqueta: 'English' },
];

export default function Ajustes() {
  const C = useC();
  const tema = useAguante((s) => s.tema);
  const setTema = useAguante((s) => s.setTema);
  const idioma = useAguante((s) => s.idioma);
  const setIdioma = useAguante((s) => s.setIdioma);
  const actividad = useAguante((s) => s.actividad);
  const setActividad = useAguante((s) => s.setActividad);
  const avisos = useAguante((s) => s.avisos);
  const setAvisos = useAguante((s) => s.setAvisos);
  const exportar = useAguante((s) => s.exportar);
  const importar = useAguante((s) => s.importar);
  const borrarTodo = useAguante((s) => s.borrarTodo);
  const casa = useSincro((s) => s.casa);
  const correo = useSincro((s) => s.correo);

  const [sinPermiso, setSinPermiso] = useState(false);
  const [importando, setImportando] = useState(false);
  const [copia, setCopia] = useState('');
  const [resultado, setResultado] = useState<{ bien: boolean; texto: string } | null>(null);

  const alAvisos = async (v: boolean) => {
    setSinPermiso(false);
    if (!v) return setAvisos(false);
    const permitido = await pedirPermiso();
    setAvisos(permitido);
    setSinPermiso(!permitido);
  };

  const alExportar = async () => {
    const json = exportar();
    try {
      await Share.share({ message: json });
    } catch {
      // Sin menú de compartir (en el navegador): se deja el texto a la vista para copiarlo
      setImportando(true);
      setCopia(json);
      setResultado({ bien: true, texto: t('Copia este texto y guárdalo donde quieras.') });
    }
  };

  const alImportar = () =>
    confirmar({
      titulo: t('¿Sustituir todos los datos?'),
      mensaje: casa
        ? t('Lo que hay ahora en la app se cambia por lo que trae la copia, también para toda la casa «{casa}».', { casa: casa.nombre })
        : t('Lo que hay ahora en la app se cambia por lo que trae la copia.'),
      accion: t('Sustituir'),
      icono: 'file-replace-outline',
      alAceptar: () => {
        const error = importar(copia.trim());
        setResultado(error ? { bien: false, texto: error } : { bien: true, texto: t('Copia importada.') });
        if (!error) {
          setCopia('');
          setImportando(false);
        }
      },
    });

  return (
    <Pantalla>
      <Seccion>{t('Casa compartida')}</Seccion>
      <Hueco id="ajustes-casa">
      <Tarjeta style={{ paddingVertical: 6, gap: 0 }}>
        <FilaEnlace
          primera
          icono={casa ? 'home-heart' : 'account-multiple-plus-outline'}
          titulo={t('Cuenta y casa')}
          detalle={
            casa
              ? t('En «{casa}»', { casa: casa.nombre })
              : correo
                ? t('Has entrado como {correo}', { correo })
                : t('Comparte la despensa con quien vive contigo')
          }
          onPress={() => router.push('/cuenta')}
        />
      </Tarjeta>
      </Hueco>

      <Seccion>{t('Apariencia')}</Seccion>
      <Tarjeta>
        <Segmentado opciones={TEMAS} valor={tema} onChange={setTema} />
        <Texto tam={12} color={C.suave}>
          {t('«Sistema» sigue el modo claro u oscuro del móvil. El modo emergencia va siempre en oscuro: en muchas pantallas gasta menos batería.')}
        </Texto>
      </Tarjeta>

      <Seccion>{t('Idioma')}</Seccion>
      <Tarjeta>
        <Segmentado opciones={IDIOMAS} valor={idioma} onChange={setIdioma} />
        <Texto tam={12} color={C.suave}>
          {t('«Sistema» usa el idioma del móvil. Las guías y la pantalla de fuentes también se traducen.')}
        </Texto>
      </Tarjeta>

      <Seccion>{t('Avisos')}</Seccion>
      <Tarjeta>
        <Interruptor
          etiqueta={t('Avisos de caducidad')}
          valor={avisos}
          onChange={alAvisos}
          ayuda={t('Una notificación 2 meses y 1 semana antes de que caduque cada producto, para gastarlo y reponerlo.')}
        />
        {sinPermiso && (
          <Aviso
            tono="ambar"
            texto={
              Platform.OS === 'web'
                ? t('Los avisos solo funcionan en el móvil.')
                : t('El móvil no ha dado permiso para las notificaciones. Actívalo en los ajustes del sistema y vuelve a probar.')
            }
          />
        )}
      </Tarjeta>

      <Seccion>{t('Cómo se calcula')}</Seccion>
      <Tarjeta style={{ gap: 8 }}>
        <SelectorActividad valor={actividad} onChange={setActividad} />
        <Texto tam={12} color={C.suave}>
          {t('Es la que se usa en el día a día. Al empezar una emergencia se elige otra vez (por defecto, sedentaria).')}
        </Texto>
      </Tarjeta>
      <Tarjeta style={{ paddingVertical: 6, gap: 0 }}>
        <FilaEnlace
          primera
          icono="book-open-variant"
          titulo={t('Fuentes y método')}
          detalle={t('De dónde sale cada cifra de las raciones')}
          onPress={() => router.push('/fuentes')}
        />
        <FilaEnlace icono="gauge" titulo={t('Modos de aguante')} detalle={t('Normal, ligero, severo y extremo')} onPress={() => router.push('/modos')} />
        <FilaEnlace icono="tune-variant" titulo={t('Reparto manual')} detalle={t('Fija tú las raciones de cada uno')} onPress={() => router.push('/manual')} />
      </Tarjeta>

      <Seccion>{t('Tus datos')}</Seccion>
      <Tarjeta style={{ gap: 12 }}>
        <Texto tam={13} color={C.suave}>
          {casa
            ? t('Se guarda en este móvil y se sincroniza con la casa «{casa}». Una copia te sirve para guardar cómo está todo ahora.', { casa: casa.nombre })
            : t('Todo se guarda solo en este móvil. Una copia te sirve para pasarlo a otro o para no perderlo si desinstalas la app.')}
        </Texto>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Boton pequeno variante="suave" icono="export-variant" onPress={alExportar}>
              {t('Exportar')}
            </Boton>
          </View>
          <View style={{ flex: 1 }}>
            <Boton
              pequeno
              variante="suave"
              icono="import"
              onPress={() => {
                setImportando(!importando);
                setResultado(null);
              }}>
              {t('Importar')}
            </Boton>
          </View>
        </View>
        {importando && (
          <>
            <Campo etiqueta={t('Texto de la copia')} valor={copia} onChange={setCopia} multilinea placeholder={t('Pega aquí el texto que te dio «Exportar»')} />
            <Boton pequeno deshabilitado={copia.trim() === ''} onPress={alImportar}>
              {t('Importar y sustituir')}
            </Boton>
          </>
        )}
        {resultado && <Aviso tono={resultado.bien ? 'verde' : 'rojo'} texto={resultado.texto} />}
        <Boton
          pequeno
          variante="secundario"
          icono="trash-can-outline"
          onPress={() =>
            confirmar({
              titulo: t('¿Borrar todos los datos?'),
              mensaje: casa
                ? t('Se borran las personas, las mascotas, la despensa y el kit, también para toda la casa «{casa}». No se puede deshacer.', { casa: casa.nombre })
                : t('Se borran las personas, las mascotas, la despensa y el kit. No se puede deshacer.'),
              accion: t('Borrar todo'),
              alAceptar: () => {
                borrarTodo();
                setResultado({ bien: true, texto: t('Datos borrados.') });
              },
            })
          }>
          {t('Borrar todos los datos')}
        </Boton>
      </Tarjeta>

      {ENLACE_DONAR ? (
        <>
          <Seccion>{t('Apoyar Aguante')}</Seccion>
          <Tarjeta style={{ gap: 12 }}>
            <Texto tam={13} color={C.suave}>
              {t('Aguante es gratis, sin anuncios y sin nada bloqueado. Si te es útil, una donación ayuda a mantenerla y a seguir mejorándola.')}
            </Texto>
            <Boton icono="hand-heart-outline" onPress={() => Linking.openURL(ENLACE_DONAR).catch(() => {})}>
              {t('Donar con PayPal')}
            </Boton>
          </Tarjeta>
        </>
      ) : null}

      <Seccion>{t('Ayuda')}</Seccion>
      <Tarjeta style={{ gap: 10 }}>
        <Texto tam={13} color={C.suave}>
          {t('Un recorrido corto por la app, paso a paso. Lo puedes repetir cuando quieras.')}
        </Texto>
        <Boton pequeno variante="suave" icono="school-outline" onPress={() => empezarTutorial('/ajustes')}>
          {t('Ver el tutorial')}
        </Boton>
      </Tarjeta>
      <Texto tam={15} peso="700" style={{ paddingHorizontal: 4 }}>
        {t('Preguntas frecuentes')}
      </Texto>
      <Tarjeta style={{ paddingVertical: 4, gap: 0 }}>
        <PreguntasFrecuentes />
      </Tarjeta>

      <EstadoActualizaciones />

      <Texto tam={12} color={C.suave} centro>
        Aguante {Constants.expoConfig?.version ?? ''} · {t('Estimación orientativa, no sustituye el consejo médico.')}
        {'\n'}
        {/* Qué actualización de EAS Update está corriendo: sirve para comprobar que ha llegado */}
        {Updates.updateId && !Updates.isEmbeddedLaunch
          ? t('Actualización {id} del {fecha}', {
              id: Updates.updateId.slice(0, 8),
              fecha: Updates.createdAt ? textoDia(Updates.createdAt) : '?',
            })
          : t('Versión instalada con el APK')}
      </Texto>
    </Pantalla>
  );
}
