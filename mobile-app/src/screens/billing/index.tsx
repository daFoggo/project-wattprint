import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import { BillingTariffView } from '@/features/energy/components/billing-tariff-view';

export function BillingScreen() {
  const router = useRouter();

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.back();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Top Bar: Back */}
        <View style={styles.topActionsRow}>
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={({ pressed }) => [
              styles.backBtnWrap,
              pressed && { opacity: 0.6, transform: [{ scale: 0.96 }] },
            ]}>
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backBtn}>QUAY LẠI</Text>
          </Pressable>
        </View>

        {/* Identity Block on Ground */}
        <View style={styles.identityBlock}>
          <Text style={styles.title}>Hóa đơn & Biểu phí</Text>
          <Text style={styles.subtitle}>Kỳ tháng 09/2026 · EVN Hà Nội</Text>
        </View>

        <BillingTariffView />
      </ScrollView>
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
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  backBtnWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  backChevron: {
    fontFamily: Fonts.monoMedium,
    fontSize: 20,
    lineHeight: 22,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  backBtn: {
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  identityBlock: {
    paddingHorizontal: 8,
    gap: 4,
    paddingBottom: 4,
  },
  title: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 24,
    color: WattPrintTokens.colors.primary, // #164437
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
});