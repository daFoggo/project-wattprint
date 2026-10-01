import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import type { ActiveExperiment, ExperimentState } from '@/features/energy/types';

interface ExperimentStateCardProps {
  state: ExperimentState;
  activeExperiment: ActiveExperiment | null;
  onOpenCreate: () => void;
  onOpenDetail: () => void;
}

export function ExperimentStateCard({
  state,
  activeExperiment,
  onOpenCreate,
  onOpenDetail,
}: ExperimentStateCardProps) {
  const isRunning = state === 'running';
  const isSummary = state === 'summary';
  const isSuggest = state === 'suggest';
  const isLocked = state === 'locked';

  let tag = '';
  let title = '';
  let note = '';
  let btnLabel = '';
  let leftLabel = '';
  let leftVal = '';
  let leftUnit = '';
  let rightLabel = '';
  let rightVal = '';
  let rightUnit = '';

  if (isRunning) {
    const day = activeExperiment?.currentDay ?? 3;
    const total = activeExperiment?.totalDays ?? 7;
    tag = `ĐANG CHẠY · NGÀY ${day}/${total}`;
    title = activeExperiment?.title ?? 'Điều hòa 26,5°C kèm quạt, thay vì 24°C';
    note = `Đã tiết kiệm ước tính ~${(activeExperiment?.predictedSavedVnd ?? 85000).toLocaleString('vi-VN')} đ. Dữ liệu công tơ đang đo đạc tự động.`;
    btnLabel = 'Chi tiết & Kết thúc thử nghiệm';
    leftLabel = 'MỨC NỀN';
    leftVal = (activeExperiment?.baselineKwh ?? 8.2).toFixed(1);
    leftUnit = 'kWh/ngày';
    rightLabel = 'ĐO ĐẠC';
    rightVal = (activeExperiment?.targetKwh ?? 5.1).toFixed(1);
    rightUnit = 'kWh/ngày';
  } else if (isSummary) {
    tag = 'CHƯA CÓ THỬ NGHIỆM ĐANG CHẠY';
    title = 'Hoàn tất thử nghiệm gần nhất';
    note = 'Bạn có thể bắt đầu một thử nghiệm mới với thiết bị khác để tiếp tục tối ưu hóa hóa đơn điện.';
    btnLabel = 'Bắt đầu thử nghiệm mới';
    leftLabel = 'ĐÃ TIẾT KIỆM';
    leftVal = '151k';
    leftUnit = 'VND';
    rightLabel = 'THÓI QUEN';
    rightVal = '3';
    rightUnit = 'đã duy trì';
  } else if (isSuggest) {
    tag = 'GỢI Ý TỐI ƯU CHO BẠN';
    title = 'Tăng nhiệt độ điều hòa 26,5°C kết hợp quạt thay vì 24°C';
    note = 'Thử nghiệm trong 7 ngày để tìm mức tiện nghi tối ưu mà không nhảy bậc điện. Bạn có thể tùy chỉnh mốc nhiệt độ và thiết bị trước khi bắt đầu.';
    btnLabel = 'Bắt đầu thử nghiệm';
    leftLabel = 'MỨC NỀN';
    leftVal = '8.2';
    leftUnit = 'kWh/ngày';
    rightLabel = 'ƯỚC TÍNH';
    rightVal = '5.1';
    rightUnit = 'kWh/ngày';
  } else {
    tag = 'ĐANG KHÓA';
    title = 'Đang ghi nhận mức tiêu thụ nền';
    note = 'Các thử nghiệm so sánh dựa trên lịch sử đo đạc, công tơ cần thêm 4 ngày ổn định.';
    btnLabel = 'Khả dụng sau 4 ngày';
  }

  const handleAction = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (isRunning) {
      onOpenDetail();
    } else if (isSuggest || isSummary) {
      onOpenCreate();
    }
  };

  return (
    <View style={[styles.card, isRunning && styles.cardRunning]}>
      {/* Tag */}
      <Text style={[styles.tag, isRunning && styles.tagRunning]}>{tag}</Text>

      {/* Title */}
      <Text style={[styles.title, isRunning && styles.titleRunning]}>{title}</Text>

      {/* Comparison Grid */}
      {!isLocked && (
        <View style={styles.compareGrid}>
          {/* Left Box */}
          <View style={[styles.statBox, isRunning && styles.statBoxDark]}>
            <Text style={[styles.boxLabel, isRunning && styles.boxLabelDark]}>
              {leftLabel}
            </Text>
            <View style={styles.valRow}>
              <Text style={[styles.boxVal, isRunning && styles.boxValDark]}>
                {leftVal}
              </Text>
              <Text style={[styles.boxUnit, isRunning && styles.boxUnitDark]}>
                {leftUnit}
              </Text>
            </View>
          </View>

          {/* Right Box */}
          <View style={[styles.statBox, isRunning && styles.statBoxDark]}>
            <Text style={[styles.boxLabel, isRunning && styles.boxLabelDark]}>
              {rightLabel}
            </Text>
            <View style={styles.valRow}>
              <Text
                style={[
                  styles.boxVal,
                  styles.boxValAccent,
                  isRunning && styles.boxValAccentDark,
                ]}>
                {rightVal}
              </Text>
              <Text style={[styles.boxUnit, isRunning && styles.boxUnitDark]}>
                {rightUnit}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Progress Track if running */}
      {isRunning && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Tiến độ thử nghiệm</Text>
            <Text style={styles.progressValue}>
              {activeExperiment?.currentDay ?? 3} / {activeExperiment?.totalDays ?? 7} ngày
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.round(
                    ((activeExperiment?.currentDay ?? 3) /
                      (activeExperiment?.totalDays ?? 7)) *
                      100
                  )}%`,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Note */}
      <Text style={[styles.note, isRunning && styles.noteRunning]}>{note}</Text>

      {/* Actions */}
      <View style={styles.btnRow}>
        <Pressable
          onPress={isLocked ? undefined : handleAction}
          style={({ pressed }) => [
            styles.actionBtn,
            isRunning && styles.actionBtnRunning,
            isLocked && styles.actionBtnLocked,
            pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
          ]}>
          <Text
            style={[
              styles.actionBtnText,
              isRunning && styles.actionBtnTextRunning,
              isLocked && styles.actionBtnTextLocked,
            ]}>
            {btnLabel}
          </Text>
        </Pressable>

        {/* Secondary button if in suggest mode */}
        {isSuggest && (
          <Pressable
            onPress={() => {
              try {
                Haptics.selectionAsync();
              } catch {}
              onOpenCreate();
            }}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && { opacity: 0.7 },
            ]}>
            <View style={styles.secondaryBtnContent}>
              <Plus size={14} color={WattPrintTokens.colors.primary} strokeWidth={2.4} />
              <Text style={styles.secondaryBtnText}>Tùy chỉnh thiết bị khác</Text>
            </View>
          </Pressable>
        )}
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
  actionBtnLocked: {
    backgroundColor: '#D1D5DB',
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
  actionBtnTextLocked: {
    color: '#6B7280',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  secondaryBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secondaryBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
});
