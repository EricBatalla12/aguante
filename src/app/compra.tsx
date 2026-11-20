// Plan de compra: lo que falta para el objetivo, por categorías, repartido en
// meses con lo que se puede gastar (o con lo que hay que apartar para llegar
// en una fecha). Lo comprado pasa a la despensa o al kit. El cálculo está en
// src/lib/compra.ts; los precios los pone cada uno y se guardan en el móvil.

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Share, View } from 'react-native';

import {
  Aviso,
  Barra,
  Boton,
  Campo,
  CampoFecha,
  Contador,
  Icono,
  Interruptor,
  Pantalla,
  Seccion,
  Segmentado,
  Tarjeta,
  Texto,
} from '@/components/ui';
import { formatoNumero, type Producto } from '@/lib/calculo';
import {
  CATEGORIAS_COMPRA,
  KCAL_BOTE,
  KCAL_PAQUETE,
  LITROS_COCER_PAQUETE,
  LITROS_GARRAFA,
  MESES_REPONER,
  gastadoEnMes,
  mesDe,
  mesReal,
  presupuestoParaMeses,
  preciosConTienda,
  proponer,
  repartir,
  type Articulo,
  type CategoriaCompra,
  type Elegido,
  type Linea,
  type Plan,
} from '@/lib/compra';
import { componerFecha, FECHA_VACIA, partesDeFecha, textoFecha, textoMes, type PartesFecha } from '@/lib/fechas';
import { aCampo, numero } from '@/lib/formato';
import { t, tn, tx } from '@/lib/i18n';
import { pedirPermiso } from '@/lib/notificaciones';
import { hoyISO, nuevoId, useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { describir, useDatosCompra } from '@/lib/use-compra';
import { etiquetaTienda, juntarCatalogos, type ProductoTienda } from '@/lib/catalogo';
import { catalogoDe, tiendasCerca, useCatalogos } from '@/lib/tiendas';
import { CADENAS } from '@/constants/tiendas';

const OBJETIVOS = [
  { valor: 3, etiqueta: tx('72 horas') },
  { valor: 7, etiqueta: tx('1 semana') },
  { valor: 14, etiqueta: tx('2 semanas') },
];

const SENTIDOS = [
  { valor: 'presupuesto' as const, etiqueta: tx('Gasto al mes') },
  { valor: 'fecha' as const, etiqueta: tx('Para una fecha') },
];

const TITULO_CATEGORIA: Record<CategoriaCompra, string> = {
  reponer: tx('Reponer lo que caduca'),
  agua: tx('Agua'),
  lista: tx('Comida lista para comer'),
  cocinar: tx('Comida para cocinar'),
  mascotas: tx('Mascotas'),
  kit: tx('Kit de emergencia'),
};

const euros = (n: number) => t('{e} €', { e: formatoNumero(n, 2) });

export default function PlanDeCompra() {
  const C = useC();
  const personas = useAguante((s) => s.personas);
  const productos = useAguante((s) => s.productos);
  const objetivo = useAguante((s) => s.objetivoDias);
  const setObjetivo = useAguante((s) => s.setObjetivo);
  const compra = useAguante((s) => s.compra);
  const setCompra = useAguante((s) => s.setCompra);
  const setPrecio = useAguante((s) => s.setPrecio);
  const quitarCompra = useAguante((s) => s.quitarCompra);
  const avisos = useAguante((s) => s.avisos);
  const setAvisos = useAguante((s) => s.setAvisos);
  const setNotificar = useAguante((s) => s.setNotificar);
  const [textoPresupuesto, setTextoPresupuesto] = useState(aCampo(compra.presupuesto));
  const [fecha, setFecha] = useState<PartesFecha>(partesDeFecha(compra.fecha));
  const [textosPrecio, setTextosPrecio] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(compra.precios ?? {}).map(([k, v]) => [k, aCampo(v)])),
  );
  const [verKit, setVerKit] = useState(false);
  const [comprando, setComprando] = useState<string | null>(null);
  const [sinPermiso, setSinPermiso] = useState(false);

  const sentido = compra.sentido ?? 'presupuesto';
  // Los de la tienda (si los hay) y, encima, los que pone cada uno
  const precios = useMemo(() => preciosConTienda(compra.precios ?? {}, compra.elegidos ?? []), [compra.precios, compra.elegidos]);
  const hechas = useMemo(() => compra.hechas ?? [], [compra.hechas]);

  const { lista, dias, falta, diasHoy, hoy } = useDatosCompra();
  const gastadoEsteMes = gastadoEnMes(hechas, 0, hoy);
  const fechaOk = compra.fecha && compra.fecha >= hoyISO() ? compra.fecha : undefined;
  const mesesFecha = fechaOk ? mesDe(fechaOk, hoy) + 1 : null;
  const { articulos, plan, presupuesto } = useMemo(() => {
    let articulos: Articulo[];
    let plan: Plan | null = null;
    let presupuesto = compra.presupuesto ?? null;
    if (sentido === 'fecha') {
      articulos = lista(Math.max(MESES_REPONER, mesesFecha ?? 0));
      if (mesesFecha) {
        const res = presupuestoParaMeses({ articulos, precios, gastadoEsteMes, dias }, mesesFecha);
        plan = res?.plan ?? null;
        presupuesto = res?.presupuesto ?? null;
      }
    } else {
      // Las reposiciones dependen de cuánto dure el plan, y el plan, de las
      // reposiciones: se ajusta un par de veces hasta que cuadra
      let meses = MESES_REPONER;
      articulos = lista(meses);
      for (let i = 0; i < 4 && compra.presupuesto; i++) {
        plan = repartir({ articulos, precios, presupuesto: compra.presupuesto, gastadoEsteMes, dias });
        const fin = (plan.mesFin ?? 0) + 1;
        if (fin <= meses || plan.demasiado) break;
        meses = fin;
        articulos = lista(meses);
      }
    }
    return { articulos, plan, presupuesto };
  }, [lista, dias, sentido, compra.presupuesto, precios, gastadoEsteMes, mesesFecha]);

  const porClave = new Map(articulos.map((a) => [a.clave, a]));
  const nombreMes = (indice: number) => {
    const m = mesReal(indice, hoy);
    return textoMes(m.anio, m.mes, hoy.getFullYear());
  };
  const describirClave = (clave: string, unidades?: number) => {
    const a = porClave.get(clave);
    return a ? describir(a, unidades, falta.faltanKcalMascotas) : clave;
  };

  // Lo de este mes: lo que dice el plan o, sin plan, toda la lista
  const lineasMes: Linea[] = plan
    ? (plan.meses.find((m) => m.indice === 0)?.lineas ?? [])
    : articulos.map((a) => ({ clave: a.clave, unidades: a.unidades, coste: (precios[a.clave] ?? 0) * a.unidades }));
  const hechasMes = hechas.filter((h) => mesDe(h.fecha, hoy) === 0);
  const totalGastado = hechas.reduce((s, h) => s + h.coste, 0);
  const proximos = plan ? plan.meses.filter((m) => m.indice > 0) : [];

  const cambiarPrecio = (clave: string) => (texto: string) => {
    setTextosPrecio((p) => ({ ...p, [clave]: texto }));
    const n = numero(texto);
    setPrecio(clave, Number.isFinite(n) && n > 0 ? n : undefined);
  };

  const cambiarPresupuesto = (texto: string) => {
    setTextoPresupuesto(texto);
    const n = numero(texto);
    setCompra({ presupuesto: Number.isFinite(n) && n > 0 ? n : undefined });
  };

  const fechaCompuesta = componerFecha(fecha);
  const cambiarFecha = (p: PartesFecha) => {
    setFecha(p);
    const f = componerFecha(p);
    setCompra({ fecha: f.estado === 'ok' ? f.iso : undefined });
  };

  const alRecordatorio = async (v: boolean) => {
    setSinPermiso(false);
    if (!v) return setCompra({ diaRecordatorio: undefined });
    if (!avisos) {
      const permitido = await pedirPermiso();
      if (!permitido) return setSinPermiso(true);
      // Si estaban apagadas, se enciende solo este aviso: las caducidades,
      // si las quiere, se encienden en Ajustes
      setNotificar({ despensa: false, kit: false });
      setAvisos(true);
    }
    setCompra({ diaRecordatorio: Math.min(28, hoy.getDate()) });
  };

  const compartir = () => {
    const lineas = lineasMes.map((l) => `• ${describirClave(l.clave, l.unidades)}${l.coste > 0 ? ` (${euros(l.coste)})` : ''}`);
    const total = lineasMes.reduce((s, l) => s + l.coste, 0);
    const texto = [
      t('Compra de {mes} para la reserva de emergencia:', { mes: nombreMes(0).toLowerCase() }),
      ...lineas,
      ...(total > 0 ? [t('Total: {e}', { e: euros(total) })] : []),
      t('Hecho con Aguante.'),
    ].join('\n');
    Share.share({ message: texto }).catch(() => {});
  };

  if (personas.length === 0) {
    return (
      <Pantalla>
        <Tarjeta>
          <Texto color={C.suave}>{t('Añade quién vive en casa (pestaña Hogar) para calcular lo que te falta.')}</Texto>
        </Tarjeta>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Tarjeta style={{ gap: 12 }}>
        <Texto tam={18} peso="800">
          {t('Tu objetivo')}
        </Texto>
        <Segmentado opciones={OBJETIVOS} valor={objetivo} onChange={setObjetivo} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Texto tam={14} peso="700" color={falta.cumplido ? C.verde : C.tinta}>
            {falta.cumplido ? t('Objetivo cumplido') : t('Aún te falta')}
          </Texto>
          <Texto tam={14} color={C.suave}>
            {t('{a} de {b} días', { a: formatoNumero(diasHoy, 1), b: objetivo })}
          </Texto>
        </View>
        <Barra fraccion={diasHoy / objetivo} color={falta.cumplido ? C.verde : C.comida} />
      </Tarjeta>

      <Tarjeta style={{ gap: 12 }}>
        <Texto tam={18} peso="800">
          {t('Cómo lo quieres pagar')}
        </Texto>
        <Segmentado opciones={SENTIDOS} valor={sentido} onChange={(v) => setCompra({ sentido: v })} />
        {sentido === 'presupuesto' ? (
          <Campo etiqueta={t('Lo que puedes gastar al mes')} valor={textoPresupuesto} onChange={cambiarPresupuesto} teclado="decimal-pad" sufijo="€" />
        ) : (
          <CampoFecha
            etiqueta={t('Para cuándo quieres tenerlo')}
            valor={fecha}
            onChange={cambiarFecha}
            ayuda={t('Sin día, cuenta hasta final de mes.')}
            error={
              fechaCompuesta.estado === 'error'
                ? fechaCompuesta.mensaje
                : fechaCompuesta.estado === 'ok' && !fechaOk
                  ? t('Tiene que ser de hoy en adelante.')
                  : undefined
            }
          />
        )}
        <Resumen
          articulos={articulos}
          plan={plan}
          sentido={sentido}
          presupuesto={presupuesto}
          objetivo={objetivo}
          mesesFecha={mesesFecha}
          nombreMes={nombreMes}
          describir={describirClave}
        />
      </Tarjeta>

      <TusTiendas precios={precios} />

      {articulos.length > 0 && (
        <Tarjeta style={{ gap: 12 }}>
          <Texto tam={18} peso="800">
            {t('Lista de la compra')}
          </Texto>
          <Texto tam={13} color={C.suave}>
            {t('Pon lo que te cuesta cada cosa en tu tienda: se recuerda el último precio. Primero va lo que menos días os da, luego lo que no hay que cocinar y al final el kit.')}
          </Texto>
          {CATEGORIAS_COMPRA.map((cat) => {
            const deCat = articulos.filter((a) => a.categoria === cat);
            if (deCat.length === 0) return null;
            const plegado = cat === 'kit' && !verKit;
            return (
              <View key={cat} style={{ gap: 10 }}>
                {cat === 'kit' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: verKit }}
                    onPress={() => setVerKit((v) => !v)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
                    <Texto tam={13} peso="700" color={C.suave} style={{ flex: 1 }}>
                      {t('{titulo} ({n})', { titulo: t(TITULO_CATEGORIA[cat]).toUpperCase(), n: deCat.length })}
                    </Texto>
                    <Icono name={verKit ? 'chevron-up' : 'chevron-down'} color={C.suave} />
                  </Pressable>
                ) : (
                  <Seccion>{t(TITULO_CATEGORIA[cat])}</Seccion>
                )}
                {!plegado &&
                  deCat.map((a) => (
                    <View key={a.clave} style={{ gap: 6 }}>
                      <Campo
                        etiqueta={describir(a, a.unidades, falta.faltanKcalMascotas)}
                        valor={textosPrecio[a.clave] ?? aCampo(precios[a.clave])}
                        onChange={cambiarPrecio(a.clave)}
                        teclado="decimal-pad"
                        sufijo="€"
                        ayuda={ayudaDe(a, nombreMes)}
                      />
                      {a.clave.startsWith('prod:') && <ControlesProducto codigo={a.id ?? ''} unidades={a.unidades} />}
                    </View>
                  ))}
                {(cat === 'agua' || cat === 'lista' || cat === 'cocinar') && <AnadirDeTiendas tipo={cat} enLista={deCat.map((a) => a.id ?? '')} />}
              </View>
            );
          })}
        </Tarjeta>
      )}

      {(lineasMes.length > 0 || hechasMes.length > 0) && (
        <Tarjeta style={{ gap: 8 }}>
          <Texto tam={18} peso="800">
            {t('Este mes: {mes}', { mes: nombreMes(0) })}
          </Texto>
          {presupuesto !== null && presupuesto > 0 && (
            <>
              <Barra fraccion={gastadoEsteMes / presupuesto} color={gastadoEsteMes > presupuesto ? C.rojo : C.verde} alto={6} />
              <Texto tam={13} color={C.suave}>
                {t('Gastado {g} de {p}', { g: euros(gastadoEsteMes), p: euros(presupuesto) })}
              </Texto>
            </>
          )}
          {lineasMes.map((l, i) => {
            const a = porClave.get(l.clave);
            if (!a) return null;
            return (
              <View key={l.clave} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.linea, paddingVertical: 6, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
                  <View style={{ flex: 1 }}>
                    <Texto peso="600">{describir(a, l.unidades, falta.faltanKcalMascotas)}</Texto>
                    {l.coste > 0 && (
                      <Texto tam={12} color={C.suave}>
                        {euros(l.coste)}
                      </Texto>
                    )}
                  </View>
                  {comprando !== l.clave && (
                    <Boton pequeno variante="secundario" icono="cart-check" onPress={() => setComprando(l.clave)}>
                      {t('Comprado')}
                    </Boton>
                  )}
                </View>
                {comprando === l.clave && (
                  <Comprar
                    articulo={a}
                    unidades={l.unidades}
                    precio={precios[l.clave]}
                    productos={productos}
                    nombre={describir(a, l.unidades, falta.faltanKcalMascotas)}
                    alAcabar={() => setComprando(null)}
                  />
                )}
              </View>
            );
          })}
          {hechasMes.length > 0 && (
            <View style={{ paddingTop: 6, gap: 2 }}>
              <Seccion>{t('Comprado este mes')}</Seccion>
              {hechasMes.map((h) => (
                <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
                  <Icono name="check" color={C.verde} size={18} />
                  <Texto style={{ flex: 1 }} lineas={2}>
                    {h.nombre}
                  </Texto>
                  <Texto color={C.suave}>{euros(h.coste)}</Texto>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('Quitar {que} del gasto', { que: h.nombre })}
                    hitSlop={10}
                    onPress={() => quitarCompra(h.id)}>
                    <Icono name="close" color={C.suave} size={18} />
                  </Pressable>
                </View>
              ))}
              <Texto tam={12} color={C.suave}>
                {t('Quitarlo de aquí solo borra el gasto: lo que pasó a la despensa se queda.')}
              </Texto>
            </View>
          )}
          {totalGastado > 0 && hechas.length > 0 && (
            <Texto tam={13} color={C.texto2} style={{ paddingTop: 4 }}>
              {t('En total llevas {e} en la reserva desde {fecha}.', {
                e: euros(totalGastado),
                fecha: textoFecha(hechas[0].fecha),
              })}
            </Texto>
          )}
        </Tarjeta>
      )}

      {proximos.length > 0 && (
        <Tarjeta style={{ gap: 4 }}>
          <Texto tam={18} peso="800" style={{ paddingBottom: 4 }}>
            {t('Próximos meses')}
          </Texto>
          {proximos.slice(0, 12).map((m, i) => (
            <View
              key={m.indice}
              style={{ flexDirection: 'row', gap: 10, minHeight: 44, paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.linea }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Texto peso="700">{nombreMes(m.indice)}</Texto>
                <Texto tam={13} color={C.texto2}>
                  {m.lineas.map((l) => describirClave(l.clave, l.unidades)).join(' · ')}
                </Texto>
              </View>
              <Texto color={C.suave}>{euros(m.coste)}</Texto>
            </View>
          ))}
          {proximos.length > 12 && (
            <Texto tam={13} color={C.suave}>
              {tn(proximos.length - 12, 'Y {n} mes más.', 'Y {n} meses más.')}
            </Texto>
          )}
        </Tarjeta>
      )}

      <Tarjeta style={{ gap: 12 }}>
        <Interruptor
          etiqueta={t('Recordármelo cada mes')}
          valor={!!compra.diaRecordatorio}
          onChange={alRecordatorio}
          ayuda={t('Una notificación el día de compra, a las 10 de la mañana.')}
        />
        {!!compra.diaRecordatorio && (
          <View style={{ gap: 6 }}>
            <Texto tam={14} peso="600" color={C.texto2}>
              {t('Día del mes')}
            </Texto>
            <Contador
              valor={compra.diaRecordatorio}
              min={1}
              onChange={(v) => setCompra({ diaRecordatorio: Math.min(28, Math.max(1, v)) })}
              texto={t('Día {n}', { n: compra.diaRecordatorio })}
              estirar
            />
          </View>
        )}
        {(sinPermiso || (Platform.OS === 'web' && !!compra.diaRecordatorio)) && (
          <Aviso
            tono="ambar"
            texto={
              Platform.OS === 'web'
                ? t('Los avisos solo funcionan en el móvil.')
                : t('El móvil no ha dado permiso para las notificaciones. Actívalo en los ajustes del sistema y vuelve a probar.')
            }
          />
        )}
        {lineasMes.length > 0 && (
          <Boton variante="secundario" icono="share-variant" onPress={compartir}>
            {t('Compartir la lista de este mes')}
          </Boton>
        )}
        <Texto tam={12} color={C.suave}>
          {t('Si compartís casa, lo que compre cualquiera entra en la despensa o el kit de todos y sale de esta lista. El presupuesto, los precios y el gasto son de cada móvil.')}
        </Texto>
      </Tarjeta>
    </Pantalla>
  );
}

function ayudaDe(a: Articulo, nombreMes: (i: number) => string): string | undefined {
  if (a.clave.startsWith('prod:')) {
    if (a.categoria === 'agua') {
      const l = a.aporte?.litros ?? 0;
      return t('Precio de uno. Cada uno trae {l} L.', { l: formatoNumero(l, l % 1 ? 1 : 0) });
    }
    if (a.categoria === 'cocinar') {
      return t('Precio de uno. Unas {kcal} kcal; cocerlo gasta unos {l} L de agua, ya sumados al agua.', {
        kcal: formatoNumero(a.aporte?.kcal ?? 0),
        l: formatoNumero(a.aporte?.litrosCocer ?? 0, 1),
      });
    }
    return t('Precio de uno. Unas {kcal} kcal cada uno.', { kcal: formatoNumero(a.aporte?.kcal ?? 0) });
  }
  switch (a.categoria) {
    case 'agua':
      return t('Precio de una garrafa.');
    case 'lista':
      return t('Precio de un bote. Es la medida (unas {kcal} kcal): vale cualquier conserva lista para comer que dé lo mismo.', {
        kcal: formatoNumero(KCAL_BOTE),
      });
    case 'cocinar':
      return t('Precio de un paquete. Unas {kcal} kcal; cocerlo gasta unos {l} L de agua, ya sumados al agua. Vale pasta o legumbre seca.', {
        kcal: formatoNumero(KCAL_PAQUETE),
        l: formatoNumero(LITROS_COCER_PAQUETE, 1),
      });
    case 'mascotas':
      return t('Lo que te cueste cubrirlo: las kcal vienen en el saco o la lata.');
    case 'reponer':
      return t('Precio de una unidad. Caduca en {mes}: cómpralo ese mes y gasta el viejo en el día a día.', {
        mes: nombreMes(a.mes ?? 0).toLowerCase(),
      });
    case 'kit':
      return undefined;
  }
}

/** La frase que contesta a la pregunta: cuándo se llega, o cuánto al mes. */
function Resumen({
  articulos,
  plan,
  sentido,
  presupuesto,
  objetivo,
  mesesFecha,
  nombreMes,
  describir,
}: {
  articulos: Articulo[];
  plan: Plan | null;
  sentido: 'presupuesto' | 'fecha';
  presupuesto: number | null;
  objetivo: number;
  mesesFecha: number | null;
  nombreMes: (i: number) => string;
  describir: (clave: string) => string;
}) {
  if (articulos.length === 0) {
    return <Aviso tono="verde" texto={t('No te falta nada para {n} días. Si algo caduca, saldrá aquí para reponerlo.', { n: objetivo })} />;
  }
  if (sentido === 'presupuesto' && !presupuesto) return null;
  if (sentido === 'fecha' && !mesesFecha) return null;
  const avisos: string[] = [];
  if (plan?.sinPrecio.length) {
    avisos.push(tn(plan.sinPrecio.length, 'Falta el precio de {n} cosa: hasta que lo pongas no entra en el plan.', 'Falta el precio de {n} cosas: hasta que lo pongas no entran en el plan.'));
  }
  if (plan?.noCaben.length) {
    avisos.push(t('Cuesta más que lo que gastas en un mes: {cosas}.', { cosas: plan.noCaben.map((c) => describir(c)).join(', ') }));
  }
  if (plan?.demasiado) avisos.push(t('Con ese presupuesto harían falta más de diez años. Súbelo un poco.'));
  if (!plan || (plan.meses.length === 0 && avisos.length === 0)) {
    return <Aviso tono="ambar" texto={t('Pon los precios en la lista de abajo para repartirlo en meses.')} />;
  }

  const frases: string[] = [];
  const meses = (i: number) => tn(i + 1, '{n} mes', '{n} meses');
  // Si algo de lo que da días no tiene precio, no se sabe cuándo se llega
  const categoria = new Map(articulos.map((a) => [a.clave, a.categoria]));
  const faltaPrecioDias = plan.sinPrecio.some((c) => ['agua', 'lista', 'cocinar', 'mascotas'].includes(categoria.get(c) ?? ''));
  if (sentido === 'fecha' && presupuesto) {
    frases.push(
      t('Para tenerlo en {mes}, aparta unos {e} al mes.', {
        mes: nombreMes((mesesFecha ?? 1) - 1).toLowerCase(),
        e: euros(presupuesto),
      }),
    );
    if (plan.sinPrecio.length > 0) frases.push(t('Sin contar lo que aún no tiene precio.'));
  } else if (faltaPrecioDias) {
    avisos.unshift(t('Pon el precio del agua, la comida y lo de las mascotas para saber cuándo llegas a {n} días.', { n: objetivo }));
  } else if (plan.mesDias !== null) {
    frases.push(
      t('Con {e} al mes llegas a {n} días en {mes} ({meses}).', {
        e: euros(presupuesto ?? 0),
        n: objetivo,
        mes: nombreMes(plan.mesDias).toLowerCase(),
        meses: meses(plan.mesDias),
      }),
    );
  }
  if (sentido === 'presupuesto' && plan.mesFin !== null && plan.mesFin !== plan.mesDias) {
    frases.push(t('El kit y las reposiciones, hasta {mes}.', { mes: nombreMes(plan.mesFin).toLowerCase() }));
  }
  return (
    <View style={{ gap: 8 }}>
      {frases.length > 0 && <Aviso tono="verde" texto={frases.join(' ')} />}
      {avisos.map((a) => (
        <Aviso key={a} tono="ambar" texto={a} />
      ))}
    </View>
  );
}

/** Formulario de «Comprado»: cuántas, a qué precio y su caducidad; lo pasa a la despensa o al kit. */
function Comprar({
  articulo,
  unidades: unidadesPlan,
  precio,
  productos,
  nombre,
  alAcabar,
}: {
  articulo: Articulo;
  unidades: number;
  precio?: number;
  productos: Producto[];
  nombre: string;
  alAcabar: () => void;
}) {
  const C = useC();
  const guardarProducto = useAguante((s) => s.guardarProducto);
  const alternarKit = useAguante((s) => s.alternarKit);
  const kit = useAguante((s) => s.kit);
  const apuntarCompra = useAguante((s) => s.apuntarCompra);
  const elegido = useAguante((s) => s.compra.elegidos?.find((e) => `prod:${e.codigo}` === articulo.clave));
  const unaSola = articulo.categoria === 'kit' || articulo.categoria === 'mascotas';
  const [unidades, setUnidades] = useState(unaSola ? 1 : unidadesPlan);
  const [textoPrecio, setTextoPrecio] = useState(aCampo(precio));
  const [caducidad, setCaducidad] = useState(FECHA_VACIA);
  const cad = componerFecha(caducidad);
  const conFecha = ['agua', 'lista', 'cocinar', 'reponer'].includes(articulo.categoria);
  const precioUnidad = numero(textoPrecio);
  const coste = Number.isFinite(precioUnidad) && precioUnidad > 0 ? Math.round(precioUnidad * unidades * 100) / 100 : 0;
  const fechaMal = cad.estado === 'error' || cad.estado === 'incompleta';

  const apuntar = (texto: string) =>
    apuntarCompra({ clave: articulo.clave, nombre: texto, unidades, coste, fecha: hoyISO() });

  const guardar = () => {
    const caducidadISO = cad.estado === 'ok' ? cad.iso : undefined;
    const sinDia = cad.estado === 'ok' ? cad.sinDia || undefined : undefined;
    const base = { id: nuevoId(), cantidad: unidades, caducidad: caducidadISO, caducidadSinDia: sinDia };
    let producto: Producto | null = null;
    if (elegido) {
      producto = { ...base, ...productoDe(elegido) };
    } else if (articulo.categoria === 'agua') {
      producto = { ...base, nombre: t('Agua (garrafa de 5 L)'), categoria: 'agua', litrosPorUnidad: LITROS_GARRAFA };
    } else if (articulo.categoria === 'lista') {
      producto = { ...base, nombre: t('Garbanzos cocidos (bote de 400 g)'), categoria: 'comida', gramos: 400, kcal100g: 139, kcalPorUnidad: KCAL_BOTE, conservacion: 'ambiente' };
    } else if (articulo.categoria === 'cocinar') {
      producto = {
        ...base,
        nombre: t('Arroz blanco (paquete de 1 kg)'),
        categoria: 'comida',
        gramos: 1000,
        kcal100g: 365,
        kcalPorUnidad: KCAL_PAQUETE,
        necesitaCocinar: true,
        aguaCocinarPorUnidadL: LITROS_COCER_PAQUETE,
        conservacion: 'ambiente',
      };
    } else if (articulo.categoria === 'reponer') {
      const viejo = productos.find((p) => p.id === articulo.id);
      if (viejo) producto = { ...viejo, ...base };
    }
    if (producto) guardarProducto(producto);
    if (articulo.categoria === 'kit' && articulo.id && !kit[articulo.id]) alternarKit(articulo.id);
    apuntar(producto?.nombre ?? nombre);
    alAcabar();
  };

  // Otra comida, otro pienso: se escanea y, al guardarlo, la pantalla de
  // añadir lo apunta como comprado en esta línea del plan
  const escanear = () => {
    alAcabar();
    router.push({ pathname: '/anadir', params: { plan: articulo.clave } });
  };

  return (
    <View style={{ gap: 10, backgroundColor: C.segmento, borderRadius: 16, padding: 12 }}>
      {!unaSola && (
        <View style={{ gap: 6 }}>
          <Texto tam={14} peso="600" color={C.texto2}>
            {t('Cuántas has comprado')}
          </Texto>
          <Contador valor={unidades} min={1} onChange={setUnidades} estirar />
        </View>
      )}
      <Campo
        etiqueta={unaSola ? t('Lo que te ha costado') : t('Precio de cada una')}
        valor={textoPrecio}
        onChange={setTextoPrecio}
        teclado="decimal-pad"
        sufijo="€"
      />
      {conFecha && (
        <CampoFecha
          etiqueta={t('Caducidad')}
          valor={caducidad}
          onChange={setCaducidad}
          ayuda={t('Viene en la etiqueta. Sin ella no te podemos avisar antes de que caduque.')}
          error={cad.estado === 'error' ? cad.mensaje : undefined}
        />
      )}
      {articulo.categoria === 'mascotas' ? (
        <Boton icono="barcode-scan" onPress={escanear}>
          {t('Apuntarlo y añadirlo a la despensa')}
        </Boton>
      ) : (
        <Boton icono="check" deshabilitado={fechaMal} onPress={guardar}>
          {articulo.categoria === 'kit' ? t('Marcarlo en el kit') : t('Guardarlo en la despensa')}
        </Boton>
      )}
      {(articulo.categoria === 'lista' || articulo.categoria === 'cocinar') && (
        <Boton variante="suave" icono="barcode-scan" onPress={escanear}>
          {t('He comprado otra cosa: escanearla')}
        </Boton>
      )}
      <Boton variante="suave" onPress={alAcabar}>
        {t('Cancelar')}
      </Boton>
    </View>
  );
}

/** Lo que pasa a la despensa al comprar un producto elegido de las tiendas. */
function productoDe(e: Elegido): Omit<Producto, 'id' | 'cantidad'> {
  const nombre = [e.nombre, e.marca].filter(Boolean).join(' · ');
  if (e.tipo === 'agua') return { nombre, categoria: 'agua', litrosPorUnidad: e.litros, codigo: e.codigo };
  const kcalPorUnidad = Math.round(((e.gramos ?? 0) * (e.kcal100g ?? 0)) / 100);
  const comun = { nombre, categoria: 'comida' as const, gramos: e.gramos, kcal100g: e.kcal100g, kcalPorUnidad, codigo: e.codigo, conservacion: 'ambiente' as const };
  if (e.tipo === 'lista') return comun;
  return { ...comun, necesitaCocinar: true, aguaCocinarPorUnidadL: Math.round(((e.gramos ?? 0) / 1000) * LITROS_COCER_PAQUETE * 100) / 100 };
}

/** «400 g», «8 L»: la cantidad de un producto de las tiendas. */
function textoEnvase(p: { gramos?: number; litros?: number }): string {
  if (p.litros) return t('{n} L', { n: formatoNumero(p.litros, p.litros % 1 ? 1 : 0) });
  if (p.gramos) return p.gramos >= 1000 ? t('{n} kg', { n: formatoNumero(p.gramos / 1000, p.gramos % 1000 ? 1 : 0) }) : t('{n} g', { n: formatoNumero(p.gramos) });
  return '';
}

// Vacíos fijos: un `?? []` dentro del selector daría una lista nueva en cada
// lectura y React volvería a pintar sin parar
const SIN_TIENDAS: { clave: string; nombre: string }[] = [];
const SIN_ELEGIDOS: Elegido[] = [];

const nombreTienda = (etiqueta?: string) => CADENAS.find((c) => c.clave === etiqueta)?.nombre ?? etiqueta ?? '';

/** Dónde compras, y la propuesta con productos de esas tiendas. */
function TusTiendas({ precios }: { precios: Record<string, number> }) {
  const C = useC();
  const tiendas = useAguante((s) => s.compra.tiendas ?? SIN_TIENDAS);
  const elegidos = useAguante((s) => s.compra.elegidos ?? SIN_ELEGIDOS);
  const setCompra = useAguante((s) => s.setCompra);
  const [otra, setOtra] = useState('');
  const [cargando, setCargando] = useState(false);
  const [buscandoCerca, setBuscandoCerca] = useState(false);
  const [aviso, setAviso] = useState<{ tono: 'verde' | 'ambar'; texto: string } | null>(null);

  // Marca las cadenas que hay cerca (sin quitar las que ya estaban)
  const buscarCerca = async () => {
    setBuscandoCerca(true);
    setAviso(null);
    try {
      const r = await tiendasCerca();
      if (r.estado === 'sin-permiso') {
        setAviso({ tono: 'ambar', texto: t('Sin permiso de ubicación no podemos buscarlas. Elígelas de la lista.') });
      } else if (r.estado === 'error') {
        setAviso({ tono: 'ambar', texto: t('No se ha podido buscar (¿sin conexión?). Prueba otra vez o elígelas de la lista.') });
      } else if (r.cadenas.length === 0) {
        setAviso({ tono: 'ambar', texto: t('No hemos encontrado supermercados a menos de 3 km en OpenStreetMap. Elígelos de la lista.') });
      } else {
        const nuevas = r.cadenas.filter((c) => !tiendas.some((x) => x.clave === c.clave)).map((c) => ({ clave: c.clave, nombre: c.nombre }));
        setCompra({ tiendas: [...tiendas, ...nuevas] });
        setAviso({
          tono: 'verde',
          texto: t('A menos de 3 km: {tiendas}. Datos de © OpenStreetMap.', { tiendas: r.cadenas.map((c) => c.nombre).join(', ') }),
        });
      }
    } finally {
      setBuscandoCerca(false);
    }
  };
  const propias = tiendas.filter((x) => !CADENAS.some((c) => c.clave === x.clave));
  const opciones = [...CADENAS, ...propias];

  const alternar = (o: { clave: string; nombre: string }) => {
    const ya = tiendas.some((x) => x.clave === o.clave);
    setCompra({ tiendas: ya ? tiendas.filter((x) => x.clave !== o.clave) : [...tiendas, o] });
  };

  const anadirOtra = () => {
    const nombre = otra.trim();
    const etiqueta = etiquetaTienda(nombre);
    if (!etiqueta) return;
    if (!tiendas.some((x) => x.clave === etiqueta)) setCompra({ tiendas: [...tiendas, { clave: etiqueta, nombre }] });
    setOtra('');
  };

  const proponerLista = async () => {
    setCargando(true);
    setAviso(null);
    try {
      const res = await catalogoDe(tiendas);
      const nuevos = proponer(res.productos, precios);
      const problemas = [
        res.fallidas.length > 0 ? t('No se ha podido consultar {tiendas} (¿sin conexión?). Prueba otra vez en un rato.', { tiendas: res.fallidas.map(nombreTienda).join(', ') }) : '',
        res.vacias.length > 0 ? t('De {tiendas} no hay productos en Open Food Facts.', { tiendas: res.vacias.map(nombreTienda).join(', ') }) : '',
      ].filter(Boolean);
      if (nuevos.length === 0) {
        setAviso({ tono: 'ambar', texto: [t('No hemos encontrado conservas, arroz ni agua de esas tiendas.'), ...problemas].join(' ') });
        return;
      }
      setCompra({ elegidos: nuevos });
      setAviso({
        tono: problemas.length ? 'ambar' : 'verde',
        texto: [tn(res.productos.length, 'Hay {n} producto de tus tiendas: te proponemos los de la lista. Cámbialos si quieres.', 'Hay {n} productos de tus tiendas: te proponemos los de la lista. Cámbialos si quieres.'), ...problemas].join(' '),
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <Tarjeta style={{ gap: 12 }}>
      <Texto tam={18} peso="800">
        {t('Tus tiendas')}
      </Texto>
      <Texto tam={13} color={C.suave}>
        {t('Elige dónde compras y te proponemos conservas, arroz y agua de esas tiendas para la lista. Salen de Open Food Facts (lo que la gente ha escaneado en cada cadena): puede que alguno ya no esté, y el precio lo pones tú.')}
      </Texto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {opciones.map((o) => {
          const activa = tiendas.some((x) => x.clave === o.clave);
          return (
            <Pressable
              key={o.clave}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: activa }}
              onPress={() => alternar(o)}
              style={{
                minHeight: 40,
                paddingHorizontal: 14,
                borderRadius: 20,
                justifyContent: 'center',
                backgroundColor: activa ? C.primario : C.segmento,
              }}>
              <Texto tam={14} peso="600" color={activa ? C.sobrePrimario : C.tinta}>
                {o.nombre}
              </Texto>
            </Pressable>
          );
        })}
      </View>
      <Boton variante="secundario" icono="map-marker-outline" deshabilitado={buscandoCerca} onPress={buscarCerca}>
        {buscandoCerca ? t('Buscando cerca de ti…') : t('Buscar las que tengo cerca')}
      </Boton>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Campo etiqueta={t('Otra tienda')} valor={otra} onChange={setOtra} placeholder={t('Nombre de la cadena')} />
        </View>
        <Boton pequeno icono="plus" deshabilitado={!etiquetaTienda(otra)} onPress={anadirOtra}>
          {t('Añadir')}
        </Boton>
      </View>
      {cargando ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
          <ActivityIndicator color={C.tinta} />
          <Texto color={C.suave}>{t('Buscando productos de tus tiendas…')}</Texto>
        </View>
      ) : (
        <Boton icono="store-search-outline" deshabilitado={tiendas.length === 0} onPress={proponerLista}>
          {elegidos.length > 0 ? t('Volver a proponer') : t('Proponer productos de mis tiendas')}
        </Boton>
      )}
      {aviso && <Aviso tono={aviso.tono} texto={aviso.texto} />}
      {elegidos.length > 0 && !cargando && (
        <Boton variante="suave" onPress={() => setCompra({ elegidos: [] })}>
          {t('Quitar los productos y volver a lo genérico')}
        </Boton>
      )}
    </Tarjeta>
  );
}

/** Debajo de un producto de las tiendas: de dónde es, cuántas (se pueden fijar) y quitarlo. */
function ControlesProducto({ codigo, unidades }: { codigo: string; unidades: number }) {
  const C = useC();
  const elegidos = useAguante((s) => s.compra.elegidos ?? SIN_ELEGIDOS);
  const setCompra = useAguante((s) => s.setCompra);
  const e = elegidos.find((x) => x.codigo === codigo);
  if (!e) return null;
  const cambiar = (cambio: Partial<Elegido> | null) =>
    setCompra({ elegidos: cambio === null ? elegidos.filter((x) => x.codigo !== codigo) : elegidos.map((x) => (x.codigo === codigo ? { ...x, ...cambio } : x)) });
  return (
    <View style={{ gap: 6 }}>
      <Texto tam={12} color={C.suave}>
        {[e.marca, textoEnvase(e), nombreTienda(e.tienda), e.unidades === undefined ? t('cantidad automática') : t('cantidad fijada por ti')].filter(Boolean).join(' · ')}
      </Texto>
      {e.precio !== undefined && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Texto tam={12} color={C.texto2} style={{ flex: 1 }}>
            {t('{tienda} lo vende a {e} en su web ({fecha}). Puede variar según la zona.', {
              tienda: nombreTienda(e.tienda),
              e: euros(e.precio),
              fecha: e.fecha ? textoFecha(e.fecha) : '',
            })}
          </Texto>
          {e.enlace && (
            <Pressable accessibilityRole="link" hitSlop={8} onPress={() => Linking.openURL(e.enlace ?? '').catch(() => {})} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Texto tam={13} peso="700" color={C.tinta}>
                {t('Ver en la tienda')}
              </Texto>
            </Pressable>
          )}
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Contador valor={unidades} min={1} onChange={(v) => cambiar({ unidades: v })} estirar />
        </View>
        {e.unidades !== undefined && (
          <Boton pequeno variante="suave" onPress={() => cambiar({ unidades: undefined })}>
            {t('Automático')}
          </Boton>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Quitar {que} de la lista', { que: e.nombre })}
          hitSlop={8}
          onPress={() => cambiar(null)}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icono name="trash-can-outline" color={C.suave} />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * «Añadir otro de tus tiendas»: lo del catálogo de ese tipo que no sale en la
 * lista, incluidos los elegidos que ahora no hacen falta (están a 0). Al
 * añadir uno de esos se le fija 1 unidad.
 */
function AnadirDeTiendas({ tipo, enLista }: { tipo: 'agua' | 'lista' | 'cocinar'; enLista: string[] }) {
  const C = useC();
  const tiendas = useAguante((s) => s.compra.tiendas ?? SIN_TIENDAS);
  const elegidos = useAguante((s) => s.compra.elegidos ?? SIN_ELEGIDOS);
  const setCompra = useAguante((s) => s.setCompra);
  const catalogos = useCatalogos((s) => s.catalogos);
  const [abierto, setAbierto] = useState(false);
  const catalogo: ProductoTienda[] = useMemo(
    () => juntarCatalogos(tiendas.map((x) => catalogos[x.clave]?.productos ?? [])),
    [tiendas, catalogos],
  );
  const candidatos = catalogo.filter((p) => p.tipo === tipo && !enLista.includes(p.codigo));
  if (candidatos.length === 0) return null;
  const anadir = (p: ProductoTienda) =>
    setCompra({
      elegidos: elegidos.some((e) => e.codigo === p.codigo)
        ? elegidos.map((e) => (e.codigo === p.codigo ? { ...e, unidades: 1 } : e))
        : [
            ...elegidos,
            {
              codigo: p.codigo,
              tipo,
              nombre: p.nombre,
              marca: p.marca,
              tienda: p.tiendas[0],
              gramos: p.gramos,
              litros: p.litros,
              kcal100g: p.kcal100g,
              precio: p.precio,
              enlace: p.enlace,
              fecha: p.fecha,
            },
          ],
    });
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        onPress={() => setAbierto((a) => !a)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
        <Icono name="plus-circle-outline" color={C.tinta} size={18} />
        <Texto peso="600" style={{ flex: 1 }}>
          {t('Añadir otro de tus tiendas ({n})', { n: candidatos.length })}
        </Texto>
        <Icono name={abierto ? 'chevron-up' : 'chevron-down'} color={C.suave} />
      </Pressable>
      {abierto &&
        candidatos.slice(0, 25).map((p) => (
          <Pressable
            key={p.codigo}
            accessibilityRole="button"
            accessibilityLabel={t('Añadir {que} a la lista', { que: p.nombre })}
            onPress={() => anadir(p)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderTopWidth: 1, borderTopColor: C.linea, paddingVertical: 6 }}>
            <View style={{ flex: 1 }}>
              <Texto lineas={2}>{p.nombre}</Texto>
              <Texto tam={12} color={C.suave}>
                {[
                  p.precio !== undefined ? euros(p.precio) : '',
                  p.marca,
                  textoEnvase(p),
                  p.kcal100g ? t('{n} kcal/100 g', { n: formatoNumero(p.kcal100g) }) : '',
                  p.tiendas.map(nombreTienda).join(', '),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Texto>
            </View>
            <Icono name="plus" color={C.tinta} />
          </Pressable>
        ))}
    </View>
  );
}
