// Pestaña Actualidad: lo que pasa ahora y lo que ha pasado en el último mes,
// solo de fuentes oficiales: avisos de AEMET (tiempo) en tu provincia y sus
// noticias, terremotos del IGN, desastres graves (GDACS y Copernicus) y
// alertas de alimentos (AESAN) y medicamentos (AEMPS). Se citan como piden
// sus condiciones (ver docs/fuentes-y-reglas.md, «Avisos oficiales»). Nada de
// prensa.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';

import { Aviso, Boton, Icono, Pantalla, Segmentado, Seccion, Tarjeta, Texto, Titulo, type NombreIcono } from '@/components/ui';
import {
  AEMET_WEB,
  AEMPS_WEB,
  AESAN_WEB,
  COPERNICUS_WEB,
  COMUNIDADES,
  DIAS_HISTORIAL,
  GDACS_WEB,
  IGN_WEB,
  MAGNITUD_ESPANA,
  MAGNITUD_PROVINCIA,
  NOTICIAS_AEMET_WEB,
  PROVINCIAS,
  actualidad,
  avisosDeProvincia,
  provinciaPorIne,
  type Activacion,
  type AvisoMet,
  type Desastre,
  type Entrada,
  type FiltroAmbito,
  type FiltroTipo,
  type Noticia,
  type Terremoto,
} from '@/lib/avisos';
import { actualizarAvisos, useAvisos } from '@/lib/avisos-estado';
import { formatoNumero } from '@/lib/calculo';
import { textoDia, textoMomento } from '@/lib/fechas';
import { t, tx } from '@/lib/i18n';
import { coloresNivel, textoFenomeno, textoNivel } from '@/components/avisos';
import { useC } from '@/lib/tema';

const TIPOS_GDACS: Record<string, string> = {
  EQ: tx('Terremoto'),
  TC: tx('Ciclón tropical'),
  FL: tx('Inundación'),
  VO: tx('Volcán'),
  DR: tx('Sequía'),
  WF: tx('Incendio forestal'),
};

const FILTROS: { valor: FiltroAmbito; etiqueta: string }[] = [
  { valor: 'todo', etiqueta: tx('Todo') },
  { valor: 'provincia', etiqueta: tx('Provincia') },
  { valor: 'espana', etiqueta: tx('España') },
  { valor: 'mundo', etiqueta: tx('Mundo') },
];

const TIPOS: { valor: FiltroTipo; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: tx('Todos') },
  { valor: 'tiempo', etiqueta: tx('Tiempo') },
  { valor: 'terremotos', etiqueta: tx('Terremotos') },
  { valor: 'desastres', etiqueta: tx('Desastres') },
  { valor: 'alimentos', etiqueta: tx('Alimentos') },
  { valor: 'medicamentos', etiqueta: tx('Medicamentos') },
  { valor: 'noticias', etiqueta: tx('Noticias') },
];

const abrir = (url: string) => Linking.openURL(url).catch(() => {});

/** Día de calendario en la hora del móvil, para agrupar el listado. */
const claveDia = (ms: number) => {
  const f = new Date(ms);
  return `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`;
};

export default function Actualidad() {
  const C = useC();
  const ine = useAvisos((s) => s.provincia);
  const meteo = useAvisos((s) => s.meteo);
  const terremotos = useAvisos((s) => s.terremotos);
  const desastres = useAvisos((s) => s.desastres);
  const noticias = useAvisos((s) => s.noticias);
  const activaciones = useAvisos((s) => s.activaciones);
  const alimentos = useAvisos((s) => s.alimentos);
  const medicamentos = useAvisos((s) => s.medicamentos);
  const fallidas = useAvisos((s) => s.fallidas);
  const actualizado = useAvisos((s) => s.actualizado);
  const fallo = useAvisos((s) => s.fallo);
  const cargando = useAvisos((s) => s.cargando);
  const [eligiendo, setEligiendo] = useState(false);
  const [filtro, setFiltro] = useState<FiltroAmbito>('todo');
  const [tipo, setTipo] = useState<FiltroTipo>('todos');
  const p = provinciaPorIne(ine);
  // Reloj de minuto en minuto: un aviso pasa de «por llegar» a «en curso» y, al acabar, al historial
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    actualizarAvisos().catch(() => {});
    const id = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const entradas = useMemo(
    () => actualidad({ meteo, terremotos, desastres, noticias, activaciones, alimentos, medicamentos }, p, ahora, filtro, tipo),
    [meteo, terremotos, desastres, noticias, activaciones, alimentos, medicamentos, p, ahora, filtro, tipo],
  );
  // Agrupadas por día: «Hoy», «Ayer» o la fecha
  const dias = useMemo(() => {
    const out: { clave: string; fecha: number; entradas: Entrada[] }[] = [];
    for (const e of entradas) {
      const clave = claveDia(e.fecha);
      if (out.at(-1)?.clave === clave) out.at(-1)!.entradas.push(e);
      else out.push({ clave, fecha: e.fecha, entradas: [e] });
    }
    return out;
  }, [entradas]);

  if (!p || eligiendo) return <ElegirProvincia alElegir={() => setEligiendo(false)} actual={ine} />;

  const deAqui = avisosDeProvincia(meteo, p, ahora);
  const porIslas = COMUNIDADES[p.ccaa]?.porIslas;
  const hoy = claveDia(ahora);
  const ayer = claveDia(ahora - 86_400_000);

  return (
    <Pantalla>
      <Titulo>{t('Actualidad')}</Titulo>
      <Texto color={C.texto2}>
        {t('Avisos, alertas y noticias de fuentes oficiales para {provincia}. Aguante no sustituye a Protección Civil ni al 112: ante una emergencia, sigue sus indicaciones. Las alertas ES-Alert te llegan solas al móvil.', { provincia: p.nombre })}
      </Texto>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Texto tam={13} color={C.suave} style={{ flex: 1 }}>
          {actualizado ? t('Actualizado: {cuando}', { cuando: textoMomento(actualizado) }) : t('Aún no se ha podido descargar nada.')}
        </Texto>
        <Boton pequeno variante="suave" icono="refresh" deshabilitado={cargando} onPress={() => actualizarAvisos(true).catch(() => {})}>
          {cargando ? t('Actualizando…') : t('Actualizar')}
        </Boton>
      </View>
      {fallo && !cargando && (
        <Aviso
          tono="ambar"
          texto={
            fallidas.length > 0
              ? t('No se ha podido descargar {fuentes} (¿sin conexión?). Se enseña lo último que se descargó.', { fuentes: fallidas.join(', ') })
              : t('No se ha podido descargar todo (¿sin conexión?). Se enseña lo último que se descargó.')
          }
        />
      )}

      <Seccion>{t('Ahora en tu zona (AEMET)')}</Seccion>
      {deAqui.length === 0 ? (
        <Tarjeta>
          <Texto color={C.texto2}>
            {!actualizado
              ? t('Todavía no hay datos de AEMET: comprueba la conexión y pulsa «Actualizar».')
              : porIslas
                ? t('Ahora no hay avisos de AEMET en {comunidad}.', { comunidad: COMUNIDADES[p.ccaa].nombre })
                : t('Ahora no hay avisos de AEMET en {provincia}.', { provincia: p.nombre })}
          </Texto>
        </Tarjeta>
      ) : (
        deAqui.map((a) => <TarjetaAviso key={a.id} a={a} ahora={ahora} />)
      )}

      <Seccion>{t('Lo que ha pasado')}</Seccion>
      <Segmentado opciones={FILTROS} valor={filtro} onChange={setFiltro} />
      <Fichas enFila opciones={TIPOS.map((o) => ({ valor: o.valor, etiqueta: t(o.etiqueta) }))} valor={tipo} onChange={(v) => setTipo(v as FiltroTipo)} />
      {dias.length === 0 ? (
        <Tarjeta>
          <Texto color={C.texto2}>
            {actualizado
              ? t('Nada que contar aquí en los últimos {n} días.', { n: DIAS_HISTORIAL })
              : t('Cuando se descargue, aquí verás lo que ha pasado.')}
          </Texto>
        </Tarjeta>
      ) : (
        dias.map((d) => (
          <View key={d.clave} style={{ gap: 8 }}>
            <Texto tam={14} peso="700" color={C.texto2} style={{ paddingHorizontal: 4 }}>
              {d.clave === hoy ? t('Hoy') : d.clave === ayer ? t('Ayer') : textoDia(new Date(d.fecha))}
            </Texto>
            <Tarjeta style={{ gap: 14 }}>
              {d.entradas.map((e) => (
                <FilaEntrada key={e.id} e={e} />
              ))}
            </Tarjeta>
          </View>
        ))
      )}
      <Texto tam={12} color={C.suave} style={{ paddingHorizontal: 4 }}>
        {t('Se guarda lo del último mes en este móvil, desde que tienes la app. Terremotos: de magnitud {a} o más en tu provincia y de {b} o más en el resto de España.', {
          a: formatoNumero(MAGNITUD_PROVINCIA, 1),
          b: formatoNumero(MAGNITUD_ESPANA, 1),
        })}
      </Texto>

      <Seccion>{t('Fuentes')}</Seccion>
      <Fuente texto={t('AEMET. Información elaborada por la Agencia Estatal de Meteorología.')} url={AEMET_WEB} />
      <Fuente texto={t('Instituto Geográfico Nacional (IGN), CC BY 4.0.')} url={IGN_WEB} />
      <Fuente texto={t('GDACS, sistema de alertas de desastres de la ONU y la Comisión Europea (CC BY 4.0).')} url={GDACS_WEB} />
      <Fuente texto={t('Copernicus, servicio de gestión de emergencias de la Unión Europea.')} url={COPERNICUS_WEB} />
      <Fuente texto={t('AESAN, Agencia Española de Seguridad Alimentaria y Nutrición: red de alerta alimentaria.')} url={AESAN_WEB} />
      <Fuente texto={t('AEMPS, Agencia Española de Medicamentos y Productos Sanitarios: alertas de medicamentos.')} url={AEMPS_WEB} />

      <Boton variante="secundario" icono="map-marker-outline" onPress={() => setEligiendo(true)}>
        {t('Cambiar de provincia')}
      </Boton>
    </Pantalla>
  );
}

function FilaEntrada({ e }: { e: Entrada }) {
  if (e.tipo === 'tiempo') return <FilaTiempo a={e.aviso} />;
  if (e.tipo === 'terremoto') return <FilaTerremoto tm={e.terremoto} />;
  if (e.tipo === 'desastre') return <FilaDesastre d={e.desastre} />;
  if (e.tipo === 'copernicus') return <FilaCopernicus a={e.activacion} />;
  if (e.tipo === 'alimento') return <FilaAlerta n={e.alerta} icono="food-off-outline" pie={t('Alerta alimentaria · AESAN')} />;
  if (e.tipo === 'medicamento') return <FilaAlerta n={e.alerta} icono="pill" pie={t('Alerta de medicamento · AEMPS')} />;
  return <FilaNoticia n={e.noticia} />;
}

/** Una fila del listado: lo de la izquierda, el texto y la fuente debajo. */
function Fila({ izquierda, titulo, detalle, pie, url, lineas = 2 }: { izquierda: ReactNode; titulo: string; detalle?: string; pie: string; url: string; lineas?: number }) {
  const C = useC();
  return (
    <Pressable accessibilityRole="link" onPress={() => abrir(url)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <View style={{ width: 40, alignItems: 'center' }}>{izquierda}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto peso="600" lineas={lineas}>
          {titulo}
        </Texto>
        {!!detalle && (
          <Texto tam={13} color={C.texto2} lineas={2}>
            {detalle}
          </Texto>
        )}
        <Texto tam={12} color={C.suave}>
          {pie}
        </Texto>
      </View>
      <Icono name="open-in-new" color={C.suave} size={18} />
    </Pressable>
  );
}

function Punto({ color }: { color: string }) {
  return <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color }} />;
}

function FilaTiempo({ a }: { a: AvisoMet }) {
  const C = useC();
  return (
    <Fila
      izquierda={<Punto color={coloresNivel(a.nivel, C).color} />}
      titulo={t('{nivel} por {fenomeno}: {zona}', { nivel: textoNivel(a.nivel), fenomeno: textoFenomeno(a.fenomeno).toLowerCase(), zona: a.zona })}
      pie={t('De {inicio} a {fin} · AEMET', { inicio: textoMomento(a.inicio), fin: textoMomento(a.fin) })}
      url={AEMET_WEB}
    />
  );
}

function FilaTerremoto({ tm }: { tm: Terremoto }) {
  const C = useC();
  return (
    <Fila
      izquierda={
        <Texto tam={20} peso="800" color={tm.magnitud >= 5 ? C.rojo : C.tinta}>
          {formatoNumero(tm.magnitud, 1)}
        </Texto>
      }
      titulo={t('Terremoto en {lugar}', { lugar: tm.lugar })}
      pie={t('{cuando} · IGN', { cuando: textoMomento(tm.fecha) })}
      url={tm.url}
    />
  );
}

function FilaDesastre({ d }: { d: Desastre }) {
  const C = useC();
  const tipo = TIPOS_GDACS[d.tipo] ? t(TIPOS_GDACS[d.tipo]) : d.tipo;
  return (
    <Fila
      izquierda={<Punto color={d.nivel === 'Red' ? C.rojo : C.comida} />}
      titulo={d.enEspana ? t('{tipo} · España', { tipo }) : tipo}
      detalle={d.paises}
      pie={d.cerrado ? t('Cerrado · GDACS') : t('Abierto · GDACS')}
      url={d.url}
    />
  );
}

function FilaCopernicus({ a }: { a: Activacion }) {
  const C = useC();
  return (
    <Fila
      izquierda={<Icono name="satellite-variant" color={C.tinta} size={24} />}
      titulo={a.nombre}
      detalle={a.paises.join(', ')}
      pie={a.cerrada ? t('Cerrada · Copernicus') : t('Abierta · Copernicus')}
      url={a.url}
    />
  );
}

function FilaAlerta({ n, icono, pie }: { n: Noticia; icono: NombreIcono; pie: string }) {
  const C = useC();
  return <Fila izquierda={<Icono name={icono} color={C.tinta} size={24} />} titulo={n.titulo} pie={pie} url={n.url} lineas={4} />;
}

function FilaNoticia({ n }: { n: Noticia }) {
  const C = useC();
  return (
    <Fila
      izquierda={<Icono name="newspaper-variant-outline" color={C.tinta} size={24} />}
      titulo={n.titulo}
      detalle={n.resumen}
      pie={t('Noticia de AEMET')}
      url={n.url || NOTICIAS_AEMET_WEB}
    />
  );
}

function TarjetaAviso({ a, ahora }: { a: AvisoMet; ahora: number }) {
  const C = useC();
  const { color, fondo } = coloresNivel(a.nivel, C);
  const enCurso = a.inicio <= ahora;
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => abrir(AEMET_WEB)}
      style={{ flexDirection: 'row', backgroundColor: C.tarjeta, borderRadius: 20, overflow: 'hidden' }}>
      <View style={{ width: 8, backgroundColor: color }} />
      <View style={{ flex: 1, padding: 14, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <View style={{ backgroundColor: fondo, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Texto tam={12} peso="700" color={color}>
              {textoNivel(a.nivel)}
            </Texto>
          </View>
          <Texto peso="700">{textoFenomeno(a.fenomeno)}</Texto>
        </View>
        <Texto tam={14}>{a.zona}</Texto>
        <Texto tam={13} color={C.suave}>
          {enCurso
            ? t('En curso, hasta {fin}', { fin: textoMomento(a.fin) })
            : t('De {inicio} a {fin}', { inicio: textoMomento(a.inicio), fin: textoMomento(a.fin) })}
        </Texto>
      </View>
    </Pressable>
  );
}

function Fuente({ texto, url }: { texto: string; url: string }) {
  const C = useC();
  return (
    <Pressable accessibilityRole="link" onPress={() => abrir(url)}>
      <Texto tam={12} color={C.enlace} style={{ paddingHorizontal: 4 }}>
        {texto}
      </Texto>
    </Pressable>
  );
}

/** Primero la comunidad y después la provincia (si tiene más de una). */
function ElegirProvincia({ alElegir, actual }: { alElegir: () => void; actual?: string }) {
  const C = useC();
  const setProvincia = useAvisos((s) => s.setProvincia);
  const [ccaa, setCcaa] = useState<string | null>(provinciaPorIne(actual)?.ccaa ?? null);
  const elegir = (ine: string) => {
    setProvincia(ine);
    alElegir();
  };
  const provincias = ccaa ? PROVINCIAS.filter((p) => p.ccaa === ccaa) : [];
  return (
    <Pantalla>
      <Titulo>{t('Actualidad')}</Titulo>
      <Texto tam={20} peso="800">
        {t('¿Dónde vivís?')}
      </Texto>
      <Texto color={C.texto2}>
        {t('Aquí verás los avisos y noticias de fuentes oficiales: el tiempo en tu zona, terremotos y desastres graves. Con tu provincia te enseñamos los avisos de AEMET de tu zona. Se guarda solo en este móvil.')}
      </Texto>
      <Seccion>{t('Comunidad')}</Seccion>
      <Fichas
        opciones={Object.entries(COMUNIDADES).map(([codigo, c]) => ({ valor: codigo, etiqueta: c.nombre }))}
        valor={ccaa}
        onChange={(codigo) => {
          const suyas = PROVINCIAS.filter((p) => p.ccaa === codigo);
          if (suyas.length === 1) elegir(suyas[0].ine);
          else setCcaa(codigo);
        }}
      />
      {provincias.length > 1 && (
        <>
          <Seccion>{t('Provincia')}</Seccion>
          <Fichas opciones={provincias.map((p) => ({ valor: p.ine, etiqueta: p.nombre }))} valor={actual ?? null} onChange={elegir} />
        </>
      )}
      {actual && (
        <Boton variante="secundario" onPress={alElegir}>
          {t('Cancelar')}
        </Boton>
      )}
    </Pantalla>
  );
}

/** Fichas para elegir una opción. `enFila`: una sola fila que se desliza de lado (el filtro por tipo). */
function Fichas({
  opciones,
  valor,
  onChange,
  enFila,
}: {
  opciones: { valor: string; etiqueta: string }[];
  valor: string | null;
  onChange: (v: string) => void;
  enFila?: boolean;
}) {
  const C = useC();
  const fichas = (
    <View style={{ flexDirection: 'row', flexWrap: enFila ? 'nowrap' : 'wrap', gap: 8 }}>
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            accessibilityRole="radio"
            accessibilityState={{ checked: activa }}
            onPress={() => onChange(o.valor)}
            style={({ pressed }) => ({
              minHeight: 44,
              justifyContent: 'center',
              paddingHorizontal: 14,
              borderRadius: 14,
              backgroundColor: activa ? C.primario : C.segmento,
              opacity: pressed ? 0.8 : 1,
            })}>
            <Texto tam={14} peso="600" color={activa ? C.sobrePrimario : C.texto2}>
              {o.etiqueta}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
  return enFila ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup">
      {fichas}
    </ScrollView>
  ) : (
    fichas
  );
}
