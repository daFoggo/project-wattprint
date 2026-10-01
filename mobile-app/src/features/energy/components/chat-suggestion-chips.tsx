import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { QueryBoundary } from '@/components/common/query-boundary';
import { Fonts, WattPrintTokens } from '@/constants/theme';
import { useSuggestions, type CopilotSuggestion } from '@/features/energy/api';
import { SuggestionChipsSkeleton } from '@/features/energy/components/chat-skeletons';

const MAX_CHIPS = 3;

function Chips({
  onPick,
  asked,
}: {
  onPick: (suggestion: CopilotSuggestion) => void;
  asked: string[];
}) {
  const { data } = useSuggestions();
  const visible = data.filter((sg) => !asked.includes(sg.question)).slice(0, MAX_CHIPS);
  if (visible.length === 0) return null;
  return (
    <View style={styles.row}>
      {visible.map((sg) => (
        <Pressable
          key={sg.intent}
          onPress={() => onPick(sg)}
          style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
          <Text style={styles.label}>{sg.question}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Tối đa 3 câu hỏi gợi ý từ backend, theo thứ tự trả về; chạm một câu để hỏi ngay. */
export function ChatSuggestionChips({
  onPick,
  asked = [],
}: {
  onPick: (suggestion: CopilotSuggestion) => void;
  /** Câu đã hỏi trong cuộc hội thoại này; không gợi ý lại. */
  asked?: string[];
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>CÂU HỎI GỢI Ý</Text>
      <QueryBoundary fallback={<SuggestionChipsSkeleton />} errorMessage="Không tải được câu hỏi gợi ý.">
        <Chips onPick={onPick} asked={asked} />
      </QueryBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  header: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.secondary,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: WattPrintTokens.colors.neutralGround,
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  label: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.primary,
  },
});
