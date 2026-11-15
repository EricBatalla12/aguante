import JSTabs from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icono, type NombreIcono } from '@/components/ui';
import { useC, useLetra } from '@/lib/tema';
import { t, tx } from '@/lib/i18n';

const PESTANAS: { ruta: string; titulo: string; icono: NombreIcono; activo: NombreIcono }[] = [
  { ruta: 'index', titulo: tx('Inicio'), icono: 'home-variant-outline', activo: 'home-variant' },
  { ruta: 'despensa', titulo: tx('Despensa'), icono: 'package-variant', activo: 'package-variant-closed' },
  { ruta: 'hogar', titulo: tx('Hogar'), icono: 'account-group-outline', activo: 'account-group' },
  { ruta: 'preparacion', titulo: tx('Preparación'), icono: 'clipboard-check-outline', activo: 'clipboard-check' },
];

export default function TabsLayout() {
  const C = useC();
  const letra = useLetra();
  const margenes = useSafeAreaInsets();
  return (
    <JSTabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.tinta,
        tabBarInactiveTintColor: C.suave,
        // Altura fija y rótulos que no crecen con la letra del sistema: si no,
        // con la letra grande el rótulo se queda cortado por abajo
        tabBarStyle: {
          backgroundColor: C.tarjeta,
          borderTopColor: C.linea,
          height: 62 + margenes.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, ...letra('600') },
        tabBarAllowFontScaling: false,
        sceneStyle: { backgroundColor: C.fondo },
      }}>
      {PESTANAS.map((p) => (
        <JSTabs.Screen
          key={p.ruta}
          name={p.ruta}
          options={{
            title: t(p.titulo),
            tabBarIcon: ({ color, focused }) => (
              <Icono name={focused ? p.activo : p.icono} color={String(color)} size={24} />
            ),
          }}
        />
      ))}
    </JSTabs>
  );
}
