import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import type { CopilotSuggestion } from '@/features/energy/api';
import { dotColorOf } from '@/features/energy/chat-format';
import { ChatMessageBubble } from '@/features/energy/components/chat-message-bubble';
import { ChatSuggestionChips } from '@/features/energy/components/chat-suggestion-chips';
import type { ChatAction, ChatThread } from '@/features/energy/types';

interface ChatThreadViewProps {
  thread: ChatThread;
  onBack: () => void;
  onSendMessage: (text: string) => void;
  onPickSuggestion: (suggestion: CopilotSuggestion) => void;
  onAction: (action: ChatAction) => void;
  onRetry: (text: string) => void;
}

export function ChatThreadView({
  thread,
  onBack,
  onSendMessage,
  onPickSuggestion,
  onAction,
  onRetry,
}: ChatThreadViewProps) {
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const busy = thread.messages.some((m) => m.state === 'pending');

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || busy) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const retryFor = (index: number) => {
    for (let i = index - 1; i >= 0; i--) {
      if (thread.messages[i].who === 'me') return () => onRetry(thread.messages[i].text);
    }
    return undefined;
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={styles.root}>
      <View style={styles.topHeader}>
        <View style={styles.navRow}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backLabel}>Danh sách</Text>
          </Pressable>

          <View style={styles.badgePill}>
            <View style={[styles.badgeDot, { backgroundColor: dotColorOf(thread.category) }]} />
            <Text style={styles.badgeText}>
              {[thread.category, thread.period].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        <Text style={styles.threadTitle} numberOfLines={2}>
          {thread.title}
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
        {thread.messages.map((msg, index) => (
          <ChatMessageBubble
            key={msg.id}
            message={msg}
            onAction={onAction}
            onRetry={msg.state === 'failed' ? retryFor(index) : undefined}
          />
        ))}

        {!busy && (
          <View style={styles.suggestionsWrap}>
            <ChatSuggestionChips
              onPick={onPickSuggestion}
              asked={thread.messages.filter((m) => m.who === 'me').map((m) => m.text)}
            />
          </View>
        )}
      </ScrollView>

            <View style={styles.inputContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Hỏi về điện nhà bạn..."
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
