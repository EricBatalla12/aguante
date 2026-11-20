# Web de Aguante

Página principal, calculadora, guías, política de privacidad y página para
borrar la cuenta. HTML estático, sin dependencias: se abre tal cual o se sirve
con cualquier servidor (`python3 -m http.server -d web`).

## Lo que falta (Eric)

- **Enlace de descarga** en `index.html` (dos sitios marcados con
  `PENDIENTE (Eric)`): Google Play cuando esté, o el APK.
- La política de privacidad (`privacidad.html`) es un borrador redactado a
  partir del código: no es asesoramiento legal. El responsable figura solo
  como «Eric». Si cambia lo que la app manda a internet, cambiarla también
  (el 21/11/2026 se quitaron las tiendas y la ubicación del plan de compra).

## Dónde está publicada

En el mismo repositorio que la app, `EricBatalla12/aguante` (público), en
https://ericbatalla12.github.io/aguante/. El flujo `.github/workflows/web.yml`
la publica con GitHub Actions cada vez que cambia algo de `web/` en `main`: no
hay que hacer nada más que subir el cambio. Este README también se publica.

Si el repositorio cambia de nombre, cambiar la dirección en las etiquetas
`og:url` y `og:image` de cada página, el `canonical` y los datos estructurados
de `index.html`, `robots.txt`, `sitemap.xml` y los enlaces
de `404.html` (que van con `/aguante/`).

Esas direcciones son las que piden Google (pantalla de consentimiento de
OAuth: página principal y política de privacidad) y Google Play (política de
privacidad y borrado de cuenta).

## Qué hay

- `index.html`: portada con el vídeo del escáner (`video/`, sacado de
  `marketing/aguante-escaner.mp4` a 540×960), cómo funciona en tres pasos,
  lo que hace en una emergencia (modo emergencia, energía y Actualidad),
  funciones, guías, preguntas y descarga. Lleva datos estructurados
  (`SoftwareApplication`) para los buscadores.
- `guias/`: índice (`index.html`) y cuatro guías (agua, sin luz, kit y rotar).
  Cada guía acaba con «Más guías»: si se añade una, ponerla en todas, en el
  índice, en la portada y en `sitemap.xml`. La del kit copia las listas de
  `src/constants/kit.ts`: si cambian, cambiarla.
- Capturas en `img/` (540×1050, webp): `escaner`, `despensa` y `dias` son
  del 16/11/2026; `sin-luz`, `energia` y `actualidad` (20/11/2026) salen de
  `marketing/video-numero/assets/app/`, recortadas con
  `magick <png> -crop 1080x2100+0+0 +repage -resize 540x -quality 80 <webp>`.
  `emergencia`, `inicio` y `preparacion` ya no se usan.
- `img/compartir.png`: la imagen que sale al compartir el enlace (1200×630).
  `img/icono-*.png`: icono provisional, la A de Aguante (no hay logo propio).

## La calculadora

Usa el mismo cálculo que la app: `js/lib/calculo.js` y
`js/constants/genericos.js` se compilan de `src/` con `npm run sitio` (desde la
raíz del proyecto). Si cambia el cálculo, recompilar y subirlo con el cambio.
