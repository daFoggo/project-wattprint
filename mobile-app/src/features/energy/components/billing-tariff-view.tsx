import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import {
  BILL_DAYS,
  CROSS_DAY,
  CURRENT_TIER,
  DAYS_LEFT,
  HEADROOM,
  MONTH_COST,
  NEXT_TIER,
  PACE,
  PROJECTED_MONTH_COST,
  PROJECTED_MONTH_KWH,
  STEP_PCT,
  TIER_USED,
  TIERS,
  TOU_TIERS,
} from '@/features/energy/mock';
import type { CustomerType } from '@/features/energy/types';

interface BillingTariffViewProps {
  customerType?: CustomerType;
  onCustomerChange?: (type: CustomerType) => void;
  hideChart?: boolean;
}

export function BillingTariffView({
  hideChart = false,
}: BillingTariffViewProps) {
  const [billingMode, setBillingMode] = useState<'tier' | 'tou'>('tier');

  const maxDayKwh = Math.max(...BILL_DAYS.map((d) => d.kwh)) || 1;
  const chartHeight = 105;

  const totalCostDisplay = `${Math.round(MONTH_COST).toLocaleString('vi-VN')}`;
  const projectedCostDisplay = `${PROJECTED_MONTH_COST.toLocaleString('vi-VN')}`;

  const warnTag = 'DỰ BÁO BẬC 5 EVN';
  const warnText = `Bạn đang ở ${CURRENT_TIER.name} với mức dự phòng ${Math.round(
    HEADROOM
  )} kWh. ${NEXT_TIER.name} (3.350 đ/kWh) đắt hơn ${STEP_PCT}%, và với mức tiêu thụ hiện tại ${PACE.toFixed(
    1
  )} kWh/ngày, bạn sẽ chạm Bậc 5 vào ngày ${CROSS_DAY}/9 (ngày mai). Dự báo cả tháng sẽ chạm ${PROJECTED_MONTH_KWH} kWh (~${projectedCostDisplay} đ).`;

  const rows = TIERS.map((t, i) => ({
    name: t.name,
    sub: t.sub,
    used: `${Math.round(TIER_USED[i])}`,
    cost: `${Math.round(TIER_USED[i] * t.price).toLocaleString('vi-VN')}`,
    color: t.color,
    symbol: t.symbol ?? '■',
    pattern: t.pattern ?? 'solid',
  }));

  const handleModeChange = (mode: 'tier' | 'tou') => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setBillingMode(mode);
  };

  return (
    <View style={styles.container}>
      {/* 1. BILL TO DATE & FORECAST CARD */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.eyebrow}>
            {billingMode === 'tier' ? 'HÓA ĐƠN & BẬC THANG EVN' : 'BIỂU PHÍ THEO KHUNG GIỜ (TOU)'}
          </Text>

          {/* Mode Switcher: BẬC 5 ⇄ TOU */}
          <View style={styles.pillTrack}>
            <Pressable
              onPress={() => handleModeChange('tier')}
              accessibilityRole="button"
              accessibilityLabel="Xem theo 6 bậc thang EVN"
              style={[styles.pillItem, billingMode === 'tier' && styles.pillItemActive]}>
              <Text style={[styles.pillText, billingMode === 'tier' && styles.pillTextActive]}>
                BẬC 5
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleModeChange('tou')}
              accessibilityRole="button"
              accessibilityLabel="Xem theo giờ dùng TOU"
              style={[styles.pillItem, billingMode === 'tou' && styles.pillItemActive]}>
              <Text style={[styles.pillText, billingMode === 'tou' && styles.pillTextActive]}>
                TOU
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Headline summary */}
        <Text style={styles.sentence}>
          {billingMode === 'tier'
            ? `Đã dùng 284 kWh (Bậc 4/6), còn ${DAYS_LEFT} ngày trong chu kỳ.`
            : 'Cơ cấu 3 khung giờ: Cao điểm chiếm 38% phụ tải.'}
        </Text>

        {/* Cost comparison row */}
        <View style={styles.figuresRow}>
          <View style={styles.figureCol}>
            <Text style={styles.figureLabel}>TẠM TÍNH 14 NGÀY</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalValue}>{totalCostDisplay}</Text>
              <Text style={styles.totalUnit}>VND</Text>
            </View>
          </View>

          <View style={styles.figureDivider} />

          <View style={styles.figureCol}>
            <Text style={styles.figureLabel}>DỰ BÁO CẢ THÁNG (608 kWh)</Text>
            <View style={styles.totalRow}>
              <Text style={styles.forecastValue}>{projectedCostDisplay}</Text>
              <Text style={styles.forecastUnit}>VND</Text>
            </View>
          </View>
        </View>

        {/* TIER MODE: Stacked Daily Columns */}
        {billingMode === 'tier' && !hideChart && (
          <View style={styles.chartWrapper}>
            <View style={[styles.chartBox, { height: chartHeight + 20 }]}>
              {BILL_DAYS.map((d) => {
                const h = Math.round((d.kwh / maxDayKwh) * chartHeight);
                return (
                  <View key={d.day} style={styles.dayCol}>
                    <View style={[styles.dayStack, { height: h }]}>
                      {d.segs.map((sg: { ti: number; kwh: number }, idx: number) => (
                        <View
                          key={idx}
                          style={{
                            height: Math.max(2, Math.round((sg.kwh / d.kwh) * h)),
                            backgroundColor: TIERS[sg.ti]?.color ?? '#164437',
                            width: '100%',
                          }}
                        />
                      ))}
                    </View>
                    <Text style={styles.dayLabel}>
                      {d.day % 4 === 1 ? String(d.day) : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.chartFootnote}>
              Mỗi cột là 1 ngày, xếp chồng theo các bậc thang lũy tiến tương ứng.
            </Text>
          </View>
        )}

        {/* TOU MODE: Proportional Horizontal Distribution Bar */}
        {billingMode === 'tou' && (
          <View style={styles.touBarWrap}>
            <Text style={styles.touBarLabel}>TỶ TRỌNG PHỤ TẢI THEO KHUNG GIỜ</Text>
            <View style={styles.touProgressTrack}>
              {TOU_TIERS.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.touProgressSeg,
                    { flex: item.share, backgroundColor: item.color },
                  ]}
                />
              ))}
            </View>
            <View style={styles.touLegendRow}>
              {TOU_TIERS.map((item) => (
                <View key={item.id} style={styles.touLegendItem}>
                  <View style={[styles.touLegendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.touLegendText}>
                    {item.name}: {item.share}% ({item.kwh} kWh)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* 2. THE WEIGHT BLOCK: TIER 5 / TOU FORECAST BANNER */}
      <View style={styles.weightBlock}>
        <Text style={styles.weightEyebrow}>
          {billingMode === 'tier' ? warnTag : 'TỐI ƯU HÓA BIỂU GIÁ TOU'}
        </Text>
        <Text style={styles.weightText}>
          {billingMode === 'tier'
            ? warnText
            : 'Dịch chuyển phụ tải bình nóng lạnh (2.500 W) và thiết bị công suất lớn sang khung giờ thấp điểm (sau 22:00 @ 1.250 đ) giúp giảm phụ tải đỉnh và tiết kiệm đáng kể so với việc rơi vào Bậc 5 (3.350 đ).'}
        </Text>

        {/* Progress bar across tiers if tier mode */}
        {billingMode === 'tier' && (
          <View style={styles.progressTrack}>
            {TIERS.map((t, i) => (
              <View
                key={t.name}
                style={[
                  styles.progressSeg,
                  {
                    flex: Math.max(TIER_USED[i], 6),
                    backgroundColor: TIER_USED[i] > 0 ? t.color : '#E7EBE1',
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* 3. DETAILED TABLE CARD */}
      <View style={styles.card}>
        <Text style={styles.eyebrow}>
          {billingMode === 'tier'
            ? 'CHI TIẾT 6 BẬC THANG EVN'
            : 'CHI TIẾT KHUNG GIỜ TOU (3 GIÁ)'}
        </Text>
        <Text style={styles.sentenceSmall}>
          {billingMode === 'tier'
            ? '6 bậc thang lũy tiến áp dụng trên tổng điện tiêu thụ tích lũy trong chu kỳ.'
            : 'Phân bổ điện năng tiêu thụ và chi phí tương ứng theo từng khung giờ.'}
        </Text>

        {/* Table for Tier Mode */}
        {billingMode === 'tier' && (
          <>
            <View style={styles.tableHeader}>
              <View style={styles.colSpacer} />
              <Text style={[styles.colHeader, { flex: 1 }]}>BẬC THANG EVN</Text>
              <Text style={[styles.colHeader, styles.colUsed]}>ĐÃ DÙNG</Text>
              <Text style={[styles.colHeader, styles.colCost]}>THÀNH TIỀN</Text>
            </View>

            <View style={styles.rowsList}>
              {rows.map((row, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <View
                    style={[
                      styles.symbolBadge,
                      { backgroundColor: row.color },
                    ]}>
                    <Text style={styles.symbolBadgeText}>■</Text>
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{row.name}</Text>
                    <Text style={styles.rowSub}>{row.sub}</Text>
                  </View>
                  <Text style={styles.rowUsed}>{row.used} kWh</Text>
                  <Text style={styles.rowCost}>{row.cost} đ</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Table for TOU Mode */}
        {billingMode === 'tou' && (
          <>
            <View style={styles.tableHeader}>
              <View style={styles.colSpacer} />
              <Text style={[styles.colHeader, { flex: 1 }]}>KHUNG GIỜ</Text>
              <Text style={[styles.colHeader, styles.colUsed]}>TIÊU THỤ</Text>
              <Text style={[styles.colHeader, styles.colCost]}>THÀNH TIỀN</Text>
            </View>

            <View style={styles.rowsList}>
              {TOU_TIERS.map((tou) => (
                <View key={tou.id} style={styles.tableRow}>
                  <View
                    style={[
                      styles.symbolBadge,
                      { backgroundColor: tou.color },
                    ]}>
                    <Text style={styles.symbolBadgeText}>■</Text>
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{tou.name}</Text>
                    <Text style={styles.rowSub}>
                      {tou.hours} · {tou.price.toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                  <Text style={styles.rowUsed}>
                    {tou.kwh.toFixed(1)} kWh
                  </Text>
                  <Text style={styles.rowCost}>
                    {tou.cost.toLocaleString('vi-VN')} đ
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Subtotal with VAT container */}
        <View style={styles.vatContainer}>
          <Text style={styles.vatLabel}>Tạm tính 14 ngày (gồm 8% VAT)</Text>
          <Text style={styles.vatValue}>{totalCostDisplay} VND</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl, // 20px
    paddingVertical: 20,
    paddingHorizontal: 22,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  pillTrack: {
    flexDirection: 'row',
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
    borderRadius: WattPrintTokens.radii.pill,
    padding: 3,
    gap: 2,
    flexShrink: 0,
  },
  pillItem: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: WattPrintTokens.radii.pill,
    backgroundColor: 'transparent',
  },
  pillItemActive: {
    backgroundColor: WattPrintTokens.colors.primary, // #164437
  },
  pillText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  pillTextActive: {
    color: WattPrintTokens.colors.tertiary, // #B5E930
  },
  tierStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: WattPrintTokens.radii.pill,
    backgroundColor: WattPrintTokens.colors.primaryContainer,
  },
  tierStatusText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    color: WattPrintTokens.colors.primary,
  },
  sentence: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 18,
    lineHeight: 24.3,
    color: WattPrintTokens.colors.primary, // #164437
  },
  sentenceSmall: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: WattPrintTokens.colors.secondary,
  },
  figuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WattPrintTokens.colors.neutralGround,
    borderRadius: WattPrintTokens.radii.md,
    padding: 12,
    gap: 12,
  },
  figureCol: {
    flex: 1,
    gap: 2,
  },
  figureDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#D6DEC8',
  },
  figureLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.secondary,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  totalValue: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 22,
    letterSpacing: -0.5,
    color: WattPrintTokens.colors.primary,
  },
  totalUnit: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.accentDeep,
  },
  forecastValue: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 22,
    letterSpacing: -0.5,
    color: '#B7791F',
  },
  forecastUnit: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  chartWrapper: {
    gap: 6,
  },
  chartBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    width: '100%',
    paddingTop: 8,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  dayStack: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  dayLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    color: WattPrintTokens.colors.secondary,
    height: 15,
  },
  chartFootnote: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary,
  },
  touBarWrap: {
    gap: 8,
    paddingTop: 4,
  },
  touBarLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.secondary,
  },
  touProgressTrack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: WattPrintTokens.radii.pill,
    overflow: 'hidden',
    gap: 2,
  },
  touProgressSeg: {
    height: '100%',
  },
  touLegendRow: {
    flexDirection: 'column',
    gap: 6,
    marginTop: 4,
  },
  touLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  touLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  touLegendText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.primary,
  },
  weightBlock: {
    backgroundColor: WattPrintTokens.colors.primary, // #164437
    borderRadius: WattPrintTokens.radii.xl, // 20px
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 10,
  },
  weightEyebrow: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.tertiary, // #B5E930
  },
  weightText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20.5,
    color: '#FFFFFF',
  },
  progressTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: WattPrintTokens.radii.pill,
    overflow: 'hidden',
    gap: 2,
    marginTop: 2,
  },
  progressSeg: {
    height: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 4,
  },
  colSpacer: {
    width: 22,
  },
  colHeader: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.72,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  colUsed: {
    width: 68,
    textAlign: 'right',
  },
  colCost: {
    width: 90,
    textAlign: 'right',
  },
  rowsList: {
    gap: 2,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  symbolBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolBadgeCross: {
    backgroundColor: '#164437',
  },
  symbolBadgeHatch: {
    backgroundColor: '#164437',
  },
  symbolBadgeGrid: {
    backgroundColor: '#A8DC7C',
  },
  symbolBadgeStripe: {
    backgroundColor: '#DCE7CF',
  },
  symbolBadgeSolid: {
    backgroundColor: '#5AAE14',
  },
  symbolBadgeMuted: {
    backgroundColor: '#EFF4E6',
    borderWidth: 1,
    borderColor: '#B8C9C1',
  },
  symbolBadgeText: {
    fontSize: 13,
    fontFamily: Fonts.monoMedium,
    color: WattPrintTokens.colors.primary,
  },
  symbolBadgeTextCross: {
    color: '#FF5C5C',
  },
  symbolBadgeTextHatch: {
    color: '#E5A93C',
  },
  symbolBadgeTextGrid: {
    color: '#164437',
  },
  symbolBadgeTextStripe: {
    color: '#2F7A0C',
  },
  symbolBadgeTextSolid: {
    color: '#FFFFFF',
  },
  symbolBadgeTextMuted: {
    color: '#4A6B60',
  },
  rowName: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.primary, // #164437
  },
  rowSub: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 16,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  rowUsed: {
    width: 68,
    fontFamily: Fonts.monoMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.primary,
    textAlign: 'right',
  },
  rowCost: {
    width: 90,
    fontFamily: Fonts.monoMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.primary,
    textAlign: 'right',
  },
  vatContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
    borderRadius: WattPrintTokens.radii.md, // 14px
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  vatLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.primary,
  },
  vatValue: {
    fontFamily: Fonts.monoMedium,
    fontSize: 15,
    color: WattPrintTokens.colors.primary,
  },
});
