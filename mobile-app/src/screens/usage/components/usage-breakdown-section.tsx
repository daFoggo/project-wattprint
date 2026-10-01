import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Card } from '@/components/common/card';
import { Fonts, WattPrintTokens } from '@/constants/theme';
import { useUsage, type UsageRange } from '@/features/energy/api';
import { BreakdownTable } from '@/features/energy/components/breakdown-table';
import { DonutBreakdown } from '@/features/energy/components/donut-breakdown';
import type { BubbleDevice, UnitMode } from '@/features/energy/types';
import { DASHBOARD_LABELS, toDevices } from '@/features/energy/usage-view';

interface UsageBreakdownSectionProps {
  range: UsageRange;
  offset: number;
  unit: UnitMode;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onOpenDevice: (device: BubbleDevice) => void;
}

/** Phân bổ thiết bị: donut + bảng. Cùng query với biểu đồ nên không tải thêm lần nào. */
export function UsageBreakdownSection({
  range,
  offset,
  unit,
  selectedIndex,
  onSelectIndex,
  onOpenDevice,
}: UsageBreakdownSectionProps) {
  const { data } = useUsage(range, offset);
  const devices = useMemo(() => toDevices(data.devices), [data]);

  const handleDevicePress = (device: BubbleDevice) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onOpenDevice(device);
  };

  return (
    <Card className="border-0 shadow-none bg-white rounded-[20px] p-5 gap-4" style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.eyebrow}>PHÂN BỔ THIẾT BỊ</Text>
      </View>

      <DonutBreakdown
        devices={devices}
        selectedIndex={selectedIndex}
        onSelectIndex={onSelectIndex}
        unitMode={unit}
        totalKwh={Math.round(data.kwh * 10) / 10}
        totalCost={data.cost_vnd}
        periodLabel={DASHBOARD_LABELS[range].period}
        onDevicePress={handleDevicePress}
      />

      <BreakdownTable
        devices={devices}
        selectedIndex={selectedIndex}
        unitMode={unit}
        onSelect={onSelectIndex}
        onDevicePress={handleDevicePress}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl, // 20px
    paddingVertical: 20,
    paddingHorizontal: 22,
    gap: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
});
