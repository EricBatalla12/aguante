// Cliente de Supabase: cuentas y casa compartida.
//
// La clave publicable está hecha para ir dentro de la app: solo deja hacer lo
// que permiten las reglas RLS de supabase/esquema.sql. La secreta no va nunca
// aquí.
//
// La sesión se guarda en el mismo almacén que el resto de datos (SQLite en el
// móvil, localStorage en la web). Así no hace falta ningún módulo nativo nuevo
// y el cambio puede llegar con EAS Update.

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { almacen } from './almacen';

export const URL_SUPABASE = 'https://dndvwxfnaqdivcttxwku.supabase.co';
export const CLAVE_PUBLICABLE = 'sb_publishable_2ExGbQV4Bzbv5YvRhjzq7w_EWEv35IL';

export const supabase = createClient(URL_SUPABASE, CLAVE_PUBLICABLE, {
  auth: {
    storage: almacen,
    autoRefreshToken: true,
    persistSession: true,
    // Se entra con un código, no con enlaces: no hay sesión que leer de la URL
    detectSessionInUrl: false,
    // Al volver de Google por aguante://auth llega un código de un solo uso,
    // no la sesión: otra app que se registrara con ese mismo esquema y lo
    // interceptara no podría canjearlo, porque el secreto para hacerlo
    // (el «code verifier») solo está en este móvil.
    flowType: 'pkce',
  },
});

// En el móvil la renovación de la sesión corre sin parar; la documentación de
// Supabase recomienda pararla con la app en segundo plano.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
