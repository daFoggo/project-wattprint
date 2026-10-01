import { useLocalSearchParams } from 'expo-router';

import { useEnergyStore } from '@/features/energy/use-energy-store';
import type { UsageRange } from '@/features/energy/api';
import { DeviceDetailSkeleton } from '@/screens/device-detail/components/device-detail-skeletons';
import { DeviceDetailScreen } from '@/screens/device-detail/index';

const RANGES: UsageRange[] = ['day', 'week', 'month'];

/** Thiết bị lấy từ store (đã chọn ở Trang chủ / Tiêu thụ); kỳ và vị trí kỳ đi theo tham số. */
export default function DeviceDetailRoute() {
  const { range, offset } = useLocalSearchParams<{ range?: string; offset?: string }>();
  const { activeDeviceDetail } = useEnergyStore();

  if (!activeDeviceDetail) return null;

  return (
    <DeviceDetailScreen
      device={activeDeviceDetail}
      initialRange={RANGES.includes(range as UsageRange) ? (range as UsageRange) : 'week'}
      initialOffset={Number(offset) || 0}
    />
  );
}

export { ErrorBoundary } from 'expo-router';
export const SuspenseFallback = DeviceDetailSkeleton;
