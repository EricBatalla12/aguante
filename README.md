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
- Escenarios: sin luz, sin poder cocinar y mucho calor.
- Al añadir un producto, las calorías y la foto se rellenan solas: con el
  código de barras, eligiendo una sugerencia de Open Food Facts al escribir el
  nombre o, sin conexión, con un valor típico de USDA.
- Caducidad sin teclear separadores y con el día opcional, como viene en las
  latas (mes y año).
- Avisos de caducidad, lista de la compra según el objetivo (72 h, 1 semana,
  2 semanas) y kit de emergencia.
- Modo emergencia con el plan del día: lo que se apunta como comido o bebido
  se descuenta de la despensa, y se puede deshacer.
- Ajustes: tema claro, oscuro o el del móvil, avisos, copia de seguridad y la
  pantalla de fuentes.
- Todo se guarda en el móvil y funciona sin internet. Solo el escáner y las
  sugerencias necesitan red, para buscar el producto.

Las reglas de cálculo y sus fuentes (FAO/OMS, EFSA, FEMA, Sphere, PMA) están
en [docs/fuentes-y-reglas.md](docs/fuentes-y-reglas.md).

## Ponerla en marcha

```bash
npm install
npx expo start
```

Para verla en el móvil, abre Expo Go y escanea el QR. Si el móvil está en
otra red, arranca con `npx expo start --tunnel`.

## Comprobaciones

```bash
npm test          # motor de cálculo y fechas (node --test)
npx tsc --noEmit  # tipos
npx eslint .      # lint
```

## Estructura

- `src/lib/calculo.ts`: el motor de cálculo. Es puro, sin dependencias, y lo
  cubren los tests de `tests/`.
- `src/lib/store.ts`: el estado guardado (zustand, persistido en SQLite).
- `src/lib/fechas.ts`: fechas de caducidad con el día opcional. También puro.
- `src/lib/tema.tsx` y `src/constants/colores.ts`: tema claro y oscuro, y la
  fuente (Figtree).
- `src/components/ui.tsx`: las piezas de interfaz. Todo el texto pasa por
  `Texto`, que es lo que evita los textos cortados.
- `src/constants/fuentes.ts`: lo que enseña la pantalla «Fuentes y método».
  Hay que mantenerlo a la par con `docs/fuentes-y-reglas.md`.
- `src/app/`: las pantallas (Expo Router).
