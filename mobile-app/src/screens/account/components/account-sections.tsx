import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/common/card';
import { Fonts, WattPrintTokens } from '@/constants/theme';
import { useBilling, useHousehold } from '@/features/energy/api';

const vnNumber = (n: number) => n.toLocaleString('vi-VN');
/** `2023-08-31T23:59:00Z` -> `31/08/2023`. */
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

function initials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  const two = words.length > 1 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2);
  return two.toUpperCase();
}

export function InfoRows({ title, rows }: { title: string; rows: [label: string, value: string][] }) {
  return (
    <Card style={styles.groupCard}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupItems}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.itemRow}>
            <Text style={styles.itemLabel}>{label}</Text>
            <Text style={styles.itemValue}>{value}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Hồ sơ hộ, hai thẻ trạng thái và thông tin nhà: tất cả từ `/demo/household` và `/demo/billing`. */
export function HouseholdSection() {
  const router = useRouter();
  const { data } = useHousehold();
  const { data: bill } = useBilling('household');
  const h = data.household;
  const appliances = h.appliances.filter((a) => a.kind === 'appliance').length;

  return (
    <>
      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(h.name)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{h.name}</Text>
          <Text style={styles.userEmail}>
            {h.dataset} · {h.country}
          </Text>
        </View>
      </View>

      <View style={styles.pairedGrid}>
        <Pressable
          onPress={() => router.push('/account/billing')}
          accessibilityRole="button"
          accessibilityLabel="Xem chi tiết biểu phí và hóa đơn"
          style={{ flex: 1 }}>
          <Card style={styles.statusCard}>
            <View style={styles.statusHeaderRow}>
              <Text style={styles.statusEyebrow}>BIỂU PHÍ</Text>
              <Text style={styles.statusArrow}>›</Text>
            </View>
            <Text style={styles.statusValue}>
              {bill.scheme === 'tier' ? 'Sinh hoạt · 6 bậc' : 'Theo giờ'}
            </Text>
          </Card>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Card style={styles.statusCard}>
            <Text style={styles.statusEyebrow}>DỮ LIỆU</Text>
            <Text style={styles.statusValue}>
              Đủ {(100 - h.missing_pct).toFixed(1).replace('.', ',')}%
            </Text>
          </Card>
        </View>
      </View>

      <InfoRows
        title="THÔNG TIN NHÀ"
        rows={[
          ['Bộ dữ liệu', `${h.dataset} (${h.country})`],
          ['Giai đoạn', `${dmy(h.period.start)} – ${dmy(h.period.end)}`],
          ['Số ngày có dữ liệu', `${vnNumber(Math.round(h.valid_days))} ngày`],
          ['Chu kỳ đo', `${h.sampling_interval_seconds} giây`],
          ['Thiết bị nhận diện', `${appliances} thiết bị`],
          ['Điện gán cho thiết bị', `${h.metered_pct.toFixed(0)}%`],
          ['Biểu giá', bill.tariff.name],
        ]}
      />
    </>
  );
}

/** Mô hình tách điện từng thiết bị và nguồn của nó. */
export function ModelSection() {
  const { data } = useHousehold();
  const m = data.model;
  return (
    <InfoRows
      title="MÔ HÌNH NHẬN DIỆN"
      rows={[
        ['Mô hình', m.name],
        ['Số tham số', vnNumber(m.parameters)],
        ['Cửa sổ phân tích', `${m.window_minutes} phút`],
        ['Bài báo', m.paper],
        ['Giấy phép dữ liệu', data.household.dataset_license],
      ]}
    />
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 8 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: WattPrintTokens.radii.pill,
    backgroundColor: WattPrintTokens.colors.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.sansSemiBold, fontSize: 19, color: WattPrintTokens.colors.primary },
  profileInfo: { gap: 2, flex: 1 },
  userName: { fontFamily: Fonts.sansSemiBold, fontSize: 17, color: WattPrintTokens.colors.primary },
  userEmail: { fontFamily: Fonts.sans, fontSize: 14, color: WattPrintTokens.colors.secondary },
  pairedGrid: { flexDirection: 'row', gap: 12, width: '100%' },
  statusCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 5,
  },
  statusHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusArrow: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
    color: WattPrintTokens.colors.accentDeep,
    lineHeight: 16,
  },
  statusEyebrow: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep,
  },
  statusValue: { fontFamily: Fonts.sansSemiBold, fontSize: 16, color: WattPrintTokens.colors.primary },
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
    gap: 16,
    paddingVertical: 13,
  },
  itemLabel: { fontFamily: Fonts.sans, fontSize: 15, color: WattPrintTokens.colors.primary },
  itemValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: Fonts.monoMedium,
    fontSize: 13,
    color: WattPrintTokens.colors.secondary,
  },
});
