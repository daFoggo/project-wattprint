import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Frown, Meh, Smile } from 'lucide-react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import { formatKwh, formatVnd } from '@/features/energy/experiment-utils';
import type { EmotionType, ExperimentLogItem } from '@/features/energy/types';

export const EMOTION_LABEL: Record<EmotionType, string> = {
  comfortable: 'Thoải mái',
  neutral: 'Bình thường',
  uncomfortable: 'Bất tiện',
};

/** Một dòng trong danh sách thử nghiệm đã hoàn tất. */
export function ExperimentLogRow({ item, bordered }: { item: ExperimentLogItem; bordered: boolean }) {
  return (
    <View style={[styles.row, bordered && styles.rowBorder]}>
      <View style={styles.main}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.devices}>{item.devices.join(' · ')}</Text>
        <Text style={styles.meta}>
          {item.dateRange} · {item.days} ngày
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={item.savedVnd > 0 ? styles.saved : styles.savedZero}>
          {item.savedVnd > 0 ? '+' : ''}
          {formatVnd(item.savedVnd)}
        </Text>
        <Text style={styles.kwh}>{formatKwh(item.savedKwh)} kWh</Text>
        <View style={styles.emotionPill}>
          {item.emotion === 'comfortable' ? (
            <Smile size={12} color={WattPrintTokens.colors.accentDeep} strokeWidth={2.2} />
          ) : item.emotion === 'neutral' ? (
            <Meh size={12} color="#7A6B1A" strokeWidth={2.2} />
          ) : (
            <Frown size={12} color="#C44536" strokeWidth={2.2} />
          )}
          <Text style={styles.emotionText}>{EMOTION_LABEL[item.emotion] ?? ''}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: WattPrintTokens.colors.neutralLine,
  },
  main: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    lineHeight: 19,
    color: WattPrintTokens.colors.primary,
  },
  devices: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  meta: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  saved: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 14,
    color: WattPrintTokens.colors.accentDeep,
  },
  savedZero: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.secondary,
  },
  kwh: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  emotionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: WattPrintTokens.colors.primaryContainer,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: WattPrintTokens.radii.pill,
  },
  emotionText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: WattPrintTokens.colors.primary,
  },
});
