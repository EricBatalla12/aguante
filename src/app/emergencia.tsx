// Modo emergencia: siempre en oscuro para gastar menos batería, letra grande
// y solo lo que hace falta hoy.

import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SelectorModo } from '@/components/selector-modo';
import { Barra, Boton, Icono, Pastilla, Segmentado, Tarjeta, Texto, type NombreIcono } from '@/components/ui';
import {
  aguaMascota,
  aguaPersona,
  diasHasta,
  formatoNumero,
  kcalPersona,
  planDelDia,
  racionMascota,
} from '@/lib/calculo';
import { confirmar } from '@/lib/confirmar';
import { textoDia } from '@/lib/fechas';
import { textoCantidad } from '@/lib/formato';
import { volver } from '@/lib/navegacion';
import { fechaISO, hoyISO, useAguante } from '@/lib/store';
import { ProveedorTema, useC } from '@/lib/tema';
import { ETIQUETA_MODO, useResultado } from '@/lib/use-resultado';

// Medidas para apuntar el agua: un vaso, un botellín, un litro y una botella
const MEDIDAS = [
  { valor: 0.25, etiqueta: '0,25 L' },
  { valor: 0.5, etiqueta: '0,5 L' },
  { valor: 1, etiqueta: '1 L' },
  { valor: 1.5, etiqueta: '1,5 L' },
];

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
  const escenario = useAguante((s) => s.escenario);
  const personas = useAguante((s) => s.personas);
  const mascotas = useAguante((s) => s.mascotas);
  const productos = useAguante((s) => s.productos);
  const r = useResultado();
  const [medida, setMedida] = useState(0.5);

  const hoy = hoyISO();
  const bebido = emergencia && emergencia.aguaHoy.fecha === hoy ? emergencia.aguaHoy.litros : 0;
  const comidos = emergencia && emergencia.comidoHoy.fecha === hoy ? emergencia.comidoHoy.items : [];
  const kcalComidas = comidos.reduce((s, c) => s + c.kcal, 0);
  // El plan cubre lo que falta por comer hoy, no el día entero otra vez
  const plan = useMemo(
    () => planDelDia(productos, Math.max(0, r.kcalDia - kcalComidas), escenario),
    [productos, r.kcalDia, kcalComidas, escenario],
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
              {emergencia ? 'Modo emergencia activo' : 'Modo emergencia'}
            </Texto>
          </View>
          <Boton pequeno variante="secundario" onPress={volver}>
            Volver
          </Boton>
        </View>

        {!emergencia || !inicio ? (
          <View style={{ gap: 14 }}>
            <Texto tam={30} peso="800" style={{ letterSpacing: -0.5 }}>
              ¿Empieza una emergencia?
            </Texto>
            <Texto color={C.suave}>
              Llevamos la cuenta de los días, te decimos qué comer cada día (primero lo que caduca antes) y cuánta agua
              beber. Lo que apuntes como comido o bebido se descuenta de la despensa.
            </Texto>
            <Texto peso="700">Modo de aguante</Texto>
            <SelectorModo />
            <Boton variante="peligro" icono="alarm-light-outline" onPress={empezar}>
              Empezar ahora
            </Boton>
          </View>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <Texto tam={14} color={C.suave}>
                Día {dia} · empezó el {textoDia(inicio)} a las {hora}
              </Texto>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                <Texto tam={18} peso="600" style={{ flexShrink: 0 }}>
                  Os quedan
                </Texto>
                <Texto tam={72} peso="800" ajustar maxFontSizeMultiplier={1} style={{ lineHeight: 87, marginVertical: -6, letterSpacing: -2 }}>
                  {r.dias}
                </Texto>
                <Texto tam={24} peso="700" style={{ flexShrink: 0 }}>
                  {r.dias === 1 ? 'día' : 'días'}
                </Texto>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <Pastilla texto={`Modo ${ETIQUETA_MODO[modo].toLowerCase()}`} fondo={C.rojoTinte} color={C.rojoOscuro} />
                {escenario.sinLuz && <Pastilla texto="Sin luz" icono="flash-off" fondo={C.segmento} color={C.texto2} />}
                {escenario.sinCocina && <Pastilla texto="Sin cocina" icono="fire-off" fondo={C.segmento} color={C.texto2} />}
                {escenario.calor && <Pastilla texto="Calor" icono="weather-sunny" fondo={C.segmento} color={C.texto2} />}
              </View>
            </View>

            <Tarjeta style={{ gap: 12 }}>
              <Cabecera
                icono="water-outline"
                color={C.agua}
                titulo="Agua de hoy"
                cifra={`${textoCantidad(bebido)} de ${formatoNumero(metaAgua, 1)} L`}
              />
              <Barra fraccion={metaAgua > 0 ? bebido / metaAgua : 0} color={C.agua} />
              <Segmentado opciones={MEDIDAS} valor={medida} onChange={setMedida} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Boton variante="secundario" icono="minus" deshabilitado={bebido <= 0} onPress={() => beber(-medida)}>
                    Quitar
                  </Boton>
                </View>
                <View style={{ flex: 1.4 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Apuntar ${medida} litros bebidos`}
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
                      Beber
                    </Texto>
                  </Pressable>
                </View>
              </View>
              <Texto tam={12} color={C.suave}>
                Se descuenta del agua guardada: quedan {textoCantidad(r.litrosTotal)} L. Si te equivocas, «Quitar» la
                devuelve. Lo que se bebe no se raciona: si falta, buscad más.
              </Texto>
            </Tarjeta>

            <Tarjeta style={{ gap: 12 }}>
              <Cabecera
                icono="food-variant"
                color={C.comida}
                titulo="Comida de hoy"
                cifra={`${formatoNumero(kcalComidas)} de ${formatoNumero(r.kcalDia)} kcal`}
              />
              <Barra fraccion={r.kcalDia > 0 ? kcalComidas / r.kcalDia : 0} color={C.comida} />
              {plan.length === 0 ? (
                <Texto tam={14} color={C.suave}>
                  {kcalComidas >= r.kcalDia && r.kcalDia > 0
                    ? 'Ya habéis comido lo de hoy.'
                    : 'No queda comida que se pueda usar con este escenario.'}
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
                        accessibilityLabel={`Marcar ${p.nombre} como comido`}
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
                          Comido
                        </Texto>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              {comidos.length > 0 && (
                <View>
                  <Texto tam={12} peso="700" color={C.suave} style={{ letterSpacing: 0.8 }}>
                    YA COMIDO HOY
                  </Texto>
                  {comidos.map((c) => (
                    <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
                      <Icono name="check-circle-outline" color={C.verde} size={18} />
                      <Texto tam={14} style={{ flex: 1 }}>
                        {textoCantidad(c.unidades)} × {c.nombre} · {formatoNumero(c.kcal)} kcal
                      </Texto>
                      <Pressable accessibilityRole="button" onPress={() => deshacerComido(c.id)} hitSlop={8}>
                        <Texto tam={13} peso="700" color={C.enlace} style={{ textDecorationLine: 'underline' }}>
                          Deshacer
                        </Texto>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              <Texto tam={12} color={C.suave}>
                Primero va lo que caduca antes. Los menores, embarazadas y mujeres en lactancia comen su ración completa.
              </Texto>
            </Tarjeta>

            {personas.length + mascotas.length > 1 && (
              <Tarjeta style={{ gap: 2 }}>
                <Texto peso="700" style={{ paddingBottom: 4 }}>
                  Ración de cada uno
                </Texto>
                {personas.map((p) => (
                  <Racion
                    key={p.id}
                    nombre={p.nombre}
                    kcal={p.edadAnios < 1 ? null : kcalPersona(p, modo, manual)}
                    litros={aguaPersona(p, modo === 'manual' ? 'manual' : 'extremo', escenario, manual)}
                  />
                ))}
                {mascotas.map((m) => {
                  const racion = racionMascota(m, modo, manual);
                  return <Racion key={m.id} nombre={m.nombre} kcal={racion.kcal} litros={racion.litros} mascota />;
                })}
                <Texto tam={12} color={C.suave} style={{ paddingTop: 4 }}>
                  {modo === 'manual' ? 'Según tu reparto manual.' : 'El agua es la de beber; la comida, según el modo.'}
                </Texto>
              </Tarjeta>
            )}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Boton variante="peligro" icono="phone" onPress={() => Linking.openURL('tel:112')}>
                  Llamar al 112
                </Boton>
              </View>
              <View style={{ flex: 1 }}>
                <Boton
                  variante="suave"
                  onPress={() =>
                    confirmar('¿Terminar el modo emergencia?', 'La despensa se queda como esté ahora.', 'Terminar', terminar)
                  }>
                  Terminar
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
        {kcal === null ? 'leche' : `${formatoNumero(kcal)} kcal`}
      </Texto>
      <Texto tam={14} peso="700" color={C.agua} style={{ flexShrink: 0, minWidth: 48, textAlign: 'right' }}>
        {formatoNumero(litros, 1)} L
      </Texto>
    </View>
  );
}
