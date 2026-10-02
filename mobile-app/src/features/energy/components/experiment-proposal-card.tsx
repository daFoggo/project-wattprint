import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';

import { Fonts, WattPrintTokens } from '@/constants/theme';
import { useExperimentProposals, type ExperimentProposal } from '@/features/energy/api';
import { APPLIANCE_ICON_ID, formatKwh, formatVnd, roundVnd } from '@/features/energy/experiment-utils';

import { ApplianceIcon } from './appliance-icon';

interface ListProps {
  onPick: (proposal: ExperimentProposal) => void;
}

/** Danh sách đề xuất theo dữ liệu của hộ, đã sắp theo mức tiết kiệm. */
export function ExperimentProposalList({ onPick }: ListProps) {
  const { data } = useExperimentProposals();

  if (data.items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Chưa có đề xuất nào</Text>
        <Text style={styles.emptyText}>
          Các thiết bị chính đều ít chạy nên chưa có gì để giảm. Bạn vẫn có thể tạo thử nghiệm riêng.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {data.items.map((p) => (
        <ProposalCard key={p.id} proposal={p} onPress={() => onPick(p)} />
      ))}
    </View>
  );
}

function ProposalCard({ proposal, onPress }: { proposal: ExperimentProposal; onPress: () => void }) {
  const isScenario = proposal.kind === 'scenario';
  const featured = proposal.featured;
  const { impact } = proposal;

  return (
    <Pressable
      onPress={() => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={proposal.title}
      style={({ pressed }) => [styles.card, featured && styles.cardFeatured, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      <View style={styles.topRow}>
        <View style={styles.tagRow}>
          {featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>KHUYÊN DÙNG</Text>
            </View>
          )}
          <Text style={[styles.tag, isScenario && styles.tagScenario, featured && styles.tagFeatured]}>
            {isScenario ? `${proposal.appliances.length} THIẾT BỊ` : 'THỬ NGHIỆM ĐƠN'}
          </Text>
        </View>
        <ChevronRight
          size={16}
          color={featured ? WattPrintTokens.colors.tertiary : WattPrintTokens.colors.secondary}
          strokeWidth={2.2}
        />
      </View>

      <Text style={[styles.title, featured && styles.textOnDark]}>{proposal.title}</Text>

      <View style={styles.devices}>
        {proposal.actions.map((a) => (
          <View key={a.appliance} style={[styles.devicePill, featured && styles.devicePillFeatured]}>
            <ApplianceIcon name="" id={APPLIANCE_ICON_ID[a.appliance]} size={14} color={WattPrintTokens.colors.primary} />
            <Text style={styles.deviceText}>{a.name}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.impactRow, featured && styles.impactRowFeatured]}>
        <Text style={[styles.impactLabel, featured && styles.reasonFeatured]}>GIẢM ĐƯỢC</Text>
        <Text style={[styles.impactValue, featured && styles.impactValueFeatured]}>
          ~{formatKwh(impact.kwh_per_month)} kWh · ~{formatVnd(roundVnd(impact.vnd_per_month))}
          <Text style={[styles.impactUnit, featured && styles.reasonFeatured]}> mỗi tháng</Text>
        </Text>
      </View>

      <Text style={[styles.reason, featured && styles.reasonFeatured]} numberOfLines={2}>
        {proposal.reason}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl,
    padding: 18,
    gap: 10,
  },
  cardFeatured: {
    backgroundColor: WattPrintTokens.colors.primary,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  featuredBadge: {
    backgroundColor: WattPrintTokens.colors.tertiary,
    borderRadius: WattPrintTokens.radii.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  featuredBadgeText: {
    fontFamily: Fonts.monoSemiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.primary,
  },
  tagFeatured: {
    color: WattPrintTokens.colors.inkInverseMuted,
  },
  textOnDark: {
    color: '#FFFFFF',
  },
  devicePillFeatured: {
    backgroundColor: WattPrintTokens.colors.tertiary,
  },
  impactRowFeatured: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  impactValueFeatured: {
    color: WattPrintTokens.colors.tertiary,
  },
  reasonFeatured: {
    color: WattPrintTokens.colors.inkInverseMuted,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tag: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.secondary,
  },
  tagScenario: {
    color: WattPrintTokens.colors.accentDeep,
  },
  title: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 18,
    lineHeight: 24,
    color: WattPrintTokens.colors.primary,
  },
  devices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  devicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WattPrintTokens.colors.primaryContainer,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: WattPrintTokens.radii.pill,
  },
  deviceText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: WattPrintTokens.colors.primary,
  },
  impactRow: {
    backgroundColor: WattPrintTokens.colors.neutralGround,
    borderRadius: WattPrintTokens.radii.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 2,
  },
  impactLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: WattPrintTokens.colors.secondary,
  },
  impactValue: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
    color: WattPrintTokens.colors.accentDeep,
  },
  impactUnit: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: WattPrintTokens.colors.secondary,
  },
  reason: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: WattPrintTokens.colors.secondary,
  },
  empty: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl,
    padding: 20,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 17,
    color: WattPrintTokens.colors.primary,
  },
  emptyText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: WattPrintTokens.colors.secondary,
  },
});
