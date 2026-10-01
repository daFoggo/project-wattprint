import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, Sparkles, X } from 'lucide-react-native';

import { QueryBoundary } from '@/components/common/query-boundary';
import { Fonts, WattPrintTokens } from '@/constants/theme';
import {
  useExperimentProposals,
  useExperimentTemplates,
  type ExperimentAppliance,
  type ExperimentProposal,
} from '@/features/energy/api';
import {
  APPLIANCE_ICON_ID,
  UNAVAILABLE_REASON,
  actionFromProposal,
  actionFromTemplate,
  buildExperiment,
  formatKwh,
  formatVnd,
  roundVnd,
  totalSaving,
} from '@/features/energy/experiment-utils';
import type { ActiveExperiment } from '@/features/energy/types';

import { ApplianceIcon } from './appliance-icon';
import { ExperimentActionEditor } from './experiment-action-editor';
import { CreateExperimentSkeleton } from './experiment-skeletons';

function tick() {
  try {
    Haptics.selectionAsync();
  } catch {}
}

/** Cấu hình một đề xuất (`proposal`), hoặc tạo thử nghiệm mới (`proposal` rỗng); `preset` là thiết bị tick sẵn (từ trợ lý AI). */
export interface ConfigMode {
  proposal: ExperimentProposal | null;
  preset: ExperimentAppliance | null;
}

interface CreateExperimentSheetProps {
  visible: boolean;
  mode: ConfigMode;
  onClose: () => void;
  onStart: (experiment: ActiveExperiment) => void;
}

export function CreateExperimentSheet({ visible, mode, onClose, onStart }: CreateExperimentSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>{mode.proposal ? 'ĐỀ XUẤT CHO BẠN' : 'TẠO THỬ NGHIỆM'}</Text>
              <Text style={styles.title}>Thiết lập thử nghiệm</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}>
              <X size={18} color={WattPrintTokens.colors.primary} strokeWidth={2.2} />
            </Pressable>
          </View>

          <QueryBoundary fallback={<CreateExperimentSkeleton />} errorMessage="Không tải được gợi ý thử nghiệm.">
            <ConfigBody mode={mode} onClose={onClose} onStart={onStart} />
          </QueryBoundary>
        </View>
      </View>
    </Modal>
  );
}

function ConfigBody({
  mode,
  onClose,
  onStart,
}: {
  mode: ConfigMode;
  onClose: () => void;
  onStart: (experiment: ActiveExperiment) => void;
}) {
  const { data: templates } = useExperimentTemplates();
  const { data: proposals } = useExperimentProposals();

  // Trợ lý gợi ý một thiết bị: nếu có đề xuất riêng cho thiết bị đó thì mở thẳng đề xuất ấy.
  const proposal =
    mode.proposal ?? (mode.preset ? (proposals.items.find((p) => p.id === `single-${mode.preset}`) ?? null) : null);
  const candidates = proposal
    ? proposal.actions.map(actionFromProposal)
    : templates.filter((t) => t.available).map(actionFromTemplate);
  const baselines = Object.fromEntries(templates.map((t) => [t.appliance, t.baseline]));

  const [ticked, setTicked] = useState<ExperimentAppliance[] | null>(null);
  const [amounts, setAmounts] = useState<Partial<Record<ExperimentAppliance, number>>>({});

  const tickedNow = ticked ?? (proposal ? candidates.map((c) => c.appliance) : mode.preset ? [mode.preset] : []);
  const actions = candidates
    .filter((c) => tickedNow.includes(c.appliance))
    .map((c) => ({ ...c, amount: amounts[c.appliance] ?? c.amount }));

  const total = totalSaving(actions, proposals.vnd_per_kwh);
  const title = proposal?.title ?? `Thử nghiệm: ${actions.map((a) => a.name).join(' + ')}`;

  const toggle = (appliance: ExperimentAppliance) => {
    tick();
    setTicked(tickedNow.includes(appliance) ? tickedNow.filter((a) => a !== appliance) : [...tickedNow, appliance]);
  };

  const handleStart = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onStart(
      buildExperiment({
        title,
        kind: proposal?.kind ?? 'custom',
        actions,
        baselines,
        vndPerKwh: proposals.vnd_per_kwh,
      })
    );
    onClose();
  };

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {proposal ? (
          <View style={styles.nameBannerCard}>
            <Text style={styles.nameBannerLabel}>
              {proposal.kind === 'scenario' ? `KỊCH BẢN · ${proposal.appliances.length} THIẾT BỊ` : 'THỬ NGHIỆM ĐỀ XUẤT'}
            </Text>
            <Text style={styles.nameBannerTitle}>{proposal.title}</Text>
            <Text style={styles.bannerText}>{proposal.summary}</Text>
            <Text style={styles.bannerText}>{proposal.reason}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>1. CHỌN THIẾT BỊ</Text>
            <View style={styles.tickList}>
              {templates.map((t, i) => {
                const on = tickedNow.includes(t.appliance);
                return (
                  <Pressable
                    key={t.appliance}
                    disabled={!t.available}
                    onPress={() => toggle(t.appliance)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on, disabled: !t.available }}
                    style={({ pressed }) => [
                      styles.tickRow,
                      i > 0 && styles.tickRowBorder,
                      !t.available && styles.deviceChipDisabled,
                      pressed && { opacity: 0.75 },
                    ]}>
                    <View style={[styles.checkBox, on && styles.checkBoxOn]}>
                      {on && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                    <ApplianceIcon
                      name=""
                      id={APPLIANCE_ICON_ID[t.appliance]}
                      size={20}
                      color={WattPrintTokens.colors.primary}
                    />
                    <View style={styles.tickInfo}>
                      <Text style={styles.tickName}>{t.name}</Text>
                      <Text style={styles.adjustSub}>{t.available ? t.description : UNAVAILABLE_REASON}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {actions.length > 0 && (
          <Text style={styles.sectionLabel}>{proposal ? '1.' : '2.'} MỨC GIẢM CỦA TỪNG THIẾT BỊ</Text>
        )}
        {actions.map((a) => (
          <ExperimentActionEditor
            key={a.appliance}
            action={a}
            baseline={baselines[a.appliance]}
            vndPerKwh={proposals.vnd_per_kwh}
            onChange={(amount) => setAmounts((prev) => ({ ...prev, [a.appliance]: amount }))}
          />
        ))}

        <Text style={styles.sectionLabel}>{proposal || actions.length === 0 ? '2.' : '3.'} TỔNG HỢP CẢ THỬ NGHIỆM</Text>
        <View style={styles.impactCard}>
          <View style={styles.impactTopRow}>
            <View style={styles.impactBadge}>
              <Sparkles size={14} color={WattPrintTokens.colors.primary} strokeWidth={2.2} />
              <Text style={styles.impactBadgeText}>ƯỚC TÍNH TIẾT KIỆM</Text>
            </View>
            <Text style={styles.impactVndHighlight}>~{formatVnd(roundVnd(total.vndPerMonth))}/tháng</Text>
          </View>

          {actions.length === 0 ? (
            <Text style={styles.impactTariffNote}>Chọn ít nhất một thiết bị để xem tổng hợp.</Text>
          ) : (
            <View style={styles.totalRow}>
              <TotalBox label="MỖI NGÀY" value={formatKwh(total.kwhPerDay)} unit="kWh" />
              <TotalBox label="MỖI THÁNG" value={formatKwh(total.kwhPerMonth)} unit="kWh" />
              <TotalBox label="TIỀN ĐIỆN" value={formatVnd(roundVnd(total.vndPerMonth))} unit="/tháng" accent />
            </View>
          )}

          <View style={styles.impactSummaryBox}>
            <Text style={styles.impactTariffNote}>
              Ước tính từ công suất đo được của thiết bị, nhân với phần thời gian không chạy, quy đổi 30 ngày theo{' '}
              {formatVnd(proposals.vnd_per_kwh)}/kWh. Số tiết kiệm thật được đo lại từng ngày sau khi bắt đầu.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footerWrap}>
        <Pressable
          onPress={handleStart}
          disabled={actions.length === 0}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.startBtn,
            actions.length === 0 && styles.startBtnDisabled,
            pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
          ]}>
          <Text style={styles.startBtnText}>BẮT ĐẦU THỬ NGHIỆM</Text>
        </Pressable>
      </View>
    </>
  );
}

function TotalBox({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <View style={[styles.totalBox, accent && styles.totalBoxAccent]}>
      <Text style={[styles.totalLabel, accent && styles.totalLabelAccent]}>{label}</Text>
      <Text style={[styles.totalValue, accent && styles.totalValueAccent]}>{value}</Text>
      <Text style={[styles.totalUnit, accent && styles.totalLabelAccent]}>{unit}</Text>
    </View>
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
  adjustSub: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
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
  impactSummaryBox: {
    backgroundColor: '#F7F9F5',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  impactTariffNote: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
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
  deviceChipDisabled: {
    opacity: 0.45,
  },
  bannerText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: WattPrintTokens.colors.secondary,
  },
  tickList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
  },
  tickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  tickRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: WattPrintTokens.colors.neutralLine,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: WattPrintTokens.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: {
    backgroundColor: WattPrintTokens.colors.accentDeep,
    borderColor: WattPrintTokens.colors.accentDeep,
  },
  tickInfo: {
    flex: 1,
    gap: 2,
  },
  tickName: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    color: WattPrintTokens.colors.primary,
  },
  totalRow: {
    flexDirection: 'row',
    gap: 8,
  },
  totalBox: {
    flex: 1,
    backgroundColor: WattPrintTokens.colors.neutralGround,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 2,
  },
  totalBoxAccent: {
    backgroundColor: WattPrintTokens.colors.primary,
  },
  totalLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.4,
    color: WattPrintTokens.colors.secondary,
  },
  totalLabelAccent: {
    color: WattPrintTokens.colors.tertiary,
  },
  totalValue: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 18,
    color: WattPrintTokens.colors.primary,
  },
  totalValueAccent: {
    color: '#FFFFFF',
  },
  totalUnit: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    color: WattPrintTokens.colors.secondary,
  },
  startBtnDisabled: {
    opacity: 0.4,
  },
});
