# CLAUDE.md

Aguante: app Expo (Android) para llevar la reserva de emergencia de casa
(comida, agua, energía) y saber cuántos días aguantaría. Para qué sirve cada
cosa y cómo se instala: [README.md](README.md). Reglas de Expo del proyecto:
[AGENTS.md](AGENTS.md) (no fiarse de la memoria para APIs de Expo: leer la
documentación de la SDK 58). Cifras y fuentes: [docs/fuentes-y-reglas.md](docs/fuentes-y-reglas.md).
Ideas pendientes: [docs/pendiente.md](docs/pendiente.md).

## Cómo prueba Eric y qué puedo comprobar yo

- Eric usa la app en su Android. Desde el 15/11/2026 la tiene **instalada como
  APK** (compilación de EAS, perfil `preview`), ya no en Expo Go.
- Yo no veo el móvil. Lo que puedo medir: `npm test`, `npx tsc --noEmit`,
  `npx expo lint`, `npx expo-doctor`, que compile
  (`npx expo export --platform android --output-dir <scratch>`) y la versión
  web.
- Web: si Eric no tiene su Metro en el 8081, arrancar con el panel de
  navegador la configuración `aguante-web` de `/home/eric/Proyectos/.claude/launch.json`
  (Metro en el **8082**). Datos de prueba: escribir `localStorage['aguante']`
  como `{state, version: 4}` y recargar (con una versión anterior, pasa por
  la migración). El panel a veces no se pinta: las
  animaciones solo avanzan al hacer una captura; los textos cortados se miden
  con JS (`scrollWidth > clientWidth` con overflow no visible, en iframes de
  320 px). Parar el servidor al acabar.
- En web, la búsqueda por nombre de Open Food Facts falla por CORS: en el móvil
  no pasa.
- Al cerrar un trabajo: separar lo comprobado en web de lo no comprobado en el
  móvil, y repasar lo pedido punto por punto.

## Compilar e instalar (EAS)

- Cuenta de Expo de Eric: `eric_161`; proyecto `@eric_161/aguante`, paquete
  `com.eric_161.aguante`. Desde aquí `npx --yes eas-cli@latest …` funciona con
  su sesión (`whoami`, `build:list`, `build:view`, `update:list`).
- APK nuevo: `npx --yes eas-cli@latest build -p android --profile preview
  --non-interactive --no-wait` (desde aquí funciona, con el visto bueno de
  Eric). `preview` tiene `autoIncrement` (sube el versionCode en cada APK).
  Para ver canal y runtime de una compilación: `build:view <id>` (en el JSON
  son `updateChannel.name` y `runtime.version`, no `channel`).
- **EAS Update** configurado (canal `preview`, `runtimeVersion` con política
  `appVersion`). Cambios solo de JS/textos: `npm run publicar -- -m "…"` y le
  llegan al abrir la app (se aplican en el siguiente arranque). En Ajustes,
  abajo, se ve qué actualización tiene.
- Hace falta APK nuevo **y subir `version` en app.json** si se añade o
  actualiza un módulo nativo, o se cambian permisos o plugins.
- **Desde el 20/11/2026 `app.json` está en la versión 1.1.0** (widget,
  segundo plano, ubicación y parches de Expo). **APK versionCode 4**
  compilado el 20/11/2026 (commit `e0408e3`, runtime 1.1.0, canal `preview`):
  https://expo.dev/artifacts/eas/l49WoAq1oLhiBnvONO_1qAiG-wQscBlsFuStfu-LT_s.apk
  Lo que se publique ahora va al runtime 1.1.0 y **no llega al APK 1.0.0**;
  no publicar nada para 1.0.0 desde este código (usa módulos nativos que ese
  APK no tiene). Sin confirmar que Eric lo haya instalado.
- Publicar una actualización o lanzar una compilación es algo que se ve fuera
  del PC: confirmarlo con Eric antes.

- Eric tiene instalado el **APK versionCode 3** (commit `91ca425`) y **ese sí
  recibe las actualizaciones** (comprobado el 15/11/2026: le llegó la
  `5a049262`). Con el versionCode 2 no se aplicaban y nunca se supo por qué
  (el APK estaba bien configurado). Para verlo desde el móvil:
  `src/components/actualizacion.tsx` (aviso «Reiniciar ahora» en Inicio y, en
  Ajustes, canal, runtime, última comprobación, errores y «Buscar
  actualización»). Lanzamientos por actualización: `npx eas-cli
  update:insights <grupo>`.
- **Ojo con el número que enseña la app**: abajo en Ajustes sale el ID de la
  actualización **de Android** (8 primeras cifras de «Android update ID» al
  publicar), no el del grupo. Al pedirle a Eric que compruebe una
  actualización, darle ese número. Ejemplo: grupo `c895fffd` → en la app
  `01a1ef48`. La actualización se baja al abrir y se aplica en el siguiente
  arranque (o con «Reiniciar ahora»). Da igual dónde esté el PC: el móvil la
  baja de los servidores de Expo.

## Convenciones del código

- Todo en español: código, comentarios, textos y commits.
- **Textos**: todo lo que se ve pasa por `t('texto en español')` de
  `src/lib/i18n.ts`; las constantes fuera de componentes se marcan con
  `tx('…')` y se traducen al pintarlas. Plurales con `tn`. La traducción va en
  `src/i18n/en.ts` y `tests/i18n.test.mjs` falla si falta alguna o no lleva las
  mismas `{variables}`. Números y fechas se formatean según el idioma
  (`formatoNumero`, `textoCantidad`, `src/lib/fechas.ts`).
- **Interfaz**: todo texto con `Texto` de `src/components/ui.tsx` (evita textos
  cortados); `Segmentado` traduce sus etiquetas. Colores con `useC()`, nunca
  fijos. Confirmaciones con `confirmar({ titulo, nombre, mensaje, accion,
  icono, imagen, tono, alAceptar })` de `src/lib/confirmar.ts`, que abre el
  diálogo propio (`src/components/dialogo.tsx`).
- **Cálculo puro**: `src/lib/calculo.ts`, `src/lib/energia.ts`,
  `src/lib/compra.ts` y `src/lib/fechas.ts` no importan nada (los tests corren con `node --test` sin
  compilar). Si cambia una cifra, cambiarla también en
  `docs/fuentes-y-reglas.md` y en `src/constants/fuentes.ts` (pantalla de
  fuentes). No meter cifras de memoria: buscar la fuente y marcar «criterio
  propio» lo que no la tenga.
- **Estado**: `src/lib/store.ts` (zustand persistido, `version: 4`; subir la
  versión hace que `migrate` pase los datos guardados por `normalizar`). Un campo
  nuevo va en `Datos`, `INICIAL`, `soloDatos` y, si hace falta, en `normalizar`
  (migración y copias importadas). Lo que es solo del móvil y no va en copias
  (como `tutorialVisto`) va en `Estado`, fuera de `Datos`.
- **Escenario y actividad**: para calcular, usar `useEscenario()` de
  `use-resultado.ts` (el escenario guardado más la actividad que toque: la de
  la emergencia en curso o la de Ajustes), no `s.escenario` a pelo.
  `setEscenario` reparte la actividad a su sitio.
- **Tutorial**: los pasos están en `PASOS` de `src/lib/tutorial.ts`; lo que
  señala cada paso se envuelve con `<Hueco id>` en su pantalla, que tiene que
  ser una `Pantalla` (de ella sale `useDesplazar`, que lleva el scroll hasta lo
  señalado). Si cambia una
  pantalla o una regla, revisar sus textos y las preguntas de
  `src/components/preguntas.tsx`.
- **No usar Prettier**: el proyecto no lo tiene configurado y reformatea los
  ficheros enteros. Respetar el estilo existente (comillas simples, líneas
  largas).
- El compilador de React no deja leer `ref.current` al pintar (lint
  `Cannot access refs during render`): un `Animated.Value` va en `useState`.
- Las rutas tipadas (`.expo/types/router.d.ts`) se regeneran al arrancar Metro:
  hasta entonces `tsc` da error en rutas nuevas.
- Vídeos de marketing (HyperFrames, 1080×1920; `npm run check` y `npm run render` dentro de cada
  carpeta; `video-semana` y `video-apagon` tienen `SPEC.md` y `REVIEW.md`):
  - `marketing/video-dias/` (15 s, sin sonido) → `marketing/aguante-dias.mp4`.
  - `marketing/video-semana/` (27,6 s, de 3 a 7 días, música y efectos) → `marketing/aguante-semana.mp4`.
  - `marketing/video-apagon/` (25,9 s, el reloj del apagón, el más dramático) →
    `marketing/aguante-apagon.mp4`.
  - `marketing/video-escaner/` (21 s, escanear una lata; hecho con las notas de abajo) →
    `marketing/aguante-escaner.mp4`.
  - Tres vídeos con todas las funciones (18/11/2026; los tres guiones en
    `marketing/video-funciones/STORYLINES.md`, cada uno con su `SPEC.md` y `REVIEW.md`):
    `marketing/video-numero/` (43 s, el número sube de 0 a 7 días y se va la luz) →
    `marketing/aguante-numero.mp4`; `marketing/video-verbos/` (27,6 s, seis verbos al ritmo) →
    `marketing/aguante-verbos.mp4`; `marketing/video-zoom/` (38 s, zoom sin fin dentro del 7) →
    `marketing/aguante-zoom.mp4`. Las capturas salen de `marketing/video-funciones/datos/`:
    `casa.mjs` (casa de ejemplo; los días los calcula la app) y `capturar.mjs` (Chrome sin ventana
    contra el Metro del 8082; la casa compartida con una sesión simulada y las respuestas de
    Supabase contestadas desde el script).
  - **Capturas del escáner**: en la web la cámara no se abre; en desarrollo, `/anadir?escanear=1` abre el
    escáner y `/anadir?codigo=…` busca un código (`src/app/anadir.tsx`). Con Chrome sin ventana y
    `--use-fake-device-for-media-stream --use-file-for-fake-video-capture=<vídeo .y4m>` el escáner de la app
    lee de verdad un código de barras dibujado. La web pinta la cámara en espejo: quitar el `transform` del
    `<video>` antes de capturar.
  - **Notas de Eric para los vídeos** (16/11/2026, tras ver `aguante-apagon.mp4`, que le gustó; aplicadas en
    `video-escaner`):
    - El móvil tiene que verse más: en los dos últimos empieza en y = 560 px y, entre el titular y la
      franja de abajo que tapan las redes (desde 1248 px), solo se ve un trozo de la pantalla. Subirlo
      y agrandarlo, y dejar el titular corto, encima o al lado.
    - Tiene que verse la idea principal: escanear el código de barras.
    - Tiene que quedar claro que la app está pensada para latas y conservas.
    - El escáner que salga tiene que ser el de la app (ver «Capturas del escáner»), no uno dibujado.
  - Música del catálogo de HeyGen con la sesión de `npx hyperframes auth login` (cuenta de Eric). La
    búsqueda va por `~/.claude/skills/media-use/audio/scripts/audio.mjs` (`media-use resolve --type bgm`
    pide la CLI `heygen`, que no está instalada).

## Estado a 16/11/2026 (al final del día)

- **En GitHub**: repositorio **público** `EricBatalla12/aguante` (se llamaba
  `aguante-web` y solo tenía la web). La rama local `feat/mvp` sigue a
  `origin/main` (`git push origin feat/mvp:main`); la local `master` se quedó
  en el commit inicial y no se usa. Todo está commiteado y subido
  (`git log -1` dice cuál es el último). No van a git la caché de los vídeos ni la música de HeyGen
  (`marketing/*/.media/`): para volver a renderizar un vídeo hay que volver a
  bajarla (la búsqueda está en su `REVIEW.md`). **Al ser público, no escribir
  aquí ni en `docs/` nada privado.**
- Lo del 16/11/2026 (detalle en `docs/pendiente.md`, «Hecho el 16/11/2026»):
  kit en cuatro listas con caducidades, plan de compra por meses, avisos en
  Google Calendar, cambiar el código de la casa, sacar a alguien y compartir la
  emergencia en curso. Tests, `tsc`, lint, `expo-doctor` y export de Android
  limpios; probado en la versión web, **no en el móvil**. Publicado por EAS
  Update el 16/11/2026 con el visto bueno de Eric, después de que ejecutara
  `supabase/esquema.sql` (comprobado: el servidor ya tiene `cambiar_codigo` y
  `echar_de_casa`; sin sesión responden «permission denied», no «no existe»).
  Falta que Eric lo pruebe en el móvil.
- **Del 18/11/2026, en git y publicado** (commit `5086022`, actualización
  `36296207`, web desplegada; detalle en `docs/pendiente.md`,
  «Hecho el 18/11/2026»): agua = beber (EFSA o 1 mL/kcal) + higiene por modo,
  actividad sedentaria/normal (día a día y emergencia), tutorial guiado y
  Ayuda con preguntas frecuentes en Ajustes. Tests, `tsc`, lint y export de
  Android limpios; probado en web, **no en el móvil**. Va por actualización (sin
  módulos nativos ni SQL nuevo). Sin comprobar en Android: que el hueco del
  tutorial (medido con `measureInWindow`) caiga justo encima de lo que señala.
  `expo-doctor` falla por parches nuevos de Expo (`expo-web-browser` 58.1 y
  otros); ya fallaba antes y no se ha tocado: actualizar uno nativo pide APK.
- **Del 18/11/2026 por la tarde, en git y publicado** (commit `3e5226d`,
  actualización `c895fffd`): arreglos del
  tutorial (desplazar hasta lo señalado, medir en cada paso, sin dobles toques)
  y **avisos oficiales** (AEMET, IGN y GDACS; `src/lib/avisos.ts`,
  `src/lib/avisos-estado.ts`, entonces en `src/app/avisos.tsx`, hoy pestaña
  Actualidad). Tests (84), `tsc`, lint y
  export de Android limpios; en web los RSS no bajan por CORS (se probó con
  datos cargados a mano y la descarga desde Node). **Ya en el móvil de Eric**
  (18/11/2026, 16:40: Ajustes enseña la actualización `01a1ef48`), pero falta
  que pruebe el tutorial nuevo y la pantalla de avisos con su provincia.
- Última actualización publicada: grupo `fff77e3f` (en la app, `01a1f9b1`;
  productos de tus tiendas en el plan, escáner que apunta lo comprado y
  PKCE, commit `c1ea39c`), canal `preview`, runtime 1.0.0, el 20/11/2026.
  Sin confirmar que le haya llegado al móvil de Eric. Las anteriores:
  `b6534754` (en la app `01a1f990`; elegir notificaciones), `6bde7b32` (en la app `01a1f98c`; plan
  de compra), `baa21b36` (en la app `01a1f97a`; sin el trueque), `107efbb6` (en la app `01a1efb8`; Actualidad con AESAN, AEMPS,
  Copernicus y filtro por tipo), `078c8705` (en la app `01a1ef9f`; pestaña
  Actualidad), `c895fffd`
  (en la app `01a1ef48`; avisos oficiales y tutorial sin tirones),
  `36296207` (agua beber + higiene, actividad, tutorial y preguntas), `533b7fe4` (kit en listas, plan de compra, calendario y casa
  compartida) y `5a049262` (entrar con Google).
- APK versionCode 3: https://expo.dev/artifacts/eas/naWm_cWazPsZsEM0vZBgwVSUwqB-Nbc5xWNhuODff_g.apk
- El modo automático bloquea a veces `git commit` si Eric no lo ha pedido en
  ese mismo mensaje: no rodearlo, preguntar.
- Para capturas o pruebas en la versión web con el panel sin pintar: Chrome sin
  ventana de HyperFrames (`~/.cache/hyperframes/chrome/…/chrome-headless-shell`)
  con `puppeteer-core` de la caché de npx, escribiendo `localStorage['aguante']`
  antes de cargar. La web estática se ve en local con la configuración
  `aguante-sitio` de `/home/eric/Proyectos/.claude/launch.json` (puerto 8090).

## Siguiente trabajo

### Aprobado por Eric el 20/11/2026 («me parece todo correcto»), por este orden

El 20/11/2026, con el visto bueno de Eric: el trueque quitado, en git
(`da50467`) y publicado (grupo `baa21b36`, en la app `01a1f97a`); los tres
vídeos de funciones, en git (`fd1965f`). Todo subido a `main`.

1. **Plan de compra mejorado: HECHO y publicado el 20/11/2026** (commit
   `47b190b`, grupo `6bde7b32`, en la app `01a1f98c`)
   (detalle, lo comprobado y lo que queda en `docs/pendiente.md`, «Hecho el
   20/11/2026»). Pantalla `src/app/compra.tsx`, cálculo en `src/lib/compra.ts`,
   lo común con Preparación en `src/lib/use-compra.ts`; el store pasa a la
   versión 4. Lo que se pidió:
   - Lista de compra real por categorías: agua, comida sin cocinar, comida que
     se cocina (solo si el escenario permite cocinar), pienso de mascotas y lo
     que falta del kit (elementos sin marcar de `DE_SERIE`: linterna, radio,
     pilas, botiquín…).
   - Dos sentidos: «puedo gastar X € al mes» → cuándo se llega al objetivo;
     «quiero llegar a N días para tal fecha» → cuánto al mes.
   - Prioridad automática: primero lo que más limita (normalmente el agua),
     luego lo que no hay que cocinar, luego el kit.
   - Marcar como comprado: pasa a la despensa pidiendo la caducidad; barra de
     progreso por mes y gasto acumulado.
   - Reposiciones: sumar lo que caducará en los meses del plan.
   - Recordatorio el día de compra (como los avisos de caducidad) y lista para
     compartir (Share). Con casa compartida, quién compra qué: decidido que
     el plan es de cada móvil (ver `docs/pendiente.md`).
   - Los precios los pone el usuario (no hay fuente fiable de precios medios:
     no inventarlos); recordar el último precio de cada cosa.
   Ese mismo día, publicado (grupo `fff77e3f`, en la app `01a1f9b1`): tus
   tiendas en el plan (productos de Open Food Facts por cadena, lista
   propuesta y modificable, el escáner apunta lo comprado; `src/lib/catalogo.ts`,
   `src/lib/tiendas.ts`) y PKCE al entrar con Google. La API de la tienda
   online de Mercadona se miró y se descartó (`docs/pendiente.md`). Lo que
   falta para publicar en Play, por orden: `docs/pendiente.md`, «Para subir a
   Google Play».
   Más tarde, el 20/11/2026, en git (`e0408e3`) y **en el APK versionCode 4**
   (sin instalar ni probar en el móvil): precios
   de Mercadona (copia semanal) y lo que pide APK nuevo (widget, avisos de
   AEMET con la app cerrada, tiendas cerca, registro de errores); detalle en
   `docs/pendiente.md`, «APK 1.1.0».
   También el 20/11/2026, a petición de Eric y publicado (grupo `b6534754`,
   en la app `01a1f990`): elegir en Ajustes de qué notifica la app y el aviso
   de «app no oficial» en Actualidad (ver
   `docs/pendiente.md`); y revisado si está lista para Play y si se puede
   cobrar sin ser autónomo (`docs/pendiente.md`, «Monetizar»).
2. **Funciones nuevas** (todas aprobadas):
   - «Gasta esto esta semana»: lo que caduca pronto, para comerlo en el día a
     día y reponerlo (que la app se abra cada semana).
   - Plan familiar de emergencia: punto de encuentro, teléfonos, quién recoge
     a los niños, dónde están los documentos; sin conexión y compartible con
     la casa (fuente: Ready.gov «Make a plan» / Protección Civil; buscarla).
   - Guías sin conexión: primeras horas de un apagón, potabilizar agua (solo
     con fuentes oficiales, como en `docs/fuentes-y-reglas.md`).
   - Varias casas (la del pueblo, la de los padres) e informe en PDF.
   - Avisos rojos con la app cerrada y widget con los días: **APK nuevo**.
3. **Aguante Plus: DESCARTADO por Eric el 20/11/2026** («de cobrar nos
   olvidamos, nos quedamos con las donaciones»). No hacer nada de esto salvo
   que lo vuelva a pedir; el código de Pro sigue apagado con `PRO_ACTIVO`.
   Lo que se había aprobado: 1,99 €/mes o 14,99 €/año; los 7 primeros días desde que se instala todo
   abierto sin tarjeta y después se capa. Gratis siempre: días, despensa y
   escáner, hogar, modos, modo emergencia, kit, fuentes, casa compartida y los
   **avisos de AEMET en vigor** (no cobrar por avisos de seguridad). Plus: plan
   de compra mejorado, Actualidad completa (historial, alertas de alimentos y
   medicamentos, filtros, noticias) y lo nuevo (varias casas, PDF, avisos con
   la app cerrada). Cobro recomendado: **Google Play** (10 % + 5 % de cobro,
   según Google en marzo de 2026); pide cuenta de desarrollador, publicar en
   Play, módulo nativo de pagos (APK nuevo) y dejar `ENLACE_DONAR` vacío en
   esa versión. Las piezas de Pro ya existen (`src/components/pro.tsx`,
   `usePro`, tabla `planes`, `PRO_ACTIVO`); falta la prueba de 7 días (fecha
   de la primera apertura; con cuenta, guardarla en el servidor para que no
   se reinicie al reinstalar). **Lo tiene que abrir Eric**: cuenta de Play y
   alta en Hacienda (y quizá autónomo: que pregunte a un gestor). Se puede
   construir el capado antes de cobrar y dejarlo apagado con `PRO_ACTIVO`.
4. **Vídeo B** (`marketing/video-verbos`): la escena «COMPARTE» enseña la
   pantalla de trueque (`compositions/comparte.html`, segunda pantalla
   `trueque.png`, complemento «con tu casa y tus vecinos»): cambiarla por otra
   pantalla (casa compartida, plan de compra nuevo…), volver a renderizar y
   copiar a `marketing/aguante-verbos.mp4`. Las capturas se rehacen con
   `marketing/video-funciones/datos/capturar.mjs` (Metro en el 8082).

### Lo de antes

- **TikTok** (propuesta del 16/11/2026, Eric no ha respondido aún): Claude
  prepara vídeos y textos, lee las estadísticas en TikTok Studio con la sesión
  de Eric en el navegador integrado y cada semana propone qué tipo de vídeo
  hacer. **Cada publicación necesita el sí de Eric a ese vídeo**; nada de
  publicar solo ni de saltar captchas. Empezar por los tres vídeos de
  `marketing/` (apagón, escáner, de 3 a 7 días), uno cada 2–3 días, probando
  una sola cosa a la vez (el gancho). Con menos de 8–10 vídeos los números son
  ruido: decirlo así.
- **Avisos oficiales**: hechos el 18/11/2026 y convertidos esa tarde en la
  pestaña **Actualidad** (`src/app/(tabs)/actualidad.tsx`, historial de 30
  días, noticias de AEMET; solo fuentes oficiales, nada de prensa, decidido
  con Eric). En git (commit `9857f7b`) y **publicado** el 18/11/2026
  (grupo `078c8705`; en la app, `01a1ef9f`, ojo: se parece al anterior
  `01a1ef48`). Esa misma tarde, a petición de Eric, más fuentes (AESAN,
  AEMPS y Copernicus; la nuclear no) y filtro por tipo: commit `27e797d`,
  publicado (grupo `107efbb6`; en la app, `01a1efb8`). Falta que Eric lo
  pruebe en el móvil (detalle en `docs/pendiente.md`, «más fuentes en
  Actualidad» y «pestaña Actualidad»). Lo que falta, en el mismo fichero.
- Lo demás está en `docs/pendiente.md`. Eric dejó para más adelante compartir
  el resultado como imagen (necesita APK nuevo). El trueque se quitó el
  20/11/2026 y ya está publicado (ver arriba).

## Pendiente fuera del código

- **Precios de Mercadona: en marcha desde el 20/11/2026.** SQL ejecutado,
  secreto `PRECIOS_TOKEN` creado y huella en `privado.claves`. Tarea
  «Precios de las tiendas» (lunes 05:23 UTC): 84 productos publicados de 121
  (52 conservas y legumbres, 8 arroces, 24 aguas); los que no valen se
  guardan como no publicados para no volver a pedir su detalle. Cada semana
  son 5 peticiones a Mercadona (comprobado en la segunda carga: 0 detalles) y
  unas 10 a Open Food Facts (calorías que no tiene). Si falla, GitHub avisa
  por correo.
- **Instalar el APK 1.1.0** (ya compilado, enlace en «Compilar e instalar») y probar en el móvil el widget, los
  avisos de AEMET con la app cerrada, «Buscar las que tengo cerca» y lo de
  antes que solo está probado en web.

- **Verificación en dos pasos** en las cuentas de Expo (`eric_161`), GitHub,
  Google y Supabase: con la de Expo se puede mandar código a todos los móviles
  por EAS Update. Recomendado el 20/11/2026; desde aquí no se puede comprobar.
- Probar «Entrar con Google» en el móvil tras el cambio a PKCE (20/11/2026).

- Poner la web en Google Cloud (pantalla de consentimiento de OAuth del
  proyecto «Aguante»): página principal https://ericbatalla12.github.io/aguante/
  y privacidad https://ericbatalla12.github.io/aguante/privacidad.html. Cuando
  toque, en Google Play: privacidad y `borrar-cuenta.html`.
- Probar «Entrar con Google» con el secreto nuevo (el primer intento falló con
  «Unable to exchange external code» por un secreto mal copiado).
- Cambiar, por precaución, la contraseña de aplicación de Gmail del SMTP y el
  secreto de Google, y quitar el JSON del secreto de `~/Descargas`.
- **Web publicada** en https://ericbatalla12.github.io/aguante/ desde este
  repositorio: el flujo `.github/workflows/web.yml` la publica sola al subir
  cambios de `web/` a `main`. Contacto público: ericbatalla16@gmail.com. El
  responsable figura solo como «Eric»: quizá haga falta identificarlo más (sin
  comprobar).

## Cuentas y casa compartida (Supabase), hecho el 15/11/2026

Cómo funciona, qué tiene que configurar Eric y qué está probado:
[docs/cuentas.md](docs/cuentas.md). Resumen para trabajar en ello:

- Proyecto: `https://dndvwxfnaqdivcttxwku.supabase.co`, clave publicable en
  `src/lib/supabase.ts` (está hecha para ir en la app; **la secreta no se pide
  ni se guarda nunca**).
- Servidor: `supabase/esquema.sql`, re-ejecutable. Los móviles solo leen las
  tablas (RLS); escriben con las funciones `crear_casa`, `unirse_casa`,
  `salir_casa` y `subir_cambios`. Se probó en un Postgres 17 en Docker
  (`postgres:17-alpine`) con un esquema `auth` simulado (`auth.uid()` lee
  `request.jwt.claim.sub`); la CLI de Supabase por `npx` la bloqueó el modo
  automático.
- App: `src/lib/compartido.ts` (puro: elementos, diferencias, gana el último),
  `src/lib/sincro.ts` (store `useSincro` persistido en `aguante-casa`, vigila
  `useAguante.subscribe`, sube y baja, tiempo real) y `src/app/cuenta.tsx`.
  Lo que llega del servidor se mete con `meterEnStore` para que el vigilante
  no lo tome por un cambio propio. El vigilante se engancha después de hidratar
  los dos stores: si no, la carga parecería un cambio de todo.
- Un campo nuevo que se comparta va también en `Compartido` y `SECCIONES` de
  `compartido.ts`, en `meterEnStore` y en el `check` de `tipo` del SQL.
- Borrar la cuenta: función `borrar_cuenta` (en `esquema.sql` y ya creada en
  el proyecto) y botón en `cuenta.tsx`. Probado en Postgres local y que existe
  en el proyecto; no probado con una cuenta real.
- Plan Pro: tabla `planes` (la rellena Eric en el Table Editor) y función
  `soy_pro()`, ya creadas en el proyecto. En la app, `comprobarPlan` y
  `usePro` en `sincro.ts` (el plan se guarda en `useSincro` para saberlo sin
  conexión), `planActivo` en `compartido.ts` y `src/components/pro.tsx`. Ninguna
  función es de Pro desde que se quitó el trueque. **Apagado** con `PRO_ACTIVO = false` en
  `src/constants/monetizacion.ts`: se vive de donaciones (`ENLACE_DONAR`, en
  el mismo fichero; si se deja vacío, no sale el apartado «Apoyar Aguante» de
  Ajustes).
- Entrar con Google: navegador del sistema + `aguante://auth`, sin módulo
  nativo. El botón solo sale si Google está activado en Supabase. Pasos de
  Google Cloud para Eric en `docs/cuentas.md`. Proyecto de Google Cloud
  «Aguante», pantalla de consentimiento en estado **Prueba** (solo entran los
  usuarios de prueba; para publicar, Google pide página principal y política
  de privacidad). Cliente OAuth «Web application», creado el 15/11/2026:
  - ID de cliente: `24235143956-dlc7o305nsalmhlalejl19ml28u8duov.apps.googleusercontent.com`
  - **El secreto del cliente no se guarda en el repo**: lo tiene Eric y va
    solo en Supabase (*Sign In / Providers › Google*).
- Gastar escaneando: `src/app/gastar.tsx`, `productosConCodigo` en
  `calculo.ts` (compara sin ceros delante) y `gastar` en el store.
- Configurado el 15/11/2026: SQL ejecutado, SMTP con el Gmail personal de
  Eric (usuario = dirección completa, contraseña de aplicación) y el código en
  las plantillas Magic link y Confirm sign up. El envío del código funciona
  (comprobado en la web) y Eric dice que ha probado la casa compartida en el
  móvil. Si falla un envío, la causa está en *Logs › Auth* del panel (el 500
  de la app es el SMTP). En el panel se puede ejecutar SQL desde el SQL Editor
  con la sesión de Eric en el navegador integrado (pegar con
  `editor.trigger('keyboard', 'paste', {text})` de Monaco; Supabase avisa de
  «operaciones destructivas» si hay `delete` aunque sea dentro de una función).
- Donaciones: `ENLACE_DONAR = 'https://paypal.me/EBatalla167'` en
  `src/constants/monetizacion.ts`. Para una versión de Google Play hay que
  dejarlo vacío (su política de pagos no deja llevar a pagar fuera de Play).
