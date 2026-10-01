import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';

import { apiClient } from '@/lib/api-client';

import { DEMO_DAY, DEMO_MONTH, DEMO_NOW, rangeWindow, type RangeWindow } from './period';
import type { BubbleDevice, DashboardRange } from './types';

/** `GET /demo/breakdown`. `name` đã là tiếng Việt. */
interface DemoBreakdownOut {
  aggregate_energy_kwh: number;
  totals: { key: string; name: string; energy_kwh: number; share_pct: number; cost_vnd: number }[];
  billing: { bill: { total_vnd: number } };
}

export interface Dashboard {
  kwh: number;
  /** Tiền điện của kỳ (đã gồm VAT), backend tính theo biểu giá của khách hàng. */
  costVnd: number;
  /** `null` khi kỳ so sánh không có dữ liệu. */
  deltaPct: number | null;
  period: string;
  comparison: string;
  devices: BubbleDevice[];
}

export const energyKeys = {
  all: ['energy'] as const,
  dashboard: (range: DashboardRange, start: string, end: string) =>
    [...energyKeys.all, 'dashboard', range, start, end] as const,
};

// Fetchers: trả dữ liệu hợp lệ hoặc throw (ApiError), không nuốt lỗi.
const getBreakdown = (start: Date, end: Date) =>
  apiClient.get<DemoBreakdownOut>('/demo/breakdown', {
    params: { start: start.toISOString(), end: end.toISOString() },
  });

async function getDashboard(w: RangeWindow): Promise<Dashboard> {
  const [current, previous] = await Promise.all([
    getBreakdown(w.start, w.end),
    getBreakdown(w.previousStart, w.previousEnd),
  ]);

  const kwh = current.aggregate_energy_kwh;
  const before = previous.aggregate_energy_kwh;
  return {
    kwh,
    costVnd: current.billing.bill.total_vnd,
    deltaPct: before > 0 ? Math.round(((kwh - before) / before) * 100) : null,
    period: w.period,
    comparison: w.comparison,
    devices: current.totals.map((t) => {
      const deviceKwh = Math.round(t.energy_kwh * 10) / 10;
      return {
        id: t.key,
        name: t.name,
        pct: Math.round(t.share_pct),
        kwh: deviceKwh,
        cost: t.cost_vnd,
      };
    }),
  };
}

// queryOptions: dùng chung cho useQuery, prefetch và invalidate (một nguồn key + fetcher).
export const dashboardQueryOptions = (range: DashboardRange, window: RangeWindow) =>
  queryOptions({
    queryKey: energyKeys.dashboard(
      range,
      window.start.toISOString(),
      window.end.toISOString()
    ),
    queryFn: () => getDashboard(window),
    placeholderData: keepPreviousData,
  });

export function useDashboard(range: DashboardRange) {
  // tab luôn mounted: ngừng theo dõi khi màn hình không focus để khỏi fetch/re-render ngầm
  return useQuery({
    ...dashboardQueryOptions(range, rangeWindow(range, DEMO_NOW)),
    subscribed: useIsFocused(),
  });
}

// ───────────────────────────── Hóa đơn: `GET /demo/billing` ─────────────────────────────
/** `household` tính 6 bậc; `business` tính theo giờ (TOU). Hộ sinh hoạt không có TOU. */
export type Customer = 'household' | 'business';
export type TouPeriod = 'offpeak' | 'normal' | 'peak';

export interface Bill {
  subtotal_vnd: number;
  vat_vnd: number;
  total_vnd: number;
}

export interface BillingBand {
  index: number;
  name: string;
  from_kwh: number;
  to_kwh: number | null;
  price_vnd: number;
  kwh: number;
  cost_vnd: number;
}

export interface BillingOut {
  customer: Customer;
  scheme: 'tier' | 'tou';
  tariff: { name: string; source: string; vat_rate: number };
  month: string;
  days_elapsed: number;
  days_in_month: number;
  kwh_to_date: number;
  bill_to_date: Bill;
  forecast: { kwh: number; pace_kwh_per_day: number; bill: Bill };
  tier: {
    bands: BillingBand[];
    daily: {
      date: string;
      kwh: number;
      cost_vnd: number;
      segments: { band: number; kwh: number }[];
    }[];
    status: {
      band_index: number;
      band_name: string;
      headroom_kwh: number | null;
      next_band_index: number | null;
      next_band_name: string | null;
      step_pct: number | null;
      cross_day: number | null;
    };
  } | null;
  tou: {
    schedule: { name: string };
    periods: {
      key: TouPeriod;
      name: string;
      hours: string;
      price_vnd: number;
      kwh: number;
      share_pct: number;
      cost_vnd: number;
    }[];
  } | null;
}

export const billingQueryOptions = (customer: Customer) =>
  queryOptions({
    queryKey: [...energyKeys.all, 'billing', customer, DEMO_MONTH, DEMO_NOW] as const,
    queryFn: () =>
      apiClient.get<BillingOut>('/demo/billing', {
        params: { month: DEMO_MONTH, asof: new Date(DEMO_NOW).toISOString(), customer },
      }),
    placeholderData: keepPreviousData,
  });

export function useBilling(customer: Customer) {
  return useQuery({ ...billingQueryOptions(customer), subscribed: useIsFocused() });
}

// ─────────────────────── Cảnh báo & nhật ký chạy: `/demo/alerts`, `/demo/timeline` ───────────────────────
export interface AlertOut {
  code: string;
  tone: 'warning' | 'info' | 'good';
  at: string;
  text: string;
  appliance: string | null;
}

export interface ApplianceRuns {
  key: string;
  name: string;
  first_start: string;
  last_end: string;
  run_count: number;
  minutes: number;
  energy_kwh: number;
  runs: { start: string; end: string; minutes: number; energy_kwh: number; peak_power_w: number }[];
}

export const alertsQueryOptions = (customer: Customer) =>
  queryOptions({
    queryKey: [...energyKeys.all, 'alerts', customer, DEMO_NOW] as const,
    queryFn: () =>
      apiClient.get<{ items: AlertOut[] }>('/demo/alerts', {
        params: { asof: new Date(DEMO_NOW).toISOString(), customer },
      }),
    select: (d) => d.items,
  });

export const timelineQueryOptions = () =>
  queryOptions({
    queryKey: [...energyKeys.all, 'timeline', DEMO_DAY, DEMO_NOW] as const,
    queryFn: () =>
      apiClient.get<{ items: ApplianceRuns[] }>('/demo/timeline', {
        params: { date: DEMO_DAY, until: new Date(DEMO_NOW).toISOString() },
      }),
    select: (d) => d.items,
  });

export function useAlerts(customer: Customer = 'household') {
  return useQuery({ ...alertsQueryOptions(customer), subscribed: useIsFocused() });
}

export function useTimeline() {
  return useQuery({ ...timelineQueryOptions(), subscribed: useIsFocused() });
}
