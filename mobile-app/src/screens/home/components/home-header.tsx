import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Fonts, WattPrintTokens } from '@/constants/theme';

interface HomeHeaderProps {
  onPressAi?: () => void;
}

export function HomeHeader({ onPressAi }: HomeHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.greetingContainer}>
        <Text style={styles.date}>CHỦ NHẬT, 14 THÁNG 9</Text>
        <Text style={styles.greeting}>Chào buổi tối, Minh</Text>
      </View>

      <Pressable
        onPress={onPressAi}
        accessibilityRole="button"
        accessibilityLabel="Mở Trợ lý năng lượng AI"
        style={styles.aiButton}>
        <SymbolView
          name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
          size={22}
          tintColor={WattPrintTokens.colors.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: WattPrintTokens.colors.neutral, // #FFFFFF
  },
  greetingContainer: {
    gap: 2,
  },
  date: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  greeting: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 21,
    lineHeight: 25.2,
    color: WattPrintTokens.colors.primary, // #164437
  },
  aiButton: {
    width: 46,
    height: 46,
    borderRadius: WattPrintTokens.radii.pill,
    backgroundColor: WattPrintTokens.colors.tertiary, // #B5E930 Green Lizard
    alignItems: 'center',
    justifyContent: 'center',
  },
});
