import React, { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Fonts, WattPrintTokens } from '@/constants/theme';

export interface ComparisonChartProps {
  currentSeries?: number[];
  previousSeries?: number[];
  currentDayIndex?: number;
  currentLabel?: string;
  previousLabel?: string;
  currentDateLabel?: string;
  unitMode?: 'kwh' | 'cost';
  axisStart?: string;
  axisEnd?: string;
  rate?: number;
}

// Mild smoothing to eliminate erratic day-to-day saw-tooth jitter while preserving real trend peaks
function smoothDailyValues(series: number[]): number[] {
  if (series.length <= 2) return series;
  return series.map((val, i) => {
    if (i === 0 || i === series.length - 1) return val;
    return series[i - 1] * 0.2 + val * 0.6 + series[i + 1] * 0.2;
  });
}

// Smooth cubic Bezier curve with natural tension to prevent saw-tooth jitter
function createSmoothCurvePath(points: { x: number; y: number }[], tension = 0.18): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const pPrev = points[Math.max(0, i - 1)];
    const pCurr = points[i];
    const pNext = points[i + 1];
    const pNextNext = points[Math.min(points.length - 1, i + 2)];

    const cp1x = pCurr.x + (pNext.x - pPrev.x) * tension;
    const cp1y = pCurr.y + (pNext.y - pPrev.y) * tension;
    const cp2x = pNext.x - (pNextNext.x - pCurr.x) * tension;
    const cp2y = pNext.y - (pNextNext.y - pCurr.y) * tension;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${pNext.x.toFixed(1)} ${pNext.y.toFixed(1)}`;
  }

  return path;
}

export function ComparisonChart({
  currentSeries = [19, 21, 18, 22, 20, 17, 23, 19, 21, 20, 18, 22, 19, 25],
  previousSeries = [
    18, 20, 17, 21, 19, 16, 22, 18, 20, 19, 17, 21, 18, 15,
    19, 21, 20, 18, 22, 19, 21, 17, 20, 19, 22, 18, 21, 19, 20, 18,
  ],
  currentDayIndex,
  currentLabel = 'Tháng này',
  previousLabel = 'Tháng trước',
  currentDateLabel = '14/09',
  unitMode = 'kwh',
  axisStart = '01/09',
  axisEnd = '30/09',
  rate = 2380,
}: ComparisonChartProps) {
  const [chartWidth, setChartWidth] = useState(320);

  // Milestone day index (0-indexed, default is latest recorded day in currentSeries)
  const milestoneIndex =
    currentDayIndex !== undefined
      ? currentDayIndex
      : Math.max(0, currentSeries.length - 1);

  // 1. Cumulative totals from day 1 up to the milestone day
  const cumulativeNow = useMemo(() => {
    const slice = currentSeries.slice(0, milestoneIndex + 1);
    return slice.reduce((acc, val) => acc + val, 0);
  }, [currentSeries, milestoneIndex]);

  const cumulativeLast = useMemo(() => {
    const slice = previousSeries.slice(0, milestoneIndex + 1);
    return slice.reduce((acc, val) => acc + val, 0);
  }, [previousSeries, milestoneIndex]);

  // Delta percentage based on cumulative usage at the milestone
  const diffPct = useMemo(() => {
    if (cumulativeLast <= 0) return 0;
    return Math.round(((cumulativeNow - cumulativeLast) / cumulativeLast) * 100);
  }, [cumulativeNow, cumulativeLast]);

  // Split value and unit for clean, un-spaced typography
  const formattedNow = useMemo(() => {
    if (unitMode === 'cost') {
      return {
        val: Math.round(cumulativeNow * rate).toLocaleString('vi-VN'),
        unit: 'đ',
      };
    }
    return {
      val: cumulativeNow.toFixed(1).replace('.', ','),
      unit: 'kWh',
    };
  }, [cumulativeNow, unitMode, rate]);

  const formattedLast = useMemo(() => {
    if (unitMode === 'cost') {
      return {
        val: Math.round(cumulativeLast * rate).toLocaleString('vi-VN'),
        unit: 'đ',
      };
    }
    return {
      val: cumulativeLast.toFixed(1).replace('.', ','),
      unit: 'kWh',
    };
  }, [cumulativeLast, unitMode, rate]);

  // 2. Daily line layout across the month
  const totalDays = Math.max(previousSeries.length, 30);
  const chartHeight = 135;
  const padX = 12;
  const padTop = 16;
  const padBottom = 16;
  const plotW = Math.max(10, chartWidth - padX * 2);
  const plotH = Math.max(10, chartHeight - padTop - padBottom);
  const baselineY = padTop + plotH;

  // Maximum daily value with comfortable headroom
  const maxDailyVal = useMemo(() => {
    const m = Math.max(...currentSeries, ...previousSeries, 1);
    return m * 1.25;
  }, [currentSeries, previousSeries]);

  const getX = useCallback(
    (idx: number) => padX + (idx / (totalDays - 1)) * plotW,
    [padX, totalDays, plotW]
  );
  const getY = useCallback(
    (val: number) => padTop + plotH - (val / maxDailyVal) * plotH,
    [padTop, plotH, maxDailyVal]
  );

  // Points for daily curve paths using smoothed trend values
  const smoothedLast = useMemo(() => smoothDailyValues(previousSeries), [previousSeries]);
  const smoothedNow = useMemo(() => smoothDailyValues(currentSeries), [currentSeries]);

  const lastPoints = useMemo(
    () => smoothedLast.map((val, i) => ({ x: getX(i), y: getY(val) })),
    [smoothedLast, getX, getY]
  );
  const nowPoints = useMemo(
    () => smoothedNow.map((val, i) => ({ x: getX(i), y: getY(val) })),
    [smoothedNow, getX, getY]
  );

  const lastPath = useMemo(() => createSmoothCurvePath(lastPoints, 0.22), [lastPoints]);
  const nowPath = useMemo(() => createSmoothCurvePath(nowPoints, 0.22), [nowPoints]);

  // Crosshair and marker positions pinned automatically at milestone day
  const crosshairX = getX(milestoneIndex);
  const lastDailyVal = previousSeries[milestoneIndex] ?? 0;
  const nowDailyVal = currentSeries[milestoneIndex] ?? 0;
  const lastDotY = getY(lastDailyVal);
  const nowDotY = getY(nowDailyVal);

  // Soft gradient area under current month's line
  const nowAreaPath = useMemo(() => {
    if (nowPoints.length === 0) return '';
    const lastX = crosshairX.toFixed(1);
    const startX = padX.toFixed(1);
    const base = baselineY.toFixed(1);
    return `${nowPath} L ${lastX} ${base} L ${startX} ${base} Z`;
  }, [nowPath, crosshairX, padX, baselineY, nowPoints.length]);

  return (
    <View style={styles.container}>
      {/* Dynamic Delta Headline */}
      <Text style={styles.headline}>
        {diffPct < 0 ? (
          <>
            Bạn đang dùng{' '}
            <Text style={styles.headlineHighlightGood}>
              ít hơn {Math.abs(diffPct)}%
            </Text>{' '}
            {unitMode === 'cost' ? 'chi phí' : 'điện'} so với cùng kỳ {previousLabel.toLowerCase()}.
          </>
        ) : diffPct > 0 ? (
          <>
            Bạn đang dùng{' '}
            <Text style={styles.headlineHighlightWarn}>
              nhiều hơn {diffPct}%
            </Text>{' '}
            {unitMode === 'cost' ? 'chi phí' : 'điện'} so với cùng kỳ {previousLabel.toLowerCase()}.
          </>
        ) : (
          `Mức tiêu thụ tương đương với cùng kỳ ${previousLabel.toLowerCase()}.`
        )}
      </Text>

      {/* Metrics Row: Cumulative Totals to Date */}
      <View style={styles.metricsRow}>
        {/* Current Period Month-to-date */}
        <View style={styles.metricBlock}>
          <View style={styles.metricLabelRow}>
            <View style={[styles.dot, { backgroundColor: WattPrintTokens.colors.primary }]} />
            <Text style={styles.metricLabel}>
              {currentLabel} (đến {currentDateLabel})
            </Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={[styles.metricValue, { color: WattPrintTokens.colors.primary }]}>
              {formattedNow.val}
            </Text>
            <Text style={[styles.metricUnit, { color: WattPrintTokens.colors.secondary }]}>
              {formattedNow.unit}
            </Text>
          </View>
        </View>

        {/* Previous Period Same Window */}
        <View style={styles.metricBlock}>
          <View style={styles.metricLabelRow}>
            <View style={[styles.dot, { backgroundColor: '#8EAAA0' }]} />
            <Text style={styles.metricLabel}>
              {previousLabel} (cùng kỳ)
            </Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={[styles.metricValue, { color: WattPrintTokens.colors.secondary }]}>
              {formattedLast.val}
            </Text>
            <Text style={[styles.metricUnit, { color: WattPrintTokens.colors.secondary }]}>
              {formattedLast.unit}
            </Text>
          </View>
        </View>
      </View>

      {/* Sleek SVG Chart Area */}
      <View
        style={styles.chartWrapper}
        onLayout={(e: LayoutChangeEvent) => {
          const w = e.nativeEvent.layout.width;
          if (w > 50 && w !== chartWidth) {
            setChartWidth(w);
          }
        }}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="nowAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={WattPrintTokens.colors.primary} stopOpacity={0.12} />
              <Stop offset="100%" stopColor={WattPrintTokens.colors.primary} stopOpacity={0.01} />
            </LinearGradient>
          </Defs>

          {/* Subtle Horizontal Reference Gridlines */}
          <Line
            x1={padX}
            y1={padTop + plotH * 0.5}
            x2={chartWidth - padX}
            y2={padTop + plotH * 0.5}
            stroke="#EEF2EA"
            strokeWidth={1}
            strokeDasharray="4 4"
          />

          {/* Baseline */}
          <Line
            x1={padX}
            y1={baselineY}
            x2={chartWidth - padX}
            y2={baselineY}
            stroke="#E2E8DE"
            strokeWidth={1}
          />

          {/* Soft Grounding Gradient Fill Under Current Month */}
          <Path d={nowAreaPath} fill="url(#nowAreaGrad)" />

          {/* Previous Month Reference Curve (subtle dashed line) */}
          <Path
            d={lastPath}
            fill="none"
            stroke="#A3B8AD"
            strokeWidth={1.8}
            strokeDasharray="3 3"
            strokeLinecap="round"
          />

          {/* Current Month Solid Confident Curve */}
          <Path
            d={nowPath}
            fill="none"
            stroke={WattPrintTokens.colors.primary} // #164437
            strokeWidth={2.8}
            strokeLinecap="round"
          />

          {/* Elegant Thin Milestone Hairline at Day 14 */}
          <Line
            x1={crosshairX}
            y1={padTop - 4}
            x2={crosshairX}
            y2={baselineY}
            stroke={WattPrintTokens.colors.primary}
            strokeWidth={1.2}
            strokeDasharray="3 3"
            opacity={0.35}
          />

          {/* Marker on Previous Month Reference Curve */}
          <Circle
            cx={crosshairX}
            cy={lastDotY}
            r={4}
            fill="#FFFFFF"
            stroke="#8EAAA0"
            strokeWidth={1.8}
          />

          {/* Accent Highlight Marker on Current Month Curve */}
          <Circle
            cx={crosshairX}
            cy={nowDotY}
            r={8}
            fill="rgba(181, 233, 48, 0.25)" // Soft lizard green halo
          />
          <Circle
            cx={crosshairX}
            cy={nowDotY}
            r={5}
            fill={WattPrintTokens.colors.primary}
            stroke="#FFFFFF"
            strokeWidth={1.8}
          />
          <Circle
            cx={crosshairX}
            cy={nowDotY}
            r={2.2}
            fill={WattPrintTokens.colors.tertiary} // #B5E930
          />
        </Svg>
      </View>

      {/* Axis Row: Clean Calendar Timestamps with Highlighted Milestone */}
      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>{axisStart}</Text>

        <View style={styles.milestoneBadge}>
          <View style={styles.milestoneBadgeDot} />
          <Text style={styles.milestoneBadgeText}>Mốc: Ngày {milestoneIndex + 1}</Text>
        </View>

        <Text style={styles.axisLabel}>{axisEnd}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 14,
  },
  headline: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    color: WattPrintTokens.colors.primary, // #164437
  },
  headlineHighlightGood: {
    fontFamily: Fonts.sansSemiBold,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  headlineHighlightWarn: {
    fontFamily: Fonts.sansSemiBold,
    color: '#D97706', // Warm Amber warning
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 28,
    alignItems: 'flex-start',
  },
  metricBlock: {
    gap: 4,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  metricLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricValue: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  metricUnit: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
  },
  chartWrapper: {
    width: '100%',
    height: 135,
    justifyContent: 'center',
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  axisLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
    borderRadius: WattPrintTokens.radii.pill,
  },
  milestoneBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: WattPrintTokens.colors.accentDeep,
  },
  milestoneBadgeText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.primary, // #164437
  },
});

