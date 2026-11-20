// Las guías sin conexión (src/constants/guias.ts): van dentro de la app.

import { router } from 'expo-router';

import { FilaEnlace, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { GUIAS } from '@/constants/guias';
import { t } from '@/lib/i18n';
import { useC } from '@/lib/tema';

export default function Guias() {
  const C = useC();
  return (
    <Pantalla>
      <Texto tam={13} color={C.suave}>
        {t('Van dentro de la app: se leen sin conexión. Solo con fuentes oficiales, que salen al final de cada una.')}
      </Texto>
      <Tarjeta style={{ paddingVertical: 6, gap: 0 }}>
        {GUIAS.map((g, i) => (
          <FilaEnlace key={g.id} primera={i === 0} icono={g.icono} titulo={t(g.titulo)} detalle={t(g.resumen)} onPress={() => router.push(`/guias/${g.id}`)} />
        ))}
        <FilaEnlace icono="account-group-outline" titulo={t('Plan familiar')} detalle={t('Dónde os encontráis, a quién llamáis y quién recoge a los niños.')} onPress={() => router.push('/plan')} />
      </Tarjeta>
    </Pantalla>
  );
}
