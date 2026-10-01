import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/common/card';
import { useDeviceUsage, type UsageRange } from '@/features/energy/api';
import { UnderlineTabRow } from '@/features/energy/components/underline-tab-row';
import { UsageBarChart } from '@/features/energy/components/usage-bar-chart';
import type { UnitMode, UsageChartItem } from '@/features/energy/types';
import { kwhText, periodLabel, toChartItems, vnd } from '@/features/energy/usage-view';

import { styles } from './device-detail-styles';

const DEV_TABS = [
  { key: 'day', label: 'NGÀY' },
  { key: 'week', label: 'TUẦN' },
  { key: 'month', label: 'THÁNG' },
];

function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}p` : `${m}p`;
}

const runDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

interface DeviceDetailBodyProps {
  deviceKey: string;
  /** Kỳ đang tải (đã trễ theo `useDeferredValue`). */
  range: UsageRange;
  offset: number;
  /** Tab người dùng vừa bấm: để tab sáng ngay, không đợi dữ liệu. */
  activeTab: UsageRange;
  unit: UnitMode;
  pickedBar: number | null;
  onPickBar: (index: number) => void;
  onChangeTab: (key: string) => void;
  onChangeOffset: (next: number) => void;
}

/** Phần có dữ liệu của chi tiết thiết bị; suspend về ranh giới Suspense của màn hình. */
export function DeviceDetailBody({
  deviceKey,
  range,
  offset,
  activeTab,
  unit,
  pickedBar,
  onPickBar,
  onChangeTab,
  onChangeOffset,
}: DeviceDetailBodyProps) {
  const { data } = useDeviceUsage(deviceKey, range, offset);

  const chartItems: UsageChartItem[] = useMemo(
    // cùng nhãn cột với trang Tiêu thụ; một thiết bị không chia bậc nên bỏ phần xếp chồng
    () =>
      toChartItems(
        range,
        data.buckets.map((b) => ({ ...b, previous_cost_vnd: null, segments: [] }))
      ).map((item) => ({ ...item, tierSegments: undefined })),
    [data, range]
  );
  const lastIndex = chartItems.reduce((acc, c, idx) => (c.kwh > 0 ? idx : acc), 0);
  const selectedBar = Math.min(pickedBar ?? lastIndex, Math.max(chartItems.length - 1, 0));

  const runs = data.runs;
  const currentEstimate = unit === 'kwh' ? `${kwhText(data.kwh)} kWh` : `${vnd(data.cost_vnd)} đ`;
  const dateLabel = periodLabel(range, data.period, offset);
  const stats = [
    { label: 'Tổng điện tiêu thụ', value: `${kwhText(data.kwh)} kWh` },
    { label: 'Tiền điện của thiết bị', value: `${vnd(data.cost_vnd)} đ` },
    { label: 'Số lần bật', value: runs ? `${runs.count} lần` : 'Không xác định' },
    { label: 'Tổng thời gian chạy', value: runs ? duration(runs.minutes) : 'Không xác định' },
  ];
  const meta = `${Math.round(data.share_pct)}% điện cả nhà${
    runs?.peak_power_w ? ` · ĐỈNH ${vnd(runs.peak_power_w)} W` : ''
  }`;

  return (
    <>
      <Text style={[styles.deviceMeta, { alignSelf: 'center' }]}>{meta}</Text>
      {/* Paired Stat Cards (1fr 1fr) */}
      <View style={styles.pairedGrid}>
        {/* Card 1: Average */}
        <Card
          className="border-0 shadow-none bg-white rounded-[20px] p-4 gap-1.5"
          style={styles.statCard}>
          <Text style={styles.statEyebrow}>CÔNG SUẤT TRUNG BÌNH</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>
              {vnd(runs?.avg_power_w ?? data.average_power_w)}
            </Text>
            <Text style={styles.statUnit}>W</Text>
          </View>
          <Text style={styles.statLede}>{runs?.avg_power_w ? 'khi đang bật' : 'trung bình cả kỳ'}</Text>
        </Card>

        {/* Card 2: Cost */}
        <Card
          className="border-0 shadow-none bg-white rounded-[20px] p-4 gap-1.5"
          style={styles.statCard}>
          <Text style={styles.statEyebrow}>CHI PHÍ</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValue}>{vnd(data.cost_vnd / 1000)}</Text>
            <Text style={styles.statUnit}>nghìn đồng</Text>
          </View>
          <Text style={styles.statLede}>trong kỳ đang xem</Text>
        </Card>
      </View>

      {/* Card 3: Usage Breakdown Card */}
      <Card
        className="border-0 shadow-none bg-white rounded-[20px] p-5 gap-3"
        style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardEyebrow}>MỨC TIÊU THỤ</Text>
        </View>

        {/* Underline Range Tabs */}
        <UnderlineTabRow
          tabs={DEV_TABS}
          activeKey={activeTab}
          onChange={onChangeTab}
          fullWidth={true}
        />

        {/* Date Context Navigator */}
        <View style={styles.dateNavRow}>
          <Pressable
            hitSlop={10}
            onPress={() => onChangeOffset(offset - 1)}
            accessibilityRole="button"
            accessibilityLabel="Kỳ trước"
            style={styles.dateNavBtn}>
            <Text style={styles.dateNavChevron}>‹</Text>
          </Pressable>
          <Text style={styles.dateNavLabel}>{dateLabel}</Text>
          <Pressable
            hitSlop={10}
            disabled={offset >= 0}
            onPress={() => onChangeOffset(offset + 1)}
            accessibilityRole="button"
            accessibilityLabel="Kỳ tiếp theo"
            style={[styles.dateNavBtn, offset >= 0 && styles.dateNavBtnDisabled]}>
            <Text style={[styles.dateNavChevron, offset >= 0 && styles.dateNavChevronDisabled]}>
              ›
            </Text>
          </Pressable>
        </View>

        {/* Period Summary Chip */}
        <View style={styles.estimationBanner}>
          <Text style={styles.estimationText}>
            Trong kỳ: <Text style={styles.estimationHighlight}>{currentEstimate}</Text>
            {data.delta_pct === null
              ? ''
              : ` (${data.delta_pct <= 0 ? 'giảm' : 'tăng'} ${Math.round(Math.abs(data.delta_pct))}% so với kỳ trước)`}
          </Text>
        </View>

        {/* Bar Chart with Numbers on Each Column */}
        <UsageBarChart
          items={chartItems}
          selectedIndex={selectedBar}
          onSelect={onPickBar}
          height={140}
          unitMode={unit}
          showLegend={false}
        />

        {/* 4 Stat Rows */}
        <View style={styles.statsList}>
          {stats.map((st) => (
            <View key={st.label} style={styles.statRow}>
              <Text style={styles.statRowLabel}>{st.label}</Text>
              <Text style={styles.statRowValue}>{st.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.statRowLabel}>{data.note}</Text>
      </Card>

      {/* Các lần chạy gần nhất, cùng cách phát hiện với nhật ký ở Trang chủ */}
      {data.recent_runs.length > 0 && (
        <Card
          className="border-0 shadow-none bg-white rounded-[20px] p-5 gap-3"
          style={styles.card}>
          <Text style={styles.cardEyebrow}>CÁC LẦN CHẠY GẦN NHẤT</Text>
          <View style={styles.statsList}>
            {data.recent_runs.map((r) => (
              <View key={r.start} style={styles.statRow}>
                <Text style={styles.statRowLabel}>
                  {runDay(r.start)} · {r.start.slice(11, 16)}–{r.end.slice(11, 16)}
                </Text>
                <Text style={styles.statRowValue}>
                  {duration(r.minutes)} · {kwhText(r.energy_kwh)} kWh
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}
    </>
  );
}
