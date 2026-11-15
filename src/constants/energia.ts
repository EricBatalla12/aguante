import type { NombreIcono } from '@/components/ui';
import type { TipoFuente } from '@/lib/energia';
import { tx } from '@/lib/i18n';

export const ICONO_FUENTE: Record<TipoFuente, NombreIcono> = {
  bateria: 'car-battery',
  powerbank: 'battery-charging-medium',
  solar: 'solar-panel',
  generador: 'engine-outline',
};

export const NOMBRE_TIPO: Record<TipoFuente, string> = {
  bateria: tx('Batería o estación portátil'),
  powerbank: tx('Power bank'),
  solar: tx('Placa solar'),
  generador: tx('Generador'),
};
