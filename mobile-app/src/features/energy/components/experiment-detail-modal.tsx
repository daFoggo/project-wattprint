import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, Frown, Meh, Smile, X } from 'lucide-react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import type { ActiveExperiment, EmotionType } from '@/features/energy/types';
import { ApplianceIcon } from './appliance-icon';

interface ExperimentDetailModalProps {
  visible: boolean;
  experiment: ActiveExperiment | null;
  onClose: () => void;
  onEnd: (emotion: EmotionType) => void;
}

const EMOTION_OPTIONS: {
  key: EmotionType;
  label: string;
  desc: string;
}[] = [
  {
    key: 'comfortable',
    label: 'Thoải mái',
    desc: 'Dễ chịu, không xáo trộn sinh hoạt',
  },
  {
    key: 'neutral',
    label: 'Bình thường',
    desc: 'Chấp nhận được, quen dần',
  },
  {
    key: 'uncomfortable',
    label: 'Bất tiện',
    desc: 'Khó chịu, nóng hoặc bất tiện',
  },
];

export function ExperimentDetailModal({
  visible,
  experiment,
  onClose,
  onEnd,
}: ExperimentDetailModalProps) {
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType>('comfortable');
  const [showSurvey, setShowSurvey] = useState(false);

  if (!experiment) return null;

  const totalKwhUsed = experiment.dailyLogs.reduce((acc, cur) => acc + cur.kwh, 0);
  const baselineTotalKwh = experiment.baselineKwh * experiment.dailyLogs.length;
  const totalSavedKwh = Math.max(0, Math.round((baselineTotalKwh - totalKwhUsed) * 10) / 10);
  const totalSavedVnd = Math.round(totalSavedKwh * 2700);

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
    onEnd(selectedEmotion);
    onClose();
    setShowSurvey(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>
                CHI TIẾT THỬ NGHIỆM · NGÀY {experiment.currentDay}/{experiment.totalDays}
              </Text>
              <Text style={styles.title}>{experiment.deviceName}</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}>
              <X size={18} color={WattPrintTokens.colors.primary} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {/* Goal Card */}
            <View style={styles.goalCard}>
              <View style={styles.goalIconWrap}>
                <ApplianceIcon
                  name={experiment.deviceName}
                  id={experiment.deviceId}
                  size={24}
                  color={WattPrintTokens.colors.primary}
                />
              </View>
              <View style={styles.goalContent}>
                <Text style={styles.goalTitle}>{experiment.title}</Text>
                <Text style={styles.goalSub}>
                  Mức nền: {experiment.baselineKwh.toFixed(1)} kWh/ngày → Mục tiêu:{' '}
                  {experiment.targetKwh.toFixed(1)} kWh/ngày
                </Text>
              </View>
            </View>

            {/* Savings Overview Bar */}
            <View style={styles.savingsRow}>
              <View style={styles.savingBox}>
                <Text style={styles.savingLabel}>TIẾT KIỆM ĐẾN NAY</Text>
                <Text style={styles.savingVal}>+{totalSavedKwh.toFixed(1)} kWh</Text>
              </View>
              <View style={styles.savingDivider} />
              <View style={styles.savingBox}>
                <Text style={styles.savingLabel}>ƯỚC TÍNH CHI PHÍ</Text>
                <Text style={styles.savingValVnd}>
                  +{totalSavedVnd.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            </View>

            {/* Device Daily Logs Section */}
            <Text style={styles.sectionHeading}>
              NHẬT KÝ ĐO ĐẠC THỰC TẾ THEO NGÀY ({experiment.dailyLogs.length} NGÀY)
            </Text>

            <View style={styles.logTableCard}>
              {experiment.dailyLogs.map((item, index) => (
                <View
                  key={item.day}
                  style={[
                    styles.logTableRow,
                    index > 0 && styles.logTableRowBorder,
                  ]}>
                  <View style={styles.dayCol}>
                    <Text style={styles.dayLabel}>Ngày {item.day}</Text>
                    <Text style={styles.dayDate}>{item.date}</Text>
                  </View>

                  <View style={styles.runtimeCol}>
                    <Text style={styles.runtimeLabel}>Thời gian chạy</Text>
                    <Text style={styles.runtimeVal}>{item.runtime}</Text>
                  </View>

                  <View style={styles.kwhCol}>
                    <Text style={styles.kwhVal}>{item.kwh.toFixed(1)} kWh</Text>
                    <Text style={styles.kwhDiff}>
                      {item.kwh <= experiment.targetKwh ? 'Đạt mục tiêu' : 'Vượt mục tiêu'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* If not yet opened survey, show button to trigger evaluation */}
            {!showSurvey ? (
              <Pressable
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setShowSurvey(true);
                }}
                style={({ pressed }) => [
                  styles.endTriggerBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.985 }] },
                ]}>
                <Text style={styles.endTriggerBtnText}>KẾT THÚC THỬ NGHIỆM</Text>
              </Pressable>
            ) : (
              /* Emotion Survey Block */
              <View style={styles.surveyCard}>
                <Text style={styles.surveyQuestion}>
                  Trong quá trình thử nghiệm, bạn cảm thấy thế nào?
                </Text>

                {/* 3 Quick Emotion Buttons */}
                <View style={styles.quickEmotionRow}>
                  {EMOTION_OPTIONS.map((opt) => {
                    const isSelected = selectedEmotion === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => handleSelectEmotion(opt.key)}
                        style={({ pressed }) => [
                          styles.quickEmotionChip,
                          isSelected && styles.quickEmotionChipSelected,
                          pressed && { opacity: 0.75 },
                        ]}>
                        <Text style={styles.quickEmotionEmoji}>
                          {opt.key === 'comfortable' ? '😊' : opt.key === 'neutral' ? '😐' : '🙁'}
                        </Text>
                        <Text
                          style={[
                            styles.quickEmotionText,
                            isSelected && styles.quickEmotionTextSelected,
                          ]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.emotionList}>
                  {EMOTION_OPTIONS.map((opt) => {
                    const isSelected = selectedEmotion === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => handleSelectEmotion(opt.key)}
                        style={({ pressed }) => [
                          styles.emotionBtn,
                          isSelected && styles.emotionBtnSelected,
                          pressed && { opacity: 0.8 },
                        ]}>
                        <View
                          style={[
                            styles.emotionIconWrap,
                            isSelected && styles.emotionIconWrapSelected,
                          ]}>
                          {opt.key === 'comfortable' ? (
                            <Smile
                              size={22}
                              color={
                                isSelected
                                  ? WattPrintTokens.colors.accentDeep
                                  : WattPrintTokens.colors.secondary
                              }
                              strokeWidth={2.2}
                            />
                          ) : opt.key === 'neutral' ? (
                            <Meh
                              size={22}
                              color={
                                isSelected ? '#8A6E10' : WattPrintTokens.colors.secondary
                              }
                              strokeWidth={2.2}
                            />
                          ) : (
                            <Frown
                              size={22}
                              color={
                                isSelected ? '#C44536' : WattPrintTokens.colors.secondary
                              }
                              strokeWidth={2.2}
                            />
                          )}
                        </View>
                        <View style={styles.emotionContent}>
                          <Text
                            style={[
                              styles.emotionLabel,
                              isSelected && styles.emotionLabelSelected,
                            ]}>
                            {opt.label}
                          </Text>
                          <Text
                            style={[
                              styles.emotionDesc,
                              isSelected && styles.emotionDescSelected,
                            ]}>
                            {opt.desc}
                          </Text>
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

                {/* Final Confirm End Button */}
                <Pressable
                  onPress={handleConfirmEnd}
                  style={({ pressed }) => [
                    styles.confirmBtn,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
                  ]}>
                  <Text style={styles.confirmBtnText}>
                    XÁC NHẬN KẾT THÚC VÀ LƯU KẾT QUẢ
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  closeBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.primary,
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
  quickEmotionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickEmotionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: WattPrintTokens.radii.pill,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  quickEmotionChipSelected: {
    backgroundColor: '#EFF8EA',
    borderColor: WattPrintTokens.colors.accentDeep,
  },
  quickEmotionEmoji: {
    fontSize: 16,
  },
  quickEmotionText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.primary,
  },
  quickEmotionTextSelected: {
    fontFamily: Fonts.sansSemiBold,
    color: WattPrintTokens.colors.accentDeep,
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
  radioCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
});
