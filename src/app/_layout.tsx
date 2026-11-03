import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider, useStore } from '@/lib/store';
import { FontScaleContext } from '@/components/Text';
import { C, ROLE_SCALE } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

if (Platform.OS !== 'web') {
  // Hiện nhắc lịch cả khi app đang mở.
  import('expo-notifications').then((N) =>
    N.setNotificationHandler({
      handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
    }),
  );
}

function Root() {
  const { ready, me } = useStore();
  // Google Sans Flex đã ghép bộ Latin và Vietnamese từ gói font được cung cấp.
  const [fontsLoaded, fontError] = useFonts({
    'GoogleSansFlex-Regular': require('../../assets/fonts/GoogleSansFlex-Regular.ttf'),
    'GoogleSansFlex-Medium': require('../../assets/fonts/GoogleSansFlex-Medium.ttf'),
    'GoogleSansFlex-Bold': require('../../assets/fonts/GoogleSansFlex-Bold.ttf'),
  });
  const done = ready && (fontsLoaded || !!fontError);
  useEffect(() => {
    if (done) SplashScreen.hideAsync().catch(() => {});
  }, [done]);
  if (!done) return null;
  return (
    <FontScaleContext.Provider value={me ? ROLE_SCALE[me.role] : 1}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
    </FontScaleContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Root />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
