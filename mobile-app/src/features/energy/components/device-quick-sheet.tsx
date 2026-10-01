import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BottomSheet } from '@expo/ui';
import { useRouter } from 'expo-router';

import { DataRamp, Fonts, WattPrintTokens } from '@/constants/theme';
import type { BubbleDevice } from '@/features/energy/types';

import { useEnergyStore } from '@/features/energy/use-energy-store';

interface DeviceQuickSheetProps {
  device: BubbleDevice | null;
  color?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DeviceQuickSheet({ device, color, isOpen, onClose }: DeviceQuickSheetProps) {
  const router = useRouter();
  const { setActiveDeviceDetail } = useEnergyStore();
  const { width } = useWindowDimensions();

  if (!device) return null;

  const handleOpenFullDetail = () => {
    onClose();
    setActiveDeviceDetail(device);
    router.push('/usage');
  };

  const dotColor = color || DataRamp[0].bg;

  return (
    <BottomSheet
      isPresented={isOpen}
      onDismiss={onClose}
      snapPoints={['half']}
      showDragIndicator
      containerColor="#FFFFFF"
      contentPadding={0}>
      <View style={[styles.sheetContent, { width, minWidth: width }]}>
          {/* Header with Color Chip */}
          <View style={styles.headerRow}>
            <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
            <Text style={styles.deviceName}>{device.name}</Text>
            <View style={styles.shareBadge}>
              <Text style={styles.shareBadgeText}>{device.pct}% tỷ trọng</Text>
            </View>
          </View>

          {/* Quick Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel} numberOfLines={1}>TIÊU THỤ</Text>
              <Text style={styles.metricValue}>
                {device.kwh} <Text style={styles.metricUnit}>kWh</Text>
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel} numberOfLines={1}>ƯỚC TÍNH CHI PHÍ</Text>
              <Text style={styles.metricValue}>
                {Math.round(device.kwh * 2500).toLocaleString('vi-VN')}{' '}
                <Text style={styles.metricUnit}>VND</Text>
              </Text>
            </View>
          </View>

          {/* Action Button to Full Screen */}
          <Pressable style={styles.fullDetailBtn} onPress={handleOpenFullDetail}>
            <Text style={styles.fullDetailText}>Xem phân tích thiết bị</Text>
            <Text style={styles.fullDetailArrow}>›</Text>
          </Pressable>
        </View>
      </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 16,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  deviceName: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 20,
    color: WattPrintTokens.colors.primary,
    flex: 1,
  },
  shareBadge: {
    backgroundColor: WattPrintTokens.colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: WattPrintTokens.radii.pill,
  },
  shareBadgeText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.accentDeep,
  },
  metricsGrid: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: WattPrintTokens.colors.neutralGround,
    borderRadius: WattPrintTokens.radii.md,
    padding: 14,
    gap: 4,
  },
  metricLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.secondary,
  },
  metricValue: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 18,
    color: WattPrintTokens.colors.primary,
  },
  metricUnit: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: WattPrintTokens.colors.secondary,
  },
  fullDetailBtn: {
    width: '100%',
    backgroundColor: WattPrintTokens.colors.primary,
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  fullDetailText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15,
    color: WattPrintTokens.colors.tertiary,
  },
  fullDetailArrow: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 20,
    color: WattPrintTokens.colors.tertiary,
  },
});
