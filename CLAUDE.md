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
- APK nuevo: lo lanza Eric con `npx eas-cli build -p android --profile preview`.
  `preview` tiene `autoIncrement` (sube el versionCode en cada APK).
- **EAS Update** configurado (canal `preview`, `runtimeVersion` con política
  `appVersion`). Cambios solo de JS/textos: `npm run publicar -- -m "…"` y le
  llegan al abrir la app (se aplican en el siguiente arranque). En Ajustes,
  abajo, se ve qué actualización tiene.
- Hace falta APK nuevo **y subir `version` en app.json** si se añade o
  actualiza un módulo nativo, o se cambian permisos o plugins.
- Publicar una actualización o lanzar una compilación es algo que se ve fuera
  del PC: confirmarlo con Eric antes.

- **Las actualizaciones no se aplicaban** en el APK versionCode 2 (15/11/2026):
  el APK está bien configurado (comprobado dentro del APK: URL, runtime 1.0.0,
  canal `preview`, `CHECK_ON_LAUNCH=ALWAYS`) y el servidor entrega la última
  actualización a ese canal y runtime, pero EAS no registra ningún lanzamiento
  (`npx eas-cli update:insights <grupo>`). Para verlo desde el móvil:
  `src/components/actualizacion.tsx` (aviso «Reiniciar ahora» en Inicio y
  estado con errores y «Buscar actualización» en Ajustes).

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
  (migración y copias importadas).
- **No usar Prettier**: el proyecto no lo tiene configurado y reformatea los
  ficheros enteros. Respetar el estilo existente (comillas simples, líneas
  largas).
- El compilador de React no deja leer `ref.current` al pintar (lint
  `Cannot access refs during render`): un `Animated.Value` va en `useState`.
- Las rutas tipadas (`.expo/types/router.d.ts`) se regeneran al arrancar Metro:
  hasta entonces `tsc` da error en rutas nuevas.
- Vídeo de marketing: `marketing/video-dias/` (HyperFrames, 1080×1920, 15 s);
  `npm run check` y `npm run render` dentro de esa carpeta. Último render en
  `marketing/aguante-dias.mp4`.

## Estado a 15/11/2026

- Rama `feat/mvp`, sin remoto. Commits: `f9b33af` (MVP), `ede1c89` (energía,
  nevera-congelador-latas, inglés, trueque, vídeo), `93982e6` (EAS Update) y
  el del diálogo de confirmación (ver `git log`).
- El último commit añade el diálogo de confirmación propio
  (`src/components/dialogo.tsx`, `confirmar` con firma de objeto) y
  `autoIncrement` en el perfil `preview`. Probado en web; no en el móvil.
- 15/11/2026: publicado con EAS Update (grupo `beb14447`, runtime 1.0.0) el
  diálogo de confirmación y la casa compartida (luego en commit `30814b7`).
- 15/11/2026: APK nuevo (versionCode 2, canal `preview`) compilado desde
  `30814b7`; los APK anteriores al de las 15:11 no reciben actualizaciones.
  Publicado con EAS Update el grupo `a2dcd56c` (borrar cuenta y gastar
  escaneando, commit `3a676d4`).

## Cuentas y casa compartida (Supabase), hecho el 15/11/2026 sin commit

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
  el mismo fichero; vacío, no sale el apartado «Apoyar Aguante» de Ajustes).
- Entrar con Google: navegador del sistema + `aguante://auth`, sin módulo
  nativo. El botón solo sale si Google está activado en Supabase. Pasos de
  Google Cloud para Eric en `docs/cuentas.md`.
- APK versionCode 3 (commit `91ca425`, con el aviso y el estado de las
  actualizaciones): https://expo.dev/artifacts/eas/naWm_cWazPsZsEM0vZBgwVSUwqB-Nbc5xWNhuODff_g.apk
- Gastar escaneando: `src/app/gastar.tsx`, `productosConCodigo` en
  `calculo.ts` (compara sin ceros delante) y `gastar` en el store.
- Configurado el 15/11/2026: SQL ejecutado, SMTP con el Gmail personal de
  Eric (usuario = dirección completa, contraseña de aplicación) y el código en
  las plantillas Magic link y Confirm sign up. El envío del código funciona
  (comprobado en la web). Sin probar: entrar con el código, crear casa y
  sincronizar entre dos móviles. Si falla un envío, la causa está en
  *Logs › Auth* del panel (el 500 de la app es el SMTP).
