import { Stack } from 'expo-router';

import { LazyTab } from '@/components/common/lazy-tab';

import { WattPrintTokens } from '@/constants/theme';

// Mở thẳng vào /copilot/[id] (từ thẻ Tiêu thụ) vẫn có danh sách bên dưới để quay lại.
export const unstable_settings = { initialRouteName: 'index' };

/**
 * Stack native của tab Trợ lý AI: mở cuộc hội thoại bằng animation native, vuốt từ mép trái để
 * quay lại danh sách, danh sách bị che thì đóng băng.
 */
export default function CopilotLayout() {
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
        <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: '#FFFFFF' } }} />
        <Stack.Screen name="[id]" options={{ contentStyle: { backgroundColor: '#FFFFFF' } }} />
      </Stack>
    </LazyTab>
  );
}
