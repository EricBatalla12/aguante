// Cuenta y casa compartida. Es opcional: sin cuenta la app sigue igual, con
// todo en este móvil. Se entra con el correo y un código que llega por correo
// (sin contraseñas). Una persona crea la casa y las demás entran con su código.

import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';

import { EstadoPlan } from '@/components/pro';
import { Aviso, Boton, Campo, Icono, Pantalla, Pastilla, Seccion, Tarjeta, Texto } from '@/components/ui';
import { tieneDatos, type Compartido } from '@/lib/compartido';
import { confirmar } from '@/lib/confirmar';
import { textoDia } from '@/lib/fechas';
import { t, tn } from '@/lib/i18n';
import {
  borrarCuenta,
  cerrarSesion,
  comprobarCodigo,
  crearCasa,
  entrarEnCasa,
  entrarConGoogle,
  enviarCodigo,
  googleDisponible,
  miembros,
  misCasas,
  salirDeCasa,
  sincronizar,
  unirseACasa,
  useSincro,
  type Casa,
  type Miembro,
} from '@/lib/sincro';
import { useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';

export default function Cuenta() {
  const usuario = useSincro((s) => s.usuario);
  const casa = useSincro((s) => s.casa);
  return <Pantalla>{!usuario ? <Entrar /> : !casa ? <SinCasa /> : <ConCasa casa={casa} />}</Pantalla>;
}

/** Resultado de una acción: null si fue bien o el error a enseñar. */
function useAccion() {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hacer = async (f: () => Promise<string | null>) => {
    setOcupado(true);
    setError(null);
    const e = await f();
    setOcupado(false);
    setError(e);
    return e === null;
  };
  return { ocupado, error, hacer };
}

// ------------------------------------------------------------------ Sin sesión

function Entrar() {
  const C = useC();
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [enviado, setEnviado] = useState(false);
  const a = useAccion();
  const correoValido = /^\S+@\S+\.\S+$/.test(correo.trim());
  // Supabase manda 6 cifras por defecto; se admiten hasta 10 por si se cambia en el proyecto
  const codigoValido = /^\d{6,10}$/.test(codigo.trim());

  return (
    <>
      <Texto color={C.suave}>
        {t('Con una cuenta, quienes vivís juntos compartís la despensa, el hogar, el kit y la energía desde varios móviles. Es opcional: sin cuenta todo sigue guardado solo en este móvil.')}
      </Texto>
      <BotonGoogle />
      <Tarjeta style={{ gap: 12 }}>
        {!enviado ? (
          <>
            <Campo
              etiqueta={t('Tu correo')}
              valor={correo}
              onChange={setCorreo}
              teclado="email-address"
              placeholder="nombre@correo.com"
              ayuda={t('Te mandamos un código para entrar. No hace falta contraseña.')}
            />
            <Boton
              icono="email-fast-outline"
              deshabilitado={!correoValido || a.ocupado}
              onPress={async () => {
                if (await a.hacer(() => enviarCodigo(correo))) setEnviado(true);
              }}>
              {a.ocupado ? t('Enviando…') : t('Mandarme el código')}
            </Boton>
          </>
        ) : (
          <>
            <Texto>{t('Te hemos mandado un código a {correo}. Escríbelo aquí; si no lo ves, mira en el correo no deseado.', { correo: correo.trim() })}</Texto>
            <Campo etiqueta={t('Código')} valor={codigo} onChange={(v) => setCodigo(v.replace(/\D/g, ''))} teclado="numeric" placeholder="123456" />
            <Boton
              icono="login"
              deshabilitado={!codigoValido || a.ocupado}
              onPress={() => a.hacer(() => comprobarCodigo(correo, codigo))}>
              {a.ocupado ? t('Comprobando…') : t('Entrar')}
            </Boton>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Boton pequeno variante="suave" deshabilitado={a.ocupado} onPress={() => a.hacer(() => enviarCodigo(correo))}>
                  {t('Mandar otro')}
                </Boton>
              </View>
              <View style={{ flex: 1 }}>
                <Boton
                  pequeno
                  variante="suave"
                  onPress={() => {
                    setEnviado(false);
                    setCodigo('');
                  }}>
                  {t('Cambiar de correo')}
                </Boton>
              </View>
            </View>
          </>
        )}
        {a.error && <Aviso texto={a.error} />}
      </Tarjeta>
      <QueSeComparte />
    </>
  );
}

/** Entrar con Google. Solo sale si Google está activado en Supabase (y no en la web). */
function BotonGoogle() {
  const C = useC();
  const [disponible, setDisponible] = useState(false);
  const a = useAccion();
  useEffect(() => {
    let vivo = true;
    googleDisponible().then((d) => vivo && setDisponible(d));
    return () => {
      vivo = false;
    };
  }, []);
  if (!disponible) return null;
  return (
    <>
      <Boton variante="secundario" icono="google" deshabilitado={a.ocupado} onPress={() => a.hacer(entrarConGoogle)}>
        {a.ocupado ? t('Abriendo Google…') : t('Entrar con Google')}
      </Boton>
      {a.error && <Aviso texto={a.error} />}
      <Texto tam={13} color={C.suave} centro>
        {t('o con tu correo:')}
      </Texto>
    </>
  );
}

// ------------------------------------------------------------------ Con sesión, sin casa

/** Antes de sustituir lo de este móvil por lo de una casa, se avisa si hay algo apuntado. */
function avisarSiHayDatos(alAceptar: () => void) {
  if (!tieneDatos(useAguante.getState() as unknown as Compartido)) return alAceptar();
  confirmar({
    titulo: t('¿Entrar en la casa?'),
    mensaje: t('Si la casa ya tiene datos, sustituyen a la despensa, el hogar, el kit y la energía de este móvil. Si quieres conservar lo tuyo, exporta antes una copia en Ajustes.'),
    accion: t('Entrar'),
    icono: 'home-import-outline',
    tono: 'normal',
    alAceptar,
  });
}

function SinCasa() {
  const C = useC();
  const correo = useSincro((s) => s.correo);
  const [casas, setCasas] = useState<Casa[] | null>(null);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const a = useAccion();

  useEffect(() => {
    let vivo = true;
    misCasas().then((r) => {
      if (!vivo) return;
      setCasas(r.casas);
      setErrorCarga(r.error);
    });
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <>
      <Tarjeta>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icono name="account-circle-outline" color={C.suave} />
          <Texto style={{ flex: 1 }}>{t('Has entrado como {correo}', { correo: correo ?? '' })}</Texto>
        </View>
      </Tarjeta>

      {casas && casas.length > 0 && (
        <>
          <Seccion>{t('Tus casas')}</Seccion>
          <Tarjeta style={{ gap: 8 }}>
            {casas.map((c) => (
              <Boton
                key={c.id}
                variante="secundario"
                icono="home-outline"
                deshabilitado={a.ocupado}
                // Si la primera bajada falla, el error se ve ya dentro de la casa
                onPress={() =>
                  avisarSiHayDatos(() =>
                    a.hacer(async () => {
                      await entrarEnCasa(c);
                      return null;
                    }),
                  )
                }>
                {t('Entrar en «{nombre}»', { nombre: c.nombre })}
              </Boton>
            ))}
          </Tarjeta>
        </>
      )}

      <Seccion>{t('Unirme a una casa')}</Seccion>
      <Tarjeta style={{ gap: 12 }}>
        <Campo
          etiqueta={t('Código de la casa')}
          valor={codigo}
          onChange={(v) => setCodigo(v.toUpperCase())}
          placeholder="K7P-29Q"
          ayuda={t('Te lo da quien creó la casa, desde esta misma pantalla.')}
        />
        <Boton
          icono="home-import-outline"
          deshabilitado={codigo.replace(/[^A-Za-z0-9]/g, '').length !== 6 || a.ocupado}
          onPress={() => avisarSiHayDatos(() => a.hacer(() => unirseACasa(codigo)))}>
          {t('Unirme')}
        </Boton>
      </Tarjeta>

      <Seccion>{t('Crear una casa')}</Seccion>
      <Tarjeta style={{ gap: 12 }}>
        <Campo etiqueta={t('Nombre de la casa')} valor={nombre} onChange={setNombre} placeholder={t('Casa')} />
        <Texto tam={13} color={C.suave}>
          {t('Lo que tienes en este móvil pasa a ser lo de la casa. Luego te sale un código para que entren los demás.')}
        </Texto>
        <Boton icono="home-plus-outline" variante="secundario" deshabilitado={a.ocupado} onPress={() => a.hacer(() => crearCasa(nombre))}>
          {t('Crear casa')}
        </Boton>
      </Tarjeta>

      {(a.error ?? errorCarga) && <Aviso texto={(a.error ?? errorCarga)!} />}
      <EstadoPlan />
      <BotonCerrarSesion />
      <QueSeComparte />
    </>
  );
}

// ------------------------------------------------------------------ En una casa

function hace(ms: number): string {
  const min = Math.floor((Date.now() - ms) / 60_000);
  if (min < 1) return t('ahora mismo');
  if (min < 60) return tn(min, 'hace {n} minuto', 'hace {n} minutos');
  const h = Math.floor(min / 60);
  if (h < 24) return tn(h, 'hace {n} hora', 'hace {n} horas');
  return textoDia(new Date(ms));
}

function ConCasa({ casa }: { casa: Casa }) {
  const C = useC();
  const correo = useSincro((s) => s.correo);
  const estado = useSincro((s) => s.estado);
  const error = useSincro((s) => s.error);
  const ultima = useSincro((s) => s.ultima);
  const pendientes = useSincro((s) => Object.keys(s.pendientes).length);
  const usuario = useSincro((s) => s.usuario);
  const [gente, setGente] = useState<Miembro[]>([]);
  const a = useAccion();

  useEffect(() => {
    let vivo = true;
    miembros(casa).then((m) => vivo && setGente(m));
    return () => {
      vivo = false;
    };
  }, [casa]);

  const pastilla =
    estado === 'sincronizando' || (estado === 'parado' && !ultima)
      ? { texto: t('Sincronizando…'), fondo: C.segmento, color: C.tinta, icono: 'sync' as const }
      : estado === 'error'
        ? { texto: t('Con errores'), fondo: C.rojoTinte, color: C.rojoOscuro, icono: 'alert-outline' as const }
        : estado === 'sin-conexion'
          ? { texto: t('Sin conexión'), fondo: C.ambarTinte, color: C.ambar, icono: 'cloud-off-outline' as const }
          : pendientes > 0
            ? { texto: t('Por subir'), fondo: C.segmento, color: C.tinta, icono: 'cloud-upload-outline' as const }
            : { texto: t('Al día'), fondo: C.verdeTinte, color: C.verdeOscuro, icono: 'check-circle-outline' as const };

  const compartirCodigo = () =>
    Share.share({
      message: t('Únete a nuestra casa en Aguante: en Ajustes › Cuenta y casa, «Unirme a una casa», con el código {codigo}', {
        codigo: casa.codigo,
      }),
    }).catch(() => {});

  return (
    <>
      <Tarjeta style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icono name="home-heart" color={C.tinta} size={24} />
          <Texto tam={20} peso="700" style={{ flex: 1 }}>
            {casa.nombre}
          </Texto>
          <Pastilla {...pastilla} />
        </View>
        <Texto tam={13} color={C.suave}>
          {[
            ultima ? t('Última sincronización: {cuando}', { cuando: hace(ultima) }) : t('Aún no se ha sincronizado.'),
            pendientes > 0 ? tn(pendientes, '{n} cambio por subir', '{n} cambios por subir') : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Texto>
        {error && estado !== 'al-dia' && <Aviso tono={estado === 'sin-conexion' ? 'ambar' : 'rojo'} texto={error} />}
        <Boton pequeno variante="suave" icono="sync" deshabilitado={estado === 'sincronizando'} onPress={() => sincronizar()}>
          {t('Sincronizar ahora')}
        </Boton>
      </Tarjeta>

      <Seccion>{t('Invitar')}</Seccion>
      <Tarjeta style={{ gap: 12, alignItems: 'stretch' }}>
        <Texto tam={13} color={C.suave}>
          {t('Quien quiera entrar en la casa tiene que crearse una cuenta en su móvil y escribir este código:')}
        </Texto>
        <Texto tam={32} peso="800" centro style={{ letterSpacing: 4 }} selectable>
          {casa.codigo}
        </Texto>
        <Boton pequeno icono="share-variant-outline" onPress={compartirCodigo}>
          {t('Compartir el código')}
        </Boton>
      </Tarjeta>

      <Seccion>{t('Quién está')}</Seccion>
      <Tarjeta style={{ gap: 8 }}>
        {gente.length === 0 ? (
          <Texto tam={14} color={C.suave}>
            {t('No se ha podido cargar la lista.')}
          </Texto>
        ) : (
          gente.map((m) => (
            <View key={m.usuario} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 }}>
              <Icono name="account-outline" color={C.suave} size={18} />
              <Texto style={{ flex: 1 }}>{m.correo ?? t('Sin correo')}</Texto>
              {m.usuario === usuario && (
                <Texto tam={13} color={C.suave}>
                  {t('tú')}
                </Texto>
              )}
            </View>
          ))
        )}
        <Texto tam={13} color={C.suave}>
          {t('Has entrado como {correo}', { correo: correo ?? '' })}
        </Texto>
      </Tarjeta>

      <QueSeComparte />

      {a.error && <Aviso texto={a.error} />}
      <EstadoPlan />
      <Boton
        variante="secundario"
        icono="home-export-outline"
        deshabilitado={a.ocupado}
        onPress={() =>
          confirmar({
            titulo: t('¿Salir de la casa?'),
            nombre: casa.nombre,
            mensaje: t('Lo que hay ahora en este móvil se queda como copia tuya y deja de sincronizarse. Si eres la última persona, la casa se borra del servidor.'),
            accion: t('Salir'),
            icono: 'home-export-outline',
            alAceptar: () => a.hacer(salirDeCasa),
          })
        }>
        {t('Salir de la casa')}
      </Boton>
      <BotonCerrarSesion />
    </>
  );
}

function BotonCerrarSesion() {
  const C = useC();
  const a = useAccion();
  return (
    <>
      <Boton variante="suave" icono="logout" deshabilitado={a.ocupado} onPress={() => a.hacer(cerrarSesion)}>
        {t('Cerrar sesión')}
      </Boton>
      <Boton
        variante="secundario"
        icono="account-remove-outline"
        deshabilitado={a.ocupado}
        onPress={() =>
          confirmar({
            titulo: t('¿Borrar tu cuenta?'),
            nombre: useSincro.getState().correo ?? undefined,
            mensaje: t('Se borran tu cuenta y tu correo del servidor y sales de tus casas. Si eras la última persona de una casa, la casa se borra con todo lo suyo. Lo que hay en este móvil se queda. No se puede deshacer.'),
            accion: t('Borrar mi cuenta'),
            icono: 'account-remove-outline',
            alAceptar: () => a.hacer(borrarCuenta),
          })
        }>
        {t('Borrar mi cuenta')}
      </Boton>
      {a.error && <Aviso texto={a.error} />}
      <Texto tam={12} color={C.suave} centro>
        {t('Para borrar la cuenta hace falta conexión.')}
      </Texto>
    </>
  );
}

function QueSeComparte() {
  const C = useC();
  return (
    <Texto tam={12} color={C.suave}>
      {t('Se comparte la despensa, el hogar (personas y mascotas), el kit, la energía, el modo y el reparto manual. El tema, el idioma, los avisos, la emergencia en curso y la nota de trueque son de cada móvil. Sin conexión la app funciona igual: los cambios se suben cuando vuelve la red y, si dos personas tocan lo mismo, se queda el último cambio.')}
    </Texto>
  );
}
