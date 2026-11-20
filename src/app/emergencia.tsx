// Modo emergencia: siempre en oscuro para gastar menos batería, letra grande
// y solo lo que hace falta hoy.

import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ControlesEscenario } from '@/components/escenario';
import { SelectorModo } from '@/components/selector-modo';
import { Barra, Boton, Icono, Pastilla, Segmentado, Tarjeta, Texto, type NombreIcono } from '@/components/ui';
import {
  ACTIVIDAD_POR_DEFECTO,
  aguaMascota,
  aguaPersona,
  conservacionDe,
  diasHasta,
  estadoCaducidad,
  horasFrio,
  formatoNumero,
  kcalPersona,
  planDelDia,
  racionMascota,
  type Conservacion,
  type Escenario,
  type Producto,
} from '@/lib/calculo';
import { confirmar } from '@/lib/confirmar';
import { textoDia } from '@/lib/fechas';
import { textoCantidad } from '@/lib/formato';
import { volver } from '@/lib/navegacion';
import { fechaISO, horasSinLuz, hoyISO, useAguante } from '@/lib/store';
import { ProveedorTema, useC } from '@/lib/tema';
import { ETIQUETA_MODO, useEscenario, useResultado } from '@/lib/use-resultado';
import { t, tx } from '@/lib/i18n';

// Medidas para apuntar el agua: un vaso, un botellín, un litro y una botella
const MEDIDAS = [0.25, 0.5, 1, 1.5];

export default function Emergencia() {
  return (
    <ProveedorTema forzar="oscuro">
      <StatusBar style="light" />
      <Contenido />
    </ProveedorTema>
  );
}

function Contenido() {
  const C = useC();
  const margenes = useSafeAreaInsets();
  const emergencia = useAguante((s) => s.emergencia);
  const empezar = useAguante((s) => s.empezarEmergencia);
  const terminar = useAguante((s) => s.terminarEmergencia);
  const beber = useAguante((s) => s.beber);
  const comer = useAguante((s) => s.comer);
  const deshacerComido = useAguante((s) => s.deshacerComido);
  const modo = useAguante((s) => s.modo);
  const manual = useAguante((s) => s.manual);
  const escenario = useEscenario();
  const personas = useAguante((s) => s.personas);
  const mascotas = useAguante((s) => s.mascotas);
  const productos = useAguante((s) => s.productos);
  const setEscenario = useAguante((s) => s.setEscenario);
  const [medida, setMedida] = useState(0.5);
  // Escenario que se elige antes de empezar; arranca con el guardado, pero
  // sedentarios: en una emergencia se hace poco (se puede cambiar)
  const [escInicio, setEscInicio] = useState<Escenario>(() => ({ ...escenario, actividad: ACTIVIDAD_POR_DEFECTO }));
  const [cambiarEsc, setCambiarEsc] = useState(false);
  // Reloj de minuto en minuto: las horas sin luz cambian lo que se puede comer
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const horas = horasSinLuz(emergencia, escenario, ahora);
  const r = useResultado(undefined, horas);

  const hoy = hoyISO();
  const bebido = emergencia && emergencia.aguaHoy.fecha === hoy ? emergencia.aguaHoy.litros : 0;
  const comidos = emergencia && emergencia.comidoHoy.fecha === hoy ? emergencia.comidoHoy.items : [];
  const kcalComidas = comidos.reduce((s, c) => s + c.kcal, 0);
  // El plan cubre lo que falta por comer hoy, no el día entero otra vez
  const plan = useMemo(
    () => planDelDia(productos, Math.max(0, r.kcalDia - kcalComidas), escenario, new Date(ahora), horas),
    [productos, r.kcalDia, kcalComidas, escenario, ahora, horas],
  );
  // Meta del contador: lo que se bebe hoy, sin higiene. En manual, lo que has fijado tú.
  const metaAgua =
    modo === 'manual'
      ? r.litrosDia
      : personas.reduce((s, p) => s + aguaPersona(p, 'extremo', escenario), 0) +
        mascotas.reduce((s, m) => s + aguaMascota(m), 0);
  // Día 1 es el día en que empezó, en hora local
  const inicio = emergencia ? new Date(emergencia.inicio) : null;
  const dia = inicio ? 1 - diasHasta(fechaISO(inicio), new Date()) : 0;
  const hora = inicio ? `${inicio.getHours()}:${String(inicio.getMinutes()).padStart(2, '0')}` : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.fondo }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 + margenes.bottom, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: emergencia ? C.rojo : C.suave }} />
            <Texto tam={14} peso="700" color={emergencia ? C.rojoOscuro : C.suave}>
              {emergencia ? t('Modo emergencia activo') : t('Modo emergencia')}
            </Texto>
          </View>
          <Boton pequeno variante="secundario" onPress={volver}>
            {t('Volver')}
          </Boton>
        </View>

        {!emergencia || !inicio ? (
          <View style={{ gap: 14 }}>
            <Texto tam={30} peso="800" style={{ letterSpacing: -0.5 }}>
              {t('¿Empieza una emergencia?')}
            </Texto>
            <Texto color={C.suave}>
              {t('Llevamos la cuenta de los días, te decimos qué comer cada día (primero lo que caduca antes) y cuánta agua beber. Lo que apuntes como comido o bebido se descuenta de la despensa.')}
            </Texto>
            <Texto peso="700">{t('¿Qué está pasando?')}</Texto>
            <Tarjeta>
              <ControlesEscenario valor={escInicio} onChange={setEscInicio} />
            </Tarjeta>
            <Texto peso="700">{t('Modo de aguante')}</Texto>
            <SelectorModo />
            <Boton variante="peligro" icono="alarm-light-outline" onPress={() => empezar(escInicio)}>
              {t('Empezar ahora')}
            </Boton>
          </View>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <Texto tam={14} color={C.suave}>
                {t('Día {dia} · empezó el {fecha} a las {hora}', { dia, fecha: textoDia(inicio), hora })}
              </Texto>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                <Texto tam={18} peso="600" style={{ flexShrink: 0 }}>
                  {t('Os quedan')}
                </Texto>
                <Texto tam={72} peso="800" ajustar maxFontSizeMultiplier={1} style={{ lineHeight: 87, marginVertical: -6, letterSpacing: -2 }}>
                  {r.dias}
                </Texto>
                <Texto tam={24} peso="700" style={{ flexShrink: 0 }}>
                  {r.dias === 1 ? t('día') : t('días')}
                </Texto>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <Pastilla texto={t('Modo {m}', { m: t(ETIQUETA_MODO[modo]).toLowerCase() })} fondo={C.rojoTinte} color={C.rojoOscuro} />
                <Pastilla
                  texto={escenario.actividad === 'normal' ? t('Con actividad') : t('Sedentarios')}
                  icono={escenario.actividad === 'normal' ? 'walk' : 'sofa-outline'}
                  fondo={C.segmento}
                  color={C.texto2}
                />
                {escenario.sinLuz && <Pastilla texto={t('Sin luz')} icono="flash-off" fondo={C.segmento} color={C.texto2} />}
                {escenario.sinCocina && <Pastilla texto={t('Sin cocina')} icono="fire-off" fondo={C.segmento} color={C.texto2} />}
                {escenario.calor && <Pastilla texto={t('Calor')} icono="weather-sunny" fondo={C.segmento} color={C.texto2} />}
              </View>
            </View>

            <GuiaComida productos={productos} escenario={escenario} horas={horas} />

            <Tarjeta style={{ gap: 12 }}>
              <Cabecera
                icono="water-outline"
                color={C.agua}
                titulo={t('Agua de hoy')}
                cifra={t('{a} de {b} L', { a: textoCantidad(bebido), b: formatoNumero(metaAgua, 1) })}
              />
              <Barra fraccion={metaAgua > 0 ? bebido / metaAgua : 0} color={C.agua} />
              <Segmentado
                opciones={MEDIDAS.map((v) => ({ valor: v, etiqueta: `${textoCantidad(v)} L` }))}
                valor={medida}
                onChange={setMedida}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Boton variante="secundario" icono="minus" deshabilitado={bebido <= 0} onPress={() => beber(-medida)}>
                    {t('Quitar')}
                  </Boton>
                </View>
                <View style={{ flex: 1.4 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('Apuntar {l} litros bebidos', { l: textoCantidad(medida) })}
                    onPress={() => beber(medida)}
                    style={({ pressed }) => ({
                      minHeight: 54,
                      borderRadius: 18,
                      flexDirection: 'row',
                      gap: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 12,
                      backgroundColor: C.aguaFuerte,
                      opacity: pressed ? 0.8 : 1,
                    })}>
                    <Icono name="plus" color={C.blanco} />
                    <Texto tam={16} peso="700" color={C.blanco}>
                      {t('Beber')}
                    </Texto>
                  </Pressable>
                </View>
              </View>
              <Texto tam={12} color={C.suave}>
                {t(
                  'Se descuenta del agua guardada: quedan {l} L. Si te equivocas, «Quitar» la devuelve. Lo que se bebe no se raciona: si falta, buscad más.',
                  { l: textoCantidad(r.litrosTotal) },
                )}
              </Texto>
            </Tarjeta>

            <Tarjeta style={{ gap: 12 }}>
              <Cabecera
                icono="food-variant"
                color={C.comida}
                titulo={t('Comida de hoy')}
                cifra={t('{a} de {b} kcal', { a: formatoNumero(kcalComidas), b: formatoNumero(r.kcalDia) })}
              />
              <Barra fraccion={r.kcalDia > 0 ? kcalComidas / r.kcalDia : 0} color={C.comida} />
              {plan.length === 0 ? (
                <Texto tam={14} color={C.suave}>
                  {kcalComidas >= r.kcalDia && r.kcalDia > 0
                    ? t('Ya habéis comido lo de hoy.')
                    : t('No queda comida que se pueda usar con este escenario.')}
                </Texto>
              ) : (
                <View style={{ gap: 8 }}>
                  {plan.map((p) => (
                    <View
                      key={p.productoId}
                      style={{ backgroundColor: C.segmento, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Texto peso="700">
                          {textoCantidad(p.unidades)} × {p.nombre}
                        </Texto>
                        <Texto tam={13} color={C.suave}>
                          {formatoNumero(p.kcal)} kcal
                        </Texto>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('Marcar {nombre} como comido', { nombre: p.nombre })}
                        onPress={() => comer(p.productoId, p.unidades)}
                        style={({ pressed }) => ({
                          minHeight: 44,
                          paddingHorizontal: 14,
                          borderRadius: 12,
                          backgroundColor: C.verdeFuerte,
                          justifyContent: 'center',
                          opacity: pressed ? 0.8 : 1,
                        })}>
                        <Texto tam={14} peso="700" color={C.blanco}>
                          {t('Comido')}
                        </Texto>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              {comidos.length > 0 && (
                <View>
                  <Texto tam={12} peso="700" color={C.suave} style={{ letterSpacing: 0.8 }}>
                    {t('YA COMIDO HOY')}
                  </Texto>
                  {comidos.map((c) => (
                    <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
                      <Icono name="check-circle-outline" color={C.verde} size={18} />
                      <Texto tam={14} style={{ flex: 1 }}>
                        {textoCantidad(c.unidades)} × {c.nombre} · {formatoNumero(c.kcal)} kcal
                      </Texto>
                      <Pressable accessibilityRole="button" onPress={() => deshacerComido(c.id)} hitSlop={8}>
                        <Texto tam={13} peso="700" color={C.enlace} style={{ textDecorationLine: 'underline' }}>
                          {t('Deshacer')}
                        </Texto>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              <Texto tam={12} color={C.suave}>
                {t('Primero va lo que antes se estropea: sin luz, nevera, congelador y después despensa. Los menores, embarazadas y mujeres en lactancia comen su ración completa.')}
              </Texto>
            </Tarjeta>

            {personas.length + mascotas.length > 1 && (
              <Tarjeta style={{ gap: 2 }}>
                <Texto peso="700" style={{ paddingBottom: 4 }}>
                  {t('Ración de cada uno')}
                </Texto>
                {personas.map((p) => (
                  <Racion
                    key={p.id}
                    nombre={p.nombre}
                    kcal={p.edadAnios < 1 ? null : kcalPersona(p, modo, manual, escenario)}
                    litros={aguaPersona(p, modo === 'manual' ? 'manual' : 'extremo', escenario, manual)}
                  />
                ))}
                {mascotas.map((m) => {
                  const racion = racionMascota(m, modo, manual);
                  return <Racion key={m.id} nombre={m.nombre} kcal={racion.kcal} litros={racion.litros} mascota />;
                })}
                <Texto tam={12} color={C.suave} style={{ paddingTop: 4 }}>
                  {modo === 'manual' ? t('Según tu reparto manual.') : t('El agua es la de beber; la comida, según el modo.')}
                </Texto>
              </Tarjeta>
            )}

            <Tarjeta>
              <Pressable
                accessibilityRole="button"
                onPress={() => setCambiarEsc((v) => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 }}>
                <Icono name="tune-variant" color={C.suave} size={18} />
                <Texto peso="700" style={{ flex: 1 }}>
                  {t('¿Ha cambiado algo?')}
                </Texto>
                <Icono name={cambiarEsc ? 'chevron-up' : 'chevron-down'} color={C.suave} />
              </Pressable>
              {cambiarEsc && <ControlesEscenario valor={escenario} onChange={setEscenario} />}
            </Tarjeta>

            <Tarjeta style={{ gap: 0, paddingVertical: 4 }}>
              {[
                { icono: 'book-open-variant' as const, texto: t('Guías sin conexión'), ruta: '/guias' as const },
                { icono: 'account-group-outline' as const, texto: t('Plan familiar'), ruta: '/plan' as const },
              ].map((x, i) => (
                <Pressable
                  key={x.ruta}
                  accessibilityRole="button"
                  onPress={() => router.push(x.ruta)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.linea }}>
                  <Icono name={x.icono} color={C.suave} size={18} />
                  <Texto peso="700" style={{ flex: 1 }}>
                    {x.texto}
                  </Texto>
                  <Icono name="chevron-right" color={C.suave} size={18} />
                </Pressable>
              ))}
            </Tarjeta>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Boton variante="peligro" icono="phone" onPress={() => Linking.openURL('tel:112')}>
                  {t('Llamar al 112')}
                </Boton>
              </View>
              <View style={{ flex: 1 }}>
                <Boton
                  variante="suave"
                  onPress={() =>
                    confirmar({
                      titulo: t('¿Terminar el modo emergencia?'),
                      mensaje: t('La despensa se queda como esté ahora.'),
                      accion: t('Terminar'),
                      icono: 'flag-checkered',
                      tono: 'normal',
                      alAceptar: terminar,
                    })
                  }>
                  {t('Terminar')}
                </Boton>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Cabecera({ icono, color, titulo, cifra }: { icono: NombreIcono; color: string; titulo: string; cifra: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icono name={icono} color={color} />
      <Texto tam={16} peso="700" style={{ flex: 1 }}>
        {titulo}
      </Texto>
      <Texto tam={15} peso="800" color={color} style={{ flexShrink: 0 }}>
        {cifra}
      </Texto>
    </View>
  );
}

function Racion({ nombre, kcal, litros, mascota }: { nombre: string; kcal: number | null; litros: number; mascota?: boolean }) {
  const C = useC();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, borderTopWidth: 1, borderTopColor: C.linea }}>
      <Icono name={mascota ? 'paw' : 'account-outline'} color={C.suave} size={18} />
      <Texto tam={14} peso="600" lineas={1} style={{ flex: 1 }}>
        {nombre}
      </Texto>
      <Texto tam={14} peso="700" color={C.comida} style={{ flexShrink: 0 }}>
        {kcal === null ? t('leche') : `${formatoNumero(kcal)} kcal`}
      </Texto>
      <Texto tam={14} peso="700" color={C.agua} style={{ flexShrink: 0, minWidth: 48, textAlign: 'right' }}>
        {formatoNumero(litros, 1)} L
      </Texto>
    </View>
  );
}

const ZONAS: { zona: Conservacion; titulo: string; icono: NombreIcono }[] = [
  { zona: 'nevera', titulo: tx('Nevera'), icono: 'fridge-outline' },
  { zona: 'congelador', titulo: tx('Congelador'), icono: 'snowflake' },
  { zona: 'ambiente', titulo: tx('Despensa y latas'), icono: 'archive-outline' },
];

/** Horas en texto corto: «3 h», «45 min». */
function textoHoras(h: number): string {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  return `${formatoNumero(h, h < 10 ? 1 : 0)} h`;
}

/**
 * Guía de qué comer primero. Sin luz cuenta las horas que le quedan a la nevera
 * y al congelador; con luz solo recuerda el orden.
 */
function GuiaComida({ productos, escenario, horas }: { productos: Producto[]; escenario: Escenario; horas: number }) {
  const C = useC();
  const hoy = new Date();
  const kcalZona = (z: Conservacion) =>
    productos
      .filter((p) => p.categoria === 'comida' && p.cantidad > 0 && estadoCaducidad(p, hoy) !== 'caducado' && conservacionDe(p) === z)
      .reduce((s, p) => s + p.cantidad * (p.kcalPorUnidad ?? 0), 0);
  const hayFrio = kcalZona('nevera') + kcalZona('congelador') > 0;
  if (!hayFrio && !escenario.sinLuz) return null;
  // La etapa actual es la primera zona que aún se puede comer y tiene algo
  const quedan = (z: Conservacion) => {
    const h = horasFrio(z, escenario);
    return h === Infinity ? Infinity : h - horas;
  };
  const actual = ZONAS.find((z) => kcalZona(z.zona) > 0 && quedan(z.zona) > 0)?.zona;
  return (
    <Tarjeta style={{ gap: 10 }}>
      <Cabecera icono="format-list-numbered" color={C.comida} titulo={t('Qué comer primero')} cifra="" />
      {ZONAS.map((z, i) => {
        const kcal = kcalZona(z.zona);
        const q = quedan(z.zona);
        const estropeado = q <= 0 && z.zona !== 'ambiente';
        let detalle: string;
        if (kcal <= 0) detalle = t('No tienes nada apuntado aquí.');
        else if (!escenario.sinLuz) detalle = `${formatoNumero(kcal)} kcal`;
        else if (estropeado)
          detalle =
            z.zona === 'nevera'
              ? t('Han pasado más de 4 horas sin luz: lo perecedero (carne, pescado, leche, huevos, sobras) ya no es seguro.')
              : t('Ya se habrá descongelado: si algo sigue muy frío se puede cocinar hoy; si no, fuera.')
        else if (q === Infinity) detalle = t('{kcal} kcal · aguanta', { kcal: formatoNumero(kcal) });
        else detalle = t('{kcal} kcal · quedan unas {h} con la puerta cerrada', { kcal: formatoNumero(kcal), h: textoHoras(q) });
        const activa = actual === z.zona;
        return (
          <View
            key={z.zona}
            style={{
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
              padding: 10,
              borderRadius: 14,
              backgroundColor: activa ? C.comidaTinte : C.segmento,
              opacity: estropeado || kcal <= 0 ? 0.6 : 1,
            }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: activa ? C.comida : C.tarjeta,
              }}>
              <Texto tam={14} peso="800" color={activa ? C.blanco : C.texto2}>
                {i + 1}
              </Texto>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icono name={z.icono} size={16} color={activa ? C.comidaOscuro : C.suave} />
                <Texto peso="700" color={activa ? C.comidaOscuro : C.tinta}>
                  {t(z.titulo)}
                  {activa ? t(' · ahora') : ''}
                </Texto>
              </View>
              <Texto tam={13} color={activa ? C.comidaOscuro : C.suave}>
                {detalle}
              </Texto>
            </View>
          </View>
        );
      })}
      <Texto tam={12} color={C.suave}>
        {t('Abre la nevera y el congelador lo menos posible: cada vez se pierde frío. Fuentes: Ready.gov y FoodSafety.gov.')}
      </Texto>
    </Tarjeta>
  );
}
