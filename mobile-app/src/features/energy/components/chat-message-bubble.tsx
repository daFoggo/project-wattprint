import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import type { ChatAction, ChatMessage } from '@/features/energy/types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onAction?: (action: ChatAction) => void;
  onRetry?: () => void;
}

function Dot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
        -1
      )
    );
  }, [opacity, delay]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.typingDot, style]} />;
}

function TypingIndicator() {
  return (
    <View style={styles.typing} accessibilityLabel="Trợ lý đang trả lời">
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </View>
  );
}

export function ChatMessageBubble({ message, onAction, onRetry }: ChatMessageBubbleProps) {
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

  const hasData = !!message.facts && message.facts.length > 0;

  return (
    <View style={styles.aiBlock}>
      <View style={styles.aiHeader}>
        <View style={styles.aiBadge}>
          <View style={styles.aiDot} />
          <Text style={styles.aiBadgeText}>TRỢ LÝ AI</Text>
        </View>
        <Text style={styles.aiMetaText}>SỐ LIỆU CÔNG TƠ</Text>
      </View>

      {message.state === 'pending' ? (
        <TypingIndicator />
      ) : (
        <Text style={styles.aiText}>{message.text}</Text>
      )}

      {message.state === 'failed' && onRetry && (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}>
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
      )}

      {hasData && (
        <View style={styles.dataCard}>
          <Text style={styles.dataTitle}>DỮ LIỆU ĐỐI CHIẾU</Text>
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

      {message.action && (
        <Pressable
          onPress={() => onAction?.(message.action!)}
          style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.ctaBtnText}>{message.action.label}</Text>
          <Text style={styles.ctaArrow}>→</Text>
        </Pressable>
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
  typing: {
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: WattPrintTokens.colors.secondary,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: WattPrintTokens.colors.primary,
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 13,
    color: WattPrintTokens.colors.tertiary,
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
