import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import { useUsage, type UsageRange } from '@/features/energy/api';
import { UsageBarChart } from '@/features/energy/components/usage-bar-chart';
import type { UnitMode } from '@/features/energy/types';
import { kwhText, lastActiveIndex, periodLabel, toChartItems, vnd } from '@/features/energy/usage-view';

interface UsageChartSectionProps {
  range: UsageRange;
  offset: number;
  unit: UnitMode;
  pickedBar: number | null;
  onPickBar: (index: number) => void;
  onChangeOffset: (next: number) => void;
}

/** Thanh chọn kỳ, ước tính cả kỳ và biểu đồ cột xếp chồng theo bậc. */
export function UsageChartSection({
  range,
  offset,
  unit,
  pickedBar,
  onPickBar,
  onChangeOffset,
}: UsageChartSectionProps) {
  const { data } = useUsage(range, offset);

  const chartItems = useMemo(() => toChartItems(data.range, data.buckets), [data]);
  const lastIndex = lastActiveIndex(data.buckets);
  const selectedBar = Math.min(pickedBar ?? lastIndex, Math.max(chartItems.length - 1, 0));

  // "Ước tính cả kỳ" khi kỳ chưa kết thúc, ngược lại là tổng của kỳ
  const estimate = data.forecast ?? { kwh: data.kwh, cost_vnd: data.cost_vnd };
  const heroValue = unit === 'cost' ? vnd(estimate.cost_vnd) : kwhText(estimate.kwh);
  const heroUnit = unit === 'cost' ? 'VND' : 'kWh';
  const deltaPct = data.delta_pct;

  return (
    <>
      {/* Date Range Navigation Context */}
      <View style={styles.dateNavRow}>
        <Pressable
          hitSlop={10}
          onPress={() => onChangeOffset(offset - 1)}
          accessibilityRole="button"
          accessibilityLabel="Kỳ trước"
          style={styles.dateNavBtn}>
          <Text style={styles.dateNavChevron}>‹</Text>
        </Pressable>
        <Text style={styles.dateNavLabel}>{periodLabel(data.range, data.period, data.offset)}</Text>
        <Pressable
          hitSlop={10}
          disabled={offset >= 0}
          onPress={() => onChangeOffset(offset + 1)}
          accessibilityRole="button"
          accessibilityLabel="Kỳ tiếp theo"
          style={[styles.dateNavBtn, offset >= 0 && styles.dateNavBtnDisabled]}>
          <Text style={[styles.dateNavChevron, offset >= 0 && styles.dateNavChevronDisabled]}>›</Text>
        </Pressable>
      </View>

      {/* Subtle Period Summary Banner */}
      <View style={styles.estimationBanner}>
        <Text style={styles.estimationText}>
          {data.forecast ? 'Ước tính cả kỳ: ' : 'Cả kỳ: '}
          <Text style={styles.estimationHighlight}>
            {heroValue} {heroUnit}
          </Text>
          {deltaPct === null
            ? ''
            : ` (${deltaPct <= 0 ? 'giảm' : 'tăng'} ${Math.round(Math.abs(deltaPct))}%)`}
        </Text>
      </View>

      {/* Responsive Bar Chart with Numbers on Each Column */}
      <UsageBarChart
        items={chartItems}
        selectedIndex={selectedBar}
        onSelect={onPickBar}
        height={160}
        unitMode={unit}
        showLegend={true}
      />
    </>
  );
}

const styles = StyleSheet.create({
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 2,
  },
  dateNavBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNavBtnDisabled: {
    opacity: 0.35,
  },
  dateNavChevron: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 18,
    color: WattPrintTokens.colors.primary, // #164437
    lineHeight: 20,
  },
  dateNavChevronDisabled: {
    color: WattPrintTokens.colors.secondary,
  },
  dateNavLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.primary, // #164437
    letterSpacing: -0.2,
  },
  estimationBanner: {
    alignSelf: 'center',
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
    borderRadius: WattPrintTokens.radii.sm,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginVertical: 2,
  },
  estimationText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: WattPrintTokens.colors.secondary, // #4A6B60
    textAlign: 'center',
  },
  estimationHighlight: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.primary, // #164437
    fontWeight: '700',
  },
});
