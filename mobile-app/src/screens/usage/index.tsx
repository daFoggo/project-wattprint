import React, { lazy, useDeferredValue, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QueryBoundary } from '@/components/common/query-boundary';
import { Fonts, WattPrintTokens } from '@/constants/theme';
import { deviceUsageQueryOptions } from '@/features/energy/api';
import { UnderlineTabRow } from '@/features/energy/components/underline-tab-row';
import type { BubbleDevice, UsageTab } from '@/features/energy/types';
import { useEnergyStore } from '@/features/energy/use-energy-store';

import { UsageBreakdownSection } from './components/usage-breakdown-section';
import { UsageChartSection } from './components/usage-chart-section';
import {
  UsageBreakdownSkeleton,
  UsageChartSkeleton,
  UsageComparisonSkeleton,
} from './components/usage-skeletons';

// Nạp theo nhu cầu: phần cuối trang (so sánh tháng + Copilot) chỉ được đánh giá module khi cần.
const UsageComparisonSection = lazy(() => import('./components/usage-comparison-section'));

const TABS: { key: UsageTab; label: string }[] = [
  { key: 'day', label: 'NGÀY' },
  { key: 'week', label: 'TUẦN' },
  { key: 'month', label: 'THÁNG' },
];

export function UsageScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    unit,
    toggleUnit,
    usageTab,
    setUsageTab,
    selectedDeviceIndex,
    setSelectedDeviceIndex,
    setActiveDeviceDetail,
  } = useEnergyStore();

  // kỳ đang xem: 0 là kỳ hiện tại, -1 là kỳ trước nó, ...
  const [offset, setOffset] = useState(0);
  const [pickedBar, setPickedBar] = useState<number | null>(null);

  // Tab và nút ‹ › phản hồi ngay; dữ liệu theo sau khi tải xong. Trong lúc chờ giữ nội dung cũ,
  // hơi mờ đi (Tier 4), không đổi thành skeleton.
  const deferredTab = useDeferredValue(usageTab);
  const deferredOffset = useDeferredValue(offset);
  const refreshing = deferredTab !== usageTab || deferredOffset !== offset;
  // so sánh luôn theo tháng: ở tab Tháng thì theo tháng đang xem, còn lại là tháng hiện tại
  const monthOffset = deferredTab === 'month' ? deferredOffset : 0;

  // Chạm vào thiết bị: đẩy màn chi tiết bằng stack native. Module màn chi tiết và dữ liệu của nó
  // được nạp trước (song song với animation) nên màn đẩy vào đã có nội dung, không nhấp nháy.
  const openDevice = (device: BubbleDevice) => {
    setActiveDeviceDetail(device);
    void import('@/screens/device-detail/index');
    void queryClient.prefetchQuery(deviceUsageQueryOptions(device.id, 'month', 0));
    router.push('/usage/device');
  };

  const changeTab = (key: UsageTab) => {
    setUsageTab(key);
    setOffset(0);
    setPickedBar(null);
  };
  const changeOffset = (next: number) => {
    setOffset(next);
    setPickedBar(null);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* UNIFIED HERO SECTION: Header + Time Tabs + Date Navigator + Hero Metric + Bar Chart */}
          <View style={styles.topHeroBlock}>
            {/* Header Row: Title & Unit Pill Switch */}
            <View style={styles.titleRow}>
              <Text style={styles.screenTitle}>Tiêu thụ</Text>

              {/* Metric Mode Pill Switch: kWh ⇄ VND */}
              <View style={styles.pillTrack}>
                {(['kwh', 'cost'] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => unit !== mode && toggleUnit()}
                    accessibilityRole="button"
                    accessibilityLabel={mode === 'kwh' ? 'Xem theo số điện kWh' : 'Xem theo tiền VND'}
                    style={[styles.pillBtn, unit === mode && styles.pillBtnActive]}>
                    <Text style={[styles.pillLabel, unit === mode && styles.pillLabelActive]}>
                      {mode === 'kwh' ? 'kWh' : 'VND'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Underline Range Tabs with continuous subtle rail */}
            <UnderlineTabRow
              tabs={TABS}
              activeKey={usageTab}
              onChange={(key) => changeTab(key as UsageTab)}
              fullWidth={true}
            />

            <View style={[styles.sectionStack, refreshing && styles.refreshing]}>
              <QueryBoundary fallback={<UsageChartSkeleton />} errorMessage="Không tải được dữ liệu tiêu thụ.">
                <UsageChartSection
                  range={deferredTab}
                  offset={deferredOffset}
                  unit={unit}
                  pickedBar={pickedBar}
                  onPickBar={setPickedBar}
                  onChangeOffset={changeOffset}
                />
              </QueryBoundary>
            </View>
          </View>

          {/* REMAINING SECTION CARDS FOR USAGE */}
          <View style={styles.cardsContainer}>
            <View style={refreshing && styles.refreshing}>
              <QueryBoundary fallback={<UsageBreakdownSkeleton />} errorMessage="Không tải được phân bổ thiết bị.">
                <UsageBreakdownSection
                  range={deferredTab}
                  offset={deferredOffset}
                  unit={unit}
                  selectedIndex={selectedDeviceIndex}
                  onSelectIndex={setSelectedDeviceIndex}
                  onOpenDevice={openDevice}
                />
              </QueryBoundary>
            </View>

            <View style={refreshing && styles.refreshing}>
              <QueryBoundary fallback={<UsageComparisonSkeleton />} errorMessage="Không tải được so sánh theo tháng.">
                <UsageComparisonSection monthOffset={monthOffset} unit={unit} />
              </QueryBoundary>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 0,
  },
  topHeroBlock: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  screenTitle: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 28,
    color: WattPrintTokens.colors.primary, // #164437
  },
  pillTrack: {
    flexDirection: 'row',
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
    borderRadius: WattPrintTokens.radii.pill,
    padding: 3,
    gap: 2,
  },
  pillBtn: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: WattPrintTokens.radii.pill,
    backgroundColor: 'transparent',
  },
  pillBtnActive: {
    backgroundColor: WattPrintTokens.colors.primary, // #164437
  },
  pillLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  pillLabelActive: {
    color: WattPrintTokens.colors.tertiary, // #B5E930
  },
  cardsContainer: {
    backgroundColor: WattPrintTokens.colors.neutralGround, // #F2F4ED
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 88,
    gap: 14,
  },
  sectionStack: {
    gap: 14,
  },
  refreshing: {
    opacity: 0.55,
  },
});
