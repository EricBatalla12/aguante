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
  como `{state, version: 3}` y recargar. El panel a veces no se pinta: las
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
- **Cálculo puro**: `src/lib/calculo.ts`, `src/lib/energia.ts` y
  `src/lib/fechas.ts` no importan nada (los tests corren con `node --test` sin
  compilar). Si cambia una cifra, cambiarla también en
  `docs/fuentes-y-reglas.md` y en `src/constants/fuentes.ts` (pantalla de
  fuentes). No meter cifras de memoria: buscar la fuente y marcar «criterio
  propio» lo que no la tenga.
- **Estado**: `src/lib/store.ts` (zustand persistido, `version: 3`). Un campo
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
- **Del 18/11/2026 por la tarde, sin commit ni publicar**: arreglos del
  tutorial (desplazar hasta lo señalado, medir en cada paso, sin dobles toques)
  y **avisos oficiales** (AEMET, IGN y GDACS; `src/lib/avisos.ts`,
  `src/lib/avisos-estado.ts`, `src/app/avisos.tsx`). Tests (84), `tsc`, lint y
  export de Android limpios; en web los RSS no bajan por CORS (se probó con
  datos cargados a mano y la descarga desde Node). No probado en el móvil.
- Última actualización publicada: grupo `36296207` (agua beber + higiene,
  actividad, tutorial y preguntas), canal `preview`, runtime 1.0.0. Las
  anteriores: `533b7fe4` (kit en listas, plan de compra, calendario y casa
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

- **TikTok** (propuesta del 16/11/2026, Eric no ha respondido aún): Claude
  prepara vídeos y textos, lee las estadísticas en TikTok Studio con la sesión
  de Eric en el navegador integrado y cada semana propone qué tipo de vídeo
  hacer. **Cada publicación necesita el sí de Eric a ese vídeo**; nada de
  publicar solo ni de saltar captchas. Empezar por los tres vídeos de
  `marketing/` (apagón, escáner, de 3 a 7 días), uno cada 2–3 días, probando
  una sola cosa a la vez (el gancho). Con menos de 8–10 vídeos los números son
  ruido: decirlo así.
- **Avisos oficiales**: hechos el 18/11/2026; lo que falta, en `docs/pendiente.md`.
- Lo demás está en `docs/pendiente.md`. Eric dejó para más adelante compartir
  el resultado como imagen (necesita APK nuevo). El trueque
  entre vecinos tiene una propuesta escrita y espera a que Eric decida.

## Pendiente fuera del código

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
  conexión), `planActivo` en `compartido.ts` y `src/components/pro.tsx`. Solo
  el trueque es de Pro. **Apagado** con `PRO_ACTIVO = false` en
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
