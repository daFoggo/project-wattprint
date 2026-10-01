import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/common/themed-text';
import { ThemedView } from '@/components/common/themed-view';
import { Spacing } from '@/constants/theme';
import type { DeviceUsage } from '@/features/energy/types';
import { formatVnd } from '@/utils/format-currency';

interface DeviceBreakdownProps {
  devices: DeviceUsage[];
}

export function DeviceBreakdown({ devices }: DeviceBreakdownProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      {devices.map((device) => (
        <View key={device.id} style={styles.row}>
          <ThemedText type="small" style={styles.name}>
            {device.name}
          </ThemedText>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(device.share * 100)}%` }]} />
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.cost}>
            {formatVnd(device.cost)}
          </ThemedText>
        </View>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    width: 104,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#3c87f7',
  },
  cost: {
    width: 88,
    textAlign: 'right',
  },
});
