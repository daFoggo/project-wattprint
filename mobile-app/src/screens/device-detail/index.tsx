import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import { Card } from '@/components/common/card';
import { ApplianceIcon } from '@/features/energy/components/appliance-icon';
import { UnderlineTabRow } from '@/features/energy/components/underline-tab-row';
import { UsageBarChart } from '@/features/energy/components/usage-bar-chart';
import {
  DEVICE_DETAIL_AIRCON,
  DEVICE_WEEK_BARS,
  getDeviceDetail,
} from '@/features/energy/mock';
import type { BarDatum, BubbleDevice } from '@/features/energy/types';

const DEV_TABS = [
  { key: 'day', label: 'NGÀY' },
  { key: 'week', label: 'TUẦN' },
  { key: 'month', label: 'THÁNG' },
];

const DEVICE_DAY_BARS: BarDatum[] = [
  ['00', 0.2, '00:00'],
  ['03', 0.1, '03:00'],
  ['06', 0.5, '06:00'],
  ['09', 1.2, '09:00'],
  ['12', 1.6, '12:00'],
  ['15', 1.4, '15:00'],
  ['18', 1.8, '18:00'],
  ['21', 0.4, '21:00'],
];

const DEVICE_MONTH_BARS: BarDatum[] = [
  ['1', 12.5, '1 đến 4/9'],
  ['5', 15.2, '5 đến 8/9'],
  ['9', 14.0, '9 đến 12/9'],
  ['13', 16.8, '13 đến 16/9'],
  ['17', 15.4, '17 đến 20/9'],
  ['21', 17.2, '21 đến 24/9'],
  ['25', 14.6, '25 đến 28/9'],
  ['29', 11.2, '29 đến 30/9'],
];

const DEVICE_BARS_BY_TAB: Record<string, BarDatum[]> = {
  day: DEVICE_DAY_BARS,
  week: DEVICE_WEEK_BARS,
  month: DEVICE_MONTH_BARS,
};

const DATE_LABELS: Record<string, string> = {
  day: 'Hôm nay, 14 tháng 9',
  week: 'Tuần 37 (08/09 - 14/09/2026)',
  month: 'Tháng 09/2026',
};

const PERIOD_ESTIMATES: Record<string, { kwh: string; cost: string }> = {
  day: { kwh: '7,2 kWh', cost: '17.136 đ' },
  week: { kwh: '41,9 kWh', cost: '119.200 đ' },
  month: { kwh: '118,5 kWh', cost: '282.030 đ' },
};

interface DeviceDetailScreenProps {
  device?: BubbleDevice | null;
  onBack?: () => void;
}

export function DeviceDetailScreen({
  device: inputDevice,
  onBack,
}: DeviceDetailScreenProps = {}) {
  const router = useRouter();
  const [unit, setUnit] = useState<'kwh' | 'cost'>('kwh');
  const [activeTab, setActiveTab] = useState('week');
  const [selectedBar, setSelectedBar] = useState(2);

  const device = inputDevice ? getDeviceDetail(inputDevice) : DEVICE_DETAIL_AIRCON;

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const currentEstimate =
    unit === 'kwh'
      ? PERIOD_ESTIMATES[activeTab]?.kwh ?? '41,9 kWh'
      : PERIOD_ESTIMATES[activeTab]?.cost ?? '119.200 đ';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      {/* Scrollable Container */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Top Bar Actions on Ground: Back on left, Unit Switch on right */}
        <View style={styles.topActionsRow}>
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={({ pressed }) => [
              styles.backBtnWrap,
              pressed && { opacity: 0.6, transform: [{ scale: 0.96 }] },
            ]}>
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backBtn}>QUAY LẠI</Text>
          </Pressable>

          {/* Unit Toggle kWh / VND */}
          <View style={styles.pillTrack}>
            <Pressable
              onPress={() => setUnit('kwh')}
              accessibilityRole="button"
              accessibilityLabel="Xem theo số điện kWh"
              style={[styles.pillBtn, unit === 'kwh' && styles.pillBtnActive]}>
              <Text style={[styles.pillLabel, unit === 'kwh' && styles.pillLabelActive]}>
                kWh
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setUnit('cost')}
              accessibilityRole="button"
              accessibilityLabel="Xem theo tiền VND"
              style={[styles.pillBtn, unit === 'cost' && styles.pillBtnActive]}>
              <Text style={[styles.pillLabel, unit === 'cost' && styles.pillLabelActive]}>
                VND
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Identity Block on Ground */}
        <View style={styles.identityBlock}>
          <View style={styles.deviceIconBox}>
            <ApplianceIcon
              name={device.name}
              id={device.id}
              size={32}
              color={WattPrintTokens.colors.primary}
            />
          </View>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.deviceMeta}>{device.meta}</Text>
        </View>

        {/* Paired Stat Cards (1fr 1fr) */}
        <View style={styles.pairedGrid}>
          {/* Card 1: Average */}
          <Card
            className="border-0 shadow-none bg-white rounded-[20px] p-4 gap-1.5"
            style={styles.statCard}>
            <Text style={styles.statEyebrow}>CÔNG SUẤT TRUNG BÌNH</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{device.avgW}</Text>
              <Text style={styles.statUnit}>W</Text>
            </View>
            <Text style={styles.statLede}>khi đang bật</Text>
          </Card>

          {/* Card 2: Cost */}
          <Card
            className="border-0 shadow-none bg-white rounded-[20px] p-4 gap-1.5"
            style={styles.statCard}>
            <Text style={styles.statEyebrow}>CHI PHÍ</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{device.costMonth}</Text>
              <Text style={styles.statUnit}>nghìn/tháng</Text>
            </View>
            <Text style={styles.statLede}>theo mức dùng của bạn</Text>
          </Card>
        </View>

        {/* Card 3: Usage Breakdown Card */}
        <Card
          className="border-0 shadow-none bg-white rounded-[20px] p-5 gap-3"
          style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardEyebrow}>MỨC TIÊU THỤ</Text>
          </View>

          {/* Underline Range Tabs */}
          <UnderlineTabRow
            tabs={DEV_TABS}
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key);
              setSelectedBar(0);
            }}
            fullWidth={true}
          />

          {/* Date Context Navigator */}
          <View style={styles.dateNavRow}>
            <Pressable hitSlop={10} style={styles.dateNavBtn}>
              <Text style={styles.dateNavChevron}>‹</Text>
            </Pressable>
            <Text style={styles.dateNavLabel}>
              {DATE_LABELS[activeTab] || DATE_LABELS.week}
            </Text>
            <Pressable hitSlop={10} style={[styles.dateNavBtn, styles.dateNavBtnDisabled]}>
              <Text style={[styles.dateNavChevron, styles.dateNavChevronDisabled]}>›</Text>
            </Pressable>
          </View>

          {/* Period Summary Chip */}
          <View style={styles.estimationBanner}>
            <Text style={styles.estimationText}>
              Ước tính cả kỳ:{' '}
              <Text style={styles.estimationHighlight}>{currentEstimate}</Text>
            </Text>
          </View>

          {/* Bar Chart with Numbers on Each Column */}
          <UsageBarChart
            bars={DEVICE_BARS_BY_TAB[activeTab] || DEVICE_WEEK_BARS}
            selectedIndex={selectedBar}
            onSelect={setSelectedBar}
            height={140}
            unitMode={unit}
            showLegend={false}
          />

          {/* 4 Stat Rows */}
          <View style={styles.statsList}>
            {device.stats.map((st: { label: string; value: string }, idx: number) => (
              <View key={idx} style={styles.statRow}>
                <Text style={styles.statRowLabel}>{st.label}</Text>
                <Text style={styles.statRowValue}>{st.value}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WattPrintTokens.colors.neutralGround, // #F2F4ED
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 12,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  backBtnWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  backChevron: {
    fontFamily: Fonts.monoMedium,
    fontSize: 20,
    lineHeight: 22,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  backBtn: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  pillTrack: {
    flexDirection: 'row',
    backgroundColor: '#E2E6DA',
    borderRadius: WattPrintTokens.radii.pill,
    padding: 3,
    gap: 2,
  },
  pillBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: WattPrintTokens.radii.pill,
  },
  pillBtnActive: {
    backgroundColor: WattPrintTokens.colors.primary,
  },
  pillLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  pillLabelActive: {
    color: '#FFFFFF',
  },
  identityBlock: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  deviceIconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: WattPrintTokens.colors.tertiary, // #B5E930
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 28,
    lineHeight: 32,
    color: WattPrintTokens.colors.primary, // #164437
  },
  deviceMeta: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    letterSpacing: 0.52,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  pairedGrid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl, // 20px
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 6,
  },
  statEyebrow: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 26,
    color: WattPrintTokens.colors.primary, // #164437
  },
  statUnit: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.secondary,
  },
  statLede: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: WattPrintTokens.colors.secondary,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl, // 20px
    paddingVertical: 20,
    paddingHorizontal: 22,
    gap: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardEyebrow: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  dateNavBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateNavBtnDisabled: {
    opacity: 0.3,
  },
  dateNavChevron: {
    fontFamily: Fonts.monoMedium,
    fontSize: 18,
    color: WattPrintTokens.colors.primary,
    fontWeight: '600',
  },
  dateNavChevronDisabled: {
    color: WattPrintTokens.colors.secondary,
  },
  dateNavLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.primary,
  },
  estimationBanner: {
    alignSelf: 'center',
    backgroundColor: '#E7F2D8',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: WattPrintTokens.radii.pill,
  },
  estimationText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  estimationHighlight: {
    color: WattPrintTokens.colors.accentDeep,
    fontFamily: Fonts.monoMedium,
    fontWeight: '700',
  },
  statsList: {
    gap: 2,
    paddingTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  statRowLabel: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  statRowValue: {
    fontFamily: Fonts.monoMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.primary, // #164437
  },
});
