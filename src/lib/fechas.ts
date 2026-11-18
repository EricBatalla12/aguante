// Fechas de caducidad.
//
// En la mayoría de latas solo viene el mes y el año («12/2028»), y eso quiere
// decir «hasta finales de ese mes». Por eso el día es opcional: si falta, se
// guarda el último día del mes y se recuerda que no había día, para no
// inventarnos una precisión que la etiqueta no tiene.
//
// Este fichero no importa nada: así los tests lo ejecutan con `node --test`.

export type PartesFecha = { dia: string; mes: string; anio: string };

export const FECHA_VACIA: PartesFecha = { dia: '', mes: '', anio: '' };

const TEXTOS = {
  es: {
    meses: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    cortos: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    semana: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  },
  en: {
    meses: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    cortos: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    semana: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
};

// Idioma de los textos de fecha. Lo fija src/lib/i18n.ts; aquí no se importa
// nada para que los tests sigan corriendo sin compilar.
let lengua: 'es' | 'en' = 'es';
export function fijarIdiomaFechas(i: 'es' | 'en') {
  lengua = i;
}
const MESES = () => TEXTOS[lengua].meses;

/** Días que tiene un mes (1–12), contando los bisiestos. */
export function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

export type FechaCompuesta =
  | { estado: 'vacia' }
  | { estado: 'incompleta' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'ok'; iso: string; sinDia: boolean };

const dos = (n: number) => String(n).padStart(2, '0');

/**
 * Convierte lo tecleado en una fecha AAAA-MM-DD. El día puede faltar, y el
 * año admite dos cifras («28» es 2028), que es como viene en muchos envases.
 */
export function componerFecha(p: PartesFecha): FechaCompuesta {
  const dia = p.dia.trim();
  const mes = p.mes.trim();
  const anio = p.anio.trim();
  if (!dia && !mes && !anio) return { estado: 'vacia' };
  if (!mes || !anio || (anio.length !== 2 && anio.length !== 4)) return { estado: 'incompleta' };

  const m = Number(mes);
  if (!Number.isInteger(m) || m < 1 || m > 12)
    return { estado: 'error', mensaje: lengua === 'en' ? 'The month goes from 1 to 12.' : 'El mes va de 1 a 12.' };
  const a = anio.length === 2 ? 2000 + Number(anio) : Number(anio);
  if (!Number.isInteger(a) || a < 2000 || a > 2100)
    return { estado: 'error', mensaje: lengua === 'en' ? 'Check the year.' : 'Revisa el año.' };

  const tope = diasDelMes(a, m);
  if (!dia) return { estado: 'ok', iso: `${a}-${dos(m)}-${dos(tope)}`, sinDia: true };
  const d = Number(dia);
  if (!Number.isInteger(d) || d < 1 || d > tope) {
    const nombre = MESES()[m - 1];
    const mensaje =
      lengua === 'en'
        ? `${nombre} ${a} has ${tope} days.`
        : `${nombre[0].toUpperCase()}${nombre.slice(1)} de ${a} tiene ${tope} días.`;
    return { estado: 'error', mensaje };
  }
  return { estado: 'ok', iso: `${a}-${dos(m)}-${dos(d)}`, sinDia: false };
}

/** Lo contrario de `componerFecha`: para rellenar el formulario al editar. */
export function partesDeFecha(iso?: string, sinDia?: boolean): PartesFecha {
  if (!iso) return FECHA_VACIA;
  const [a, m, d] = iso.split('-');
  return { dia: sinDia ? '' : d, mes: m, anio: a };
}

/** «15 dic 2028», o «dic 2028» si la etiqueta no traía día. */
export function textoFecha(iso: string, sinDia?: boolean): string {
  const [a, m, d] = iso.split('-').map(Number);
  const mesAnio = `${TEXTOS[lengua].cortos[m - 1]} ${a}`;
  return sinDia ? mesAnio : `${d} ${mesAnio}`;
}

/** «el 15 de diciembre de 2028», o «a finales de diciembre de 2028». */
export function textoFechaLarga(iso: string, sinDia?: boolean): string {
  const [a, m, d] = iso.split('-').map(Number);
  const mes = MESES()[m - 1];
  if (lengua === 'en') return sinDia ? `at the end of ${mes} ${a}` : `on ${d} ${mes} ${a}`;
  return sinDia ? `a finales de ${mes} de ${a}` : `el ${d} de ${mes} de ${a}`;
}

/** «jueves 19 de noviembre», para decir hasta qué día llega la reserva. */
export function textoDia(fecha: Date): string {
  const dia = TEXTOS[lengua].semana[fecha.getDay()];
  const mes = MESES()[fecha.getMonth()];
  return lengua === 'en' ? `${dia} ${fecha.getDate()} ${mes}` : `${dia} ${fecha.getDate()} de ${mes}`;
}

/** «mié 19 nov, 05:59», en la hora del móvil: para los avisos oficiales. */
export function textoMomento(ms: number): string {
  const f = new Date(ms);
  const dia = TEXTOS[lengua].semana[f.getDay()].slice(0, 3);
  const mes = TEXTOS[lengua].cortos[f.getMonth()];
  const hora = `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
  return `${dia} ${f.getDate()} ${mes}, ${hora}`;
}
