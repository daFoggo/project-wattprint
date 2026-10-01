import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { DataRamp, Fonts, WattPrintTokens } from '@/constants/theme';
import type { BubbleDevice, UnitMode } from '@/features/energy/types';
import { ApplianceIcon } from './appliance-icon';

interface BreakdownTableProps {
  devices: BubbleDevice[];
  selectedIndex: number;
  unitMode: UnitMode;
  onSelect: (index: number) => void;
  onDevicePress?: (device: BubbleDevice) => void;
}

export function BreakdownTable({
  devices,
  selectedIndex,
  unitMode,
  onSelect,
  onDevicePress,
}: BreakdownTableProps) {
  return (
    <View style={styles.table}>
      {devices.map((device, index) => {
        const isSelected = selectedIndex === index;
        const color = DataRamp[index % DataRamp.length].bg;
        const displayValue =
          unitMode === 'cost'
            ? `${Math.round(device.cost).toLocaleString('vi-VN')} đ`
            : `${device.kwh.toFixed(1)} kWh`;

        return (
          <Pressable
            key={device.id}
            onPress={() => {
              try {
                Haptics.selectionAsync();
              } catch {}
              onSelect(index);
              onDevicePress?.(device);
            }}
            style={({ pressed }) => [
              styles.row,
              isSelected && styles.rowSelected,
              pressed && styles.rowPressed,
            ]}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: isSelected
                    ? WattPrintTokens.colors.primary
                    : `${color}25`,
                },
              ]}>
              <ApplianceIcon
                name={device.name}
                id={device.id}
                size={16}
                color={isSelected ? '#FFFFFF' : color}
              />
            </View>
            <Text style={styles.name}>{device.name}</Text>
            <Text style={styles.value}>{displayValue}</Text>
            <Text style={styles.pct}>{device.pct}%</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    width: '100%',
    gap: 2,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: WattPrintTokens.radii.md, // 14px
    backgroundColor: 'transparent',
  },
  rowSelected: {
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6 (once per depth inside white card)
  },
  rowPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.985 }],
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: WattPrintTokens.radii.sm, // 10px
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.primary, // #164437
  },
  value: {
    fontFamily: Fonts.monoMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.primary, // #164437
  },
  pct: {
    fontFamily: Fonts.monoMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.secondary, // #4A6B60
    width: 40,
    textAlign: 'right',
  },
});
