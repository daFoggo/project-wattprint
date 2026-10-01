import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import type { CopilotSuggestion } from '@/features/energy/api';
import { ChatThreadList } from '@/features/energy/components/chat-thread-list';
import { useEnergyStore } from '@/features/energy/use-energy-store';

export function CopilotScreen() {
  const router = useRouter();
  const { threads, createThread, askInThread } = useEnergyStore();

  const openThread = (id: string) => router.push({ pathname: '/copilot/[id]', params: { id } });

  const handlePick = (suggestion: CopilotSuggestion) => {
    const id = createThread();
    openThread(id);
    void askInThread(id, { text: suggestion.question, intent: suggestion.intent });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.root}>
        <ChatThreadList
          threads={threads}
          onSelectThread={openThread}
          onNewThread={() => openThread(createThread())}
          onPickSuggestion={handlePick}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
