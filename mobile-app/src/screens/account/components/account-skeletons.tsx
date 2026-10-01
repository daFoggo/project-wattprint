import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonCircle } from '@/components/common/skeleton';
import { WattPrintTokens } from '@/constants/theme';

function RowsCard({ rows }: { rows: number }) {
  return (
    <View style={styles.card}>
      <Skeleton width={110} height={12} />
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={130} height={14} />
          <Skeleton width={90} height={14} />
        </View>
      ))}
    </View>
  );
}

/** Hồ sơ hộ, hai thẻ trạng thái và thẻ thông tin nhà. */
export function HouseholdSkeleton() {
  return (
    <>
      <View style={styles.profile}>
        <SkeletonCircle size={56} />
        <View style={{ gap: 8 }}>
          <Skeleton width={150} height={17} />
          <Skeleton width={110} height={13} />
        </View>
      </View>
      <View style={styles.pair}>
        <View style={[styles.card, { flex: 1, gap: 8 }]}>
          <Skeleton width={70} height={12} />
          <Skeleton width={100} height={16} />
        </View>
        <View style={[styles.card, { flex: 1, gap: 8 }]}>
          <Skeleton width={70} height={12} />
          <Skeleton width={100} height={16} />
        </View>
      </View>
      <RowsCard rows={7} />
    </>
  );
}

export function ModelSkeleton() {
  return <RowsCard rows={5} />;
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 8 },
  pair: { flexDirection: 'row', gap: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl,
    paddingVertical: 18,
    paddingHorizontal: 22,
    gap: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
