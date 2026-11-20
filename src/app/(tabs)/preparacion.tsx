import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Hueco } from '@/components/tutorial';
import { Barra, Boton, Campo, CampoFecha, FilaEnlace, Icono, Pantalla, type NombreIcono, Pastilla, Segmentado, Seccion, Tarjeta, Texto, Titulo } from '@/components/ui';
import { aguaBeber, aguaMascota, estadoCaducidad, formatoNumero } from '@/lib/calculo';
import { MESES_REPONER } from '@/lib/compra';
import { describir, useDatosCompra } from '@/lib/use-compra';
import { componerFecha, FECHA_VACIA } from '@/lib/fechas';
import { coloresCaducidad, textoCaducidad } from '@/lib/formato';
import { useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { useResultado } from '@/lib/use-resultado';
import { DE_SERIE, EXPLICA_LISTA, LISTAS_KIT, listaDe, type ListaKit } from '@/constants/kit';
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
  const actividad = useAguante((s) => s.actividad);
  const setObjetivo = useAguante((s) => s.setObjetivo);
  const kit = useAguante((s) => s.kit);
  const alternarKit = useAguante((s) => s.alternarKit);
  const kitPropio = useAguante((s) => s.kitPropio);
  const anadirKit = useAguante((s) => s.anadirKit);
  const [nuevo, setNuevo] = useState('');
  const [fechaNuevo, setFechaNuevo] = useState(FECHA_VACIA);
  const [listaKit, setListaKit] = useState<ListaKit>('casa');
  const elementosKit = [...DE_SERIE[listaKit], ...kitPropio.filter((k) => listaDe(k) === listaKit)];
  const normal = useResultado('normal');
  const fechaNueva = componerFecha(fechaNuevo);
  // La mochila hay que cargarla: el agua solo para beber, no la de higiene
  const beberDia =
    personas.reduce((s, p) => s + aguaBeber(p, { actividad }), 0) + mascotas.reduce((s, m) => s + aguaMascota(m), 0);

  const { lista: listaCompra, falta, diasHoy } = useDatosCompra();
  const hoy = new Date();
  // Lo que caduca pronto: productos de la despensa y lo del kit con fecha (medicinas, pilas…)
  const pronto = (c?: string) => ['rojo', 'ambar', 'caducado'].includes(estadoCaducidad({ caducidad: c }, hoy));
  const rotar = [
    ...productos
      .filter((p) => p.cantidad > 0 && pronto(p.caducidad))
      .map((p) => ({ id: p.id, nombre: p.nombre, caducidad: p.caducidad, ruta: `/producto/${p.id}` as const, kit: false })),
    ...kitPropio
      .filter((k) => pronto(k.caducidad))
      .map((k) => ({ id: k.id, nombre: k.que, caducidad: k.caducidad, ruta: `/kit/${k.id}` as const, kit: true })),
  ].sort((a, b) => (a.caducidad ?? '').localeCompare(b.caducidad ?? ''));
  const hechos = elementosKit.filter((k) => kit[k.id]).length;

  // La misma lista que el plan de compra, sin el kit ni las reposiciones (tienen su sitio aquí abajo)
  const articulos = listaCompra(MESES_REPONER);
  const deCocinar = articulos.filter((a) => a.categoria === 'cocinar');
  const litrosCocer = deCocinar.reduce((s, a) => s + a.unidades * (a.aporte?.litrosCocer ?? 0), 0);
  // Con productos de las tiendas puede haber varias líneas de un tipo: la explicación va solo en la primera
  const primeras = new Set(['agua', 'lista', 'cocinar', 'mascotas'].map((c) => articulos.find((a) => a.categoria === c)?.clave));
  const lista = articulos.flatMap((a): { que: string; por: string; icono: NombreIcono }[] => {
    const linea = (icono: NombreIcono, que: string, por: string) => [{ icono, que, por: primeras.has(a.clave) ? por : '' }];
    switch (a.categoria) {
      case 'agua':
        return linea('water-outline', describir(a), t('Faltan {l} L, contando el agua para cocinar', { l: formatoNumero(falta.faltanLitros + litrosCocer, 1) }));
      case 'lista':
        return linea(
          'food-variant',
          describir(a),
          deCocinar.length > 0 ? t('Para los 3 primeros días, sin tener que cocinar') : t('O cualquier comida que no haya que cocinar'),
        );
      case 'cocinar':
        return linea('pot-steam-outline', describir(a), t('Para el resto de días. O pasta, o legumbre seca'));
      case 'mascotas':
        return linea('paw', t('Comida para las mascotas'), t('Faltan ≈ {kcal} kcal', { kcal: formatoNumero(Math.ceil(falta.faltanKcalMascotas / 100) * 100) }));
      default:
        return [];
    }
  });

  return (
    <Pantalla>
      <Titulo>{t('Preparación')}</Titulo>

      <Tarjeta style={{ gap: 12 }}>
        <Hueco id="preparacion-objetivo" style={{ gap: 12 }}>
          <Texto tam={18} peso="800">
            {t('Tu objetivo')}
          </Texto>
          <Segmentado opciones={OBJETIVOS} valor={objetivo} onChange={setObjetivo} />
        </Hueco>
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
                      {l.por !== '' && (
                        <Texto tam={12} color={C.suave}>
                          {l.por}
                        </Texto>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
            <FilaEnlace
              icono="cart-outline"
              titulo={t('Plan de compra')}
              detalle={t('Lo que falta, con precios, repartido en meses según lo que puedas gastar o para una fecha.')}
              onPress={() => router.push('/compra')}
            />
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
                onPress={() => router.push(p.ruta)}
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
                    {p.kit ? t('Del kit: cámbialo por uno nuevo') : t('Gástalo en el día a día y repón la reserva')}
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
        <Segmentado opciones={LISTAS_KIT} valor={listaKit} onChange={setListaKit} />
        <Texto tam={13} color={C.suave} style={{ paddingTop: 6 }}>
          {t(EXPLICA_LISTA[listaKit])}
        </Texto>
        {listaKit === 'mochila' && personas.length > 0 && (
          <Texto tam={13} color={C.texto2} style={{ paddingBottom: 4 }}>
            {t('Para 72 horas fuera de casa: {b} L de agua solo para beber (pesan unos {b} kg) y unas {kcal} kcal de comida que no haya que cocinar. Con la higiene serían {l} L.', {
              b: formatoNumero(beberDia * 3, 1),
              l: formatoNumero(normal.litrosDia * 3, 1),
              kcal: formatoNumero(Math.ceil((normal.kcalDia * 3) / 100) * 100),
            })}
          </Texto>
        )}
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
              {k.caducidad && (
                <Pastilla texto={textoCaducidad(k)} fondo={coloresCaducidad(k, C).fondo} color={coloresCaducidad(k, C).color} />
              )}
              {k.id.startsWith('propio-') && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('Cambiar {que}', { que: k.que })}
                  hitSlop={10}
                  onPress={() => router.push(`/kit/${k.id}`)}>
                  <Icono name="pencil-outline" color={C.suave} size={18} />
                </Pressable>
              )}
            </Pressable>
          );
        })}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Campo
              etiqueta={t('Añadir algo a esta lista')}
              valor={nuevo}
              onChange={setNuevo}
              placeholder={listaKit === 'botiquin' ? t('Ibuprofeno') : t('Pilas AA')}
            />
          </View>
          <Boton
            pequeno
            icono="plus"
            deshabilitado={nuevo.trim() === '' || fechaNueva.estado === 'error' || fechaNueva.estado === 'incompleta'}
            onPress={() => {
              const conFecha = fechaNueva.estado === 'ok' ? fechaNueva : null;
              anadirKit({
                que: nuevo.trim(),
                lista: listaKit,
                caducidad: conFecha?.iso,
                caducidadSinDia: conFecha?.sinDia || undefined,
              });
              setNuevo('');
              setFechaNuevo(FECHA_VACIA);
            }}>
            {t('Añadir')}
          </Boton>
        </View>
        {nuevo.trim() !== '' && (
          <CampoFecha
            etiqueta={t('Caducidad (si tiene)')}
            valor={fechaNuevo}
            onChange={setFechaNuevo}
            ayuda={t('Medicinas, pilas, pastillas potabilizadoras… Te avisamos antes de que caduquen.')}
            error={fechaNueva.estado === 'error' ? fechaNueva.mensaje : undefined}
          />
        )}
      </Tarjeta>

      <Texto tam={12} color={C.suave}>
        {t('La Comisión Europea se ha propuesto que la población pueda valerse por sí misma al menos 72 horas (estrategia de preparación, marzo de 2025).')}
      </Texto>
    </Pantalla>
  );
}
