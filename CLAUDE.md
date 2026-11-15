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
  **Aún no publicado con EAS Update**: preguntar a Eric antes de
  `npm run publicar`.

## Siguiente trabajo: cuentas y casa compartida (Supabase)

Eric lo ha pedido y ha creado el proyecto. Datos (la clave publicable está
hecha para ir en la app; **la secreta no se pide ni se guarda nunca**):

- URL: `https://dndvwxfnaqdivcttxwku.supabase.co`
- Clave publicable: `sb_publishable_2ExGbQV4Bzbv5YvRhjzq7w_EWEv35IL`

Diseño acordado con Eric:

1. Cuenta **opcional**: sin cuenta la app sigue igual, todo en local. Entrar
   con el correo y un **código de 6 dígitos** (OTP de Supabase), sin
   contraseñas ni enlaces mágicos.
2. Una persona crea la **casa** y sale un código de invitación (tipo `K7P-29Q`);
   las demás lo escriben y entran.
3. Se comparte despensa, hogar (personas y mascotas), kit (y kit propio),
   energía, modo y reparto manual. Tema, idioma y avisos son de cada móvil.
4. **Sin conexión primero**: el store local sigue mandando; se apuntan los
   cambios y se sincronizan al volver la red, con tiempo real si hay
   conexión. Conflictos: gana el último cambio, por elemento.
5. `@supabase/supabase-js` es JS puro: se puede publicar con EAS Update, sin
   APK nuevo (comprobarlo en la documentación antes).

Pendiente de comprobar antes de empezar: si el plan gratuito de Supabase pausa
los proyectos tras una semana sin uso (lo recuerdo así, sin comprobar).
Las tablas y las reglas RLS las crea Eric pegando un SQL que le prepare en el
SQL Editor de Supabase. Al acabar, actualizar README, `docs/pendiente.md` y la
pantalla y el doc de fuentes si cambia algo de lo que la app promete (hoy dice
«todo se guarda en el móvil»).
