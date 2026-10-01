import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import type { UnitMode } from '@/features/energy/types';

interface HeroMetricProps {
  kwh: number;
  cost: number;
  deltaPct: number;
  period: string;
  comparison: string;
  unitMode: UnitMode;
  onToggleUnit: () => void;
}

export function HeroMetric({
  kwh,
  cost,
  deltaPct,
  period,
  comparison,
  unitMode,
  onToggleUnit,
}: HeroMetricProps) {
  const isKwh = unitMode === 'kwh';
  const deltaWord = deltaPct < 0 ? `giảm ${Math.abs(deltaPct)}%` : `tăng ${deltaPct}%`;
  const headline = isKwh
    ? `${kwh.toFixed(1)} kWh`
    : `${Math.round(cost).toLocaleString('vi-VN')} VND`;

  const bigValue = isKwh
    ? kwh.toFixed(1)
    : Math.round(cost).toLocaleString('vi-VN');
  const bigUnit = isKwh ? 'kWh' : 'VND';
  const otherUnit = isKwh ? 'VND' : 'kWh';

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onToggleUnit}
        accessibilityRole="button"
        accessibilityLabel={`Đổi đơn vị. Hiện tại là ${bigValue} ${bigUnit}. Nhấn để chuyển sang ${otherUnit}.`}
        style={styles.pressable}>
        <Text style={styles.sentence}>
          Bạn đã dùng <Text style={styles.sentenceHighlight}>{headline}</Text> {period}, {deltaWord} so với {comparison}.
        </Text>

        <View style={styles.metricRow}>
          <View style={styles.valueGroup}>
            <Text style={styles.bigValue}>{bigValue}</Text>
            <Text style={styles.bigUnit}>{bigUnit}</Text>
          </View>

          {/* Interactive Unit Switcher Chip */}
          <View style={styles.switchChip}>
            <Text style={styles.switchSymbol}>⇄</Text>
            <Text style={styles.switchLabel}>{otherUnit}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  pressable: {
    gap: 8,
  },
  sentence: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 21.75, // 1.45
    color: WattPrintTokens.colors.inkBody, // #3D5F54
    maxWidth: 320,
  },
  sentenceHighlight: {
    fontFamily: Fonts.sansSemiBold,
    color: WattPrintTokens.colors.primary, // #164437
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  valueGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  bigValue: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: -1.68, // -0.03em
    color: WattPrintTokens.colors.primary, // #164437
  },
  bigUnit: {
    fontFamily: Fonts.monoMedium,
    fontSize: 17,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  switchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  switchSymbol: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: WattPrintTokens.colors.primary, // #164437
  },
  switchLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    letterSpacing: 0.52, // 0.04em
    color: WattPrintTokens.colors.onPrimaryContainer, // #2C5145
  },
});
