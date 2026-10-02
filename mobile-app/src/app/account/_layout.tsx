import { Stack } from 'expo-router';

import { LazyTab } from '@/components/common/lazy-tab';

import { WattPrintTokens } from '@/constants/theme';

export default function AccountLayout() {
  return (
    <LazyTab>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: WattPrintTokens.colors.neutralGround,
          },
          animation: 'ios_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          freezeOnBlur: true,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="billing" />
      </Stack>
    </LazyTab>
  );
}
