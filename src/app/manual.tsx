// Reparto manual: el usuario fija las kcal y los litros de cada persona y
// mascota. La app no corrige nada, pero avisa cuando una ración queda por
// debajo de lo que dicen las fuentes.

import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Aviso, Boton, Contador, Icono, Interruptor, Pantalla, Seccion, Segmentado, Tarjeta, Texto } from '@/components/ui';
import {
  aguaBeber,
  aguaMascota,
  aguaPersona,
  esProtegida,
  formatoNumero,
  kcalBase,
  kcalMascota,
  type Mascota,
  type Persona,
} from '@/lib/calculo';
import { textoCantidad } from '@/lib/formato';
import { useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { ETIQUETA_MODO, MODOS_AUTO, useEscenario, useResultado } from '@/lib/use-resultado';
import { t } from '@/lib/i18n';

export default function RepartoManual() {
  const C = useC();
  const personas = useAguante((s) => s.personas);
  const mascotas = useAguante((s) => s.mascotas);
  const modo = useAguante((s) => s.modo);
  const setModo = useAguante((s) => s.setModo);
  const copiarManualDe = useAguante((s) => s.copiarManualDe);
  const conManual = useResultado('manual');
  const normal = useResultado('normal');
  const activo = modo === 'manual';

  if (personas.length + mascotas.length === 0) {
    return (
      <Pantalla>
        <Texto color={C.suave}>{t('Añade primero quién vive en casa, en la pestaña Hogar, para poder repartir.')}</Texto>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Texto color={C.texto2}>
        {t('Fija tú cuánto come y bebe cada uno al día. Sirve para adaptar el plan a vuestra casa: quien trabaja más, quien está enfermo, la comida que queda…')}
      </Texto>

      <Tarjeta style={{ gap: 12 }}>
        <Interruptor
          etiqueta={t('Usar el reparto manual')}
          valor={activo}
          onChange={(v) => setModo(v ? 'manual' : 'normal')}
          ayuda={t('Sustituye a los modos Normal, Ligero, Severo y Extremo.')}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Dato valor={String(conManual.dias)} etiqueta={conManual.dias === 1 ? t('día con este reparto') : t('días con este reparto')} destacado />
          <Dato valor={String(normal.dias)} etiqueta={t('en modo normal')} />
        </View>
        <Texto tam={13} color={C.suave}>
          {t('Al día: {kcal} kcal y {l} L entre todos.', { kcal: formatoNumero(conManual.kcalDia), l: formatoNumero(conManual.litrosDia, 1) })}
          {conManual.limita === 'agua' ? t(' Os limita el agua.') : conManual.limita === 'comida' ? t(' Os limita la comida.') : ''}
        </Texto>
      </Tarjeta>

      <View style={{ gap: 8 }}>
        <Seccion>{t('Partir de un modo')}</Seccion>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {MODOS_AUTO.map((m) => (
            <View key={m} style={{ flex: 1 }}>
              <Boton pequeno variante="suave" onPress={() => copiarManualDe(m)}>
                {t(ETIQUETA_MODO[m])}
              </Boton>
            </View>
          ))}
        </View>
        <Texto tam={12} color={C.suave}>
          {t('Copia las raciones de ese modo a todas las personas para que las retoques desde ahí.')}
        </Texto>
      </View>

      {personas.map((p) => (
        <RacionPersona key={p.id} p={p} />
      ))}
      {mascotas.map((m) => (
        <RacionMascota key={m.id} m={m} />
      ))}

      <Aviso
        tono="verde"
        texto={t('Las fuentes dicen que el agua de beber no se raciona y que a menores, embarazadas y mujeres en lactancia no se les recorta la comida. Aquí decides tú, y la app te avisa cuando una ración queda por debajo.')}
      />
    </Pantalla>
  );
}

function Dato({ valor, etiqueta, destacado }: { valor: string; etiqueta: string; destacado?: boolean }) {
  const C = useC();
  return (
    <View style={{ flex: 1, backgroundColor: destacado ? C.heroe : C.segmento, borderRadius: 14, padding: 12 }}>
      <Texto tam={26} peso="800" color={destacado ? C.heroeTexto : C.tinta} style={{ lineHeight: 32 }}>
        {valor}
      </Texto>
      <Texto tam={12} color={destacado ? C.heroeSuave : C.suave}>
        {etiqueta}
      </Texto>
    </View>
  );
}

function RacionPersona({ p }: { p: Persona }) {
  const C = useC();
  const racion = useAguante((s) => s.manual[p.id]);
  const setRacion = useAguante((s) => s.setRacion);
  const escenario = useEscenario();

  const bebe = p.edadAnios < 1;
  const necesita = kcalBase(p, escenario);
  const beber = aguaBeber(p, escenario);
  const kcal = racion?.kcal ?? Math.round(necesita / 10) * 10;
  const litros = racion?.litros ?? Math.round(aguaPersona(p, 'normal', escenario) * 100) / 100;
  // «Una comida» es un tercio de lo que necesita al día
  const comida = (n: number) => Math.round((necesita * n) / 3 / 10) * 10;

  return (
    <Tarjeta style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Texto tam={18} peso="800">
          {p.nombre}
        </Texto>
        <Texto tam={13} color={C.suave}>
          {bebe
            ? t('Bebé: leche materna o de fórmula. Para beber, {l} L al día.', { l: formatoNumero(beber, 1) })
            : t('Necesita {kcal} kcal y, para beber, {l} L al día.', { kcal: formatoNumero(necesita), l: formatoNumero(beber, 1) })}
        </Texto>
      </View>

      {!bebe && (
        <View style={{ gap: 8 }}>
          <Fila icono="food-variant" color={C.comida} titulo={t('Comida')} detalle={t('{p} % de lo que necesita', { p: Math.round((kcal / necesita) * 100) })}>
            <Contador valor={kcal} onChange={(v) => setRacion(p.id, { kcal: v })} paso={50} estirar texto={`${formatoNumero(kcal)} kcal`} />
          </Fila>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Texto tam={13} color={C.suave} style={{ flexShrink: 0 }}>
              {t('Comidas al día')}
            </Texto>
            <View style={{ flex: 1 }}>
              <Segmentado
                opciones={[3, 2, 1].map((n) => ({ valor: n, etiqueta: String(n) }))}
                valor={[3, 2, 1].find((n) => comida(n) === kcal) ?? null}
                onChange={(n) => setRacion(p.id, { kcal: comida(n) })}
              />
            </View>
          </View>
        </View>
      )}

      <Fila icono="water-outline" color={C.agua} titulo={t('Agua')} detalle={litros >= beber ? t('Cubre lo que necesita beber') : t('Menos de lo que necesita beber')}>
        <Contador valor={litros} onChange={(v) => setRacion(p.id, { litros: v })} paso={0.25} estirar texto={`${textoCantidad(litros)} L`} />
      </Fila>

      {litros < beber - 0.001 && (
        <Aviso
          texto={t('Bebe menos de los {l} L que necesita. Las fuentes dicen que el agua de beber no se raciona: si falta, hay que buscar más.', { l: formatoNumero(beber, 1) })}
        />
      )}
      {!bebe && esProtegida(p) && kcal < necesita - 10 && (
        <Aviso
          tono="ambar"
          texto={t('Es menor, está embarazada o en lactancia, o la marcaste como «no racionar». Las fuentes dicen que no se le recorte la comida.')}
        />
      )}
      {!bebe && !esProtegida(p) && kcal < necesita * 0.5 - 10 && (
        <Aviso
          tono="ambar"
          texto={t('Menos de la mitad de lo que necesita. La mitad es el límite del que habla FEMA para un adulto sano, y solo por un tiempo.')}
        />
      )}
    </Tarjeta>
  );
}

function RacionMascota({ m }: { m: Mascota }) {
  const C = useC();
  const racion = useAguante((s) => s.manual[m.id]);
  const setRacion = useAguante((s) => s.setRacion);
  const necesita = kcalMascota(m);
  const beber = aguaMascota(m);
  const kcal = racion?.kcal ?? Math.round(necesita / 5) * 5;
  const litros = racion?.litros ?? Math.round(beber * 100) / 100;
  // El paso se adapta al tamaño: un gato come diez veces menos que un perro grande
  const pasoAgua = beber < 0.5 ? 0.05 : 0.25;

  return (
    <Tarjeta style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icono name="paw" color={C.suave} size={18} />
          <Texto tam={18} peso="800">
            {m.nombre}
          </Texto>
        </View>
        <Texto tam={13} color={C.suave}>
          {t('Necesita {kcal} kcal de su comida y {l} L de agua al día.', { kcal: formatoNumero(necesita), l: formatoNumero(beber, 2) })}
        </Texto>
      </View>
      <Fila icono="food-variant" color={C.comida} titulo={t('Comida')} detalle={t('{p} % de su ración', { p: Math.round((kcal / necesita) * 100) })}>
        <Contador valor={kcal} onChange={(v) => setRacion(m.id, { kcal: v })} paso={25} estirar texto={`${formatoNumero(kcal)} kcal`} />
      </Fila>
      <Fila icono="water-outline" color={C.agua} titulo={t('Agua')} detalle={litros >= beber - 0.005 ? t('Cubre lo que necesita') : t('Menos de lo que necesita')}>
        <Contador valor={litros} onChange={(v) => setRacion(m.id, { litros: v })} paso={pasoAgua} estirar texto={`${textoCantidad(litros)} L`} />
      </Fila>
      {(kcal < necesita * 0.9 || litros < beber - 0.005) && (
        <Aviso tono="ambar" texto={t('Queda por debajo de su ración de mantenimiento. Las mascotas no se racionan en los modos calculados.')} />
      )}
    </Tarjeta>
  );
}

function Fila({
  icono,
  color,
  titulo,
  detalle,
  children,
}: {
  icono: 'food-variant' | 'water-outline';
  color: string;
  titulo: string;
  detalle: string;
  children: ReactNode;
}) {
  const C = useC();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icono name={icono} color={color} />
        <Texto peso="700" style={{ flexShrink: 0 }}>
          {titulo}
        </Texto>
        <Texto tam={12} color={C.suave} style={{ flex: 1, textAlign: 'right' }}>
          {detalle}
        </Texto>
      </View>
      {children}
    </View>
  );
}
