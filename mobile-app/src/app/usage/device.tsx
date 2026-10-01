import { useEnergyStore } from '@/features/energy/use-energy-store';
import { DeviceDetailSkeleton } from '@/screens/device-detail/components/device-detail-skeletons';
import { DeviceDetailScreen } from '@/screens/device-detail/index';

/** Thiết bị lấy từ store (đã chọn ở Trang chủ / Tiêu thụ). Chi tiết luôn mở ở tháng hiện tại. */
export default function DeviceDetailRoute() {
  const { activeDeviceDetail } = useEnergyStore();

  if (!activeDeviceDetail) return null;

  return <DeviceDetailScreen device={activeDeviceDetail} initialRange="month" initialOffset={0} />;
}

export { ErrorBoundary } from 'expo-router';
export const SuspenseFallback = DeviceDetailSkeleton;
