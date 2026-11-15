# Pendiente

Ideas apuntadas para más adelante. Lo ya hecho está al final.

## Cuentas y casa compartida

Poder iniciar sesión y que varias cuentas compartan una misma casa, para que
quienes viven juntos vean y editen la misma despensa, el mismo hogar y el
mismo kit desde varios móviles.

- Hace falta un servidor; ahora todo vive en el móvil (zustand persistido en
  SQLite, `src/lib/store.ts`). Recomendación: Supabase (cuentas, base de datos
  Postgres y cambios en tiempo real, con plan gratuito). La cuenta de Supabase
  la tiene que crear Eric.
- La casa sería la unidad que se comparte: una cuenta crea la casa e invita a
  las demás con un código o un enlace.
- Tiene que seguir funcionando sin conexión (es una app de emergencias):
  guardar en local como ahora y sincronizar cuando vuelva la red. Hay que
  decidir qué pasa si dos personas cambian lo mismo sin conexión.
- Por decidir: qué se comparte y qué no. Lo lógico es compartir despensa,
  hogar, kit, energía y modo, y dejar el tema, el idioma y los avisos en cada
  móvil.
- La copia de seguridad (exportar / importar en Ajustes) ya sirve para pasar
  los datos de un móvil a otro mientras tanto.

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

## Hecho el 15/11/2026

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
