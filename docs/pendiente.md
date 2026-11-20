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

**Decidido por Eric el 20/11/2026: no se cobra; solo donaciones.** Lo de
abajo queda como referencia por si se retoma.

Propuesta del 20/11/2026 (Eric pidió capar funciones a 2 € al mes, con la
primera semana con todo). Aprobada y descartada ese mismo día:

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

### Cobrar sin ser autónomo (mirado el 20/11/2026; no es asesoría fiscal)

- La cuenta «personal» de Google Play es una cosa de Google: deja publicar y
  cobrar como persona física, pero no dice nada de lo que pide Hacienda o la
  Seguridad Social en España.
- **Seguridad Social**: el Tribunal Supremo (STS 941/2025, de 10 de julio)
  dice que ganar menos del salario mínimo no libra del alta en el RETA si la
  actividad es habitual (para los no jubilados). Una suscripción que cobra
  cada mes, con una app mantenida, tiene pinta de habitual. Tarifa plana para
  el primer alta: unos 80 € al mes (88,64 € con el MEI en 2026) durante 12
  meses, y 12 más si los ingresos netos no pasan del SMI.
- **Hacienda**: para facturar a Google hace falta el alta en el censo (modelo
  036). Google Ireland es quien vende al usuario y el desarrollador le factura
  a Google, sin IVA y con inversión del sujeto pasivo: hace falta el ROI (en
  el mismo 036) y los modelos 303 y 349. Las fuentes que se encontraron son
  blogs y asesorías, algunas antiguas: confirmarlo con un gestor.
- **Google Play, si se cobra**: se cuenta como «comerciante» (Ley de
  Servicios Digitales de la UE) y Google enseña en la ficha la dirección y el
  teléfono (en las apps de pago, la dirección ya sale hoy). Mirar si vale una
  dirección de empresa o de coworking en lugar de la de casa.
- Recomendación: no cobrar hasta tenerlo hablado con un gestor. Mientras,
  donaciones (fuera de Play) o la app gratis en Play, sin enlace de PayPal.

### Para subir a Google Play (mirado el 20/11/2026)

Lo que ya está: `targetSdk` 36 (Google lo pide a las apps nuevas desde el
31/08/2026), solo pide cámara y notificaciones (el APK 1.1.0 lleva además la
ubicación, que ya no se usa y se va en el próximo), política de privacidad y
página de borrar la cuenta publicadas, borrar la cuenta dentro de la app, y
el perfil `production` de EAS genera el AAB.

Lo que falta, por orden (repasado el 20/11/2026):

- **Pantalla de consentimiento de Google en «Prueba»**: así solo pueden
  entrar con Google hasta 100 usuarios de prueba apuntados a mano, y su
  autorización caduca a los 7 días. Hay que publicarla (ya existen la página
  principal y la de privacidad). Fuente: Google, «Manage App Audience».
- **Correo de los códigos con el Gmail personal de Eric**: los usuarios ven
  esa dirección y Gmail no está pensado para envíos de una app. Pasar a un
  proveedor de correo con un dominio propio.
- **Supabase gratis** pausa el proyecto tras 7 días de poca actividad (avisa
  por correo una semana antes). Con usuarios reales es difícil que pase, pero
  si pasa dejan de ir las cuentas y las casas compartidas.
- **Compilación para Play**: perfil `production` (AAB y canal `production`).
  Es una compilación nativa nueva: antes, poner al día los parches de Expo
  (`npx expo install --fix`; hoy `expo-doctor` falla por eso) y subir
  `version` en `app.json`. Desde entonces, cada actualización se publica en
  los dos canales (`preview` para el APK de Eric, `production` para Play).
- **Donaciones en Play**: Google no deja enlazar a PayPal desde una app de
  Play. Ocultar «Apoyar Aguante» cuando el canal de la compilación sea
  `production` (`Updates.channel`), sin tocar el APK.
- **Probar en el móvil** lo que solo está probado en la web: tutorial,
  Actualidad con tu provincia, plan de compra y tiendas, notificaciones
  (caducidad y día de compra) y entrar con Google con PKCE.
- **Seguridad**: verificación en dos pasos en Expo, GitHub, Google y
  Supabase; cambiar la contraseña de aplicación de Gmail y el secreto de
  Google, y borrar el JSON del secreto de `~/Descargas`.
- Cuenta de desarrollador (25 $, una vez) con verificación de identidad.
  Las cuentas personales nuevas tienen que pasar una prueba cerrada con al
  menos 12 personas durante 14 días seguidos antes de pedir producción.
- Formularios de «Contenido de la app»: seguridad de los datos (correo,
  datos de la casa y datos de salud: embarazo, lactancia, peso), declaración
  de apps de salud (la app planifica comida: es «nutrición»), público
  objetivo, clasificación por edades y anuncios (ninguno).
- Ficha: icono de 512 px, gráfico de 1024 × 500, capturas y textos. En la
  descripción, decir que Aguante no es una app oficial y de dónde salen los
  avisos (la app ya lo dice en Actualidad desde el 20/11/2026).
- Dejar `ENLACE_DONAR` vacío en la versión de Play.
- Canal de EAS: la compilación de Play va por `production`; las
  actualizaciones se publican en ese canal, no en `preview`.

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

## Hecho el 21/11/2026: la lista la hace cada uno, y la web al día

A petición de Eric («prefiero eliminar lo de las tiendas… que sea el usuario
quién va creando su lista»; aprobó la propuesta entera).

- **Fuera las tiendas**: «Tus tiendas», «Buscar las que tengo cerca», la
  propuesta de productos y «Añadir otro de tus tiendas»
  (`src/lib/tiendas.ts`, `src/lib/catalogo.ts` y `src/constants/tiendas.ts`
  borrados). Fuera también la copia semanal de Mercadona
  (`scripts/precios-tiendas.mjs` y `.github/workflows/precios.yml`) y el
  módulo de ubicación (`expo-location`, del `package.json` y de los plugins
  de `app.json`).
- **Tu lista**: en el plan, debajo de agua, comida lista y comida para
  cocinar sale lo que falta («Faltan 52 L», «Faltan unas 7.600 kcal») y
  «Añadir agua/comida a tu lista», que abre `src/app/lista-producto.tsx`:
  escanear (en la web, escribir el código), «Comprar otra vez lo de tu
  despensa» (un toque), valores típicos o a mano (nombre, litros o peso y
  kcal/100 g, precio y nota). La cantidad la calcula la app o la fija cada
  uno, como antes; mientras no haya nada, la lista va en medidas típicas.
  La lista se queda de un mes para otro.
- **Migración** (store a la versión 5): se borran las tiendas y los
  productos que se hubieran elegido de ellas se quedan en la lista; su precio
  de la tienda pasa a ser el último precio si no había otro.
- `supabase/esquema.sql` borra la tabla de precios (falta que Eric lo
  ejecute; ver `cuentas.md`). Política de privacidad sin tiendas ni
  ubicación.
- **Web**: portada con modo emergencia, energía y Actualidad (capturas
  reales), preguntas al día (internet, «¿es oficial?»), guía nueva del kit
  (`web/guias/kit.html`), índice de guías, «Más guías» en cada una, 404
  arreglado, calculadora recompilada (quitaba código muerto), `sitemap.xml`
  y datos estructurados.

Comprobado: 111 tests, `tsc`, lint, `expo-doctor` (20/20) y export de
Android. En la versión web de la app: la migración desde la versión 4, añadir
un típico con precio y nota (el plan lo reparte y quita el genérico), comprar
otra vez algo de la despensa sin peso (cuenta sus kcal y su agua de cocer),
buscar un código en Open Food Facts de verdad, «Comprado» de algo escrito a
mano (pasa a la despensa sin código falso) y nada cortado a 320 px. La web,
en local a 1280, 375 y 320 px, en claro y oscuro, sin enlaces rotos.
**Sin probar en el móvil**: el escáner de la lista (en la web no hay cámara).

Queda:

- Que Eric vuelva a ejecutar `supabase/esquema.sql` (borra los precios) y
  borre el secreto `PRECIOS_TOKEN` de GitHub.
- El APK 1.1.0 aún lleva el módulo y el permiso de ubicación (no se usan).
  Se van en el próximo APK; hasta entonces, si se declara en Play, decir que
  no se usa.
- En los móviles que pidieron productos de tiendas queda guardada la caché
  `aguante-tiendas` (como mucho 30 días de productos). No molesta; se podría
  borrar al arrancar.
- Si un producto de la lista ya no hace falta (su tipo está cubierto), no se
  ve hasta que vuelva a faltar: no hay una pantalla para ver toda la lista.
- Web: el enlace de descarga sigue pendiente, y el `LICENSE` del repo es el
  de la plantilla de Expo (a nombre de 650 Industries): decidir licencia.

## Hecho el 20/11/2026: APK 1.1.0 y precios de Mercadona

**Precios de Mercadona** (Eric preguntó por su chat y le contestaron que se
puede usar la información publicada en sus canales oficiales; no nombran la
API ni el `robots.txt`: guardar la captura y, mejor, pedirlo por correo).
`scripts/precios-tiendas.mjs`, una vez a la semana desde GitHub Actions: una
petición por sección (conservas de pescado, mejillones, legumbres, arroz y
agua), el detalle de cada producto solo la primera vez (código de barras) y
las kcal de Open Food Facts por ese código. Lo guarda en `precios_tienda`. La
app, si la cadena tiene precios ahí, usa esos productos con su precio, su
enlace («Ver en la tienda») y la fecha; el precio que ponga cada uno manda.
Probado: el script contra Mercadona y Open Food Facts de verdad, sin escribir
(con `--solo=118`, arroz: 8 de 15 válidos, por ejemplo arroz redondo
Hacendado 1 kg a 1,15 €); el SQL en Postgres local. **En marcha** ese mismo
día: SQL ejecutado en Supabase, secreto creado y tres cargas desde GitHub
Actions. Resultado: 121 productos guardados, 84 publicados (52 conservas y
legumbres, 8 arroces, 24 aguas). En la primera se colaron dos gaseosas como
agua: arreglado con `esAguaParaBeber` (`catalogo.ts`), que usan la app y el
script. Los que no valen se guardan como no publicados para no volver a pedir
su detalle: cada lunes son 5 peticiones a Mercadona (comprobado: 0 detalles en
la tercera carga) y unas 10 a Open Food Facts por las kcal que no tiene.

**Lo que pide APK nuevo** (versión 1.1.0 en `app.json`):

- **Widget** de la pantalla de inicio con los días (`expo-widgets`,
  `src/widgets/dias.tsx`; se pone al día desde `src/lib/widget.native.ts`
  al cambiar el cálculo y desde la tarea en segundo plano).
- **Avisos naranjas y rojos de AEMET con la app cerrada**
  (`expo-background-task`, `src/lib/segundo-plano.native.ts`): más o menos
  cada hora, los de la provincia de Actualidad, una vez cada uno. Interruptor
  en Ajustes. Según la documentación de Expo, si se cierra la app a la fuerza
  la tarea se para hasta que se abre otra vez, y depende del fabricante.
- **Tiendas cerca** (`expo-location` y Overpass/OpenStreetMap, 3 km, la
  posición redondeada a ~1 km). El servidor público de Overpass a menudo está
  lleno (502): se reintenta con espera.
- **Registro de errores** (`src/lib/errores.ts`, tabla `errores`): solo los
  de JavaScript y no en desarrollo. Interruptor en Ajustes › Privacidad.
- Parches de Expo al día (`expo-doctor` pasa las 20 comprobaciones) y fuera
  tres permisos de la plantilla que no se usan (dibujar sobre otras apps y
  leer y escribir el almacenamiento).

Comprobado: 119 tests, `tsc`, lint, `expo-doctor`, export de Android (el
widget queda como texto en el bundle) y `expo prebuild` (receptor del widget,
permisos y versión en el manifiesto). Aquí no hay emulador usable (sin
`/dev/kvm`) y el Java instalado (27) es más nuevo de lo que admite Gradle, así
que se compiló en EAS: **APK versionCode 4, bien compilado el 20/11/2026, sin
instalar ni probar en el móvil**.

## Hecho el 20/11/2026: tus tiendas en el plan de compra (quitado el 21/11/2026)

- **Tus tiendas** (en el plan): se eligen cadenas de una lista
  (`src/constants/tiendas.ts`) o se escribe otra. Encontrarlas solas por
  cercanía pediría el permiso de ubicación (módulo nativo, APK nuevo): no se
  ha hecho.
- **Productos de esas tiendas**: conservas, arroz y agua de Open Food Facts
  (`src/lib/tiendas.ts`, guardado 30 días en `aguante-tiendas`). Primero
  search.openfoodfacts.org, que filtra por el nombre de la tienda y encuentra
  más (20/11/2026: Mercadona 243 conservas, 30 arroces y 54 aguas; Carrefour
  443, 78 y 37; Lidl 117, 10 y 11). No tiene CORS: en la web falla y entra la
  búsqueda clásica, que filtra por la etiqueta, encuentra menos y a ratos
  responde 503. Filtros y propuesta en `src/lib/catalogo.ts` y `proponer`
  (`compra.ts`); los criterios, en `fuentes-y-reglas.md`.
- **Lista propuesta y modificable**: la necesidad de agua, comida lista y
  arroz se reparte entre los productos elegidos; cada uno con su precio, su
  cantidad (automática o fijada) y quitar; «Añadir otro de tus tiendas».
  Lo que no cubran sigue en unidades de referencia. El reparto en meses es el
  mismo de antes, con lo que da cada producto.
- **Precios**: no hay fuente. Open Prices no tenía ninguna de 20 conservas de
  Mercadona en España (mirado el 20/11/2026): los pone cada uno y se recuerda
  el último por producto.
- **¿Y la tienda online de Mercadona?** (mirado el 20/11/2026) Su API
  (`tienda.mercadona.es/api/…`) responde sin sesión, pero su `robots.txt`
  prohíbe `/api` a los programas, no es una API pública ni documentada, el
  precio depende del almacén (código postal) y una app publicada la llamaría
  desde miles de móviles. Además, sacar una parte sustancial de una base de
  datos ajena choca con el derecho «sui generis» de la UE (Directiva 96/9/CE).
  Recomendación de entonces: no usarla sin permiso. **Ese mismo día Eric
  preguntó a Mercadona** y se usa con una copia semanal (ver «APK 1.1.0 y
  precios de Mercadona», arriba).
- **Escanear**: al añadir a la despensa un producto que está en la lista (por
  código de barras), sale encendido «Lo he comprado para el plan de compra»
  con su último precio, y al guardar se apunta. Si solo coincide el tipo
  (agua, conserva…), sale apagado: puede que se esté apuntando lo que ya había
  en casa. «He comprado otra cosa: escanearla» abre el escáner con la línea
  del plan ya puesta.
- **PKCE** al entrar con Google (ver `cuentas.md`).

Comprobado: 114 tests (con respuestas reales de Open Food Facts en
`tests/datos/`), `tsc`, lint y export de Android; en la web, contra Open Food
Facts de verdad (por la búsqueda clásica): proponer con Mercadona, quitar,
añadir, fijar cantidad, «Comprado» de un producto y el escáner simulado con
`/anadir?codigo=…`. **Sin probar en el móvil**, y en particular la búsqueda en
search.openfoodfacts.org desde la app (se probó desde Node con el mismo código).

## Hecho el 20/11/2026: plan de compra mejorado

Pantalla propia, `src/app/compra.tsx` (se entra desde Preparación); el
cálculo, en `src/lib/compra.ts` (puro, con tests en `tests/compra.test.mjs`),
y lo que comparte con Preparación, en `src/lib/use-compra.ts`. Las cifras y
su fuente, en `fuentes-y-reglas.md` («Plan de compra»). Sin módulos nativos
ni SQL: va por actualización.

- Lista por categorías: reponer lo que caduca, agua, comida lista para
  comer, comida para cocinar (solo si el escenario deja cocinar; su agua de
  cocer se suma a las garrafas), mascotas y lo que falta del kit.
- Dos sentidos: «Gasto al mes» (cuándo se llega a los días del objetivo y
  cuándo acaba todo) y «Para una fecha» (lo mínimo que hay que apartar al
  mes para acabar a tiempo).
- Prioridad automática: reponer ese mes, luego lo que menos días da (agua o
  comida; antes lo que no hay que cocinar), luego mascotas y kit.
- «Comprado»: cuántas, precio y caducidad; pasa a la despensa (o marca el
  kit) y apunta el gasto. «He comprado otra cosa» apunta el gasto y abre el
  escáner. Barra de lo gastado este mes, lo comprado (se puede quitar del
  gasto) y gasto acumulado.
- Recordatorio el día de compra (notificación local, los tres próximos
  meses, se reprograman al abrir la app) y compartir la lista del mes.
- Se recuerda el último precio de cada cosa. Los dos precios del plan
  antiguo (garrafa y bote) pasan a la lista nueva: el store sube a la
  versión 4 para migrarlos.
- Preparación enseña la misma lista que el plan (antes decía otra cantidad
  de agua porque no contaba el agua de cocer).
- **Casa compartida, decidido**: el plan es de cada móvil (presupuesto,
  precios y gasto). Lo que compra cualquiera entra en la despensa o el kit,
  que sí se comparten, y sale de la lista de todos. Repartir «quién compra
  qué» pediría un tipo nuevo en el SQL (y que Eric volviera a ejecutar
  `esquema.sql`); para coordinarse está «Compartir la lista».

Comprobado: 103 tests, `tsc`, lint y export de Android limpios; en la
versión web, con una casa de prueba, el reparto, el modo fecha, comprar agua
y kit, quitar un gasto, la migración de precios y que no se corte nada a
320 px. **Sin probar en el móvil**: la notificación del día de compra y el
menú de compartir (en la web no hay ninguno de los dos).

Arreglado ese mismo día: encender el recordatorio con las notificaciones
apagadas ya no enciende las de caducidad. En Ajustes, «Notificaciones» tiene
un interruptor general y, debajo, de qué avisar: caducidad de la despensa,
caducidad del kit y día de compra (`notificar` en el store, de cada móvil).
Los avisos oficiales de Actualidad no notifican: solo se ven con la app
abierta (avisarlos con la app cerrada pide APK nuevo).

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
  que pone cada uno (era `planCompra` en `calculo.ts`; rehecho el
  20/11/2026, ver arriba).
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
