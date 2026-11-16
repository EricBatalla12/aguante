# Web de Aguante

Página principal, calculadora, guías, política de privacidad y página para
borrar la cuenta. HTML estático, sin dependencias: se abre tal cual o se sirve
con cualquier servidor (`python3 -m http.server -d web`).

## Antes de publicarla (Eric)

- **Completar lo que va entre corchetes** en `privacidad.html` y
  `borrar-cuenta.html`: nombre del responsable, correo de contacto, región del
  proyecto de Supabase (*Project Settings › General* en el panel) y la fecha.
  Es un borrador redactado a partir del código el 16/11/2026: no es
  asesoramiento legal. Ojo con la base legal de los datos de salud
  (embarazo, lactancia), que solo salen del móvil con una casa compartida.
- **Enlace de descarga** en `index.html` (dos sitios marcados con
  `PENDIENTE (Eric)`): Google Play cuando esté, o el APK.
- Quitar el aviso amarillo de «borrador» de `privacidad.html` cuando esté
  revisada.

## Dónde está publicada

En el mismo repositorio que la app, `EricBatalla12/aguante` (público), en
https://ericbatalla12.github.io/aguante/. El flujo `.github/workflows/web.yml`
la publica con GitHub Actions cada vez que cambia algo de `web/` en `main`: no
hay que hacer nada más que subir el cambio. Este README también se publica.

Si el repositorio cambia de nombre, cambiar la dirección en las etiquetas
`og:url` y `og:image` de cada página, `robots.txt`, `sitemap.xml` y los enlaces
de `404.html` (que van con `/aguante/`).

Esas direcciones son las que piden Google (pantalla de consentimiento de
OAuth: página principal y política de privacidad) y Google Play (política de
privacidad y borrado de cuenta).

## Qué hay

- `index.html`: portada con el vídeo del escáner (`video/`, sacado de
  `marketing/aguante-escaner.mp4` a 540×960), cómo funciona en tres pasos con
  capturas reales, funciones y preguntas.
- `img/compartir.png`: la imagen que sale al compartir el enlace (1200×630).
  `img/icono-*.png`: icono provisional, la A de Aguante (no hay logo propio).

## La calculadora

Usa el mismo cálculo que la app: `js/lib/calculo.js` y
`js/constants/genericos.js` se compilan de `src/` con `npm run sitio` (desde la
raíz del proyecto). Si cambia el cálculo, recompilar y subirlo con el cambio.
