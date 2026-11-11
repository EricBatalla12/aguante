// Piezas de interfaz compartidas por todas las pantallas.
//
// Sobre los textos cortados: todo el texto de la app pasa por `Texto`, que
// (1) usa la fuente propia, (2) puede encogerse dentro de una fila en vez de
// salirse por el borde y (3) limita cuánto lo agranda el tamaño de letra del
// sistema, porque con la letra muy grande las filas dejaban de caber.

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRef, useState, type ComponentProps, type ComponentRef, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PartesFecha } from '@/lib/fechas';
import { useC, useLetra, type Peso } from '@/lib/tema';

export type NombreIcono = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Tope de ampliación por el tamaño de letra del sistema
const ESCALA_MAX = 1.3;

export function Icono({ name, size = 20, color }: { name: NombreIcono; size?: number; color?: string }) {
  const C = useC();
  return <MaterialCommunityIcons name={name} size={size} color={color ?? C.tinta} />;
}

/** Pantalla con scroll y márgenes de 16 px. */
export function Pantalla({ children }: { children: ReactNode }) {
  const C = useC();
  const margenes = useSafeAreaInsets();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.fondo }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32 + margenes.bottom,
          gap: 14,
          // En pantallas anchas (web, tableta) el contenido no se estira
          width: '100%',
          maxWidth: 560,
          alignSelf: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

type TextoProps = Omit<TextProps, 'style'> & {
  tam?: number;
  peso?: Peso;
  color?: string;
  centro?: boolean;
  /** Máximo de líneas; lo que no quepa acaba en «…». */
  lineas?: number;
  /** Reduce la letra hasta que quepa en `lineas` (por defecto, una). */
  ajustar?: boolean;
  style?: StyleProp<TextStyle>;
};

export function Texto({ tam = 15, peso = '400', color, centro, lineas, ajustar, style, children, ...resto }: TextoProps) {
  const C = useC();
  const letra = useLetra();
  return (
    <Text
      maxFontSizeMultiplier={ESCALA_MAX}
      numberOfLines={lineas ?? (ajustar ? 1 : undefined)}
      adjustsFontSizeToFit={ajustar}
      minimumFontScale={ajustar ? 0.7 : undefined}
      {...resto}
      style={[
        // flexShrink: en una fila, el texto se parte en líneas en vez de desbordar
        { fontSize: tam, lineHeight: Math.round(tam * 1.35), color: color ?? C.tinta, flexShrink: 1 },
        letra(peso),
        centro && { textAlign: 'center' },
        style,
      ]}>
      {children}
    </Text>
  );
}

/** Trozo de texto con otro peso o color, para usar dentro de un `Texto`. */
export function Tramo({ children, peso, color }: { children: ReactNode; peso?: Peso; color?: string }) {
  const letra = useLetra();
  return <Text style={[peso ? letra(peso) : null, color ? { color } : null]}>{children}</Text>;
}

export function Titulo({ children }: { children: ReactNode }) {
  return (
    <Texto tam={30} peso="800" accessibilityRole="header" style={{ letterSpacing: -0.5 }}>
      {children}
    </Texto>
  );
}

/** Rótulo pequeño en mayúsculas para separar bloques. */
export function Seccion({ children }: { children: string }) {
  const C = useC();
  return (
    <Texto tam={12} peso="700" color={C.suave} style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}>
      {children}
    </Texto>
  );
}

export function Tarjeta({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const C = useC();
  return (
    <View
      style={[
        { backgroundColor: C.tarjeta, borderRadius: 20, borderWidth: 1, borderColor: C.borde, padding: 16, gap: 10 },
        style,
      ]}>
      {children}
    </View>
  );
}

type Variante = 'primario' | 'secundario' | 'peligro' | 'suave';

export function Boton({
  children,
  onPress,
  variante = 'primario',
  icono,
  deshabilitado,
  pequeno,
}: {
  children: ReactNode;
  onPress: () => void;
  variante?: Variante;
  icono?: NombreIcono;
  deshabilitado?: boolean;
  pequeno?: boolean;
}) {
  const C = useC();
  const fondo =
    variante === 'primario' ? C.primario : variante === 'peligro' ? C.peligro : variante === 'suave' ? C.segmento : 'transparent';
  const texto = variante === 'primario' ? C.sobrePrimario : variante === 'peligro' ? C.blanco : C.tinta;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: pequeno ? 44 : 54,
          borderRadius: pequeno ? 14 : 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: pequeno ? 10 : 16,
          // Con paddingVertical, un texto que ocupe dos líneas hace crecer el botón
          paddingVertical: 10,
          backgroundColor: fondo,
          opacity: deshabilitado ? 0.4 : pressed ? 0.8 : 1,
        },
        variante === 'secundario' && { borderWidth: 1.5, borderColor: C.campoBorde },
      ]}>
      {icono && <Icono name={icono} color={texto} size={pequeno ? 18 : 20} />}
      <Texto tam={pequeno ? 14 : 16} peso="700" color={texto} centro>
        {children}
      </Texto>
    </Pressable>
  );
}

/** Botón redondo con solo un icono (ajustes, añadir…). */
export function BotonIcono({
  icono,
  etiqueta,
  onPress,
  lleno,
}: {
  icono: NombreIcono;
  etiqueta: string;
  onPress: () => void;
  lleno?: boolean;
}) {
  const C = useC();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: lleno ? C.primario : C.tarjeta,
        borderWidth: lleno ? 0 : 1,
        borderColor: C.borde,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icono name={icono} color={lleno ? C.sobrePrimario : C.tinta} size={22} />
    </Pressable>
  );
}

/** Control segmentado: Normal / Ligero / Severo / Extremo, 72 h / 1 semana… */
export function Segmentado<T extends string | number>({
  opciones,
  valor,
  onChange,
}: {
  opciones: { valor: T; etiqueta: string }[];
  /** null: ninguna opción elegida */
  valor: T | null;
  onChange: (v: T) => void;
}) {
  const C = useC();
  return (
    <View
      accessibilityRole="radiogroup"
      style={{ flexDirection: 'row', gap: 4, backgroundColor: C.segmento, borderRadius: 14, padding: 4 }}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={String(o.valor)}
            accessibilityRole="radio"
            accessibilityState={{ checked: activo }}
            onPress={() => onChange(o.valor)}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 2,
              backgroundColor: activo ? C.primario : 'transparent',
            }}>
            {/* Una sola línea que encoge la letra si el hueco es estrecho */}
            <Texto tam={14} peso="600" ajustar maxFontSizeMultiplier={1.1} color={activo ? C.sobrePrimario : C.texto2}>
              {o.etiqueta}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Barra({ fraccion, color, pista, alto = 10 }: { fraccion: number; color: string; pista?: string; alto?: number }) {
  const C = useC();
  const pct = Math.max(0, Math.min(1, fraccion)) * 100;
  return (
    <View style={{ height: alto, borderRadius: alto / 2, backgroundColor: pista ?? C.pista, overflow: 'hidden' }}>
      <View style={{ height: alto, borderRadius: alto / 2, backgroundColor: color, width: `${pct}%` }} />
    </View>
  );
}

export function Pastilla({ texto, fondo, color, icono }: { texto: string; fondo: string; color: string; icono?: NombreIcono }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: fondo,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        // Una pastilla no se encoge ni se corta: si falta sitio, que se parta el texto de al lado
        flexShrink: 0,
      }}>
      {icono && <Icono name={icono} color={color} size={13} />}
      <Texto tam={12} peso="700" color={color} style={{ flexShrink: 0 }}>
        {texto}
      </Texto>
    </View>
  );
}

/** Cuadrado de color con un icono, para filas de listas. */
export function IconoCaja({ name, fondo, color, tam = 44 }: { name: NombreIcono; fondo: string; color: string; tam?: number }) {
  return (
    <View style={{ width: tam, height: tam, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: fondo }}>
      <Icono name={name} color={color} size={Math.round(tam * 0.5)} />
    </View>
  );
}

/** Foto del producto o, si no hay (o no carga sin conexión), el icono de su categoría. */
export function Miniatura({
  uri,
  icono,
  fondo,
  color,
  tam = 48,
}: {
  uri?: string;
  icono: NombreIcono;
  fondo: string;
  color: string;
  tam?: number;
}) {
  const [fallo, setFallo] = useState(false);
  if (!uri || fallo) return <IconoCaja name={icono} fondo={fondo} color={color} tam={tam} />;
  return (
    <Image
      source={{ uri }}
      // Las fotos de producto suelen tener fondo blanco: se deja también en oscuro
      style={{ width: tam, height: tam, borderRadius: 12, backgroundColor: '#FFFFFF' }}
      contentFit="contain"
      transition={150}
      cachePolicy="disk"
      onError={() => setFallo(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

export function Campo({
  etiqueta,
  valor,
  onChange,
  teclado = 'default',
  placeholder,
  ayuda,
  sufijo,
  multilinea,
}: {
  etiqueta: string;
  valor: string;
  onChange: (t: string) => void;
  teclado?: 'default' | 'numeric' | 'decimal-pad';
  placeholder?: string;
  ayuda?: string;
  /** Unidad que se pinta dentro del campo, a la derecha: g, kg, L… */
  sufijo?: string;
  multilinea?: boolean;
}) {
  const C = useC();
  const letra = useLetra();
  return (
    <View style={{ gap: 6 }}>
      <Texto tam={14} peso="600" color={C.texto2}>
        {etiqueta}
      </Texto>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 50,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.campoBorde,
          backgroundColor: C.campo,
          paddingHorizontal: 12,
        }}>
        <TextInput
          accessibilityLabel={etiqueta}
          value={valor}
          onChangeText={onChange}
          keyboardType={teclado}
          placeholder={placeholder}
          placeholderTextColor={C.suave}
          maxFontSizeMultiplier={ESCALA_MAX}
          multiline={multilinea}
          style={[
            { flex: 1, minWidth: 0, fontSize: 16, color: C.tinta, paddingVertical: 10 },
            multilinea && { minHeight: 96, textAlignVertical: 'top' },
            letra('500'),
          ]}
        />
        {sufijo ? (
          <Texto tam={14} peso="600" color={C.suave} style={{ paddingLeft: 6 }}>
            {sufijo}
          </Texto>
        ) : null}
      </View>
      {ayuda ? (
        <Texto tam={12} color={C.suave}>
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}

/**
 * Fecha en tres casillas: día (opcional), mes y año. Las barras ya están
 * puestas y el cursor salta solo a la casilla siguiente, así que solo hay que
 * teclear cifras.
 */
export function CampoFecha({
  etiqueta,
  valor,
  onChange,
  ayuda,
  error,
}: {
  etiqueta: string;
  valor: PartesFecha;
  onChange: (p: PartesFecha) => void;
  ayuda?: string;
  error?: string;
}) {
  const C = useC();
  const letra = useLetra();
  const refDia = useRef<ComponentRef<typeof TextInput>>(null);
  const refMes = useRef<ComponentRef<typeof TextInput>>(null);
  const refAnio = useRef<ComponentRef<typeof TextInput>>(null);

  // Cada casilla se queda con sus cifras y pasa las que sobran a la siguiente:
  // así se puede teclear «122028» de un tirón, o pegar una fecha entera.
  const alDia = (t: string) => {
    const c = t.replace(/\D/g, '');
    const dia = c.slice(0, 2);
    onChange({
      dia,
      mes: c.length > 2 ? c.slice(2, 4) : valor.mes,
      anio: c.length > 4 ? c.slice(4, 8) : valor.anio,
    });
    if (c.length > 4) refAnio.current?.focus();
    // Con dos cifras, o con una que ya no admite otra (4–9), se pasa al mes
    else if (c.length >= 2 || Number(dia) > 3) refMes.current?.focus();
  };
  const alMes = (t: string) => {
    const c = t.replace(/\D/g, '');
    const mes = c.slice(0, 2);
    onChange({ ...valor, mes, anio: c.length > 2 ? c.slice(2, 6) : valor.anio });
    if (c.length >= 2 || Number(mes) > 1) refAnio.current?.focus();
  };
  const alAnio = (t: string) => onChange({ ...valor, anio: t.replace(/\D/g, '').slice(0, 4) });

  const casilla = (ancho: number): StyleProp<TextStyle> => [
    { width: ancho, fontSize: 17, color: C.tinta, textAlign: 'center', paddingVertical: 10 },
    letra('600'),
  ];
  const barra = (
    <Texto tam={18} color={C.suave}>
      /
    </Texto>
  );

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <Texto tam={14} peso="600" color={C.texto2}>
          {etiqueta}
        </Texto>
        <Texto tam={12} color={C.suave}>
          El día es opcional
        </Texto>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 4,
          minHeight: 50,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: error ? C.rojo : C.campoBorde,
          backgroundColor: C.campo,
          paddingHorizontal: 10,
        }}>
        <TextInput
          ref={refDia}
          accessibilityLabel={`${etiqueta}: día (opcional)`}
          value={valor.dia}
          onChangeText={alDia}
          keyboardType="number-pad"
          placeholder="DD"
          placeholderTextColor={C.suave}
          maxFontSizeMultiplier={ESCALA_MAX}
          style={casilla(48)}
        />
        {barra}
        <TextInput
          ref={refMes}
          accessibilityLabel={`${etiqueta}: mes`}
          value={valor.mes}
          onChangeText={alMes}
          // Borrar en una casilla vacía vuelve a la anterior
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Backspace' && valor.mes === '') refDia.current?.focus();
          }}
          keyboardType="number-pad"
          placeholder="MM"
          placeholderTextColor={C.suave}
          maxFontSizeMultiplier={ESCALA_MAX}
          style={casilla(48)}
        />
        {barra}
        <TextInput
          ref={refAnio}
          accessibilityLabel={`${etiqueta}: año`}
          value={valor.anio}
          onChangeText={alAnio}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Backspace' && valor.anio === '') refMes.current?.focus();
          }}
          keyboardType="number-pad"
          placeholder="AAAA"
          placeholderTextColor={C.suave}
          maxLength={4}
          maxFontSizeMultiplier={ESCALA_MAX}
          style={casilla(72)}
        />
      </View>
      {error ? (
        <Texto tam={12} peso="600" color={C.rojo}>
          {error}
        </Texto>
      ) : ayuda ? (
        <Texto tam={12} color={C.suave}>
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}

export function Interruptor({
  etiqueta,
  valor,
  onChange,
  ayuda,
}: {
  etiqueta: string;
  valor: boolean;
  onChange: (v: boolean) => void;
  ayuda?: string;
}) {
  const C = useC();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto peso="600">{etiqueta}</Texto>
        {ayuda ? (
          <Texto tam={12} color={C.suave}>
            {ayuda}
          </Texto>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={etiqueta}
        value={valor}
        onValueChange={onChange}
        trackColor={{ true: C.verdeFuerte, false: C.campoBorde }}
        thumbColor={Platform.OS === 'android' ? C.blanco : undefined}
      />
    </View>
  );
}

/** Contador con − y + para cantidades. */
export function Contador({
  valor,
  onChange,
  min = 0,
  paso = 1,
  texto,
  estirar,
}: {
  valor: number;
  onChange: (v: number) => void;
  min?: number;
  paso?: number;
  /** Ocupa todo el ancho, con la cifra en el centro. */
  estirar?: boolean;
  /** Lo que se enseña en el centro; por defecto, el número con coma decimal. */
  texto?: string;
}) {
  const C = useC();
  // Se salta al múltiplo del paso más cercano (de 3,8 se baja a 3,5, no a 3,55)
  // y se redondea para que sumar 0,25 varias veces no deje 0,7500000001
  const mover = (delta: number) =>
    onChange(Math.max(min, Math.round(Math.round((valor + delta) / paso) * paso * 100) / 100));
  const boton = (icono: NombreIcono, etiqueta: string, delta: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={() => mover(delta)}
      style={({ pressed }) => ({
        width: 44,
        height: 40,
        borderRadius: 10,
        backgroundColor: C.tarjeta,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}>
      <Icono name={icono} size={20} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.segmento, borderRadius: 14, padding: 4 }}>
      {boton('minus', 'Quitar', -paso)}
      <Texto tam={16} peso="700" centro lineas={1} style={[{ minWidth: 64, paddingHorizontal: 4 }, estirar && { flex: 1 }]}>
        {texto ?? String(valor).replace('.', ',')}
      </Texto>
      {boton('plus', 'Añadir', paso)}
    </View>
  );
}

export function Aviso({ texto, tono = 'rojo' }: { texto: string; tono?: 'rojo' | 'ambar' | 'verde' }) {
  const C = useC();
  const fondo = tono === 'rojo' ? C.rojoTinte : tono === 'ambar' ? C.ambarTinte : C.verdeTinte;
  const color = tono === 'rojo' ? C.rojoOscuro : tono === 'ambar' ? C.ambar : C.verdeOscuro;
  const icono: NombreIcono = tono === 'verde' ? 'shield-check-outline' : 'alert-outline';
  return (
    <View style={{ flexDirection: 'row', gap: 10, backgroundColor: fondo, borderRadius: 16, padding: 12 }}>
      <Icono name={icono} color={color} size={18} />
      <Texto tam={13} color={color} style={{ flex: 1 }}>
        {texto}
      </Texto>
    </View>
  );
}

/** Fila de menú: icono, título, detalle y flecha. */
export function FilaEnlace({
  icono,
  titulo,
  detalle,
  onPress,
  derecha,
  primera,
}: {
  icono: NombreIcono;
  titulo: string;
  detalle?: string;
  onPress: () => void;
  derecha?: ReactNode;
  /** La primera fila de un grupo no lleva línea encima. */
  primera?: boolean;
}) {
  const C = useC();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 56,
        paddingVertical: 8,
        borderTopWidth: primera ? 0 : 1,
        borderTopColor: C.linea,
        opacity: pressed ? 0.6 : 1,
      })}>
      <IconoCaja name={icono} fondo={C.segmento} color={C.tinta} tam={40} />
      <View style={{ flex: 1, gap: 1 }}>
        <Texto peso="600">{titulo}</Texto>
        {detalle ? (
          <Texto tam={13} color={C.suave}>
            {detalle}
          </Texto>
        ) : null}
      </View>
      {derecha}
      <Icono name="chevron-right" color={C.suave} />
    </Pressable>
  );
}
