import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import type { DashboardRange } from '@/features/energy/types';

interface RangePillSelectorProps {
  selectedRange: DashboardRange;
  onSelectRange: (range: DashboardRange) => void;
}

const RANGES: { key: DashboardRange; label: string }[] = [
  { key: 'day', label: 'Ngày' },
  { key: 'week', label: 'Tuần' },
  { key: 'month', label: 'Tháng' },
];

export function RangePillSelector({
  selectedRange,
  onSelectRange,
}: RangePillSelectorProps) {
  return (
    <View style={styles.track}>
      {RANGES.map((r) => {
        const active = selectedRange === r.key;
        return (
          <Pressable
            key={r.key}
            onPress={() => onSelectRange(r.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.pill,
              active && styles.pillActive,
            ]}>
            <Text
              style={[
                styles.label,
                active ? styles.labelActive : styles.labelInactive,
              ]}>
              {r.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: WattPrintTokens.colors.neutralGround, // #F2F4ED
    borderRadius: WattPrintTokens.radii.pill,
    padding: 4,
    gap: 4,
    width: '100%',
  },
  pill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: WattPrintTokens.radii.pill,
    backgroundColor: 'transparent',
  },
  pillActive: {
    backgroundColor: WattPrintTokens.colors.primary, // #164437 MSU Green
  },
  label: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
  },
  labelActive: {
    color: WattPrintTokens.colors.tertiary, // #B5E930 Green Lizard
  },
  labelInactive: {
    color: WattPrintTokens.colors.secondary, // #4A6B60 Muted Slate Green
  },
});
