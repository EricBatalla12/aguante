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

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

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
  if (!Number.isInteger(m) || m < 1 || m > 12) return { estado: 'error', mensaje: 'El mes va de 1 a 12.' };
  const a = anio.length === 2 ? 2000 + Number(anio) : Number(anio);
  if (!Number.isInteger(a) || a < 2000 || a > 2100) return { estado: 'error', mensaje: 'Revisa el año.' };

  const tope = diasDelMes(a, m);
  if (!dia) return { estado: 'ok', iso: `${a}-${dos(m)}-${dos(tope)}`, sinDia: true };
  const d = Number(dia);
  if (!Number.isInteger(d) || d < 1 || d > tope) {
    return { estado: 'error', mensaje: `${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} de ${a} tiene ${tope} días.` };
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
  const mesAnio = `${MESES_CORTOS[m - 1]} ${a}`;
  return sinDia ? mesAnio : `${d} ${mesAnio}`;
}

/** «el 15 de diciembre de 2028», o «a finales de diciembre de 2028». */
export function textoFechaLarga(iso: string, sinDia?: boolean): string {
  const [a, m, d] = iso.split('-').map(Number);
  return sinDia ? `a finales de ${MESES[m - 1]} de ${a}` : `el ${d} de ${MESES[m - 1]} de ${a}`;
}

/** «jueves 19 de noviembre», para decir hasta qué día llega la reserva. */
export function textoDia(fecha: Date): string {
  return `${DIAS_SEMANA[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}
