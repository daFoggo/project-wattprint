import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import { ChatMessageBubble } from '@/features/energy/components/chat-message-bubble';
import { MOCK_SUGGESTIONS } from '@/features/energy/mock';
import type { ChatThread } from '@/features/energy/types';

interface ChatThreadViewProps {
  thread: ChatThread;
  onBack: () => void;
  onSendMessage: (text: string) => void;
  onCtaPress: (cta: string) => void;
}

export function ChatThreadView({
  thread,
  onBack,
  onSendMessage,
  onCtaPress,
}: ChatThreadViewProps) {
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSuggestionPress = (query: string) => {
    onSendMessage(query);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}>
      {/* Top Navigation & Thread Info Header */}
      <View style={styles.topHeader}>
        <View style={styles.navRow}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backLabel}>Danh sách</Text>
          </Pressable>

          {/* Category & Period Pill */}
          <View style={styles.badgePill}>
            <View
              style={[styles.badgeDot, { backgroundColor: thread.dotColor }]}
            />
            <Text style={styles.badgeText}>
              {thread.category} · {thread.period}
            </Text>
          </View>
        </View>

        <Text style={styles.threadTitle}>{thread.title}</Text>
      </View>

      {/* Message List */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {thread.messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            message={msg}
            onCtaPress={onCtaPress}
          />
        ))}

        {/* Quick Suggestion Chips if short thread */}
        {thread.messages.length <= 2 && (
          <View style={styles.suggestionsWrap}>
            <Text style={styles.suggestionsHeader}>CÂU HỎI GỢI Ý</Text>
            <View style={styles.chipsRow}>
              {MOCK_SUGGESTIONS.map((sg, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleSuggestionPress(sg.q)}
                  style={styles.suggestionChip}>
                  <Text style={styles.suggestionLabel}>{sg.q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Input Field */}
      <View style={styles.inputContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Hỏi thêm hoặc tra cứu một chỉ số..."
          placeholderTextColor="#7C9588"
          onSubmitEditing={handleSend}
          returnKeyType="send"
          style={styles.input}
        />
        <Pressable onPress={handleSend} style={styles.sendBtn}>
          <Text style={styles.sendBtnText}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: WattPrintTokens.colors.neutralGround,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backArrow: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 22,
    color: WattPrintTokens.colors.primary, // #164437
    marginTop: -2,
  },
  backLabel: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15,
    color: WattPrintTokens.colors.primary, // #164437
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 6,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  threadTitle: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 19,
    lineHeight: 24,
    color: WattPrintTokens.colors.primary, // #164437
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  suggestionsWrap: {
    marginTop: 8,
    gap: 8,
  },
  suggestionsHeader: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: WattPrintTokens.colors.neutralGround, // #F2F4ED
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  suggestionLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.primary, // #164437
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: WattPrintTokens.colors.neutralGround,
  },
  input: {
    flex: 1,
    backgroundColor: WattPrintTokens.colors.neutralGround, // #F2F4ED
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 11,
    paddingHorizontal: 18,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: WattPrintTokens.colors.primary,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: WattPrintTokens.radii.pill,
    backgroundColor: WattPrintTokens.colors.primary, // #164437
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 20,
    color: WattPrintTokens.colors.tertiary, // #B5E930
    marginTop: -2,
  },
});
