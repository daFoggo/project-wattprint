import type { ExperimentAppliance } from './api';

export type TariffPlan = 'tiered' | 'tou';

export type Range = 'day' | 'week' | 'month';

export type TariffPeriod = 'off_peak' | 'normal' | 'peak';

export type EnergyStatus = 'good' | 'warning' | 'critical';

export type UnitMode = 'kwh' | 'cost';

export type DashboardRange = 'day' | 'week' | 'month';

export interface BubbleDevice {
  id: string;
  name: string;
  pct: number;
  kwh: number;
  cost: number;
}

export type UsageTab = 'day' | 'week' | 'month';
export type BreakdownView = 'bubble' | 'donut' | 'bars';
export type CustomerType = 'home' | 'biz';

export type BarDatum = [label: string, value: number, tooltip: string];

export interface UsageChartSegment {
  id: string;
  label: string;
  kwh: number;
  cost: number;
  pattern: 'solid' | 'hatch' | 'muted' | 'stripe-h' | 'grid' | 'cross';
  color?: string;
}

export interface UsageChartItem {
  label: string;
  tooltip: string;
  kwh: number;
  cost: number;
  touSegments?: UsageChartSegment[];
  tierSegments?: UsageChartSegment[];
}

export interface TierInfo {
  name: string;
  sub: string;
  price: number;
  cap: number;
  color: string;
  symbol?: string;
  pattern?: 'solid' | 'hatch' | 'muted' | 'stripe-h' | 'grid' | 'cross';
}

export interface ChatFact {
  k: string;
  v: string;
}

export interface ChatAction {
  kind: 'experiment';
  appliance: ExperimentAppliance;
  label: string;
}

export interface ChatMessage {
  id: string;
  who: 'ai' | 'me';
  text: string;
  facts?: ChatFact[];
  /** Việc trợ lý đề nghị làm tiếp, vd mở một thử nghiệm. */
  action?: ChatAction | null;
  /** `pending`: đang chờ câu trả lời; `failed`: không lấy được câu trả lời. */
  state?: 'pending' | 'failed';
}

export interface ChatThread {
  id: string;
  title: string;
  /** Chủ đề viết hoa do backend gán theo câu hỏi, vd `HÓA ĐƠN`. */
  category: string;
  /** Kỳ mà câu trả lời gần nhất nói tới, vd `THÁNG 8`. */
  period: string;
  /** Mốc giờ máy (ms) của tin nhắn cuối, để xếp và nhóm cuộc hội thoại. */
  updatedAt: number;
  messages: ChatMessage[];
}

export type EmotionType = 'comfortable' | 'neutral' | 'uncomfortable';

/** Một thiết bị trong thử nghiệm và mức cắt giảm đã chọn cho nó. */
export interface ExperimentAction {
  appliance: ExperimentAppliance;
  name: string;
  knob: 'minutes_per_day' | 'runs_per_week';
  /** Mức cắt giảm đã chọn, theo `unitLabel`. */
  amount: number;
  unitLabel: string;
  /** Mức nền của riêng thiết bị này (kWh/ngày, phút/ngày) lúc bắt đầu. */
  baselineKwhPerDay: number;
  baselineMinutesPerDay: number;
  /** kWh mỗi ngày dự kiến tiết kiệm = `amount` x kWh/ngày mỗi đơn vị. */
  predictedKwhPerDay: number;
}

/**
 * Thử nghiệm đang chạy: một hoặc nhiều thiết bị cùng lúc (`actions`). Số đo lấy lại từ
 * `/demo/experiments/progress` cho từng thiết bị rồi cộng lại.
 */
export interface ActiveExperiment {
  id: string;
  title: string;
  /** `single` hoặc `scenario` của đề xuất đã chọn; `custom` khi người dùng tự tạo thử nghiệm. */
  kind: 'single' | 'scenario' | 'custom';
  /** Ngày bắt đầu (`YYYY-MM-DD`, theo dữ liệu demo). */
  startedDate: string;
  totalDays: number;
  actions: ExperimentAction[];
  /** Tổng kWh/ngày dự kiến tiết kiệm của mọi hành động. */
  predictedKwhPerDay: number;
  vndPerKwh: number;
}

export interface ExperimentLogItem {
  id: string;
  title: string;
  /** Tên các thiết bị đã tham gia, vd `['Điều hoà', 'Bình nóng lạnh']`. */
  devices: string[];
  /** Khoảng ngày đã chạy, vd `29/08 – 31/08`. */
  dateRange: string;
  days: number;
  savedKwh: number;
  savedVnd: number;
  emotion: EmotionType;
}
