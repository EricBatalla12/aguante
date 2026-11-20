// Productos de las tiendas de cada uno, para proponer una lista de la compra
// concreta: conservas, arroz y agua que la gente ha escaneado en esa cadena
// en Open Food Facts. No dice si hay existencias ni el precio: Open Food
// Facts no lo sabe, y Open Prices casi no tiene precios de conservas en
// España (mirado el 20/11/2026: ninguna de 20 conservas de Mercadona).
//
// No importa nada: los tests corren con `node --test` sin compilar.

/** Para qué sirve en el plan: agua, comida lista para comer o para cocinar. */
export type TipoTienda = 'agua' | 'lista' | 'cocinar';

export type ProductoTienda = {
  codigo: string;
  nombre: string;
  marca?: string;
  tipo: TipoTienda;
  /** Cadenas en las que se ha visto (el `stores_tags` de Open Food Facts). */
  tiendas: string[];
  gramos?: number;
  litros?: number;
  kcal100g?: number;
  imagen?: string;
};

/** La categoría de Open Food Facts que se busca para cada tipo. */
export const CATEGORIA_OFF: Record<TipoTienda, string> = {
  lista: 'en:canned-foods',
  cocinar: 'en:rices',
  agua: 'en:waters',
};

// [propio] Lo que se queda fuera de la propuesta:
// - Conservas con menos de 80 kcal/100 g (pepinillos, champiñones,
//   pimientos…): llenan la despensa y apenas dan energía.
// - Arroz con menos de 300 kcal/100 g (el ya cocido o los platos hechos):
//   para cocinar se cuenta arroz crudo, que es del que sale el agua de cocerlo
//   (ver LITROS_COCER_PAQUETE en compra.ts).
// - Agua con gas o con sabor, y botellas de menos de 1,5 L.
export const KCAL_MIN_LISTA = 80;
export const KCAL_MIN_COCINAR = 300;
export const LITROS_MIN_AGUA = 1.5;

/** «El Corte Inglés» → «el-corte-ingles», como los `stores_tags` de Open Food Facts. */
export function etiquetaTienda(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type ProductoOFF = {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  brands?: string | string[];
  product_quantity?: number | string;
  product_quantity_unit?: string;
  quantity?: string;
  categories_tags?: string[];
  nutriments?: Record<string, number | string | undefined>;
  image_front_small_url?: string;
};

/** Cantidad del envase: en gramos o en litros. Primero el campo numérico; si no, el texto («420 gr neto»). */
export function cantidadDe(p: ProductoOFF): { gramos?: number; litros?: number } {
  const n = Number(p.product_quantity);
  const unidad = (p.product_quantity_unit ?? '').toLowerCase();
  if (Number.isFinite(n) && n > 0) {
    if (unidad === 'g') return { gramos: n };
    if (unidad === 'kg') return { gramos: n * 1000 };
    if (unidad === 'ml') return { litros: n / 1000 };
    if (unidad === 'cl') return { litros: n / 100 };
    if (unidad === 'l') return { litros: n };
  }
  const m = (p.quantity ?? '').toLowerCase().replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(kg|gramos|gr|g|ml|cl|l)\b/);
  if (!m) return {};
  const v = Number(m[1]);
  if (!(v > 0)) return {};
  if (m[2] === 'kg') return { gramos: v * 1000 };
  if (m[2] === 'g' || m[2] === 'gr' || m[2] === 'gramos') return { gramos: v };
  if (m[2] === 'ml') return { litros: v / 1000 };
  if (m[2] === 'cl') return { litros: v / 100 };
  return { litros: v };
}

/**
 * Lee la respuesta de una búsqueda de Open Food Facts y se queda con lo que
 * sirve para ese tipo. Vale para las dos: la clásica (`products`) y
 * search.openfoodfacts.org (`hits`, con las marcas en una lista).
 */
export function leerCatalogo(json: unknown, tienda: string, tipo: TipoTienda): ProductoTienda[] {
  const r = json as { products?: ProductoOFF[]; hits?: ProductoOFF[] };
  const productos = r?.products ?? r?.hits;
  if (!Array.isArray(productos)) return [];
  const salida: ProductoTienda[] = [];
  for (const p of productos) {
    const codigo = String(p.code ?? '').trim();
    const nombre = (p.product_name_es || p.product_name || '').trim();
    if (!/^\d{8,14}$/.test(codigo) || !nombre) continue;
    const { gramos, litros } = cantidadDe(p);
    const kcal = Number(p.nutriments?.['energy-kcal_100g']);
    const categorias = p.categories_tags ?? [];
    const base = {
      codigo,
      nombre,
      marca: (Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(',')[0])?.trim() || undefined,
      tipo,
      tiendas: [tienda],
      imagen: p.image_front_small_url || undefined,
    };
    if (tipo === 'agua') {
      if (!litros || litros < LITROS_MIN_AGUA) continue;
      if (categorias.some((c) => /carbonated|flavou?red|sparkling/.test(c))) continue;
      if (/\bgas\b|gaseosa|sabor/i.test(nombre) && !/sin gas/i.test(nombre)) continue;
      salida.push({ ...base, litros });
      continue;
    }
    const minimo = tipo === 'lista' ? KCAL_MIN_LISTA : KCAL_MIN_COCINAR;
    if (!gramos || !(kcal >= minimo)) continue;
    if (tipo === 'cocinar' && gramos < 250) continue;
    if (gramos > 5000) continue;
    salida.push({ ...base, gramos, kcal100g: kcal });
  }
  return salida;
}

/** Junta los catálogos de varias tiendas: un mismo producto, una vez, con todas sus tiendas. */
export function juntarCatalogos(listas: ProductoTienda[][]): ProductoTienda[] {
  const porCodigo = new Map<string, ProductoTienda>();
  for (const lista of listas) {
    for (const p of lista) {
      const clave = `${p.tipo}:${p.codigo}`;
      const ya = porCodigo.get(clave);
      if (ya) ya.tiendas = [...new Set([...ya.tiendas, ...p.tiendas])];
      else porCodigo.set(clave, { ...p, tiendas: [...p.tiendas] });
    }
  }
  return [...porCodigo.values()];
}
