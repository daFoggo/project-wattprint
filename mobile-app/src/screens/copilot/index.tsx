import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ChatThreadList } from '@/features/energy/components/chat-thread-list';
import { ChatThreadView } from '@/features/energy/components/chat-thread-view';
import { useEnergyStore } from '@/features/energy/use-energy-store';

export function CopilotScreen() {
  const router = useRouter();
  const {
    threads,
    activeThreadId,
    setActiveThreadId,
    createThread,
    sendChatMessageToThread,
    setExperimentState,
  } = useEnergyStore();

  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId);
  };

  const handleNewThread = () => {
    createThread();
  };

  const handleBackToThreads = () => {
    setActiveThreadId(null);
  };

  const handleCtaPress = (_cta: string) => {
    setExperimentState('suggest');
    router.navigate('/experiment');
  };

  const activeThread = threads.find((t) => t.id === activeThreadId);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.root}>
        {activeThread ? (
          <ChatThreadView
            thread={activeThread}
            onBack={handleBackToThreads}
            onSendMessage={(text) =>
              sendChatMessageToThread(activeThread.id, text)
            }
            onCtaPress={handleCtaPress}
          />
        ) : (
          <ChatThreadList
            threads={threads}
            activeThreadId={activeThreadId}
            onSelectThread={handleSelectThread}
            onNewThread={handleNewThread}
          />
        )}
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

