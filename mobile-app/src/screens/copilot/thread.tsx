import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import type { CopilotSuggestion } from '@/features/energy/api';
import { ChatThreadView } from '@/features/energy/components/chat-thread-view';
import type { ChatAction } from '@/features/energy/types';
import { useEnergyStore } from '@/features/energy/use-energy-store';
import { useSafeBack } from '@/hooks/use-safe-back';

export function CopilotThreadScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { threads, askInThread, setExperimentDraft } = useEnergyStore();
  const thread = threads.find((t) => t.id === id);
  const goBack = useSafeBack('/copilot');

  if (!thread) return <Redirect href="/copilot" />;

  const handleAction = (action: ChatAction) => {
    setExperimentDraft(action.appliance);
    router.navigate('/experiment');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ChatThreadView
        thread={thread}
        onBack={goBack}
        onSendMessage={(text) => void askInThread(thread.id, { text })}
        onPickSuggestion={(sg: CopilotSuggestion) =>
          void askInThread(thread.id, { text: sg.question, intent: sg.intent })
        }
        onAction={handleAction}
        onRetry={(text) => void askInThread(thread.id, { text })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
