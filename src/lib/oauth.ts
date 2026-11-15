// Lee lo que devuelve Supabase al volver de entrar con Google.
//
// Supabase redirige a aguante://auth con la sesión en la URL: en el flujo
// normal (implícito) llega en el fragmento (#access_token=…&refresh_token=…);
// en el flujo PKCE llega un código (?code=…) que hay que canjear. Si algo
// falla, llega ?error=…&error_description=…. Se aceptan las tres formas.
//
// No importa nada: los tests corren con `node --test` sin compilar.

export type RespuestaOAuth = { code?: string; access_token?: string; refresh_token?: string; error?: string };

function parametros(texto: string, destino: Record<string, string>) {
  for (const par of texto.split('&')) {
    if (!par) continue;
    const [clave, ...resto] = par.split('=');
    try {
      destino[decodeURIComponent(clave)] = decodeURIComponent(resto.join('=').replace(/\+/g, ' '));
    } catch {
      // Un parámetro mal codificado no debe tumbar el resto
    }
  }
}

export function leerRespuestaOAuth(url: string): RespuestaOAuth {
  const [antes, fragmento = ''] = url.split('#');
  const consulta = antes.includes('?') ? antes.slice(antes.indexOf('?') + 1) : '';
  const p: Record<string, string> = {};
  parametros(consulta, p);
  parametros(fragmento, p);
  return {
    code: p.code || undefined,
    access_token: p.access_token || undefined,
    refresh_token: p.refresh_token || undefined,
    error: p.error_description || p.error || undefined,
  };
}
