import { useRouter } from 'expo-router';
import { useEnergyStore } from '@/features/energy/use-energy-store';
import { DeviceDetailScreen } from '@/screens/device-detail/index';

export default function DeviceDetailRoute() {
  const router = useRouter();
  const { activeDeviceDetail, setActiveDeviceDetail } = useEnergyStore();

  return (
    <DeviceDetailScreen
      device={activeDeviceDetail}
      onBack={() => {
        setActiveDeviceDetail(null);
        router.back();
      }}
    />
  );
}
