import React, { useDeferredValue, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { QueryBoundary } from '@/components/common/query-boundary';
import { Fonts, WattPrintTokens } from '@/constants/theme';
import { BillingBodySkeleton } from '@/features/energy/components/billing-skeletons';
import { TIER_COLORS } from '@/features/energy/usage-view';
import { useBilling, type BillingOut, type Customer, type TouPeriod } from '@/features/energy/api';

type Mode = 'tier' | 'tou';

/** Hộ sinh hoạt tính 6 bậc; đơn vị kinh doanh tính theo giờ (TOU). Nút chuyển để xem thử cả hai. */
const CUSTOMER: Record<Mode, Customer> = { tier: 'household', tou: 'business' };

const TOU_COLORS: Record<TouPeriod, string> = {
  offpeak: '#7CC24C',
  normal: '#E5A93C',
  peak: '#DC2626',
};

const vnd = (n: number) => Math.round(n).toLocaleString('vi-VN');

function bandRange(from: number, to: number | null, price: number): string {
  const head = to === null ? `trên ${from} kWh` : `${from === 0 ? 0 : from + 1} đến ${to} kWh`;
  return `${head}, ${vnd(price)} đ`;
}

function tierAdvice(b: NonNullable<BillingOut['tier']>, pace: number, month: number): string {
  const s = b.status;
  if (s.headroom_kwh === null || s.next_band_name === null) {
    return `Bạn đang ở ${s.band_name}, bậc cao nhất của biểu giá. Mỗi kWh thêm đều tính theo giá bậc này.`;
  }
  const price = b.bands[s.next_band_index ?? 0].price_vnd;
  const step = s.step_pct === null ? '' : ` đắt hơn ${s.step_pct}%`;
  const cross =
    s.cross_day === null
      ? `Với mức ${pace.toFixed(1)} kWh/ngày, bạn sẽ không chạm bậc này trong tháng.`
      : `Với mức ${pace.toFixed(1)} kWh/ngày, bạn sẽ chạm ${s.next_band_name} vào ngày ${s.cross_day}/${month}.`;
  return `Bạn đang ở ${s.band_name} với mức dự phòng ${Math.round(s.headroom_kwh)} kWh. ${s.next_band_name} (${vnd(price)} đ/kWh)${step}. ${cross}`;
}

const MODES: Mode[] = ['tier', 'tou'];

function ModeSwitcher({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <View style={styles.pillTrack}>
      {MODES.map((m) => (
        <Pressable
          key={m}
          onPress={() => {
            try {
              Haptics.selectionAsync();
            } catch {}
            onChange(m);
          }}
          accessibilityRole="button"
          accessibilityLabel={m === 'tier' ? 'Xem theo 6 bậc thang EVN' : 'Xem theo giờ dùng TOU'}
          style={[styles.pillItem, mode === m && styles.pillItemActive]}>
          <Text style={[styles.pillText, mode === m && styles.pillTextActive]}>
            {m === 'tier' ? '6 BẬC' : 'TOU'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Trang hóa đơn: nút chuyển 6 bậc / TOU nằm ngoài ranh giới Suspense nên luôn phản hồi ngay; phần số
 * liệu tự tải và hiện skeleton khi chưa có.
 */
export function BillingTariffView({ hideChart = false }: { hideChart?: boolean }) {
  const [mode, setMode] = useState<Mode>('tier');
  // nút sáng ngay, số liệu đổi sau khi tải xong; trong lúc chờ nội dung cũ mờ đi (không nháy skeleton)
  const deferredMode = useDeferredValue(mode);
  const switcher = <ModeSwitcher mode={mode} onChange={setMode} />;

  return (
    <View style={[styles.container, deferredMode !== mode && { opacity: 0.55 }]}>
      <QueryBoundary
        fallback={<BillingBodySkeleton switcher={switcher} />}
        errorMessage="Không tải được dữ liệu hóa đơn.">
        <BillingTariffBody mode={deferredMode} switcher={switcher} hideChart={hideChart} />
      </QueryBoundary>
    </View>
  );
}

function BillingTariffBody({
  mode: billingMode,
  switcher: modeSwitcher,
  hideChart,
}: {
  mode: Mode;
  switcher: React.ReactNode;
  hideChart: boolean;
}) {
  const { data } = useBilling(CUSTOMER[billingMode]);

  const { tier, tou } = data;
  const days = Math.round(data.days_elapsed);
  const month = Number(data.month.slice(5));
  const totalCostDisplay = vnd(data.bill_to_date.total_vnd);
  const projectedCostDisplay = vnd(data.forecast.bill.total_vnd);
  const peak = tou?.periods.find((p) => p.key === 'peak');
  const offpeak = tou?.periods.find((p) => p.key === 'offpeak');

  const maxDayKwh = Math.max(...(tier?.daily.map((d) => d.kwh) ?? [1]), 1);
  const chartHeight = 105;

  return (
    <>
      {/* 1. BILL TO DATE & FORECAST CARD */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.eyebrow}>
            {tier ? 'HÓA ĐƠN & BẬC THANG EVN' : 'BIỂU PHÍ THEO KHUNG GIỜ (TOU)'}
          </Text>
          {modeSwitcher}
        </View>

        <Text style={styles.sentence}>
          {tier
            ? `Đã dùng ${Math.round(data.kwh_to_date)} kWh (${tier.status.band_name}/${tier.bands.length}), còn ${data.days_in_month - days} ngày trong chu kỳ.`
            : `Cao điểm chiếm ${Math.round(peak?.share_pct ?? 0)}% điện tiêu thụ trong ${days} ngày qua.`}
        </Text>

        <View style={styles.figuresRow}>
          <View style={styles.figureCol}>
            <Text style={styles.figureLabel}>TẠM TÍNH {days} NGÀY</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalValue}>{totalCostDisplay}</Text>
              <Text style={styles.totalUnit}>VND</Text>
            </View>
          </View>

          <View style={styles.figureDivider} />

          <View style={styles.figureCol}>
            <Text style={styles.figureLabel}>
              DỰ BÁO CẢ THÁNG ({Math.round(data.forecast.kwh)} kWh)
            </Text>
            <View style={styles.totalRow}>
              <Text style={styles.forecastValue}>{projectedCostDisplay}</Text>
              <Text style={styles.forecastUnit}>VND</Text>
            </View>
          </View>
        </View>

        {/* TIER MODE: Stacked Daily Columns */}
        {tier && !hideChart && (
          <View style={styles.chartWrapper}>
            <View style={[styles.chartBox, { height: chartHeight + 20 }]}>
              {tier.daily.map((d) => {
                const h = Math.round((d.kwh / maxDayKwh) * chartHeight);
                const day = Number(d.date.slice(8));
                return (
                  <View key={d.date} style={styles.dayCol}>
                    <View style={[styles.dayStack, { height: h }]}>
                      {d.segments.map((sg) => (
                        <View
                          key={sg.band}
                          style={{
                            height: Math.max(2, Math.round((sg.kwh / d.kwh) * h)),
                            backgroundColor: TIER_COLORS[sg.band] ?? '#164437',
                            width: '100%',
                          }}
                        />
                      ))}
                    </View>
                    <Text style={styles.dayLabel}>{day % 4 === 1 ? String(day) : ''}</Text>
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
        {tou && (
          <View style={styles.touBarWrap}>
            <Text style={styles.touBarLabel}>TỶ TRỌNG PHỤ TẢI THEO KHUNG GIỜ</Text>
            <View style={styles.touProgressTrack}>
              {tou.periods.map((item) => (
                <View
                  key={item.key}
                  style={[
                    styles.touProgressSeg,
                    { flex: Math.max(item.share_pct, 1), backgroundColor: TOU_COLORS[item.key] },
                  ]}
                />
              ))}
            </View>
            <View style={styles.touLegendRow}>
              {tou.periods.map((item) => (
                <View key={item.key} style={styles.touLegendItem}>
                  <View style={[styles.touLegendDot, { backgroundColor: TOU_COLORS[item.key] }]} />
                  <Text style={styles.touLegendText}>
                    {item.name}: {Math.round(item.share_pct)}% ({item.kwh.toFixed(1)} kWh)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* 2. THE WEIGHT BLOCK: TIER FORECAST / TOU ADVICE */}
      <View style={styles.weightBlock}>
        <Text style={styles.weightEyebrow}>
          {tier
            ? `DỰ BÁO ${tier.status.next_band_name?.toUpperCase() ?? 'BẬC THANG'} EVN`
            : 'TỐI ƯU HÓA BIỂU GIÁ TOU'}
        </Text>
        <Text style={styles.weightText}>
          {tier
            ? tierAdvice(tier, data.forecast.pace_kwh_per_day, month)
            : peak && offpeak
              ? `Dịch chuyển phụ tải lớn (bình nóng lạnh, điều hòa) khỏi giờ cao điểm (${peak.hours}, ${vnd(peak.price_vnd)} đ/kWh) sang giờ thấp điểm (${offpeak.hours}, ${vnd(offpeak.price_vnd)} đ/kWh) giúp tiết kiệm ${Math.round(100 * (1 - offpeak.price_vnd / peak.price_vnd))}% trên mỗi kWh.`
              : ''}
        </Text>

        {tier && (
          <View style={styles.progressTrack}>
            {tier.bands.map((b) => (
              <View
                key={b.name}
                style={[
                  styles.progressSeg,
                  {
                    flex: Math.max(b.kwh, 6),
                    backgroundColor: b.kwh > 0 ? TIER_COLORS[b.index] : '#E7EBE1',
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
          {tier ? 'CHI TIẾT 6 BẬC THANG EVN' : 'CHI TIẾT KHUNG GIỜ TOU (3 GIÁ)'}
        </Text>
        <Text style={styles.sentenceSmall}>
          {tier
            ? '6 bậc thang lũy tiến áp dụng trên tổng điện tiêu thụ tích lũy trong chu kỳ.'
            : 'Phân bổ điện năng tiêu thụ và chi phí tương ứng theo từng khung giờ.'}
        </Text>

        <View style={styles.tableHeader}>
          <View style={styles.colSpacer} />
          <Text style={[styles.colHeader, { flex: 1 }]}>{tier ? 'BẬC THANG EVN' : 'KHUNG GIỜ'}</Text>
          <Text style={[styles.colHeader, styles.colUsed]}>{tier ? 'ĐÃ DÙNG' : 'TIÊU THỤ'}</Text>
          <Text style={[styles.colHeader, styles.colCost]}>THÀNH TIỀN</Text>
        </View>

        <View style={styles.rowsList}>
          {tier?.bands.map((b) => (
            <View key={b.name} style={styles.tableRow}>
              <View style={[styles.symbolBadge, { backgroundColor: TIER_COLORS[b.index] }]}>
                <Text style={styles.symbolBadgeText}>■</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{b.name}</Text>
                <Text style={styles.rowSub}>{bandRange(b.from_kwh, b.to_kwh, b.price_vnd)}</Text>
              </View>
              <Text style={styles.rowUsed}>{Math.round(b.kwh)} kWh</Text>
              <Text style={styles.rowCost}>{vnd(b.cost_vnd)} đ</Text>
            </View>
          ))}
          {tou?.periods.map((p) => (
            <View key={p.key} style={styles.tableRow}>
              <View style={[styles.symbolBadge, { backgroundColor: TOU_COLORS[p.key] }]}>
                <Text style={styles.symbolBadgeText}>■</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{p.name}</Text>
                <Text style={styles.rowSub}>
                  {p.hours} · {vnd(p.price_vnd)} đ
                </Text>
              </View>
              <Text style={styles.rowUsed}>{p.kwh.toFixed(1)} kWh</Text>
              <Text style={styles.rowCost}>{vnd(p.cost_vnd)} đ</Text>
            </View>
          ))}
        </View>

        {/* Subtotal with VAT container */}
        <View style={styles.vatContainer}>
          <Text style={styles.vatLabel}>
            Tạm tính {days} ngày (gồm {Math.round(data.tariff.vat_rate * 100)}% VAT)
          </Text>
          <Text style={styles.vatValue}>{totalCostDisplay} VND</Text>
        </View>
      </View>
    </>
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
