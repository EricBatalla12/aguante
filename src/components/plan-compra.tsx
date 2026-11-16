// Plan de compra por meses: reparte la lista de la compra de Preparación en
// meses según el presupuesto que pone cada uno. Los precios los pone la
// persona (cambian con la tienda y el año) y se guardan solo en este móvil.

import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Aviso, Campo, Icono, Texto } from '@/components/ui';
import { GENERICOS } from '@/constants/genericos';
import { formatoNumero, planCompra } from '@/lib/calculo';
import { aCampo, numero } from '@/lib/formato';
import { t, tn } from '@/lib/i18n';
import { useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { useResultado } from '@/lib/use-resultado';

// El bote de referencia: garbanzos cocidos, 400 g escurridos (kcal de USDA, en genericos.ts)
const GARBANZOS = GENERICOS.find((g) => g.fdc === 173800);
const KCAL_BOTE = Math.round((400 * (GARBANZOS?.kcal100g ?? 139)) / 100);
const LITROS_GARRAFA = 5;

export function PlanCompra({ faltanLitros, faltanKcal, faltaPienso }: { faltanLitros: number; faltanKcal: number; faltaPienso: boolean }) {
  const C = useC();
  const compra = useAguante((s) => s.compra);
  const setCompra = useAguante((s) => s.setCompra);
  const r = useResultado('normal');
  const [abierto, setAbierto] = useState(compra.presupuesto !== undefined);
  const [campos, setCampos] = useState({
    presupuesto: aCampo(compra.presupuesto),
    precioGarrafa: aCampo(compra.precioGarrafa),
    precioBote: aCampo(compra.precioBote),
  });

  const cambiar = (k: keyof typeof campos) => (texto: string) => {
    setCampos((c) => ({ ...c, [k]: texto }));
    const n = numero(texto);
    setCompra({ ...compra, [k]: Number.isFinite(n) && n > 0 ? n : undefined });
  };

  const garrafas = Math.ceil(faltanLitros / LITROS_GARRAFA);
  const botes = Math.ceil(faltanKcal / KCAL_BOTE);
  const faltanDatos =
    !compra.presupuesto || (garrafas > 0 && !compra.precioGarrafa) || (botes > 0 && !compra.precioBote);
  const plan = faltanDatos
    ? undefined
    : planCompra({
        garrafas,
        botes,
        precioGarrafa: compra.precioGarrafa ?? NaN,
        precioBote: compra.precioBote ?? NaN,
        presupuesto: compra.presupuesto ?? 0,
        diasAgua: r.diasAgua,
        diasComida: r.diasComida,
        diasPorGarrafa: r.litrosDia > 0 ? LITROS_GARRAFA / r.litrosDia : 0,
        diasPorBote: r.kcalDia > 0 ? KCAL_BOTE / r.kcalDia : 0,
      });

  return (
    <View style={{ paddingTop: 8, gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        onPress={() => setAbierto((a) => !a)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
        <Icono name="calendar-month-outline" color={C.tinta} />
        <Texto peso="700" style={{ flex: 1 }}>
          {t('Repartirlo en meses')}
        </Texto>
        <Icono name={abierto ? 'chevron-up' : 'chevron-down'} color={C.suave} />
      </Pressable>
      {abierto && (
        <>
          <Texto tam={13} color={C.suave}>
            {t('Pon lo que puedes gastar al mes y lo que te cuestan las cosas en tu tienda. Cada mes compra primero lo que menos días os da.')}
          </Texto>
          <Campo etiqueta={t('Presupuesto al mes')} valor={campos.presupuesto} onChange={cambiar('presupuesto')} teclado="decimal-pad" sufijo="€" />
          {garrafas > 0 && (
            <Campo
              etiqueta={t('Precio de una garrafa de 5 L')}
              valor={campos.precioGarrafa}
              onChange={cambiar('precioGarrafa')}
              teclado="decimal-pad"
              sufijo="€"
            />
          )}
          {botes > 0 && (
            <Campo
              etiqueta={t('Precio de un bote de garbanzos cocidos (400 g escurridos)')}
              valor={campos.precioBote}
              onChange={cambiar('precioBote')}
              teclado="decimal-pad"
              sufijo="€"
              ayuda={t('Es la medida: unas {kcal} kcal. Puedes comprar otra comida que dé lo mismo.', { kcal: formatoNumero(KCAL_BOTE) })}
            />
          )}
          {plan === null && <Aviso tono="ambar" texto={t('Con ese presupuesto no llega ni para una unidad. Súbelo un poco.')} />}
          {plan &&
            plan.map((m, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  minHeight: 44,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: C.linea,
                }}>
                <Texto peso="700" style={{ width: 64 }}>
                  {t('Mes {n}', { n: i + 1 })}
                </Texto>
                <Texto style={{ flex: 1 }}>
                  {[
                    m.garrafas > 0 ? tn(m.garrafas, '{n} garrafa', '{n} garrafas') : '',
                    m.botes > 0 ? tn(m.botes, '{n} bote', '{n} botes') : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Texto>
                <Texto color={C.suave}>{t('{e} €', { e: formatoNumero(m.coste, 2) })}</Texto>
              </View>
            ))}
          {plan && faltaPienso && (
            <Texto tam={12} color={C.suave}>
              {t('No incluye la comida de las mascotas.')}
            </Texto>
          )}
        </>
      )}
    </View>
  );
}
