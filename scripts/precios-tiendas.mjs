// Copia semanal de productos y precios de la tienda online de Mercadona a
// Supabase (tabla `precios_tienda`), para que la app proponga la lista de la
// compra con precio. Lo lanza GitHub Actions una vez a la semana
// (.github/workflows/precios.yml).
//
// Mercadona contestó el 20/11/2026, por su chat de atención al cliente, que se
// puede usar la información publicada en sus canales oficiales. Para pedir lo
// menos posible:
// - Cada semana, una petición por sección (conservas de pescado, mejillones,
//   legumbres, arroz y agua): ahí vienen el precio, el peso y si está a la venta.
// - El detalle de un producto (para el código de barras) solo se pide la
//   primera vez que aparece; después se lee de Supabase.
// - Las calorías no las da Mercadona: salen de Open Food Facts por el código
//   de barras, también solo la primera vez.
// Entre petición y petición se espera, para no cargar a nadie.
//
// Uso: node scripts/precios-tiendas.mjs [--solo=156]
// Sin la variable PRECIOS_TOKEN no escribe nada: enseña lo que cargaría.

import { KCAL_MIN_COCINAR, KCAL_MIN_LISTA, LITROS_MIN_AGUA } from '../src/lib/catalogo.ts';

const SUPABASE = 'https://dndvwxfnaqdivcttxwku.supabase.co';
const CLAVE_PUBLICABLE = 'sb_publishable_2ExGbQV4Bzbv5YvRhjzq7w_EWEv35IL';
const TOKEN = process.env.PRECIOS_TOKEN;
const MERCADONA = 'https://tienda.mercadona.es/api';
const CABECERAS = { 'User-Agent': 'Aguante/1.0 (app de reserva de emergencia; una consulta a la semana)' };

// Secciones de la tienda online y para qué sirven en el plan
const SECCIONES = [
  { id: 122, tipo: 'lista' }, // Atún y otras conservas de pescado
  { id: 123, tipo: 'lista' }, // Berberechos y mejillones
  { id: 121, tipo: 'lista' }, // Legumbres (las cocidas; las secas se quedan fuera por las kcal)
  { id: 118, tipo: 'cocinar' }, // Arroz
  { id: 156, tipo: 'agua' }, // Agua
];

const solo = process.argv.find((a) => a.startsWith('--solo='))?.slice(7);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(url, cabeceras = CABECERAS) {
  for (let intento = 0; intento < 3; intento++) {
    const r = await fetch(url, { headers: cabeceras });
    if (r.ok) return r.json();
    if (r.status === 404) return null;
    if (r.status !== 429 && r.status < 500) throw new Error(`${url}: HTTP ${r.status}`);
    await esperar(10_000 * (intento + 1));
  }
  throw new Error(`${url}: sin respuesta`);
}

/** Lo que ya está en Supabase: el código de barras, la marca y las kcal no se vuelven a pedir. */
async function guardados() {
  const r = await json(`${SUPABASE}/rest/v1/precios_tienda?tienda=eq.mercadona&select=id,ean,marca,kcal100g`, {
    apikey: CLAVE_PUBLICABLE,
    Authorization: `Bearer ${CLAVE_PUBLICABLE}`,
  });
  return new Map((r ?? []).map((f) => [f.id, f]));
}

/** Los productos de una sección (vienen agrupados en subsecciones). */
function productosDe(seccion) {
  const grupos = seccion?.categories ?? [];
  return [...(seccion?.products ?? []), ...grupos.flatMap((g) => g.products ?? [])];
}

/** Peso o volumen de lo que se vende (la unidad, o el pack entero). */
function cantidad(pi) {
  const t = Number(pi?.unit_size);
  if (!(t > 0)) return {};
  if (pi.size_format === 'kg') return { gramos: Math.round(t * 1000) };
  if (pi.size_format === 'l') return { litros: t };
  return {};
}

async function main() {
  const ya = await guardados();
  console.log(`En Supabase: ${ya.size} productos de Mercadona`);
  const filas = [];
  for (const s of SECCIONES) {
    if (solo && String(s.id) !== solo) continue;
    const seccion = await json(`${MERCADONA}/categories/${s.id}/?lang=es`);
    await esperar(3000);
    const productos = productosDe(seccion);
    console.log(`Sección ${s.id} (${seccion?.name ?? '?'}): ${productos.length} productos`);
    for (const p of productos) {
      const pi = p.price_instructions ?? {};
      const precio = Number(pi.unit_price);
      if (!(precio > 0)) continue;
      filas.push({
        id: String(p.id),
        tipo: s.tipo,
        nombre: p.display_name,
        precio,
        ...cantidad(pi),
        publicado: p.published !== false && !p.unavailable_from,
        enlace: p.share_url,
        ean: ya.get(String(p.id))?.ean ?? undefined,
        marca: ya.get(String(p.id))?.marca ?? undefined,
        kcal100g: ya.get(String(p.id))?.kcal100g ?? undefined,
      });
    }
  }

  // Detalle (código de barras y marca), solo de lo nuevo
  const sinCodigo = filas.filter((f) => !f.ean);
  console.log(`Detalle de ${sinCodigo.length} productos nuevos`);
  for (const f of sinCodigo) {
    const d = await json(`${MERCADONA}/products/${f.id}/?lang=es`);
    if (d?.ean && /^\d{8,14}$/.test(d.ean)) f.ean = d.ean;
    f.marca = d?.brand || d?.details?.brand || f.marca;
    await esperar(1500);
  }

  // Calorías de Open Food Facts, solo de lo que aún no las tiene
  const sinKcal = filas.filter((f) => f.ean && f.kcal100g === undefined && f.tipo !== 'agua');
  console.log(`Calorías de ${sinKcal.length} productos en Open Food Facts`);
  for (const f of sinKcal) {
    const o = await json(`https://world.openfoodfacts.org/api/v2/product/${f.ean}.json?fields=nutriments`);
    const kcal = Number(o?.product?.nutriments?.['energy-kcal_100g']);
    if (kcal >= 0 && o?.status === 1) f.kcal100g = kcal;
    await esperar(700);
  }

  // Lo mismo que filtra la app (src/lib/catalogo.ts)
  const validas = filas.filter((f) => {
    if (f.tipo === 'agua') return f.litros >= LITROS_MIN_AGUA && !(/\bgas\b|sabor/i.test(f.nombre) && !/sin gas/i.test(f.nombre));
    if (!(f.gramos > 0) || f.kcal100g === undefined) return false;
    if (f.tipo === 'cocinar') return f.kcal100g >= KCAL_MIN_COCINAR && f.gramos >= 250;
    return f.kcal100g >= KCAL_MIN_LISTA;
  });
  console.log(`Válidas: ${validas.length} de ${filas.length}`);

  if (!TOKEN) {
    console.log('Sin PRECIOS_TOKEN: no se escribe. Ejemplo:', JSON.stringify(validas.slice(0, 3), null, 1));
    return;
  }
  if (solo) throw new Error('Con --solo no se escribe: marcaría como retirado todo lo demás');
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/cargar_precios`, {
    method: 'POST',
    headers: { apikey: CLAVE_PUBLICABLE, Authorization: `Bearer ${CLAVE_PUBLICABLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: TOKEN, p_tienda: 'mercadona', p_filas: validas }),
  });
  if (!r.ok) throw new Error(`Supabase: HTTP ${r.status} ${await r.text()}`);
  console.log(`Cargadas en Supabase: ${await r.text()}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
