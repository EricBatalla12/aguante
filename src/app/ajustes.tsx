import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, View } from 'react-native';

import { Aviso, Boton, Campo, FilaEnlace, Interruptor, Pantalla, Seccion, Segmentado, Tarjeta, Texto } from '@/components/ui';
import { confirmar } from '@/lib/confirmar';
import { pedirPermiso } from '@/lib/notificaciones';
import { useAguante, type Idioma, type Tema } from '@/lib/store';
import { useC } from '@/lib/tema';
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
  const avisos = useAguante((s) => s.avisos);
  const setAvisos = useAguante((s) => s.setAvisos);
  const exportar = useAguante((s) => s.exportar);
  const importar = useAguante((s) => s.importar);
  const borrarTodo = useAguante((s) => s.borrarTodo);

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
    confirmar(t('¿Sustituir todos los datos?'), t('Lo que hay ahora en la app se cambia por lo que trae la copia.'), t('Sustituir'), () => {
      const error = importar(copia.trim());
      setResultado(error ? { bien: false, texto: error } : { bien: true, texto: t('Copia importada.') });
      if (!error) {
        setCopia('');
        setImportando(false);
      }
    });

  return (
    <Pantalla>
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
          {t('Todo se guarda solo en este móvil. Una copia te sirve para pasarlo a otro o para no perderlo si desinstalas la app.')}
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
            confirmar(t('¿Borrar todos los datos?'), t('Se borran las personas, las mascotas, la despensa y el kit. No se puede deshacer.'), t('Borrar todo'), () => {
              borrarTodo();
              setResultado({ bien: true, texto: t('Datos borrados.') });
            })
          }>
          {t('Borrar todos los datos')}
        </Boton>
      </Tarjeta>

      <Texto tam={12} color={C.suave} centro>
        Aguante {Constants.expoConfig?.version ?? ''} · {t('Estimación orientativa, no sustituye el consejo médico.')}
      </Texto>
    </Pantalla>
  );
}
