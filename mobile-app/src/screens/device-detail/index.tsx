import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import { Card } from '@/components/common/card';
import { useDeviceUsage, type UsageRange } from '@/features/energy/api';
import { ApplianceIcon } from '@/features/energy/components/appliance-icon';
import { UnderlineTabRow } from '@/features/energy/components/underline-tab-row';
import { UsageBarChart } from '@/features/energy/components/usage-bar-chart';
import type { BubbleDevice, UsageChartItem } from '@/features/energy/types';
import { kwhText, periodLabel, toChartItems, vnd } from '@/features/energy/usage-view';

const DEV_TABS = [
  { key: 'day', label: 'NGÀY' },
  { key: 'week', label: 'TUẦN' },
  { key: 'month', label: 'THÁNG' },
];

function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}p` : `${m}p`;
}

interface DeviceDetailScreenProps {
  device: BubbleDevice;
  onBack?: () => void;
}

export function DeviceDetailScreen({ device: inputDevice, onBack }: DeviceDetailScreenProps) {
  const router = useRouter();
  const [unit, setUnit] = useState<'kwh' | 'cost'>('kwh');
  const [activeTab, setActiveTab] = useState<UsageRange>('week');
  const [offset, setOffset] = useState(0);
  const [pickedBar, setPickedBar] = useState<number | null>(null);

  const { data, isError, refetch } = useDeviceUsage(inputDevice.id, activeTab, offset);

  const chartItems: UsageChartItem[] = useMemo(() => {
    if (!data) return [];
    // cùng nhãn cột với trang Tiêu thụ; một thiết bị không chia bậc nên bỏ phần xếp chồng
    return toChartItems(
      activeTab,
      data.buckets.map((b) => ({ ...b, previous_cost_vnd: null, segments: [] }))
    ).map((item) => ({ ...item, tierSegments: undefined }));
  }, [data, activeTab]);

  const lastIndex = useMemo(() => {
    const i = chartItems.map((c) => c.kwh).reduce((acc, k, idx) => (k > 0 ? idx : acc), 0);
    return i;
  }, [chartItems]);
  const selectedBar = Math.min(pickedBar ?? lastIndex, Math.max(chartItems.length - 1, 0));

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

  const changeTab = (key: string) => {
    setActiveTab(key as UsageRange);
    setOffset(0);
    setPickedBar(null);
  };
  const changeOffset = (next: number) => {
    setOffset(next);
    setPickedBar(null);
  };

  const runs = data?.runs ?? null;
  const currentEstimate = data ? (unit === 'kwh' ? `${kwhText(data.kwh)} kWh` : `${vnd(data.cost_vnd)} đ`) : '–';
  const dateLabel = data ? periodLabel(activeTab, data.period, offset) : '';
  const stats = data
    ? [
        { label: 'Tổng điện tiêu thụ', value: `${kwhText(data.kwh)} kWh` },
        { label: 'Tiền điện của thiết bị', value: `${vnd(data.cost_vnd)} đ` },
        { label: 'Số lần bật', value: runs ? `${runs.count} lần` : 'Không xác định' },
        { label: 'Tổng thời gian chạy', value: runs ? duration(runs.minutes) : 'Không xác định' },
      ]
    : [];
  const meta = data
    ? `${Math.round(data.share_pct)}% điện cả nhà${runs?.peak_power_w ? ` · ĐỈNH ${vnd(runs.peak_power_w)} W` : ''}`
    : '';

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
              name={inputDevice.name}
              id={inputDevice.id}
              size={32}
              color={WattPrintTokens.colors.primary}
            />
          </View>
          <Text style={styles.deviceName}>{inputDevice.name}</Text>
          <Text style={styles.deviceMeta}>{meta}</Text>
        </View>

        {!data ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            {isError ? (
              <Pressable onPress={() => refetch()} accessibilityRole="button">
                <Text style={styles.backBtn}>KHÔNG TẢI ĐƯỢC · THỬ LẠI</Text>
              </Pressable>
            ) : (
              <ActivityIndicator color={WattPrintTokens.colors.primary} />
            )}
          </View>
        ) : (
          <>
            {/* Paired Stat Cards (1fr 1fr) */}
            <View style={styles.pairedGrid}>
              {/* Card 1: Average */}
              <Card
                className="border-0 shadow-none bg-white rounded-[20px] p-4 gap-1.5"
                style={styles.statCard}>
                <Text style={styles.statEyebrow}>CÔNG SUẤT TRUNG BÌNH</Text>
                <View style={styles.statValueRow}>
                  <Text style={styles.statValue}>
                    {runs?.avg_power_w ? vnd(runs.avg_power_w) : '–'}
                  </Text>
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
                  <Text style={styles.statValue}>{vnd(data.cost_vnd / 1000)}</Text>
                  <Text style={styles.statUnit}>nghìn đồng</Text>
                </View>
                <Text style={styles.statLede}>trong kỳ đang xem</Text>
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
                onChange={changeTab}
                fullWidth={true}
              />

              {/* Date Context Navigator */}
              <View style={styles.dateNavRow}>
                <Pressable
                  hitSlop={10}
                  onPress={() => changeOffset(offset - 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Kỳ trước"
                  style={styles.dateNavBtn}>
                  <Text style={styles.dateNavChevron}>‹</Text>
                </Pressable>
                <Text style={styles.dateNavLabel}>{dateLabel}</Text>
                <Pressable
                  hitSlop={10}
                  disabled={offset >= 0}
                  onPress={() => changeOffset(offset + 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Kỳ tiếp theo"
                  style={[styles.dateNavBtn, offset >= 0 && styles.dateNavBtnDisabled]}>
                  <Text style={[styles.dateNavChevron, offset >= 0 && styles.dateNavChevronDisabled]}>
                    ›
                  </Text>
                </Pressable>
              </View>

              {/* Period Summary Chip */}
              <View style={styles.estimationBanner}>
                <Text style={styles.estimationText}>
                  Trong kỳ: <Text style={styles.estimationHighlight}>{currentEstimate}</Text>
                  {data.delta_pct === null
                    ? ''
                    : ` (${data.delta_pct <= 0 ? 'giảm' : 'tăng'} ${Math.abs(Math.round(data.delta_pct))}% so với kỳ trước)`}
                </Text>
              </View>

              {/* Bar Chart with Numbers on Each Column */}
              <UsageBarChart
                items={chartItems}
                selectedIndex={selectedBar}
                onSelect={setPickedBar}
                height={140}
                unitMode={unit}
                showLegend={false}
              />

              {/* 4 Stat Rows */}
              <View style={styles.statsList}>
                {stats.map((st) => (
                  <View key={st.label} style={styles.statRow}>
                    <Text style={styles.statRowLabel}>{st.label}</Text>
                    <Text style={styles.statRowValue}>{st.value}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.statRowLabel}>{data.note}</Text>
            </Card>
          </>
        )}
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
