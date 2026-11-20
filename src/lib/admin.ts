// ¿Ve este móvil el panel de admin? Con la cuenta de uno de ADMINS o, en
// desarrollo, siempre (para probarlo en la web y en Expo Go).

import { ADMINS } from '@/constants/admin';
import { useSincro } from './sincro';

export const esAdmin = (correo: string | null | undefined) => !!correo && ADMINS.includes(correo.trim().toLowerCase());

export function useEsAdmin(): boolean {
  const correo = useSincro((s) => s.correo);
  return __DEV__ || esAdmin(correo);
}
