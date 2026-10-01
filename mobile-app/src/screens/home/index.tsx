import React, { useDeferredValue, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { QueryBoundary } from '@/components/common/query-boundary';
import { BottomTabInset, MaxContentWidth, WattPrintTokens } from '@/constants/theme';
import { usageQueryOptions } from '@/features/energy/api';
import { RangePillSelector } from '@/features/energy/components/range-pill-selector';
import type { DashboardRange, UnitMode } from '@/features/energy/types';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';

import { AlertsSection } from './components/alerts-section';
import { HeroSection } from './components/hero-section';
import { HomeHeader } from './components/home-header';
import { AlertsSkeleton, HeroSectionSkeleton, TimelineSkeleton } from './components/home-skeletons';
import { TimelineSection } from './components/timeline-section';

export function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [range, setRange] = useState<DashboardRange>('day');
  const [unitMode, setUnitMode] = useState<UnitMode>('kwh');

  // Đổi tab kỳ: tab sáng ngay (range), dữ liệu đổi sau khi tải xong (deferredRange). Trong lúc chờ
  // giữ nguyên nội dung cũ, hơi mờ đi (Tier 4), không thay bằng skeleton.
  const deferredRange = useDeferredValue(range);
  const refreshing = deferredRange !== range;

  useRefreshOnFocus();

  // Nạp trước hai kỳ còn lại: bấm Tuần/Tháng hoặc sang tab Tiêu thụ là có số ngay
  useEffect(() => {
    for (const r of ['day', 'week', 'month'] as const) {
      queryClient.prefetchQuery(usageQueryOptions(r, 0));
    }
  }, [queryClient]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <HomeHeader onPressAi={() => router.push('/copilot')} />

          <View style={refreshing && styles.refreshing}>
            <QueryBoundary fallback={<HeroSectionSkeleton />} errorMessage="Không tải được dữ liệu tiêu thụ.">
              <HeroSection
                range={deferredRange}
                pickedRange={range}
                unitMode={unitMode}
                onToggleUnit={() => setUnitMode((prev) => (prev === 'kwh' ? 'cost' : 'kwh'))}
              />
            </QueryBoundary>
          </View>

          <View style={styles.rangeSelectorWrapper}>
            <RangePillSelector selectedRange={range} onSelectRange={setRange} />
          </View>

          <QueryBoundary fallback={<AlertsSkeleton />} errorTone="dark" errorMessage="Không tải được cảnh báo.">
            <AlertsSection />
          </QueryBoundary>

          <QueryBoundary fallback={<TimelineSkeleton />} errorMessage="Không tải được nhật ký thiết bị.">
            <TimelineSection />
          </QueryBoundary>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WattPrintTokens.colors.neutral, // #FFFFFF throughout
  },
  scrollContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: WattPrintTokens.colors.neutral,
  },
  container: {
    flexGrow: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
    paddingHorizontal: WattPrintTokens.spacing.gutter, // 24px gutter on white screens
    paddingBottom: BottomTabInset + 32,
    gap: 14,
  },
  rangeSelectorWrapper: {
    paddingVertical: 4,
  },
  refreshing: {
    opacity: 0.55,
  },
});
