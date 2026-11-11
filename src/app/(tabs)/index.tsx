import { Link, router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { SelectorModo } from '@/components/selector-modo';
import { Aviso, Barra, Boton, BotonIcono, Icono, IconoCaja, Pantalla, Pastilla, Tarjeta, Texto } from '@/components/ui';
import { diasHasta, estadoCaducidad, formatoNumero } from '@/lib/calculo';
import { textoDia } from '@/lib/fechas';
import { useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { ETIQUETA_MODO, useResultado } from '@/lib/use-resultado';

const NOTA_MODO = {
  normal: 'Raciones completas y agua para beber, cocinar e higiene.',
  ligero: 'Los adultos comen un 15 % menos. Agua para beber más una higiene mínima.',
  severo: 'Los adultos comen un 30 % menos. El agua, solo para beber.',
  extremo: 'Los adultos comen la mitad. El agua, solo para beber: eso nunca se recorta.',
  manual: 'Cada ración la has fijado tú. La app te avisa si alguna queda por debajo de lo que dicen las fuentes.',
} as const;

export default function Inicio() {
  const C = useC();
  const r = useResultado();
  const modo = useAguante((s) => s.modo);
  const objetivo = useAguante((s) => s.objetivoDias);
  const personas = useAguante((s) => s.personas);
  const mascotas = useAguante((s) => s.mascotas);
  const productos = useAguante((s) => s.productos);
  const emergencia = useAguante((s) => s.emergencia);

  const hoy = new Date();
  const urgente = productos
    .filter((p) => p.cantidad > 0 && estadoCaducidad(p, hoy) === 'rojo')
    .sort((a, b) => (a.caducidad ?? '').localeCompare(b.caducidad ?? ''))[0];
  const casa = [
    personas.length ? `${personas.length} ${personas.length === 1 ? 'persona' : 'personas'}` : null,
    mascotas.length ? `${mascotas.length} ${mascotas.length === 1 ? 'mascota' : 'mascotas'}` : null,
  ].filter(Boolean);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + r.dias);
  const cumple = r.dias >= objetivo;

  return (
    <Pantalla>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Texto tam={26} peso="800" style={{ letterSpacing: -0.5 }}>
            Aguante
          </Texto>
          <Texto tam={13} color={C.suave} lineas={1}>
            {casa.length ? casa.join(' · ') : 'Casa sin configurar'}
          </Texto>
        </View>
        <BotonIcono icono="cog-outline" etiqueta="Ajustes" onPress={() => router.push('/ajustes')} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={emergencia ? 'Modo emergencia, activo' : 'Modo emergencia'}
          onPress={() => router.push('/emergencia')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 44,
            paddingHorizontal: 14,
            borderRadius: 22,
            backgroundColor: C.peligro,
            opacity: pressed ? 0.8 : 1,
          })}>
          <Icono name="alarm-light-outline" color={C.blanco} size={18} />
          <Texto tam={14} peso="700" color={C.blanco} lineas={1}>
            {emergencia ? 'Activa' : 'Emergencia'}
          </Texto>
        </Pressable>
      </View>

      {r.sinPersonas ? (
        <View style={{ backgroundColor: C.heroe, borderColor: C.heroeBorde, borderWidth: 1, borderRadius: 24, padding: 20, gap: 12 }}>
          <Texto tam={20} peso="800" color={C.heroeTexto}>
            Primero, quién vive en casa
          </Texto>
          <Texto tam={14} color={C.heroeSuave}>
            Con la edad, el sexo y el peso de cada persona calculamos cuánta comida y agua necesitáis al día.
          </Texto>
          <Link href="/persona/nueva" asChild>
            <Pressable
              accessibilityRole="button"
              style={{ minHeight: 50, borderRadius: 16, backgroundColor: C.blanco, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
              <Texto peso="700" color="#14211B" centro>
                Añadir la primera persona
              </Texto>
            </Pressable>
          </Link>
        </View>
      ) : (
        <View style={{ backgroundColor: C.heroe, borderColor: C.heroeBorde, borderWidth: 1, borderRadius: 24, padding: 20, gap: 12 }}>
          <Texto tam={14} peso="500" color={C.heroeSuave}>
            Con lo que tenéis, aguantáis
          </Texto>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            {/* Con tres cifras («365») la letra encoge en vez de cortarse. El interlineado es el
                natural de la fuente (≈ 1,2 × tamaño): uno menor puede recortar el número por arriba
                en Android; el hueco de más se compensa con el margen negativo. */}
            <Texto
              tam={88}
              peso="800"
              color={C.heroeTexto}
              ajustar
              maxFontSizeMultiplier={1}
              accessibilityLabel={`${r.dias} días`}
              style={{ lineHeight: 106, marginVertical: -8, letterSpacing: -2 }}>
              {r.dias}
            </Texto>
            <Texto tam={28} peso="700" color={C.heroeTexto} maxFontSizeMultiplier={1} style={{ flexShrink: 0 }}>
              {r.dias === 1 ? 'día' : 'días'}
            </Texto>
          </View>
          <Texto tam={14} color={C.heroeSuave}>
            {r.dias > 0 ? `Hasta el ${textoDia(hasta)}` : 'No llegáis a un día completo'}
          </Texto>
          <View style={{ gap: 6 }}>
            <Barra fraccion={r.dias / objetivo} color={cumple ? '#7CC892' : C.blanco} pista={C.heroePista} alto={6} />
            <Texto tam={12} color={C.heroeSuave}>
              {cumple ? `Objetivo de ${objetivo} días cumplido` : `Objetivo: ${objetivo} días`}
            </Texto>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {r.limita !== 'nada' && (
              <Pastilla
                icono={r.limita === 'agua' ? 'water-outline' : 'food-variant'}
                texto={`Os limita ${r.limita === 'agua' ? 'el agua' : 'la comida'}`}
                fondo={r.limita === 'agua' ? C.aguaFuerte : C.comidaFuerte}
                color={r.limita === 'agua' ? C.aguaSobreFuerte : C.comidaSobreFuerte}
              />
            )}
            <Pastilla texto={`Modo ${ETIQUETA_MODO[modo].toLowerCase()}`} fondo={C.heroePista} color={C.heroeTexto} />
          </View>
        </View>
      )}

      <Tarjeta>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Texto peso="700">Modo de aguante</Texto>
          <Pressable accessibilityRole="link" onPress={() => router.push('/modos')} hitSlop={10}>
            <Texto tam={13} peso="600" color={C.enlace} style={{ textDecorationLine: 'underline' }}>
              Qué significa
            </Texto>
          </Pressable>
        </View>
        <SelectorModo />
        <Texto tam={13} color={C.suave}>
          {NOTA_MODO[modo]}
        </Texto>
      </Tarjeta>

      {!r.sinPersonas && (
        <Tarjeta style={{ gap: 16 }}>
          <Recurso
            icono="water-outline"
            nombre="Agua"
            detalle={`${formatoNumero(Math.max(0, r.litrosTotal - r.litrosCocinar), 1)} L útiles · ${formatoNumero(r.litrosDia, 1)} L al día`}
            dias={r.diasAgua}
            objetivo={objetivo}
            color={C.agua}
            tinte={C.aguaTinte}
          />
          <Recurso
            icono="food-variant"
            nombre="Comida"
            detalle={`${formatoNumero(r.kcalTotal)} kcal · ${formatoNumero(r.kcalDia)} kcal al día`}
            dias={r.diasComida}
            objetivo={objetivo}
            color={C.comida}
            tinte={C.comidaTinte}
          />
          <Texto tam={12} color={C.suave}>
            Barras sobre tu objetivo de {objetivo} días
          </Texto>
        </Tarjeta>
      )}

      {r.hayBebe && (
        <Aviso texto="Hay un bebé en casa: su comida no se calcula aquí. Guarda leche de fórmula y lo necesario para prepararla." />
      )}
      {r.caducados.length > 0 && <Aviso texto={`Caducado y fuera de la cuenta: ${r.caducados.join(', ')}.`} />}
      {r.mascotas && r.mascotas.diasComida < r.dias && (
        <Aviso
          tono="ambar"
          texto={`La comida de las mascotas da para ${formatoNumero(r.mascotas.diasComida, 1)} días, menos que la vuestra.`}
        />
      )}
      {urgente && urgente.caducidad && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/producto/${urgente.id}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.rojoTinte, borderRadius: 20, padding: 12 }}>
          <IconoCaja name="alert-outline" fondo={C.peligro} color={C.blanco} />
          <View style={{ flex: 1 }}>
            <Texto peso="700" tam={14} color={C.rojoOscuro}>
              {urgente.nombre} caduca {textoEn(diasHasta(urgente.caducidad, hoy))}
            </Texto>
            <Texto tam={13} color={C.rojoOscuro}>
              Gástalo esta semana y repón la reserva
            </Texto>
          </View>
          <Icono name="chevron-right" color={C.rojoOscuro} />
        </Pressable>
      )}

      <Boton icono="barcode-scan" onPress={() => router.push('/anadir')}>
        Añadir producto
      </Boton>

      <Pressable accessibilityRole="link" onPress={() => router.push('/fuentes')}>
        <Texto tam={12} color={C.suave}>
          Estimación orientativa con fuentes de FAO/OMS, EFSA y FEMA. No sustituye el consejo médico.{' '}
          <Texto tam={12} peso="600" color={C.enlace} style={{ textDecorationLine: 'underline' }}>
            Ver las fuentes
          </Texto>
        </Texto>
      </Pressable>
    </Pantalla>
  );
}

const textoEn = (dias: number) => (dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`);

function Recurso(props: {
  icono: 'water-outline' | 'food-variant';
  nombre: string;
  detalle: string;
  dias: number;
  objetivo: number;
  color: string;
  tinte: string;
}) {
  const C = useC();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconoCaja name={props.icono} fondo={props.tinte} color={props.color} />
        <View style={{ flex: 1 }}>
          <Texto peso="700">{props.nombre}</Texto>
          <Texto tam={13} color={C.suave}>
            {props.detalle}
          </Texto>
        </View>
        <Texto tam={17} peso="800" color={props.color} style={{ flexShrink: 0 }}>
          {formatoNumero(props.dias, 1)} días
        </Texto>
      </View>
      <Barra fraccion={props.dias / props.objetivo} color={props.color} />
    </View>
  );
}
