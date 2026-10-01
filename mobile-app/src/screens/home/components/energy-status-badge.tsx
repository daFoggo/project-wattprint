import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/common/themed-text';
import { ThemedView } from '@/components/common/themed-view';
import { Spacing } from '@/constants/theme';

import type { EnergyStatus } from '@/features/energy/types';

const statusColors: Record<EnergyStatus, string> = {
  good: '#1B873F',
  warning: '#B7791F',
  critical: '#C53030',
};

const statusLabels: Record<EnergyStatus, string> = {
  good: 'Mọi thứ đều ổn!',
  warning: 'Đáng chú ý',
  critical: 'Cần xử lý',
};

interface EnergyStatusBadgeProps {
  status: EnergyStatus;
  message: string;
}

export function EnergyStatusBadge({ status, message }: EnergyStatusBadgeProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <View style={[styles.dot, { backgroundColor: statusColors[status] }]} />
      <View style={styles.content}>
        <ThemedText type="smallBold">{statusLabels[status]}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  content: {
    flex: 1,
    gap: Spacing.half,
  },
});
