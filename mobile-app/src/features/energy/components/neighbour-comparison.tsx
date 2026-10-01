import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';

interface NeighbourComparisonProps {
  sentence?: string;
  wattage?: number;
  percentile?: number;
  footnote?: string;
  unitMode?: 'kwh' | 'cost';
}

export function NeighbourComparison({
  sentence,
  wattage = 960,
  percentile = 62,
  footnote = 'So sánh với 132 hộ gia đình tương đương dùng WattPrint trong quận của bạn trong 30 ngày qua.',
  unitMode = 'kwh',
}: NeighbourComparisonProps) {
  const bands = [
    { name: 'Tiết kiệm', range: '< 1.000 W', active: true },
    { name: 'Trung bình', range: '1.000 - 1.660 W', active: false },
    { name: 'Dùng nhiều', range: '> 1.660 W', active: false },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>SO SÁNH VỚI KHU VỰC</Text>

      {/* Dynamic Highlighted Headline */}
      <Text style={styles.headline}>
        {sentence ? (
          sentence
        ) : (
          <>
            Mức tiêu thụ trung bình của bạn{' '}
            <Text style={styles.headlineHighlightGood}>
              thấp hơn {percentile}%
            </Text>{' '}
            các hộ gia đình tương đương trong khu vực.
          </>
        )}
      </Text>

      {/* Hero Metric Row & Efficiency Badge */}
      <View style={styles.metricSection}>
        <View style={styles.metricMainRow}>
          <View style={styles.heroRow}>
            <Text style={styles.value}>{wattage.toLocaleString('vi-VN')}</Text>
            <Text style={styles.unit}>W</Text>
            <Text style={styles.subtext}>trung bình của bạn</Text>
          </View>

          {/* Efficiency Rank Badge */}
          <View style={styles.rankBadge}>
            <View style={styles.rankDot} />
            <Text style={styles.rankBadgeText}>Nhóm Tiết kiệm</Text>
          </View>
        </View>

        {/* 3 Distribution Bands */}
        <View style={styles.bandsRow}>
          {bands.map((band, idx) => (
            <View
              key={idx}
              style={[
                styles.bandBar,
                {
                  backgroundColor: band.active
                    ? WattPrintTokens.colors.primary // #164437
                    : '#E2E8DE',
                },
              ]}
            />
          ))}
        </View>

        {/* Band Name & Range Labels (Floor minimum 12px) */}
        <View style={styles.bandLabelsRow}>
          {bands.map((band, idx) => (
            <View
              key={idx}
              style={[
                styles.bandCol,
                idx === 1 && { alignItems: 'center' },
                idx === 2 && { alignItems: 'flex-end' },
              ]}>
              <Text
                style={[
                  styles.bandName,
                  band.active && styles.bandNameActive,
                ]}>
                {band.name}
              </Text>
              <Text
                style={[
                  styles.bandRange,
                  band.active && styles.bandRangeActive,
                ]}>
                {band.range}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footnote Context */}
      <Text style={styles.footnote}>{footnote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl, // 20px
    paddingVertical: 20,
    paddingHorizontal: 22,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  disclosureBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF4EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclosureArrow: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
    color: '#4A6B60',
    marginTop: -2,
  },
  headline: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
    lineHeight: 23,
    color: WattPrintTokens.colors.primary, // #164437
  },
  headlineHighlightGood: {
    fontFamily: Fonts.sansSemiBold,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  metricSection: {
    gap: 10,
    marginTop: 2,
    marginBottom: 4,
  },
  metricMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  value: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 24,
    color: WattPrintTokens.colors.primary, // #164437
    letterSpacing: -0.3,
  },
  unit: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  subtext: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary, // #4A6B60
    marginLeft: 2,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: WattPrintTokens.colors.primaryContainer, // #EFF4E6
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: WattPrintTokens.radii.pill,
  },
  rankDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  rankBadgeText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.primary, // #164437
  },
  bandsRow: {
    flexDirection: 'row',
    gap: 6,
    height: 10,
    width: '100%',
    marginTop: 4,
  },
  bandBar: {
    flex: 1,
    height: '100%',
    borderRadius: WattPrintTokens.radii.pill,
  },
  bandLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 2,
  },
  bandCol: {
    flex: 1,
    gap: 2,
  },
  bandName: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  bandNameActive: {
    fontFamily: Fonts.sansSemiBold,
    color: WattPrintTokens.colors.primary, // #164437
  },
  bandRange: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  bandRangeActive: {
    color: WattPrintTokens.colors.primary, // #164437
  },
  footnote: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: WattPrintTokens.colors.secondary, // #4A6B60
    paddingBottom: 6,
  },
});
