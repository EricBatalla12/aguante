import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import { Figtree_800ExtraBold } from '@expo-google-fonts/figtree/800ExtraBold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useSyncExternalStore } from 'react';

import { cancelarAvisos, reprogramarAvisos } from '@/lib/notificaciones';
import { useAguante } from '@/lib/store';
import { ProveedorTema, useC, useLetra, useOscuro } from '@/lib/tema';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Esperamos a leer los datos guardados para no enseñar «0 días» un instante
  const datos = useSyncExternalStore(
    (avisar) => useAguante.persist.onFinishHydration(avisar),
    () => useAguante.persist.hasHydrated(),
  );
  const [fuentes, errorFuentes] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });
  // Si la fuente falla, la app arranca igual con la letra del sistema
  const listo = datos && (fuentes || !!errorFuentes);

  useEffect(() => {
    if (listo) SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  return (
    <ProveedorTema fuentePropia={fuentes}>
      <Navegacion />
    </ProveedorTema>
  );
}

function Navegacion() {
  const C = useC();
  const oscuro = useOscuro();
  const letra = useLetra();
  const productos = useAguante((s) => s.productos);
  const avisos = useAguante((s) => s.avisos);

  useEffect(() => {
    (avisos ? reprogramarAvisos(productos) : cancelarAvisos()).catch(() => {});
  }, [avisos, productos]);

  // Fondo de la ventana: evita un fogonazo blanco al navegar en modo oscuro
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(C.fondo).catch(() => {});
  }, [C.fondo]);

  const base = oscuro ? DarkTheme : DefaultTheme;
  const tema = {
    ...base,
    colors: { ...base.colors, primary: C.tinta, background: C.fondo, card: C.fondo, text: C.tinta, border: C.linea },
  };

  return (
    <ThemeProvider value={tema}>
      <StatusBar style={oscuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.fondo },
          headerTintColor: C.tinta,
          headerTitleStyle: letra('700'),
          headerShadowVisible: false,
          contentStyle: { backgroundColor: C.fondo },
          headerBackButtonDisplayMode: 'minimal',
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="anadir" options={{ title: 'Añadir producto', presentation: 'modal' }} />
        <Stack.Screen name="producto/[id]" options={{ title: 'Producto' }} />
        <Stack.Screen name="persona/[id]" options={{ title: 'Persona' }} />
        <Stack.Screen name="mascota/[id]" options={{ title: 'Mascota' }} />
        <Stack.Screen name="modos" options={{ title: 'Modos de aguante' }} />
        <Stack.Screen name="manual" options={{ title: 'Reparto manual' }} />
        <Stack.Screen name="ajustes" options={{ title: 'Ajustes' }} />
        <Stack.Screen name="fuentes" options={{ title: 'Fuentes y método' }} />
        <Stack.Screen name="emergencia" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
