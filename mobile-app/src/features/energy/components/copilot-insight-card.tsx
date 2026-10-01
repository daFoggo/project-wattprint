import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Fonts, WattPrintTokens } from '@/constants/theme';

interface CopilotInsightCardProps {
  eyebrow?: string;
  question: string;
  snippet: string;
  actionText?: string;
  /** Nằm trong một thẻ khác: nền nhạt, không còn là khối đậm riêng. */
  embedded?: boolean;
  onPress: () => void;
}

export function CopilotInsightCard({
  eyebrow = 'TRỢ LÝ COPILOT · HỎI NHANH',
  question,
  snippet,
  actionText = 'Hỏi Copilot giải đáp chi tiết',
  embedded = false,
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
        embedded && styles.cardEmbedded,
        pressed && styles.cardPressed,
      ]}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Sparkles
            size={13}
            color={embedded ? WattPrintTokens.colors.accentDeep : WattPrintTokens.colors.tertiary}
            strokeWidth={2.4}
          />
          <Text style={[styles.eyebrow, embedded && styles.eyebrowEmbedded]}>{eyebrow}</Text>
        </View>
      </View>

      {/* Burning Question */}
      <Text style={[styles.question, embedded && styles.questionEmbedded]}>{question}</Text>

      {/* Grounded Evidence Snippet */}
      <Text style={[styles.snippet, embedded && styles.snippetEmbedded]} numberOfLines={embedded ? 4 : 2}>
        {snippet}
      </Text>

      {/* Action Footer Button */}
      <View style={styles.actionRow}>
        <View style={[styles.actionBtn, embedded && styles.actionBtnEmbedded]}>
          <Text style={[styles.actionText, embedded && styles.actionTextEmbedded]}>{actionText}</Text>
          <ArrowRight
            size={14}
            color={embedded ? WattPrintTokens.colors.tertiary : WattPrintTokens.colors.primary}
            strokeWidth={2.5}
          />
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
  cardEmbedded: {
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
    borderRadius: WattPrintTokens.radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  eyebrowEmbedded: { color: WattPrintTokens.colors.accentDeep },
  questionEmbedded: { color: WattPrintTokens.colors.primary, fontSize: 15 },
  snippetEmbedded: { color: WattPrintTokens.colors.secondary },
  actionBtnEmbedded: { backgroundColor: WattPrintTokens.colors.primary },
  actionTextEmbedded: { color: WattPrintTokens.colors.tertiary },
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
