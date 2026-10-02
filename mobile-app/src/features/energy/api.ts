import { type QueryClient, queryOptions, useSuspenseQuery } from '@tanstack/react-query';

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
  });

export function useBilling(customer: Customer) {
  return useSuspenseQuery(billingQueryOptions(customer));
}

// ─────────────────────── Cảnh báo & nhật ký chạy: `/demo/alerts`, `/demo/timeline` ───────────────────────
export interface AlertOut {
  code: string;
  tone: 'warning' | 'info' | 'good';
  at: string;
  text: string;
  /** `event` có giờ riêng; `day` nói về hôm nay; `month` nói về cả tháng. */
  scope: 'event' | 'day' | 'month';
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

export const alertsQueryOptions = (customer: Customer, mute: string[] = []) =>
  queryOptions({
    queryKey: [...energyKeys.all, 'alerts', customer, mute, DEMO_NOW] as const,
    queryFn: () =>
      // `mute` lặp lại nhiều lần trên URL, còn `params` của api-client chỉ nhận giá trị đơn
      apiClient.get<{ items: AlertOut[] }>(
        `/demo/alerts${mute.length ? `?${mute.map((c) => `mute=${c}`).join('&')}` : ''}`,
        { params: { asof: new Date(DEMO_NOW).toISOString(), customer } }
      ),
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

export function useAlerts(customer: Customer = 'household', mute: string[] = []) {
  return useSuspenseQuery(alertsQueryOptions(customer, mute));
}

export function useTimeline() {
  return useSuspenseQuery(timelineQueryOptions());
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
  average_power_w: number;
  runs: { count: number; minutes: number; avg_power_w: number | null; peak_power_w: number | null } | null;
  recent_runs: { start: string; end: string; minutes: number; energy_kwh: number; peak_power_w: number }[];
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
  });

export function useUsage(range: UsageRange, offset: number) {
  return useSuspenseQuery(usageQueryOptions(range, offset));
}

export const deviceUsageQueryOptions = (key: string, range: UsageRange, offset: number) =>
  queryOptions({
    queryKey: [...energyKeys.all, 'usage-device', key, range, offset, DEMO_NOW] as const,
    queryFn: () =>
      apiClient.get<DeviceUsageOut>(`/demo/usage/devices/${key}`, {
        params: { range, offset, asof: new Date(DEMO_NOW).toISOString() },
      }),
  });

export function useDeviceUsage(key: string, range: UsageRange, offset: number) {
  return useSuspenseQuery(deviceUsageQueryOptions(key, range, offset));
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
  return useSuspenseQuery({
    ...usageQueryOptions(range, 0),
    select: (u): Dashboard => ({
      kwh: u.kwh,
      costVnd: u.cost_vnd,
      deltaPct: u.delta_pct === null ? null : Math.sign(u.delta_pct) * Math.round(Math.abs(u.delta_pct)),
      ...DASHBOARD_LABELS[range],
      devices: toDevices(u.devices),
    }),
  });
}

// ───────────────────── Hộ gia đình & mô hình: `GET /demo/household` ─────────────────────
export interface HouseholdInfo {
  household: {
    id: string | null;
    name: string;
    dataset: string;
    country: string;
    dataset_license: string;
    period: { start: string; end: string };
    sampling_interval_seconds: number;
    valid_days: number;
    missing_pct: number;
    aggregate_energy_kwh: number;
    metered_pct: number;
    held_out: boolean;
    appliances: { key: string; name: string; kind: 'appliance' | 'residual' }[];
  };
  model: {
    name: string;
    parameters: number;
    window_minutes: number;
    sampling: string;
    paper: string;
  };
}

export const householdQueryOptions = () =>
  queryOptions({
    queryKey: [...energyKeys.all, 'household'] as const,
    queryFn: () => apiClient.get<HouseholdInfo>('/demo/household'),
    staleTime: Infinity, // dữ liệu mô tả bộ dữ liệu, không đổi trong phiên
  });

export function useHousehold() {
  return useSuspenseQuery(householdQueryOptions());
}

// ───────────────── Trợ lý AI: `GET /demo/copilot/suggestions`, `POST /demo/copilot/ask` ─────────────────
export type CopilotIntent =
  | 'bill_change'
  | 'tier_budget'
  | 'standby'
  | 'top_appliance'
  | 'ac_runtime'
  | 'heater_timing'
  | 'fridge_cycles'
  | 'forecast'
  | 'saving_plan'
  | 'month_compare'
  | 'unknown';

export type ExperimentAppliance = 'AC' | 'WaterHeater' | 'WashingMachine';

export interface CopilotSuggestion {
  intent: CopilotIntent;
  question: string;
  category: string;
}

export interface CopilotAnswer {
  intent: CopilotIntent;
  question: string;
  category: string;
  /** Kỳ mà câu trả lời nói tới, vd `THÁNG 8`. */
  period: string;
  text: string;
  facts: { label: string; value: string }[];
  action: { kind: 'experiment'; appliance: ExperimentAppliance; label: string } | null;
  /** Câu nên hỏi tiếp sau câu trả lời này (tối đa 3, chọn theo nội dung câu trả lời). */
  follow_ups: CopilotSuggestion[];
}

export const suggestionsQueryOptions = () =>
  queryOptions({
    queryKey: [...energyKeys.all, 'copilot-suggestions', DEMO_NOW] as const,
    queryFn: () =>
      apiClient.get<{ items: CopilotSuggestion[] }>('/demo/copilot/suggestions', {
        params: { asof: new Date(DEMO_NOW).toISOString() },
      }),
    select: (d) => d.items,
  });

export function useSuggestions() {
  return useSuspenseQuery(suggestionsQueryOptions());
}

/** Hỏi trợ lý: truyền `intent` (câu gợi ý) hoặc `question` (gõ tay). Không lưu cache. */
export function askCopilot(input: { question?: string; intent?: CopilotIntent }) {
  return apiClient.post<CopilotAnswer>('/demo/copilot/ask', input, {
    params: { asof: new Date(DEMO_NOW).toISOString() },
  });
}

// ──────────── Thử nghiệm: `GET /demo/experiments/templates`, `GET /demo/experiments/progress` ────────────
export interface ExperimentBaseline {
  lookback_days: number;
  kwh_per_day: number;
  minutes_per_day: number;
  runs_per_day: number;
  avg_power_w: number | null;
  kwh_per_run: number | null;
}

export interface ExperimentTemplate {
  appliance: ExperimentAppliance;
  name: string;
  title: string;
  description: string;
  knob: 'minutes_per_day' | 'runs_per_week';
  unit_label: string;
  slider: { min: number; max: number; step: number; default: number };
  /** kWh mỗi ngày tiết kiệm được cho mỗi đơn vị của thanh trượt. */
  kwh_per_day_per_unit: number;
  vnd_per_kwh: number;
  baseline: ExperimentBaseline;
  available: boolean;
}

export interface ExperimentProgress {
  appliance: ExperimentAppliance;
  since: string;
  baseline: ExperimentBaseline;
  days: { date: string; kwh: number; minutes: number; runs: number; complete: boolean }[];
  saved_kwh: number;
  saved_vnd: number;
}

export const experimentTemplatesQueryOptions = () =>
  queryOptions({
    queryKey: [...energyKeys.all, 'experiment-templates', DEMO_NOW] as const,
    queryFn: () =>
      apiClient.get<{ items: ExperimentTemplate[] }>('/demo/experiments/templates', {
        params: { asof: new Date(DEMO_NOW).toISOString() },
      }),
    select: (d) => d.items,
  });

export function useExperimentTemplates() {
  return useSuspenseQuery(experimentTemplatesQueryOptions());
}

export const experimentProgressQueryOptions = (appliance: ExperimentAppliance, since: string) =>
  queryOptions({
    queryKey: [...energyKeys.all, 'experiment-progress', appliance, since, DEMO_NOW] as const,
    queryFn: () =>
      apiClient.get<ExperimentProgress>('/demo/experiments/progress', {
        params: { appliance, since, asof: new Date(DEMO_NOW).toISOString() },
      }),
  });

export function useExperimentProgress(appliance: ExperimentAppliance, since: string) {
  return useSuspenseQuery(experimentProgressQueryOptions(appliance, since));
}

/** Một việc trong thử nghiệm: giảm `amount` (theo `unit_label`) của một thiết bị. */
export interface ExperimentActionOut {
  appliance: ExperimentAppliance;
  name: string;
  knob: 'minutes_per_day' | 'runs_per_week';
  unit_label: string;
  amount: number;
  slider: { min: number; max: number; step: number };
  kwh_per_day_per_unit: number;
  saves_kwh_per_day: number;
}

export interface ExperimentProposal {
  id: string;
  /** `scenario`: kịch bản chạy nhiều thiết bị cùng lúc. */
  kind: 'single' | 'scenario';
  title: string;
  summary: string;
  /** Vì sao đề xuất, bằng số liệu của chính hộ này. */
  reason: string;
  appliances: ExperimentAppliance[];
  actions: ExperimentActionOut[];
  impact: { kwh_per_day: number; kwh_per_month: number; vnd_per_month: number };
  /** Đề xuất nên thử đầu tiên; luôn nằm đầu danh sách. */
  featured: boolean;
}

export interface ExperimentProposals {
  vnd_per_kwh: number;
  baselines: Partial<Record<ExperimentAppliance, ExperimentBaseline>>;
  items: ExperimentProposal[];
}

export const experimentProposalsQueryOptions = () =>
  queryOptions({
    queryKey: [...energyKeys.all, 'experiment-proposals', DEMO_NOW] as const,
    queryFn: () =>
      apiClient.get<ExperimentProposals>('/demo/experiments/proposals', {
        params: { asof: new Date(DEMO_NOW).toISOString() },
      }),
  });

export function useExperimentProposals() {
  return useSuspenseQuery(experimentProposalsQueryOptions());
}

/**
 * Nạp trước dữ liệu của các tab chưa mở (Tiêu thụ, Trợ lý AI, Thử nghiệm, Tài khoản) khi Trang chủ
 * đã xong, lần lượt từng cái để không chen với việc hiển thị. Mở tab nào cũng có số ngay.
 */
export async function prefetchAppData(client: QueryClient) {
  const jobs = [
    usageQueryOptions('week', 0),
    usageQueryOptions('month', 0),
    householdQueryOptions(),
    billingQueryOptions('household'),
    suggestionsQueryOptions(),
    experimentProposalsQueryOptions(),
    experimentTemplatesQueryOptions(),
  ];
  for (const job of jobs) {
    await client.prefetchQuery(job as Parameters<QueryClient['prefetchQuery']>[0]);
  }
}
