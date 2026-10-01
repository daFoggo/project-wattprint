import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonCircle } from '@/components/common/skeleton';
import { WattPrintTokens } from '@/constants/theme';

const BAR_HEIGHTS = [60, 78, 70, 54, 8, 8, 8];

/** Phần có dữ liệu: dòng meta, hai thẻ chỉ số, thẻ biểu đồ mức tiêu thụ. */
export function DeviceDetailBodySkeleton() {
  return (
    <>
      <View style={styles.center}>
        <Skeleton width={190} height={14} />
      </View>
      <View style={styles.pair}>
        {[0, 1].map((i) => (
          <View key={i} style={[styles.card, styles.stat]}>
            <Skeleton width="70%" height={12} />
            <Skeleton width={90} height={34} />
            <Skeleton width="55%" height={13} />
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <Skeleton width={110} height={12} />
        <Skeleton height={34} />
        <View style={styles.center}>
          <Skeleton width={190} height={18} />
        </View>
        <View style={styles.center}>
          <Skeleton width={260} height={30} />
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
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.statRow}>
            <Skeleton width="45%" height={14} />
            <Skeleton width="25%" height={14} />
          </View>
        ))}
      </View>
    </>
  );
}

/** Skeleton cả màn hình chi tiết (lúc nạp module `React.lazy`): vỏ + phần có dữ liệu. */
export function DeviceDetailSkeleton() {
  return (
    <View style={styles.page}>
      <View style={styles.topRow}>
        <Skeleton width={96} height={16} />
        <Skeleton width={112} height={32} radius={WattPrintTokens.radii.pill} />
      </View>
      <View style={styles.identity}>
        <SkeletonCircle size={70} />
        <Skeleton width={150} height={26} />
      </View>
      <DeviceDetailBodySkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: WattPrintTokens.colors.neutralGround,
    paddingHorizontal: 16,
    paddingTop: 60,
    gap: 12,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  identity: { alignItems: 'center', gap: 10 },
  center: { alignItems: 'center' },
  pair: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl,
    padding: 18,
    gap: 12,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120 },
  barCol: { alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
