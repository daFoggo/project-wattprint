import { Stack } from 'expo-router';

export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F2F4ED' },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="billing" />
    </Stack>
  );
}