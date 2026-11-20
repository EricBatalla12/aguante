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

## Trueque: quitado

El 20/11/2026 Eric decidió quitar el trueque con vecinos (pantalla, enlace de
Inicio, nota guardada y cálculo del excedente). La propuesta de trueque entre
usuarios ya no se hará. El vídeo `marketing/aguante-verbos.mp4` aún enseña la
pantalla de trueque en «COMPARTE»: hay que cambiar esa escena.

## Monetizar

Principio que sigue en pie: que la app sirva gratis y sin internet en una
emergencia; nunca bloquear tras pago el cálculo, el modo emergencia, las
fuentes ni los avisos oficiales que están en vigor.

Propuesta del 20/11/2026 (Eric pidió capar funciones a 2 € al mes, con la
primera semana con todo). **Aprobada por Eric el 20/11/2026, sin hacer** (el
orden de trabajo está en CLAUDE.md, «Siguiente trabajo»):

- **Aguante Plus**: 1,99 € al mes o 14,99 € al año. Los 7 primeros días desde
  que se instala, todo abierto sin pedir tarjeta; después se capa.
- **Gratis siempre**: días que aguantáis, despensa y escáner, hogar, modos,
  modo emergencia, kit, fuentes, casa compartida y los avisos de AEMET en vigor
  (en Actualidad e Inicio).
- **Plus**: el plan de compra (mejorado), Actualidad completa (historial,
  alertas de alimentos y medicamentos, filtros, noticias) y lo nuevo que se
  haga (varias casas, informe en PDF, avisos con la app cerrada…).
- **Cobro**: lo recomendado es Google Play (suscripción con su sistema de
  pagos; comisión 10 % + 5 % de cobro según Google, marzo de 2026). Necesita
  publicar en Play, un módulo nativo (APK nuevo) y quitar el enlace de PayPal
  en esa versión. Fuera de Play (APK suelto), un intermediario como Lemon
  Squeezy se lleva una parte fija por cobro que con 2 € pesa mucho (sin
  comprobar en su web). El plan Pro de Supabase (`planes`, `soy_pro`) ya
  existe y puede guardar quién paga.
- **Antes de cobrar**: alta en Hacienda y, quizá, como autónomo: preguntarlo a
  un gestor. Actualizar la política de privacidad.

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

## Avisos oficiales: lo que falta

Hecho el 18/11/2026 (ver «Hecho el 18/11/2026» y `fuentes-y-reglas.md`).
Queda:

- Avisar con notificación aunque la app esté cerrada: necesita tarea en segundo
  plano (módulo nativo, APK nuevo) o un servidor que mande avisos.
- Guerras y conflictos: no hay fuente oficial abierta y fiable; descartado.
- Comprobar las matrículas del IGN de Baleares y Las Palmas cuando haya un
  terremoto allí.
- Más fuentes oficiales para Actualidad: Protección Civil no tiene RSS (ver
  `fuentes-y-reglas.md`); quedan por mirar los 112 de cada comunidad. La DGT
  daba 502: volver a probarla (y ver cuánto pesa su XML para un móvil).
- Las noticias y alertas solo están en español (también con la app en inglés);
  Copernicus, en inglés.
- Avisar si un producto de la despensa coincide con una alerta de AESAN: las
  alertas no traen código de barras, solo texto (marca y lote en la ficha).

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

## Hecho el 18/11/2026 por la tarde: más fuentes en Actualidad

Tras pedirlo Eric («todas las que funcionen menos la nuclear» y un filtro por
tipo). Publicado el mismo día (actualización `107efbb6`); probado en web con
datos reales bajados desde Node, **no en el móvil**.

- Fuentes nuevas: **AESAN** (alertas alimentarias, leídas de su página porque
  no tiene RSS), **AEMPS** (alertas de medicamentos) y **Copernicus EMS**
  (activaciones de emergencia de la UE). Descartadas y por qué, en
  `fuentes-y-reglas.md`.
- Filtro por tipo (Tiempo, Terremotos, Desastres, Alimentos, Medicamentos,
  Noticias) además del de zona.
- Si falla alguna fuente, el aviso dice cuál.

## Hecho el 18/11/2026 por la tarde: pestaña Actualidad

Sin módulos nativos: va por actualización. Tests (88), `tsc`, lint y export de
Android limpios. Probado en web (Metro 8082, 375 y 320 px) con datos reales
bajados desde Node (en web los RSS no bajan por CORS); **no en el móvil**.

- Los avisos dejan de ser una pantalla aparte (`/avisos`) y pasan a ser la
  quinta pestaña, **Actualidad**: lo que está en vigor arriba y «Lo que ha
  pasado» del último mes debajo, por días y con filtro Todo / Provincia /
  España / Mundo. Solo fuentes oficiales (decidido con Eric).
- Fuente nueva: **noticias de AEMET** (RSS en ISO-8859-15, leído con
  `latin9`).
- Historial de 30 días guardado en el móvil (`juntarMeteo`,
  `juntarTerremotos`, `juntarDesastres`, `juntarNoticias`, `actualidad` en
  `avisos.ts`).
- Paso nuevo del tutorial (ahora son ocho) y pregunta frecuente y pantalla de
  fuentes al día.
- Con cinco pestañas, «Preparación» se cortaba a 320 px: la etiqueta de cada
  pestaña la pinta ahora `Texto` con `ajustar` y sin el relleno del botón.
- Sin comprobar en Android: que `fetch().arrayBuffer()` funcione (si falla, las
  noticias no se bajan y sale el aviso de descarga incompleta) y cómo quedan
  las etiquetas de las pestañas.

## Hecho el 18/11/2026

Probado en la versión web (Metro 8082, 375×812), **no en el móvil**. Tests
(75), `tsc`, lint y export de Android limpios. Publicado el mismo día
(actualización `36296207`).

- **Agua = beber + higiene.** Beber: lo mayor entre la EFSA y 1 mL por kcal
  (NRC 1989), ×2 con calor; higiene por modo: normal 1,5 L, ligero 0,5 L,
  severo y extremo 0. Con calor la higiene ya no desaparece. En Inicio y Hogar
  se ve partido. Detalle y fuentes en `fuentes-y-reglas.md`.
- **Actividad física** sedentaria (PAL 1,4, por defecto) o normal (1,6): la del
  día a día en Ajustes (se comparte con la casa como ajuste `actividad`, sin
  cambiar el SQL) y la de la emergencia, que se elige al empezarla (por defecto
  sedentaria) y va dentro de la emergencia. También en Modos.
- **Tutorial guiado** (`src/lib/tutorial.ts`, `src/components/tutorial.tsx`):
  siete pasos por las pestañas y Ajustes, con la parte explicada a la vista
  (`<Hueco id>`) y el resto oscurecido; Omitir, Atrás y Siguiente. Sale solo la
  primera vez con la app vacía; `tutorialVisto` es del móvil (no va en copias
  ni se comparte). Sin librerías nativas.
- **Ayuda en Ajustes**: «Ver el tutorial» y 11 preguntas frecuentes
  desplegables (`src/components/preguntas.tsx`).
- La calculadora de la web (`web/js/lib/calculo.js`, `npm run sitio`), la guía
  del agua y la portada, al día.
- **Tutorial, segunda vuelta** (tras probarlo Eric en el móvil): si lo que se
  señala está fuera de la pantalla (los botones de Hogar con 4 personas), la
  pantalla se desplaza hasta él (`useDesplazar` de `Pantalla`); cada paso se
  vuelve a medir; tras cambiar de paso se ignoran los toques 450 ms; la tarjeta
  se queda abajo salvo que tape lo señalado.
- **Avisos oficiales**: AEMET en tu provincia, terremotos del IGN y desastres
  de GDACS, en `/avisos` (enlace en Inicio) y una tarjeta en Inicio con el
  aviso naranja o rojo de las próximas 48 horas. Probado en web con datos
  reales cargados a mano (en web no se descargan por CORS) y la descarga real
  desde Node; **no en el móvil**.

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
