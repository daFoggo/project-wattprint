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
import type { ChatThread } from '@/features/energy/types';

interface ChatThreadListProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
}

const SECTION_ORDER: { key: ChatThread['group']; label: string }[] = [
  { key: 'today', label: 'HÔM NAY' },
  { key: 'this_week', label: 'TUẦN NÀY' },
  { key: 'earlier', label: 'TRƯỚC ĐÓ' },
];

export function ChatThreadList({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
}: ChatThreadListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.period.toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);

  const grouped = useMemo(() => {
    const map: Record<ChatThread['group'], ChatThread[]> = {
      today: [],
      this_week: [],
      earlier: [],
    };
    filteredThreads.forEach((t) => {
      if (map[t.group]) {
        map[t.group].push(t);
      } else {
        map.earlier.push(t);
      }
    });
    return map;
  }, [filteredThreads]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Header: Copilot + Threads Count */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trợ lý AI</Text>
          <Text style={styles.headerCount}>{threads.length} CUỘC HỘI THOẠI</Text>
        </View>

        {/* Search Pill Bar */}
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

        {/* Timeline Sections */}
        {SECTION_ORDER.map((section) => {
          const sectionThreads = grouped[section.key];
          if (!sectionThreads || sectionThreads.length === 0) return null;

          return (
            <View key={section.key} style={styles.sectionWrap}>
              <Text style={styles.sectionHeader}>{section.label}</Text>
              <View style={styles.sectionItems}>
                {sectionThreads.map((thread) => {
                  const isSelected =
                    activeThreadId === thread.id ||
                    (!activeThreadId && thread.id === 'thread-1');

                  return (
                    <Pressable
                      key={thread.id}
                      onPress={() => onSelectThread(thread.id)}
                      style={[
                        styles.threadItem,
                        isSelected && styles.threadItemSelected,
                      ]}>
                      {/* Left Dot Chip */}
                      <View
                        style={[
                          styles.dotChip,
                          { backgroundColor: thread.dotColor },
                        ]}
                      />

                      {/* Main Title & Meta */}
                      <View style={styles.threadTextWrap}>
                        <Text
                          style={styles.threadTitle}
                          numberOfLines={2}
                          ellipsizeMode="tail">
                          {thread.title}
                        </Text>
                        <Text style={styles.threadMeta}>
                          {thread.category} · {thread.period} · {thread.timeAgo}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Floating Action Button: + New thread */}
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
