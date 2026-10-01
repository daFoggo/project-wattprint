import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, Frown, Meh, Smile, X } from 'lucide-react-native';

import { QueryBoundary } from '@/components/common/query-boundary';
import { Fonts, WattPrintTokens } from '@/constants/theme';
import {
  APPLIANCE_ICON_ID,
  NOT_ENOUGH_DAYS,
  experimentDay,
  formatKwh,
  formatVnd,
  savedSentence,
  shortDate,
} from '@/features/energy/experiment-utils';
import type { ActiveExperiment, EmotionType } from '@/features/energy/types';
import { useActiveExperimentProgress } from '@/features/energy/use-experiment-progress';

import { ApplianceIcon } from './appliance-icon';
import { ExperimentDetailSkeleton } from './experiment-skeletons';

interface EndResult {
  savedKwh: number;
  savedVnd: number;
  days: number;
  dateRange: string;
}

interface ExperimentDetailModalProps {
  visible: boolean;
  experiment: ActiveExperiment | null;
  onClose: () => void;
  onEnd: (emotion: EmotionType, result: EndResult) => void;
}

const EMOTION_OPTIONS: { key: EmotionType; label: string; desc: string }[] = [
  { key: 'comfortable', label: 'Thoải mái', desc: 'Dễ chịu, không xáo trộn sinh hoạt' },
  { key: 'neutral', label: 'Bình thường', desc: 'Chấp nhận được, quen dần' },
  { key: 'uncomfortable', label: 'Bất tiện', desc: 'Khó chịu, nóng hoặc bất tiện' },
];

export function ExperimentDetailModal({ visible, experiment, onClose, onEnd }: ExperimentDetailModalProps) {
  return (
    <Modal visible={visible && experiment !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {experiment && (
            <>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.eyebrow}>
                    CHI TIẾT THỬ NGHIỆM · NGÀY {experimentDay(experiment.startedDate, experiment.totalDays)}/
                    {experiment.totalDays}
                  </Text>
                  <Text style={styles.title}>{experiment.actions.map((a) => a.name).join(' + ')}</Text>
                </View>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}>
                  <X size={18} color={WattPrintTokens.colors.primary} strokeWidth={2.2} />
                </Pressable>
              </View>

              <QueryBoundary fallback={<ExperimentDetailSkeleton />} errorMessage="Không tải được số đo thử nghiệm.">
                <DetailBody experiment={experiment} onClose={onClose} onEnd={onEnd} />
              </QueryBoundary>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DetailBody({
  experiment,
  onClose,
  onEnd,
}: {
  experiment: ActiveExperiment;
  onClose: () => void;
  onEnd: ExperimentDetailModalProps['onEnd'];
}) {
  const progress = useActiveExperimentProgress(experiment);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType>('comfortable');
  const [showSurvey, setShowSurvey] = useState(false);

  const completeDays = progress.completeDays;
  const first = progress.days[0];
  const last = progress.days[progress.days.length - 1];

  const handleSelectEmotion = (emotion: EmotionType) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedEmotion(emotion);
  };

  const handleConfirmEnd = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onEnd(selectedEmotion, {
      savedKwh: progress.savedKwh,
      savedVnd: progress.savedVnd,
      days: progress.days.length,
      dateRange: first && last ? `${shortDate(first.date)} – ${shortDate(last.date)}` : '',
    });
    onClose();
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionHeading}>THIẾT BỊ TRONG THỬ NGHIỆM</Text>
      {experiment.actions.map((a, i) => {
        const p = progress.perAppliance[i];
        const latest = p?.days.at(-1);
        const done = p?.days.some((d) => d.complete) ?? false;
        return (
          <View key={a.appliance} style={styles.goalCard}>
            <View style={styles.goalIconWrap}>
              <ApplianceIcon name="" id={APPLIANCE_ICON_ID[a.appliance]} size={24} color={WattPrintTokens.colors.primary} />
            </View>
            <View style={styles.goalContent}>
              <Text style={styles.goalTitle}>
                {a.name}: bớt {a.amount} {a.unitLabel}
              </Text>
              <Text style={styles.goalSub}>
                Nền {formatKwh(a.baselineKwhPerDay)} kWh/ngày · hôm nay {formatKwh(latest?.kwh ?? 0)} kWh · dự kiến bớt ~
                {formatKwh(a.predictedKwhPerDay)} kWh/ngày
              </Text>
              {done && p && (
                <Text style={styles.goalSub}>
                  {savedSentence(p.saved_kwh, p.saved_vnd, p.days.filter((d) => d.complete).length)}
                </Text>
              )}
            </View>
          </View>
        );
      })}

      <View style={styles.savingsRow}>
        {completeDays > 0 ? (
          <>
            <View style={styles.savingBox}>
              <Text style={styles.savingLabel}>{progress.savedKwh >= 0 ? 'TIẾT KIỆM ĐẾN NAY' : 'CAO HƠN MỨC NỀN'}</Text>
              <Text style={[styles.savingVal, progress.savedKwh < 0 && styles.savingValNeg]}>
                {formatKwh(Math.abs(progress.savedKwh))} kWh
              </Text>
            </View>
            <View style={styles.savingDivider} />
            <View style={styles.savingBox}>
              <Text style={styles.savingLabel}>{progress.savedKwh >= 0 ? 'TIỀN ĐIỆN BỚT ĐI' : 'TIỀN ĐIỆN PHÁT SINH'}</Text>
              <Text style={styles.savingValVnd}>{formatVnd(Math.abs(progress.savedVnd))}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.notEnough}>{NOT_ENOUGH_DAYS}. Hôm nay còn đang đo.</Text>
        )}
      </View>

      <Text style={styles.sectionHeading}>SỐ ĐO THEO NGÀY ({progress.days.length} NGÀY)</Text>

      <View style={styles.logTableCard}>
        {progress.days.map((item, index) => {
          const delta = progress.baselineKwhPerDay - item.kwh;
          return (
            <View key={item.date} style={[styles.logTableRow, index > 0 && styles.logTableRowBorder]}>
              <View style={styles.dayCol}>
                <Text style={styles.dayLabel}>Ngày {index + 1}</Text>
                <Text style={styles.dayDate}>{shortDate(item.date)}</Text>
              </View>

              <View style={styles.runtimeCol}>
                <Text style={styles.runtimeLabel}>Thời gian chạy</Text>
                <Text style={styles.runtimeVal}>
                  {Math.round(item.minutes)} phút · {item.runs} lần
                </Text>
              </View>

              <View style={styles.kwhCol}>
                <Text style={styles.kwhVal}>{formatKwh(item.kwh)} kWh</Text>
                <Text style={styles.kwhDiff}>
                  {!item.complete
                    ? 'Đang đo, chưa hết ngày'
                    : delta >= 0
                      ? `Thấp hơn nền ${formatKwh(delta)}`
                      : `Cao hơn nền ${formatKwh(-delta)}`}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {!showSurvey ? (
        <Pressable
          onPress={() => {
            try {
              Haptics.selectionAsync();
            } catch {}
            setShowSurvey(true);
          }}
          style={({ pressed }) => [styles.endTriggerBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.985 }] }]}>
          <Text style={styles.endTriggerBtnText}>KẾT THÚC THỬ NGHIỆM</Text>
        </Pressable>
      ) : (
        <View style={styles.surveyCard}>
          <Text style={styles.surveyQuestion}>Trong quá trình thử nghiệm, bạn cảm thấy thế nào?</Text>

          <View style={styles.emotionList}>
            {EMOTION_OPTIONS.map((opt) => {
              const isSelected = selectedEmotion === opt.key;
              const iconColor = isSelected
                ? opt.key === 'comfortable'
                  ? WattPrintTokens.colors.accentDeep
                  : opt.key === 'neutral'
                    ? '#8A6E10'
                    : '#C44536'
                : WattPrintTokens.colors.secondary;
              const Icon = opt.key === 'comfortable' ? Smile : opt.key === 'neutral' ? Meh : Frown;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => handleSelectEmotion(opt.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.emotionBtn,
                    isSelected && styles.emotionBtnSelected,
                    pressed && { opacity: 0.8 },
                  ]}>
                  <View style={[styles.emotionIconWrap, isSelected && styles.emotionIconWrapSelected]}>
                    <Icon size={22} color={iconColor} strokeWidth={2.2} />
                  </View>
                  <View style={styles.emotionContent}>
                    <Text style={[styles.emotionLabel, isSelected && styles.emotionLabelSelected]}>{opt.label}</Text>
                    <Text style={[styles.emotionDesc, isSelected && styles.emotionDescSelected]}>{opt.desc}</Text>
                  </View>
                  {isSelected && (
                    <View style={styles.radioActive}>
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handleConfirmEnd}
            style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] }]}>
            <Text style={styles.confirmBtnText}>XÁC NHẬN KẾT THÚC VÀ LƯU KẾT QUẢ</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  scrim: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: WattPrintTokens.colors.neutralGround, // #F2F4ED
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCD3C7',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  eyebrow: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  title: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 22,
    color: WattPrintTokens.colors.primary, // #164437
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E7DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
  },
  goalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalContent: {
    flex: 1,
    gap: 2,
  },
  goalTitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    color: WattPrintTokens.colors.primary,
    lineHeight: 20,
  },
  goalSub: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  savingBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  savingDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E7EBE1',
  },
  savingLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.secondary,
  },
  savingVal: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 18,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  savingValNeg: {
    color: '#C44536',
  },
  savingValVnd: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 18,
    color: WattPrintTokens.colors.primary, // #164437
  },
  sectionHeading: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.secondary,
    marginTop: 4,
  },
  logTableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  logTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  logTableRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E7EBE1',
  },
  dayCol: {
    width: 70,
    gap: 2,
  },
  dayLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.primary,
  },
  dayDate: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    color: WattPrintTokens.colors.secondary,
  },
  runtimeCol: {
    flex: 1,
    gap: 2,
    paddingHorizontal: 8,
  },
  runtimeLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: WattPrintTokens.colors.secondary,
  },
  runtimeVal: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.primary,
  },
  kwhCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  kwhVal: {
    fontFamily: Fonts.monoMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.primary,
  },
  kwhDiff: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: WattPrintTokens.colors.accentDeep,
  },
  endTriggerBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D47368',
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  endTriggerBtnText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    letterSpacing: 0.6,
    color: '#D47368',
  },
  surveyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 14,
    marginTop: 6,
  },
  surveyQuestion: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: WattPrintTokens.colors.primary,
  },
  emotionList: {
    gap: 8,
  },
  emotionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  emotionBtnSelected: {
    backgroundColor: '#EFF8EA',
    borderColor: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  emotionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E7EBE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emotionIconWrapSelected: {
    backgroundColor: '#E4F5BE',
  },
  emotionContent: {
    flex: 1,
    gap: 2,
  },
  emotionLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    color: WattPrintTokens.colors.primary,
  },
  emotionLabelSelected: {
    color: WattPrintTokens.colors.accentDeep,
    fontFamily: Fonts.sansSemiBold,
  },
  emotionDesc: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  emotionDescSelected: {
    color: WattPrintTokens.colors.primary,
  },
  radioActive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: WattPrintTokens.colors.accentDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    backgroundColor: WattPrintTokens.colors.primary, // #164437
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  confirmBtnText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.tertiary, // #B5E930
  },
  notEnough: {
    flex: 1,
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: WattPrintTokens.colors.secondary,
  },
});
