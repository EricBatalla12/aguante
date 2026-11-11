import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, View } from 'react-native';

import { Aviso, Boton, Campo, FilaEnlace, Interruptor, Pantalla, Seccion, Segmentado, Tarjeta, Texto } from '@/components/ui';
import { confirmar } from '@/lib/confirmar';
import { pedirPermiso } from '@/lib/notificaciones';
import { useAguante, type Tema } from '@/lib/store';
import { useC } from '@/lib/tema';

const TEMAS: { valor: Tema; etiqueta: string }[] = [
  { valor: 'sistema', etiqueta: 'Sistema' },
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
];

export default function Ajustes() {
  const C = useC();
  const tema = useAguante((s) => s.tema);
  const setTema = useAguante((s) => s.setTema);
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
      setResultado({ bien: true, texto: 'Copia este texto y guárdalo donde quieras.' });
    }
  };

  const alImportar = () =>
    confirmar('¿Sustituir todos los datos?', 'Lo que hay ahora en la app se cambia por lo que trae la copia.', 'Sustituir', () => {
      const error = importar(copia.trim());
      setResultado(error ? { bien: false, texto: error } : { bien: true, texto: 'Copia importada.' });
      if (!error) {
        setCopia('');
        setImportando(false);
      }
    });

  return (
    <Pantalla>
      <Seccion>Apariencia</Seccion>
      <Tarjeta>
        <Segmentado opciones={TEMAS} valor={tema} onChange={setTema} />
        <Texto tam={12} color={C.suave}>
          «Sistema» sigue el modo claro u oscuro del móvil. El modo emergencia va siempre en oscuro: en muchas
          pantallas gasta menos batería.
        </Texto>
      </Tarjeta>

      <Seccion>Avisos</Seccion>
      <Tarjeta>
        <Interruptor
          etiqueta="Avisos de caducidad"
          valor={avisos}
          onChange={alAvisos}
          ayuda="Una notificación 2 meses y 1 semana antes de que caduque cada producto, para gastarlo y reponerlo."
        />
        {sinPermiso && (
          <Aviso
            tono="ambar"
            texto={
              Platform.OS === 'web'
                ? 'Los avisos solo funcionan en el móvil.'
                : 'El móvil no ha dado permiso para las notificaciones. Actívalo en los ajustes del sistema y vuelve a probar.'
            }
          />
        )}
      </Tarjeta>

      <Seccion>Cómo se calcula</Seccion>
      <Tarjeta style={{ paddingVertical: 6, gap: 0 }}>
        <FilaEnlace
          primera
          icono="book-open-variant"
          titulo="Fuentes y método"
          detalle="De dónde sale cada cifra de las raciones"
          onPress={() => router.push('/fuentes')}
        />
        <FilaEnlace icono="gauge" titulo="Modos de aguante" detalle="Normal, ligero, severo y extremo" onPress={() => router.push('/modos')} />
        <FilaEnlace icono="tune-variant" titulo="Reparto manual" detalle="Fija tú las raciones de cada uno" onPress={() => router.push('/manual')} />
      </Tarjeta>

      <Seccion>Tus datos</Seccion>
      <Tarjeta style={{ gap: 12 }}>
        <Texto tam={13} color={C.suave}>
          Todo se guarda solo en este móvil. Una copia te sirve para pasarlo a otro o para no perderlo si desinstalas la
          app.
        </Texto>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Boton pequeno variante="suave" icono="export-variant" onPress={alExportar}>
              Exportar
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
              Importar
            </Boton>
          </View>
        </View>
        {importando && (
          <>
            <Campo etiqueta="Texto de la copia" valor={copia} onChange={setCopia} multilinea placeholder="Pega aquí el texto que te dio «Exportar»" />
            <Boton pequeno deshabilitado={copia.trim() === ''} onPress={alImportar}>
              Importar y sustituir
            </Boton>
          </>
        )}
        {resultado && <Aviso tono={resultado.bien ? 'verde' : 'rojo'} texto={resultado.texto} />}
        <Boton
          pequeno
          variante="secundario"
          icono="trash-can-outline"
          onPress={() =>
            confirmar('¿Borrar todos los datos?', 'Se borran las personas, las mascotas, la despensa y el kit. No se puede deshacer.', 'Borrar todo', () => {
              borrarTodo();
              setResultado({ bien: true, texto: 'Datos borrados.' });
            })
          }>
          Borrar todos los datos
        </Boton>
      </Tarjeta>

      <Texto tam={12} color={C.suave} centro>
        Aguante {Constants.expoConfig?.version ?? ''} · Estimación orientativa, no sustituye el consejo médico.
      </Texto>
    </Pantalla>
  );
}
