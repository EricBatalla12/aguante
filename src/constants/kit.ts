// Kit de emergencia de serie. Los elementos propios de cada casa van en el
// store (kitPropio).

import { tx } from '../lib/i18n';

export type ElementoKit = { id: string; que: string; clave?: boolean };

// Lo que más se olvida va marcado. El abrelatas, sobre todo: sin él, las latas
// no sirven de nada.
export const KIT: ElementoKit[] = [
  { id: 'abrelatas', que: tx('Abrelatas manual'), clave: true },
  { id: 'linterna', que: tx('Linterna y pilas de repuesto') },
  { id: 'radio', que: tx('Radio a pilas o de dinamo') },
  { id: 'botiquin', que: tx('Botiquín y medicación') },
  { id: 'pastillas', que: tx('Pastillas potabilizadoras'), clave: true },
  { id: 'powerbank', que: tx('Batería externa cargada') },
  { id: 'mantas', que: tx('Mantas o sacos de dormir') },
  { id: 'docs', que: tx('Copia de documentos y algo de efectivo') },
];
