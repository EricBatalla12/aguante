// Gastar un producto escaneándolo: se lee el código de barras y se quitan
// unidades de ese producto, sin buscarlo en la lista. Así la despensa sigue al
// día con poco esfuerzo, que es de lo que depende el cálculo de días.
//
// Si hay varios con el mismo código (el mismo arroz comprado en dos tandas),
// sale primero el que antes caduca. En plena emergencia, la comida se apunta
// como comida en el plan del día (y se puede deshacer allí).

import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { Aviso, Boton, Campo, Contador, Icono, Miniatura, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { productosConCodigo, type Producto } from '@/lib/calculo';
import { textoFecha } from '@/lib/fechas';
import { colorCategoria, ICONO_CATEGORIA, textoCantidad } from '@/lib/formato';
import { t, tn } from '@/lib/i18n';
import { useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';

type Hecho = { id: string; nombre: string; unidades: number; quedan: number; comido: boolean };

export default function Gastar() {
  const C = useC();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const productos = useAguante((s) => s.productos);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [aMano, setAMano] = useState('');
  const [hecho, setHecho] = useState<Hecho | null>(null);
  // La cámara dispara el mismo código varias veces seguidas: nos quedamos con el primero
  const leido = useRef(false);

  const leer = (c: string) => {
    if (leido.current || !c.trim()) return;
    leido.current = true;
    setHecho(null);
    setCodigo(c.trim());
  };

  const otro = () => {
    leido.current = false;
    setCodigo(null);
    setAMano('');
  };

  const coincidencias = codigo ? productosConCodigo(productos, codigo) : [];

  return (
    <Pantalla>
      {hecho && <Resultado hecho={hecho} alQuitar={() => setHecho(null)} />}

      {!codigo ? (
        <>
          {Platform.OS !== 'web' &&
            (permiso?.granted ? (
              <View style={{ height: 260, borderRadius: 22, overflow: 'hidden', backgroundColor: '#14211B' }}>
                <CameraView
                  style={{ flex: 1 }}
                  barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
                  onBarcodeScanned={({ data }) => leer(data)}
                />
                <View pointerEvents="none" style={{ position: 'absolute', left: 24, right: 24, top: 129, height: 2, backgroundColor: '#F97066' }} />
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
            ))}
          <Texto tam={14} color={C.suave} centro>
            {t('Escanea lo que vas a gastar y se descuenta de la despensa.')}
          </Texto>
          <Tarjeta style={{ gap: 12 }}>
            <Campo
              etiqueta={t('O escribe el código de barras')}
              valor={aMano}
              onChange={(v) => setAMano(v.replace(/\D/g, ''))}
              teclado="numeric"
              placeholder="8410000000000"
            />
            <Boton pequeno variante="secundario" icono="magnify" deshabilitado={aMano.length < 6} onPress={() => leer(aMano)}>
              {t('Buscar en la despensa')}
            </Boton>
          </Tarjeta>
        </>
      ) : coincidencias.length === 0 ? (
        <>
          <Aviso tono="ambar" texto={t('No hay nada con el código {c} en la despensa, o ya no quedan unidades.', { c: codigo })} />
          <Boton icono="barcode-scan" onPress={otro}>
            {t('Escanear otro')}
          </Boton>
          <Boton variante="secundario" icono="plus" onPress={() => router.replace('/anadir')}>
            {t('Añadirlo a la despensa')}
          </Boton>
        </>
      ) : (
        <>
          {coincidencias.map((p, i) => (
            <FilaGastar
              key={p.id}
              producto={p}
              primero={i === 0 && coincidencias.length > 1}
              alGastar={(h) => {
                setHecho(h);
                otro();
              }}
            />
          ))}
          <Boton variante="secundario" icono="barcode-scan" onPress={otro}>
            {t('Escanear otro')}
          </Boton>
        </>
      )}
    </Pantalla>
  );
}

function FilaGastar({ producto: p, primero, alGastar }: { producto: Producto; primero: boolean; alGastar: (h: Hecho) => void }) {
  const C = useC();
  const emergencia = useAguante((s) => s.emergencia);
  const gastar = useAguante((s) => s.gastar);
  const comer = useAguante((s) => s.comer);
  const [unidades, setUnidades] = useState(Math.min(1, p.cantidad));
  const cat = colorCategoria(p.categoria, C);
  // En la emergencia, la comida de las personas cuenta en el plan del día
  const comido = !!emergencia && p.categoria === 'comida';
  const n = Math.min(unidades, p.cantidad);

  return (
    <Tarjeta style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Miniatura uri={p.imagen} icono={ICONO_CATEGORIA[p.categoria]} fondo={cat.fondo} color={cat.color} tam={52} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Texto peso="700" lineas={2}>
            {p.nombre}
          </Texto>
          <Texto tam={13} color={C.suave}>
            {[
              tn(p.cantidad, 'Queda {n}', 'Quedan {n}', { n: textoCantidad(p.cantidad) }),
              p.caducidad ? t('caduca {fecha}', { fecha: textoFecha(p.caducidad, p.caducidadSinDia) }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Texto>
          {primero && (
            <Texto tam={12} color={C.verde}>
              {t('Es el que antes caduca: gasta este primero.')}
            </Texto>
          )}
        </View>
      </View>
      <Contador valor={n} onChange={(v) => setUnidades(Math.min(p.cantidad, Math.max(0.25, v)))} paso={p.cantidad < 1 ? 0.25 : 1} estirar />
      <Boton
        icono={comido ? 'silverware-fork-knife' : 'basket-minus-outline'}
        deshabilitado={n <= 0}
        onPress={() => {
          if (comido) comer(p.id, n);
          else gastar(p.id, n);
          alGastar({ id: p.id, nombre: p.nombre, unidades: n, quedan: Math.max(0, Math.round((p.cantidad - n) * 100) / 100), comido });
        }}>
        {comido ? t('Apuntar como comido') : t('Gastar')}
      </Boton>
    </Tarjeta>
  );
}

function Resultado({ hecho, alQuitar }: { hecho: Hecho; alQuitar: () => void }) {
  const borrar = useAguante((s) => s.borrarProducto);
  const texto = hecho.comido
    ? t('Apuntado como comido: {u} × {nombre}. Quedan {q}. Se puede deshacer en el plan del día.', {
        u: textoCantidad(hecho.unidades),
        nombre: hecho.nombre,
        q: textoCantidad(hecho.quedan),
      })
    : t('Gastado: {u} × {nombre}. Quedan {q}.', { u: textoCantidad(hecho.unidades), nombre: hecho.nombre, q: textoCantidad(hecho.quedan) });
  return (
    <>
      <Aviso tono="verde" texto={texto} />
      {hecho.quedan === 0 && !hecho.comido && (
        <Boton
          pequeno
          variante="suave"
          icono="trash-can-outline"
          onPress={() => {
            borrar(hecho.id);
            alQuitar();
          }}>
          {t('No queda: quitarlo de la despensa')}
        </Boton>
      )}
    </>
  );
}
