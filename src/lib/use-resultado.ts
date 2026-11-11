import { useMemo } from 'react';

import { calcular, type Modo, type ModoAuto } from './calculo';
import { useAguante } from './store';

/** Balance de la casa con el modo y el escenario guardados (o un modo dado). */
export function useResultado(modoForzado?: Modo) {
  const personas = useAguante((s) => s.personas);
  const mascotas = useAguante((s) => s.mascotas);
  const productos = useAguante((s) => s.productos);
  const modoGuardado = useAguante((s) => s.modo);
  const escenario = useAguante((s) => s.escenario);
  const manual = useAguante((s) => s.manual);
  const modo = modoForzado ?? modoGuardado;
  return useMemo(
    () => calcular(personas, mascotas, productos, modo, escenario, new Date(), manual),
    [personas, mascotas, productos, modo, escenario, manual],
  );
}

export const ETIQUETA_MODO: Record<Modo, string> = {
  normal: 'Normal',
  ligero: 'Ligero',
  severo: 'Severo',
  extremo: 'Extremo',
  manual: 'Manual',
};

export const MODOS_AUTO: ModoAuto[] = ['normal', 'ligero', 'severo', 'extremo'];

export const OPCIONES_MODO = MODOS_AUTO.map((m) => ({ valor: m, etiqueta: ETIQUETA_MODO[m] }));
