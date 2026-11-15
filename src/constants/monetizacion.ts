// Cómo se financia Aguante. Todo lo de dinero se enciende y se apaga aquí.
//
// Desde el 15/11/2026 la idea es vivir de donaciones: la app entera es
// gratis, sin anuncios y sin nada bloqueado.

/**
 * El plan Pro (tabla `planes` y función `soy_pro` en Supabase, ver
 * docs/cuentas.md) está hecho pero apagado. Con `false`: no se bloquea nada,
 * no sale la etiqueta «Pro», no se enseña el plan en la cuenta y la app no
 * pregunta al servidor. Para volver a usarlo basta con ponerlo a `true` (y
 * publicar).
 */
export const PRO_ACTIVO = false;

/**
 * Enlace para donar (PayPal.me de Eric). Vacío, el apartado de donaciones de
 * Ajustes no sale. Ojo con Google Play: su política de pagos no deja llevar a
 * pagar fuera de Play desde la app salvo donaciones exentas de impuestos (ver
 * docs/pendiente.md). En una versión para Play hay que dejarlo vacío y usar
 * su sistema de pagos.
 */
export const ENLACE_DONAR = 'https://paypal.me/EBatalla167';
