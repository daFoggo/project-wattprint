import React from 'react';
import { StyleSheet, View } from 'react-native';

import { DataRamp, WattPrintTokens } from '@/constants/theme';
import type { BubbleDevice } from '@/features/energy/types';

interface StackedBarBreakdownProps {
  devices: BubbleDevice[];
}

export function StackedBarBreakdown({ devices }: StackedBarBreakdownProps) {
  return (
    <View style={styles.barTrack}>
      {devices.map((d, i) => {
        const color = DataRamp[i % DataRamp.length].bg;
        return (
          <View
            key={d.id}
            style={[
              styles.segment,
              {
                flex: Math.max(d.pct, 2),
                backgroundColor: color,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barTrack: {
    height: 14,
    borderRadius: WattPrintTokens.radii.pill,
    overflow: 'hidden',
    flexDirection: 'row',
    gap: 2,
    width: '100%',
    marginVertical: 8,
  },
  segment: {
    height: '100%',
  },
});
