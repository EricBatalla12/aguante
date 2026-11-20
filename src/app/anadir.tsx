import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { ProductoForm } from '@/components/producto-form';
import { Aviso, Boton, Campo, Icono, Interruptor, Pantalla, Texto } from '@/components/ui';
import { lineaDe, MESES_REPONER, preciosConTienda } from '@/lib/compra';
import { aCampo, numero } from '@/lib/formato';
import type { Producto } from '@/lib/calculo';
import { volver } from '@/lib/navegacion';
import { buscarCodigo, type DatosOFF } from '@/lib/off';
import { hoyISO, useAguante } from '@/lib/store';
import { useDatosCompra } from '@/lib/use-compra';
import { useC } from '@/lib/tema';
import { useResultado } from '@/lib/use-resultado';
import { t } from '@/lib/i18n';

type Fase = 'escaneando' | 'buscando' | 'formulario';

// Fijo: un `?? {}` dentro del selector daría un objeto nuevo en cada lectura
const SIN_PRECIOS: Record<string, number> = {};

// Solo en desarrollo y en la web, para probar y para las capturas de los vídeos:
// `?escanear=1` abre el escáner (la web normal va directa al formulario) y
// `?codigo=…` busca ese código como si lo hubiera leído la cámara.
const PRUEBAS_WEB = __DEV__ && Platform.OS === 'web';

/** Lo que se ha encontrado, en la forma en que lo espera el formulario. */
function aProducto(d: DatosOFF): Partial<Producto> {
  const nombre = [d.nombre, d.marca].filter(Boolean).join(' · ');
  // Una botella de agua: va en litros y no tiene calorías
  if (d.litros && !d.kcal100g && /agua|water/i.test(d.nombre)) {
    return { nombre, categoria: 'agua', litrosPorUnidad: d.litros, imagen: d.imagen, codigo: d.codigo };
  }
  return { nombre, gramos: d.gramos, kcal100g: d.kcal100g, imagen: d.imagen, codigo: d.codigo };
}

export default function Anadir() {
  const C = useC();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const guardar = useAguante((s) => s.guardarProducto);
  const r = useResultado('normal');
  const prueba = useLocalSearchParams<{ escanear?: string; codigo?: string; plan?: string }>();
  // Viene del plan de compra («He comprado otra cosa»): la línea en la que se apunta
  const lineaPlan = prueba.plan;
  const apuntarCompra = useAguante((s) => s.apuntarCompra);
  const preciosPropios = useAguante((s) => s.compra.precios ?? SIN_PRECIOS);
  const elegidos = useAguante((s) => s.compra.elegidos);
  const precios = preciosConTienda(preciosPropios, elegidos ?? []);
  const articulos = useDatosCompra().lista(MESES_REPONER);
  const [apuntarElegido, setApuntar] = useState<boolean | null>(null);
  const [textoPrecio, setTextoPrecio] = useState<string | null>(null);
  const codigoPrueba = PRUEBAS_WEB ? prueba.codigo : undefined;
  const [fase, setFase] = useState<Fase>(
    codigoPrueba ? 'buscando' : Platform.OS === 'web' && !(PRUEBAS_WEB && prueba.escanear) ? 'formulario' : 'escaneando',
  );
  const [datos, setDatos] = useState<DatosOFF | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(codigoPrueba ?? null);
  const [sinConexion, setSinConexion] = useState(false);
  // La cámara dispara el mismo código varias veces seguidas: nos quedamos con el primero
  const leido = useRef(false);

  const buscar = (c: string) => {
    setCodigo(c);
    setFase('buscando');
    return consultar(c);
  };

  const consultar = async (c: string) => {
    const res = await buscarCodigo(c);
    setSinConexion(res.estado === 'error');
    if (res.estado === 'encontrado') {
      setDatos(res.datos);
      setMensaje(
        res.datos.kcal100g
          ? t('Encontrado en Open Food Facts. Revisa los datos y pon la caducidad.')
          : t('Está en Open Food Facts, pero sin las calorías: cópialas de la etiqueta.'),
      );
    } else if (res.estado === 'no-encontrado') {
      setDatos(null);
      setMensaje(t('El código {c} no está en Open Food Facts. Escribe el nombre y elige una sugerencia, o rellénalo a mano.', { c }));
    } else {
      setDatos(null);
      setMensaje(t('No se pudo consultar Open Food Facts ({detalle}). Revisa la conexión y reintenta, o rellénalo a mano.', { detalle: res.detalle }));
    }
    setFase('formulario');
  };

  useEffect(() => {
    if (codigoPrueba) consultar(codigoPrueba);
    // Solo al abrir la pantalla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alEscanear = (c: string) => {
    if (leido.current) return;
    leido.current = true;
    buscar(c);
  };

  const escanearOtra = () => {
    leido.current = false;
    setApuntar(null);
    setTextoPrecio(null);
    setDatos(null);
    setMensaje(null);
    setCodigo(null);
    setSinConexion(false);
    setFase('escaneando');
  };

  // ¿Está lo escaneado en la lista del plan? El mismo producto se apunta solo;
  // si solo coincide el tipo (agua, conservas…), se deja elegir: puede que
  // se esté apuntando lo que ya había en casa.
  const previsto = datos ? aProducto(datos) : null;
  const coincide = previsto ? lineaDe({ codigo: previsto.codigo, categoria: previsto.categoria ?? 'comida' }, articulos) : null;
  const apuntar = apuntarElegido ?? (!!lineaPlan || !!coincide?.exacto);
  const textoPrecioEfectivo = textoPrecio ?? (coincide?.exacto ? aCampo(precios[coincide.clave]) : '');

  return (
    <Pantalla>
      {fase === 'escaneando' && (
        <View style={{ gap: 12 }}>
          {permiso?.granted ? (
            <View style={{ height: 280, borderRadius: 22, overflow: 'hidden', backgroundColor: '#14211B' }}>
              <CameraView
                style={{ flex: 1 }}
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
                onBarcodeScanned={({ data }) => alEscanear(data)}
              />
              <View pointerEvents="none" style={{ position: 'absolute', left: 24, right: 24, top: 139, height: 2, backgroundColor: '#F97066' }} />
            </View>
          ) : (
            <View style={{ borderRadius: 22, backgroundColor: C.heroe, borderWidth: 1, borderColor: C.heroeBorde, alignItems: 'center', gap: 12, padding: 20 }}>
              <Icono name="barcode-scan" color={C.heroeTexto} size={40} />
              <Texto color={C.heroeSuave} centro>
                {t('Para escanear el código de barras necesitamos la cámara.')}
              </Texto>
              <View style={{ alignSelf: 'stretch' }}>
                <Boton variante="suave" onPress={pedirPermiso}>
                  {t('Permitir la cámara')}
                </Boton>
              </View>
            </View>
          )}
          <Texto tam={14} color={C.suave} centro>
            {t('Apunta al código de barras del producto')}
          </Texto>
          <Boton variante="secundario" icono="pencil-outline" onPress={() => setFase('formulario')}>
            {t('Escribirlo a mano')}
          </Boton>
        </View>
      )}

      {fase === 'buscando' && (
        <View style={{ padding: 32, alignItems: 'center', gap: 12 }}>
          <ActivityIndicator color={C.tinta} />
          <Texto color={C.suave}>{t('Buscando el producto…')}</Texto>
        </View>
      )}

      {fase === 'formulario' && (
        <>
          {mensaje && <Aviso tono={datos?.kcal100g ? 'verde' : 'ambar'} texto={mensaje} />}
          {(sinConexion || Platform.OS !== 'web') && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {sinConexion && codigo && (
                <View style={{ flex: 1 }}>
                  <Boton pequeno variante="secundario" icono="refresh" onPress={() => buscar(codigo)}>
                    {t('Reintentar')}
                  </Boton>
                </View>
              )}
              {Platform.OS !== 'web' && (
                <View style={{ flex: 1 }}>
                  <Boton pequeno variante="secundario" icono="barcode-scan" onPress={escanearOtra}>
                    {codigo ? t('Escanear otro') : t('Escanear')}
                  </Boton>
                </View>
              )}
            </View>
          )}
          {(lineaPlan || coincide) && (
            <View style={{ gap: 8, borderRadius: 16, padding: 12, backgroundColor: C.segmento }}>
              <Interruptor
                etiqueta={t('Lo he comprado para el plan de compra')}
                valor={apuntar}
                onChange={setApuntar}
                ayuda={
                  coincide?.exacto
                    ? t('Está en tu lista de la compra: al guardarlo se apunta como comprado.')
                    : t('Al guardarlo se apunta en el gasto del mes y sale de la lista.')
                }
              />
              {apuntar && (
                <Campo etiqueta={t('Precio de cada uno')} valor={textoPrecioEfectivo} onChange={setTextoPrecio} teclado="decimal-pad" sufijo="€" />
              )}
            </View>
          )}
          <ProductoForm
            key={codigo ?? 'manual'}
            inicial={datos ? aProducto(datos) : codigo ? { codigo } : undefined}
            origenInicial={datos ? 'Open Food Facts' : undefined}
            textoGuardar={t('Guardar en la reserva')}
            diasPorKcal={r.kcalDia || undefined}
            onGuardar={(p) => {
              guardar(p);
              // Lo comprado para el plan se apunta en el gasto del mes (y descuenta lo fijado en la lista)
              const clave = lineaPlan ?? lineaDe(p, articulos)?.clave;
              if (apuntar && clave) {
                const precio = numero(textoPrecioEfectivo);
                const coste = Number.isFinite(precio) && precio > 0 ? Math.round(precio * p.cantidad * 100) / 100 : 0;
                apuntarCompra({ clave, nombre: p.nombre, unidades: p.cantidad, coste, fecha: hoyISO() });
              }
              volver();
            }}
          />
        </>
      )}
    </Pantalla>
  );
}
