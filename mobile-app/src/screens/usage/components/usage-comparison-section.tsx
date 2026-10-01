import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/common/card';
import { Fonts, WattPrintTokens } from '@/constants/theme';
import { useUsage } from '@/features/energy/api';
import { ComparisonChart } from '@/features/energy/components/comparison-chart';
import { CopilotInsightCard } from '@/features/energy/components/copilot-insight-card';
import type { UnitMode } from '@/features/energy/types';
import { comparisonAxis, lastActiveIndex } from '@/features/energy/usage-view';
import { useEnergyStore } from '@/features/energy/use-energy-store';

interface UsageComparisonSectionProps {
  /** Tháng cần so: 0 là tháng hiện tại, -1 tháng trước nó, ... */
  monthOffset: number;
  unit: UnitMode;
}

/**
 * So sánh theo tháng + gợi ý Copilot. Tách thành module nạp theo nhu cầu (`React.lazy`) vì nằm cuối
 * trang và nặng (biểu đồ SVG): màn hình vẽ phần trên trước.
 */
export default function UsageComparisonSection({ monthOffset, unit }: UsageComparisonSectionProps) {
  const router = useRouter();
  const { openInsightThread } = useEnergyStore();
  const { data: monthly } = useUsage('month', monthOffset);
  const lastIndex = lastActiveIndex(monthly.buckets);

  return (
    <Card className="border-0 shadow-none bg-white rounded-[20px] p-5 gap-4" style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.eyebrow}>SO SÁNH THEO THÁNG</Text>
      </View>

      <ComparisonChart
        currentSeries={monthly.buckets
          .slice(0, lastIndex + 1)
          .map((b) => (unit === 'cost' ? b.cost_vnd : b.kwh))}
        previousSeries={monthly.buckets.map((b) =>
          unit === 'cost' ? (b.previous_cost_vnd ?? 0) : (b.previous_kwh ?? 0)
        )}
        currentDayIndex={lastIndex}
        {...comparisonAxis('month', monthly.period, monthly.offset)}
        unitMode={unit}
      />

      {/* Copilot: câu hỏi và nhận xét do backend dựng từ số liệu của chính hai tháng này */}
      <CopilotInsightCard
        embedded
        eyebrow="TRỢ LÝ COPILOT · GIẢI ĐÁP"
        question={monthly.insight.question}
        snippet={monthly.insight.text}
        actionText="Hỏi Copilot giải đáp chi tiết"
        onPress={() => {
          const id = openInsightThread(monthly.insight.question, monthly.insight.text);
          router.push({ pathname: '/copilot/[id]', params: { id } });
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: WattPrintTokens.radii.xl, // 20px
    paddingVertical: 20,
    paddingHorizontal: 22,
    gap: 16,
  },
  cardHeaderRow: {
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
});
