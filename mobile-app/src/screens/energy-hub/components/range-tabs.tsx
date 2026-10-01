import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/common/themed-text';
import { ThemedView } from '@/components/common/themed-view';
import { Spacing } from '@/constants/theme';
import type { Range } from '@/features/energy/types';

const options: { value: Range; label: string }[] = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
];

interface RangeTabsProps {
  value: Range;
  onChange: (range: Range) => void;
}

export function RangeTabs({ value, onChange }: RangeTabsProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable key={option.value} style={styles.item} onPress={() => onChange(option.value)}>
            <ThemedView
              type={selected ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.pill}>
              <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
                {option.label}
              </ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: Spacing.half,
    borderRadius: Spacing.five,
  },
  item: {
    flex: 1,
  },
  pill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
});
