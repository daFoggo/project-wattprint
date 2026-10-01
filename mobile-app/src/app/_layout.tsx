import { DefaultTheme, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppTabs from '@/components/common/app-tabs';
import { EnergyStoreProvider } from '@/features/energy/use-energy-store';
import { QueryProvider } from '@/providers/query-provider';
import '@/global.css';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'GoogleSansFlex-Regular': require('@/assets/fonts/GoogleSansFlex-Regular.ttf'),
    'GoogleSansFlex-Medium': require('@/assets/fonts/GoogleSansFlex-Medium.ttf'),
    'GoogleSansFlex-SemiBold': require('@/assets/fonts/GoogleSansFlex-SemiBold.ttf'),
    'GeistMono-Regular': require('@/assets/fonts/GeistMono-Regular.ttf'),
    'GeistMono-Medium': require('@/assets/fonts/GeistMono-Medium.ttf'),
    'GeistMono-SemiBold': require('@/assets/fonts/GeistMono-SemiBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={DefaultTheme}>
          <StatusBar style="dark" />
          <QueryProvider>
            <EnergyStoreProvider>
              <AppTabs />
            </EnergyStoreProvider>
          </QueryProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
