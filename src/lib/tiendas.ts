// Descarga los productos de las tiendas de cada uno desde Open Food Facts y
// los guarda 30 días en el móvil (almacén `aguante-tiendas`): no van en las
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

import { almacen } from './almacen';
import { CATEGORIA_OFF, juntarCatalogos, leerCatalogo, type ProductoTienda, type TipoTienda } from './catalogo';

const CABECERAS = { 'User-Agent': 'Aguante/1.0 (app personal de reservas de emergencia)' };
const CAMPOS =
  'code,product_name,product_name_es,brands,product_quantity,product_quantity_unit,quantity,nutriments,categories_tags,image_front_small_url';
const DIAS_CACHE = 30;
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
      const productos: ProductoTienda[] = [];
      for (const tipo of TIPOS) {
        productos.push(...(await buscar(t, tipo)));
        await esperar(1200);
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
