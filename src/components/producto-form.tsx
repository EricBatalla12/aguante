// Formulario de producto, compartido por «Añadir» y «Editar».
//
// Las calorías se intentan rellenar solas: al escanear, al elegir una
// sugerencia de Open Food Facts mientras se escribe el nombre o, sin conexión,
// con un valor típico de la lista de genéricos. Teclearlas es el último recurso.

import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Boton, Campo, CampoFecha, Contador, Icono, Interruptor, Miniatura, Segmentado, Tarjeta, Texto, Tramo } from '@/components/ui';
import { genericosPara, type Generico } from '@/constants/genericos';
import { formatoNumero, type Categoria, type Producto } from '@/lib/calculo';
import { componerFecha, partesDeFecha, textoFechaLarga } from '@/lib/fechas';
import { aCampo, colorCategoria, ICONO_CATEGORIA, numero } from '@/lib/formato';
import { buscarNombre, type DatosOFF } from '@/lib/off';
import { nuevoId, useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';

const ENVASES_AGUA = [0.5, 1.5, 5, 8];

export function ProductoForm({
  inicial,
  origenInicial,
  textoGuardar,
  onGuardar,
  diasPorKcal,
}: {
  inicial?: Partial<Producto>;
  /** De dónde salen los datos de partida («Open Food Facts»), para decirlo. */
  origenInicial?: string;
  textoGuardar: string;
  onGuardar: (p: Producto) => void;
  /** kcal diarias de la casa, para decir cuántos días suma lo que añades */
  diasPorKcal?: number;
}) {
  const C = useC();
  const avisos = useAguante((s) => s.avisos);

  const [categoria, setCategoria] = useState<Categoria>(inicial?.categoria ?? 'comida');
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [cantidad, setCantidad] = useState(inicial?.cantidad ?? 1);
  const [gramos, setGramos] = useState(aCampo(inicial?.gramos));
  const [kcal100, setKcal100] = useState(aCampo(inicial?.kcal100g));
  const [kcalUnidad, setKcalUnidad] = useState(aCampo(inicial?.kcalPorUnidad));
  const [litros, setLitros] = useState(aCampo(inicial?.litrosPorUnidad));
  const [fecha, setFecha] = useState(partesDeFecha(inicial?.caducidad, inicial?.caducidadSinDia));
  const [cocinar, setCocinar] = useState(!!inicial?.necesitaCocinar);
  const [aguaCocinar, setAguaCocinar] = useState(aCampo(inicial?.aguaCocinarPorUnidadL));
  const [frio, setFrio] = useState(!!inicial?.necesitaFrio);
  const [imagen, setImagen] = useState(inicial?.imagen);
  const [codigo, setCodigo] = useState(inicial?.codigo);
  const [origen, setOrigen] = useState(origenInicial ?? null);

  const completo = !!inicial?.gramos && !!inicial?.kcal100g;
  // Un producto guardado solo con las kcal de la unidad (sin peso) se sigue editando así
  const [porUnidad, setPorUnidad] = useState(!completo && !!inicial?.kcalPorUnidad);
  // Si las calorías ya vienen rellenas, los campos se pliegan en un resumen
  const [editando, setEditando] = useState(!completo);

  const [sugerencias, setSugerencias] = useState<DatosOFF[]>([]);
  const [buscando, setBuscando] = useState(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consultaActual = useRef('');

  const cancelarBusqueda = () => {
    if (espera.current) clearTimeout(espera.current);
    consultaActual.current = '';
    setSugerencias([]);
    setBuscando(false);
  };

  const alNombre = (t: string) => {
    setNombre(t);
    if (espera.current) clearTimeout(espera.current);
    const consulta = t.trim();
    consultaActual.current = consulta;
    if (categoria !== 'comida' || consulta.length < 4) {
      setSugerencias([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    // Se espera a que deje de escribir para no lanzar una búsqueda por letra
    espera.current = setTimeout(async () => {
      const encontrados = await buscarNombre(consulta);
      if (consultaActual.current !== consulta) return; // respuesta de una búsqueda vieja
      setSugerencias(encontrados.slice(0, 5));
      setBuscando(false);
    }, 600);
  };

  const elegir = (d: DatosOFF) => {
    cancelarBusqueda();
    setNombre([d.nombre, d.marca].filter(Boolean).join(' · '));
    if (d.gramos) setGramos(aCampo(d.gramos));
    setKcal100(aCampo(d.kcal100g));
    setImagen(d.imagen);
    setCodigo(d.codigo);
    setOrigen('Open Food Facts');
    setPorUnidad(false);
    // Si no trae el peso hay que escribirlo: se dejan los campos a la vista
    setEditando(!(d.gramos ?? numero(gramos)));
  };

  const elegirGenerico = (g: Generico) => {
    cancelarBusqueda();
    setKcal100(aCampo(g.kcal100g));
    setOrigen(`valor típico de «${g.nombre.toLowerCase()}», USDA`);
    setPorUnidad(false);
    setEditando(true);
  };

  const alCategoria = (c: Categoria) => {
    setCategoria(c);
    if (c !== 'comida') cancelarBusqueda();
  };

  const gramosN = numero(gramos);
  const kcal100N = numero(kcal100);
  const kcalU = porUnidad ? numero(kcalUnidad) : gramosN > 0 && kcal100N > 0 ? Math.round((gramosN * kcal100N) / 100) : NaN;
  const litrosU = numero(litros);
  const caducidad = componerFecha(fecha);
  const genericos = categoria === 'comida' && !(kcal100N > 0) && !porUnidad ? genericosPara(nombre) : [];

  const errores: string[] = [];
  if (!nombre.trim()) errores.push('Ponle un nombre.');
  if (categoria === 'agua' && !(litrosU > 0)) errores.push('Indica los litros de cada envase.');
  if (categoria !== 'agua' && !(kcalU > 0)) {
    errores.push(porUnidad ? 'Indica las kcal de cada unidad.' : 'Faltan el peso y las kcal por 100 g de la etiqueta.');
  }
  if (caducidad.estado === 'incompleta') errores.push('Completa el mes y el año de la caducidad, o déjala vacía.');
  if (caducidad.estado === 'error') errores.push('Revisa la fecha de caducidad.');
  if (categoria === 'comida' && cocinar && !(numero(aguaCocinar) >= 0)) errores.push('Indica el agua para cocinarlo (0 si no gasta).');

  const guardar = () => {
    const conEnergia = categoria !== 'agua';
    const conFecha = caducidad.estado === 'ok' ? caducidad : null;
    onGuardar({
      id: inicial?.id ?? nuevoId(),
      nombre: nombre.trim(),
      categoria,
      cantidad,
      kcalPorUnidad: conEnergia ? kcalU : undefined,
      gramos: conEnergia && !porUnidad ? gramosN : undefined,
      kcal100g: conEnergia && !porUnidad ? kcal100N : undefined,
      litrosPorUnidad: categoria === 'agua' ? litrosU : undefined,
      caducidad: conFecha?.iso,
      caducidadSinDia: conFecha?.sinDia || undefined,
      necesitaCocinar: categoria === 'comida' && cocinar,
      aguaCocinarPorUnidadL: categoria === 'comida' && cocinar ? numero(aguaCocinar) || 0 : undefined,
      necesitaFrio: categoria === 'comida' && frio,
      imagen,
      codigo,
    });
  };

  const kcalTotal = kcalU > 0 ? kcalU * cantidad : 0;
  const cat = colorCategoria(categoria, C);

  let ayudaFecha = 'Solo cifras: las barras ya están puestas. Si el envase trae mes y año, deja el día vacío.';
  if (caducidad.estado === 'ok') {
    ayudaFecha = `Caduca ${textoFechaLarga(caducidad.iso, caducidad.sinDia)}. ${
      avisos ? 'Te avisaremos 2 meses y 1 semana antes.' : 'Activa los avisos en Ajustes si quieres que te lo recordemos.'
    }`;
  }

  return (
    <View style={{ gap: 14 }}>
      <Tarjeta style={{ gap: 16 }}>
        <Segmentado
          opciones={[
            { valor: 'comida', etiqueta: 'Comida' },
            { valor: 'agua', etiqueta: 'Agua' },
            { valor: 'mascota', etiqueta: 'Mascota' },
          ]}
          valor={categoria}
          onChange={alCategoria}
        />

        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
          <Miniatura uri={imagen} icono={ICONO_CATEGORIA[categoria]} fondo={cat.fondo} color={cat.color} tam={50} />
          <View style={{ flex: 1 }}>
            <Campo
              etiqueta="Nombre"
              valor={nombre}
              onChange={alNombre}
              placeholder={categoria === 'agua' ? 'Garrafa de agua' : categoria === 'mascota' ? 'Pienso de Toby' : 'Garbanzos cocidos'}
            />
          </View>
        </View>

        {(buscando || sugerencias.length > 0 || genericos.length > 0) && (
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Texto tam={12} peso="700" color={C.suave} style={{ flex: 1 }}>
                TOCA UNO Y SE RELLENAN LAS CALORÍAS
              </Texto>
              {buscando && <ActivityIndicator size="small" color={C.suave} />}
            </View>
            {sugerencias.map((d, i) => (
              <Pressable
                key={d.codigo ?? `${d.nombre}-${i}`}
                accessibilityRole="button"
                onPress={() => elegir(d)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 8,
                  borderRadius: 14,
                  backgroundColor: C.segmento,
                  opacity: pressed ? 0.6 : 1,
                })}>
                <Miniatura uri={d.imagen} icono="food-variant" fondo={C.comidaTinte} color={C.comida} tam={40} />
                <View style={{ flex: 1 }}>
                  <Texto tam={14} peso="600" lineas={2}>
                    {[d.nombre, d.marca].filter(Boolean).join(' · ')}
                  </Texto>
                  <Texto tam={12} color={C.suave}>
                    {[d.gramos ? `${formatoNumero(d.gramos)} g` : null, `${formatoNumero(d.kcal100g ?? 0)} kcal/100 g`]
                      .filter(Boolean)
                      .join(' · ')}
                  </Texto>
                </View>
              </Pressable>
            ))}
            {genericos.map((g) => (
              <Pressable
                key={g.fdc}
                accessibilityRole="button"
                onPress={() => elegirGenerico(g)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 8,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.linea,
                  opacity: pressed ? 0.6 : 1,
                })}>
                <Icono name="scale-balance" color={C.suave} />
                <View style={{ flex: 1 }}>
                  <Texto tam={14} peso="600">
                    Valor típico: {g.nombre.toLowerCase()}
                  </Texto>
                  <Texto tam={12} color={C.suave}>
                    {formatoNumero(g.kcal100g)} kcal/100 g · USDA · funciona sin conexión
                  </Texto>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Texto peso="600">Cantidad</Texto>
          <Contador valor={cantidad} onChange={setCantidad} />
        </View>

        {categoria === 'agua' ? (
          <View style={{ gap: 8 }}>
            <Campo etiqueta="Litros por envase" valor={litros} onChange={setLitros} teclado="decimal-pad" placeholder="5" sufijo="L" />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {ENVASES_AGUA.map((l) => (
                <View key={l} style={{ flex: 1 }}>
                  <Boton pequeno variante={litrosU === l ? 'primario' : 'suave'} onPress={() => setLitros(aCampo(l))}>
                    {aCampo(l)} L
                  </Boton>
                </View>
              ))}
            </View>
          </View>
        ) : !editando && kcalU > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: cat.fondo, borderRadius: 14, padding: 12 }}>
            <View style={{ flex: 1 }}>
              <Texto peso="700" color={C.comidaOscuro}>
                ≈ {formatoNumero(kcalU)} kcal por unidad
              </Texto>
              <Texto tam={12} color={C.comidaOscuro}>
                {formatoNumero(gramosN)} g · {formatoNumero(kcal100N)} kcal/100 g{origen ? ` · ${origen}` : ''}
              </Texto>
            </View>
            <Boton pequeno variante="secundario" onPress={() => setEditando(true)}>
              Editar
            </Boton>
          </View>
        ) : porUnidad ? (
          <View style={{ gap: 8 }}>
            <Campo
              etiqueta="kcal por unidad"
              valor={kcalUnidad}
              onChange={setKcalUnidad}
              teclado="decimal-pad"
              sufijo="kcal"
              ayuda="Las de toda la lata, bolsa o paquete."
            />
            <Enlace texto="Mejor con el peso y las kcal por 100 g" onPress={() => setPorUnidad(false)} />
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Campo etiqueta="Peso por unidad" valor={gramos} onChange={setGramos} teclado="decimal-pad" placeholder="400" sufijo="g" />
              </View>
              <View style={{ flex: 1 }}>
                <Campo etiqueta="kcal por 100 g" valor={kcal100} onChange={setKcal100} teclado="decimal-pad" placeholder="120" sufijo="kcal" />
              </View>
            </View>
            {kcalU > 0 ? (
              <Texto tam={13} color={C.suave}>
                <Tramo peso="700" color={C.tinta}>
                  ≈ {formatoNumero(kcalU)} kcal por unidad
                </Tramo>
                {origen ? ` · kcal de ${origen}` : ''}
              </Texto>
            ) : (
              <Texto tam={12} color={C.suave}>
                {kcal100N > 0
                  ? `Ya están las kcal${origen ? ` (${origen})` : ''}. Solo falta el peso de cada unidad.`
                  : categoria === 'comida'
                    ? 'Escribe el nombre y elige una sugerencia para que se rellene solo, o cópialo de la etiqueta.'
                    : 'Vienen en la etiqueta del pienso o de la lata.'}
              </Texto>
            )}
            <Enlace texto="No sé el peso: poner las kcal de la unidad" onPress={() => setPorUnidad(true)} />
          </View>
        )}

        <CampoFecha
          etiqueta="Caducidad"
          valor={fecha}
          onChange={setFecha}
          ayuda={ayudaFecha}
          error={caducidad.estado === 'error' ? caducidad.mensaje : undefined}
        />

        {categoria === 'comida' && (
          <>
            <Interruptor
              etiqueta="Hay que cocinarlo"
              valor={cocinar}
              onChange={setCocinar}
              ayuda="Arroz, pasta, legumbre seca… Sin cocina no cuenta."
            />
            {cocinar && (
              <Campo
                etiqueta="Agua para cocinar una unidad"
                valor={aguaCocinar}
                onChange={setAguaCocinar}
                teclado="decimal-pad"
                placeholder="2,5"
                sufijo="L"
                ayuda="Se descuenta de tu reserva de agua."
              />
            )}
            <Interruptor etiqueta="Necesita nevera" valor={frio} onChange={setFrio} ayuda="Sin luz no cuenta." />
          </>
        )}
      </Tarjeta>

      {categoria === 'comida' && kcalTotal > 0 && diasPorKcal ? (
        <View style={{ backgroundColor: C.comidaTinte, borderRadius: 16, padding: 12 }}>
          <Texto tam={14} color={C.comidaOscuro}>
            <Tramo peso="700">{formatoNumero(kcalTotal)} kcal</Tramo> · suma {formatoNumero(kcalTotal / diasPorKcal, 1)} días de
            comida a la casa
          </Texto>
        </View>
      ) : null}

      {errores.length > 0 && (
        <Texto tam={13} color={C.rojoOscuro}>
          {errores.join(' ')}
        </Texto>
      )}
      <Boton deshabilitado={errores.length > 0} onPress={guardar}>
        {textoGuardar}
      </Boton>
    </View>
  );
}

function Enlace({ texto, onPress }: { texto: string; onPress: () => void }) {
  const C = useC();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: 36, justifyContent: 'center' }}>
      <Texto tam={13} peso="600" color={C.enlace} style={{ textDecorationLine: 'underline' }}>
        {texto}
      </Texto>
    </Pressable>
  );
}
