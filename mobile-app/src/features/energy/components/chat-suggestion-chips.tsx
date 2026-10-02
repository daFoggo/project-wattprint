import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { QueryBoundary } from '@/components/common/query-boundary';
import { Fonts, WattPrintTokens } from '@/constants/theme';
import { useSuggestions, type CopilotSuggestion } from '@/features/energy/api';
import { SuggestionChipsSkeleton } from '@/features/energy/components/chat-skeletons';

const MAX_CHIPS = 3;

function ChipRow({
  items,
  onPick,
}: {
  items: CopilotSuggestion[];
  onPick: (suggestion: CopilotSuggestion) => void;
}) {
  return (
    <View style={styles.row}>
      {items.map((sg) => (
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

function GenericChips({
  onPick,
  asked,
}: {
  onPick: (suggestion: CopilotSuggestion) => void;
  asked: string[];
}) {
  const { data } = useSuggestions();
  const visible = data.filter((sg) => !asked.includes(sg.question)).slice(0, MAX_CHIPS);
  if (visible.length === 0) return null;
  return <ChipRow items={visible} onPick={onPick} />;
}

/**
 * Tối đa 3 câu hỏi gợi ý; chạm một câu để hỏi ngay. `items` là gợi ý nối tiếp theo câu trả lời vừa
 * rồi (từ backend); không có thì dùng danh sách chung, bỏ câu đã hỏi.
 */
export function ChatSuggestionChips({
  onPick,
  asked = [],
  items,
}: {
  onPick: (suggestion: CopilotSuggestion) => void;
  /** Gợi ý nối tiếp của câu trả lời cuối. */
  items?: CopilotSuggestion[];
  /** Câu đã hỏi trong cuộc hội thoại này; không gợi ý lại. */
  asked?: string[];
}) {
  const own = items?.filter((sg) => !asked.includes(sg.question)).slice(0, MAX_CHIPS);
  if (own && own.length > 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.header}>HỎI TIẾP</Text>
        <ChipRow items={own} onPick={onPick} />
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>CÂU HỎI GỢI Ý</Text>
      <QueryBoundary fallback={<SuggestionChipsSkeleton />} errorMessage="Không tải được câu hỏi gợi ý.">
        <GenericChips onPick={onPick} asked={asked} />
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
