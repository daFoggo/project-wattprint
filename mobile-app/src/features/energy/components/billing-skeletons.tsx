import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/common/skeleton';
import { WattPrintTokens } from '@/constants/theme';

const DAY_HEIGHTS = [24, 30, 20, 60, 78, 34, 26, 52, 70, 40, 22, 28, 36, 58];

/**
 * Khung giữ chỗ của trang hóa đơn: thẻ tạm tính + dự báo, khối nhấn mạnh, bảng chi tiết.
 * `switcher` là nút 6 bậc / TOU thật, để vẫn bấm được khi đang tải.
 */
export function BillingBodySkeleton({ switcher }: { switcher: React.ReactNode }) {
  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <Skeleton width={150} height={12} />
          {switcher}
        </View>
        <View style={{ gap: 6 }}>
          <Skeleton width="90%" height={18} />
          <Skeleton width="55%" height={18} />
        </View>
        <View style={styles.figures}>
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width={90} height={10} />
            <Skeleton width={120} height={24} />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width={120} height={10} />
            <Skeleton width={120} height={24} />
          </View>
        </View>
        <View style={styles.bars}>
          {DAY_HEIGHTS.map((h, i) => (
            <Skeleton key={i} height={h} radius={4} style={{ flex: 1 }} />
          ))}
        </View>
      </View>

      <View style={styles.weight}>
        <Skeleton width={140} height={12} tone="dark" />
        <Skeleton width="100%" height={14} tone="dark" />
        <Skeleton width="80%" height={14} tone="dark" />
        <Skeleton height={10} radius={999} tone="dark" />
      </View>

      <View style={styles.card}>
        <Skeleton width={140} height={12} />
        <Skeleton width="85%" height={13} />
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={styles.row}>
            <Skeleton width={22} height={22} radius={4} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width={70} height={14} />
              <Skeleton width={150} height={12} />
            </View>
            <Skeleton width={56} height={14} />
            <Skeleton width={78} height={14} />
          </View>
        ))}
        <Skeleton height={48} radius={WattPrintTokens.radii.md} />
      </View>
    </>
  );
}

/** Skeleton cả trang cho `SuspenseFallback` của route. */
export function BillingPageSkeleton() {
  return (
    <View style={styles.page}>
      <Skeleton width={90} height={16} />
      <View style={{ gap: 6, paddingHorizontal: 8 }}>
        <Skeleton width={210} height={26} />
        <Skeleton width={180} height={14} />
      </View>
      <BillingBodySkeleton switcher={<Skeleton width={104} height={30} radius={WattPrintTokens.radii.pill} />} />
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl,
    paddingVertical: 20,
    paddingHorizontal: 22,
    gap: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  figures: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: WattPrintTokens.radii.md,
    backgroundColor: WattPrintTokens.colors.neutralGround,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 105 },
  weight: {
    backgroundColor: WattPrintTokens.colors.primary,
    borderRadius: WattPrintTokens.radii.xl,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
});
