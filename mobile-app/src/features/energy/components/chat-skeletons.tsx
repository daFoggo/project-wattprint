import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Skeleton } from '@/components/common/skeleton';

/** Chỗ giữ cho hàng chip câu hỏi gợi ý. */
export function SuggestionChipsSkeleton() {
  return (
    <View style={styles.chips}>
      <Skeleton width={190} height={34} radius={999} />
      <Skeleton width={150} height={34} radius={999} />
      <Skeleton width={210} height={34} radius={999} />
    </View>
  );
}

export function CopilotListSkeleton() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.pad}>
        <Skeleton width={160} height={32} />
        <Skeleton height={48} radius={999} style={styles.gapTop} />
        <Skeleton width={100} height={12} style={styles.gapTop} />
        <Skeleton height={44} style={styles.gapSm} />
        <Skeleton height={44} style={styles.gapSm} />
      </View>
    </SafeAreaView>
  );
}

export function CopilotThreadSkeleton() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.pad}>
        <Skeleton width={120} height={20} />
        <Skeleton width={240} height={24} style={styles.gapSm} />
        <Skeleton height={140} radius={16} style={styles.gapTop} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  pad: { padding: 20 },
  gapTop: { marginTop: 20 },
  gapSm: { marginTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
