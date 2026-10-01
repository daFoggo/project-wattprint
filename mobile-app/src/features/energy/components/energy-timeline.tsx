import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DataRamp, Fonts, WattPrintTokens } from '@/constants/theme';
import type { TimelineEvent } from '@/features/energy/types';

interface EnergyTimelineProps {
  events: TimelineEvent[];
  onSeeAll?: () => void;
}

export function EnergyTimeline({ events, onSeeAll }: EnergyTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>('t3'); // default cooktop expanded like prototype

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hôm nay</Text>
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.seeAll}>XEM TẤT CẢ</Text>
        </Pressable>
      </View>

      <View style={styles.timelineWrapper}>
        {/* Continuous 2px rail line */}
        <View style={styles.rail} />

        {events.map((event) => {
          const isExpanded = expandedId === event.id;
          const hasDetail = event.detail.length > 0;
          const dotColor = DataRamp[event.rampIndex % DataRamp.length].bg;

          return (
            <View key={event.id} style={styles.eventRow}>
              {/* Dot on the rail */}
              <View style={[styles.dot, { backgroundColor: dotColor }]} />

              <Text style={styles.timestamp}>{event.time}</Text>

              {/* Tinted event card */}
              <View style={styles.card}>
                <Text style={styles.eventText}>{event.text}</Text>

                {isExpanded && hasDetail && (
                  <View style={styles.detailsList}>
                    {event.detail.map((line, idx) => (
                      <Text key={idx} style={styles.detailLine}>
                        {line}
                      </Text>
                    ))}
                  </View>
                )}

                {hasDetail && (
                  <Pressable
                    onPress={() => toggleExpand(event.id)}
                    style={styles.toggleBtn}>
                    <Text style={styles.toggleLabel}>
                      {isExpanded ? 'Ẩn chi tiết' : `Xem ${event.detail.length} lần chạy`}
                    </Text>
                  </Pressable>
                )}
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
