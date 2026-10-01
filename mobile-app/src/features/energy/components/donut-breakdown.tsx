import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { DataRamp, Fonts, WattPrintTokens } from '@/constants/theme';
import type { BubbleDevice, UnitMode } from '@/features/energy/types';
import { ApplianceIcon } from './appliance-icon';

export interface DonutBreakdownProps {
  devices: BubbleDevice[];
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  unitMode?: UnitMode;
  totalKwh?: number;
  periodLabel?: string;
  onDevicePress?: (device: BubbleDevice) => void;
}

// Polar to Cartesian coordinate converter for SVG
function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

// SVG Arc path generator for annular donut slice
function describeDonutSlice(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngle: number,
  endAngle: number
) {
  const sweep = endAngle - startAngle;
  if (sweep <= 0.1) return '';

  // If a single slice spans the full circle (>= 359 deg), split into 2 arcs
  if (sweep >= 359) {
    const midA = startAngle + 180;
    const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
    const p2 = polarToCartesian(cx, cy, rOuter, midA);
    const p3 = polarToCartesian(cx, cy, rOuter, endAngle);
    const p4 = polarToCartesian(cx, cy, rInner, endAngle);
    const p5 = polarToCartesian(cx, cy, rInner, midA);
    const p6 = polarToCartesian(cx, cy, rInner, startAngle);

    return [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `A ${rOuter} ${rOuter} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `A ${rOuter} ${rOuter} 0 0 1 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      `A ${rInner} ${rInner} 0 0 0 ${p5.x.toFixed(2)} ${p5.y.toFixed(2)}`,
      `A ${rInner} ${rInner} 0 0 0 ${p6.x.toFixed(2)} ${p6.y.toFixed(2)}`,
      'Z',
    ].join(' ');
  }

  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p3 = polarToCartesian(cx, cy, rInner, endAngle);
  const p4 = polarToCartesian(cx, cy, rInner, startAngle);

  const largeArcFlag = sweep <= 180 ? '0' : '1';

  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export function DonutBreakdown({
  devices = [],
  selectedIndex = 0,
  onSelectIndex,
  unitMode = 'kwh',
  totalKwh,
}: DonutBreakdownProps) {
  const chartSize = 250;
  const cx = chartSize / 2;
  const cy = chartSize / 2;

  const baseInnerRadius = 66;
  const baseOuterRadius = 106;
  const activeOuterRadius = 115;
  const activeInnerRadius = 63;

  const totalSumKwh =
    totalKwh !== undefined
      ? totalKwh
      : devices.reduce((sum, d) => sum + (d.kwh || 0), 0);

  const totalCost = Math.round(totalSumKwh * 2845); // VND rate

  const activeIndex = Math.min(
    Math.max(0, selectedIndex),
    Math.max(0, devices.length - 1)
  );

  // Calculate cumulative slice angles with crisp white divider gaps
  const totalPct = devices.reduce((sum, d) => sum + (d.pct || 0), 0) || 100;
  const gapAngle = devices.length > 1 ? 2.6 : 0; // Distinct divider gap between slices

  const slices = React.useMemo(() => {
    const angles: { start: number; sweep: number; end: number }[] = [];
    for (let i = 0; i < devices.length; i++) {
      const sweep = (devices[i].pct / totalPct) * 360;
      const start = i === 0 ? 0 : angles[i - 1].end;
      angles.push({ start, sweep, end: start + sweep });
    }

    return devices.map((device, index) => {
      const { start: startAngle, end: endAngle, sweep: rawSweep } = angles[index];
      const midAngle = (startAngle + endAngle) / 2;
      const isSelected = index === activeIndex;

      const rOuter = isSelected ? activeOuterRadius : baseOuterRadius;
      const rInner = isSelected ? activeInnerRadius : baseInnerRadius;

      // Apply gap for clean divider
      const sliceStart = startAngle + gapAngle / 2;
      const sliceEnd = endAngle - gapAngle / 2;

      const pathData = describeDonutSlice(
        cx,
        cy,
        rInner,
        rOuter,
        sliceStart,
        sliceEnd
      );

      // Icon position along arc centerline
      const rMid = (rInner + rOuter) / 2;
      const iconPos = polarToCartesian(cx, cy, rMid, midAngle);
      const iconSize = isSelected ? 20 : rawSweep < 25 ? 14 : 18;

      // Use official WattPrint 5-step Data Ramp for vibrant, consistent identity
      const ramp = DataRamp[index % DataRamp.length];
      const fillColor = ramp.bg;
      const iconColor = ramp.fg;

      return {
        device,
        index,
        pathData,
        isSelected,
        fillColor,
        iconColor,
        iconPos,
        iconSize,
      };
    });
  }, [
    devices,
    totalPct,
    gapAngle,
    activeIndex,
    activeOuterRadius,
    baseOuterRadius,
    activeInnerRadius,
    baseInnerRadius,
    cx,
    cy,
  ]);

  const handleSelect = (idx: number) => {
    Haptics.selectionAsync().catch(() => {});
    onSelectIndex?.(idx);
  };

  const centerHeroValue =
    unitMode === 'cost'
      ? `${totalCost.toLocaleString('vi-VN')}`
      : `${totalSumKwh.toLocaleString('vi-VN')}`;
  const centerUnit = unitMode === 'cost' ? 'đ' : 'kWh';

  return (
    <View style={styles.container}>
      <View style={styles.donutWrapper}>
        <Svg
          width={chartSize}
          height={chartSize}
          viewBox={`0 0 ${chartSize} ${chartSize}`}>
          {/* Unselected slices */}
          {slices
            .filter((s) => !s.isSelected)
            .map((slice) => (
              <G
                key={slice.device.id || slice.index}
                opacity={0.88}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${slice.device.name}, ${slice.device.pct} phần trăm`}>
                <Path
                  d={slice.pathData}
                  fill={slice.fillColor}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  onPress={() => handleSelect(slice.index)}
                />
                <G
                  x={slice.iconPos.x - slice.iconSize / 2}
                  y={slice.iconPos.y - slice.iconSize / 2}
                  onPress={() => handleSelect(slice.index)}>
                  <ApplianceIcon
                    name={slice.device.name}
                    id={slice.device.id}
                    size={slice.iconSize}
                    color={slice.iconColor}
                  />
                </G>
              </G>
            ))}

          {/* Selected slice rendered on top with pop-out elevation & full opacity */}
          {slices
            .filter((s) => s.isSelected)
            .map((slice) => (
              <G
                key={slice.device.id || slice.index}
                opacity={1}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${slice.device.name}, ${slice.device.pct} phần trăm, đang chọn`}>
                <Path
                  d={slice.pathData}
                  fill={slice.fillColor}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  onPress={() => handleSelect(slice.index)}
                />
                <G
                  x={slice.iconPos.x - slice.iconSize / 2}
                  y={slice.iconPos.y - slice.iconSize / 2}
                  onPress={() => handleSelect(slice.index)}>
                  <ApplianceIcon
                    name={slice.device.name}
                    id={slice.device.id}
                    size={slice.iconSize}
                    color={slice.iconColor}
                  />
                </G>
              </G>
            ))}
        </Svg>

        {/* Center Hole: Clean big number with unit only, no description text */}
        <View style={styles.hole} pointerEvents="none">
          <View style={styles.centerHeroRow}>
            <Text style={styles.centerHeroNumber}>{centerHeroValue}</Text>
            {centerUnit ? (
              <Text style={styles.centerHeroUnit}>{centerUnit}</Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  donutWrapper: {
    width: 250,
    height: 250,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hole: {
    position: 'absolute',
    width: 122,
    height: 122,
    borderRadius: 61,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerHeroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  centerHeroNumber: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 26,
    color: WattPrintTokens.colors.primary, // #164437
    letterSpacing: -0.5,
  },
  centerHeroUnit: {
    fontFamily: Fonts.monoMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
});
