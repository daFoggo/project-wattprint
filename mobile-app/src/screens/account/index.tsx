import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Host, Switch } from '@expo/ui';
import Constants from 'expo-constants';

import { Card } from '@/components/common/card';
import { QueryBoundary } from '@/components/common/query-boundary';
import { Fonts, WattPrintTokens } from '@/constants/theme';
import { ALERT_PREF_ITEMS } from '@/features/energy/alert-prefs';
import { DEMO_NOW } from '@/features/energy/period';
import { useEnergyStore } from '@/features/energy/use-energy-store';

import { HouseholdSection, InfoRows, ModelSection } from './components/account-sections';
import { HouseholdSkeleton, ModelSkeleton } from './components/account-skeletons';

const demoMoment = (() => {
  const iso = new Date(DEMO_NOW).toISOString();
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)}`;
})();

export function AccountScreen() {
  const { alertPrefs, setAlertPref, resetLocalData } = useEnergyStore();

  const confirmReset = () =>
    Alert.alert(
      'Xoá dữ liệu trên máy?',
      'Các cuộc hội thoại, thử nghiệm và công tắc thông báo đã lưu trên máy sẽ bị xoá. Số liệu điện không bị ảnh hưởng.',
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Xoá', style: 'destructive', onPress: resetLocalData },
      ]
    );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.groundHeader}>
          <Text style={styles.title}>Tài khoản</Text>
        </View>

        <QueryBoundary fallback={<HouseholdSkeleton />} errorMessage="Không tải được thông tin hộ gia đình.">
          <HouseholdSection />
        </QueryBoundary>

        <Card style={styles.groupCard}>
          <Text style={styles.groupTitle}>THÔNG BÁO</Text>
          <View style={styles.groupItems}>
            {ALERT_PREF_ITEMS.map((item) => (
              <View key={item.key} style={styles.itemRow}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Host matchContents>
                  <Switch value={alertPrefs[item.key]} onValueChange={(v) => setAlertPref(item.key, v)} />
                </Host>
              </View>
            ))}
          </View>
        </Card>

        <QueryBoundary fallback={<ModelSkeleton />} errorMessage="Không tải được thông tin mô hình.">
          <ModelSection />
        </QueryBoundary>

        <InfoRows
          title="ỨNG DỤNG"
          rows={[
            ['Phiên bản', Constants.expoConfig?.version ?? '—'],
            ['Thời điểm của dữ liệu demo', demoMoment],
          ]}
        />

        <Pressable
          onPress={confirmReset}
          accessibilityRole="button"
          style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.resetText}>Xoá dữ liệu trên máy</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WattPrintTokens.colors.neutralGround },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 12 },
  groundHeader: { paddingHorizontal: 8, paddingBottom: 6 },
  title: { fontFamily: Fonts.sansSemiBold, fontSize: 24, color: WattPrintTokens.colors.primary },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl,
    paddingVertical: 18,
    paddingHorizontal: 22,
    paddingBottom: 8,
    gap: 4,
  },
  groupTitle: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep,
  },
  groupItems: { gap: 2 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  itemLabel: { fontFamily: Fonts.sans, fontSize: 15, color: WattPrintTokens.colors.primary },
  resetBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 4,
  },
  resetText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: '#C44536' },
});
