import { Stack } from 'expo-router';

import { LazyTab } from '@/components/common/lazy-tab';

import { WattPrintTokens } from '@/constants/theme';

// Mở thẳng vào /usage/device (từ Trang chủ) vẫn có màn Tiêu thụ bên dưới để quay lại.
export const unstable_settings = { initialRouteName: 'index' };

/**
 * Stack native của tab Tiêu thụ: chi tiết thiết bị đẩy vào bằng animation native (chạy trên UI
 * thread, không phụ thuộc JS đang bận render), vuốt từ mép trái để quay lại, màn bên dưới đóng
 * băng khi bị che nên không tốn render.
 */
export default function UsageLayout() {
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
        <Stack.Screen name="device" />
      </Stack>
    </LazyTab>
  );
}
