import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import type { AlertItem } from '@/features/energy/types';

const toneDot: Record<AlertItem['tone'], string> = {
  warning: '#E5A93C',
  info: WattPrintTokens.colors.tertiary, // #B5E930
  good: '#7CC24C',
};

interface EnergyAlertsBlockProps {
  alerts: AlertItem[];
}

export function EnergyAlertsBlock({ alerts }: EnergyAlertsBlockProps) {
  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CẢNH BÁO</Text>
        <Text style={styles.counter}>{alerts.length} mới</Text>
      </View>

      <View style={styles.list}>
        {alerts.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.time}>{item.time}</Text>
            <View style={styles.dotWrap}>
              <View style={[styles.dot, { backgroundColor: toneDot[item.tone] }]} />
            </View>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: WattPrintTokens.colors.primary, // #164437 MSU Green
    borderRadius: WattPrintTokens.radii.xl, // 20px
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
    width: '100%',
    // Scarcity of weight: the one high-contrast block on screen, no borders or shadows
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.tertiary, // #B5E930 Green Lizard
  },
  counter: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.inkInverseMuted, // #BBD2C9
  },
  list: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  time: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.inkInverseMuted, // #BBD2C9
    width: 42,
    paddingTop: 1,
  },
  dotWrap: {
    paddingTop: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 19.6,
    color: WattPrintTokens.colors.neutral, // #FFFFFF
  },
});