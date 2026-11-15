import { useMemo } from 'react';

import { calcular, type Modo, type ModoAuto } from './calculo';
import { tx } from './i18n';
import { horasSinLuz, useAguante } from './store';

/** Balance de la casa con el modo y el escenario guardados (o un modo dado). */
export function useResultado(modoForzado?: Modo, horas?: number) {
  const personas = useAguante((s) => s.personas);
  const mascotas = useAguante((s) => s.mascotas);
  const productos = useAguante((s) => s.productos);
  const modoGuardado = useAguante((s) => s.modo);
  const escenario = useAguante((s) => s.escenario);
  const manual = useAguante((s) => s.manual);
  const emergencia = useAguante((s) => s.emergencia);
  const modo = modoForzado ?? modoGuardado;
  // En plena emergencia sin luz cuentan las horas que ya lleva el apagón
  // (redondeadas al minuto para no recalcular en cada repintado)
  const horasSinLuzAhora = horas ?? Math.floor(horasSinLuz(emergencia, escenario) * 60) / 60;
  return useMemo(
    () => calcular(personas, mascotas, productos, modo, escenario, new Date(), manual, horasSinLuzAhora),
    [personas, mascotas, productos, modo, escenario, manual, horasSinLuzAhora],
  );
}

export const ETIQUETA_MODO: Record<Modo, string> = {
  normal: tx('Normal'),
  ligero: tx('Ligero'),
  severo: tx('Severo'),
  extremo: tx('Extremo'),
  manual: tx('Manual'),
};

export const MODOS_AUTO: ModoAuto[] = ['normal', 'ligero', 'severo', 'extremo'];

export const OPCIONES_MODO = MODOS_AUTO.map((m) => ({ valor: m, etiqueta: ETIQUETA_MODO[m] }));
