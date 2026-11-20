import { Link, router } from 'expo-router';
import { Pressable, Share, View } from 'react-native';

import { AvisoVersionNueva } from '@/components/actualizacion';
import { SelectorModo } from '@/components/selector-modo';
import {
  Aviso,
  Barra,
  Boton,
  BotonIcono,
  FilaEnlace,
  Icono,
  IconoCaja,
  Pantalla,
  Pastilla,
  Tarjeta,
  Texto,
  type NombreIcono,
} from '@/components/ui';
import { Hueco } from '@/components/tutorial';
import { coloresNivel, textoFenomeno, textoNivel } from '@/components/avisos';
import { avisoDestacado, avisosDeProvincia, provinciaPorIne } from '@/lib/avisos';
import { useAvisos } from '@/lib/avisos-estado';
import { formatoNumero, gastarEstaSemana } from '@/lib/calculo';
import { calcularEnergia } from '@/lib/energia';
import { textoDia, textoMomento } from '@/lib/fechas';
import { useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { ETIQUETA_MODO, useResultado } from '@/lib/use-resultado';
import { t, tn, tx } from '@/lib/i18n';

const NOTA_MODO = {
  normal: tx('Raciones completas y agua para beber, cocinar e higiene.'),
  ligero: tx('Los adultos comen un 15 % menos. Agua para beber más una higiene mínima.'),
  severo: tx('Los adultos comen un 30 % menos. El agua, solo para beber.'),
  extremo: tx('Los adultos comen la mitad. El agua, solo para beber: eso nunca se recorta.'),
  manual: tx('Cada ración la has fijado tú. La app te avisa si alguna queda por debajo de lo que dicen las fuentes.'),
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
  const energia = useAguante((s) => s.energia);
  const ineAvisos = useAvisos((s) => s.provincia);
  const meteo = useAvisos((s) => s.meteo);
  const e = calcularEnergia(energia.fuentes, energia.aparatos, energia.zona, energia.epoca);
  const hayEnergia = energia.fuentes.length > 0 || energia.aparatos.length > 0;
  const kcalPerdidas = r.perdidos.reduce((s, p) => s + p.kcal, 0);

  const compartir = () => {
    const lineas = [
      tn(r.dias, 'Con lo que tenemos guardado, nuestra casa aguanta {n} día.', 'Con lo que tenemos guardado, nuestra casa aguanta {n} días.'),
      t('Agua: {a} días · comida: {c} días.', { a: formatoNumero(r.diasAgua, 1), c: formatoNumero(r.diasComida, 1) }),
      t('¿Y la tuya? Lo he calculado con Aguante, con las cifras de FAO, EFSA y FEMA.'),
    ];
    Share.share({ message: lineas.join('\n') }).catch(() => {});
  };

  const hoy = new Date();
  // Avisos de AEMET en la provincia elegida: se destaca uno naranja o rojo de las próximas 48 horas
  const provincia = provinciaPorIne(ineAvisos);
  const avisosAqui = provincia ? avisosDeProvincia(meteo, provincia, hoy.getTime()) : [];
  const destacado = avisoDestacado(avisosAqui, hoy.getTime());
  // «Gasta esto esta semana»: lo que caduca en los próximos 2 meses, repartido por semanas
  const semana = gastarEstaSemana(productos, hoy);
  const casa = [
    personas.length ? tn(personas.length, '{n} persona', '{n} personas') : null,
    mascotas.length ? tn(mascotas.length, '{n} mascota', '{n} mascotas') : null,
  ].filter(Boolean);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + r.dias);
  const cumple = r.dias >= objetivo;

  return (
    <Pantalla>
      <AvisoVersionNueva />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Texto tam={26} peso="800" style={{ letterSpacing: -0.5 }}>
            {t('Aguante')}
          </Texto>
          <Texto tam={13} color={C.suave} lineas={1}>
            {casa.length ? casa.join(' · ') : t('Casa sin configurar')}
          </Texto>
        </View>
        <BotonIcono icono="cog-outline" etiqueta={t('Ajustes')} onPress={() => router.push('/ajustes')} />
        <Hueco id="inicio-emergencia">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={emergencia ? t('Modo emergencia, activo') : t('Modo emergencia')}
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
            {emergencia ? t('Activa') : t('Emergencia')}
          </Texto>
        </Pressable>
        </Hueco>
      </View>

      <Hueco id="inicio-dias">
      {r.sinPersonas ? (
        <View style={{ backgroundColor: C.heroe, borderColor: C.heroeBorde, borderWidth: 1, borderRadius: 24, padding: 20, gap: 12 }}>
          <Texto tam={20} peso="800" color={C.heroeTexto}>
            {t('Primero, quién vive en casa')}
          </Texto>
          <Texto tam={14} color={C.heroeSuave}>
            {t('Con la edad, el sexo y el peso de cada persona calculamos cuánta comida y agua necesitáis al día.')}
          </Texto>
          <Link href="/persona/nueva" asChild>
            <Pressable
              accessibilityRole="button"
              style={{ minHeight: 50, borderRadius: 16, backgroundColor: C.blanco, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
              <Texto peso="700" color="#14211B" centro>
                {t('Añadir la primera persona')}
              </Texto>
            </Pressable>
          </Link>
        </View>
      ) : (
        <View style={{ backgroundColor: C.heroe, borderColor: C.heroeBorde, borderWidth: 1, borderRadius: 24, padding: 20, gap: 12 }}>
          <Texto tam={14} peso="500" color={C.heroeSuave}>
            {t('Con lo que tenéis, aguantáis')}
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
              accessibilityLabel={tn(r.dias, '{n} día', '{n} días')}
              style={{ lineHeight: 106, marginVertical: -8, letterSpacing: -2 }}>
              {r.dias}
            </Texto>
            <Texto tam={28} peso="700" color={C.heroeTexto} maxFontSizeMultiplier={1} style={{ flexShrink: 0 }}>
              {r.dias === 1 ? t('día') : t('días')}
            </Texto>
          </View>
          <Texto tam={14} color={C.heroeSuave}>
            {r.dias > 0 ? t('Hasta el {dia}', { dia: textoDia(hasta) }) : t('No llegáis a un día completo')}
          </Texto>
          <View style={{ gap: 6 }}>
            <Barra fraccion={r.dias / objetivo} color={cumple ? '#7CC892' : C.blanco} pista={C.heroePista} alto={6} />
            <Texto tam={12} color={C.heroeSuave}>
              {cumple ? t('Objetivo de {n} días cumplido', { n: objetivo }) : t('Objetivo: {n} días', { n: objetivo })}
            </Texto>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {r.limita !== 'nada' && (
              <Pastilla
                icono={r.limita === 'agua' ? 'water-outline' : 'food-variant'}
                texto={r.limita === 'agua' ? t('Os limita el agua') : t('Os limita la comida')}
                fondo={r.limita === 'agua' ? C.aguaFuerte : C.comidaFuerte}
                color={r.limita === 'agua' ? C.aguaSobreFuerte : C.comidaSobreFuerte}
              />
            )}
            <Pastilla texto={t('Modo {m}', { m: t(ETIQUETA_MODO[modo]).toLowerCase() })} fondo={C.heroePista} color={C.heroeTexto} />
            <View style={{ flex: 1 }} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Compartir el resultado')}
              onPress={compartir}
              hitSlop={8}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, opacity: pressed ? 0.6 : 1 })}>
              <Icono name="share-variant-outline" color={C.heroeTexto} size={16} />
              <Texto tam={13} peso="600" color={C.heroeTexto}>
                {t('Compartir')}
              </Texto>
            </Pressable>
          </View>
        </View>
      )}
      </Hueco>

      <Tarjeta>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Texto peso="700">{t('Modo de aguante')}</Texto>
          <Pressable accessibilityRole="link" onPress={() => router.push('/modos')} hitSlop={10}>
            <Texto tam={13} peso="600" color={C.enlace} style={{ textDecorationLine: 'underline' }}>
              {t('Qué significa')}
            </Texto>
          </Pressable>
        </View>
        <SelectorModo />
        <Texto tam={13} color={C.suave}>
          {t(NOTA_MODO[modo])}
        </Texto>
      </Tarjeta>

      {!r.sinPersonas && (
        <Tarjeta style={{ gap: 16 }}>
          <Recurso
            icono="water-outline"
            nombre={t('Agua')}
            detalle={
              r.litrosHigieneDia > 0
                ? t('{a} L útiles · {b} L al día ({c} para beber, {d} de higiene)', {
                    a: formatoNumero(Math.max(0, r.litrosTotal - r.litrosCocinar), 1),
                    b: formatoNumero(r.litrosDia, 1),
                    c: formatoNumero(r.litrosBeberDia, 1),
                    d: formatoNumero(r.litrosHigieneDia, 1),
                  })
                : t('{a} L útiles · {b} L al día', { a: formatoNumero(Math.max(0, r.litrosTotal - r.litrosCocinar), 1), b: formatoNumero(r.litrosDia, 1) })
            }
            dias={r.diasAgua}
            objetivo={objetivo}
            color={C.agua}
            tinte={C.aguaTinte}
          />
          <Recurso
            icono="food-variant"
            nombre={t('Comida')}
            detalle={t('{a} kcal · {b} kcal al día', { a: formatoNumero(r.kcalTotal), b: formatoNumero(r.kcalDia) })}
            dias={r.diasComida}
            objetivo={objetivo}
            color={C.comida}
            tinte={C.comidaTinte}
          />
          {hayEnergia && e.whConsumoDia > 0 && (
            <Recurso
              icono="lightning-bolt-outline"
              nombre={t('Energía')}
              detalle={t('{a} Wh guardados · {b} Wh al día', { a: formatoNumero(e.whGuardados), b: formatoNumero(e.whConsumoDia) })}
              dias={e.dias}
              objetivo={objetivo}
              color={C.ambar}
              tinte={C.ambarTinte}
            />
          )}
          <Texto tam={12} color={C.suave}>
            {t('Barras sobre tu objetivo de {n} días', { n: objetivo })}
          </Texto>
        </Tarjeta>
      )}

      {r.hayBebe && (
        <Aviso texto={t('Hay un bebé en casa: su comida no se calcula aquí. Guarda leche de fórmula y lo necesario para prepararla.')} />
      )}
      {r.caducados.length > 0 && <Aviso texto={t('Caducado y fuera de la cuenta: {lista}.', { lista: r.caducados.join(', ') })} />}
      {kcalPerdidas > 0 && (
        <Aviso
          tono="ambar"
          texto={t(
            'No os dará tiempo a comer todo antes de que caduque: {lista} ({kcal} kcal que no cuentan). Gastadlo antes o cambiadlo con un vecino.',
            { lista: r.perdidos.map((p) => p.nombre).join(', '), kcal: formatoNumero(kcalPerdidas) },
          )}
        />
      )}
      {r.mascotas && r.mascotas.diasComida < r.dias && (
        <Aviso
          tono="ambar"
          texto={t('La comida de las mascotas da para {n} días, menos que la vuestra.', { n: formatoNumero(r.mascotas.diasComida, 1) })}
        />
      )}
      {destacado && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/actualidad')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: coloresNivel(destacado.nivel, C).fondo,
            borderRadius: 20,
            padding: 12,
          }}>
          <IconoCaja name="weather-lightning-rainy" fondo={coloresNivel(destacado.nivel, C).color} color={C.blanco} />
          <View style={{ flex: 1 }}>
            <Texto peso="700" tam={14} color={coloresNivel(destacado.nivel, C).color}>
              {t('{nivel} por {fenomeno}: {zona}', { nivel: textoNivel(destacado.nivel), fenomeno: textoFenomeno(destacado.fenomeno).toLowerCase(), zona: destacado.zona })}
            </Texto>
            <Texto tam={13} color={C.texto2}>
              {destacado.inicio <= hoy.getTime()
                ? t('En curso, hasta {fin}. Fuente: AEMET', { fin: textoMomento(destacado.fin) })
                : t('Desde {inicio}. Fuente: AEMET', { inicio: textoMomento(destacado.inicio) })}
            </Texto>
          </View>
          <Icono name="chevron-right" color={C.suave} />
        </Pressable>
      )}
      {semana.length > 0 && (
        <View style={{ backgroundColor: semana[0].dias <= 7 ? C.rojoTinte : C.segmento, borderRadius: 20, padding: 12, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 4 }}>
            <IconoCaja name="calendar-week" fondo={semana[0].dias <= 7 ? C.peligro : C.tinta} color={semana[0].dias <= 7 ? C.blanco : C.fondo} />
            <View style={{ flex: 1 }}>
              <Texto peso="700" tam={15}>
                {t('Esta semana, gasta esto')}
              </Texto>
              <Texto tam={13} color={C.texto2}>
                {t('Caduca pronto: cómelo en el día a día y repón la reserva.')}
              </Texto>
            </View>
          </View>
          {semana.slice(0, 3).map((g) => (
            <Pressable
              key={g.id}
              accessibilityRole="button"
              onPress={() => router.push(`/producto/${g.id}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
              <View style={{ flex: 1 }}>
                <Texto peso="600" tam={14} lineas={2}>
                  {g.estaSemana < g.cantidad ? t('{n} de {total} · {nombre}', { n: g.estaSemana, total: g.cantidad, nombre: g.nombre }) : t('{n} · {nombre}', { n: g.estaSemana, nombre: g.nombre })}
                </Texto>
                <Texto tam={12} color={g.dias <= 7 ? C.rojoOscuro : C.suave}>
                  {t('Caduca {cuando}', { cuando: textoEn(g.dias) })}
                </Texto>
              </View>
              <Icono name="chevron-right" color={C.suave} />
            </Pressable>
          ))}
          {semana.length > 3 && (
            <Pressable accessibilityRole="link" onPress={() => router.push('/despensa')} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Texto tam={13} peso="700" color={C.enlace} style={{ textDecorationLine: 'underline' }}>
                {tn(semana.length - 3, 'Y {n} más en la despensa', 'Y {n} más en la despensa')}
              </Texto>
            </Pressable>
          )}
        </View>
      )}

      <Boton icono="barcode-scan" onPress={() => router.push('/anadir')}>
        {t('Añadir producto')}
      </Boton>

      <Tarjeta style={{ paddingVertical: 6 }}>
        <FilaEnlace
          primera
          icono="alert-circle-outline"
          titulo={t('Avisos oficiales')}
          detalle={
            provincia
              ? avisosAqui.length > 0
                ? tn(avisosAqui.length, '{n} aviso de AEMET en {provincia}', '{n} avisos de AEMET en {provincia}', { provincia: provincia.nombre })
                : t('Sin avisos de AEMET en {provincia}', { provincia: provincia.nombre })
              : t('Tiempo, terremotos y desastres, de fuentes oficiales')
          }
          onPress={() => router.push('/actualidad')}
        />
        <FilaEnlace
          icono="lightning-bolt-outline"
          titulo={t('Energía propia')}
          detalle={
            hayEnergia && e.whConsumoDia > 0
              ? e.dias === Infinity
                ? t('Con sol, el consumo queda cubierto')
                : t('Da para {n} días sin luz', { n: formatoNumero(e.dias, 1) })
              : t('Placas, baterías y lo que gasta la casa')
          }
          onPress={() => router.push('/energia')}
        />
        <FilaEnlace
          icono="account-group-outline"
          titulo={t('Plan familiar')}
          detalle={t('Dónde os encontráis, a quién llamáis y quién recoge a los niños.')}
          onPress={() => router.push('/plan')}
        />
        <FilaEnlace
          icono="book-open-variant"
          titulo={t('Guías sin conexión')}
          detalle={t('Las primeras horas de un apagón y cómo potabilizar agua')}
          onPress={() => router.push('/guias')}
        />
      </Tarjeta>

      <Pressable accessibilityRole="link" onPress={() => router.push('/fuentes')}>
        <Texto tam={12} color={C.suave}>
          {t('Estimación orientativa con fuentes de FAO/OMS, EFSA y FEMA. No sustituye el consejo médico.')}{' '}
          <Texto tam={12} peso="600" color={C.enlace} style={{ textDecorationLine: 'underline' }}>
            {t('Ver las fuentes')}
          </Texto>
        </Texto>
      </Pressable>
    </Pantalla>
  );
}

const textoEn = (dias: number) => (dias === 0 ? t('hoy') : dias === 1 ? t('mañana') : t('en {n} días', { n: dias }));

function Recurso(props: {
  icono: NombreIcono;
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
          {props.dias === Infinity ? t('Con sol, ∞') : t('{n} días', { n: formatoNumero(props.dias, 1) })}
        </Texto>
      </View>
      <Barra fraccion={props.dias === Infinity ? 1 : props.dias / props.objetivo} color={props.color} />
    </View>
  );
}
