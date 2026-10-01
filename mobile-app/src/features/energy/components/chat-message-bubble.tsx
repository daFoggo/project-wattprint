import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import type { ChatMessage } from '@/features/energy/types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onCtaPress?: (cta: string) => void;
}

export function ChatMessageBubble({ message, onCtaPress }: ChatMessageBubbleProps) {
  const isAi = message.who === 'ai';

  if (!isAi) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  const hasData =
    !!message.weather ||
    !!message.tariffFact ||
    (message.facts && message.facts.length > 0);

  return (
    <View style={styles.aiBlock}>
      {/* Editorial Block Header */}
      <View style={styles.aiHeader}>
        <View style={styles.aiBadge}>
          <View style={styles.aiDot} />
          <Text style={styles.aiBadgeText}>TRỢ LÝ AI</Text>
        </View>
        <Text style={styles.aiMetaText}>ĐÃ ĐỒNG BỘ CÔNG TƠ</Text>
      </View>

      {/* Grounded Body Text */}
      <Text style={styles.aiText}>{message.text}</Text>

      {/* Unified Data Reference Table */}
      {hasData && (
        <View style={styles.dataCard}>
          <Text style={styles.dataTitle}>DỮ LIỆU ĐỐI CHIẾU</Text>

          {message.weather && (
            <View style={styles.dataRow}>
              <Text style={styles.dataKey} numberOfLines={1}>
                Nhiệt độ ngoài trời
              </Text>
              <Text style={styles.dataVal} numberOfLines={1}>
                {message.weather.tempC}°C · +{message.weather.diffC}°C
              </Text>
            </View>
          )}

          {message.tariffFact && (
            <View style={styles.dataRow}>
              <Text style={styles.dataKey} numberOfLines={1}>
                Bậc giá EVN
              </Text>
              <Text style={styles.dataVal} numberOfLines={1}>
                {message.tariffFact.currentTier} · còn {message.tariffFact.headroomKwh} kWh
              </Text>
            </View>
          )}

          {message.facts?.map((fact, idx) => (
            <View key={idx} style={styles.dataRow}>
              <Text style={styles.dataKey} numberOfLines={1}>
                {fact.k}
              </Text>
              <Text style={styles.dataVal} numberOfLines={1}>
                {fact.v}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Proposal + Action CTA */}
      {message.cta && (
        <>
          {message.ctaDesc && (
            <View style={styles.proposal}>
              <Text style={styles.proposalLabel}>ĐỀ XUẤT THỬ NGHIỆM</Text>
              <Text style={styles.proposalText}>{message.ctaDesc}</Text>
            </View>
          )}

          <Pressable
            onPress={() => onCtaPress?.(message.cta!)}
            style={({ pressed }) => [
              styles.ctaBtn,
              pressed && { opacity: 0.85 },
            ]}>
            <Text style={styles.ctaBtnText}>{message.cta}</Text>
            <Text style={styles.ctaArrow}>→</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  userBubble: {
    maxWidth: '85%',
    backgroundColor: WattPrintTokens.colors.primary, // #164437
    borderRadius: WattPrintTokens.radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  aiBlock: {
    width: '100%',
    backgroundColor: WattPrintTokens.colors.neutralGround, // #F2F4ED
    borderRadius: WattPrintTokens.radii.lg,
    padding: 16,
    gap: 12,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  aiBadgeText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  aiMetaText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  aiText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: WattPrintTokens.colors.primary, // #164437
  },
  dataCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.md,
    borderWidth: 1,
    borderColor: '#E2E8D8',
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  dataTitle: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
    paddingTop: 10,
    paddingBottom: 2,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8D8',
  },
  dataKey: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.3,
    color: WattPrintTokens.colors.secondary, // #4A6B60
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  dataVal: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 13,
    color: WattPrintTokens.colors.primary, // #164437
    textAlign: 'right',
    flexShrink: 1,
  },
  proposal: {
    gap: 3,
    marginTop: 2,
  },
  proposalLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  proposalText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: WattPrintTokens.colors.primary, // #164437
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: WattPrintTokens.colors.tertiary, // #B5E930
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 2,
  },
  ctaBtnText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 14,
    lineHeight: 19,
    color: WattPrintTokens.colors.primary, // #164437
    textAlign: 'center',
    flexShrink: 1,
  },
  ctaArrow: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15,
    color: WattPrintTokens.colors.primary, // #164437
  },
});
