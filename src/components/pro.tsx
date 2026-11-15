// Piezas del plan Pro: la tarjeta que sale en una función de pago sin Pro, la
// etiqueta «Pro» de los enlaces y el estado del plan en la pantalla de cuenta.
//
// De momento el Pro se da a mano desde Supabase (tabla `planes`, ver
// docs/cuentas.md): aquí no se cobra nada.

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Boton, Icono, Pastilla, Tarjeta, Texto } from '@/components/ui';
import { textoFecha } from '@/lib/fechas';
import { t } from '@/lib/i18n';
import { comprobarPlan, planActivo, useSincro } from '@/lib/sincro';
import { hoyISO } from '@/lib/store';
import { useC } from '@/lib/tema';

export function PastillaPro() {
  const C = useC();
  return <Pastilla texto="Pro" fondo={C.ambarTinte} color={C.ambar} icono="crown-outline" />;
}

/** Lo que se ve en una función de pago cuando no se tiene Pro. */
export function SinPro({ funcion, explicacion }: { funcion: string; explicacion: string }) {
  const C = useC();
  const usuario = useSincro((s) => s.usuario);
  const [comprobando, setComprobando] = useState(false);
  return (
    <Tarjeta style={{ gap: 12, alignItems: 'stretch' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icono name="crown-outline" color={C.ambar} size={26} />
        <Texto tam={18} peso="700" style={{ flex: 1 }}>
          {t('{funcion} es parte de Aguante Pro', { funcion })}
        </Texto>
      </View>
      <Texto color={C.suave}>{explicacion}</Texto>
      <Texto tam={13} color={C.suave}>
        {t('Pro va con la cuenta, y si alguien de tu casa lo tiene, lo tenéis todos. De momento se activa a mano: pídeselo a quien gestiona Aguante.')}
      </Texto>
      {!usuario ? (
        <Boton icono="login" onPress={() => router.push('/cuenta')}>
          {t('Entrar con tu cuenta')}
        </Boton>
      ) : (
        <Boton
          variante="secundario"
          icono="refresh"
          deshabilitado={comprobando}
          onPress={async () => {
            setComprobando(true);
            await comprobarPlan();
            setComprobando(false);
          }}>
          {comprobando ? t('Comprobando…') : t('Ya me lo han dado: comprobar')}
        </Boton>
      )}
    </Tarjeta>
  );
}

/** El plan de la cuenta, en la pantalla de cuenta. */
export function EstadoPlan() {
  const C = useC();
  const plan = useSincro((s) => s.plan);
  const activo = planActivo(plan, hoyISO());
  const detalle = !activo
    ? t('Plan gratuito. El trueque con vecinos es de Pro.')
    : [
        plan?.hasta ? t('Hasta el {fecha}', { fecha: textoFecha(plan.hasta) }) : t('Sin caducidad'),
        plan?.deCasa ? t('lo tiene alguien de tu casa') : null,
      ]
        .filter(Boolean)
        .join(' · ');
  return (
    <Tarjeta>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icono name={activo ? 'crown' : 'crown-outline'} color={activo ? C.ambar : C.suave} />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto peso="600">{activo ? t('Plan Pro') : t('Plan gratuito')}</Texto>
          <Texto tam={13} color={C.suave}>
            {detalle}
          </Texto>
        </View>
      </View>
    </Tarjeta>
  );
}
