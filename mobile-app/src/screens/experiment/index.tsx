import React, { lazy, Suspense, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QueryBoundary } from '@/components/common/query-boundary';
import { Fonts, WattPrintTokens } from '@/constants/theme';
import { ExperimentLogRow } from '@/features/energy/components/experiment-log-row';
import type { ConfigMode } from '@/features/energy/components/create-experiment-sheet';
import { ExperimentProposalList } from '@/features/energy/components/experiment-proposal-card';
import {
  ExperimentProposalListSkeleton,
  ExperimentRunningCardSkeleton,
} from '@/features/energy/components/experiment-skeletons';
import { ExperimentRunningCard } from '@/features/energy/components/experiment-state-card';
import { useEnergyStore } from '@/features/energy/use-energy-store';

// Các tờ chỉ cần khi người dùng mở: nạp module theo nhu cầu.
const CreateExperimentSheet = lazy(() =>
  import('@/features/energy/components/create-experiment-sheet').then((m) => ({ default: m.CreateExperimentSheet }))
);
const ExperimentDetailModal = lazy(() =>
  import('@/features/energy/components/experiment-detail-modal').then((m) => ({ default: m.ExperimentDetailModal }))
);
const ExperimentHistorySheet = lazy(() =>
  import('@/features/energy/components/experiment-history-sheet').then((m) => ({ default: m.ExperimentHistorySheet }))
);

function tap(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  try {
    Haptics.impactAsync(style);
  } catch {}
}

export function ExperimentScreen() {
  const {
    activeExperiment,
    experimentLogs,
    experimentDraft,
    setExperimentDraft,
    startExperiment,
    endExperiment,
  } = useEnergyStore();

  const [config, setConfig] = useState<ConfigMode | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const running = activeExperiment;
  const logs = experimentLogs;
  const visibleLogs = logs.slice(0, 3);

  // Trợ lý AI đề nghị một thiết bị: mở tờ cấu hình với thiết bị đó (chỉ khi chưa có thử nghiệm đang chạy).
  const sheetMode: ConfigMode | null =
    config ?? (experimentDraft !== null && running === null ? { proposal: null, preset: experimentDraft } : null);
  const closeConfig = () => {
    setConfig(null);
    setExperimentDraft(null);
  };

  const openCustom = () => {
    tap();
    setConfig({ proposal: null, preset: null });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.groundHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Thử nghiệm</Text>
            {running === null && (
              <Pressable
                onPress={openCustom}
                accessibilityRole="button"
                style={({ pressed }) => [styles.quickCreateBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}>
                <Plus size={15} color={WattPrintTokens.colors.primary} strokeWidth={2.4} />
                <Text style={styles.quickCreateText}>Tạo thử nghiệm</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.lede}>
            Thay đổi một thói quen trong vài ngày. Số điện của thiết bị được đo tự động, không cần nhập tay.
          </Text>
        </View>

        {running ? (
          <QueryBoundary fallback={<ExperimentRunningCardSkeleton />} errorMessage="Không tải được số đo thử nghiệm.">
            <ExperimentRunningCard
              experiment={running}
              onOpenDetail={() => {
                tap();
                setIsDetailOpen(true);
              }}
            />
          </QueryBoundary>
        ) : (
          <>
            <View style={styles.pastHeader}>
              <Text style={styles.pastEyebrow}>ĐỀ XUẤT CHO BẠN</Text>
            </View>
            <QueryBoundary fallback={<ExperimentProposalListSkeleton />} errorMessage="Không tải được đề xuất thử nghiệm.">
              <ExperimentProposalList onPick={(proposal) => setConfig({ proposal, preset: null })} />
            </QueryBoundary>
          </>
        )}

        <View style={styles.pastHeader}>
          <Text style={styles.pastEyebrow}>THỬ NGHIỆM ĐÃ QUA</Text>
          {logs.length > 0 && (
            <Pressable
              onPress={() => {
                try {
                  Haptics.selectionAsync();
                } catch {}
                setIsHistoryOpen(true);
              }}
              hitSlop={8}
              style={({ pressed }) => [styles.seeAllBtn, pressed && { opacity: 0.6 }]}>
              <Text style={styles.seeAllText}>XEM TẤT CẢ ({logs.length})</Text>
              <ChevronRight size={13} color={WattPrintTokens.colors.secondary} strokeWidth={2.2} />
            </Pressable>
          )}
        </View>

        <View style={styles.logListCard}>
          {visibleLogs.length === 0 ? (
            <Text style={styles.emptyLog}>Chưa có thử nghiệm nào hoàn tất</Text>
          ) : (
            visibleLogs.map((item, index) => <ExperimentLogRow key={item.id} item={item} bordered={index > 0} />)
          )}
        </View>
      </ScrollView>

      <Suspense fallback={null}>
        <CreateExperimentSheet
          visible={sheetMode !== null}
          mode={sheetMode ?? { proposal: null, preset: null }}
          onClose={closeConfig}
          onStart={startExperiment}
        />
        <ExperimentDetailModal
          visible={isDetailOpen}
          experiment={running}
          onClose={() => setIsDetailOpen(false)}
          onEnd={endExperiment}
        />
        <ExperimentHistorySheet visible={isHistoryOpen} logs={logs} onClose={() => setIsHistoryOpen(false)} />
      </Suspense>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WattPrintTokens.colors.neutralGround, // #F2F4ED
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 12,
  },
  groundHeader: {
    paddingHorizontal: 8,
    gap: 6,
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 26,
    color: WattPrintTokens.colors.primary, // #164437
  },
  quickCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: WattPrintTokens.colors.tertiary, // #B5E930
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: WattPrintTokens.radii.pill,
  },
  quickCreateText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.4,
    color: WattPrintTokens.colors.primary, // #164437
  },
  lede: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  pastHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 14,
    paddingBottom: 2,
  },
  pastEyebrow: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  seeAllText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  logListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  emptyLog: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    paddingVertical: 20,
    textAlign: 'center',
    color: WattPrintTokens.colors.secondary,
  },
});
