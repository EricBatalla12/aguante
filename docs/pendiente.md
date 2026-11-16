# Pendiente

Ideas apuntadas para más adelante. Lo ya hecho está al final.

## Cuentas y casa compartida: lo que falta

Hecho el 15/11/2026 (ver [cuentas.md](cuentas.md)). El 16/11/2026 se hizo
compartir la emergencia en curso, cambiar el código de la casa y sacar a
alguien (hay que volver a ejecutar `supabase/esquema.sql`), y la página web
para pedir el borrado de la cuenta (`web/borrar-cuenta.html`, sin publicar).
Queda:

- Si dos personas apuntan agua o comida a la vez sin conexión, se queda el
  último apunte. Para que no se pierda ninguno habría que guardar cada apunte
  como un elemento propio (un tipo nuevo en el SQL).

## Trueque entre usuarios

La versión de ahora es local: calcula lo que sobra y lo que falta y lo deja
listo para mandarlo por WhatsApp o Telegram. Un trueque entre usuarios
cercanos dentro de la app necesita las cuentas de arriba y decidir qué pasa
sin internet.

Revisado el 16/11/2026 y **sin hacer a propósito**: antes hay que decidir lo
que expone a desconocidos. Propuesta, para que Eric decida:

- **Zona por código postal**, nunca por GPS: ni permiso de ubicación ni módulo
  nativo, y no se puede triangular dónde vive nadie.
- **Anuncios sin datos de casa**: «ofrezco 10 L de agua», «busco pilas AA».
  Nada de cuántos días aguanta la casa ni quién vive en ella (diría a un
  desconocido qué casa tiene reservas y cuál está vacía).
- **Contacto**: o chat dentro de la app (más trabajo, pero no se publica nada)
  o un contacto que el anunciante pone a mano y que solo se enseña a quien
  pulsa «Me interesa». Recomendación: el segundo, con caducidad del anuncio a
  los 7 días.
- **Moderación**: botón de denunciar, ocultar anuncios con varias denuncias y
  límite de anuncios por cuenta. Alguien (Eric) tiene que revisar denuncias.
- **Servidor**: tabla `anuncios` con RLS (se leen los del mismo código postal,
  se escriben solo los propios) y funciones como las de la casa. Sin conexión,
  solo se ven los que se bajaron la última vez.
- **Privacidad**: el contacto es un dato personal que se enseña a terceros:
  va en la política de privacidad y necesita consentimiento explícito.
- Encaja como función de Pro (hoy apagado) o gratis: decidirlo con lo de
  monetizar.

## Monetizar

Sin romper lo principal: que la app sirva gratis y sin internet en una
emergencia; nunca bloquear tras pago el cálculo, el modo emergencia ni las
fuentes. No hay nada implementado: cobrar necesita una cuenta de desarrollador
de Google Play y un sistema de pagos, y eso lo tiene que decidir y abrir Eric.

- Versión «Pro» con pago único (mejor que suscripción para una app que pasa
  meses sin abrirse; Stokl lo hace así): casa compartida entre cuentas, varias
  casas (la del pueblo, la de los padres), exportar en PDF.
- Ojo: las apps más parecidas (PPantry, Provision) son gratis del todo.
- Afiliados en la lista de la compra (garrafas, latas, power banks, kit),
  marcado como enlace patrocinado y sin cambiar las recomendaciones.
- Versión para empresas, ayuntamientos o protección civil: plantillas de kit y
  reparto para colegios, residencias o comunidades de vecinos.
- Nada de anuncios dentro del modo emergencia.

## Marketing

- Más vídeos con HyperFrames (el kit de 72 h en 30 s, la energía sin luz…).
  Hechos: `aguante-dias.mp4`, `aguante-semana.mp4` y `aguante-apagon.mp4`. El
  siguiente, según Eric: el móvil más grande y más arriba, que se vea escanear
  el código de barras y que la app es para latas y conservas (detalle en
  CLAUDE.md, «Vídeos de marketing»).
- **Web publicada** (16/11/2026) en https://ericbatalla12.github.io/aguante/: `web/` con página principal,
  calculadora (el mismo `calculo.ts`, compilado con `npm run sitio`), tres
  guías, política de privacidad y página para borrar la cuenta. Se publica
  sola al subir cambios de `web/` a `main` (ver `web/README.md`).
- **Textos de difusión** para Reddit y foros, asociaciones de vecinos, scouts y
  Protección Civil: `marketing/difusion.md` (los publica o manda Eric).
- Que un nutricionista o alguien de protección civil revise la pantalla de
  fuentes (el correo a Protección Civil de `difusion.md` lo pide).
- La UE: no «recomienda» 72 horas; su estrategia de preparación (marzo de
  2025) se propone elaborar pautas para que la población aguante un mínimo de
  72 horas. Corregido en la app el 16/11/2026.
- Compartir el resultado como imagen (hoy se comparte como texto): necesita
  módulos nativos y APK nuevo; Eric lo ha dejado para más adelante.

## Noticias de guerra o posibles desastres

Idea de Eric (15/11/2026), sin estudiar: una sección con noticias
relacionadas con guerras o posibles desastres. Pendiente de mirar la
viabilidad (de dónde salen las noticias, si hay fuentes oficiales de avisos,
coste y que no sea alarmista) y contársela a Eric.

## Ideas sacadas de otras apps

Hechas el 16/11/2026 (ver «Hecho el 16/11/2026»). Queda:

- Una suscripción ICS que se actualice sola (como Provision): necesitaría un
  servidor que sirva el calendario de cada casa. Hoy cada aviso se añade a
  mano a Google Calendar desde el producto o el elemento del kit.

## Donaciones y planes de pago

Desde el 15/11/2026 la monetización es por **donaciones**: apartado «Apoyar
Aguante» en Ajustes con un enlace de PayPal (`ENLACE_DONAR` en
`src/constants/monetizacion.ts`; vacío, no sale). Si la app va a Google Play:
su política de pagos no deja llevar a pagar fuera de Play desde la app salvo
«tax exempt donations» (leído el 15/11/2026; no aclara las propinas a un
desarrollador particular). Para Play: dejar el enlace vacío y hacer una
propina con su sistema de pagos (módulo nativo, APK nuevo, app publicada en
Play para probarlo).

El plan Pro está hecho pero apagado (`PRO_ACTIVO`, ver
[cuentas.md](cuentas.md#planes-dar-pro-a-alguien)). Si se enciende:

- Cobrar de verdad dentro de la app: mirar antes las normas de pago de Google
  Play (creo que exigen su sistema de pagos para funciones digitales; sin
  comprobar).
- Decidir qué más es de Pro. Recomendación: la energía, si se hace de Pro,
  desbloqueada durante el modo emergencia.

## Hecho el 16/11/2026

Todo sin módulos nativos: llega por actualización, sin APK nuevo. Probado en
la versión web y con tests; no probado en el móvil.

- Kit en cuatro listas (casa, mochila, coche y botiquín) sacadas de Ready.gov.
  La mochila dice el agua para beber y la comida de 72 horas para la casa.
- Lo que añade cada casa al kit puede llevar caducidad (medicinas, pilas…):
  sale en «Rotar pronto», avisa como los productos y se edita en `kit/[id]`.
- Plan de compra por meses en Preparación, con el presupuesto y los precios
  que pone cada uno (`planCompra` en `calculo.ts`).
- Aviso de caducidad en Google Calendar desde un producto o un elemento del
  kit (`src/lib/calendario.ts`).
- Casa: cambiar el código, sacar a alguien y compartir la emergencia en curso.
- Web y textos de difusión (ver «Marketing»).

## Hecho el 15/11/2026

- Gastar un producto escaneándolo (botón de la cesta en la despensa). Si hay
  varios con el mismo código, primero el que antes caduca; en la emergencia,
  la comida se apunta como comida en el plan del día.
- Borrar la cuenta desde la app.
- Plan Pro asignado a mano desde Supabase (apagado: se vive de donaciones).
- Apartado de donaciones con PayPal en Ajustes (paypal.me/EBatalla167).

- Cuenta opcional con correo y código, casa compartida con código de
  invitación y sincronización sin conexión primero (gana el último cambio de
  cada elemento). Falta configurarlo en Supabase y probarlo en el móvil.

- Solo cuenta la comida que da tiempo a comer antes de que caduque; aviso de
  lo que se va a desperdiciar.
- Dónde se guarda cada producto (despensa, nevera, congelador) y guía de qué
  comer primero en emergencia: nevera (4 h), congelador (24/48 h), latas.
- El escenario se elige al empezar la emergencia y se puede cambiar durante
  ella; se guarda cuándo se fue la luz.
- Energía propia: power banks, baterías, placas (PVGIS) y generador frente a
  lo que gastan los aparatos.
- Trueque local: lo que sobra y falta, para compartir.
- Compartir el resultado («nuestra casa aguanta X días»).
- Elementos propios en el kit de emergencia.
- Idiomas: español e inglés, con test que exige todas las traducciones.
- Vídeo vertical de 15 s con HyperFrames: `marketing/aguante-dias.mp4`.
