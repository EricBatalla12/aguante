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

import { DialogoConfirmar } from '@/components/dialogo';
import { CapaTutorial } from '@/components/tutorial';
import { fijarLengua, lenguaDelSistema, t } from '@/lib/i18n';
import { cancelarAvisos, reprogramarAvisos } from '@/lib/notificaciones';
import { arrancarAvisos } from '@/lib/avisos-estado';
import { arrancarSincro } from '@/lib/sincro';
import { useAguante } from '@/lib/store';
import { ProveedorTema, useC, useLetra, useOscuro } from '@/lib/tema';
import { debeSalirSolo, empezarTutorial, useTutorial } from '@/lib/tutorial';

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

  // La casa compartida se sincroniza sola si hay cuenta; sin cuenta no hace nada
  useEffect(() => {
    if (datos) arrancarSincro().catch(() => {});
  }, [datos]);

  // Avisos oficiales: al abrir y al volver a la app, si hay provincia elegida
  useEffect(() => {
    arrancarAvisos();
  }, []);

  const idioma = useAguante((s) => s.idioma);
  const lengua = idioma === 'sistema' ? lenguaDelSistema() : idioma;
  // Se fija antes de pintar nada: t() y los formatos de número y fecha lo leen
  // al momento. Al cambiar de idioma, la `key` vuelve a montar la navegación
  // para que todos los textos se repinten.
  fijarLengua(lengua);

  if (!listo) return null;

  return (
    <ProveedorTema fuentePropia={fuentes}>
      <Navegacion key={lengua} />
      <DialogoConfirmar key={`dialogo-${lengua}`} />
    </ProveedorTema>
  );
}

function Navegacion() {
  const C = useC();
  const oscuro = useOscuro();
  const letra = useLetra();
  const productos = useAguante((s) => s.productos);
  const kitPropio = useAguante((s) => s.kitPropio);
  const avisos = useAguante((s) => s.avisos);

  useEffect(() => {
    (avisos ? reprogramarAvisos(productos, kitPropio) : cancelarAvisos()).catch(() => {});
  }, [avisos, productos, kitPropio]);

  // La primera vez, con la app vacía, sale el tutorial (se puede omitir)
  useEffect(() => {
    if (useTutorial.getState().paso === null && debeSalirSolo(useAguante.getState())) empezarTutorial('/', false);
  }, []);

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
        <Stack.Screen name="anadir" options={{ title: t('Añadir producto'), presentation: 'modal' }} />
        <Stack.Screen name="gastar" options={{ title: t('Gastar producto'), presentation: 'modal' }} />
        <Stack.Screen name="producto/[id]" options={{ title: t('Producto') }} />
        <Stack.Screen name="kit/[id]" options={{ title: t('Kit de emergencia') }} />
        <Stack.Screen name="persona/[id]" options={{ title: t('Persona') }} />
        <Stack.Screen name="mascota/[id]" options={{ title: t('Mascota') }} />
        <Stack.Screen name="modos" options={{ title: t('Modos de aguante') }} />
        <Stack.Screen name="manual" options={{ title: t('Reparto manual') }} />
        <Stack.Screen name="ajustes" options={{ title: t('Ajustes') }} />
        <Stack.Screen name="cuenta" options={{ title: t('Cuenta y casa') }} />
        <Stack.Screen name="fuentes" options={{ title: t('Fuentes y método') }} />
        <Stack.Screen name="energia/index" options={{ title: t('Energía propia') }} />
        <Stack.Screen name="energia/fuente/[id]" options={{ title: t('Fuente de energía') }} />
        <Stack.Screen name="energia/aparato/[id]" options={{ title: t('Aparato') }} />
        <Stack.Screen name="trueque" options={{ title: t('Trueque con vecinos') }} />
        <Stack.Screen name="avisos" options={{ title: t('Avisos oficiales') }} />
        <Stack.Screen name="emergencia" options={{ headerShown: false }} />
      </Stack>
      <CapaTutorial />
    </ThemeProvider>
  );
}
