import type { UsageBucket, UsagePeriod, UsageRange } from './api';
import type { BubbleDevice, UsageChartItem } from './types';

/** Màu của từng bậc, cùng bảng màu với biểu đồ hóa đơn. */
export const TIER_COLORS = ['#DEEEBD', '#B5E930', '#389E1E', '#164437', '#E5A93C', '#DC2626'];

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAY_LONG = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

// Thời điểm của dữ liệu là wall-clock lưu dạng UTC nên luôn đọc bằng getUTC*.
const pad = (n: number) => String(n).padStart(2, '0');
const dm = (d: Date) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;

export const vnd = (n: number) => Math.round(n).toLocaleString('vi-VN');
export const kwhText = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 1 });

function bucketLabels(range: UsageRange, start: string, step: number) {
  const d = new Date(start);
  if (range === 'day') {
    const h = d.getUTCHours();
    return { label: pad(h), tooltip: `${pad(h)}:00–${pad(h + step)}:00` };
  }
  if (range === 'week') {
    return {
      label: WEEKDAY_SHORT[d.getUTCDay()],
      tooltip: `${WEEKDAY_LONG[d.getUTCDay()]} ${dm(d)}`,
    };
  }
  const day = d.getUTCDate();
  return { label: day % 4 === 1 ? String(day) : '', tooltip: `Ngày ${day}/${d.getUTCMonth() + 1}` };
}

export function toChartItems(range: UsageRange, buckets: UsageBucket[]): UsageChartItem[] {
  return buckets.map((b) => ({
    ...bucketLabels(range, b.start, 3),
    kwh: Math.round(b.kwh * 10) / 10,
    cost: b.cost_vnd,
    tierSegments: b.segments.map((s) => {
      const index = Number(s.key.replace('band-', ''));
      return {
        id: `t${index + 1}`,
        label: s.label,
        kwh: s.kwh,
        cost: s.cost_vnd,
        pattern: 'solid' as const,
        color: TIER_COLORS[index],
      };
    }),
  }));
}

/** Nhãn kỳ cho thanh điều hướng, vd. "Hôm nay, 31 tháng 8" hoặc "Tuần 28/08 – 03/09/2023". */
export function periodLabel(range: UsageRange, p: UsagePeriod, offset: number): string {
  const start = new Date(p.start);
  const last = new Date(new Date(p.end).getTime() - 1);
  if (range === 'day') {
    const text = `${start.getUTCDate()} tháng ${start.getUTCMonth() + 1}`;
    if (offset === 0) return `Hôm nay, ${text}`;
    return offset === -1 ? `Hôm qua, ${text}` : `${WEEKDAY_LONG[start.getUTCDay()]}, ${text}`;
  }
  if (range === 'week') {
    return `Tuần ${dm(start)} – ${dm(last)}/${last.getUTCFullYear()}`;
  }
  return `Tháng ${pad(start.getUTCMonth() + 1)}/${start.getUTCFullYear()}`;
}

/** Chỉ số của cột cuối cùng đã có điện (cột "hiện tại" của kỳ). */
export function lastActiveIndex(buckets: UsageBucket[]): number {
  for (let i = buckets.length - 1; i >= 0; i--) if (buckets[i].kwh > 0) return i;
  return 0;
}

/** Thiết bị cho bong bóng, donut và bảng; thiết bị không có điện trong kỳ thì không hiện. */
export function toDevices(devices: { key: string; name: string; energy_kwh: number; share_pct: number; cost_vnd: number }[]): BubbleDevice[] {
  return devices
    .filter((d) => d.energy_kwh > 0)
    .map((d) => ({
    id: d.key,
    name: d.name,
    pct: Math.round(d.share_pct),
    kwh: Math.round(d.energy_kwh * 10) / 10,
    cost: d.cost_vnd,
  }));
}

export const DASHBOARD_LABELS: Record<UsageRange, { period: string; comparison: string }> = {
  day: { period: 'từ đầu ngày đến giờ', comparison: 'cùng giờ hôm qua' },
  week: { period: 'từ đầu tuần đến giờ', comparison: 'cùng kỳ tuần trước' },
  month: { period: 'từ đầu tháng đến giờ', comparison: 'cùng kỳ tháng trước' },
};

export const RANGE_LABELS: Record<UsageRange, { now: string; before: string }> = {
  day: { now: 'Hôm nay', before: 'Hôm qua' },
  week: { now: 'Tuần này', before: 'Tuần trước' },
  month: { now: 'Tháng này', before: 'Tháng trước' },
};

/** Nhãn đường hiện tại / trước và hai đầu trục cho biểu đồ so sánh. */
export function comparisonAxis(range: UsageRange, p: UsagePeriod, offset: number) {
  const labels = RANGE_LABELS[range];
  const start = new Date(p.start);
  const last = new Date(new Date(p.end).getTime() - 1);
  const until = new Date(new Date(p.until).getTime() - 1);
  const axis =
    range === 'day'
      ? { axisStart: '00:00', axisEnd: '24:00', currentDateLabel: `${pad(until.getUTCHours())}:${pad(until.getUTCMinutes())}` }
      : range === 'week'
        ? { axisStart: 'T2', axisEnd: 'CN', currentDateLabel: dm(until) }
        : { axisStart: dm(start), axisEnd: dm(last), currentDateLabel: dm(until) };
  return {
    currentLabel: offset === 0 ? labels.now : 'Kỳ này',
    previousLabel: offset === 0 ? labels.before : 'Kỳ trước',
    ...axis,
  };
}

/** Tiền gọn theo nghìn đồng với một số lẻ: 12.956 -> `13,0` (đơn vị `K` đặt cạnh), 7.412 -> `7,4`. */
export function thousands(vndValue: number): string {
  return (vndValue / 1000).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
