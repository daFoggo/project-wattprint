import React, { useState } from 'react';
import { useRouter } from 'expo-router';

import { useDashboard } from '@/features/energy/api';
import { BubbleBreakdown } from '@/features/energy/components/bubble-breakdown';
import type { DashboardRange, UnitMode } from '@/features/energy/types';
import { useEnergyStore } from '@/features/energy/use-energy-store';

import { HeroMetric } from './hero-metric';

interface HeroSectionProps {
  /** Kỳ đang hiển thị (đã trễ theo `useDeferredValue` khi vừa đổi tab). */
  range: DashboardRange;
  /** Kỳ người dùng vừa chọn: dùng để mở chi tiết đúng kỳ ở màn sau. */
  pickedRange: DashboardRange;
  unitMode: UnitMode;
  onToggleUnit: () => void;
}

/** Hero + bong bóng thiết bị. Tự tải dữ liệu, suspend về ranh giới Suspense của màn hình. */
export function HeroSection({ range, pickedRange, unitMode, onToggleUnit }: HeroSectionProps) {
  const router = useRouter();
  const { setActiveDeviceDetail, setUsageTab } = useEnergyStore();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data } = useDashboard(range);

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    const selected = data.devices[index];
    if (selected) {
      setActiveDeviceDetail(selected);
      setUsageTab(pickedRange); // Tiêu thụ và chi tiết thiết bị mở đúng kỳ đang xem ở đây
      router.push('/usage/device');
    }
  };

  return (
    <>
      <HeroMetric
        kwh={data.kwh}
        cost={data.costVnd}
        deltaPct={data.deltaPct}
        period={data.period}
        comparison={data.comparison}
        unitMode={unitMode}
        onToggleUnit={onToggleUnit}
      />
      <BubbleBreakdown devices={data.devices} selectedIndex={selectedIndex} onSelectIndex={handleSelect} />
    </>
  );
}
