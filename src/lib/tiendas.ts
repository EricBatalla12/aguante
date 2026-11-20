// Descarga los productos de las tiendas de cada uno (los de la propia tienda
// con precio si los hay en Supabase; si no, de Open Food Facts) y los guarda
// una semana en el móvil (almacén `aguante-tiendas`): no van en las
// copias de seguridad ni se comparten, se pueden volver a bajar.
//
// Se busca primero en search.openfoodfacts.org, que filtra por el nombre de
// la tienda tal como lo escribe la gente («Mercadona») y encuentra bastante
// más (20/11/2026: 243 conservas de Mercadona frente a 130). No deja llamarlo
// desde la web (sin CORS): si falla, se usa la búsqueda clásica, que filtra
// por la etiqueta (`mercadona`), deja unas 10 búsquedas por minuto y a ratos
// responde 503. Cada tienda son tres búsquedas (conservas, arroz y agua).

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as Location from 'expo-location';

import { CADENAS } from '../constants/tiendas';
import { almacen } from './almacen';
import { cadenasDeOsm, CATEGORIA_OFF, deFilaPrecio, juntarCatalogos, leerCatalogo, type ProductoTienda, type TipoTienda } from './catalogo';
import { supabase } from './supabase';

const CABECERAS = { 'User-Agent': 'Aguante/1.0 (app personal de reservas de emergencia)' };
const CAMPOS =
  'code,product_name,product_name_es,brands,product_quantity,product_quantity_unit,quantity,nutriments,categories_tags,image_front_small_url';
// Una semana: lo que tarda en llegar la siguiente copia de precios de las tiendas
const DIAS_CACHE = 7;
const TIPOS: TipoTienda[] = ['lista', 'cocinar', 'agua'];

type Guardado = { fecha: number; productos: ProductoTienda[] };

type EstadoTiendas = {
  catalogos: Record<string, Guardado>;
  guardar: (tienda: string, productos: ProductoTienda[]) => void;
};

export const useCatalogos = create<EstadoTiendas>()(
  persist(
    (set) => ({
      catalogos: {},
      guardar: (tienda, productos) => set((s) => ({ catalogos: { ...s.catalogos, [tienda]: { fecha: Date.now(), productos } } })),
    }),
    { name: 'aguante-tiendas', version: 1, storage: createJSONStorage(() => almacen), partialize: (s) => ({ catalogos: s.catalogos }) },
  ),
);

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** search.openfoodfacts.org: rápido y con más productos, pero sin CORS. */
async function buscarNuevo(tienda: { clave: string; nombre: string }, tipo: TipoTienda): Promise<ProductoTienda[]> {
  const nombre = tienda.nombre.replace(/"/g, '');
  const q = new URLSearchParams({
    q: `categories_tags:"${CATEGORIA_OFF[tipo]}" AND countries_tags:"en:spain" AND stores:"${nombre}"`,
    fields: CAMPOS,
    page_size: '100',
    sort_by: '-unique_scans_n',
  });
  const r = await pedir(`https://search.openfoodfacts.org/search?${q.toString()}`, 1);
  return leerCatalogo(r, tienda.clave, tipo);
}

/** La búsqueda clásica, por la etiqueta de la tienda. */
async function buscarClasico(tienda: { clave: string }, tipo: TipoTienda): Promise<ProductoTienda[]> {
  const q = new URLSearchParams({
    countries_tags: 'en:spain',
    stores_tags: tienda.clave,
    categories_tags: CATEGORIA_OFF[tipo],
    fields: CAMPOS,
    page_size: '100',
    sort_by: 'unique_scans_n',
  });
  const r = await pedir(`https://world.openfoodfacts.org/api/v2/search?${q.toString()}`, 3);
  return leerCatalogo(r, tienda.clave, tipo);
}

/** GET con tiempo máximo; si responde que espere (429) o está ocupado (5xx), reintenta un poco después. */
async function pedir(url: string, intentos: number): Promise<unknown> {
  for (let intento = 0; intento < intentos; intento++) {
    const ctrl = new AbortController();
    const tope = setTimeout(() => ctrl.abort(), 25_000);
    try {
      const r = await fetch(url, { headers: CABECERAS, signal: ctrl.signal });
      if (r.ok) return await r.json();
      if (r.status !== 429 && r.status < 500) throw new Error(`HTTP ${r.status}`);
      if (intento === intentos - 1) throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      if (intento === intentos - 1) throw e;
    } finally {
      clearTimeout(tope);
    }
    await esperar(6000 * (intento + 1));
  }
  throw new Error('sin respuesta');
}

/**
 * Las tiendas con precios cargados (de momento, Mercadona; ver
 * scripts/precios-tiendas.mjs): sus productos de la tienda online, con precio.
 * Vacío si esa tienda no tiene o no hay conexión.
 */
async function deLaTienda(tienda: string): Promise<ProductoTienda[]> {
  const { data, error } = await supabase
    .from('precios_tienda')
    .select('tienda,id,ean,nombre,marca,tipo,gramos,litros,kcal100g,precio,enlace,actualizado')
    .eq('tienda', tienda)
    .eq('publicado', true)
    .limit(2000);
  if (error || !data) return [];
  return data.map(deFilaPrecio).filter((p): p is ProductoTienda => p !== null);
}

async function buscar(tienda: { clave: string; nombre: string }, tipo: TipoTienda): Promise<ProductoTienda[]> {
  try {
    return await buscarNuevo(tienda, tipo);
  } catch {
    return buscarClasico(tienda, tipo);
  }
}

export type Resultado = { productos: ProductoTienda[]; fallidas: string[]; vacias: string[] };

/**
 * Los productos de esas tiendas: de la caché si tienen menos de 30 días y, si
 * no, de Open Food Facts. Las que fallan y las que no tienen nada se devuelven
 * aparte para decírselo a la persona.
 */
export async function catalogoDe(tiendas: { clave: string; nombre: string }[], forzar = false): Promise<Resultado> {
  const { catalogos, guardar } = useCatalogos.getState();
  const listas: ProductoTienda[][] = [];
  const fallidas: string[] = [];
  const vacias: string[] = [];
  for (const t of tiendas) {
    const tienda = t.clave;
    const ya = catalogos[tienda];
    if (!forzar && ya && Date.now() - ya.fecha < DIAS_CACHE * 86_400_000) {
      listas.push(ya.productos);
      if (ya.productos.length === 0) vacias.push(tienda);
      continue;
    }
    try {
      // Con precios de la propia tienda, esos; si no, Open Food Facts
      const productos: ProductoTienda[] = await deLaTienda(tienda);
      if (productos.length === 0) {
        for (const tipo of TIPOS) {
          productos.push(...(await buscar(t, tipo)));
          await esperar(1200);
        }
      }
      guardar(tienda, productos);
      listas.push(productos);
      if (productos.length === 0) vacias.push(tienda);
    } catch {
      fallidas.push(tienda);
      if (ya) listas.push(ya.productos);
    }
  }
  return { productos: juntarCatalogos(listas), fallidas, vacias };
}

// ---------------------------------------------------------------- Cerca de ti

/** Radio en el que se buscan supermercados [propio]: lo que se puede ir andando o en un momento en coche. */
const RADIO_M = 3000;

export type Cerca =
  | { estado: 'ok'; cadenas: { clave: string; nombre: string; tiendas: number }[] }
  | { estado: 'sin-permiso' }
  | { estado: 'error' };

/**
 * Los supermercados que hay cerca, por cadena, de OpenStreetMap (Overpass).
 * Solo con permiso de ubicación y con la app abierta. La posición se redondea
 * a dos decimales (un kilómetro, más o menos) antes de mandarla: para buscar
 * a 3 km basta, y así no sale de aquí dónde vive nadie. No se guarda.
 */
export async function tiendasCerca(): Promise<Cerca> {
  const permiso = await Location.requestForegroundPermissionsAsync();
  if (!permiso.granted) return { estado: 'sin-permiso' };
  try {
    const pos =
      (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000, requiredAccuracy: 2000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
    const lat = pos.coords.latitude.toFixed(2);
    const lon = pos.coords.longitude.toFixed(2);
    const consulta = `[out:json][timeout:25];nwr["shop"="supermarket"](around:${RADIO_M},${lat},${lon});out tags 200;`;
    // El servidor público de Overpass a menudo está lleno (502) y pide reintentar con espera
    for (let intento = 0; intento < 4; intento++) {
      const ctrl = new AbortController();
      const tope = setTimeout(() => ctrl.abort(), 30_000);
      try {
        const r = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { ...CABECERAS, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(consulta)}`,
          signal: ctrl.signal,
        });
        if (r.ok) return { estado: 'ok', cadenas: cadenasDeOsm(await r.json(), CADENAS) };
        if (r.status !== 429 && r.status < 500) return { estado: 'error' };
      } finally {
        clearTimeout(tope);
      }
      await esperar(4000 * 2 ** intento);
    }
    return { estado: 'error' };
  } catch {
    return { estado: 'error' };
  }
}
