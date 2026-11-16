// Kit de emergencia de serie, en cuatro listas. Lo que añade cada casa va en
// el store (kitPropio), con su lista y, si quiere, su caducidad (medicinas,
// pilas…).
//
// Las listas salen de Ready.gov (consultado el 16/11/2026): el kit básico y
// sus «suministros adicionales» (https://www.ready.gov/kit) y el kit del coche
// (https://www.ready.gov/car). No añadas cosas de memoria: la fuente va en
// docs/fuentes-y-reglas.md.

import { tx } from '../lib/i18n';

export type ListaKit = 'casa' | 'mochila' | 'coche' | 'botiquin';

export type ElementoKit = {
  id: string;
  que: string;
  clave?: boolean;
  /** Sin lista: la de casa (así eran los elementos propios antes de que hubiera listas). */
  lista?: ListaKit;
  caducidad?: string; // AAAA-MM-DD
  caducidadSinDia?: boolean;
};

export const LISTAS_KIT: { valor: ListaKit; etiqueta: string }[] = [
  { valor: 'casa', etiqueta: tx('Casa') },
  { valor: 'mochila', etiqueta: tx('Mochila') },
  { valor: 'coche', etiqueta: tx('Coche') },
  { valor: 'botiquin', etiqueta: tx('Botiquín') },
];

/** Para qué es cada lista: sale debajo del selector. */
export const EXPLICA_LISTA: Record<ListaKit, string> = {
  casa: tx('Para pasar la emergencia en casa.'),
  mochila: tx('Lista para coger y salir si hay que dejar la casa deprisa.'),
  coche: tx('Por si te quedas tirado con el coche.'),
  botiquin: tx('Medicinas y primeros auxilios. Apunta tus medicinas con su caducidad.'),
};

// Lo que más se olvida va marcado. El abrelatas, sobre todo: sin él, las latas
// no sirven de nada.
export const KIT: ElementoKit[] = [
  { id: 'abrelatas', que: tx('Abrelatas manual'), clave: true },
  { id: 'linterna', que: tx('Linterna y pilas de repuesto') },
  { id: 'radio', que: tx('Radio a pilas o de dinamo') },
  { id: 'botiquin', que: tx('Botiquín y medicación') },
  { id: 'pastillas', que: tx('Pastillas potabilizadoras'), clave: true },
  { id: 'powerbank', que: tx('Batería externa cargada') },
  { id: 'mantas', que: tx('Mantas o sacos de dormir') },
  { id: 'docs', que: tx('Copia de documentos y algo de efectivo') },
];

// Ready.gov: el kit «listo por si tienes que salir de casa deprisa». El agua
// y la comida se miden contra 72 horas en la pantalla.
const MOCHILA: ElementoKit[] = [
  { id: 'mochila-agua', que: tx('Agua para 72 horas') },
  { id: 'mochila-comida', que: tx('Comida que no haya que cocinar para 72 horas') },
  { id: 'mochila-abrelatas', que: tx('Abrelatas manual'), clave: true },
  { id: 'mochila-linterna', que: tx('Linterna y pilas de repuesto') },
  { id: 'mochila-radio', que: tx('Radio a pilas o de dinamo') },
  { id: 'mochila-botiquin', que: tx('Botiquín y tu medicación') },
  { id: 'mochila-silbato', que: tx('Silbato para pedir ayuda') },
  { id: 'mochila-mascarilla', que: tx('Mascarillas') },
  { id: 'mochila-higiene', que: tx('Toallitas, bolsas de basura y bridas') },
  { id: 'mochila-movil', que: tx('Cargador del móvil y batería externa') },
  { id: 'mochila-mapa', que: tx('Mapa de la zona en papel'), clave: true },
  { id: 'mochila-docs', que: tx('Copia de documentos y algo de efectivo') },
  { id: 'mochila-ropa', que: tx('Muda de ropa y calzado resistente') },
  { id: 'mochila-manta', que: tx('Manta o saco de dormir') },
];

// Ready.gov: «extras» para el coche, además de un kit básico
const COCHE: ElementoKit[] = [
  { id: 'coche-agua', que: tx('Agua y algo de comida') },
  { id: 'coche-cables', que: tx('Cables de arranque') },
  { id: 'coche-triangulos', que: tx('Triángulos o luces de emergencia') },
  { id: 'coche-rasqueta', que: tx('Rasqueta para el hielo') },
  { id: 'coche-cargador', que: tx('Cargador del móvil para el coche') },
  { id: 'coche-manta', que: tx('Manta') },
  { id: 'coche-mapa', que: tx('Mapa en papel') },
  { id: 'coche-arena', que: tx('Arena o arena de gato, para que agarren las ruedas') },
];

// Ready.gov: botiquín y medicinas de los «suministros adicionales»
const BOTIQUIN: ElementoKit[] = [
  { id: 'botiquin-primeros', que: tx('Botiquín de primeros auxilios') },
  { id: 'botiquin-receta', que: tx('Medicación con receta para varios días'), clave: true },
  { id: 'botiquin-dolor', que: tx('Analgésicos') },
  { id: 'botiquin-diarrea', que: tx('Antidiarreico') },
  { id: 'botiquin-estomago', que: tx('Antiácidos o laxantes') },
  { id: 'botiquin-gafas', que: tx('Gafas de repuesto y líquido de lentillas') },
];

export const DE_SERIE: Record<ListaKit, ElementoKit[]> = { casa: KIT, mochila: MOCHILA, coche: COCHE, botiquin: BOTIQUIN };

export const listaDe = (e: ElementoKit): ListaKit => e.lista ?? 'casa';
