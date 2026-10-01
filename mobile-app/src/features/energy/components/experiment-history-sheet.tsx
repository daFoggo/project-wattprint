import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import type { ExperimentLogItem } from '@/features/energy/types';

import { ExperimentLogRow } from './experiment-log-row';

interface ExperimentHistorySheetProps {
  visible: boolean;
  logs: ExperimentLogItem[];
  onClose: () => void;
}

export function ExperimentHistorySheet({ visible, logs, onClose }: ExperimentHistorySheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>LỊCH SỬ THỬ NGHIỆM</Text>
              <Text style={styles.title}>Tất cả thử nghiệm ({logs.length})</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}>
              <X size={18} color={WattPrintTokens.colors.primary} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.listCard}>
              {logs.map((item, index) => (
                <ExperimentLogRow key={item.id} item={item} bordered={index > 0} />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  scrim: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: WattPrintTokens.colors.neutralGround, // #F2F4ED
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCD3C7',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  eyebrow: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  title: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 22,
    color: WattPrintTokens.colors.primary, // #164437
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E7DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
  },
});
