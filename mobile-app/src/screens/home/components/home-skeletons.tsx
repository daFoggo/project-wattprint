import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonCircle } from '@/components/common/skeleton';
import { WattPrintTokens } from '@/constants/theme';

// Kích thước bám theo HeroMetric (câu 2 dòng + số 56pt) và BubbleBreakdown (cao 270) để không giật.
const BUBBLES = [
  { x: 50, y: 46, size: 120 },
  { x: 18, y: 21, size: 96 },
  { x: 82, y: 25, size: 80 },
  { x: 84, y: 74, size: 70 },
  { x: 20, y: 77, size: 58 },
];

export function HeroSkeleton() {
  return (
    <View style={styles.hero}>
      <View style={styles.sentence}>
        <Skeleton width="92%" height={15} />
        <Skeleton width="64%" height={15} />
      </View>
      <View style={styles.metricRow}>
        <Skeleton width={150} height={52} radius={WattPrintTokens.radii.md} />
        <Skeleton width={86} height={30} radius={WattPrintTokens.radii.pill} />
      </View>
    </View>
  );
}

export function BubblesSkeleton() {
  return (
    <View style={styles.bubbles}>
      {BUBBLES.map((b, i) => (
        <View
          key={i}
          style={[
            styles.bubble,
            { left: `${b.x}%`, top: `${b.y}%`, marginLeft: -b.size / 2, marginTop: -b.size / 2 },
          ]}>
          <SkeletonCircle size={b.size} />
        </View>
      ))}
    </View>
  );
}

/** Hero + bong bóng: một ranh giới Suspense vì cùng đọc một query. */
export function HeroSectionSkeleton() {
  return (
    <>
      <HeroSkeleton />
      <BubblesSkeleton />
    </>
  );
}

export function AlertsSkeleton() {
  return (
    <View style={styles.alerts}>
      <View style={styles.rowBetween}>
        <Skeleton width={72} height={12} tone="dark" />
        <Skeleton width={84} height={12} tone="dark" />
      </View>
      {[0.95, 0.8, 0.9].map((w, i) => (
        <View key={i} style={styles.alertRow}>
          <Skeleton width={56} height={12} tone="dark" />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width={`${w * 100}%`} height={14} tone="dark" />
            <Skeleton width="55%" height={14} tone="dark" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function TimelineSkeleton() {
  return (
    <View style={styles.timeline}>
      <Skeleton width={72} height={16} style={{ marginBottom: 18 }} />
      <View style={styles.timelineBody}>
        <View style={styles.rail} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.event}>
            <Skeleton width={12} height={12} radius={4} style={styles.dot} />
            <Skeleton width={44} height={12} style={{ marginBottom: 7 }} />
            <Skeleton height={74} radius={WattPrintTokens.radii.md} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Skeleton cả trang cho `SuspenseFallback` của route (lúc nạp module màn hình). */
export function HomePageSkeleton() {
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={{ gap: 6 }}>
          <Skeleton width={150} height={12} />
          <Skeleton width={190} height={22} />
        </View>
        <SkeletonCircle size={46} />
      </View>
      <HeroSectionSkeleton />
      <Skeleton height={44} radius={WattPrintTokens.radii.pill} />
      <AlertsSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: WattPrintTokens.colors.neutral,
    paddingTop: 60,
    paddingHorizontal: WattPrintTokens.spacing.gutter,
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { paddingTop: 10, paddingBottom: 22, gap: 8 },
  sentence: { gap: 6, maxWidth: 320 },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
  bubbles: { height: 270, width: '100%', position: 'relative' },
  bubble: { position: 'absolute' },
  alerts: {
    backgroundColor: WattPrintTokens.colors.primary,
    borderRadius: WattPrintTokens.radii.xl,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  timeline: { paddingTop: 10, paddingBottom: 24 },
  timelineBody: { position: 'relative', paddingLeft: 26 },
  rail: {
    position: 'absolute',
    left: 5,
    top: 6,
    bottom: 24,
    width: 2,
    backgroundColor: WattPrintTokens.colors.neutralLine,
  },
  event: { position: 'relative', paddingBottom: 14 },
  dot: { position: 'absolute', left: -26, top: 4 },
});
