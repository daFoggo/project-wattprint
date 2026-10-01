import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  ArrowRight,
  Check,
  Minus,
  Plus,
  Sparkles,
  X,
} from 'lucide-react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import { EXPERIMENT_TEMPLATES } from '@/features/energy/mock';
import type { ActiveExperiment } from '@/features/energy/types';
import { ApplianceIcon } from './appliance-icon';

function generateExperimentId(): string {
  return `exp-${Date.now()}`;
}

interface CreateExperimentSheetProps {
  visible: boolean;
  onClose: () => void;
  onStart: (experiment: ActiveExperiment) => void;
}

export function CreateExperimentSheet({
  visible,
  onClose,
  onStart,
}: CreateExperimentSheetProps) {
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const currentTemplate = EXPERIMENT_TEMPLATES[selectedTemplateIndex] ?? EXPERIMENT_TEMPLATES[0];

  const [targetVal, setTargetVal] = useState<number>(currentTemplate.defaultTarget);
  const [extraOption, setExtraOption] = useState<boolean>(true); // e.g. with fan
  const [hasPredicted, setHasPredicted] = useState<boolean>(false);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);

  // Switch template
  const handleSelectTemplate = (index: number) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    const tmpl = EXPERIMENT_TEMPLATES[index];
    setSelectedTemplateIndex(index);
    setTargetVal(tmpl.defaultTarget);
    setHasPredicted(false);
  };

  const handleMinus = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setTargetVal((prev) => Math.max(currentTemplate.minTarget, prev - currentTemplate.step));
    setHasPredicted(false);
  };

  const handlePlus = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setTargetVal((prev) => Math.min(currentTemplate.maxTarget, prev + currentTemplate.step));
    setHasPredicted(false);
  };

  const handlePredict = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setIsPredicting(true);
    setTimeout(() => {
      setIsPredicting(false);
      setHasPredicted(true);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }, 350);
  };

  const prediction = currentTemplate.calcPrediction(targetVal, extraOption);
  const experimentTitle = `${currentTemplate.deviceName}: ${targetVal}${currentTemplate.unit} ${
    currentTemplate.deviceId === 'dev-0' && extraOption ? 'kèm quạt gió' : ''
  }`;

  const handleConfirmStart = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const newExperiment: ActiveExperiment = {
      id: generateExperimentId(),
      deviceId: currentTemplate.deviceId,
      deviceName: currentTemplate.deviceName,
      title: experimentTitle,
      baselineKwh: currentTemplate.baselineKwh,
      targetKwh: prediction.targetKwh,
      predictedSavedKwh: prediction.savedKwhPerDay,
      predictedSavedVnd: prediction.savedVndPerWeek,
      currentDay: 1,
      totalDays: 7,
      dailyLogs: [
        {
          day: 1,
          date: 'Hôm nay',
          kwh: prediction.targetKwh,
          runtime: 'Đang theo dõi...',
        },
      ],
    };

    onStart(newExperiment);
    onClose();
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
          {/* Handle bar */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>KHỞI TẠO THỬ NGHIỆM</Text>
              <Text style={styles.title}>Thiết lập mục tiêu mới</Text>
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
            {/* Experiment Name Banner */}
            <View style={styles.nameBannerCard}>
              <Text style={styles.nameBannerLabel}>TÊN THỬ NGHIỆM</Text>
              <Text style={styles.nameBannerTitle}>{experimentTitle}</Text>
            </View>

            {/* Step 1: Device Selection Chips */}
            <Text style={styles.sectionLabel}>1. CHỌN THIẾT BỊ MỤC TIÊU</Text>
            <View style={styles.deviceRow}>
              {EXPERIMENT_TEMPLATES.map((tmpl, idx) => {
                const isSelected = idx === selectedTemplateIndex;
                return (
                  <Pressable
                    key={tmpl.deviceId}
                    onPress={() => handleSelectTemplate(idx)}
                    style={({ pressed }) => [
                      styles.deviceChip,
                      isSelected && styles.deviceChipSelected,
                      pressed && { opacity: 0.75 },
                    ]}>
                    <ApplianceIcon
                      name={tmpl.deviceName}
                      id={tmpl.deviceId}
                      size={18}
                      color={isSelected ? '#FFFFFF' : WattPrintTokens.colors.primary}
                    />
                    <Text
                      style={[
                        styles.deviceChipText,
                        isSelected && styles.deviceChipTextSelected,
                      ]}>
                      {tmpl.deviceName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Step 2: Dynamic Adjustments */}
            <Text style={styles.sectionLabel}>2. ĐIỀU CHỈNH MỤC TIÊU THỰC TẾ</Text>
            <View style={styles.adjustCard}>
              <View style={styles.stepperRow}>
                <View style={styles.adjustInfo}>
                  <Text style={styles.adjustTitle}>{currentTemplate.title}</Text>
                  <Text style={styles.adjustSub}>
                    Mức khuyến nghị: {currentTemplate.defaultTarget} {currentTemplate.unit}
                  </Text>
                </View>

                {currentTemplate.step > 0 && (
                  <View style={styles.stepperWrap}>
                    <Pressable
                      onPress={handleMinus}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.stepBtn,
                        pressed && styles.stepBtnPressed,
                      ]}>
                      <Minus size={16} color={WattPrintTokens.colors.primary} strokeWidth={2.5} />
                    </Pressable>
                    <Text style={styles.stepValue}>
                      {targetVal.toFixed(currentTemplate.step < 1 ? 1 : 0)} {currentTemplate.unit}
                    </Text>
                    <Pressable
                      onPress={handlePlus}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.stepBtn,
                        pressed && styles.stepBtnPressed,
                      ]}>
                      <Plus size={16} color={WattPrintTokens.colors.primary} strokeWidth={2.5} />
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Extra toggle for AC */}
              {currentTemplate.deviceId === 'dev-0' && (
                <Pressable
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {}
                    setExtraOption((prev) => !prev);
                    setHasPredicted(false);
                  }}
                  style={styles.toggleRow}>
                  <View
                    style={[
                      styles.toggleBox,
                      extraOption && styles.toggleBoxActive,
                    ]}>
                    {extraOption && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <Text style={styles.toggleLabel}>
                    Kết hợp bật quạt gió trần/cây để làm mát đều
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Step 3: Unified Impact & Comparison Card */}
            <Text style={styles.sectionLabel}>3. DỰ KIẾN HIỆU QUẢ & TIẾT KIỆM (7 NGÀY)</Text>
            {!hasPredicted ? (
              <View style={styles.predictCard}>
                <View style={styles.predictHeaderRow}>
                  <Sparkles size={15} color={WattPrintTokens.colors.primary} strokeWidth={2.4} />
                  <Text style={styles.predictTitle}>DỰ ĐOÁN HIỆU QUẢ TIẾT KIỆM</Text>
                </View>
                <Text style={styles.predictDesc}>
                  Dựa trên thói quen đo đạc 14 ngày qua và mô hình biểu phí EVN, WattPrint sẽ mô phỏng lượng điện cắt giảm & chi phí tiết kiệm.
                </Text>
                <Pressable
                  onPress={handlePredict}
                  disabled={isPredicting}
                  style={({ pressed }) => [
                    styles.predictBtn,
                    pressed && styles.predictBtnPressed,
                    isPredicting && { opacity: 0.75 },
                  ]}>
                  {isPredicting ? (
                    <ActivityIndicator size="small" color={WattPrintTokens.colors.primary} />
                  ) : (
                    <Sparkles size={15} color={WattPrintTokens.colors.primary} strokeWidth={2.4} />
                  )}
                  <Text style={styles.predictBtnText}>
                    {isPredicting ? 'ĐANG TÍNH TOÁN DỰ BÁO...' : 'DỰ ĐOÁN THAY ĐỔI'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.impactCard}>
                {/* Savings Headline Badge */}
                <View style={styles.impactTopRow}>
                  <View style={styles.impactBadge}>
                    <Sparkles size={14} color={WattPrintTokens.colors.primary} strokeWidth={2.2} />
                    <Text style={styles.impactBadgeText}>ƯỚC TÍNH TIẾT KIỆM</Text>
                  </View>
                  <Text style={styles.impactVndHighlight}>
                    ~{prediction.savedVndPerWeek.toLocaleString('vi-VN')} đ/tuần
                  </Text>
                </View>

                {/* High Contrast Comparison Row */}
                <View style={styles.impactCompareRow}>
                  {/* Baseline Pillar */}
                  <View style={styles.pillarBox}>
                    <Text style={styles.pillarLabel}>MỨC NỀN ĐO ĐẠC</Text>
                    <View style={styles.pillarValRow}>
                      <Text style={styles.pillarVal}>
                        {currentTemplate.baselineKwh.toFixed(1)}
                      </Text>
                      <Text style={styles.pillarUnit}>kWh/ngày</Text>
                    </View>
                    <Text style={styles.pillarSub}>Trung bình 14 ngày</Text>
                  </View>

                  {/* Arrow & Delta in the middle */}
                  <View style={styles.pillarDivider}>
                    <ArrowRight size={18} color={WattPrintTokens.colors.secondary} strokeWidth={2.2} />
                    <View style={styles.pillarDeltaBadge}>
                      <Text style={styles.pillarDeltaText}>-{prediction.pct}%</Text>
                    </View>
                  </View>

                  {/* Target Pillar - Solid Primary Green Card (Max Contrast) */}
                  <View style={[styles.pillarBox, styles.pillarBoxTarget]}>
                    <Text style={styles.pillarLabelTarget}>MỤC TIÊU MỚI</Text>
                    <View style={styles.pillarValRow}>
                      <Text style={styles.pillarValTarget}>
                        {prediction.targetKwh.toFixed(1)}
                      </Text>
                      <Text style={styles.pillarUnitTarget}>kWh/ngày</Text>
                    </View>
                    <Text style={styles.pillarSubTarget}>
                      Giảm {prediction.savedKwhPerDay.toFixed(1)} kWh/ngày
                    </Text>
                  </View>
                </View>

                {/* Contextual Tariff & Sufficiency Insight */}
                <View style={styles.impactSummaryBox}>
                  <Text style={styles.impactSummaryText}>{prediction.summary}</Text>
                  <Text style={styles.impactTariffNote}>
                    Ước tính cắt giảm {prediction.savedKwhPerDay.toFixed(1)} kWh/ngày, hạn chế nguy cơ nhảy sang Bậc 4 EVN (2.860 đ/kWh).
                  </Text>
                </View>

                <View style={styles.predictedStatusRow}>
                  <View style={styles.predictedStatusDot} />
                  <Text style={styles.predictedStatusText}>
                    Đã tính toán dự báo theo mục tiêu mới
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Sticky CTA Button at Bottom */}
          <View style={styles.footerWrap}>
            <Pressable
              onPress={handleConfirmStart}
              style={({ pressed }) => [
                styles.startBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
              ]}>
              <Text style={styles.startBtnText}>BẮT ĐẦU THỬ NGHIỆM (7 NGÀY)</Text>
            </Pressable>
          </View>
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
    fontSize: 20,
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
  nameBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E7DB',
  },
  nameBannerLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  nameBannerTitle: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
    color: WattPrintTokens.colors.primary, // #164437
  },
  sectionLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.secondary, // #4A6B60
    marginTop: 6,
  },
  deviceRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  deviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: WattPrintTokens.radii.pill,
  },
  deviceChipSelected: {
    backgroundColor: WattPrintTokens.colors.primary, // #164437
  },
  deviceChipText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.primary,
  },
  deviceChipTextSelected: {
    color: '#FFFFFF',
  },
  adjustCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  adjustInfo: {
    flex: 1,
    gap: 3,
  },
  adjustTitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    color: WattPrintTokens.colors.primary,
  },
  adjustSub: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
    borderRadius: WattPrintTokens.radii.pill,
    padding: 4,
    gap: 8,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.94 }],
  },
  stepBtnText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
    color: WattPrintTokens.colors.primary,
    lineHeight: 18,
  },
  stepValue: {
    fontFamily: Fonts.monoMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.primary,
    minWidth: 54,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E7EBE1',
  },
  toggleBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: WattPrintTokens.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBoxActive: {
    backgroundColor: WattPrintTokens.colors.accentDeep,
    borderColor: WattPrintTokens.colors.accentDeep,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  toggleLabel: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: WattPrintTokens.colors.primary,
    lineHeight: 17,
  },
  impactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  impactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E7EBE1',
  },
  impactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E7EBE1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: WattPrintTokens.radii.pill,
  },
  impactBadgeText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.primary,
  },
  impactVndHighlight: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  impactCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillarBox: {
    flex: 1,
    backgroundColor: WattPrintTokens.colors.neutralGround, // #F2F4ED
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  pillarBoxTarget: {
    backgroundColor: WattPrintTokens.colors.primary, // #164437 - Solid primary green
  },
  pillarLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.4,
    color: WattPrintTokens.colors.secondary,
  },
  pillarLabelTarget: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.4,
    color: WattPrintTokens.colors.tertiary, // #B5E930 - Crisp neon lime
  },
  pillarValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  pillarVal: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 22,
    color: WattPrintTokens.colors.primary,
  },
  pillarValTarget: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 22,
    color: '#FFFFFF', // Crisp White
  },
  pillarUnit: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  pillarUnitTarget: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: '#CCD3C7',
  },
  pillarSub: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  pillarSubTarget: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.tertiary, // #B5E930
  },
  pillarDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pillarDeltaBadge: {
    backgroundColor: '#E4F5BE',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillarDeltaText: {
    fontFamily: Fonts.monoSemiBold,
    fontSize: 12,
    color: WattPrintTokens.colors.accentDeep,
  },
  impactSummaryBox: {
    backgroundColor: '#F7F9F5',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  impactSummaryText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: WattPrintTokens.colors.primary,
  },
  impactTariffNote: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    color: WattPrintTokens.colors.secondary,
  },
  predictCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  predictHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  predictTitle: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.primary,
  },
  predictDesc: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: WattPrintTokens.colors.secondary,
  },
  predictBtn: {
    backgroundColor: WattPrintTokens.colors.tertiary, // #B5E930
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 13,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  predictBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  predictBtnText: {
    fontFamily: Fonts.monoSemiBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.primary,
  },
  predictedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
    alignSelf: 'center',
  },
  predictedStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WattPrintTokens.colors.accentDeep,
  },
  predictedStatusText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    color: WattPrintTokens.colors.secondary,
  },
  footerWrap: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E7DB',
  },
  startBtn: {
    backgroundColor: WattPrintTokens.colors.primary, // #164437
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.tertiary, // #B5E930
  },
});
