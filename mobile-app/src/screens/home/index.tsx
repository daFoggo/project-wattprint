import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { BottomTabInset, MaxContentWidth, WattPrintTokens } from '@/constants/theme';
import { BubbleBreakdown } from '@/features/energy/components/bubble-breakdown';
import { EnergyAlertsBlock } from '@/features/energy/components/energy-alerts-block';
import { EnergyTimeline } from '@/features/energy/components/energy-timeline';
import { RangePillSelector } from '@/features/energy/components/range-pill-selector';
import {
  DASHBOARD_RANGES,
  DASHBOARD_RATE,
  getDevicesForRange,
  mockAlerts,
  mockTimeline,
} from '@/features/energy/mock';
import type { DashboardRange, UnitMode } from '@/features/energy/types';
import { useEnergyStore } from '@/features/energy/use-energy-store';

import { HeroMetric } from './components/hero-metric';
import { HomeHeader } from './components/home-header';

export function HomeScreen() {
  const router = useRouter();
  const { setActiveDeviceDetail } = useEnergyStore();
  const [range, setRange] = useState<DashboardRange>('day');
  const [unitMode, setUnitMode] = useState<UnitMode>('kwh');
  const [selectedBubbleIndex, setSelectedBubbleIndex] = useState<number>(0);

  const heroData = DASHBOARD_RANGES[range];
  const cost = heroData.kwh * DASHBOARD_RATE;
  const devices = useMemo(() => getDevicesForRange(range), [range]);

  const handleSelectBubble = (index: number) => {
    setSelectedBubbleIndex(index);
    const selected = devices[index];
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
          {/* Header */}
          <HomeHeader onPressAi={() => router.push('/copilot')} />

          {/* Hero Figure & Unit Switcher */}
          <HeroMetric
            kwh={heroData.kwh}
            cost={cost}
            deltaPct={heroData.deltaPct}
            period={heroData.period}
            comparison={heroData.comparison}
            unitMode={unitMode}
            onToggleUnit={toggleUnit}
          />

          {/* Bubble Breakdown */}
          <BubbleBreakdown
            devices={devices}
            selectedIndex={selectedBubbleIndex}
            onSelectIndex={handleSelectBubble}
          />

          {/* Range Selector Pills */}
          <View style={styles.rangeSelectorWrapper}>
            <RangePillSelector
              selectedRange={range}
              onSelectRange={setRange}
            />
          </View>

          {/* Anomaly Alerts & Tips */}
          <EnergyAlertsBlock alerts={mockAlerts} />

          {/* Today Timeline */}
          <EnergyTimeline
            events={mockTimeline}
            onSeeAll={() => router.push('/usage')}
          />
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
});
