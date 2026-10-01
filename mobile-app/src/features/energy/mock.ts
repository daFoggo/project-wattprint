import type {
  AccountGroup,
  AlertItem,
  BarDatum,
  BillDay,
  BubbleDevice,
  ChatMessage,
  ChatThread,
  DashboardHeroData,
  DashboardRange,
  DeviceDetailData,
  DeviceUsage,
  EnergySummary,
  ActiveExperiment,
  ExperimentLogItem,
  RangeData,
  Suggestion,
  TierInfo,
  TimelineEvent,
  TOUInfo,
  UsageChartItem,
  UsageChartSegment,
  UsagePoint,
} from './types';

export const mockSummary: EnergySummary = {
  currentPowerW: 1840,
  todayKwh: 12.4,
  todayCost: 38200,
  projectedMonthlyCost: 1284000,
  status: 'good',
  statusMessage: 'Mọi thứ đang ổn. Điều hòa chạy ở mức hợp lý.',
  briefSummary:
    'Đã dùng 12,4 kWh hôm nay, thấp hơn 12% so với cùng kỳ tuần trước. Điều hòa vẫn là phụ tải lớn nhất.',
};

export const mockDeviceBreakdown: DeviceUsage[] = [
  { id: 'ac', name: 'Điều hòa', category: 'HVAC', kwh: 6.2, cost: 18600, share: 0.5 },
  { id: 'fridge', name: 'Tủ lạnh', category: 'Khác', kwh: 2.1, cost: 6300, share: 0.17 },
  { id: 'water-heater', name: 'Bình nóng lạnh', category: 'Nước', kwh: 2.4, cost: 7200, share: 0.19 },
  { id: 'induction', name: 'Bếp từ', category: 'Nấu ăn', kwh: 1.1, cost: 3300, share: 0.09 },
  { id: 'others', name: 'Thiết bị khác', category: 'Khác', kwh: 0.6, cost: 1800, share: 0.05 },
];

export const mockUsageSeries: UsagePoint[] = [
  { timestamp: '2026-09-05T12:00:00Z', kwh: 11.2, tariffPeriod: 'normal' },
  { timestamp: '2026-09-06T12:00:00Z', kwh: 13.8, tariffPeriod: 'peak' },
  { timestamp: '2026-09-07T12:00:00Z', kwh: 9.4, tariffPeriod: 'off_peak' },
  { timestamp: '2026-09-08T12:00:00Z', kwh: 12.1, tariffPeriod: 'normal' },
  { timestamp: '2026-09-09T12:00:00Z', kwh: 14.6, tariffPeriod: 'peak' },
  { timestamp: '2026-09-10T12:00:00Z', kwh: 10.3, tariffPeriod: 'normal' },
  { timestamp: '2026-09-11T12:00:00Z', kwh: 12.4, tariffPeriod: 'normal' },
];

export const DASHBOARD_RATE = 2845; // VND per kWh

export const DASHBOARD_RANGES: Record<DashboardRange, DashboardHeroData> = {
  day: {
    kwh: 12.4,
    deltaPct: -12,
    period: 'từ đầu ngày đến giờ',
    comparison: 'các ngày thứ Ba gần đây',
    shares: [52, 24, 9, 8, 7],
  },
  week: {
    kwh: 81.6,
    deltaPct: -4,
    period: 'từ đầu tuần đến giờ',
    comparison: 'cùng kỳ tuần trước',
    shares: [48, 22, 12, 10, 8],
  },
  month: {
    kwh: 284.0,
    deltaPct: 8,
    period: 'từ đầu tháng đến giờ',
    comparison: 'cùng kỳ tháng trước',
    shares: [45, 23, 13, 11, 8],
  },
};

export const DEVICE_NAMES = ['Điều hòa', 'Bình nóng lạnh', 'Bếp từ', 'Tủ lạnh', 'Chạy ngầm'];

export const BUBBLE_SLOTS = [
  { x: 50, y: 46 },
  { x: 18, y: 21 },
  { x: 82, y: 25 },
  { x: 84, y: 74 },
  { x: 20, y: 77 },
];

export function getDevicesForRange(range: DashboardRange): BubbleDevice[] {
  const r = DASHBOARD_RANGES[range];
  return r.shares.map((pct, i) => {
    const kwh = Math.round((r.kwh * pct) / 100 * 10) / 10;
    const cost = Math.round(kwh * DASHBOARD_RATE);
    return {
      id: `dev-${i}`,
      name: DEVICE_NAMES[i],
      pct,
      kwh,
      cost,
    };
  });
}

export const mockAlerts: AlertItem[] = [
  {
    id: 'a1',
    time: '05:12',
    tone: 'good',
    text: 'Tải chạy ngầm giảm xuống 35 W sau khi bạn ngắt cụm ổ cắm TV.',
  },
  {
    id: 'a2',
    time: '18:40',
    tone: 'warning',
    text: 'Điều hòa đã bật ở 24°C. Còn 48 kWh nữa sẽ chuyển sang Bậc 4 EVN.',
  },
];

export const mockTimeline: TimelineEvent[] = [
  {
    id: 't1',
    time: '18:40',
    rampIndex: 0,
    text: 'Điều hòa đã bật, cài đặt 24°C.',
    detail: [],
  },
  {
    id: 't2',
    time: '17:05',
    rampIndex: 1,
    text: 'Bình nóng lạnh đã bật trong 22 phút.',
    detail: [],
  },
  {
    id: 't3',
    time: '12:18',
    rampIndex: 2,
    text: 'Bếp từ đã bật 3 lần, hiện đã tắt.',
    detail: [
      'bật lúc 12:18 trong 14p, hiện đã tắt',
      'bật lúc 07:40 trong 6p, hiện đã tắt',
      'bật lúc 06:12 trong 3p, hiện đã tắt',
    ],
  },
  {
    id: 't4',
    time: '05:12',
    rampIndex: 4,
    text: 'Tải chạy ngầm giảm từ 110 W xuống 35 W.',
    detail: [],
  },
];

// --- Official EVN 6-tier household tariff ---
export const TIERS: TierInfo[] = [
  { name: 'Bậc 1', sub: '0 đến 50 kWh, 1.984 đ', price: 1984, cap: 50, color: '#DEEEBD', symbol: '■', pattern: 'solid' },
  { name: 'Bậc 2', sub: '51 đến 100 kWh, 2.050 đ', price: 2050, cap: 100, color: '#B5E930', symbol: '■', pattern: 'solid' },
  { name: 'Bậc 3', sub: '101 đến 200 kWh, 2.380 đ', price: 2380, cap: 200, color: '#389E1E', symbol: '■', pattern: 'solid' },
  { name: 'Bậc 4', sub: '201 đến 300 kWh, 2.998 đ', price: 2998, cap: 300, color: '#164437', symbol: '■', pattern: 'solid' },
  { name: 'Bậc 5', sub: '301 đến 400 kWh, 3.350 đ', price: 3350, cap: 400, color: '#E5A93C', symbol: '■', pattern: 'solid' },
  { name: 'Bậc 6', sub: 'trên 400 kWh, 3.460 đ', price: 3460, cap: Infinity, color: '#DC2626', symbol: '■', pattern: 'solid' },
];

export const TIER_PATTERNS: ('solid')[] = [
  'solid',
  'solid',
  'solid',
  'solid',
  'solid',
  'solid',
];

export const DAILY = [19, 21, 18, 22, 20, 17, 23, 19, 21, 20, 18, 22, 19, 25];
export const LAST_DAILY = [18, 20, 17, 21, 19, 16, 22, 18, 20, 19, 17, 21, 18, 15];

export const LAST_MONTH_30_DAYS = [
  18, 20, 17, 21, 19, 16, 22, 18, 20, 19, 17, 21, 18, 15,
  19, 21, 20, 18, 22, 19, 21, 17, 20, 19, 22, 18, 21, 19, 20, 18,
];
export const THIS_MONTH_DAYS = [
  19, 21, 18, 22, 20, 17, 23, 19, 21, 20, 18, 22, 19, 25,
];

export function tierSplit(daily: number[]): BillDay[] {
  let cum = 0;
  return daily.map((kwh, d) => {
    const segs: { ti: number; kwh: number }[] = [];
    let left = kwh;
    while (left > 0.01) {
      const ti = TIERS.findIndex((t) => cum < t.cap);
      const room = TIERS[ti].cap === Infinity ? left : TIERS[ti].cap - cum;
      const take = Math.min(left, room);
      segs.push({ ti, kwh: take });
      cum += take;
      left -= take;
    }
    return { day: d + 1, kwh, segs };
  });
}

export const BILL_DAYS = tierSplit(DAILY);
export const TIER_USED = TIERS.map((t, i) =>
  BILL_DAYS.reduce(
    (s: number, d) =>
      s +
      d.segs
        .filter((x: { ti: number; kwh: number }) => x.ti === i)
        .reduce((a: number, b: { ti: number; kwh: number }) => a + b.kwh, 0),
    0
  )
);

export const MONTH_KWH = DAILY.reduce((a, b) => a + b, 0);
export const DAYS_IN = DAILY.length;
export const DAYS_LEFT = 30 - DAYS_IN;
export const PACE = MONTH_KWH / DAYS_IN;
export const HOME_COST = TIERS.reduce((s, t, i) => s + TIER_USED[i] * t.price, 0);
export const MONTH_COST = HOME_COST * 1.08;
export const RATE = MONTH_COST / MONTH_KWH;
export const NEXT_I = TIERS.findIndex((t) => t.cap > MONTH_KWH);
export const CURRENT_TIER = TIERS[NEXT_I] ?? TIERS[2];
export const NEXT_TIER = TIERS[NEXT_I + 1] ?? TIERS[TIERS.length - 1];
export const HEADROOM = CURRENT_TIER.cap - MONTH_KWH;
export const CROSS_DAY = DAYS_IN + Math.ceil(HEADROOM / PACE);
export const STEP_PCT = Math.round((NEXT_TIER.price / CURRENT_TIER.price - 1) * 100);
export const LAST_TOTAL = LAST_DAILY.reduce((a, b) => a + b, 0);
export const MONTH_DELTA = Math.round((MONTH_KWH / LAST_TOTAL - 1) * 100);

// Projected full-month figures at current pace (14-day window -> 30-day projection)
export const PROJECTED_MONTH_KWH = 608;
export const PROJECTED_MONTH_COST = 1938000;

// --- TOU (time-of-use) tariff, 3 price windows ---
export const TOU_TIERS: TOUInfo[] = [
  {
    id: 'tou-off',
    name: 'Thấp điểm',
    sub: '1.250 đ/kWh',
    price: 1250,
    share: 40,
    hours: '22:00–06:00',
    kwh: 113.6,
    cost: 142000,
    color: '#7CC24C',
  },
  {
    id: 'tou-normal',
    name: 'Bình thường',
    sub: '1.850 đ/kWh',
    price: 1850,
    share: 22,
    hours: '06:00–18:00',
    kwh: 62.5,
    cost: 115600,
    color: '#E5A93C',
  },
  {
    id: 'tou-peak',
    name: 'Cao điểm',
    sub: '3.150 đ/kWh',
    price: 3150,
    share: 38,
    hours: '18:00–22:00',
    kwh: 107.9,
    cost: 339900,
    color: '#DC2626',
  },
];

export const DAY_CHART_ITEMS: UsageChartItem[] = [
  {
    label: '00',
    tooltip: '00:00 - 03:00',
    kwh: 1.1,
    cost: Math.round(1.1 * 2380),
    tierSegments: [{ id: 't3', label: 'Bậc 3', kwh: 1.1, cost: Math.round(1.1 * 2380), pattern: 'solid', color: '#5AAE14' }],
  },
  {
    label: '03',
    tooltip: '03:00 - 06:00',
    kwh: 0.9,
    cost: Math.round(0.9 * 2380),
    tierSegments: [{ id: 't3', label: 'Bậc 3', kwh: 0.9, cost: Math.round(0.9 * 2380), pattern: 'solid', color: '#5AAE14' }],
  },
  {
    label: '06',
    tooltip: '06:00 - 09:00',
    kwh: 1.4,
    cost: Math.round(1.4 * 2380),
    tierSegments: [{ id: 't3', label: 'Bậc 3', kwh: 1.4, cost: Math.round(1.4 * 2380), pattern: 'solid', color: '#5AAE14' }],
  },
  {
    label: '09',
    tooltip: '09:00 - 12:00',
    kwh: 1.8,
    cost: Math.round(1.8 * 2380),
    tierSegments: [{ id: 't3', label: 'Bậc 3', kwh: 1.8, cost: Math.round(1.8 * 2380), pattern: 'solid', color: '#5AAE14' }],
  },
  {
    label: '12',
    tooltip: '12:00 - 15:00',
    kwh: 2.2,
    cost: Math.round(2.2 * 2380),
    tierSegments: [{ id: 't3', label: 'Bậc 3', kwh: 2.2, cost: Math.round(2.2 * 2380), pattern: 'solid', color: '#5AAE14' }],
  },
  {
    label: '15',
    tooltip: '15:00 - 18:00',
    kwh: 1.9,
    cost: Math.round(1.9 * 2380),
    tierSegments: [{ id: 't3', label: 'Bậc 3', kwh: 1.9, cost: Math.round(1.9 * 2380), pattern: 'solid', color: '#5AAE14' }],
  },
  {
    label: '18',
    tooltip: '18:00 - 21:00',
    kwh: 2.4,
    cost: Math.round(2.4 * 2380),
    tierSegments: [{ id: 't3', label: 'Bậc 3', kwh: 2.4, cost: Math.round(2.4 * 2380), pattern: 'solid', color: '#5AAE14' }],
  },
  {
    label: '21',
    tooltip: '21:00 - 00:00',
    kwh: 0.7,
    cost: Math.round(0.7 * 2380),
    tierSegments: [{ id: 't3', label: 'Bậc 3', kwh: 0.7, cost: Math.round(0.7 * 2380), pattern: 'solid', color: '#5AAE14' }],
  },
];

const WEEK_DAYS = [
  { label: 'T2', full: 'Thứ Hai', kwh: 10.2 },
  { label: 'T3', full: 'Thứ Ba', kwh: 12.4 },
  { label: 'T4', full: 'Thứ Tư', kwh: 9.8 },
  { label: 'T5', full: 'Thứ Năm', kwh: 13.1 },
  { label: 'T6', full: 'Thứ Sáu', kwh: 11.6 },
  { label: 'T7', full: 'Thứ Bảy', kwh: 12.9 },
  { label: 'CN', full: 'Chủ Nhật', kwh: 11.6 },
];

export const WEEK_CHART_ITEMS: UsageChartItem[] = WEEK_DAYS.map((d, i) => {
  const isSpikeWeekend = i >= 5;
  const normalKwh = isSpikeWeekend ? Math.round((d.kwh - 2.2) * 10) / 10 : d.kwh;
  const warningKwh = isSpikeWeekend ? 2.2 : 0;

  const normalCost = Math.round(normalKwh * 2380);
  const warningCost = Math.round(warningKwh * 3350);

  const tierSegments: UsageChartSegment[] = [
    {
      id: 't3',
      label: 'Bậc 3 (Tiêu chuẩn)',
      kwh: normalKwh,
      cost: normalCost,
      pattern: 'solid',
      color: '#5AAE14',
    },
  ];

  if (isSpikeWeekend) {
    tierSegments.push({
      id: 't5',
      label: 'Bậc 5 (Vượt ngưỡng)',
      kwh: warningKwh,
      cost: warningCost,
      pattern: 'solid',
      color: '#E5A93C',
    });
  }

  return {
    label: d.label,
    tooltip: `${d.full}`,
    kwh: d.kwh,
    cost: normalCost + warningCost,
    tierSegments,
  };
});

export const MONTH_CHART_ITEMS: UsageChartItem[] = BILL_DAYS.map((d) => {
  let dayCost = 0;
  const tierSegments: UsageChartSegment[] = d.segs.map((sg) => {
    const tier = TIERS[sg.ti] ?? TIERS[0];
    const c = Math.round(sg.kwh * tier.price);
    dayCost += c;
    return {
      id: `t${sg.ti + 1}`,
      label: tier.name,
      kwh: Math.round(sg.kwh * 10) / 10,
      cost: c,
      pattern: 'solid',
      color: tier.color,
    };
  });

  return {
    label: `${d.day}`,
    tooltip: `Ngày ${d.day}/09`,
    kwh: d.kwh,
    cost: dayCost,
    tierSegments,
  };
});

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];
const YEAR_KWH = [178, 165, 189, 214, 258, 291, 304, 296, 284, 231, 0, 0];

export const YEAR_CHART_ITEMS: UsageChartItem[] = YEAR_KWH.map((kwh, idx) => {
  const t1 = Math.min(kwh, 50);
  const t2 = Math.min(Math.max(0, kwh - 50), 50);
  const t3 = Math.min(Math.max(0, kwh - 100), 100);
  const t4 = Math.min(Math.max(0, kwh - 200), 100);
  const t5 = Math.min(Math.max(0, kwh - 300), 100);
  const t6 = Math.max(0, kwh - 400);

  const tierSegments: UsageChartSegment[] = [];
  let totalCost = 0;

  if (t1 > 0) {
    const c = Math.round(t1 * 1984);
    totalCost += c;
    tierSegments.push({ id: 't1', label: 'Bậc 1', kwh: t1, cost: c, pattern: 'solid' });
  }
  if (t2 > 0) {
    const c = Math.round(t2 * 2050);
    totalCost += c;
    tierSegments.push({ id: 't2', label: 'Bậc 2', kwh: t2, cost: c, pattern: 'solid' });
  }
  if (t3 > 0) {
    const c = Math.round(t3 * 2380);
    totalCost += c;
    tierSegments.push({ id: 't3', label: 'Bậc 3', kwh: t3, cost: c, pattern: 'solid' });
  }
  if (t4 > 0) {
    const c = Math.round(t4 * 2998);
    totalCost += c;
    tierSegments.push({ id: 't4', label: 'Bậc 4', kwh: t4, cost: c, pattern: 'solid' });
  }
  if (t5 > 0) {
    const c = Math.round(t5 * 3350);
    totalCost += c;
    tierSegments.push({ id: 't5', label: 'Bậc 5', kwh: t5, cost: c, pattern: 'solid' });
  }
  if (t6 > 0) {
    const c = Math.round(t6 * 3460);
    totalCost += c;
    tierSegments.push({ id: 't6', label: 'Bậc 6', kwh: t6, cost: c, pattern: 'solid' });
  }

  return {
    label: `T${idx + 1}`,
    tooltip: `${MONTH_NAMES[idx]}`,
    kwh,
    cost: totalCost,
    tierSegments,
  };
});

export const USAGE_RANGES: Record<string, RangeData> = {
  day: {
    kwh: 12.4,
    deltaPct: -12,
    period: 'từ đầu ngày đến giờ',
    comparison: 'các ngày thứ Ba gần đây',
    bars: [
      ['00', 1.1, '00:00'],
      ['03', 0.9, '03:00'],
      ['06', 1.4, '06:00'],
      ['09', 1.8, '09:00'],
      ['12', 2.2, '12:00'],
      ['15', 1.9, '15:00'],
      ['18', 2.4, '18:00'],
      ['21', 0.7, '21:00'],
    ],
    chartItems: DAY_CHART_ITEMS,
    shares: [52, 24, 9, 8, 7],
    comparisonCurrent: [0.4, 0.3, 0.2, 0.4, 0.8, 1.2, 1.5, 1.4, 1.2, 1.6, 1.8, 1.6],
    comparisonPrevious: [0.5, 0.4, 0.3, 0.5, 0.9, 1.4, 1.8, 1.6, 1.5, 1.7, 1.9, 1.8],
    currentLabel: 'Hôm nay',
    previousLabel: 'Hôm qua',
    axisStart: '00:00',
    axisEnd: '24:00',
    datePrefix: 'Mốc',
  },
  week: {
    kwh: 81.6,
    deltaPct: -4,
    period: 'từ đầu tuần đến giờ',
    comparison: 'cùng kỳ tuần trước',
    bars: [
      ['T2', 10.2, 'Thứ Hai'],
      ['T3', 12.4, 'Thứ Ba'],
      ['T4', 9.8, 'Thứ Tư'],
      ['T5', 13.1, 'Thứ Năm'],
      ['T6', 11.6, 'Thứ Sáu'],
      ['T7', 12.9, 'Thứ Bảy'],
      ['CN', 11.6, 'Chủ Nhật'],
    ],
    chartItems: WEEK_CHART_ITEMS,
    shares: [48, 22, 12, 10, 8],
    comparisonCurrent: [10.2, 12.4, 9.8, 13.1, 11.6, 12.9, 11.6],
    comparisonPrevious: [11.5, 13.2, 10.8, 12.8, 12.4, 13.5, 12.2],
    currentLabel: 'Tuần này',
    previousLabel: 'Tuần trước',
    axisStart: 'T2',
    axisEnd: 'CN',
    datePrefix: 'Ngày',
  },
  month: {
    kwh: MONTH_KWH,
    deltaPct: MONTH_DELTA,
    period: 'từ đầu tháng đến giờ',
    comparison: 'cùng kỳ tháng trước',
    bars: [
      ['1', 58, '1 đến 4 tháng 9'],
      ['5', 64, '5 đến 8 tháng 9'],
      ['9', 61, '9 đến 12 tháng 9'],
      ['13', 72, '13 đến 16 tháng 9'],
      ['17', 69, '17 đến 20 tháng 9'],
      ['21', 74, '21 đến 24 tháng 9'],
      ['25', 66, '25 đến 28 tháng 9'],
      ['29', 51, '29 đến 30 tháng 9'],
    ],
    chartItems: MONTH_CHART_ITEMS,
    shares: [45, 23, 13, 11, 8],
    comparisonCurrent: THIS_MONTH_DAYS,
    comparisonPrevious: LAST_MONTH_30_DAYS,
    currentLabel: 'Tháng này',
    previousLabel: 'Tháng trước',
    axisStart: '01/09',
    axisEnd: '30/09',
    datePrefix: 'Ngày',
  },
  year: {
    kwh: 2410,
    deltaPct: 6,
    period: 'từ đầu năm đến giờ',
    comparison: 'năm ngoái',
    bars: [
      ['T1', 178, 'Tháng 1'],
      ['T2', 165, 'Tháng 2'],
      ['T3', 189, 'Tháng 3'],
      ['T4', 214, 'Tháng 4'],
      ['T5', 258, 'Tháng 5'],
      ['T6', 291, 'Tháng 6'],
      ['T7', 304, 'Tháng 7'],
      ['T8', 296, 'Tháng 8'],
      ['T9', 284, 'Tháng 9'],
      ['T10', 231, 'Tháng 10'],
      ['T11', 0, 'Tháng 11'],
      ['T12', 0, 'Tháng 12'],
    ],
    chartItems: YEAR_CHART_ITEMS,
    shares: [44, 24, 13, 11, 8],
    comparisonCurrent: [178, 165, 189, 214, 258, 291, 304, 296, 284],
    comparisonPrevious: [190, 175, 195, 220, 265, 295, 310, 300, 290, 270, 240, 220],
    currentLabel: 'Năm nay',
    previousLabel: 'Năm ngoái',
    axisStart: 'T1',
    axisEnd: 'T12',
    datePrefix: 'Tháng',
  },
};

export function getUsageDevices(rangeKey: string): BubbleDevice[] {
  const r = USAGE_RANGES[rangeKey] ?? USAGE_RANGES.week;
  return r.shares.map((pct: number, i: number) => {
    const kwh = Math.round((r.kwh * pct) / 100 * 10) / 10;
    const cost = Math.round(kwh * RATE);
    return {
      id: `dev-${i}`,
      name: DEVICE_NAMES[i],
      pct,
      kwh,
      cost,
    };
  });
}

export const DEVICE_DETAIL_AIRCON: DeviceDetailData = {
  id: 'dev-0',
  name: 'Điều hòa',
  meta: '1.860 W · PHÒNG KHÁCH',
  avgW: '1.860',
  costMonth: '364,5',
  note: 'Máy nén chạy lâu hơn 40% so với tuần trước khi nhiệt độ ngoài trời tăng 4 độ. Giữ mức 26,5°C thay vì 24°C sẽ tiết kiệm khoảng 85.000 đ mỗi tuần.',
  stats: [
    { label: 'Tổng điện tiêu thụ', value: '41,9 kWh' },
    { label: 'Tổng ước tính chi phí', value: '119.200 đ' },
    { label: 'Số lần bật', value: '23 lần' },
    { label: 'Tổng thời gian chạy', value: '58h 20p' },
  ],
};

export function getDeviceDetail(device: BubbleDevice): DeviceDetailData {
  const lower = device.name.toLowerCase();
  if (lower.includes('điều hòa') || lower.includes('air con')) {
    return DEVICE_DETAIL_AIRCON;
  }
  if (lower.includes('bình nóng') || lower.includes('nước nóng')) {
    return {
      id: device.id,
      name: device.name,
      meta: '2.500 W · PHÒNG TẮM CHÍNH',
      avgW: '2.500',
      costMonth: '168,0',
      note: 'Bật bình trước khi tắm 15-20 phút rồi tắt sẽ giảm 25% lượng điện thất thoát so với việc cắm liên tục 24/7.',
      stats: [
        { label: 'Tổng điện tiêu thụ', value: `${device.kwh.toFixed(1)} kWh` },
        { label: 'Tổng ước tính chi phí', value: `${Math.round(device.cost).toLocaleString('vi-VN')} đ` },
        { label: 'Số lần bật', value: '14 lần' },
        { label: 'Tổng thời gian chạy', value: '7h 15p' },
      ],
    };
  }
  if (lower.includes('bếp')) {
    return {
      id: device.id,
      name: device.name,
      meta: '2.000 W · NHÀ BẾP',
      avgW: '1.650',
      costMonth: '92,0',
      note: 'Nấu ăn tập trung vào khung giờ thấp điểm hoặc bình thường sẽ giúp tối ưu hóa chi phí điện năng gia đình.',
      stats: [
        { label: 'Tổng điện tiêu thụ', value: `${device.kwh.toFixed(1)} kWh` },
        { label: 'Tổng ước tính chi phí', value: `${Math.round(device.cost).toLocaleString('vi-VN')} đ` },
        { label: 'Số lần bật', value: '18 lần' },
        { label: 'Tổng thời gian chạy', value: '6h 30p' },
      ],
    };
  }
  if (lower.includes('tủ lạnh')) {
    return {
      id: device.id,
      name: device.name,
      meta: '120 W · NHÀ BẾP',
      avgW: '85',
      costMonth: '76,5',
      note: 'Chu kỳ đóng mở bình thường, gioăng cao su kín khít. Không phát hiện rò rỉ nhiệt hay bất thường máy nén.',
      stats: [
        { label: 'Tổng điện tiêu thụ', value: `${device.kwh.toFixed(1)} kWh` },
        { label: 'Tổng ước tính chi phí', value: `${Math.round(device.cost).toLocaleString('vi-VN')} đ` },
        { label: 'Số lần bật', value: 'Hoạt động liên tục' },
        { label: 'Tổng thời gian chạy', value: '168h 00p' },
      ],
    };
  }
  return {
    id: device.id,
    name: device.name,
    meta: `${Math.round(device.kwh * 100)} W · TỔNG HỢP`,
    avgW: `${Math.round(device.kwh * 100)}`,
    costMonth: `${(device.cost / 1000).toFixed(1).replace('.', ',')}`,
    note: 'Công suất tiêu thụ ổn định theo chu kỳ sinh hoạt gia đình.',
    stats: [
      { label: 'Tổng điện tiêu thụ', value: `${device.kwh.toFixed(1)} kWh` },
      { label: 'Tổng ước tính chi phí', value: `${Math.round(device.cost).toLocaleString('vi-VN')} đ` },
      { label: 'Tỷ trọng phụ tải', value: `${device.pct}%` },
      { label: 'Trạng thái', value: 'Đang theo dõi' },
    ],
  };
}

export const DEVICE_WEEK_BARS: BarDatum[] = [
  ['T2', 5.1, 'Thứ Hai'],
  ['T3', 6.4, 'Thứ Ba'],
  ['T4', 4.8, 'Thứ Tư'],
  ['T5', 7.2, 'Thứ Năm'],
  ['T6', 6.0, 'Thứ Sáu'],
  ['T7', 6.8, 'Thứ Bảy'],
  ['CN', 5.6, 'Chủ Nhật'],
];

export const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    q: 'Tại sao hóa đơn tăng 35%?',
    a: 'Có hai nguyên nhân cộng dồn trong tuần này. Nhiệt độ ngoài trời trung bình 38,5°C, cao hơn tuần trước 4 độ, khiến máy nén chạy hết công suất lâu hơn 40%. Tổng điện dùng cũng đã vượt 200 kWh, nên phần điện sau đó bị tính theo bậc giá cao hơn.',
    facts: [
      { k: 'Nhiệt độ ngoài trời', v: '38,5 °C' },
      { k: 'Thời gian máy nén chạy', v: '+40%' },
      { k: 'Bậc giá hiện tại', v: 'Bậc 3' },
    ],
    cta: 'Bắt đầu thử nghiệm',
    ctaDesc: '3 ngày ở mức 26,5°C',
  },
  {
    q: 'Tải chạy ngầm của tôi là bao nhiêu?',
    a: 'Từ 02:00 đến 05:00 sáng, công suất nền ổn định ở mức 35 W sau khi loại trừ chu kỳ tủ lạnh. Mức này tiêu tốn khoảng 25 kWh/tháng từ cụm TV và modem wifi, tính theo bậc cao nhất hiện tại (Bậc 3) tương đương khoảng 57.000 đ.',
    facts: [
      { k: 'Công suất chờ', v: '35 W' },
      { k: 'Lãng phí hàng tháng', v: '25 kWh' },
      { k: 'Tính theo Bậc 3', v: '57.000 đ' },
    ],
    cta: '',
  },
  {
    q: 'Làm sao để giữ nguyên bậc điện này?',
    a: 'Bạn đã dùng 284 kWh và còn 16 ngày nữa trong chu kỳ. Để duy trì ở Bậc 3, bạn cần giữ mức dùng 6,4 kWh/ngày so với mức 19,8 kWh hiện tại. Chuyển bình nóng lạnh sang khung giờ 22:00 sẽ bù đắp được khoảng một nửa khoảng cách này.',
    facts: [
      { k: 'Đã dùng đến nay', v: '284 kWh' },
      { k: 'Mức dự phòng', v: '16 kWh' },
      { k: 'Hạn mức hàng ngày', v: '6,4 kWh' },
    ],
    cta: 'Bắt đầu thử nghiệm',
    ctaDesc: '3 ngày ở mức 26,5°C',
  },
];

export const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'msg-0',
    who: 'ai',
    text: 'Chào buổi tối. Công tơ điện của bạn đang hoạt động và đã đồng bộ dữ liệu 30 ngày qua. Hãy hỏi về bất kỳ chỉ số nào để xem chi tiết nguồn gốc.',
    facts: [],
  },
];

export const MOCK_CHAT_THREADS: ChatThread[] = [
  {
    id: 'thread-1',
    title: 'Tại sao hóa đơn tăng 35%?',
    category: 'ĐIỀU HÒA',
    period: 'THG 9',
    timeAgo: '2 giờ trước',
    group: 'today',
    dotColor: '#B5E930',
    messages: [
      {
        id: 't1-m1',
        who: 'me',
        text: 'Tại sao hóa đơn tháng này tăng 35% so với tháng trước?',
      },
      {
        id: 't1-m2',
        who: 'ai',
        text: 'Tháng 9 nóng hơn tháng 8 khoảng 2,4°C, đẩy thời gian chạy điều hòa phòng khách từ 4,8 lên 8,1 giờ mỗi ngày. Lượng điện tăng thêm 98 kWh đã đẩy 42 kWh sang Bậc 4 (3.151 đ/kWh), chiếm 31% mức tăng chi phí.',
        facts: [
          { k: 'THỜI GIAN CHẠY AC', v: '8,1h/ngày (+68%)' },
          { k: 'CHÊNH LỆCH NHIỆT ĐỘ', v: '+2,4°C tb' },
          { k: 'CHUYỂN SANG BẬC 4', v: '42 kWh' },
        ],
        cta: 'Bắt đầu thử nghiệm',
        ctaDesc: 'AC 26°C + quạt',
      },
    ],
  },
  {
    id: 'thread-2',
    title: 'Tải chạy ngầm sau nửa đêm',
    category: 'CHẠY NGẦM',
    period: '30 NGÀY',
    timeAgo: '5 giờ trước',
    group: 'today',
    dotColor: '#4A6B60',
    messages: [
      {
        id: 't2-m1',
        who: 'me',
        text: 'Thiết bị nào đang chạy ngầm sau nửa đêm?',
      },
      {
        id: 't2-m2',
        who: 'ai',
        text: 'Từ 02:00 đến 05:00 sáng, công suất nền duy trì ở 35 W sau khi trừ chu kỳ máy nén tủ lạnh. Lượng điện này tiêu hao khoảng 25 kWh/tháng từ cụm TV và modem mạng, tính theo bậc cận biên (Bậc 3) tương đương khoảng 71.000 đ.',
        facts: [
          { k: 'CÔNG SUẤT CHỜ', v: '35 W' },
          { k: 'TIÊU HAO THÁNG', v: '25 kWh' },
          { k: 'ƯỚC TÍNH CHI PHÍ', v: '71.000 đ' },
        ],
        cta: 'Thử ngắt ổ cắm cụm TV',
      },
    ],
  },
  {
    id: 'thread-3',
    title: 'Khung giờ bật bình nóng lạnh',
    category: 'BÌNH NÓNG LẠNH',
    period: 'THG 8',
    timeAgo: 'Thứ Hai',
    group: 'this_week',
    dotColor: '#B5E930',
    messages: [
      {
        id: 't3-m1',
        who: 'me',
        text: 'Bật bình nóng lạnh vào khung giờ nào tiết kiệm nhất?',
      },
      {
        id: 't3-m2',
        who: 'ai',
        text: 'Bình nóng lạnh gián tiếp của bạn tiêu thụ 2.500 W trong 35 phút mỗi chu kỳ đun. Cài đặt đun trong khoảng 22:00 đến 23:00 sẽ tránh được giờ cao điểm và giảm hao phí nhiệt dự phòng qua đêm trước khi tắm buổi sáng.',
        facts: [
          { k: 'CÔNG SUẤT', v: '2.500 W' },
          { k: 'THỜI GIAN ĐUN', v: '35 phút' },
          { k: 'KHUNG GIỜ TỐI ƯU', v: '22:00–23:00' },
        ],
        cta: 'Hẹn giờ bình nóng lạnh 22:00',
      },
    ],
  },
  {
    id: 'thread-4',
    title: 'Làm sao để giữ nguyên bậc điện này?',
    category: 'HÓA ĐƠN',
    period: 'THG 9',
    timeAgo: 'Chủ Nhật',
    group: 'this_week',
    dotColor: '#2F7A0C',
    messages: [
      {
        id: 't4-m1',
        who: 'me',
        text: 'Làm sao để giữ trong Bậc 3 tháng này?',
      },
      {
        id: 't4-m2',
        who: 'ai',
        text: 'Bạn đã dùng 284 kWh và còn 6 ngày nữa trong chu kỳ. Để ở trong Bậc 3, bạn cần duy trì ngân sách 2,7 kWh/ngày so với mức 4,2 kWh hiện tại. Chuyển bình nóng lạnh sang khung giờ 22:00 sẽ giảm được khoảng một nửa khoảng chênh này.',
        facts: [
          { k: 'ĐÃ DÙNG ĐẾN NAY', v: '284 kWh' },
          { k: 'MỨC DỰ PHÒNG', v: '16 kWh' },
          { k: 'HẠN MỨC NGÀY', v: '2,7 kWh/ngày' },
        ],
        cta: 'Bắt đầu thử nghiệm',
        ctaDesc: '3 ngày ở mức 26,5°C',
      },
    ],
  },
  {
    id: 'thread-5',
    title: 'Tủ lạnh có đóng ngắt quá thường xuyên?',
    category: 'TỦ LẠNH',
    period: 'THG 8',
    timeAgo: '28 Thg 8',
    group: 'earlier',
    dotColor: '#164437',
    messages: [
      {
        id: 't5-m1',
        who: 'me',
        text: 'Tủ lạnh đóng ngắt chu kỳ liên tục trong ngày có bình thường không?',
      },
      {
        id: 't5-m2',
        who: 'ai',
        text: 'Máy nén tủ lạnh đã đóng ngắt 38 lần ngày hôm qua, trung bình chạy 18 phút và nghỉ 20 phút. Chu kỳ này là bình thường với nhiệt độ phòng 32°C, tuy nhiên bụi bẩn bám trên dàn nóng có thể làm tăng tần suất đóng ngắt thêm ~10%.',
        facts: [
          { k: 'CHU KỲ HÀNG NGÀY', v: '38 lần' },
          { k: 'THỜI GIAN CHẠY TB', v: '18 phút' },
          { k: 'ẢNH HƯỞNG BỤI DÀN', v: '+10% tần suất' },
        ],
        cta: 'Ghi nhận kiểm tra dàn nóng',
      },
    ],
  },
  {
    id: 'thread-6',
    title: 'Bếp từ so với nồi cơm điện',
    category: 'BẾP TỪ',
    period: 'THG 8',
    timeAgo: '21 Thg 8',
    group: 'earlier',
    dotColor: '#8CD41C',
    messages: [
      {
        id: 't6-m1',
        who: 'me',
        text: 'Nấu bằng bếp từ hay nồi cơm điện tốn ít điện hơn?',
      },
      {
        id: 't6-m2',
        who: 'ai',
        text: 'Một lần nấu 45 phút trên bếp từ tiêu thụ khoảng 0,85 kWh. Nồi cơm điện chuyên dụng chỉ tiêu thụ 0,32 kWh để nấu cộng thêm 0,04 kWh/h để giữ ấm. Khi nấu các món hạt/cơm, nồi cơm điện tiết kiệm hơn ~60% điện năng so với bếp từ.',
        facts: [
          { k: 'BỮA ĂN BẾP TỪ', v: '0,85 kWh' },
          { k: 'NỒI CƠM ĐIỆN', v: '0,32 kWh' },
          { k: 'TIẾT KIỆM ĐIỆN', v: '~60%' },
        ],
        cta: 'So sánh tải nấu ăn trong Thử nghiệm',
      },
    ],
  },
];

export const DEFAULT_ACTIVE_EXPERIMENT: ActiveExperiment = {
  id: 'exp-active-1',
  deviceId: 'dev-0',
  deviceName: 'Điều hòa',
  title: 'Điều hòa phòng khách 26,5°C kèm quạt thay vì 24°C',
  baselineKwh: 8.2,
  targetKwh: 5.1,
  predictedSavedKwh: 3.1,
  predictedSavedVnd: 85000,
  currentDay: 3,
  totalDays: 7,
  dailyLogs: [
    { day: 1, date: '12/09', kwh: 5.2, runtime: '5h 10p' },
    { day: 2, date: '13/09', kwh: 4.9, runtime: '4h 45p' },
    { day: 3, date: '14/09 (Hôm nay)', kwh: 5.1, runtime: '5h 00p' },
  ],
};

export interface ExperimentTemplate {
  deviceId: string;
  deviceName: string;
  title: string;
  defaultTarget: number;
  minTarget: number;
  maxTarget: number;
  step: number;
  unit: string;
  baselineKwh: number;
  defaultTargetKwh: number;
  calcPrediction: (targetVal: number, extraOption?: boolean) => {
    targetKwh: number;
    savedKwhPerDay: number;
    savedVndPerWeek: number;
    pct: number;
    summary: string;
  };
}

export const EXPERIMENT_TEMPLATES: ExperimentTemplate[] = [
  {
    deviceId: 'dev-0',
    deviceName: 'Điều hòa',
    title: 'Điều hòa phòng khách kèm quạt',
    defaultTarget: 26.5,
    minTarget: 24.0,
    maxTarget: 29.0,
    step: 0.5,
    unit: '°C',
    baselineKwh: 8.2,
    defaultTargetKwh: 5.1,
    calcPrediction: (targetTemp: number, withFan = true) => {
      const delta = targetTemp - 24;
      const pct = Math.min(50, Math.max(10, Math.round(delta * 7 + (withFan ? 8 : 0))));
      const savedKwh = Math.round(8.2 * (pct / 100) * 10) / 10;
      const targetKwh = Math.round((8.2 - savedKwh) * 10) / 10;
      const savedVnd = Math.round(savedKwh * 7 * 2700);
      return {
        targetKwh,
        savedKwhPerDay: savedKwh,
        savedVndPerWeek: savedVnd,
        pct,
        summary: `Tăng nhiệt độ lên ${targetTemp.toFixed(1)}°C ${withFan ? 'kèm quạt gió' : ''} giúp máy nén ngắt nghỉ sớm hơn, giảm ~${pct}% điện năng thiết bị.`,
      };
    },
  },
  {
    deviceId: 'dev-1',
    deviceName: 'Bình nóng lạnh',
    title: 'Chuyển khung giờ & thời gian đun nước',
    defaultTarget: 20,
    minTarget: 15,
    maxTarget: 40,
    step: 5,
    unit: 'phút',
    baselineKwh: 4.8,
    defaultTargetKwh: 3.2,
    calcPrediction: (minutes: number) => {
      const savedKwh = Math.round(((45 - minutes) / 45) * 2.2 * 10) / 10;
      const targetKwh = Math.round((4.8 - savedKwh) * 10) / 10;
      const savedVnd = Math.round(savedKwh * 7 * 2700);
      const pct = Math.round((savedKwh / 4.8) * 100);
      return {
        targetKwh,
        savedKwhPerDay: savedKwh,
        savedVndPerWeek: savedVnd,
        pct,
        summary: `Bật bình trước khi tắm ${minutes} phút thay vì cắm liên tục giúp giảm thất thoát nhiệt dư thừa qua đêm.`,
      };
    },
  },
  {
    deviceId: 'dev-2',
    deviceName: 'Bếp từ',
    title: 'Nấu ăn tập trung & điều chỉnh công suất',
    defaultTarget: 35,
    minTarget: 20,
    maxTarget: 60,
    step: 5,
    unit: 'phút',
    baselineKwh: 2.6,
    defaultTargetKwh: 1.8,
    calcPrediction: (minutes: number) => {
      const savedKwh = Math.round(((50 - minutes) / 50) * 1.2 * 10) / 10;
      const targetKwh = Math.round((2.6 - savedKwh) * 10) / 10;
      const savedVnd = Math.round(savedKwh * 7 * 2700);
      const pct = Math.round((savedKwh / 2.6) * 100);
      return {
        targetKwh,
        savedKwhPerDay: Math.max(0.1, savedKwh),
        savedVndPerWeek: Math.max(5000, savedVnd),
        pct: Math.max(5, pct),
        summary: 'Chuẩn bị sẵn nguyên liệu và tận dụng nhiệt dư tắt bếp sớm 2-3 phút giúp giảm tiêu thụ điện nấu ăn.',
      };
    },
  },
  {
    deviceId: 'dev-3',
    deviceName: 'Tủ lạnh',
    title: 'Cài đặt nhiệt độ ngăn mát mức tối ưu',
    defaultTarget: 4,
    minTarget: 2,
    maxTarget: 6,
    step: 1,
    unit: '°C',
    baselineKwh: 1.9,
    defaultTargetKwh: 1.4,
    calcPrediction: (temp: number) => {
      const delta = temp - 2;
      const pct = Math.min(35, Math.max(10, Math.round(delta * 6 + 10)));
      const savedKwh = Math.round(1.9 * (pct / 100) * 10) / 10;
      const targetKwh = Math.round((1.9 - savedKwh) * 10) / 10;
      const savedVnd = Math.round(savedKwh * 7 * 2700);
      return {
        targetKwh,
        savedKwhPerDay: savedKwh,
        savedVndPerWeek: savedVnd,
        pct,
        summary: `Cài đặt ngăn mát ở ${temp}°C và sắp xếp thông thoáng giúp luồng khí lưu thông tốt, giảm chu kỳ đóng ngắt lốc lạnh.`,
      };
    },
  },
];

export const MOCK_EXP_LOG: ExperimentLogItem[] = [
  {
    id: 'exp-1',
    title: 'Chuyển bình nóng lạnh sang khung giờ 22:00',
    date: '18 - 25 Thg 8',
    savedVnd: 52000,
    savedKwh: 18.2,
    note: 'Nước vẫn đủ ấm cho buổi sáng',
    good: true,
    emotion: 'comfortable',
  },
  {
    id: 'exp-2',
    title: 'Điều hòa 27°C không bật quạt',
    date: '2 - 5 Thg 8',
    savedVnd: 0,
    savedKwh: 0,
    note: 'Quá nóng vào ban đêm',
    good: false,
    emotion: 'uncomfortable',
  },
  {
    id: 'exp-3',
    title: 'Tủ lạnh: Cài đặt ngăn mát 4°C',
    date: '21 - 28 Thg 7',
    savedVnd: 34000,
    savedKwh: 12.6,
    note: 'Thực phẩm bảo quản tốt, lốc máy chạy êm hơn',
    good: true,
    emotion: 'comfortable',
  },
  {
    id: 'exp-4',
    title: 'Bật máy rửa bát chế độ Eco nửa tải',
    date: '10 - 17 Thg 7',
    savedVnd: 38000,
    savedKwh: 13.4,
    note: 'Chén bát vẫn sạch hoàn toàn',
    good: true,
    emotion: 'neutral',
  },
  {
    id: 'exp-5',
    title: 'Nấu ăn bếp từ khung giờ thấp điểm',
    date: '1 - 7 Thg 7',
    savedVnd: 45000,
    savedKwh: 15.8,
    note: 'Chuẩn bị nguyên liệu sớm hơn',
    good: true,
    emotion: 'comfortable',
  },
];

export const EXP_LOG = MOCK_EXP_LOG;
export const EXP_KEPT = EXP_LOG.filter((l) => l.good).length;
export const EXP_SAVED = EXP_LOG.reduce((s, l) => s + l.savedVnd, 0);

export const ACCOUNT_GROUPS: AccountGroup[] = [
  {
    title: 'THÔNG TIN NHÀ',
    items: [
      { label: 'Số người trong nhà', value: '4 người' },
      { label: 'Biểu phí & nhà cung cấp', value: 'EVN Hà Nội' },
      { label: 'Thiết bị phát hiện', value: '5 thiết bị' },
      { label: 'Cảm biến & hiệu chuẩn', value: 'Bình thường' },
    ],
  },
  {
    title: 'THÔNG BÁO',
    items: [
      { label: 'Cảnh báo nhảy bậc điện', value: 'Bật' },
      { label: 'Cảnh báo tải chờ ban đêm', value: 'Bật' },
      { label: 'Tổng kết tuần', value: 'Chủ nhật' },
    ],
  },
  {
    title: 'QUY ĐỊNH & ĐIỀU KHOẢN',
    items: [
      { label: 'Chính sách bảo mật', value: '' },
      { label: 'Điều khoản sử dụng', value: '' },
      { label: 'Xuất dữ liệu', value: '' },
      { label: 'Phiên bản ứng dụng', value: '1.4.0' },
    ],
  },
];

