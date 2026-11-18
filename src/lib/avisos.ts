// Avisos oficiales: lectura de los RSS de AEMET (avisos meteorológicos y
// noticias), del IGN (terremotos) y de GDACS (desastres en el mundo), el
// filtro por la provincia de cada casa y el historial de la pestaña
// Actualidad.
//
// Solo fuentes oficiales y nada de prensa: ver docs/fuentes-y-reglas.md,
// «Avisos oficiales». Este fichero no importa nada: los tests lo ejecutan con
// `node --test` sin compilar. El XML se lee con expresiones regulares porque
// en React Native no hay DOMParser y los tres RSS son sencillos y estables.

// ------------------------------------------------------------- Direcciones

const AEMET_RSS = 'https://www.aemet.es/documentos_d/eltiempo/prediccion/avisos/rss/CAP_AFAC{ccaa}_RSS.xml';
export const IGN_RSS = 'https://www.ign.es/ign/RssTools/sismologia.xml';
export const GDACS_RSS = 'https://www.gdacs.org/xml/rss.xml';
export const AEMET_WEB = 'https://www.aemet.es/es/eltiempo/prediccion/avisos';
export const IGN_WEB = 'https://www.ign.es/web/ign/portal/ultimos-terremotos';
export const GDACS_WEB = 'https://www.gdacs.org/';

export const urlAemet = (ccaa: string) => AEMET_RSS.replace('{ccaa}', ccaa);

// ------------------------------------------------------------- Provincias

export type Provincia = {
  ine: string; // código INE de dos cifras
  nombre: string;
  ccaa: string; // código de comunidad de AEMET (61–79), el del RSS
  matricula: string[]; // como acaba el lugar en el RSS del IGN («TABOADA.LU»)
};

/**
 * Comunidades de AEMET. Los códigos salen de sus RSS (CAP_AFAC61…79). En
 * Baleares y Canarias las zonas no llevan el código INE de la provincia (van
 * por islas), así que allí se enseña toda la comunidad.
 */
export const COMUNIDADES: Record<string, { nombre: string; porIslas?: boolean }> = {
  '61': { nombre: 'Andalucía' },
  '62': { nombre: 'Aragón' },
  '63': { nombre: 'Asturias' },
  '64': { nombre: 'Illes Balears', porIslas: true },
  '65': { nombre: 'Canarias', porIslas: true },
  '66': { nombre: 'Cantabria' },
  '67': { nombre: 'Castilla y León' },
  '68': { nombre: 'Castilla-La Mancha' },
  '69': { nombre: 'Cataluña' },
  '70': { nombre: 'Extremadura' },
  '71': { nombre: 'Galicia' },
  '72': { nombre: 'Comunidad de Madrid' },
  '73': { nombre: 'Región de Murcia' },
  '74': { nombre: 'Navarra' },
  '75': { nombre: 'País Vasco' },
  '76': { nombre: 'La Rioja' },
  '77': { nombre: 'Comunitat Valenciana' },
  '78': { nombre: 'Ceuta' },
  '79': { nombre: 'Melilla' },
};

const P = (ine: string, nombre: string, ccaa: string, ...matricula: string[]): Provincia => ({ ine, nombre, ccaa, matricula });

export const PROVINCIAS: Provincia[] = [
  P('04', 'Almería', '61', 'AL'),
  P('11', 'Cádiz', '61', 'CA'),
  P('14', 'Córdoba', '61', 'CO'),
  P('18', 'Granada', '61', 'GR'),
  P('21', 'Huelva', '61', 'H'),
  P('23', 'Jaén', '61', 'J'),
  P('29', 'Málaga', '61', 'MA'),
  P('41', 'Sevilla', '61', 'SE'),
  P('22', 'Huesca', '62', 'HU'),
  P('44', 'Teruel', '62', 'TE'),
  P('50', 'Zaragoza', '62', 'Z'),
  P('33', 'Asturias', '63', 'O'),
  P('07', 'Illes Balears', '64', 'IB', 'PM'),
  P('35', 'Las Palmas', '65', 'GC', 'LP'),
  P('38', 'Santa Cruz de Tenerife', '65', 'TF'),
  P('39', 'Cantabria', '66', 'S'),
  P('05', 'Ávila', '67', 'AV'),
  P('09', 'Burgos', '67', 'BU'),
  P('24', 'León', '67', 'LE'),
  P('34', 'Palencia', '67', 'P'),
  P('37', 'Salamanca', '67', 'SA'),
  P('40', 'Segovia', '67', 'SG'),
  P('42', 'Soria', '67', 'SO'),
  P('47', 'Valladolid', '67', 'VA'),
  P('49', 'Zamora', '67', 'ZA'),
  P('02', 'Albacete', '68', 'AB'),
  P('13', 'Ciudad Real', '68', 'CR'),
  P('16', 'Cuenca', '68', 'CU'),
  P('19', 'Guadalajara', '68', 'GU'),
  P('45', 'Toledo', '68', 'TO'),
  P('08', 'Barcelona', '69', 'B'),
  P('17', 'Girona', '69', 'GI'),
  P('25', 'Lleida', '69', 'L'),
  P('43', 'Tarragona', '69', 'T'),
  P('06', 'Badajoz', '70', 'BA'),
  P('10', 'Cáceres', '70', 'CC'),
  P('15', 'A Coruña', '71', 'C'),
  P('27', 'Lugo', '71', 'LU'),
  P('32', 'Ourense', '71', 'OU'),
  P('36', 'Pontevedra', '71', 'PO'),
  P('28', 'Madrid', '72', 'M'),
  P('30', 'Murcia', '73', 'MU'),
  P('31', 'Navarra', '74', 'NA'),
  P('01', 'Álava', '75', 'VI'),
  P('20', 'Gipuzkoa', '75', 'SS'),
  P('48', 'Bizkaia', '75', 'BI'),
  P('26', 'La Rioja', '76', 'LO'),
  P('03', 'Alicante', '77', 'A'),
  P('12', 'Castellón', '77', 'CS'),
  P('46', 'Valencia', '77', 'V'),
  P('51', 'Ceuta', '78', 'CE'),
  P('52', 'Melilla', '79', 'ML'),
];

export const provinciaPorIne = (ine?: string) => PROVINCIAS.find((p) => p.ine === ine);

// ------------------------------------------------------------- Utilidades XML

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function texto(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return ENTIDADES[e] ?? m;
    })
    .trim();
}

const items = (xml: string) => xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

function campo(item: string, etiqueta: string): string | undefined {
  const m = item.match(new RegExp(`<${etiqueta}(?:\\s[^>]*)?>([\\s\\S]*?)</${etiqueta}>`));
  return m ? texto(m[1]) : undefined;
}

// ---------------------------------------------------------------- AEMET

export type Nivel = 'amarillo' | 'naranja' | 'rojo';

export type AvisoMet = {
  id: string;
  nivel: Nivel;
  fenomeno: string; // «Vientos», «Lluvias»… como lo escribe AEMET
  zona: string; // «Interior de Alicante»
  codigoZona: string; // 6 cifras: comunidad, provincia y zona («770302»)
  detalle: string; // la descripción del RSS: «Aviso de rachas máximas de nivel amarillo de … a …»
  inicio: number; // ms
  fin: number; // ms
  url: string;
};

export const RANGO_NIVEL: Record<Nivel, number> = { amarillo: 1, naranja: 2, rojo: 3 };

/**
 * «20:00 18-11-2026 CET (UTC+1)» → ms. La zona horaria viene escrita (CET,
 * CEST, WET…, con su desfase), así que la hora es exacta en cualquier móvil.
 */
export function momentoAemet(s: string): number | null {
  const m = s.match(/(\d{1,2}):(\d{2})\s+(\d{1,2})-(\d{1,2})-(\d{4})[^(]*\(UTC\s*([+-]\d{1,2})?(?::?(\d{2}))?\)/);
  if (!m) return null;
  const [, hh, mi, dd, mm, aa, desfase, desfaseMin] = m;
  const signo = desfase?.startsWith('-') ? -1 : 1;
  const minutos = desfase ? Number(desfase) * 60 + signo * Number(desfaseMin ?? 0) : 0;
  return Date.UTC(Number(aa), Number(mm) - 1, Number(dd), Number(hh), Number(mi)) - minutos * 60_000;
}

/** Los avisos del RSS de una comunidad. Se salta el «Estado completo» (el .tar.gz con todos). */
export function leerAemet(xml: string): AvisoMet[] {
  const out: AvisoMet[] = [];
  for (const it of items(xml)) {
    const titulo = campo(it, 'title') ?? '';
    // «Aviso. Nivel amarillo. Vientos. Interior norte de Valencia»
    const t = titulo.match(/^Aviso\.\s*Nivel\s+(amarillo|naranja|rojo)\.\s*([^.]+)\.\s*(.+)$/i);
    if (!t) continue;
    const detalle = campo(it, 'description') ?? '';
    const tramo = detalle.match(/de (\d{1,2}:\d{2} [^)]*\)) a (\d{1,2}:\d{2} [^)]*\))/);
    const inicio = tramo ? momentoAemet(tramo[1]) : null;
    const fin = tramo ? momentoAemet(tramo[2]) : null;
    const guid = campo(it, 'guid') ?? campo(it, 'link') ?? titulo;
    const zona = guid.match(/AFAZ(\d{6})/);
    if (inicio === null || fin === null || !zona) continue;
    out.push({
      id: guid,
      nivel: t[1].toLowerCase() as Nivel,
      fenomeno: t[2].trim(),
      zona: t[3].trim(),
      codigoZona: zona[1],
      detalle,
      inicio,
      fin,
      url: campo(it, 'link') ?? AEMET_WEB,
    });
  }
  return out;
}

/** Los avisos de la provincia que siguen en pie (o están por llegar), por orden de llegada. */
export function avisosDeProvincia(avisos: AvisoMet[], p: Provincia, ahora: number): AvisoMet[] {
  const porIslas = COMUNIDADES[p.ccaa]?.porIslas;
  return avisos
    .filter((a) => a.codigoZona.slice(0, 2) === p.ccaa && (porIslas || a.codigoZona.slice(2, 4) === p.ine))
    .filter((a) => a.fin > ahora)
    .sort((a, b) => a.inicio - b.inicio || RANGO_NIVEL[b.nivel] - RANGO_NIVEL[a.nivel]);
}

/** El aviso más grave entre los que importan: naranja o rojo, ya en curso o en las próximas 48 horas. */
export function avisoDestacado(avisos: AvisoMet[], ahora: number): AvisoMet | null {
  const graves = avisos.filter((a) => a.nivel !== 'amarillo' && a.fin > ahora && a.inicio < ahora + 48 * 3_600_000);
  graves.sort((a, b) => RANGO_NIVEL[b.nivel] - RANGO_NIVEL[a.nivel] || a.inicio - b.inicio);
  return graves[0] ?? null;
}

// ------------------------------------------------------------------ IGN

export type Terremoto = {
  id: string;
  magnitud: number;
  lugar: string; // «E TABOADA.LU»
  fecha: number; // ms; el RSS la da en hora UTC
  url: string;
};

export function leerIgn(xml: string): Terremoto[] {
  const out: Terremoto[] = [];
  for (const it of items(xml)) {
    const d = campo(it, 'description') ?? '';
    // «… de magnitud 2.7 en E TABOADA.LU en la fecha 18/11/2026 10:29:23 en …»
    const m = d.match(/magnitud\s+([\d.]+)\s+en\s+(.+?)\s+en la fecha\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
    if (!m) continue;
    const [, mag, lugar, dd, mm, aa, hh, mi, ss] = m;
    const url = campo(it, 'link') ?? IGN_WEB;
    out.push({
      id: campo(it, 'guid') ?? url,
      magnitud: Number(mag),
      lugar: lugar.trim(),
      fecha: Date.UTC(Number(aa), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss)),
      url,
    });
  }
  return out;
}

/** Sufijo de provincia del lugar del IGN («TABOADA.LU» → «LU»). Si no hay, no es en una provincia española. */
export function matriculaDe(lugar: string): string | null {
  const m = lugar.match(/\.([A-Z]{1,2})$/);
  return m ? m[1] : null;
}

// Umbrales propios: en tu provincia, desde 3,0 (se suele notar); en toda
// España, desde 4,0. Lo de fuera de España (Marruecos, el Atlántico…) no.
export const MAGNITUD_PROVINCIA = 3;
export const MAGNITUD_ESPANA = 4;

/** Terremotos que merece la pena enseñar, los más recientes primero. */
export function terremotosDestacados(ts: Terremoto[], p: Provincia | undefined): Terremoto[] {
  return ts
    .filter((t) => {
      const mat = matriculaDe(t.lugar);
      if (!mat) return false;
      if (p && p.matricula.includes(mat)) return t.magnitud >= MAGNITUD_PROVINCIA;
      return t.magnitud >= MAGNITUD_ESPANA;
    })
    .sort((a, b) => b.fecha - a.fecha);
}

// ---------------------------------------------------------------- GDACS

export type NivelGdacs = 'Orange' | 'Red';

export type Desastre = {
  id: string;
  tipo: string; // EQ terremoto, TC ciclón, FL inundación, VO volcán, DR sequía, WF incendio
  nivel: NivelGdacs;
  paises: string; // en inglés, como lo da GDACS
  enEspana: boolean;
  inicio: number;
  fin: number;
  url: string;
  cerrado?: boolean; // ya no viene en el RSS: se guarda para el historial
};

/** Solo los naranjas y rojos que siguen abiertos: los verdes son cientos y casi nunca afectan a nadie. */
export function leerGdacs(xml: string): Desastre[] {
  const out: Desastre[] = [];
  for (const it of items(xml)) {
    const nivel = campo(it, 'gdacs:alertlevel');
    if (nivel !== 'Orange' && nivel !== 'Red') continue;
    if (campo(it, 'gdacs:iscurrent') === 'false') continue;
    const paises = campo(it, 'gdacs:country') ?? '';
    const iso = campo(it, 'gdacs:iso3') ?? '';
    const inicio = Date.parse(campo(it, 'gdacs:fromdate') ?? '');
    const fin = Date.parse(campo(it, 'gdacs:todate') ?? '');
    out.push({
      id: campo(it, 'guid') ?? campo(it, 'link') ?? paises,
      tipo: campo(it, 'gdacs:eventtype') ?? '',
      nivel,
      paises,
      enEspana: /\bESP\b/.test(iso) || /\bSpain\b/.test(paises),
      inicio: Number.isNaN(inicio) ? 0 : inicio,
      fin: Number.isNaN(fin) ? 0 : fin,
      url: (campo(it, 'link') ?? GDACS_WEB).replace(/^http:/, 'https:'),
    });
  }
  // Primero los rojos y, dentro de cada nivel, lo más reciente
  return out.sort((a, b) => (a.nivel === b.nivel ? b.fin - a.fin : a.nivel === 'Red' ? -1 : 1));
}

// ------------------------------------------------------- Noticias de AEMET

export const NOTICIAS_AEMET_RSS = 'https://www.aemet.es/es/noticias.rss';
export const NOTICIAS_AEMET_WEB = 'https://www.aemet.es/es/noticias';

export type Noticia = {
  id: string;
  titulo: string; // AEMET corta los largos con «...»
  resumen: string;
  fecha: number; // ms
  url: string;
};

// ISO-8859-15 es Latin-1 salvo ocho posiciones (el euro y unas letras). El RSS
// de noticias viene así y `fetch().text()` lo leería como UTF-8: las tildes
// saldrían rotas. En React Native no hay TextDecoder para esta codificación.
const LATIN9: Record<number, number> = { 0xa4: 0x20ac, 0xa6: 0x160, 0xa8: 0x161, 0xb4: 0x17d, 0xb8: 0x17e, 0xbc: 0x152, 0xbd: 0x153, 0xbe: 0x178 };

export function latin9(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    const trozo = Array.from(bytes.subarray(i, i + 8192), (b) => LATIN9[b] ?? b);
    s += String.fromCharCode(...trozo);
  }
  return s;
}

const MESES_RSS: Record<string, number> = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };

/** «mar, 10 nov 2026 00:00 +0000» (los meses en español) → ms. */
export function fechaRssEs(s: string): number | null {
  const m = s.match(/(\d{1,2})\s+([a-zé]{3})\w*\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([+-])(\d{2}):?(\d{2})/i);
  if (!m) return null;
  const [, dd, mes, aa, hh, mi, ss, signo, dh, dm] = m;
  const n = MESES_RSS[mes.toLowerCase()];
  if (n === undefined) return null;
  const desfase = (signo === '-' ? -1 : 1) * (Number(dh) * 60 + Number(dm));
  return Date.UTC(Number(aa), n, Number(dd), Number(hh), Number(mi), Number(ss ?? 0)) - desfase * 60_000;
}

export function leerNoticiasAemet(xml: string): Noticia[] {
  const out: Noticia[] = [];
  for (const it of items(xml)) {
    const titulo = campo(it, 'title');
    const fecha = fechaRssEs(campo(it, 'pubDate') ?? '');
    if (!titulo || fecha === null) continue;
    const url = campo(it, 'link') ?? NOTICIAS_AEMET_WEB;
    out.push({ id: campo(it, 'guid') ?? url, titulo, resumen: campo(it, 'description') ?? '', fecha, url });
  }
  return out;
}

// ------------------------------------------------------------- Historial
//
// Los RSS solo traen lo de ahora: AEMET quita un aviso al acabar, el IGN da
// diez días y GDACS deja de listar lo que se cierra. Para poder leer lo que
// ha pasado, en cada descarga se junta lo nuevo con lo que ya se tenía y se
// guarda un mes. [propio]

export const DIAS_HISTORIAL = 30;
const HISTORIAL_MS = DIAS_HISTORIAL * 86_400_000;

/** Un mismo aviso se vuelve a emitir con otro `guid`; esto es lo que no cambia. */
const claveMeteo = (a: AvisoMet) => `${a.codigoZona}|${a.fenomeno}|${a.nivel}|${a.inicio}|${a.fin}`;

const esDeProvincia = (codigoZona: string, p: Provincia) =>
  codigoZona.slice(0, 2) === p.ccaa && (COMUNIDADES[p.ccaa]?.porIslas || codigoZona.slice(2, 4) === p.ine);

/**
 * Lo nuevo de AEMET (toda la comunidad) más los avisos ya acabados de la
 * provincia que se tenían. Lo que no ha acabado y ya no viene se da por
 * retirado (AEMET lo ha quitado o cambiado), así que no se guarda.
 */
export function juntarMeteo(viejos: AvisoMet[], nuevos: AvisoMet[], p: Provincia, ahora: number): AvisoMet[] {
  const hay = new Set(nuevos.map(claveMeteo));
  const pasados = viejos.filter((a) => a.fin <= ahora && a.fin > ahora - HISTORIAL_MS && esDeProvincia(a.codigoZona, p) && !hay.has(claveMeteo(a)));
  return [...nuevos, ...pasados];
}

/** Terremotos: los que se pueden llegar a enseñar (en España y de 3,0 o más), del último mes. */
export function juntarTerremotos(viejos: Terremoto[], nuevos: Terremoto[], ahora: number): Terremoto[] {
  const porId = new Map<string, Terremoto>();
  for (const t of [...viejos, ...nuevos]) porId.set(t.id, t);
  return [...porId.values()].filter((t) => t.fecha > ahora - HISTORIAL_MS && t.magnitud >= MAGNITUD_PROVINCIA && matriculaDe(t.lugar) !== null);
}

/** Desastres: lo que ya no viene en el RSS queda como cerrado. */
export function juntarDesastres(viejos: Desastre[], nuevos: Desastre[], ahora: number): Desastre[] {
  const hay = new Set(nuevos.map((d) => d.id));
  const cerrados = viejos.filter((d) => !hay.has(d.id)).map((d) => ({ ...d, cerrado: true }));
  return [...nuevos, ...cerrados].filter((d) => (d.fin || d.inicio) > ahora - HISTORIAL_MS);
}

/** Noticias: las del último mes y, como salen pocas, siempre las diez últimas aunque sean más viejas. */
export const NOTICIAS_MINIMO = 10;

export function juntarNoticias(viejas: Noticia[], nuevas: Noticia[], ahora: number): Noticia[] {
  const porId = new Map<string, Noticia>();
  for (const n of [...viejas, ...nuevas]) porId.set(n.id, n);
  return [...porId.values()].sort((a, b) => b.fecha - a.fecha).filter((n, i) => i < NOTICIAS_MINIMO || n.fecha > ahora - HISTORIAL_MS);
}

// ------------------------------------------------------------- Actualidad

export type Ambito = 'provincia' | 'espana' | 'mundo';
export type FiltroAmbito = 'todo' | Ambito;

export type Entrada =
  | { tipo: 'tiempo'; id: string; fecha: number; ambito: Ambito; aviso: AvisoMet }
  | { tipo: 'terremoto'; id: string; fecha: number; ambito: Ambito; terremoto: Terremoto }
  | { tipo: 'desastre'; id: string; fecha: number; ambito: Ambito; desastre: Desastre }
  | { tipo: 'noticia'; id: string; fecha: number; ambito: Ambito; noticia: Noticia };

/** Lo que cabe en cada filtro: «España» incluye tu provincia; «Mundo» es solo lo de fuera. */
export function entraEnFiltro(ambito: Ambito, filtro: FiltroAmbito): boolean {
  if (filtro === 'todo') return true;
  if (filtro === 'espana') return ambito !== 'mundo';
  return ambito === filtro;
}

/**
 * Lo que ha pasado, lo más reciente primero: los avisos de AEMET ya acabados
 * en tu provincia (los que siguen en pie van aparte, arriba), los terremotos
 * destacados, los desastres de GDACS y las noticias de AEMET.
 */
export function actualidad(
  d: { meteo: AvisoMet[]; terremotos: Terremoto[]; desastres: Desastre[]; noticias: Noticia[] },
  p: Provincia | undefined,
  ahora: number,
  filtro: FiltroAmbito = 'todo',
): Entrada[] {
  const out: Entrada[] = [];
  if (p) {
    for (const a of d.meteo) {
      if (a.fin <= ahora && esDeProvincia(a.codigoZona, p)) out.push({ tipo: 'tiempo', id: `m:${claveMeteo(a)}`, fecha: a.inicio, ambito: 'provincia', aviso: a });
    }
  }
  for (const t of terremotosDestacados(d.terremotos, p)) {
    const mat = matriculaDe(t.lugar);
    const aqui = !!p && !!mat && p.matricula.includes(mat);
    out.push({ tipo: 'terremoto', id: `t:${t.id}`, fecha: t.fecha, ambito: aqui ? 'provincia' : 'espana', terremoto: t });
  }
  for (const x of d.desastres) out.push({ tipo: 'desastre', id: `d:${x.id}`, fecha: x.inicio, ambito: x.enEspana ? 'espana' : 'mundo', desastre: x });
  for (const n of d.noticias) out.push({ tipo: 'noticia', id: `n:${n.id}`, fecha: n.fecha, ambito: 'espana', noticia: n });
  // Sin duplicados (un aviso repetido en dos descargas) y por fecha
  const vistos = new Set<string>();
  return out
    .filter((e) => entraEnFiltro(e.ambito, filtro) && e.fecha <= ahora && !vistos.has(e.id) && vistos.add(e.id))
    .sort((a, b) => b.fecha - a.fecha);
}
