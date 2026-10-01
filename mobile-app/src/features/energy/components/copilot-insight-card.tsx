import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Fonts, WattPrintTokens } from '@/constants/theme';

interface CopilotInsightCardProps {
  eyebrow?: string;
  question?: string;
  snippet?: string;
  actionText?: string;
  onPress: () => void;
}

export function CopilotInsightCard({
  eyebrow = 'TRỢ LÝ COPILOT · HỎI NHANH',
  question = 'Giải đáp giúp tôi: Tại sao tháng này tiền điện tăng?',
  snippet = 'Nhiệt độ ngoài trời tăng +2,4°C khiến điều hòa chạy lâu hơn 68%, đẩy 42 kWh sang Bậc 4 EVN.',
  actionText = 'Hỏi Copilot giải đáp chi tiết',
  onPress,
}: CopilotInsightCardProps) {
  const handlePress = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${question}. ${actionText}`}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Sparkles size={13} color={WattPrintTokens.colors.tertiary} strokeWidth={2.4} />
          <Text style={styles.eyebrow}>{eyebrow}</Text>
        </View>
      </View>

      {/* Burning Question */}
      <Text style={styles.question}>{question}</Text>

      {/* Grounded Evidence Snippet */}
      <Text style={styles.snippet} numberOfLines={2}>
        {snippet}
      </Text>

      {/* Action Footer Button */}
      <View style={styles.actionRow}>
        <View style={styles.actionBtn}>
          <Text style={styles.actionText}>{actionText}</Text>
          <ArrowRight size={14} color={WattPrintTokens.colors.primary} strokeWidth={2.5} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WattPrintTokens.colors.primary, // #164437 MSU Green
    borderRadius: WattPrintTokens.radii.xl, // 20px
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
    width: '100%',
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.tertiary, // #B5E930 Green Lizard
  },
  question: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  snippet: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18.5,
    color: WattPrintTokens.colors.inkInverseBody, // #DCEBD3
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WattPrintTokens.colors.tertiary, // #B5E930
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  actionText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 13,
    color: WattPrintTokens.colors.primary, // #164437
  },
});
