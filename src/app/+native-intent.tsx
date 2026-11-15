// Enlaces que abren la app desde fuera.
//
// Al entrar con Google, Supabase devuelve a aguante://auth con la sesión en la
// URL. Ese enlace lo recoge entrarConGoogle (src/lib/sincro.ts); la navegación
// no debe intentar abrir una pantalla «auth», que no existe. Devolver null
// deja la app donde estaba. Si la app se abrió desde cero con ese enlace, se
// va a la pantalla de cuenta.

export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  try {
    if (/^aguante:\/\/auth|^\/?auth([?#]|$)/.test(path ?? '')) return initial ? '/cuenta' : null;
    return path;
  } catch {
    return path;
  }
}
