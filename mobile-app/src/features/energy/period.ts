import type { DashboardRange } from './types';

/**
 * Dữ liệu demo là một hộ thật đo trong quá khứ (Plegma 101), nên "bây giờ" của dashboard là một
 * mốc cố định trong dữ liệu chứ không phải giờ máy.
 *
 * 20/08/2023 (Chủ nhật, mùa nóng) được chọn từ `/demo/evaluation/daily`: đủ phút, cơ cấu cân bằng
 * (AC 27%, nóng lạnh 33%, tủ lạnh 12%, Khác 27%; máy giặt không chạy hôm đó), dự đoán lệch khoảng 18% so
 * với số đo thật trên tổng điện cả ngày. Tuần 14–20/08 đủ 7 ngày, tháng 08 đủ 19/20 ngày, các kỳ so sánh
 * liền trước đều có dữ liệu. Mốc là 23:59 để "từ đầu ngày đến giờ" phủ trọn ngày.
 */
export const DEMO_NOW = Date.UTC(2023, 7, 20, 23, 59);

const DAY = 86_400_000;
const WEEK = 7 * DAY;

export interface RangeWindow {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  period: string;
  comparison: string;
}

function startOf(range: DashboardRange, at: number): number {
  const day = at - (at % DAY);
  if (range === 'day') return day;
  if (range === 'week') {
    const sinceMonday = (new Date(day).getUTCDay() + 6) % 7;
    return day - sinceMonday * DAY;
  }
  const d = new Date(day);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

export function rangeWindow(range: DashboardRange, now: number): RangeWindow {
  const start = startOf(range, now);
  const elapsed = now - start;

  let previousStart: number;
  if (range === 'day') previousStart = start - DAY;
  else if (range === 'week') previousStart = start - WEEK;
  else {
    const d = new Date(start);
    previousStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1);
  }

  const labels: Record<DashboardRange, { period: string; comparison: string }> = {
    day: { period: 'từ đầu ngày đến giờ', comparison: 'cùng giờ hôm qua' },
    week: { period: 'từ đầu tuần đến giờ', comparison: 'cùng kỳ tuần trước' },
    month: { period: 'từ đầu tháng đến giờ', comparison: 'cùng kỳ tháng trước' },
  };

  return {
    start: new Date(start),
    end: new Date(now),
    previousStart: new Date(previousStart),
    previousEnd: new Date(previousStart + elapsed),
    ...labels[range],
  };
}

/** Tháng của mốc demo (`YYYY-MM`) và ngày của nó (`YYYY-MM-DD`), theo wall-clock của dữ liệu. */
export const DEMO_MONTH = new Date(DEMO_NOW).toISOString().slice(0, 7);
export const DEMO_DAY = new Date(DEMO_NOW).toISOString().slice(0, 10);
