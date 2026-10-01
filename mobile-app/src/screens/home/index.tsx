import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { BottomTabInset, Fonts, MaxContentWidth, WattPrintTokens } from '@/constants/theme';
import { useAlerts, useDashboard, useTimeline } from '@/features/energy/api';
import { BubbleBreakdown } from '@/features/energy/components/bubble-breakdown';
import { EnergyAlertsBlock } from '@/features/energy/components/energy-alerts-block';
import { EnergyTimeline } from '@/features/energy/components/energy-timeline';
import { RangePillSelector } from '@/features/energy/components/range-pill-selector';
import type { DashboardRange, UnitMode } from '@/features/energy/types';
import { useEnergyStore } from '@/features/energy/use-energy-store';

import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';

import { HeroMetric } from './components/hero-metric';
import { HomeHeader } from './components/home-header';

export function HomeScreen() {
  const router = useRouter();
  const { setActiveDeviceDetail } = useEnergyStore();
  const [range, setRange] = useState<DashboardRange>('day');
  const [unitMode, setUnitMode] = useState<UnitMode>('kwh');
  const [selectedBubbleIndex, setSelectedBubbleIndex] = useState<number>(0);

  const { data, isError, refetch } = useDashboard(range);
  const alerts = useAlerts();
  const timeline = useTimeline();
  useRefreshOnFocus();

  const handleSelectBubble = (index: number) => {
    setSelectedBubbleIndex(index);
    const selected = data?.devices[index];
    if (selected) {
      setActiveDeviceDetail(selected);
      router.push('/usage');
    }
  };

  const toggleUnit = () => {
    setUnitMode((prev) => (prev === 'kwh' ? 'cost' : 'kwh'));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <HomeHeader onPressAi={() => router.push('/copilot')} />

          {data ? (
            <>
              <HeroMetric
                kwh={data.kwh}
                cost={data.costVnd}
                deltaPct={data.deltaPct}
                period={data.period}
                comparison={data.comparison}
                unitMode={unitMode}
                onToggleUnit={toggleUnit}
              />
              <BubbleBreakdown
                devices={data.devices}
                selectedIndex={selectedBubbleIndex}
                onSelectIndex={handleSelectBubble}
              />
            </>
          ) : isError ? (
            <View style={styles.status}>
              <Text style={styles.statusText}>Không tải được dữ liệu tiêu thụ.</Text>
              <Pressable onPress={() => refetch()} accessibilityRole="button">
                <Text style={styles.retry}>THỬ LẠI</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.status}>
              <ActivityIndicator color={WattPrintTokens.colors.primary} />
            </View>
          )}

          <View style={styles.rangeSelectorWrapper}>
            <RangePillSelector selectedRange={range} onSelectRange={setRange} />
          </View>

          {alerts.data && alerts.data.length > 0 && <EnergyAlertsBlock alerts={alerts.data} />}
          {timeline.data && timeline.data.length > 0 && <EnergyTimeline appliances={timeline.data} />}
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
  status: {
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  statusText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: WattPrintTokens.colors.inkBody,
  },
  retry: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep,
  },
});
