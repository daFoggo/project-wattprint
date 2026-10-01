import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import type { ExperimentBaseline } from '@/features/energy/api';
import {
  APPLIANCE_ICON_ID,
  actionSaving,
  formatKwh,
  formatMinutes,
  formatVnd,
  roundVnd,
  type EditableAction,
} from '@/features/energy/experiment-utils';

import { ApplianceIcon } from './appliance-icon';

interface Props {
  action: EditableAction;
  baseline: ExperimentBaseline | undefined;
  vndPerKwh: number;
  onChange: (amount: number) => void;
}

/** Khối cấu hình một thiết bị: mức nền đo được, mức cắt giảm chỉnh bằng −/+, và dự đoán riêng thiết bị. */
export function ExperimentActionEditor({ action, baseline, vndPerKwh, onChange }: Props) {
  const { slider, amount } = action;
  const saving = actionSaving(action);

  const step = (dir: 1 | -1) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onChange(Math.min(slider.max, Math.max(slider.min, amount + dir * slider.step)));
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <ApplianceIcon name="" id={APPLIANCE_ICON_ID[action.appliance]} size={22} color={WattPrintTokens.colors.primary} />
        </View>
        <Text style={styles.name}>{action.name}</Text>
      </View>

      {baseline && (
        <View style={styles.baseBox}>
          <Text style={styles.baseLabel}>MỨC NỀN · TỪ {baseline.lookback_days} NGÀY GẦN NHẤT</Text>
          <View style={styles.baseGrid}>
            <Stat label="Điện" value={`${formatKwh(baseline.kwh_per_day)} kWh/ngày`} />
            <Stat label="Chạy" value={`${formatMinutes(baseline.minutes_per_day)}/ngày`} />
            <Stat
              label="Công suất khi bật"
              value={baseline.avg_power_w ? `${Math.round(baseline.avg_power_w)} W` : 'Chưa rõ'}
            />
            <Stat label="Số lượt" value={`${formatKwh(baseline.runs_per_day)} lượt/ngày`} />
          </View>
        </View>
      )}

      <View style={styles.stepperRow}>
        <Text style={styles.stepLabel}>Mức giảm</Text>
        <View style={styles.stepperWrap}>
          <Pressable
            onPress={() => step(-1)}
            disabled={amount <= slider.min}
            hitSlop={8}
            accessibilityLabel={`Giảm mức của ${action.name}`}
            style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed, amount <= slider.min && styles.stepBtnDisabled]}>
            <Minus size={16} color={WattPrintTokens.colors.primary} strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.stepValue}>
            {amount} {action.unit_label}
          </Text>
          <Pressable
            onPress={() => step(1)}
            disabled={amount >= slider.max}
            hitSlop={8}
            accessibilityLabel={`Tăng mức của ${action.name}`}
            style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed, amount >= slider.max && styles.stepBtnDisabled]}>
            <Plus size={16} color={WattPrintTokens.colors.primary} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.predict}>
        Dự đoán: bớt ~{formatKwh(saving)} kWh/ngày, ~{formatVnd(roundVnd(saving * vndPerKwh))}/ngày
      </Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: WattPrintTokens.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
    color: WattPrintTokens.colors.primary,
  },
  baseBox: {
    backgroundColor: WattPrintTokens.colors.neutralGround,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  baseLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.4,
    color: WattPrintTokens.colors.secondary,
  },
  baseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  stat: {
    width: '50%',
    gap: 1,
  },
  statLabel: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  statValue: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.primary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stepLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.primary,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WattPrintTokens.colors.primaryContainer,
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
  stepBtnDisabled: {
    opacity: 0.35,
  },
  stepValue: {
    fontFamily: Fonts.monoMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.primary,
    minWidth: 96,
    textAlign: 'center',
  },
  predict: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.accentDeep,
  },
});
