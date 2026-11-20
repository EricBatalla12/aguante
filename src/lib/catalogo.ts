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
  /** Solo de las tiendas con precios cargados (tabla `precios_tienda`): el de la tienda online, su enlace y de cuándo es. */
  precio?: number;
  enlace?: string;
  fecha?: string;
};

/** Una fila de `precios_tienda` (Supabase), como producto de la tienda. Null si no sirve. */
export function deFilaPrecio(f: {
  tienda: string;
  id: string;
  ean?: string | null;
  nombre: string;
  marca?: string | null;
  tipo: string;
  gramos?: number | string | null;
  litros?: number | string | null;
  kcal100g?: number | string | null;
  precio: number | string;
  enlace?: string | null;
  actualizado?: string;
}): ProductoTienda | null {
  if (f.tipo !== 'agua' && f.tipo !== 'lista' && f.tipo !== 'cocinar') return null;
  if (f.tipo === 'agua' && !esAguaParaBeber(f.nombre)) return null;
  const num = (x: unknown) => (x === null || x === undefined || x === '' ? undefined : Number(x));
  const precio = num(f.precio);
  if (!(precio && precio > 0)) return null;
  return {
    // Sin código de barras (pasa con alguna agua) se usa el de la tienda: no se reconocerá al escanear
    codigo: f.ean || `${f.tienda}-${f.id}`,
    nombre: f.nombre,
    marca: f.marca || undefined,
    tipo: f.tipo,
    tiendas: [f.tienda],
    gramos: num(f.gramos),
    litros: num(f.litros),
    kcal100g: num(f.kcal100g),
    precio,
    enlace: f.enlace || undefined,
    fecha: f.actualizado?.slice(0, 10),
  };
}

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

/** Por el nombre, ¿es agua para beber? Fuera la que tiene gas o sabor, y las gaseosas y tónicas. */
export function esAguaParaBeber(nombre: string): boolean {
  if (/sin gas/i.test(nombre)) return !/sabor/i.test(nombre);
  return !/\bgas\b|gaseosa|sabor|t[oó]nica/i.test(nombre);
}

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
      if (!esAguaParaBeber(nombre)) continue;
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

/**
 * Las cadenas de los supermercados cercanos, de una respuesta de Overpass
 * (OpenStreetMap): por la marca (`brand`) o, si no la tiene, por el nombre.
 * Las conocidas (`cadenas`) salen con su nombre de siempre; de más a menos
 * tiendas. Las que no tienen ni marca ni nombre se saltan.
 */
export function cadenasDeOsm(
  json: unknown,
  cadenas: { clave: string; nombre: string }[],
): { clave: string; nombre: string; tiendas: number }[] {
  const elementos = (json as { elements?: { tags?: Record<string, string> }[] })?.elements;
  if (!Array.isArray(elementos)) return [];
  const cuenta = new Map<string, { clave: string; nombre: string; tiendas: number }>();
  for (const e of elementos) {
    const nombre = (e.tags?.brand || e.tags?.name || '').trim();
    if (!nombre) continue;
    const clave = etiquetaTienda(nombre);
    if (!clave) continue;
    // «Mercadona Ruzafa», «Supermercados Dia»: se reconoce la cadena dentro del nombre
    const conocida = cadenas.find((c) => clave === c.clave || clave.split('-').includes(c.clave) || clave.startsWith(`${c.clave}-`));
    const final = conocida ?? { clave, nombre };
    const ya = cuenta.get(final.clave);
    if (ya) ya.tiendas++;
    else cuenta.set(final.clave, { clave: final.clave, nombre: final.nombre, tiendas: 1 });
  }
  return [...cuenta.values()].sort((a, b) => b.tiendas - a.tiendas || a.nombre.localeCompare(b.nombre));
}
