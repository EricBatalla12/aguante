// Lo que comparten Preparación y el plan de compra: la lista de lo que falta,
// calculada igual en las dos, y cómo se llama cada cosa.

import { useMemo, useState } from 'react';

import { DE_SERIE } from '@/constants/kit';
import { calcular, calcularFaltante, formatoNumero, type Faltante } from './calculo';
import {
  listaCompra,
  porReponer,
  type Articulo,
  type Dias,
} from './compra';
import { t, tn } from './i18n';
import { useAguante } from './store';
import { useEscenario, useResultado } from './use-resultado';

// Del kit entra lo que se compra en una tienda. Fuera: los documentos y el
// efectivo, la medicación con receta y las gafas (son de cada uno) y el
// «botiquín» de la lista de casa, que ya está desglosado en la del botiquín.
const KIT_FUERA = new Set(['docs', 'botiquin', 'botiquin-receta', 'botiquin-gafas']);
const KIT_COMPRA = [...DE_SERIE.casa, ...DE_SERIE.botiquin].filter((k) => !KIT_FUERA.has(k.id));

export type DatosCompra = {
  /** La lista, con lo que hay que reponer en los `meses` próximos meses. */
  lista: (meses: number) => Articulo[];
  dias: Dias;
  falta: Faltante;
  /** Los días que aguantáis hoy en modo normal: los mismos que enseña Preparación. */
  diasHoy: number;
  hoy: Date;
};

/** Lo que falta para el objetivo y cuántos días da cada cosa, en modo normal. */
export function useDatosCompra(): DatosCompra {
  const personas = useAguante((s) => s.personas);
  const mascotas = useAguante((s) => s.mascotas);
  const productos = useAguante((s) => s.productos);
  const objetivo = useAguante((s) => s.objetivoDias);
  const actividad = useAguante((s) => s.actividad);
  const kit = useAguante((s) => s.kit);
  const elegidos = useAguante((s) => s.compra.elegidos);
  const sinCocina = !!useEscenario().sinCocina;
  const [hoy] = useState(() => new Date());
  const normal = useResultado('normal');
  const diasHoy = Math.min(normal.diasAgua, normal.diasComida);

  return useMemo(() => {
    const esc = { actividad };
    const r = calcular(personas, mascotas, productos, 'normal', esc, hoy);
    const falta = calcularFaltante(personas, mascotas, productos, objetivo, hoy, actividad);
    const kcalSinCocinar = calcular(personas, mascotas, productos, 'normal', { ...esc, sinCocina: true }, hoy).kcalTotal;
    const kitFalta = KIT_COMPRA.filter((k) => !kit[k.id]);
    const lista = (meses: number) =>
      listaCompra({
        ...falta,
        kcalDia: r.kcalDia,
        kcalSinCocinar,
        objetivoDias: objetivo,
        sinCocina,
        kit: kitFalta,
        reponer: porReponer(productos, hoy, meses),
      }, elegidos ?? []);
    const dias: Dias = {
      agua: r.diasAgua,
      comida: r.diasComida,
      porLitro: r.litrosDia > 0 ? 1 / r.litrosDia : 0,
      porKcal: r.kcalDia > 0 ? 1 / r.kcalDia : 0,
    };
    return { lista, dias, falta, diasHoy, hoy };
  }, [personas, mascotas, productos, objetivo, actividad, kit, sinCocina, hoy, diasHoy, elegidos]);
}

/** Qué es cada artículo, con sus unidades. */
export function describir(a: Articulo, unidades = a.unidades, kcalMascotas = 0): string {
  switch (a.categoria) {
    case 'agua':
      if (a.clave.startsWith('prod:')) return t('{n} × {nombre}', { n: unidades, nombre: a.nombre ?? '' });
      return tn(unidades, '{n} garrafa de agua de 5 L', '{n} garrafas de agua de 5 L');
    case 'lista':
      if (a.clave.startsWith('prod:')) return t('{n} × {nombre}', { n: unidades, nombre: a.nombre ?? '' });
      return tn(unidades, '{n} bote de garbanzos cocidos (400 g)', '{n} botes de garbanzos cocidos (400 g)');
    case 'cocinar':
      if (a.clave.startsWith('prod:')) return t('{n} × {nombre}', { n: unidades, nombre: a.nombre ?? '' });
      return tn(unidades, '{n} paquete de arroz de 1 kg', '{n} paquetes de arroz de 1 kg');
    case 'mascotas':
      return kcalMascotas > 0
        ? t('Comida para las mascotas (faltan ≈ {kcal} kcal)', { kcal: formatoNumero(Math.ceil(kcalMascotas / 100) * 100) })
        : t('Comida para las mascotas');
    case 'kit':
      return t(a.nombre ?? '');
    case 'reponer':
      return t('{nombre}: {n} para reponer', { nombre: a.nombre ?? '', n: unidades });
  }
}
