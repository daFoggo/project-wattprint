import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonCircle } from '@/components/common/skeleton';
import { WattPrintTokens } from '@/constants/theme';

// Chiều cao tương đối của các cột trong biểu đồ giữ chỗ (8 cột như biểu đồ ngày)
const BAR_HEIGHTS = [28, 52, 38, 70, 96, 64, 44, 24];

/** Thanh chọn kỳ + ước tính cả kỳ + biểu đồ cột + chú giải bậc. */
export function UsageChartSkeleton() {
  return (
    <>
      <View style={styles.dateNav}>
        <Skeleton width={190} height={18} />
      </View>
      <View style={styles.banner}>
        <Skeleton width={230} height={30} radius={WattPrintTokens.radii.sm} />
      </View>
      <View style={styles.bars}>
        {BAR_HEIGHTS.map((h, i) => (
          <View key={i} style={styles.barCol}>
            <Skeleton width={20} height={12} />
            <Skeleton width={24} height={h} radius={5} />
            <Skeleton width={16} height={12} />
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={styles.legendItem}>
            <Skeleton width={13} height={13} radius={3} />
            <Skeleton width={70} height={12} />
          </View>
        ))}
      </View>
    </>
  );
}

/** Thẻ phân bổ thiết bị: vòng donut + 5 dòng bảng. */
export function UsageBreakdownSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={120} height={12} />
      <View style={styles.donut}>
        <SkeletonCircle size={212} />
        <View style={styles.donutHole} />
      </View>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.tableRow}>
          <Skeleton width={40} height={40} radius={WattPrintTokens.radii.md} />
          <Skeleton height={16} style={{ flex: 1 }} />
          <Skeleton width={64} height={16} />
          <Skeleton width={36} height={16} />
        </View>
      ))}
    </View>
  );
}

/** Thẻ so sánh theo tháng: câu kết luận, hai chỉ số, đường biểu đồ, khối gợi ý Copilot. */
export function UsageComparisonSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={150} height={12} />
      <View style={{ gap: 8 }}>
        <Skeleton width="92%" height={20} />
        <Skeleton width="60%" height={20} />
      </View>
      <View style={styles.metrics}>
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width={120} height={12} />
          <Skeleton width={110} height={28} />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width={120} height={12} />
          <Skeleton width={110} height={28} />
        </View>
      </View>
      <Skeleton height={135} radius={WattPrintTokens.radii.md} />
      <View style={styles.insight}>
        <Skeleton width={150} height={12} />
        <Skeleton width="85%" height={18} />
        <Skeleton width="100%" height={13} />
        <Skeleton width="70%" height={13} />
        <Skeleton width={190} height={34} radius={WattPrintTokens.radii.pill} />
      </View>
    </View>
  );
}

/** Skeleton cả trang cho `SuspenseFallback` của route. */
export function UsagePageSkeleton() {
  return (
    <View style={styles.page}>
      <View style={styles.title}>
        <Skeleton width={150} height={30} />
        <Skeleton width={112} height={34} radius={WattPrintTokens.radii.pill} />
      </View>
      <Skeleton height={36} />
      <UsageChartSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 60,
    gap: 14,
  },
  title: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateNav: { alignItems: 'center', paddingVertical: 2 },
  banner: { alignItems: 'center', marginVertical: 2 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 172 },
  barCol: { alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F3EC',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '29%' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl,
    paddingVertical: 20,
    paddingHorizontal: 22,
    gap: 16,
  },
  donut: { alignItems: 'center', justifyContent: 'center', height: 250 },
  donutHole: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#FFFFFF',
  },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metrics: { flexDirection: 'row', gap: 16 },
  insight: {
    backgroundColor: WattPrintTokens.colors.primaryContainer,
    borderRadius: WattPrintTokens.radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
});
