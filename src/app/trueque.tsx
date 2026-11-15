// Trueque con vecinos, sin cuentas ni internet: la app calcula lo que os sobra
// y lo que os falta respecto al objetivo, y lo deja listo para mandarlo por
// WhatsApp, Telegram o enseñarlo en pantalla.

import { Share, View } from 'react-native';

import { Aviso, Boton, Campo, Icono, Pantalla, Seccion, Tarjeta, Texto, type NombreIcono } from '@/components/ui';
import { KIT } from '@/constants/kit';
import { calcularExcedente, formatoNumero, limiteDias } from '@/lib/calculo';
import { horasSinLuz, useAguante } from '@/lib/store';
import { useC } from '@/lib/tema';
import { useResultado } from '@/lib/use-resultado';
import { t } from '@/lib/i18n';

// Para pasar kcal a algo que se entienda: unas 2.000 kcal es el día de un adulto
const KCAL_DIA_ADULTO = 2000;

export default function Trueque() {
  const C = useC();
  const r = useResultado();
  const objetivo = useAguante((s) => s.objetivoDias);
  const kit = useAguante((s) => s.kit);
  const kitPropio = useAguante((s) => s.kitPropio);
  const nota = useAguante((s) => s.trueque);
  const setNota = useAguante((s) => s.setTrueque);
  const productos = useAguante((s) => s.productos);
  const escenario = useAguante((s) => s.escenario);
  const emergencia = useAguante((s) => s.emergencia);

  const e = calcularExcedente(r, objetivo);
  const faltaKit = [...KIT, ...kitPropio].filter((k) => !kit[k.id]).map((k) => k.que);
  // Lo que va a caducar antes de que os dé tiempo a comerlo se puede ofrecer,
  // pero no lo que ya se ha estropeado (la nevera tras 4 horas sin luz)
  const pronto = r.perdidos
    .filter((p) => {
      const producto = productos.find((x) => x.id === p.id);
      return producto && limiteDias(producto, escenario, new Date(), horasSinLuz(emergencia, escenario)) > 0;
    })
    .map((p) => p.nombre);

  const ofrezco: string[] = [];
  if (e.litrosSobran >= 1) ofrezco.push(t('{l} L de agua', { l: formatoNumero(e.litrosSobran) }));
  if (e.kcalSobran >= KCAL_DIA_ADULTO / 2)
    ofrezco.push(t('comida para unos {n} días de un adulto', { n: formatoNumero(e.kcalSobran / KCAL_DIA_ADULTO) }));
  if (pronto.length) ofrezco.push(t('{lista} (caduca pronto)', { lista: pronto.join(', ') }));

  const busco: string[] = [];
  if (e.litrosFaltan >= 1) busco.push(t('{l} L de agua', { l: formatoNumero(e.litrosFaltan) }));
  if (e.kcalFaltan >= KCAL_DIA_ADULTO / 2)
    busco.push(t('comida para unos {n} días de un adulto', { n: formatoNumero(e.kcalFaltan / KCAL_DIA_ADULTO) }));
  busco.push(...faltaKit.map((k) => t(k).toLowerCase()));

  const compartir = () => {
    const partes = [t('Hola, vecinos. Para estar preparados, cambio cosas:')];
    if (ofrezco.length) partes.push(t('Ofrezco: {lista}.', { lista: ofrezco.join('; ') }));
    if (busco.length) partes.push(t('Busco: {lista}.', { lista: busco.join('; ') }));
    if (nota.trim()) partes.push(nota.trim());
    Share.share({ message: partes.join('\n') }).catch(() => {});
  };

  return (
    <Pantalla>
      <Texto color={C.suave}>
        {t('Lo que os sobra y os falta para llegar a {n} días con el modo que estáis usando. Compártelo con quien quieras: la app no lo manda a ningún sitio.', { n: objetivo })}
      </Texto>

      <Seccion>{t('Podéis ofrecer')}</Seccion>
      <Tarjeta style={{ gap: 6 }}>
        {ofrezco.length === 0 ? (
          <Texto tam={14} color={C.suave}>
            {t('Nada por encima del objetivo.')}
          </Texto>
        ) : (
          ofrezco.map((o) => <Linea key={o} icono="arrow-up-circle-outline" color={C.verde} texto={o} />)
        )}
      </Tarjeta>

      <Seccion>{t('Os falta')}</Seccion>
      <Tarjeta style={{ gap: 6 }}>
        {busco.length === 0 ? (
          <Texto tam={14} color={C.suave}>
            {t('Nada: llegáis al objetivo y el kit está completo.')}
          </Texto>
        ) : (
          busco.map((b) => <Linea key={b} icono="arrow-down-circle-outline" color={C.rojo} texto={b} />)
        )}
      </Tarjeta>

      <Campo
        etiqueta={t('Algo más que añadir al mensaje')}
        valor={nota}
        onChange={setNota}
        multilinea
        placeholder={t('Tengo pilas AA de sobra. Busco medicación para la tensión.')}
      />

      <Boton icono="share-variant-outline" onPress={compartir}>
        {t('Compartir la lista')}
      </Boton>

      <Aviso
        tono="ambar"
        texto={t('El agua para beber no se cambia si no os sobra: es lo último que hay que soltar. Y medicinas, solo con receta.')}
      />
    </Pantalla>
  );
}

function Linea({ icono, color, texto }: { icono: NombreIcono; color: string; texto: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 }}>
      <Icono name={icono} color={color} size={18} />
      <Texto style={{ flex: 1 }}>{texto}</Texto>
    </View>
  );
}
