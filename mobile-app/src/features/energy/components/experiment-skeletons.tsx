import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/common/skeleton';
import { WattPrintTokens } from '@/constants/theme';

/** Danh sách đề xuất: mỗi thẻ có nhãn, tiêu đề, thiết bị, ô số giảm được và lý do. */
export function ExperimentProposalListSkeleton() {
  return (
    <View style={styles.list}>
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={styles.card}>
          <Skeleton width={140} height={13} />
          <Skeleton width="85%" height={22} />
          <View style={styles.row}>
            <Skeleton width={90} height={26} radius={WattPrintTokens.radii.pill} />
            <Skeleton width={110} height={26} radius={WattPrintTokens.radii.pill} />
          </View>
          <Skeleton height={56} radius={WattPrintTokens.radii.md} />
          <Skeleton width="90%" height={14} />
        </View>
      ))}
    </View>
  );
}

/** Thẻ thử nghiệm đang chạy (nền xanh đậm). */
export function ExperimentRunningCardSkeleton() {
  return (
    <View style={[styles.card, styles.cardDark]}>
      <Skeleton tone="dark" width={170} height={13} />
      <Skeleton tone="dark" width="80%" height={22} />
      <View style={styles.row}>
        <Skeleton tone="dark" height={72} radius={WattPrintTokens.radii.lg} style={styles.flex} />
        <Skeleton tone="dark" height={72} radius={WattPrintTokens.radii.lg} style={styles.flex} />
      </View>
      <Skeleton tone="dark" height={6} radius={3} />
      <Skeleton tone="dark" width="90%" height={14} />
      <Skeleton tone="dark" height={48} radius={WattPrintTokens.radii.pill} />
    </View>
  );
}

/** Phần thân tờ tạo thử nghiệm: chọn thiết bị, chỉnh mức, dự kiến. */
export function CreateExperimentSkeleton() {
  return (
    <View style={styles.sheetBody}>
      <Skeleton height={62} radius={16} />
      <Skeleton width={190} height={13} />
      <View style={styles.row}>
        <Skeleton width={110} height={38} radius={WattPrintTokens.radii.pill} />
        <Skeleton width={130} height={38} radius={WattPrintTokens.radii.pill} />
      </View>
      <Skeleton height={86} radius={18} />
      <Skeleton height={190} radius={20} />
    </View>
  );
}

/** Phần thân chi tiết thử nghiệm: ô tiết kiệm và các dòng nhật ký theo ngày. */
export function ExperimentDetailSkeleton() {
  return (
    <View style={styles.sheetBody}>
      <Skeleton height={72} radius={16} />
      <Skeleton width={220} height={13} />
      <Skeleton height={64} radius={18} />
      <Skeleton height={48} radius={WattPrintTokens.radii.pill} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl,
    padding: 20,
    gap: 14,
  },
  cardDark: {
    backgroundColor: WattPrintTokens.colors.primary,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
    width: undefined,
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
});
