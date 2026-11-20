// Plan de compra: qué falta comprar, en qué orden y cómo repartirlo en meses.
//
// Lo que entra son números ya calculados (lo que falta para el objetivo, lo
// que se gasta al día, lo que caduca): así este fichero no importa nada y los
// tests corren con `node --test` sin compilar. Las cifras y su fuente están en
// docs/fuentes-y-reglas.md («Plan de compra»). Los precios los pone cada uno:
// no hay una fuente fiable de precios medios y cambian con la tienda y el año.

// ------------------------------------------------------- Unidades de referencia

/** Garrafa de agua de 5 L. */
export const LITROS_GARRAFA = 5;
/** Bote de garbanzos cocidos, 400 g escurridos × 139 kcal/100 g (USDA FDC 173800, en genericos.ts). */
export const KCAL_BOTE = 556;
/** Paquete de 1 kg de arroz blanco crudo × 365 kcal/100 g (USDA FDC 169756, en genericos.ts). */
export const KCAL_PAQUETE = 3650;
/**
 * Agua para cocer ese kilo: 2 tazas de agua por taza de arroz (University of
 * Maryland Extension, «Cooking rice») y 185 g por taza (USDA FDC 169756,
 * porción «1 cup»). La taza de EE. UU. son 236,588 mL. Sale ≈ 2,56 L.
 */
export const LITROS_COCER_PAQUETE = Math.round(((2 * 236.588) / 185) * 100) / 100;
/**
 * [propio] Los primeros días del objetivo se cubren con comida que no hay que
 * cocinar: al principio de un apagón puede no haber cómo. Son las 72 horas
 * del objetivo de la Comisión Europea.
 */
export const DIAS_SIN_COCINAR = 3;
/** [propio] Las reposiciones se miran al menos en los 3 próximos meses, como «Rotar pronto». */
export const MESES_REPONER = 3;
/** Más de diez años de compras no se planifican. */
const MESES_MAX = 120;

// ------------------------------------------------------------------- La lista

/** Por orden de prioridad, salvo agua y comida, que van según lo que menos días dé. */
export type CategoriaCompra = 'reponer' | 'agua' | 'lista' | 'cocinar' | 'mascotas' | 'kit';
export const CATEGORIAS_COMPRA: CategoriaCompra[] = ['reponer', 'agua', 'lista', 'cocinar', 'mascotas', 'kit'];

/** Lo que da una unidad: litros de agua, kcal y el agua que gasta cocerla. */
export type Aporte = { litros?: number; kcal?: number; litrosCocer?: number };

export type Articulo = {
  /**
   * Para recordar el precio: 'agua', 'lista', 'cocinar', 'mascotas',
   * 'kit:<id>', 'reponer:<id del producto>' o 'prod:<id>' (un producto de la
   * lista de cada uno; su id es el código de barras si lo tiene).
   */
  clave: string;
  categoria: CategoriaCompra;
  unidades: number;
  /** Kit: el texto de la lista. Reponer y productos: su nombre. */
  nombre?: string;
  /** Reponer: mes en que caduca (0 = este mes). Se compra ese mes, no antes. */
  mes?: number;
  /** Reponer: el producto de la despensa; kit: el elemento; producto: su id. */
  id?: string;
  /** Agua, comida y arroz: lo que da cada unidad (para saber cuántos días suma). */
  aporte?: Aporte;
};

/** Lo que da cada unidad de referencia: garrafa, bote y paquete de arroz. */
export const APORTE_REFERENCIA: Record<TipoLista, Aporte> = {
  agua: { litros: LITROS_GARRAFA },
  lista: { kcal: KCAL_BOTE },
  cocinar: { kcal: KCAL_PAQUETE, litrosCocer: LITROS_COCER_PAQUETE },
};

/**
 * Un producto que cada uno pone en su lista (escaneado, de su despensa, de los
 * valores típicos o escrito a mano). Sin `unidades`, la app reparte lo que
 * falta entre los de su tipo; con `unidades`, las ha fijado la persona.
 */
export type Elegido = {
  /** El código de barras si lo tiene (así se reconoce al escanearlo); si no, `man:<id>`. */
  codigo: string;
  tipo: TipoLista;
  nombre: string;
  marca?: string;
  gramos?: number;
  litros?: number;
  kcal100g?: number;
  /** Kcal de una unidad, si no se sabe el peso (algo de la despensa apuntado sin etiqueta). */
  kcal?: number;
  /** Agua para cocer una unidad, si se sabe (de la despensa); si no, sale del peso. */
  litrosCocer?: number;
  unidades?: number;
  /** Lo que quiera apuntarse: «la de 8 L», «la del súper de abajo». */
  nota?: string;
};

/** Los tipos de la lista que dan días: agua, comida lista para comer y para cocinar. */
export type TipoLista = 'agua' | 'lista' | 'cocinar';

/** ¿Es un código de barras de verdad (y no el id de algo escrito a mano)? */
export const esCodigoBarras = (codigo?: string) => /^\d{6,14}$/.test(codigo ?? '');

/** A qué tipo de la lista va un producto de la despensa. Null si no es agua ni comida. */
export function tipoDe(p: { categoria: string; necesitaCocinar?: boolean }): TipoLista | null {
  if (p.categoria === 'agua') return 'agua';
  if (p.categoria !== 'comida') return null;
  return p.necesitaCocinar ? 'cocinar' : 'lista';
}

/** Lo que da una unidad de un producto de la lista. El arroz gasta agua al cocerlo, en proporción a su peso. */
export function aporteDe(e: Elegido): Aporte {
  if (e.tipo === 'agua') return { litros: e.litros ?? 0 };
  const kcal = e.kcal ?? ((e.gramos ?? 0) * (e.kcal100g ?? 0)) / 100;
  return e.tipo === 'cocinar' ? { kcal, litrosCocer: e.litrosCocer ?? ((e.gramos ?? 0) / 1000) * LITROS_COCER_PAQUETE } : { kcal };
}

export type EntradaLista = {
  faltanLitros: number;
  faltanKcal: number;
  faltanKcalMascotas: number;
  kcalDia: number;
  /** Kcal útiles que ya hay de comida que no hace falta cocinar. */
  kcalSinCocinar: number;
  objetivoDias: number;
  /** El escenario no deja cocinar: toda la comida, lista para comer. */
  sinCocina: boolean;
  /** Lo que falta del kit (sin marcar). */
  kit: { id: string; que: string }[];
  /** Lo que caduca dentro del plan y hay que reponer. */
  reponer: { id: string; nombre: string; unidades: number; mes: number }[];
};

/** Lo que falta de cada tipo: litros de agua (con la de cocer lo que se compra) y kcal. */
export type Necesidad = Record<TipoLista, number>;

/**
 * Qué hay que comprar para llegar al objetivo. Con productos en la lista de
 * cada uno, la necesidad de su tipo se cubre con ellos; lo que no cubran (o
 * todo, si no hay ninguno) va en unidades de referencia.
 */
export function listaCompra(e: EntradaLista, elegidos: Elegido[] = []): Articulo[] {
  return calcularLista(e, elegidos).articulos;
}

/** Lo que falta de agua, comida lista y comida para cocinar, para enseñarlo encima de cada parte de la lista. */
export function necesidades(e: EntradaLista, elegidos: Elegido[] = []): Necesidad {
  return calcularLista(e, elegidos).necesidad;
}

function calcularLista(e: EntradaLista, elegidos: Elegido[]): { articulos: Articulo[]; necesidad: Necesidad } {
  const kcalListaObjetivo = e.sinCocina ? Infinity : Math.min(e.objetivoDias, DIAS_SIN_COCINAR) * e.kcalDia;
  const faltaLista = Math.min(e.faltanKcal, Math.max(0, kcalListaObjetivo - e.kcalSinCocinar));
  const faltaCocinar = Math.max(0, e.faltanKcal - faltaLista);
  // Sin cocina no se propone nada que haya que cocinar, aunque esté en la lista
  const usables = e.sinCocina ? elegidos.filter((x) => x.tipo !== 'cocinar') : elegidos;
  const lista = cubrir('lista', faltaLista, usables);
  const cocinar = cubrir('cocinar', faltaCocinar, usables);
  // El arroz que se compra también necesita agua para cocerlo
  const litrosCocer = [...cocinar.articulos, cocinar.referencia].reduce(
    (s, a) => s + a.unidades * (a.aporte?.litrosCocer ?? 0),
    0,
  );
  const faltaAgua = e.faltanLitros + litrosCocer;
  const agua = cubrir('agua', faltaAgua, usables);
  const salida: Articulo[] = [
    ...e.reponer.map(
      (r): Articulo => ({ clave: `reponer:${r.id}`, categoria: 'reponer', unidades: r.unidades, nombre: r.nombre, mes: r.mes, id: r.id }),
    ),
    ...agua.articulos,
    agua.referencia,
    ...lista.articulos,
    lista.referencia,
    ...cocinar.articulos,
    cocinar.referencia,
    // La comida de mascotas cambia mucho de una marca a otra: va como un lote
    { clave: 'mascotas', categoria: 'mascotas', unidades: e.faltanKcalMascotas > 0 ? 1 : 0 },
    ...e.kit.map((k): Articulo => ({ clave: `kit:${k.id}`, categoria: 'kit', unidades: 1, nombre: k.que, id: k.id })),
  ];
  return {
    articulos: salida.filter((a) => a.unidades > 0),
    necesidad: { agua: faltaAgua, lista: faltaLista, cocinar: e.sinCocina ? 0 : faltaCocinar },
  };
}

/**
 * Cubre `necesidad` (kcal o litros) con los productos de la lista de ese tipo. Primero
 * cuentan los que tienen las unidades fijadas; lo que falte se reparte de una
 * en una entre los demás, al que menos lleve, para que haya variedad. Si no
 * queda ninguno sin fijar, lo que falte va en unidades de referencia.
 */
function cubrir(
  tipo: TipoLista,
  necesidad: number,
  elegidos: Elegido[],
): { articulos: Articulo[]; referencia: Articulo } {
  const valor = (x: Elegido) => (tipo === 'agua' ? (aporteDe(x).litros ?? 0) : (aporteDe(x).kcal ?? 0));
  const deTipo = elegidos.filter((x) => x.tipo === tipo && valor(x) > 0);
  const unidades = new Map<string, number>();
  let falta = necesidad;
  for (const x of deTipo) {
    if (x.unidades === undefined) continue;
    unidades.set(x.codigo, x.unidades);
    falta -= x.unidades * valor(x);
  }
  const libres = deTipo.filter((x) => x.unidades === undefined);
  const llevado = new Map(libres.map((x) => [x.codigo, 0]));
  while (falta > 1e-9 && libres.length > 0) {
    const x = libres.reduce((menor, y) => ((llevado.get(y.codigo) ?? 0) < (llevado.get(menor.codigo) ?? 0) ? y : menor));
    unidades.set(x.codigo, (unidades.get(x.codigo) ?? 0) + 1);
    llevado.set(x.codigo, (llevado.get(x.codigo) ?? 0) + valor(x));
    falta -= valor(x);
  }
  const ref = APORTE_REFERENCIA[tipo];
  const porRef = tipo === 'agua' ? (ref.litros ?? 1) : (ref.kcal ?? 1);
  return {
    articulos: deTipo
      .filter((x) => (unidades.get(x.codigo) ?? 0) > 0)
      .map((x) => ({
        clave: `prod:${x.codigo}`,
        categoria: tipo,
        unidades: unidades.get(x.codigo) ?? 0,
        nombre: x.nombre,
        id: x.codigo,
        aporte: aporteDe(x),
      })),
    referencia: { clave: tipo, categoria: tipo, unidades: Math.max(0, Math.ceil(falta / porRef - 1e-9)), aporte: ref },
  };
}

/** Quita los ceros de delante: un mismo código se lee con ellos o sin ellos según el lector. */
const sinCeros = (c: string) => c.trim().replace(/^0+/, '');

/**
 * A qué línea de la lista corresponde un producto que se acaba de añadir a la
 * despensa: el mismo producto (por código de barras) o, si no, lo genérico de
 * su tipo (agua, comida lista, para cocinar, mascotas). Null si no está en la
 * lista. `exacto` dice si es el mismo producto.
 */
export function lineaDe(
  p: { codigo?: string; categoria: string; necesitaCocinar?: boolean },
  articulos: Articulo[],
): { clave: string; exacto: boolean } | null {
  if (p.codigo) {
    const a = articulos.find((x) => x.clave.startsWith('prod:') && sinCeros(x.id ?? '') === sinCeros(p.codigo ?? ''));
    if (a) return { clave: a.clave, exacto: true };
  }
  const tipo = p.categoria === 'mascota' ? 'mascotas' : (tipoDe(p) ?? 'lista');
  const a = articulos.find((x) => x.categoria === tipo);
  return a ? { clave: a.clave, exacto: false } : null;
}

/** Mes de una fecha AAAA-MM-DD contado desde el de `hoy` (0 = este mes). */
export function mesDe(fechaISO: string, hoy: Date): number {
  const [a, m] = fechaISO.split('-').map(Number);
  return (a - hoy.getFullYear()) * 12 + (m - 1 - hoy.getMonth());
}

/** Año y mes (1–12) del mes `indice` contado desde el de `hoy`. */
export function mesReal(indice: number, hoy: Date): { anio: number; mes: number } {
  const n = hoy.getFullYear() * 12 + hoy.getMonth() + indice;
  return { anio: Math.floor(n / 12), mes: (n % 12) + 1 };
}

/**
 * Lo de la despensa que caduca antes de que acabe el mes `hastaMes` (contado
 * desde este) y hay que reponer: se compra en el mes en que caduca. Lo ya
 * caducado no: eso sale en «Rotar pronto».
 */
export function porReponer(
  productos: { id: string; nombre: string; cantidad: number; caducidad?: string }[],
  hoy: Date,
  hastaMes: number,
): EntradaLista['reponer'] {
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  return productos
    .filter((p) => p.cantidad > 0 && p.caducidad && p.caducidad >= hoyISO && mesDe(p.caducidad, hoy) < hastaMes)
    .sort((a, b) => (a.caducidad ?? '').localeCompare(b.caducidad ?? ''))
    .map((p) => ({ id: p.id, nombre: p.nombre, unidades: Math.ceil(p.cantidad - 1e-9), mes: mesDe(p.caducidad ?? '', hoy) }));
}

// ------------------------------------------------------------------ El reparto

export type Linea = { clave: string; unidades: number; coste: number };
export type MesPlan = { indice: number; lineas: Linea[]; coste: number };

export type Plan = {
  meses: MesPlan[];
  /** Artículos sin precio: no entran en el plan hasta que se ponga. */
  sinPrecio: string[];
  /** Artículos que cuestan más que el presupuesto de un mes. */
  noCaben: string[];
  /** Mes (índice) en que se llega a los días del objetivo, o null si no hay nada de eso que comprar. */
  mesDias: number | null;
  /** Mes en que acaba todo el plan, kit y reposiciones incluidos. */
  mesFin: number | null;
  total: number;
  /** Harían falta más de diez años. */
  demasiado: boolean;
};

export type Dias = {
  agua: number;
  comida: number;
  /** Días que da un litro de agua y una kcal de comida. */
  porLitro: number;
  porKcal: number;
};

const redondear = (n: number) => Math.round(n * 100) / 100;
const precioDe = (precios: Record<string, number>, clave: string) => {
  const p = precios[clave];
  return Number.isFinite(p) && p > 0 ? p : undefined;
};

/**
 * Reparte la lista en meses sin pasarse del presupuesto. El orden: primero lo
 * que hay que reponer ese mes; luego agua o comida, lo que menos días dé en
 * ese momento (y, en la comida, antes lo que no hay que cocinar); después la
 * comida de las mascotas y el kit. Si lo que toca no cabe en lo que queda del
 * mes, entra lo siguiente que quepa. Este mes cuenta lo que ya se ha gastado.
 */
export function repartir(o: {
  articulos: Articulo[];
  precios: Record<string, number>;
  presupuesto: number;
  gastadoEsteMes?: number;
  dias: Dias;
}): Plan {
  const sinPrecio: string[] = [];
  const noCaben: string[] = [];
  const quedan = new Map<string, number>();
  const precio = new Map<string, number>();
  for (const a of o.articulos) {
    const p = precioDe(o.precios, a.clave);
    if (p === undefined) sinPrecio.push(a.clave);
    else if (p > o.presupuesto + 1e-9) noCaben.push(a.clave);
    else {
      quedan.set(a.clave, a.unidades);
      precio.set(a.clave, p);
    }
  }
  const porClave = new Map(o.articulos.map((a) => [a.clave, a]));
  const deDias = (c: string) => ['agua', 'lista', 'cocinar', 'mascotas'].includes(porClave.get(c)?.categoria ?? '');
  const total = redondear([...quedan].reduce((s, [c, n]) => s + n * (precio.get(c) ?? 0), 0));

  let agua = o.dias.agua;
  let comida = o.dias.comida;
  const meses: MesPlan[] = [];
  let mesDias: number | null = null;
  let mesFin: number | null = null;
  let demasiado = false;

  const pendientes = () => [...quedan].some(([, n]) => n > 0);
  for (let indice = 0; pendientes(); indice++) {
    if (indice >= MESES_MAX) {
      demasiado = true;
      break;
    }
    let libre = o.presupuesto - (indice === 0 ? (o.gastadoEsteMes ?? 0) : 0);
    const lineas = new Map<string, Linea>();
    for (;;) {
      const candidatos = ordenCandidatos(o.articulos, quedan, indice, agua <= comida);
      const elegido = candidatos.find((c) => (precio.get(c) ?? Infinity) <= libre + 1e-9);
      if (!elegido) break;
      const p = precio.get(elegido) ?? 0;
      const l = lineas.get(elegido) ?? { clave: elegido, unidades: 0, coste: 0 };
      l.unidades++;
      l.coste += p;
      lineas.set(elegido, l);
      libre -= p;
      quedan.set(elegido, (quedan.get(elegido) ?? 0) - 1);
      const a = porClave.get(elegido);
      const aporte = a?.aporte ?? (a && a.categoria in APORTE_REFERENCIA ? APORTE_REFERENCIA[a.categoria as 'agua'] : {});
      agua += ((aporte.litros ?? 0) - (aporte.litrosCocer ?? 0)) * o.dias.porLitro;
      comida += (aporte.kcal ?? 0) * o.dias.porKcal;
    }
    if (lineas.size > 0) {
      const ls = [...lineas.values()].map((l) => ({ ...l, coste: redondear(l.coste) }));
      meses.push({ indice, lineas: ls, coste: redondear(ls.reduce((s, l) => s + l.coste, 0)) });
      mesFin = indice;
      if (ls.some((l) => deDias(l.clave))) mesDias = indice;
    }
  }
  return { meses, sinPrecio, noCaben, mesDias, mesFin, total, demasiado };
}

/** Lo que se puede comprar en el mes `indice`, por orden de prioridad. */
function ordenCandidatos(articulos: Articulo[], quedan: Map<string, number>, indice: number, primeroAgua: boolean): string[] {
  const hay = (a: Articulo) => (quedan.get(a.clave) ?? 0) > 0;
  const de = (cat: CategoriaCompra) => articulos.filter((a) => a.categoria === cat && hay(a));
  const reponer = de('reponer')
    .filter((a) => (a.mes ?? 0) <= indice)
    .sort((a, b) => (a.mes ?? 0) - (b.mes ?? 0));
  const nucleo = primeroAgua ? ['agua', 'lista', 'cocinar'] : ['lista', 'cocinar', 'agua'];
  return [
    ...reponer,
    ...nucleo.flatMap((c) => de(c as CategoriaCompra)),
    ...de('mascotas'),
    ...de('kit'),
  ].map((a) => a.clave);
}

/**
 * El otro sentido: cuánto hay que apartar al mes para acabar la lista en
 * `meses` meses (este incluido). Busca, en céntimos, el presupuesto más bajo
 * con el que el reparto acaba a tiempo. Null si no hay nada con precio.
 */
export function presupuestoParaMeses(
  o: { articulos: Articulo[]; precios: Record<string, number>; gastadoEsteMes?: number; dias: Dias },
  meses: number,
): { presupuesto: number; plan: Plan } | null {
  const conPrecio = o.articulos.filter((a) => precioDe(o.precios, a.clave) !== undefined);
  if (conPrecio.length === 0) return null;
  const total = conPrecio.reduce((s, a) => s + a.unidades * (precioDe(o.precios, a.clave) ?? 0), 0);
  const caro = Math.max(...conPrecio.map((a) => precioDe(o.precios, a.clave) ?? 0));
  const n = Math.max(1, Math.floor(meses));
  const acaba = (p: Plan) => !p.demasiado && p.noCaben.length === 0 && (p.mesFin ?? -1) < n;
  const probar = (centimos: number) => repartir({ ...o, presupuesto: centimos / 100 });
  // Con todo el total (más lo gastado) en un mes siempre acaba este mes
  let bajo = Math.max(1, Math.floor((total / n) * 100) - 1);
  let alto = Math.ceil((total + caro + (o.gastadoEsteMes ?? 0)) * 100);
  while (bajo < alto) {
    const medio = Math.floor((bajo + alto) / 2);
    if (acaba(probar(medio))) alto = medio;
    else bajo = medio + 1;
  }
  return { presupuesto: alto / 100, plan: probar(alto) };
}

/** Lo gastado en el mes `indice` (contado desde el de `hoy`). */
export function gastadoEnMes(hechas: { fecha: string; coste: number }[], indice: number, hoy: Date): number {
  return redondear(hechas.filter((h) => mesDe(h.fecha, hoy) === indice).reduce((s, h) => s + h.coste, 0));
}

/** Próximos días de recordatorio (día `dia` de cada mes a las 10:00), desde `ahora`. */
export function proximosRecordatorios(dia: number, ahora: Date, cuantos = 3): Date[] {
  const d = Math.min(28, Math.max(1, Math.round(dia)));
  const fechas: Date[] = [];
  for (let i = 0; fechas.length < cuantos && i < cuantos + 1; i++) {
    const f = new Date(ahora.getFullYear(), ahora.getMonth() + i, d, 10, 0, 0);
    if (f.getTime() > ahora.getTime()) fechas.push(f);
  }
  return fechas;
}
