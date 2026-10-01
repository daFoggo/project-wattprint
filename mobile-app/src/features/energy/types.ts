export type TariffPlan = 'tiered' | 'tou';

export type Range = 'day' | 'week' | 'month';

export type TariffPeriod = 'off_peak' | 'normal' | 'peak';

export type EnergyStatus = 'good' | 'warning' | 'critical';

export interface DeviceUsage {
  id: string;
  name: string;
  category: string;
  kwh: number;
  cost: number;
  share: number;
}

export interface UsagePoint {
  timestamp: string;
  kwh: number;
  tariffPeriod: TariffPeriod;
}

export interface EnergySummary {
  currentPowerW: number;
  todayKwh: number;
  todayCost: number;
  projectedMonthlyCost: number;
  status: EnergyStatus;
  statusMessage: string;
  briefSummary: string;
}

export type UnitMode = 'kwh' | 'cost';

export type DashboardRange = 'day' | 'week' | 'month';

export interface DashboardHeroData {
  kwh: number;
  deltaPct: number;
  period: string;
  comparison: string;
  shares: number[];
}

export interface BubbleDevice {
  id: string;
  name: string;
  pct: number;
  kwh: number;
  cost: number;
}

export interface AlertItem {
  id: string;
  time: string;
  tone: 'warning' | 'info' | 'good';
  text: string;
}

export interface TimelineEvent {
  id: string;
  time: string;
  rampIndex: number;
  text: string;
  detail: string[];
}

export type UsageTab = 'day' | 'week' | 'month' | 'year';
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

export interface RangeData {
  kwh: number;
  deltaPct: number;
  period: string;
  comparison: string;
  bars: BarDatum[];
  chartItems?: UsageChartItem[];
  shares: number[];
  comparisonCurrent?: number[];
  comparisonPrevious?: number[];
  currentLabel?: string;
  previousLabel?: string;
  axisStart?: string;
  axisEnd?: string;
  datePrefix?: string;
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

export interface TOUInfo {
  id: string;
  name: string;
  sub: string;
  price: number;
  share: number;
  hours: string;
  kwh: number;
  cost: number;
  color: string;
}

export interface BillDay {
  day: number;
  kwh: number;
  segs: { ti: number; kwh: number }[];
}

export interface DeviceDetailData {
  id: string;
  name: string;
  meta: string;
  avgW: string;
  costMonth: string;
  note: string;
  stats: { label: string; value: string }[];
}

export interface ChatFact {
  k: string;
  v: string;
}

export interface ChatWeatherFact {
  tempC: number;
  diffC: number;
  desc: string;
}

export interface ChatTariffFact {
  currentTier: string;
  price: number;
  headroomKwh: number;
  nextTier: string;
}

export interface ChatMessage {
  id: string;
  who: 'ai' | 'me';
  text: string;
  facts?: ChatFact[];
  weather?: ChatWeatherFact;
  tariffFact?: ChatTariffFact;
  cta?: string;
  ctaDesc?: string;
}

export interface ChatThread {
  id: string;
  title: string;
  category: string;
  period: string;
  timeAgo: string;
  group: 'today' | 'this_week' | 'earlier';
  dotColor: string;
  messages: ChatMessage[];
}

export interface Suggestion {
  q: string;
  a: string;
  facts: string | ChatFact[];
  cta: string;
  ctaDesc?: string;
}

export type ExperimentState = 'running' | 'summary' | 'suggest' | 'locked';

export type EmotionType = 'comfortable' | 'neutral' | 'uncomfortable';

export interface DeviceDailyLog {
  day: number;
  date: string;
  kwh: number;
  runtime: string;
}

export interface ActiveExperiment {
  id: string;
  deviceId: string;
  deviceName: string;
  title: string;
  baselineKwh: number;
  targetKwh: number;
  predictedSavedKwh: number;
  predictedSavedVnd: number;
  currentDay: number;
  totalDays: number;
  dailyLogs: DeviceDailyLog[];
  emotion?: EmotionType;
}

export interface ExperimentLogItem {
  id: string;
  title: string;
  date: string;
  result?: string;
  savedVnd: number;
  savedKwh?: number;
  note: string;
  good: boolean;
  emotion?: EmotionType;
}

export interface AccountGroup {
  title: string;
  items: { label: string; value: string }[];
}
