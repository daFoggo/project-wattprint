import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DataRamp, Fonts, WattPrintTokens } from '@/constants/theme';
import type { ApplianceRuns } from '@/features/energy/api';

interface EnergyTimelineProps {
  appliances: ApplianceRuns[];
}

const MAX_RUNS = 5; // chỉ hiện các lần chạy gần nhất của mỗi thiết bị

const hm = (iso: string) => iso.slice(11, 16);

function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} giờ ${String(m).padStart(2, '0')} phút` : `${m} phút`;
}

const num = (n: number, digits: number) => n.toFixed(digits).replace('.', ',');

export function EnergyTimeline({ appliances }: EnergyTimelineProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(appliances[0]?.key ?? null); // mặc định mở mục đầu tiên

  const toggleExpand = (key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hôm nay</Text>
      </View>

      <View style={styles.timelineWrapper}>
        {/* Continuous 2px rail line */}
        <View style={styles.rail} />

        {appliances.map((a, index) => {
          const isExpanded = expandedKey === a.key;
          const dotColor = DataRamp[index % DataRamp.length].bg;

          return (
            <View key={a.key} style={styles.eventRow}>
              {/* Dot on the rail */}
              <View style={[styles.dot, { backgroundColor: dotColor }]} />

              <Text style={styles.timestamp}>{hm(a.first_start)}</Text>

              {/* Tinted event card */}
              <View style={styles.card}>
                <Text style={styles.eventText}>
                  {a.name} chạy {a.run_count} lần, tổng {duration(a.minutes)}, {num(a.energy_kwh, 2)} kWh.
                </Text>

                {isExpanded && (
                  <View style={styles.detailsList}>
                    {a.runs.slice(-MAX_RUNS).map((r) => (
                      <Text key={r.start} style={styles.detailLine}>
                        {hm(r.start)}–{hm(r.end)} · {duration(r.minutes)} · {num(r.energy_kwh, 2)} kWh · đỉnh{' '}
                        {r.peak_power_w} W
                      </Text>
                    ))}
                  </View>
                )}

                <Pressable onPress={() => toggleExpand(a.key)} style={styles.toggleBtn}>
                  <Text style={styles.toggleLabel}>
                    {isExpanded
                      ? 'Ẩn chi tiết'
                      : `Xem ${Math.min(a.runs.length, MAX_RUNS)} lần chạy gần nhất`}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 10,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15,
    color: WattPrintTokens.colors.primary, // #164437
  },
  seeAll: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
  timelineWrapper: {
    position: 'relative',
    paddingLeft: 26,
  },
  rail: {
    position: 'absolute',
    left: 5,
    top: 6,
    bottom: 24,
    width: 2,
    backgroundColor: WattPrintTokens.colors.neutralLine, // #E7EBE1
  },
  eventRow: {
    position: 'relative',
    paddingBottom: 14,
  },
  dot: {
    position: 'absolute',
    left: -26,
    top: 4,
    width: 12,
    height: 12,
    borderRadius: WattPrintTokens.radii.xs, // 4px
  },
  timestamp: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.48, // 0.04em
    color: WattPrintTokens.colors.secondary, // #4A6B60
    marginBottom: 7,
  },
  card: {
    backgroundColor: WattPrintTokens.colors.neutralGround, // #F2F4ED
    borderRadius: WattPrintTokens.radii.md, // 14px
    paddingVertical: 13,
    paddingHorizontal: 15,
    gap: 6,
  },
  eventText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: WattPrintTokens.colors.primary, // #164437
  },
  detailsList: {
    paddingTop: 2,
    gap: 2,
  },
  detailLine: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    lineHeight: 19.5,
    color: WattPrintTokens.colors.secondary, // #4A6B60
  },
  toggleBtn: {
    alignSelf: 'flex-start',
    backgroundColor: WattPrintTokens.colors.neutral, // #FFFFFF
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  toggleLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.48,
    color: WattPrintTokens.colors.accentDeep, // #2F7A0C
  },
});
