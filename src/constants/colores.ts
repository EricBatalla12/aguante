// Paletas de Aguante: clara y oscura, con los mismos nombres.
//
// El agua va siempre en azul y la comida en naranja: se distinguen también
// por luminosidad, no solo por el tono. Los componentes no importan estas
// paletas directamente: piden la que toca con `useC()` (ver lib/tema.tsx).

// Colores que no cambian con el tema: fondos sólidos con texto blanco encima
const FIJOS = {
  peligro: '#B42318',
  blanco: '#FFFFFF',
  aguaFuerte: '#24466E',
  aguaSobreFuerte: '#DCEBFB',
  comidaFuerte: '#5A2A12',
  comidaSobreFuerte: '#FDDCC8',
  verdeFuerte: '#2F6B3F',
};

export const CLARO = {
  ...FIJOS,
  fondo: '#F3F4F0',
  tarjeta: '#FFFFFF',
  borde: '#E4E7E1',
  tinta: '#14211B',
  texto2: '#3E4944',
  suave: '#5F6A65',
  linea: '#E1E5DF',
  pista: '#E7EAE5',
  segmento: '#E9ECE7',

  // Botón principal y opción elegida de un control segmentado
  primario: '#14211B',
  sobrePrimario: '#FFFFFF',

  // Tarjeta grande de «aguantáis N días»
  heroe: '#14211B',
  heroeBorde: '#14211B',
  heroeTexto: '#FFFFFF',
  heroeSuave: '#B4C0B9',
  heroePista: '#2C3D34',

  campo: '#FFFFFF',
  campoBorde: '#C9CFC9',

  agua: '#1F5FA6',
  aguaTinte: '#E3EDF8',
  aguaOscuro: '#17457A',
  comida: '#C2410C',
  comidaTinte: '#FCEBDD',
  comidaOscuro: '#7C2D12',

  rojo: '#B42318',
  rojoTinte: '#FDE8E6',
  rojoOscuro: '#7A271A',
  ambar: '#8A4B06',
  ambarTinte: '#FDF1DC',
  verde: '#2F6B3F',
  verdeTinte: '#E4F1E7',
  verdeOscuro: '#1E4A2A',
  enlace: '#1F5FA6',
};

export type Paleta = Record<keyof typeof CLARO, string>;

// La oscura sale de la que ya usaba el modo emergencia: fondo casi negro, que
// en pantallas OLED gasta menos batería.
export const OSCURO: Paleta = {
  ...FIJOS,
  fondo: '#0D1310',
  tarjeta: '#171F1B',
  borde: '#253029',
  tinta: '#EEF2EE',
  texto2: '#C5CEC8',
  suave: '#9AA7A0',
  linea: '#2A352F',
  pista: '#2A352F',
  segmento: '#212B26',

  primario: '#E6ECE7',
  sobrePrimario: '#101814',

  heroe: '#1B2922',
  heroeBorde: '#2E4035',
  heroeTexto: '#FFFFFF',
  heroeSuave: '#A9B5AF',
  heroePista: '#31443A',

  campo: '#121915',
  campoBorde: '#34413A',

  agua: '#8DB8EE',
  aguaTinte: '#18293F',
  aguaOscuro: '#CFE2F8',
  comida: '#F2A56F',
  comidaTinte: '#3A2213',
  comidaOscuro: '#FBD9C2',

  rojo: '#F97066',
  rojoTinte: '#3B1613',
  rojoOscuro: '#FDB5AE',
  ambar: '#EFB85C',
  ambarTinte: '#35270D',
  verde: '#7CC892',
  verdeTinte: '#15301F',
  verdeOscuro: '#BDE5C8',
  enlace: '#8DB8EE',
};
