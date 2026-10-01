import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { QueryBoundary } from '@/components/common/query-boundary';
import { WattPrintTokens } from '@/constants/theme';
import { useUsage, type UsageRange } from '@/features/energy/api';
import { ApplianceIcon } from '@/features/energy/components/appliance-icon';
import type { BubbleDevice } from '@/features/energy/types';
import { toDevices } from '@/features/energy/usage-view';

import { styles } from './device-detail-styles';

function Identity({ device }: { device: BubbleDevice }) {
  return (
    <View style={styles.identityBlock}>
      <View style={styles.deviceIconBox}>
        <ApplianceIcon name={device.name} id={device.id} size={32} color={WattPrintTokens.colors.primary} />
      </View>
      <Text style={styles.deviceName}>{device.name}</Text>
    </View>
  );
}

function ChevronButton({ direction, label, onPress }: { direction: 'prev' | 'next'; label: string; onPress: () => void }) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.switchBtn, pressed && { opacity: 0.6, transform: [{ scale: 0.94 }] }]}>
      <Icon size={22} color={WattPrintTokens.colors.primary} strokeWidth={2.4} />
    </Pressable>
  );
}

interface DeviceSwitcherProps {
  device: BubbleDevice;
  range: UsageRange;
  offset: number;
  onSwitch: (device: BubbleDevice) => void;
}

/** Thiết bị kế trước/kế sau trong cùng danh sách của trang Tiêu thụ (cùng kỳ), đi vòng tròn. */
function SwitcherRow({ device, range, offset, onSwitch }: DeviceSwitcherProps) {
  const { data } = useUsage(range, offset);
  const devices = useMemo(() => toDevices(data.devices), [data]);
  const index = devices.findIndex((d) => d.id === device.id);

  const go = (step: 1 | -1) => {
    if (devices.length < 2) return;
    try {
      Haptics.selectionAsync();
    } catch {}
    const from = index === -1 ? (step === 1 ? -1 : 0) : index;
    onSwitch(devices[(from + step + devices.length) % devices.length]);
  };

  return (
    <View style={styles.switcherRow}>
      <ChevronButton direction="prev" label="Thiết bị trước" onPress={() => go(-1)} />
      <Identity device={device} />
      <ChevronButton direction="next" label="Thiết bị sau" onPress={() => go(1)} />
    </View>
  );
}

/** Tên + biểu tượng thiết bị với hai nút chevron; hiện ngay, nút chỉ bấm được khi danh sách đã về. */
export function DeviceSwitcher(props: DeviceSwitcherProps) {
  return (
    <QueryBoundary fallback={<Identity device={props.device} />} errorMessage="Không tải được danh sách thiết bị.">
      <SwitcherRow {...props} />
    </QueryBoundary>
  );
}
