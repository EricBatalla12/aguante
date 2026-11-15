import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Barra, Boton, Campo, Icono, Pantalla, Pastilla, Segmentado, Seccion, Tarjeta, Texto, Titulo } from '@/components/ui';
import { calcularFaltante, estadoCaducidad, formatoNumero } from '@/lib/calculo';
import { coloresCaducidad, textoCaducidad } from '@/lib/formato';
import { useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { useResultado } from '@/lib/use-resultado';
import { KIT } from '@/constants/kit';
import { t, tx } from '@/lib/i18n';

const OBJETIVOS = [
  { valor: 3, etiqueta: tx('72 horas') },
  { valor: 7, etiqueta: tx('1 semana') },
  { valor: 14, etiqueta: tx('2 semanas') },
];

export default function Preparacion() {
  const C = useC();
  const personas = useAguante((s) => s.personas);
  const mascotas = useAguante((s) => s.mascotas);
  const productos = useAguante((s) => s.productos);
  const objetivo = useAguante((s) => s.objetivoDias);
  const setObjetivo = useAguante((s) => s.setObjetivo);
  const kit = useAguante((s) => s.kit);
  const alternarKit = useAguante((s) => s.alternarKit);
  const kitPropio = useAguante((s) => s.kitPropio);
  const anadirKit = useAguante((s) => s.anadirKit);
  const borrarKit = useAguante((s) => s.borrarKit);
  const [nuevo, setNuevo] = useState('');
  const elementosKit = [...KIT, ...kitPropio];
  const normal = useResultado('normal');

  const falta = useMemo(
    () => calcularFaltante(personas, mascotas, productos, objetivo),
    [personas, mascotas, productos, objetivo],
  );
  const hoy = new Date();
  const rotar = productos
    .filter((p) => p.cantidad > 0 && ['rojo', 'ambar', 'caducado'].includes(estadoCaducidad(p, hoy)))
    .sort((a, b) => (a.caducidad ?? '').localeCompare(b.caducidad ?? ''));
  const hechos = elementosKit.filter((k) => kit[k.id]).length;
  const diasHoy = Math.min(normal.diasAgua, normal.diasComida);

  const lista: { que: string; por: string; icono: 'water-outline' | 'food-variant' | 'paw' }[] = [];
  if (falta.faltanLitros > 0) {
    lista.push({
      icono: 'water-outline',
      que: t('{n} garrafas de agua de 5 L', { n: Math.ceil(falta.faltanLitros / 5) }),
      por: t('Faltan {l} L, contando el agua para cocinar', { l: formatoNumero(falta.faltanLitros, 1) }),
    });
  }
  if (falta.faltanKcal > 0) {
    lista.push({
      icono: 'food-variant',
      que: normal.limita === 'agua' ? t('Comida lista para comer') : t('Comida de larga duración'),
      por: t('Faltan ≈ {kcal} kcal', { kcal: formatoNumero(Math.ceil(falta.faltanKcal / 100) * 100) }),
    });
  }
  if (falta.faltanKcalMascotas > 0) {
    lista.push({
      icono: 'paw',
      que: t('Comida para las mascotas'),
      por: t('Faltan ≈ {kcal} kcal', { kcal: formatoNumero(Math.ceil(falta.faltanKcalMascotas / 100) * 100) }),
    });
  }

  return (
    <Pantalla>
      <Titulo>{t('Preparación')}</Titulo>

      <Tarjeta style={{ gap: 12 }}>
        <Texto tam={18} peso="800">
          {t('Tu objetivo')}
        </Texto>
        <Segmentado opciones={OBJETIVOS} valor={objetivo} onChange={setObjetivo} />
        {personas.length === 0 ? (
          <Texto tam={14} color={C.suave}>
            {t('Añade quién vive en casa (pestaña Hogar) para calcular lo que te falta.')}
          </Texto>
        ) : (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Texto tam={14} peso="700" color={falta.cumplido ? C.verde : C.tinta}>
                {falta.cumplido ? t('Objetivo cumplido') : t('Aún te falta')}
              </Texto>
              <Texto tam={14} color={C.suave}>
                {t('{a} de {b} días', { a: formatoNumero(diasHoy, 1), b: objetivo })}
              </Texto>
            </View>
            <Barra fraccion={diasHoy / objetivo} color={falta.cumplido ? C.verde : C.comida} />
            {lista.length > 0 && (
              <View style={{ paddingTop: 4 }}>
                <Seccion>{t('Lista de la compra')}</Seccion>
                {lista.map((l, i) => (
                  <View
                    key={l.que}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      minHeight: 52,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: C.linea,
                      paddingVertical: 8,
                    }}>
                    <Icono name={l.icono} color={C.suave} />
                    <View style={{ flex: 1 }}>
                      <Texto peso="600">{l.que}</Texto>
                      <Texto tam={12} color={C.suave}>
                        {l.por}
                      </Texto>
                    </View>
                  </View>
                ))}
                {normal.limita === 'agua' && falta.faltanKcal > 0 && (
                  <Texto tam={12} color={C.suave} style={{ paddingTop: 6 }}>
                    {t('Como os limita el agua, mejor comida que no haya que cocinar: conservas, legumbre cocida, galletas.')}
                  </Texto>
                )}
              </View>
            )}
          </>
        )}
      </Tarjeta>

      <Tarjeta style={{ gap: 4 }}>
        <Texto tam={18} peso="800" style={{ paddingBottom: 4 }}>
          {t('Rotar pronto')}
        </Texto>
        {rotar.length === 0 ? (
          <Texto tam={14} color={C.suave}>
            {t('Nada caduca en los próximos 3 meses.')}
          </Texto>
        ) : (
          rotar.map((p, i) => {
            const c = coloresCaducidad(p, C);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                onPress={() => router.push(`/producto/${p.id}`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  minHeight: 52,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: C.linea,
                  paddingVertical: 8,
                }}>
                <View style={{ flex: 1 }}>
                  <Texto peso="600" lineas={2}>
                    {p.nombre}
                  </Texto>
                  <Texto tam={12} color={C.suave}>
                    {t('Gástalo en el día a día y repón la reserva')}
                  </Texto>
                </View>
                <Pastilla texto={textoCaducidad(p)} fondo={c.fondo} color={c.color} />
              </Pressable>
            );
          })
        )}
      </Tarjeta>

      <Tarjeta style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, paddingBottom: 4 }}>
          <Texto tam={18} peso="800">
            {t('Kit de emergencia')}
          </Texto>
          <Texto tam={13} color={C.suave}>
            {t('{a} de {b}', { a: hechos, b: elementosKit.length })}
          </Texto>
        </View>
        <Barra fraccion={hechos / elementosKit.length} color={C.verde} alto={6} />
        {elementosKit.map((k, i) => {
          const ok = !!kit[k.id];
          return (
            <Pressable
              key={k.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: ok }}
              onPress={() => alternarKit(k.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                minHeight: 48,
                paddingVertical: 6,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: C.linea,
              }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: ok ? C.verdeFuerte : 'transparent',
                  borderWidth: ok ? 0 : 2,
                  borderColor: C.campoBorde,
                }}>
                {ok && <Icono name="check-bold" color={C.blanco} size={14} />}
              </View>
              <Texto color={ok ? C.suave : C.tinta} style={{ flex: 1, textDecorationLine: ok ? 'line-through' : 'none' }}>
                {t(k.que)}
              </Texto>
              {k.clave && !ok && <Pastilla texto={t('Se olvida mucho')} fondo={C.rojoTinte} color={C.rojo} />}
              {k.id.startsWith('propio-') && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('Quitar {que} del kit', { que: t(k.que) })}
                  hitSlop={10}
                  onPress={() => borrarKit(k.id)}>
                  <Icono name="close" color={C.suave} size={18} />
                </Pressable>
              )}
            </Pressable>
          );
        })}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Campo etiqueta={t('Añadir algo al kit')} valor={nuevo} onChange={setNuevo} placeholder={t('Gafas de repuesto')} />
          </View>
          <Boton
            pequeno
            icono="plus"
            deshabilitado={nuevo.trim() === ''}
            onPress={() => {
              anadirKit(nuevo.trim());
              setNuevo('');
            }}>
            {t('Añadir')}
          </Boton>
        </View>
      </Tarjeta>

      <Texto tam={12} color={C.suave}>
        {t('La UE recomienda que cada hogar aguante al menos 72 horas por su cuenta.')}
      </Texto>
    </Pantalla>
  );
}
