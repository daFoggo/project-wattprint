import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import type { BarDatum, UsageChartItem, UsageChartSegment } from '@/features/energy/types';
import { resolveTier, TierVisualBox } from './tier-visual-box';

export interface UsageBarChartProps {
  items?: UsageChartItem[];
  bars?: BarDatum[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  height?: number;
  unitMode?: 'kwh' | 'cost';
  breakdownMode?: string;
  showLegend?: boolean;
}

const TIER_LEGEND = [
  { id: 't1', label: 'Bậc 1', price: '1.984đ' },
  { id: 't2', label: 'Bậc 2', price: '2.050đ' },
  { id: 't3', label: 'Bậc 3', price: '2.380đ' },
  { id: 't4', label: 'Bậc 4', price: '2.998đ' },
  { id: 't5', label: 'Bậc 5', price: '3.350đ' },
  { id: 't6', label: 'Bậc 6', price: '3.460đ' },
];

export function UsageBarChart({
  items,
  bars = [],
  selectedIndex = 0,
  onSelect,
  height = 145,
  unitMode = 'kwh',
  showLegend = true,
}: UsageBarChartProps) {
  // Normalize data: prefer rich items, fallback to bars
  const chartItems: UsageChartItem[] = React.useMemo(() => {
    if (items && items.length > 0) {
      return items;
    }
    return bars.map(([label, val, tooltip]) => ({
      label,
      tooltip,
      kwh: val,
      cost: Math.round(val * 2380),
      tierSegments: [
        {
          id: 't3',
          label: 'Bậc 3',
          kwh: val,
          cost: Math.round(val * 2380),
          pattern: 'solid',
          color: '#5AAE14',
        },
      ],
    }));
  }, [items, bars]);

  // Compute maximum value based on current unitMode
  const maxVal = React.useMemo(() => {
    if (chartItems.length === 0) return 1;
    const values = chartItems.map((it) => (unitMode === 'cost' ? it.cost : it.kwh));
    return Math.max(...values, 1);
  }, [chartItems, unitMode]);

  const chartBarAreaHeight = Math.max(75, height - 30);
  const barWidth = 24;

  const handleBarPress = (index: number) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Haptics safe fallback
    }
    onSelect(index);
  };

  const formatBarValue = (val: number, mode: 'kwh' | 'cost') => {
    if (mode === 'cost') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}tr`;
      }
      if (val >= 1000) {
        const k = val / 1000;
        return k >= 100 ? `${Math.round(k)}k` : `${k.toFixed(k >= 10 ? 0 : 1)}k`;
      }
      return `${Math.round(val)}`;
    }
    // kWh
    if (val >= 100) {
      return `${Math.round(val)}`;
    }
    return Number.isInteger(val) ? `${val}` : `${val.toFixed(1)}`;
  };

  return (
    <View style={styles.container}>
      {/* Main Bars Row */}
      <View style={[styles.chartRow, { height: chartBarAreaHeight + 42 }]}>
        {chartItems.map((item, i) => {
          const isSelected = selectedIndex === i;
          const totalVal = unitMode === 'cost' ? item.cost : item.kwh;
          const formattedVal = formatBarValue(totalVal, unitMode);
          const barHeight = Math.max(
            8,
            Math.round((totalVal / maxVal) * chartBarAreaHeight)
          );

          // Tier segments for 6 EVN tiers
          const rawSegments = item.tierSegments ?? [];
          const segments: UsageChartSegment[] =
            rawSegments.length > 0
              ? rawSegments
              : [
                  {
                    id: 't3',
                    label: 'Bậc 3',
                    kwh: item.kwh,
                    cost: item.cost,
                    pattern: 'solid',
                    color: '#5AAE14',
                  },
                ];

          // Compute individual segment heights
          const segTotalVal =
            segments.reduce(
              (acc, s) => acc + (unitMode === 'cost' ? s.cost : s.kwh),
              0
            ) || 1;

          return (
            <Pressable
              key={i}
              onPress={() => handleBarPress(i)}
              accessibilityRole="button"
              accessibilityLabel={`${item.tooltip}: ${
                unitMode === 'cost'
                  ? `${Math.round(item.cost).toLocaleString('vi-VN')} VND`
                  : `${item.kwh} kWh`
              }`}
              hitSlop={4}
              style={styles.barColumn}>
              {/* Value Label on Top of Bar */}
              <Text
                numberOfLines={1}
                style={[
                  styles.barValueText,
                  isSelected && styles.barValueTextActive,
                ]}>
                {formattedVal}
              </Text>

              {/* Stacked Bar SVG */}
              <View
                style={[
                  styles.barSvgWrap,
                  { height: barHeight },
                  isSelected && styles.barSvgWrapSelected,
                ]}>
                <Svg
                  width={barWidth}
                  height={barHeight}
                  viewBox={`0 0 ${barWidth} ${barHeight}`}>
                  <G>
                    {(() => {
                      let accumulatedY = barHeight;
                      return segments.map((seg, sIdx) => {
                        const sVal = unitMode === 'cost' ? seg.cost : seg.kwh;
                        const sHeight = Math.max(
                          2,
                          Math.round((sVal / segTotalVal) * barHeight)
                        );
                        accumulatedY -= sHeight;
                        const curY = Math.max(0, accumulatedY);

                        const isTop = sIdx === segments.length - 1;
                        const isBottom = sIdx === 0;
                        const tier = resolveTier(
                          seg.id || seg.pattern || seg.label
                        );
                        const rx =
                          isTop && isBottom
                            ? 5
                            : isTop
                            ? 5
                            : isBottom
                            ? 2
                            : 0;
                        const w = barWidth;
                        const h = sHeight;

                        return (
                          <G key={seg.id || sIdx}>
                            {/* Base flat colored rect */}
                            <Rect
                              x={0}
                              y={curY}
                              width={w}
                              height={h}
                              rx={rx}
                              fill={tier.bgColor}
                              stroke={tier.borderColor}
                              strokeWidth={tier.borderColor ? 1 : 0}
                            />
                            {/* Subtle segment divider for stacked bars */}
                            {sIdx < segments.length - 1 && (
                              <Line
                                x1={0}
                                y1={curY}
                                x2={w}
                                y2={curY}
                                stroke="#FFFFFF"
                                strokeWidth={1.5}
                              />
                            )}
                          </G>
                        );
                      });
                    })()}
                  </G>
                </Svg>
              </View>

              {/* Bar Label */}
              <Text
                numberOfLines={1}
                style={[
                  styles.barLabel,
                  isSelected && styles.barLabelActive,
                ]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Visual Symbology Legend for all 6 EVN tiers */}
      {showLegend && (
        <View style={styles.legendContainer}>
          {TIER_LEGEND.map((t) => (
            <View key={t.id} style={styles.legendItem}>
              <TierVisualBox tierId={t.id} width={13} height={13} rx={3} />
              <Text style={styles.legendText}>
                {t.label} <Text style={styles.legendPrice}>({t.price})</Text>
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    width: '100%',
    paddingTop: 6,
  },
  barColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  barValueText: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: -0.3,
    color: WattPrintTokens.colors.secondary, // #4A6B60
    textAlign: 'center',
    height: 16,
  },
  barValueTextActive: {
    color: WattPrintTokens.colors.primary, // #164437
    fontWeight: '700',
  },
  barSvgWrap: {
    width: '100%',
    maxWidth: 24,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 5,
  },
  barSvgWrapSelected: {
    shadowColor: '#164437',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  barLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary, // #4A6B60
    textAlign: 'center',
    height: 16,
  },
  barLabelActive: {
    color: WattPrintTokens.colors.primary, // #164437
    fontWeight: '700',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    rowGap: 8,
    columnGap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F3EC',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: '29%',
  },
  legendText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.primary, // #164437
  },
  legendPrice: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: WattPrintTokens.colors.secondary,
  },
});
