// Guías sin conexión: van dentro de la app, así que se leen sin internet.
// Solo con fuentes oficiales y sus cifras tal cual (consultadas el
// 21/11/2026; ver docs/fuentes-y-reglas.md, «Guías sin conexión»). No añadas
// pasos de memoria: si una cosa no está en la fuente, no va, o va marcada
// como criterio propio (`propio`).

import { tx } from '@/lib/i18n';
import type { NombreIcono } from '@/components/ui';

export type Paso = { texto: string; propio?: boolean };
export type Apartado = { titulo: string; pasos: Paso[] };
export type Guia = {
  id: string;
  titulo: string;
  resumen: string;
  icono: NombreIcono;
  apartados: Apartado[];
  /** Avisos que van destacados arriba. */
  aviso?: string;
  fuentes: { nombre: string; url: string }[];
};

export const GUIAS: Guia[] = [
  {
    id: 'apagon',
    titulo: tx('Las primeras horas de un apagón'),
    resumen: tx('Qué hacer cuando se va la luz: frío, aparatos, calor, monóxido y medicinas.'),
    icono: 'flash-off',
    aviso: tx('Si hay peligro, llama al 112. Las alertas ES-Alert llegan solas al móvil.'),
    apartados: [
      {
        titulo: tx('Nada más irse la luz'),
        pasos: [
          { texto: tx('Empieza el modo emergencia en Aguante: apunta cuándo se fue la luz y cuenta las horas que le quedan a la nevera y al congelador.'), propio: true },
          { texto: tx('No abras la nevera ni el congelador. La nevera mantiene el frío unas 4 horas; un congelador lleno, unas 48.') },
          { texto: tx('Apaga o desenchufa los aparatos y la electrónica: cuando vuelve la luz puede haber subidas de tensión que los estropeen.') },
          { texto: tx('Usa linternas. Ten una para cada persona de la casa.') },
          { texto: tx('Infórmate por la radio a pilas y sigue lo que digan las autoridades.') },
        ],
      },
      {
        titulo: tx('Calor, frío y monóxido de carbono'),
        pasos: [
          { texto: tx('Nunca calientes la casa con el horno o los fuegos de gas: hay riesgo de intoxicación por monóxido de carbono, de incendio y de quemaduras.') },
          { texto: tx('El generador, el hornillo de camping o la barbacoa, siempre fuera de casa y al menos a 6 metros de ventanas, puertas y garajes.') },
          { texto: tx('El monóxido de carbono no huele ni se ve. Un detector con pilas en cada planta de la casa avisa a tiempo.') },
          { texto: tx('Si hace mucho calor o mucho frío, ve a un sitio con luz: pregunta a tu ayuntamiento qué centros abren.') },
        ],
      },
      {
        titulo: tx('Medicinas y aparatos médicos'),
        pasos: [
          { texto: tx('Si alguien usa un aparato médico eléctrico o medicinas de nevera, ten un plan con su médico antes de que pase.') },
          { texto: tx('Si la luz ha estado fuera más de un día, tira las medicinas que van en nevera salvo que el prospecto diga otra cosa, y pide otras a tu médico o farmacia.') },
        ],
      },
      {
        titulo: tx('Cuando vuelve la luz'),
        pasos: [
          { texto: tx('Tira la comida que haya estado a 4 °C o más durante 2 horas o más, o que huela, tenga un color o una textura raros. Ante la duda, a la basura.') },
          { texto: tx('Vuelve a enchufar los aparatos poco a poco.'), propio: true },
        ],
      },
    ],
    fuentes: [
      { nombre: tx('Ready.gov: cortes de luz (actualizada el 06/04/2026)'), url: 'https://www.ready.gov/power-outages' },
      { nombre: tx('Ready.gov: arma un kit (la radio a pilas)'), url: 'https://www.ready.gov/kit' },
    ],
  },
  {
    id: 'agua',
    titulo: tx('Potabilizar agua'),
    resumen: tx('Hervirla o desinfectarla con lejía cuando no hay agua embotellada.'),
    icono: 'water-check-outline',
    aviso: tx('Lo primero es el agua embotellada que tengáis guardada. Esto es para cuando se acaba.'),
    apartados: [
      {
        titulo: tx('Antes: si está turbia'),
        pasos: [
          { texto: tx('Déjala reposar y fíltrala con un paño limpio, papel de cocina o un filtro de café.') },
          { texto: tx('No uses agua con cosas flotando, de color oscuro o con un olor raro. El agua que corre suele ser mejor que la estancada.') },
        ],
      },
      {
        titulo: tx('Hervirla (lo mejor)'),
        pasos: [
          { texto: tx('Ponla a hervir a borbotones al menos 1 minuto. Por encima de 1.000 metros de altitud, 3 minutos.') },
          { texto: tx('Déjala enfriar sola y guárdala en recipientes limpios y tapados.') },
          { texto: tx('Si sabe rara, añade una pizca de sal por litro o pásala varias veces de un recipiente limpio a otro.') },
        ],
      },
      {
        titulo: tx('Con lejía, si no se puede hervir'),
        pasos: [
          { texto: tx('Solo lejía normal, sin perfume y sin detergente, que diga en la etiqueta que sirve para desinfectar. Mejor si tiene menos de un año.') },
          { texto: tx('2 gotas por litro de agua. Para unos 3,8 litros: 8 gotas si la lejía es del 6 %, o 6 gotas si es del 8,25 %.') },
          { texto: tx('Si el agua está turbia, tiene color o está muy fría, el doble.') },
          { texto: tx('Remueve y espera 30 minutos. Tiene que oler un poco a cloro; si no, repite la dosis y espera 15 minutos más.') },
          { texto: tx('Si sabe demasiado a cloro, pásala de un recipiente a otro y déjala reposar unas horas.') },
        ],
      },
      {
        titulo: tx('Lo que no quita'),
        pasos: [{ texto: tx('Hervir o desinfectar no quita los metales pesados, la sal ni la mayoría de productos químicos.') }],
      },
    ],
    fuentes: [{ nombre: tx('EPA: desinfección de agua de bebida en emergencias (actualizada el 24/02/2026)'), url: 'https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water' }],
  },
];

export const guiaPorId = (id?: string) => GUIAS.find((g) => g.id === id);
