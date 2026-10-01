import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';

import { apiClient } from '@/lib/api-client';

import { DEMO_DAY, DEMO_MONTH, DEMO_NOW } from './period';
import type { BubbleDevice, DashboardRange } from './types';
import { DASHBOARD_LABELS, toDevices } from './usage-view';

export const energyKeys = {
  all: ['energy'] as const,
};

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

// ──────────────────── Tiêu thụ: `GET /demo/usage`, `GET /demo/usage/devices/{key}` ────────────────────
export type UsageRange = 'day' | 'week' | 'month';

export interface UsagePeriod {
  start: string;
  end: string;
  until: string;
  complete: boolean;
}

export interface UsageBucket {
  start: string;
  kwh: number;
  cost_vnd: number;
  previous_kwh: number | null;
  previous_cost_vnd: number | null;
  segments: { key: string; label: string; price_vnd: number; kwh: number; cost_vnd: number }[];
}

export interface UsageOut {
  range: UsageRange;
  offset: number;
  period: UsagePeriod;
  previous: UsagePeriod;
  kwh: number;
  cost_vnd: number;
  previous_kwh: number;
  previous_cost_vnd: number;
  delta_pct: number | null;
  forecast: { kwh: number; cost_vnd: number } | null;
  buckets: UsageBucket[];
  devices: { key: string; name: string; energy_kwh: number; share_pct: number; cost_vnd: number }[];
  insight: { question: string; text: string; appliance: string | null };
}

export interface DeviceUsageOut {
  key: string;
  name: string;
  period: UsagePeriod;
  kwh: number;
  cost_vnd: number;
  share_pct: number;
  previous_kwh: number;
  delta_pct: number | null;
  runs: { count: number; minutes: number; avg_power_w: number | null; peak_power_w: number | null } | null;
  buckets: { start: string; kwh: number; cost_vnd: number; previous_kwh: number | null }[];
  note: string;
}

export const usageQueryOptions = (range: UsageRange, offset: number) =>
  queryOptions({
    queryKey: [...energyKeys.all, 'usage', range, offset, DEMO_NOW] as const,
    queryFn: () =>
      apiClient.get<UsageOut>('/demo/usage', {
        params: { range, offset, asof: new Date(DEMO_NOW).toISOString() },
      }),
    placeholderData: keepPreviousData,
  });

export function useUsage(range: UsageRange, offset: number) {
  return useQuery({ ...usageQueryOptions(range, offset), subscribed: useIsFocused() });
}

export const deviceUsageQueryOptions = (key: string, range: UsageRange, offset: number) =>
  queryOptions({
    queryKey: [...energyKeys.all, 'usage-device', key, range, offset, DEMO_NOW] as const,
    queryFn: () =>
      apiClient.get<DeviceUsageOut>(`/demo/usage/devices/${key}`, {
        params: { range, offset, asof: new Date(DEMO_NOW).toISOString() },
      }),
    placeholderData: keepPreviousData,
  });

export function useDeviceUsage(key: string, range: UsageRange, offset: number) {
  return useQuery(deviceUsageQueryOptions(key, range, offset));
}

// ───────────────────────── Trang chủ: cùng một nguồn với trang Tiêu thụ ─────────────────────────
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

/**
 * Trang chủ và trang Tiêu thụ đọc cùng `GET /demo/usage` (kỳ hiện tại, offset 0), nên điện năng,
 * tiền, % so với kỳ trước và phân bổ thiết bị luôn khớp nhau; query dùng chung cache.
 */
export function useDashboard(range: DashboardRange) {
  return useQuery({
    ...usageQueryOptions(range, 0),
    select: (u): Dashboard => ({
      kwh: u.kwh,
      costVnd: u.cost_vnd,
      deltaPct: u.delta_pct === null ? null : Math.round(u.delta_pct),
      ...DASHBOARD_LABELS[range],
      devices: toDevices(u.devices),
    }),
    subscribed: useIsFocused(),
  });
}
