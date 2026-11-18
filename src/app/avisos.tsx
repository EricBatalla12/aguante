// Avisos oficiales: AEMET (tiempo) en tu provincia, terremotos del IGN y
// desastres graves en el mundo (GDACS). Solo fuentes oficiales, citadas como
// piden sus condiciones (ver docs/fuentes-y-reglas.md, «Avisos oficiales»).

import { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Aviso, Boton, Icono, Pantalla, Seccion, Tarjeta, Texto } from '@/components/ui';
import {
  AEMET_WEB,
  COMUNIDADES,
  GDACS_WEB,
  IGN_WEB,
  MAGNITUD_ESPANA,
  MAGNITUD_PROVINCIA,
  PROVINCIAS,
  avisosDeProvincia,
  provinciaPorIne,
  terremotosDestacados,
  type AvisoMet,
  type Desastre,
} from '@/lib/avisos';
import { actualizarAvisos, useAvisos } from '@/lib/avisos-estado';
import { formatoNumero } from '@/lib/calculo';
import { textoMomento } from '@/lib/fechas';
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

export default function Avisos() {
  const C = useC();
  const ine = useAvisos((s) => s.provincia);
  const meteo = useAvisos((s) => s.meteo);
  const terremotos = useAvisos((s) => s.terremotos);
  const desastres = useAvisos((s) => s.desastres);
  const actualizado = useAvisos((s) => s.actualizado);
  const fallo = useAvisos((s) => s.fallo);
  const cargando = useAvisos((s) => s.cargando);
  const [eligiendo, setEligiendo] = useState(false);
  const p = provinciaPorIne(ine);
  // Reloj de minuto en minuto: un aviso pasa de «por llegar» a «en curso» y desaparece al acabar
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    actualizarAvisos().catch(() => {});
    const id = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!p || eligiendo) return <ElegirProvincia alElegir={() => setEligiendo(false)} actual={ine} />;

  const deAqui = avisosDeProvincia(meteo, p, ahora);
  const temblores = terremotosDestacados(terremotos, p);
  const porIslas = COMUNIDADES[p.ccaa]?.porIslas;

  return (
    <Pantalla>
      <Texto color={C.texto2}>
        {t('Avisos de fuentes oficiales para {provincia}. Aguante no sustituye a Protección Civil ni al 112: ante una emergencia, sigue sus indicaciones. Las alertas ES-Alert te llegan solas al móvil.', { provincia: p.nombre })}
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
        <Aviso tono="ambar" texto={t('No se ha podido descargar todo (¿sin conexión?). Se enseña lo último que se descargó.')} />
      )}

      <Seccion>{t('Tiempo (AEMET)')}</Seccion>
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
      <Fuente texto={t('Fuente: AEMET. Información elaborada por la Agencia Estatal de Meteorología.')} url={AEMET_WEB} />

      <Seccion>{t('Terremotos (IGN)')}</Seccion>
      <Tarjeta style={{ gap: 10 }}>
        {temblores.length === 0 ? (
          <Texto color={C.texto2}>
            {t('Ninguno destacado en los últimos 10 días.')}
          </Texto>
        ) : (
          temblores.map((tm) => (
            <Pressable key={tm.id} accessibilityRole="link" onPress={() => Linking.openURL(tm.url).catch(() => {})} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Texto tam={20} peso="800" color={tm.magnitud >= 5 ? C.rojo : C.tinta}>
                {formatoNumero(tm.magnitud, 1)}
              </Texto>
              <View style={{ flex: 1 }}>
                <Texto peso="600">{tm.lugar}</Texto>
                <Texto tam={13} color={C.suave}>
                  {textoMomento(tm.fecha)}
                </Texto>
              </View>
              <Icono name="open-in-new" color={C.suave} size={18} />
            </Pressable>
          ))
        )}
        <Texto tam={12} color={C.suave}>
          {t('Se enseñan los de magnitud {a} o más en tu provincia y de {b} o más en el resto de España.', {
            a: formatoNumero(MAGNITUD_PROVINCIA, 1),
            b: formatoNumero(MAGNITUD_ESPANA, 1),
          })}
        </Texto>
      </Tarjeta>
      <Fuente texto={t('Fuente: Instituto Geográfico Nacional (IGN), CC BY 4.0.')} url={IGN_WEB} />

      <Seccion>{t('En el mundo (GDACS)')}</Seccion>
      <Tarjeta style={{ gap: 10 }}>
        {desastres.length === 0 ? (
          <Texto color={C.texto2}>{t('Ningún desastre de nivel naranja o rojo abierto ahora.')}</Texto>
        ) : (
          desastres.map((d) => <FilaDesastre key={d.id} d={d} />)
        )}
      </Tarjeta>
      <Fuente texto={t('Fuente: GDACS, sistema de alertas de desastres de la ONU y la Comisión Europea (CC BY 4.0).')} url={GDACS_WEB} />

      <Boton variante="secundario" icono="map-marker-outline" onPress={() => setEligiendo(true)}>
        {t('Cambiar de provincia')}
      </Boton>
    </Pantalla>
  );
}

function TarjetaAviso({ a, ahora }: { a: AvisoMet; ahora: number }) {
  const C = useC();
  const { color, fondo } = coloresNivel(a.nivel, C);
  const enCurso = a.inicio <= ahora;
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => Linking.openURL(AEMET_WEB).catch(() => {})}
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

function FilaDesastre({ d }: { d: Desastre }) {
  const C = useC();
  const tipo = TIPOS_GDACS[d.tipo] ? t(TIPOS_GDACS[d.tipo]) : d.tipo;
  return (
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(d.url).catch(() => {})} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: d.nivel === 'Red' ? C.rojo : C.comida }} />
      <View style={{ flex: 1 }}>
        <Texto peso="600">
          {d.enEspana ? t('{tipo} · España', { tipo }) : tipo}
        </Texto>
        <Texto tam={13} color={C.suave} lineas={2}>
          {d.paises}
        </Texto>
      </View>
      <Icono name="open-in-new" color={C.suave} size={18} />
    </Pressable>
  );
}

function Fuente({ texto, url }: { texto: string; url: string }) {
  const C = useC();
  return (
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(url).catch(() => {})}>
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
      <Texto tam={20} peso="800">
        {t('¿Dónde vivís?')}
      </Texto>
      <Texto color={C.texto2}>
        {t('Con tu provincia te enseñamos los avisos de AEMET de tu zona. Se guarda solo en este móvil.')}
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

function Fichas({ opciones, valor, onChange }: { opciones: { valor: string; etiqueta: string }[]; valor: string | null; onChange: (v: string) => void }) {
  const C = useC();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
}
