# Aguante

App móvil para llevar la reserva de emergencia de casa (comida y agua) y saber
cuántos días aguantaríais con ella.

- Calcula las calorías y el agua de cada persona a partir de su edad, sexo y
  peso, y también las de las mascotas.
- Cuatro modos de aguante (Normal, Ligero, Severo, Extremo) que racionan la
  comida de los adultos. El agua para beber no se recorta nunca, y los
  menores, las embarazadas y las mujeres en lactancia no se racionan.
- Reparto manual: tú fijas las kcal y los litros de cada persona y mascota, y
  la app avisa si una ración queda por debajo de lo que dicen las fuentes.
- Escenarios: sin luz, sin poder cocinar y mucho calor. En una emergencia se
  eligen al empezarla.
- Solo cuenta la comida que da tiempo a comer antes de que caduque, y sin luz
  sigue el orden nevera → congelador → latas (con las horas que aguanta cada
  uno).
- Energía propia: power banks, baterías, placas y generador frente a lo que
  gasta la casa, en días.
- Español e inglés (sigue el idioma del móvil o se elige en Ajustes).
- Al añadir un producto, las calorías y la foto se rellenan solas: con el
  código de barras, eligiendo una sugerencia de Open Food Facts al escribir el
  nombre o, sin conexión, con un valor típico de USDA.
- Caducidad sin teclear separadores y con el día opcional, como viene en las
  latas (mes y año).
- Avisos de caducidad (también en Google Calendar), lista de la compra según
  el objetivo (72 h, 1 semana, 2 semanas) repartida en meses según tu
  presupuesto, y kit de emergencia en cuatro listas (casa, mochila, coche y
  botiquín), con la caducidad de tus medicinas y pilas.
- Modo emergencia con el plan del día: lo que se apunta como comido o bebido
  se descuenta de la despensa, y se puede deshacer.
- Ajustes: tema claro, oscuro o el del móvil, avisos, copia de seguridad y la
  pantalla de fuentes.
- Todo se guarda en el móvil y funciona sin internet. Solo el escáner y las
  sugerencias necesitan red, para buscar el producto.
- Cuenta opcional (correo y código, sin contraseña) para compartir la casa con
  quien vive contigo: despensa, hogar, kit, energía y la emergencia en curso
  se sincronizan con Supabase cuando hay red. Cómo funciona y qué configurar:
  [docs/cuentas.md](docs/cuentas.md).

Las reglas de cálculo y sus fuentes (FAO/OMS, EFSA, FEMA, Sphere, PMA) están
en [docs/fuentes-y-reglas.md](docs/fuentes-y-reglas.md).

## Ponerla en marcha

```bash
npm install
npx expo start
```

Para verla en el móvil, abre Expo Go y escanea el QR. Si el móvil está en
otra red, arranca con `npx expo start --tunnel`.

## Instalarla en el móvil y actualizarla

La app instalada (APK) se compila en EAS y se actualiza sola con EAS Update:

```bash
npx eas-cli build -p android --profile preview   # APK nuevo (canal «preview»)
npm run publicar -- -m "Qué cambia"              # actualización sin APK nuevo
```

- Una actualización llega al abrir la app y se aplica la siguiente vez que se
  abre. En Ajustes, debajo del todo, se ve qué actualización está instalada.
- Solo sirve para cambios de JavaScript, textos e imágenes. Si se añade o
  actualiza una librería con código nativo (`npx expo install …` de un módulo
  nativo) o se cambian permisos o plugins en `app.json`, hace falta un APK
  nuevo **y subir `version` en `app.json`**: la versión es el `runtimeVersion`
  (política `appVersion`), y así un APK viejo no recibe código que necesita
  piezas nativas que no tiene.

## Comprobaciones

```bash
npm test          # cálculo, energía, fechas, casa compartida y traducciones (node --test)
npx tsc --noEmit  # tipos
npx eslint .      # lint
```

## Estructura

- `src/lib/calculo.ts`: el motor de cálculo. Es puro, sin dependencias, y lo
  cubren los tests de `tests/`.
- `src/lib/store.ts`: el estado guardado (zustand, persistido en SQLite).
- `src/lib/compartido.ts` (puro), `src/lib/sincro.ts` y `src/lib/supabase.ts`:
  la casa compartida. El servidor está en `supabase/esquema.sql`.
- `src/lib/fechas.ts`: fechas de caducidad con el día opcional. También puro.
- `src/lib/energia.ts`: el cálculo de la energía propia. También puro.
- `src/lib/i18n.ts` y `src/i18n/en.ts`: idiomas. El texto en español es la
  clave de `t('…')`; `tests/i18n.test.mjs` falla si falta alguna traducción.
- `marketing/video-dias/`: vídeo vertical de 15 s hecho con HyperFrames
  (`npm run render` dentro de esa carpeta). El último render está en
  `marketing/aguante-dias.mp4`.
- `src/lib/tema.tsx` y `src/constants/colores.ts`: tema claro y oscuro, y la
  fuente (Figtree).
- `src/components/ui.tsx`: las piezas de interfaz. Todo el texto pasa por
  `Texto`, que es lo que evita los textos cortados.
- `src/constants/fuentes.ts`: lo que enseña la pantalla «Fuentes y método».
  Hay que mantenerlo a la par con `docs/fuentes-y-reglas.md`.
- `src/app/`: las pantallas (Expo Router).
