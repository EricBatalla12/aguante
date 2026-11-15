# Pendiente

Ideas apuntadas para más adelante. Lo ya hecho está al final.

## Cuentas y casa compartida: lo que falta

Hecho el 15/11/2026 (ver [cuentas.md](cuentas.md)). Queda:

- Si se sube a Google Play: una página web para pedir que se borre la cuenta
  sin instalar la app (creo que Play lo pide además del botón de la app; sin
  comprobar).
- Compartir también la emergencia en curso: hoy es de cada móvil, porque el
  agua y la comida apuntadas hoy se pisarían si dos personas apuntan a la vez.
- Cambiar el código de la casa o echar a alguien.

## Trueque entre usuarios

La versión de ahora es local: calcula lo que sobra y lo que falta y lo deja
listo para mandarlo por WhatsApp o Telegram. Un trueque entre usuarios
cercanos dentro de la app necesita las cuentas de arriba y decidir qué pasa
sin internet.

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

- Más vídeos con HyperFrames a partir de `marketing/video-dias/` (el kit de
  72 h en 30 s, la energía sin luz…). Para subirlos a redes falta música:
  HyperFrames recomienda sonido en vídeos de más de 15 s.
- Calculadora en una web sin instalar nada que lleve a descargar la app (lo
  hace Provision); el cálculo de `src/lib/calculo.ts` es puro y se puede
  reutilizar.
- Aprovechar los momentos en que la gente busca esto: apagones, DANAs, olas
  de calor, la campaña de la UE de tener reservas para 72 h (citada de
  memoria, sin comprobar).
- Contenido útil con fuentes y guías en la web («cuánta agua por persona»,
  «rotar la despensa»), y que un nutricionista o alguien de protección civil
  revise la pantalla de fuentes.
- Compartir el resultado como imagen (hoy se comparte como texto).
- Asociaciones de vecinos, scouts, protección civil y prepper/camping en foros
  y Reddit.

## Ideas sacadas de otras apps (sin hacer)

- Avisos de caducidad en tu propio calendario (suscripción ICS), como
  Provision.
- Plan de compra con presupuesto mensual.
- Mochila de evacuación aparte, medida contra 72 horas, y plantillas de kit
  (coche, botiquín).
- Quitar un producto escaneándolo al gastarlo.
- Medicinas y pilas con caducidad.

## Planes de pago (Pro)

Hecho el reparto a mano (ver [cuentas.md](cuentas.md#planes-dar-pro-a-alguien)):
de momento solo el trueque es de Pro. Queda:

- Cobrar de verdad dentro de la app: mirar antes las normas de pago de Google
  Play (creo que exigen su sistema de pagos para funciones digitales; sin
  comprobar).
- Decidir qué más es de Pro. Recomendación: la energía, si se hace de Pro,
  desbloqueada durante el modo emergencia.

## Hecho el 15/11/2026

- Gastar un producto escaneándolo (botón de la cesta en la despensa). Si hay
  varios con el mismo código, primero el que antes caduca; en la emergencia,
  la comida se apunta como comida en el plan del día.
- Borrar la cuenta desde la app.
- Plan Pro asignado a mano desde Supabase; el trueque es de Pro.

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
