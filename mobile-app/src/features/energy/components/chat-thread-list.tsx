import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import type { CopilotSuggestion } from '@/features/energy/api';
import { dotColorOf, groupOf, metaOf, type ThreadGroup } from '@/features/energy/chat-format';
import { ChatSuggestionChips } from '@/features/energy/components/chat-suggestion-chips';
import type { ChatThread } from '@/features/energy/types';

interface ChatThreadListProps {
  threads: ChatThread[];
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  onPickSuggestion: (suggestion: CopilotSuggestion) => void;
}

const SECTION_ORDER: { key: ThreadGroup; label: string }[] = [
  { key: 'today', label: 'HÔM NAY' },
  { key: 'this_week', label: 'TUẦN NÀY' },
  { key: 'earlier', label: 'TRƯỚC ĐÓ' },
];

export function ChatThreadList({
  threads,
  onSelectThread,
  onNewThread,
  onPickSuggestion,
}: ChatThreadListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const grouped = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const map: Record<ThreadGroup, ChatThread[]> = { today: [], this_week: [], earlier: [] };
    [...threads]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter(
        (t) =>
          !q ||
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.period.toLowerCase().includes(q)
      )
      .forEach((t) => map[groupOf(t.updatedAt)].push(t));
    return map;
  }, [threads, searchQuery]);

  const isEmpty = threads.length === 0;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trợ lý AI</Text>
          {!isEmpty && <Text style={styles.headerCount}>{threads.length} CUỘC HỘI THOẠI</Text>}
        </View>

        {isEmpty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Chưa có cuộc hội thoại nào</Text>
            <Text style={styles.emptyBody}>
              Hỏi về tiền điện, bậc giá hay thiết bị trong nhà. Chạm một câu gợi ý để bắt đầu.
            </Text>
            <ChatSuggestionChips onPick={onPickSuggestion} />
          </View>
        ) : (
          <View style={styles.searchBar}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Tìm kiếm cuộc hội thoại"
              placeholderTextColor="#7C9588"
              style={styles.searchInput}
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
          </View>
        )}

        {SECTION_ORDER.map((section) => {
          const sectionThreads = grouped[section.key];
          if (sectionThreads.length === 0) return null;

          return (
            <View key={section.key} style={styles.sectionWrap}>
              <Text style={styles.sectionHeader}>{section.label}</Text>
              <View style={styles.sectionItems}>
                {sectionThreads.map((thread) => (
                  <Pressable
                    key={thread.id}
                    onPress={() => onSelectThread(thread.id)}
                    style={({ pressed }) => [
                      styles.threadItem,
                      pressed && styles.threadItemSelected,
                    ]}>
                    <View
                      style={[styles.dotChip, { backgroundColor: dotColorOf(thread.category) }]}
                    />
                    <View style={styles.threadTextWrap}>
                      <Text style={styles.threadTitle} numberOfLines={2} ellipsizeMode="tail">
                        {thread.title}
                      </Text>
                      <Text style={styles.threadMeta}>{metaOf(thread)}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Pressable onPress={onNewThread} style={styles.fab}>
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabLabel}>Hội thoại mới</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 88,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 18,
    marginTop: 8,
  },
  headerTitle: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 28,
    color: WattPrintTokens.colors.primary, // #164437
    letterSpacing: -0.5,
  },
  headerCount: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  searchBar: {
    backgroundColor: WattPrintTokens.colors.neutralGround, // #F2F4ED
    borderRadius: WattPrintTokens.radii.pill,
    height: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    marginBottom: 20,
  },
  searchInput: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: WattPrintTokens.colors.primary,
    padding: 0,
  },
  empty: { gap: 14, paddingTop: 8 },
  emptyTitle: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 18,
    color: WattPrintTokens.colors.primary,
  },
  emptyBody: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: WattPrintTokens.colors.secondary,
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.8,
    color: WattPrintTokens.colors.secondary, // #4A6B60
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  sectionItems: {
    gap: 4,
  },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: WattPrintTokens.radii.md,
    gap: 12,
  },
  threadItemSelected: {
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
  },
  dotChip: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginTop: 5,
  },
  threadTextWrap: {
    flex: 1,
    gap: 4,
  },
  threadTitle: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
    color: WattPrintTokens.colors.primary, // #164437
    lineHeight: 20,
  },
  threadMeta: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: WattPrintTokens.colors.primary, // #164437
    height: 48,
    paddingHorizontal: 22,
    borderRadius: WattPrintTokens.radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fabIcon: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 18,
    color: WattPrintTokens.colors.tertiary, // #B5E930
    marginTop: -1,
  },
  fabLabel: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15,
    color: WattPrintTokens.colors.tertiary, // #B5E930
  },
});
