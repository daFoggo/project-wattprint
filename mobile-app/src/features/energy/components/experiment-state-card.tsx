import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import {
  APPLIANCE_ICON_ID,
  NOT_ENOUGH_DAYS,
  experimentDay,
  formatKwh,
  savedSentence,
} from '@/features/energy/experiment-utils';
import type { ActiveExperiment } from '@/features/energy/types';
import { useActiveExperimentProgress } from '@/features/energy/use-experiment-progress';

import { ApplianceIcon } from './appliance-icon';

interface RunningCardProps {
  experiment: ActiveExperiment;
  onOpenDetail: () => void;
}

/** Thử nghiệm đang chạy: số đo thật của từng thiết bị từ `/demo/experiments/progress`, tiết kiệm chỉ tính trên ngày hoàn chỉnh. */
export function ExperimentRunningCard({ experiment, onOpenDetail }: RunningCardProps) {
  const progress = useActiveExperimentProgress(experiment);
  const day = experimentDay(experiment.startedDate, experiment.totalDays);
  const baselineTotal = experiment.actions.reduce((sum, a) => sum + a.baselineKwhPerDay, 0);
  const today = progress.days[progress.days.length - 1];

  const note =
    progress.completeDays > 0
      ? savedSentence(progress.savedKwh, progress.savedVnd, progress.completeDays)
      : `${NOT_ENOUGH_DAYS}. Hôm nay còn đang đo.`;

  return (
    <View style={[styles.card, styles.cardRunning]}>
      <Text style={[styles.tag, styles.tagRunning]}>{`ĐANG CHẠY · NGÀY ${day}/${experiment.totalDays}`}</Text>
      <Text style={[styles.title, styles.titleRunning]}>{experiment.title}</Text>

      <View style={styles.deviceList}>
        {experiment.actions.map((a, i) => {
          const latest = progress.perAppliance[i]?.days.at(-1);
          return (
            <View key={a.appliance} style={styles.deviceRow}>
              <ApplianceIcon name="" id={APPLIANCE_ICON_ID[a.appliance]} size={20} color={WattPrintTokens.colors.tertiary} />
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{a.name}</Text>
                <Text style={styles.deviceMeta}>
                  Bớt {a.amount} {a.unitLabel} · nền {formatKwh(a.baselineKwhPerDay)} kWh
                </Text>
              </View>
              <Text style={styles.deviceToday}>{formatKwh(latest?.kwh ?? 0)} kWh</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.compareGrid}>
        <View style={[styles.statBox, styles.statBoxDark]}>
          <Text style={[styles.boxLabel, styles.boxLabelDark]}>TỔNG MỨC NỀN</Text>
          <View style={styles.valRow}>
            <Text style={[styles.boxVal, styles.boxValDark]}>{formatKwh(baselineTotal)}</Text>
            <Text style={[styles.boxUnit, styles.boxUnitDark]}>kWh/ngày</Text>
          </View>
        </View>
        <View style={[styles.statBox, styles.statBoxDark]}>
          <Text style={[styles.boxLabel, styles.boxLabelDark]}>HÔM NAY ĐẾN GIỜ</Text>
          <View style={styles.valRow}>
            <Text style={[styles.boxVal, styles.boxValAccent, styles.boxValAccentDark]}>{formatKwh(today?.kwh ?? 0)}</Text>
            <Text style={[styles.boxUnit, styles.boxUnitDark]}>kWh</Text>
          </View>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Tiến độ thử nghiệm</Text>
          <Text style={styles.progressValue}>
            {day} / {experiment.totalDays} ngày
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${Math.round((day / experiment.totalDays) * 100)}%` }]} />
        </View>
      </View>

      <Text style={[styles.note, styles.noteRunning]}>{note}</Text>

      <View style={styles.btnRow}>
        <Pressable
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            onOpenDetail();
          }}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.actionBtn,
            styles.actionBtnRunning,
            pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
          ]}>
          <Text style={[styles.actionBtnText, styles.actionBtnTextRunning]}>CHI TIẾT VÀ KẾT THÚC</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl, // 20px
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 14,
  },
  cardRunning: {
    backgroundColor: WattPrintTokens.colors.primary, // #164437
  },
  tag: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  tagRunning: {
    color: WattPrintTokens.colors.tertiary, // #B5E930
  },
  title: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 19,
    lineHeight: 25,
    color: WattPrintTokens.colors.primary, // #164437
  },
  titleRunning: {
    color: '#FFFFFF',
  },
  compareGrid: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  statBox: {
    flex: 1,
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
    borderRadius: WattPrintTokens.radii.lg, // 16px
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
  },
  statBoxDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  boxLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  boxLabelDark: {
    color: WattPrintTokens.colors.inkInverseMuted, // #BBD2C9
  },
  valRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  boxVal: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 24,
    color: WattPrintTokens.colors.primary,
  },
  boxValDark: {
    color: '#FFFFFF',
  },
  boxValAccent: {
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  boxValAccentDark: {
    color: WattPrintTokens.colors.tertiary, // #B5E930
  },
  boxUnit: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  boxUnitDark: {
    color: WattPrintTokens.colors.inkInverseMuted,
  },
  progressContainer: {
    gap: 6,
    paddingTop: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: WattPrintTokens.colors.inkInverseMuted,
  },
  progressValue: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.tertiary,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: WattPrintTokens.colors.tertiary, // #B5E930
    borderRadius: 3,
  },
  note: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  noteRunning: {
    color: WattPrintTokens.colors.inkInverseMuted,
  },
  btnRow: {
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    backgroundColor: WattPrintTokens.colors.primary, // #164437
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnRunning: {
    backgroundColor: WattPrintTokens.colors.tertiary, // #B5E930
  },
  actionBtnText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.tertiary, // #B5E930
  },
  actionBtnTextRunning: {
    color: WattPrintTokens.colors.primary, // #164437
  },
  deviceList: {
    gap: 8,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: WattPrintTokens.radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  deviceInfo: {
    flex: 1,
    gap: 1,
  },
  deviceName: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: '#FFFFFF',
  },
  deviceMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: WattPrintTokens.colors.inkInverseMuted,
  },
  deviceToday: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.tertiary,
  },
});
