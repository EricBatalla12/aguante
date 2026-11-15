// Energía propia: lo que se puede generar y guardar, lo que gasta la casa y
// cuántos días aguanta sin luz de la red.
//
// Como calculo.ts, no importa nada, para que los tests corran con `node --test`.
// Las cifras y sus fuentes están en docs/fuentes-y-reglas.md («Energía»).

export type TipoFuente = 'bateria' | 'powerbank' | 'solar' | 'generador';

export type FuenteEnergia = {
  id: string;
  nombre: string;
  tipo: TipoFuente;
  cantidad: number;
  wh?: number; // batería o estación portátil: capacidad en Wh
  mah?: number; // power bank: capacidad en mAh, como viene en la caja
  vatiosPico?: number; // placa solar: Wp de la etiqueta
  vatios?: number; // generador: potencia
  litrosHora?: number; // generador: consumo a esa potencia (ficha técnica)
  litros?: number; // generador: combustible guardado
};

export type Aparato = {
  id: string;
  nombre: string;
  vatios: number;
  horasDia: number;
  cantidad: number;
  imprescindible?: boolean;
};

/** Zona y época para la producción solar. */
export type Zona = 'norte' | 'centro' | 'sur';
export type Epoca = 'invierno' | 'media';

// PVGIS 5.3 (Comisión Europea, JRC), placa fija con inclinación óptima y 14 %
// de pérdidas: kWh al día por cada kWp. «invierno» es el peor mes del año y
// «media», la media anual. Norte: Bilbao y A Coruña; centro: Madrid y
// Barcelona; sur: Sevilla y Las Palmas. Tomo el valor más bajo de cada pareja.
export const KWH_DIA_POR_KWP: Record<Zona, Record<Epoca, number>> = {
  norte: { invierno: 2.0, media: 3.2 },
  centro: { invierno: 3.2, media: 4.3 },
  sur: { invierno: 3.6, media: 4.4 },
};

// Criterio propio, a falta de una fuente única: un power bank entrega en torno
// a dos tercios de lo que marca (las celdas van a 3,7 V y la salida a 5 V, con
// pérdidas por el camino), y una batería con inversor pierde un 15 %.
export const VOLTIOS_CELDA = 3.7;
export const RENDIMIENTO_POWERBANK = 0.65;
export const RENDIMIENTO_BATERIA = 0.85;

/** Wh que se pueden sacar de una fuente guardada (baterías y combustible). */
export function whGuardados(f: FuenteEnergia): number {
  const n = Math.max(0, f.cantidad);
  if (f.tipo === 'bateria') return n * (f.wh ?? 0) * RENDIMIENTO_BATERIA;
  if (f.tipo === 'powerbank') return n * ((f.mah ?? 0) / 1000) * VOLTIOS_CELDA * RENDIMIENTO_POWERBANK;
  if (f.tipo === 'generador') {
    if (!f.litrosHora || f.litrosHora <= 0) return 0;
    return ((f.litros ?? 0) / f.litrosHora) * (f.vatios ?? 0) * n;
  }
  return 0;
}

/** Wh al día que da una placa solar en esa zona y época. */
export function whSolaresDia(f: FuenteEnergia, zona: Zona, epoca: Epoca): number {
  if (f.tipo !== 'solar') return 0;
  return Math.max(0, f.cantidad) * ((f.vatiosPico ?? 0) / 1000) * KWH_DIA_POR_KWP[zona][epoca] * 1000;
}

export function whDiaAparato(a: Aparato): number {
  return Math.max(0, a.vatios) * Math.max(0, a.horasDia) * Math.max(0, a.cantidad);
}

export type BalanceEnergia = {
  whGuardados: number;
  whSolaresDia: number;
  whConsumoDia: number;
  /** Días que aguanta. Infinity si el sol cubre el consumo. */
  dias: number;
  soloImprescindibles: boolean;
};

export function calcularEnergia(
  fuentes: FuenteEnergia[],
  aparatos: Aparato[],
  zona: Zona,
  epoca: Epoca,
  soloImprescindibles = false,
): BalanceEnergia {
  const guardados = fuentes.reduce((s, f) => s + whGuardados(f), 0);
  const solares = fuentes.reduce((s, f) => s + whSolaresDia(f, zona, epoca), 0);
  const consumo = aparatos
    .filter((a) => !soloImprescindibles || a.imprescindible)
    .reduce((s, a) => s + whDiaAparato(a), 0);
  const deficit = consumo - solares;
  const dias = consumo <= 0 ? 0 : deficit <= 0 ? Infinity : guardados / deficit;
  return { whGuardados: guardados, whSolaresDia: solares, whConsumoDia: consumo, dias, soloImprescindibles };
}

/**
 * Aparatos de partida. Los vatios y las horas son orientativos (criterio
 * propio): lo bueno es cambiarlos por los de la etiqueta de cada aparato.
 */
// Marca de texto para traducir (ver src/lib/i18n.ts). Va aquí en local porque
// este fichero no importa nada.
const tx = (es: string) => es;

export const APARATOS_TIPICOS: Omit<Aparato, 'id' | 'cantidad'>[] = [
  { nombre: tx('Cargar un móvil'), vatios: 15, horasDia: 1, imprescindible: true },
  { nombre: tx('Bombilla LED'), vatios: 9, horasDia: 4, imprescindible: true },
  { nombre: tx('Radio'), vatios: 5, horasDia: 3, imprescindible: true },
  { nombre: tx('Router wifi'), vatios: 10, horasDia: 24 },
  { nombre: tx('Nevera (media)'), vatios: 30, horasDia: 24 },
  { nombre: tx('Portátil'), vatios: 45, horasDia: 3 },
  { nombre: tx('CPAP sin humidificador'), vatios: 40, horasDia: 8, imprescindible: true },
];
