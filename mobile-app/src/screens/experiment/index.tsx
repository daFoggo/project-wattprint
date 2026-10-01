import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Frown, Meh, Plus, Smile } from 'lucide-react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import { CreateExperimentSheet } from '@/features/energy/components/create-experiment-sheet';
import { ExperimentDetailModal } from '@/features/energy/components/experiment-detail-modal';
import { ExperimentHistorySheet } from '@/features/energy/components/experiment-history-sheet';
import { ExperimentStateCard } from '@/features/energy/components/experiment-state-card';
import { useEnergyStore } from '@/features/energy/use-energy-store';

const EMOTION_MAP: Record<string, { label: string }> = {
  comfortable: { label: 'Thoải mái' },
  neutral: { label: 'Bình thường' },
  uncomfortable: { label: 'Bất tiện' },
};

export function ExperimentScreen() {
  const {
    experimentState,
    activeExperiment,
    experimentLogs,
    startExperiment,
    endExperiment,
  } = useEnergyStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const visibleLogs = experimentLogs.slice(0, 3);

  const handleOpenHistory = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setIsHistoryOpen(true);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Ground Title & Lede with Quick Create Action */}
        <View style={styles.groundHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Thử nghiệm</Text>
            <Pressable
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setIsCreateOpen(true);
              }}
              style={({ pressed }) => [
                styles.quickCreateBtn,
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}>
              <Plus size={15} color={WattPrintTokens.colors.primary} strokeWidth={2.4} />
              <Text style={styles.quickCreateText}>Tạo nhanh</Text>
            </Pressable>
          </View>
          <Text style={styles.lede}>
            Thay đổi một thói quen trong vài ngày. Mức tiêu thụ nền đã được ghi nhận tự động,
            không cần nhập liệu thủ công.
          </Text>
        </View>

        {/* Dynamic Single Active Experiment Card */}
        <ExperimentStateCard
          state={experimentState}
          activeExperiment={activeExperiment}
          onOpenCreate={() => setIsCreateOpen(true)}
          onOpenDetail={() => setIsDetailOpen(true)}
        />

        {/* Past Experiments Section */}
        <View style={styles.pastHeader}>
          <Text style={styles.pastEyebrow}>THỬ NGHIỆM ĐÃ QUA</Text>
          {experimentLogs.length > 0 && (
            <Pressable
              onPress={handleOpenHistory}
              hitSlop={8}
              style={({ pressed }) => [styles.seeAllBtn, pressed && { opacity: 0.6 }]}>
              <Text style={styles.seeAllText}>
                XEM TẤT CẢ ({experimentLogs.length})
              </Text>
              <ChevronRight size={13} color={WattPrintTokens.colors.secondary} strokeWidth={2.2} />
            </Pressable>
          )}
        </View>

        {/* Unified List Container */}
        <View style={styles.logListCard}>
          {visibleLogs.map((item, index) => {
            const emotionLabel = item.emotion ? EMOTION_MAP[item.emotion]?.label : null;

            return (
              <View
                key={item.id}
                style={[
                  styles.logRow,
                  index > 0 && styles.logRowBorder,
                ]}>
                <View style={styles.logMain}>
                  <Text style={styles.logTitle}>{item.title}</Text>
                  <View style={styles.logMetaRow}>
                    <Text style={styles.logDate}>{item.date}</Text>
                    {item.note ? (
                      <>
                        <Text style={styles.logMetaDot}>•</Text>
                        <Text style={styles.logNote} numberOfLines={1}>
                          {item.note}
                        </Text>
                      </>
                    ) : null}
                  </View>
                </View>

                <View style={styles.logRight}>
                  {item.savedVnd > 0 ? (
                    <Text style={styles.logSaved}>
                      +{item.savedVnd.toLocaleString('vi-VN')} đ
                    </Text>
                  ) : (
                    <Text style={styles.logSavedZero}>0 đ</Text>
                  )}

                  {item.emotion && (
                    <View style={styles.emotionPill}>
                      {item.emotion === 'comfortable' ? (
                        <Smile size={12} color="#2F7A0C" strokeWidth={2.2} />
                      ) : item.emotion === 'neutral' ? (
                        <Meh size={12} color="#7A6B1A" strokeWidth={2.2} />
                      ) : (
                        <Frown size={12} color="#C44536" strokeWidth={2.2} />
                      )}
                      <Text style={styles.emotionText}>{emotionLabel}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* S2: Create / Configure Sheet */}
      <CreateExperimentSheet
        visible={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onStart={startExperiment}
      />

      {/* S3: Detail & Ending View */}
      <ExperimentDetailModal
        visible={isDetailOpen}
        experiment={activeExperiment}
        onClose={() => setIsDetailOpen(false)}
        onEnd={endExperiment}
      />

      {/* Full History Sheet */}
      <ExperimentHistorySheet
        visible={isHistoryOpen}
        logs={experimentLogs}
        onClose={() => setIsHistoryOpen(false)}
      />
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
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  logRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E7EBE1',
  },
  logMain: {
    flex: 1,
    gap: 4,
  },
  logTitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    color: WattPrintTokens.colors.primary, // #164437
  },
  logMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logDate: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  logMetaDot: {
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  logNote: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
    flex: 1,
  },
  logRight: {
    alignItems: 'flex-end',
    gap: 5,
  },
  logSaved: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 14,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  logSavedZero: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.secondary,
  },
  emotionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: WattPrintTokens.radii.pill,
  },
  emotionEmoji: {
    fontSize: 12,
  },
  emotionText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: WattPrintTokens.colors.primary,
  },
});
