// Consultas a Open Food Facts: por código de barras y por nombre.
//
// Es una base de datos abierta y gratuita. Pide que cada app se identifique
// con un User-Agent propio; no mandamos datos del usuario. Si falla, el
// formulario se rellena a mano.
//
// En la búsqueda por código se distinguen tres casos porque al usuario le
// importa saber cuál es: si el producto no está en la base de datos no sirve
// de nada reintentar, y si no hay conexión sí.

export type DatosOFF = {
  codigo?: string;
  nombre: string;
  marca?: string;
  gramos?: number; // peso neto del envase
  litros?: number; // si el envase viene en litros (agua, leche…)
  kcal100g?: number;
  imagen?: string; // miniatura de la foto frontal
};

export type ResultadoOFF =
  | { estado: 'encontrado'; datos: DatosOFF }
  | { estado: 'no-encontrado' }
  | { estado: 'error'; detalle: string };

const CAMPOS = 'code,product_name,product_name_es,brands,product_quantity,quantity,nutriments,image_front_small_url';
const CABECERAS = { 'User-Agent': 'Aguante/1.0 (app personal de reservas de emergencia)' };

/**
 * Lee la cantidad de la etiqueta: «400 g», «1,5 L», «3 x 80 g», «33 cl»…
 * Un envase en litros devuelve también los gramos (1 mL ≈ 1 g), que es una
 * aproximación suficiente para calcular las kcal de una bebida.
 */
export function parsearCantidad(texto: string): { gramos?: number; litros?: number } {
  const t = texto.toLowerCase().replace(/,/g, '.');
  const m = t.match(/(?:(\d+)\s*[x×*]\s*)?(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|l)(?![a-z])/);
  if (!m) return {};
  const n = Number(m[2]) * (m[1] ? Number(m[1]) : 1);
  if (!(n > 0)) return {};
  if (m[3] === 'kg') return { gramos: n * 1000 };
  if (m[3] === 'g') return { gramos: n };
  const litros = m[3] === 'l' ? n : m[3] === 'cl' ? n / 100 : n / 1000;
  return { litros, gramos: Math.round(litros * 1000) };
}

type ProductoOFF = {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  brands?: string | string[];
  product_quantity?: string | number;
  quantity?: string;
  nutriments?: Record<string, unknown>;
  image_front_small_url?: string;
};

function aDatos(p: ProductoOFF, codigo?: string): DatosOFF {
  // La búsqueda por nombre devuelve las marcas como lista; la de código, como texto
  const marca = (Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(',')[0])?.trim() || undefined;
  const cantidad = parsearCantidad(p.quantity ?? '');
  const kcal = Number(p.nutriments?.['energy-kcal_100g']);
  return {
    codigo: codigo ?? p.code,
    nombre: (p.product_name_es || p.product_name || '').trim(),
    marca,
    gramos: cantidad.gramos ?? (Number(p.product_quantity) || undefined),
    litros: cantidad.litros,
    kcal100g: kcal > 0 ? kcal : undefined,
    imagen: p.image_front_small_url || undefined,
  };
}

async function pedir(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { headers: CABECERAS, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function buscarCodigo(codigo: string): Promise<ResultadoOFF> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo)}.json?fields=${CAMPOS}`;
  try {
    const res = await pedir(url, 10_000);
    // La API responde 404 con status 0 cuando el producto no existe
    if (res.status === 404) return { estado: 'no-encontrado' };
    if (!res.ok) return { estado: 'error', detalle: `el servidor respondió ${res.status}` };
    const json = await res.json();
    if (json.status !== 1 || !json.product) return { estado: 'no-encontrado' };
    return { estado: 'encontrado', datos: aDatos(json.product, codigo) };
  } catch (e) {
    const detalle = e instanceof Error && e.name === 'AbortError' ? 'tardó demasiado' : String(e);
    // Sale en la terminal de `npx expo start`, útil para depurar
    console.warn(`[Open Food Facts] ${codigo}: ${detalle}`);
    return { estado: 'error', detalle };
  }
}

/**
 * Busca productos por nombre, para sugerirlos mientras se escribe. Si falla
 * (sin conexión, servidor caído) devuelve una lista vacía: es una ayuda, no
 * algo de lo que dependa el formulario.
 */
export async function buscarNombre(texto: string): Promise<DatosOFF[]> {
  const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(texto)}&langs=es&page_size=8&fields=${CAMPOS}`;
  try {
    const res = await pedir(url, 8_000);
    if (!res.ok) return [];
    const json = await res.json();
    const hits: ProductoOFF[] = Array.isArray(json.hits) ? json.hits : [];
    // Solo sirven los que traen las calorías: es lo que venimos a buscar
    return hits.map((h) => aDatos(h)).filter((d) => d.nombre && d.kcal100g);
  } catch {
    return [];
  }
}
