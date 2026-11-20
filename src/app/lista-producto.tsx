// Añadir un producto a la lista del plan de compra. La lista la hace cada uno:
// escaneando el código de barras (los datos salen de Open Food Facts), con
// algo que ya tiene en la despensa («comprar otra vez»), con los valores
// típicos de genericos.ts o escribiéndolo a mano. Desde el 20/11/2026 no hay
// tiendas: la app ya no propone productos de ninguna cadena.

import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';

import { Aviso, Boton, Campo, Icono, Pantalla, Seccion, Segmentado, Tarjeta, Texto } from '@/components/ui';
import { GENERICOS } from '@/constants/genericos';
import { formatoNumero } from '@/lib/calculo';
import { aporteDe, esCodigoBarras, tipoDe, type Elegido, type TipoLista } from '@/lib/compra';
import { numero } from '@/lib/formato';
import { t, tx } from '@/lib/i18n';
import { volver } from '@/lib/navegacion';
import { buscarCodigo, type DatosOFF } from '@/lib/off';
import { nuevoId, useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';

const TIPOS: { valor: TipoLista; etiqueta: string }[] = [
  { valor: 'agua', etiqueta: tx('Agua') },
  { valor: 'lista', etiqueta: tx('Sin cocinar') },
  { valor: 'cocinar', etiqueta: tx('Cocinar') },
];

// Las kcal de los típicos salen de genericos.ts (USDA FoodData Central). El
// tamaño del envase es [propio]: el más corriente en el súper, y se puede
// cambiar antes de añadirlo. La lata de atún o sardinas va con los 80 g
// escurridos que usa también la calculadora de la web.
const kcalDe = (fdc: number) => GENERICOS.find((g) => g.fdc === fdc)?.kcal100g ?? 0;
type Tipico = { nombre: string; litros?: number; gramos?: number; kcal100g?: number };
const TIPICOS: Record<TipoLista, Tipico[]> = {
  agua: [
    { nombre: tx('Garrafa de agua de 5 L'), litros: 5 },
    { nombre: tx('Garrafa de agua de 8 L'), litros: 8 },
    { nombre: tx('Botella de agua de 1,5 L'), litros: 1.5 },
  ],
  lista: [
    { nombre: tx('Garbanzos cocidos (bote de 400 g)'), gramos: 400, kcal100g: kcalDe(173800) },
    { nombre: tx('Lentejas cocidas (bote de 400 g)'), gramos: 400, kcal100g: kcalDe(175254) },
    { nombre: tx('Alubias blancas (bote de 400 g)'), gramos: 400, kcal100g: kcalDe(175204) },
    { nombre: tx('Atún en aceite (lata, 80 g escurridos)'), gramos: 80, kcal100g: kcalDe(173708) },
    { nombre: tx('Sardinas en aceite (lata, 80 g escurridos)'), gramos: 80, kcal100g: kcalDe(175139) },
  ],
  cocinar: [
    { nombre: tx('Arroz blanco (paquete de 1 kg)'), gramos: 1000, kcal100g: kcalDe(169756) },
    { nombre: tx('Pasta seca (paquete de 500 g)'), gramos: 500, kcal100g: kcalDe(168927) },
    { nombre: tx('Lentejas secas (paquete de 1 kg)'), gramos: 1000, kcal100g: kcalDe(172420) },
  ],
};

// Solo en desarrollo y en la web, para probar: `?codigo=…` busca ese código
// como si lo hubiera leído la cámara.
const PRUEBAS_WEB = __DEV__ && Platform.OS === 'web';

const textoNum = (n?: number) => (n ? String(n).replace('.', ',') : '');

export default function AnadirALaLista() {
  const C = useC();
  const params = useLocalSearchParams<{ tipo?: string; codigo?: string }>();
  const inicial: TipoLista = params.tipo === 'agua' || params.tipo === 'cocinar' ? params.tipo : 'lista';
  const productos = useAguante((s) => s.productos);
  const elegidos = useAguante((s) => s.compra.elegidos);
  const setCompra = useAguante((s) => s.setCompra);
  const setPrecio = useAguante((s) => s.setPrecio);
  const [permiso, pedirPermiso] = useCameraPermissions();

  const [tipo, setTipo] = useState<TipoLista>(inicial);
  const [codigo, setCodigo] = useState<string | undefined>(undefined);
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState<string | undefined>(undefined);
  const [litros, setLitros] = useState('');
  const [gramos, setGramos] = useState('');
  const [kcal100g, setKcal100g] = useState('');
  const [precio, setPrecioTexto] = useState('');
  const [nota, setNota] = useState('');
  const [camara, setCamara] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [textoCodigo, setTextoCodigo] = useState(PRUEBAS_WEB ? (params.codigo ?? '') : '');
  const [aviso, setAviso] = useState<{ tono: 'verde' | 'ambar'; texto: string } | null>(null);
  // La cámara dispara el mismo código varias veces seguidas: nos quedamos con el primero
  const leido = useRef(false);

  const rellenar = (d: { codigo?: string; nombre: string; marca?: string; litros?: number; gramos?: number; kcal100g?: number }) => {
    setCodigo(d.codigo);
    setNombre(d.nombre);
    setMarca(d.marca);
    setLitros(textoNum(d.litros));
    setGramos(textoNum(d.gramos));
    setKcal100g(textoNum(d.kcal100g));
  };

  const buscar = async (c: string) => {
    setCamara(false);
    setBuscando(true);
    setAviso(null);
    const res = await buscarCodigo(c.trim());
    setBuscando(false);
    if (res.estado === 'encontrado') {
      const d: DatosOFF = res.datos;
      // Si es agua, va en litros aunque se haya entrado desde la comida
      if (d.litros && !d.kcal100g && /agua|water/i.test(d.nombre)) setTipo('agua');
      rellenar({ codigo: d.codigo ?? c.trim(), nombre: d.nombre, marca: d.marca, litros: d.litros, gramos: d.gramos, kcal100g: d.kcal100g });
      setAviso(
        d.kcal100g || d.litros
          ? { tono: 'verde', texto: t('Encontrado en Open Food Facts. Revisa los datos y añádelo.') }
          : { tono: 'ambar', texto: t('Está en Open Food Facts, pero sin las calorías: cópialas de la etiqueta.') },
      );
    } else {
      setCodigo(c.trim());
      setAviso({
        tono: 'ambar',
        texto:
          res.estado === 'no-encontrado'
            ? t('El código {c} no está en Open Food Facts. Rellénalo a mano con lo que pone la etiqueta.', { c: c.trim() })
            : t('No se pudo consultar Open Food Facts ({detalle}). Revisa la conexión y reintenta, o rellénalo a mano.', { detalle: res.detalle }),
      });
    }
  };

  const alEscanear = (c: string) => {
    if (leido.current) return;
    leido.current = true;
    buscar(c);
  };

  const abrirCamara = () => {
    leido.current = false;
    setAviso(null);
    setCamara(true);
  };

  const lista = elegidos ?? [];

  /** Mete el producto en la lista (si ya estaba, vuelve a la cantidad automática) y apunta su precio. */
  const meter = (e: Elegido, precioUnidad?: number) => {
    const resto = lista.filter((x) => x.codigo !== e.codigo);
    setCompra({ elegidos: [...resto, e] });
    if (precioUnidad && precioUnidad > 0) setPrecio(`prod:${e.codigo}`, precioUnidad);
    volver();
  };

  // De la despensa: lo de este tipo, una vez cada cosa (por código o, sin él, por nombre)
  const deDespensa = productos.filter((p) => tipoDe(p) === tipo);
  const vistos = new Set<string>();
  const despensa = deDespensa.filter((p) => {
    const clave = esCodigoBarras(p.codigo) ? (p.codigo ?? '') : p.nombre.trim().toLowerCase();
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return tipo === 'agua' ? (p.litrosPorUnidad ?? 0) > 0 : (p.kcalPorUnidad ?? 0) > 0;
  });
  // Lo que no tiene código de barras se reconoce por el nombre: así no se añade dos veces
  const enLaLista = (p: (typeof despensa)[number]) =>
    esCodigoBarras(p.codigo)
      ? lista.find((e) => e.codigo === p.codigo)
      : lista.find((e) => e.tipo === tipo && e.nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase());
  const comprarOtraVez = (p: (typeof despensa)[number]) => {
    const codigoLista = enLaLista(p)?.codigo ?? (esCodigoBarras(p.codigo) ? (p.codigo ?? '') : `man:${nuevoId()}`);
    meter(
      tipo === 'agua'
        ? { codigo: codigoLista, tipo, nombre: p.nombre, litros: p.litrosPorUnidad }
        : {
            codigo: codigoLista,
            tipo,
            nombre: p.nombre,
            gramos: p.gramos,
            kcal100g: p.kcal100g,
            // Sin peso o sin kcal por 100 g, se queda con las kcal de la unidad
            kcal: p.gramos && p.kcal100g ? undefined : p.kcalPorUnidad,
            litrosCocer: tipo === 'cocinar' ? p.aguaCocinarPorUnidadL : undefined,
          },
    );
  };

  const nLitros = numero(litros);
  const nGramos = numero(gramos);
  const nKcal = numero(kcal100g);
  const nPrecio = numero(precio);
  const valido =
    nombre.trim().length > 0 &&
    (tipo === 'agua' ? Number.isFinite(nLitros) && nLitros > 0 : Number.isFinite(nGramos) && nGramos > 0 && Number.isFinite(nKcal) && nKcal > 0);
  const nuevo: Elegido | null = valido
    ? {
        codigo: codigo && esCodigoBarras(codigo) ? codigo : `man:${nuevoId()}`,
        tipo,
        nombre: nombre.trim(),
        marca,
        ...(tipo === 'agua' ? { litros: nLitros } : { gramos: nGramos, kcal100g: nKcal }),
        nota: nota.trim() || undefined,
      }
    : null;
  const aporte = nuevo ? aporteDe(nuevo) : null;

  return (
    <Pantalla>
      <Tarjeta style={{ gap: 12 }}>
        <Texto tam={13} color={C.suave}>
          {t('Pon en tu lista lo que sueles comprar. La app calcula cuántas hacen falta de cada cosa para llegar a tu objetivo.')}
        </Texto>
        <Segmentado opciones={TIPOS} valor={tipo} onChange={setTipo} />
      </Tarjeta>

      <Tarjeta style={{ gap: 12 }}>
        <Seccion>{t('Escanear')}</Seccion>
        {camara && Platform.OS !== 'web' ? (
          permiso?.granted ? (
            <View style={{ height: 240, borderRadius: 22, overflow: 'hidden', backgroundColor: '#14211B' }}>
              <CameraView
                style={{ flex: 1 }}
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
                onBarcodeScanned={({ data }) => alEscanear(data)}
              />
              <View pointerEvents="none" style={{ position: 'absolute', left: 24, right: 24, top: 119, height: 2, backgroundColor: '#F97066' }} />
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <Texto color={C.suave}>{t('Para escanear el código de barras necesitamos la cámara.')}</Texto>
              <Boton variante="suave" onPress={pedirPermiso}>
                {t('Permitir la cámara')}
              </Boton>
            </View>
          )
        ) : Platform.OS !== 'web' ? (
          <Boton icono="barcode-scan" onPress={abrirCamara}>
            {t('Escanear el código de barras')}
          </Boton>
        ) : null}
        {Platform.OS === 'web' && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Campo etiqueta={t('Código de barras')} valor={textoCodigo} onChange={setTextoCodigo} teclado="numeric" />
            </View>
            <Boton pequeno icono="magnify" deshabilitado={!esCodigoBarras(textoCodigo.trim())} onPress={() => buscar(textoCodigo)}>
              {t('Buscar')}
            </Boton>
          </View>
        )}
        {buscando && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
            <ActivityIndicator color={C.tinta} />
            <Texto color={C.suave}>{t('Buscando el producto…')}</Texto>
          </View>
        )}
        {aviso && <Aviso tono={aviso.tono} texto={aviso.texto} />}
      </Tarjeta>

      {despensa.length > 0 && (
        <Tarjeta style={{ gap: 4 }}>
          <Seccion>{t('Comprar otra vez lo de tu despensa')}</Seccion>
          {despensa.slice(0, 30).map((p, i) => {
            const enLista = !!enLaLista(p);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={t('Añadir {que} a la lista', { que: p.nombre })}
                onPress={() => comprarOtraVez(p)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 6, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.linea }}>
                <View style={{ flex: 1 }}>
                  <Texto lineas={2}>{p.nombre}</Texto>
                  <Texto tam={12} color={C.suave}>
                    {tipo === 'agua'
                      ? t('{n} L cada uno', { n: formatoNumero(p.litrosPorUnidad ?? 0, 1) })
                      : t('Unas {kcal} kcal cada uno', { kcal: formatoNumero(p.kcalPorUnidad ?? 0) })}
                    {enLista ? ` · ${t('ya está en la lista')}` : ''}
                  </Texto>
                </View>
                <Icono name="plus" color={C.tinta} />
              </Pressable>
            );
          })}
        </Tarjeta>
      )}

      <Tarjeta style={{ gap: 12 }}>
        <Seccion>{t('Valores típicos')}</Seccion>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TIPICOS[tipo].map((x) => (
            <Pressable
              key={x.nombre}
              accessibilityRole="button"
              onPress={() => {
                setAviso(null);
                rellenar({ nombre: t(x.nombre), litros: x.litros, gramos: x.gramos, kcal100g: x.kcal100g });
              }}
              style={{ minHeight: 40, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, justifyContent: 'center', backgroundColor: C.segmento }}>
              <Texto tam={14} peso="600">
                {t(x.nombre)}
              </Texto>
            </Pressable>
          ))}
        </View>
        <Texto tam={12} color={C.suave}>
          {t('Las kcal son de USDA FoodData Central. Cambia el peso si tu envase es distinto.')}
        </Texto>
      </Tarjeta>

      <Tarjeta style={{ gap: 12 }}>
        <Seccion>{t('El producto')}</Seccion>
        <Campo etiqueta={t('Nombre')} valor={nombre} onChange={setNombre} placeholder={t('Lo que pone en la etiqueta')} />
        {tipo === 'agua' ? (
          <Campo etiqueta={t('Litros de cada uno')} valor={litros} onChange={setLitros} teclado="decimal-pad" sufijo="L" />
        ) : (
          <>
            <Campo etiqueta={t('Peso de cada uno')} valor={gramos} onChange={setGramos} teclado="decimal-pad" sufijo="g" ayuda={t('El peso neto, o el escurrido si es una conserva en líquido.')} />
            <Campo etiqueta={t('Kcal por 100 g')} valor={kcal100g} onChange={setKcal100g} teclado="decimal-pad" sufijo="kcal" />
          </>
        )}
        <Campo etiqueta={t('Precio de cada uno (opcional)')} valor={precio} onChange={setPrecioTexto} teclado="decimal-pad" sufijo="€" />
        <Campo etiqueta={t('Nota (opcional)')} valor={nota} onChange={setNota} placeholder={t('La de 8 L, la del súper de abajo…')} />
        {aporte && (
          <Texto tam={13} color={C.texto2}>
            {tipo === 'agua'
              ? t('Cada uno trae {l} L.', { l: formatoNumero(aporte.litros ?? 0, 1) })
              : tipo === 'cocinar'
                ? t('Cada uno da unas {kcal} kcal y cocerlo gasta unos {l} L de agua.', {
                    kcal: formatoNumero(aporte.kcal ?? 0),
                    l: formatoNumero(aporte.litrosCocer ?? 0, 1),
                  })
                : t('Cada uno da unas {kcal} kcal.', { kcal: formatoNumero(aporte.kcal ?? 0) })}
          </Texto>
        )}
        <Boton icono="playlist-plus" deshabilitado={!nuevo} onPress={() => nuevo && meter(nuevo, Number.isFinite(nPrecio) ? nPrecio : undefined)}>
          {t('Añadir a la lista')}
        </Boton>
      </Tarjeta>
    </Pantalla>
  );
}
