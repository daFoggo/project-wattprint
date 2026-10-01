import React, { useDeferredValue, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSafeBack } from '@/hooks/use-safe-back';
import { QueryBoundary } from '@/components/common/query-boundary';
import type { UsageRange } from '@/features/energy/api';
import type { BubbleDevice } from '@/features/energy/types';
import { useEnergyStore } from '@/features/energy/use-energy-store';

import { DeviceDetailBody } from './components/device-detail-body';
import { styles } from './components/device-detail-styles';
import { DeviceSwitcher } from './components/device-switcher';
import { DeviceDetailBodySkeleton } from './components/device-detail-skeletons';

interface DeviceDetailScreenProps {
  device: BubbleDevice;
  /** Kỳ đang xem ở màn gọi tới, để chi tiết thiết bị mở đúng kỳ đó. */
  initialRange?: UsageRange;
  initialOffset?: number;
  onBack?: () => void;
}

/**
 * Vỏ của chi tiết thiết bị (nút quay lại, đơn vị, tên + biểu tượng) hiện ngay từ dữ liệu có sẵn
 * của thiết bị; phần số liệu nằm trong `DeviceDetailBody` với ranh giới Suspense riêng.
 */
export function DeviceDetailScreen({
  device,
  initialRange = 'week',
  initialOffset = 0,
  onBack,
}: DeviceDetailScreenProps) {
  const goBack = useSafeBack('/usage');
  const { setActiveDeviceDetail } = useEnergyStore();
  const [unit, setUnit] = useState<'kwh' | 'cost'>('kwh');
  const [activeTab, setActiveTab] = useState<UsageRange>(initialRange);
  const [offset, setOffset] = useState(initialOffset);
  const [pickedBar, setPickedBar] = useState<number | null>(null);

  // Tab bấm là sáng ngay; dữ liệu đổi sau khi tải xong, trong lúc chờ nội dung cũ mờ đi (Tier 4)
  const deferredTab = useDeferredValue(activeTab);
  const deferredOffset = useDeferredValue(offset);
  const refreshing = deferredTab !== activeTab || deferredOffset !== offset;

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (onBack) {
      onBack();
    } else {
      goBack();
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Bar Actions on Ground: Back on left, Unit Switch on right */}
        <View style={styles.topActionsRow}>
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={({ pressed }) => [
              styles.backBtnWrap,
              pressed && { opacity: 0.6, transform: [{ scale: 0.96 }] },
            ]}>
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backBtn}>QUAY LẠI</Text>
          </Pressable>

          {/* Unit Toggle kWh / VND */}
          <View style={styles.pillTrack}>
            {(['kwh', 'cost'] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setUnit(mode)}
                accessibilityRole="button"
                accessibilityLabel={mode === 'kwh' ? 'Xem theo số điện kWh' : 'Xem theo tiền VND'}
                style={[styles.pillBtn, unit === mode && styles.pillBtnActive]}>
                <Text style={[styles.pillLabel, unit === mode && styles.pillLabelActive]}>
                  {mode === 'kwh' ? 'kWh' : 'VND'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <DeviceSwitcher
          device={device}
          range={deferredTab}
          offset={deferredOffset}
          onSwitch={(next) => {
            setPickedBar(null);
            setActiveDeviceDetail(next);
          }}
        />

        <View style={[{ gap: 12 }, refreshing && { opacity: 0.55 }]}>
          <QueryBoundary
            fallback={<DeviceDetailBodySkeleton />}
            errorMessage="Không tải được chi tiết thiết bị.">
            <DeviceDetailBody
              deviceKey={device.id}
              range={deferredTab}
              offset={deferredOffset}
              activeTab={activeTab}
              unit={unit}
              pickedBar={pickedBar}
              onPickBar={setPickedBar}
              onChangeTab={(key) => {
                setActiveTab(key as UsageRange);
                setOffset(0);
                setPickedBar(null);
              }}
              onChangeOffset={(next) => {
                setOffset(next);
                setPickedBar(null);
              }}
            />
          </QueryBoundary>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
