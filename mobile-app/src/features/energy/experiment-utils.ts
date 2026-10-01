import type {
  ExperimentActionOut,
  ExperimentAppliance,
  ExperimentBaseline,
  ExperimentProgress,
  ExperimentTemplate,
} from './api';
import { DEMO_DAY } from './period';
import type { ActiveExperiment, ExperimentAction } from './types';

/** id mà `ApplianceIcon` nhận ra. */
export const APPLIANCE_ICON_ID: Record<ExperimentAppliance, string> = {
  AC: 'ac',
  WaterHeater: 'water-heater',
  WashingMachine: 'washer',
};

export const UNAVAILABLE_REASON = 'Ít khi chạy, chưa có gì để giảm';
export const NOT_ENOUGH_DAYS = 'Chưa đủ ngày hoàn chỉnh để tính tiết kiệm';
export const TOTAL_DAYS = 7;
const DAYS_PER_MONTH = 30;

export function formatKwh(value: number, digits = 1): string {
  return value.toLocaleString('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatVnd(value: number): string {
  return `${Math.round(value).toLocaleString('vi-VN')} đ`;
}

/** Số tiền ước tính làm tròn đến trăm đồng, để không giả vờ chính xác. */
export function roundVnd(value: number): number {
  return Math.round(value / 100) * 100;
}

/** `2023-08-29` -> `29/08`. */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** Ngày thứ mấy của thử nghiệm, tính đến "hôm nay" của dữ liệu demo. */
export function experimentDay(startedDate: string, totalDays: number): number {
  const diff = Math.round((Date.parse(DEMO_DAY) - Date.parse(startedDate)) / 86_400_000);
  return Math.min(totalDays, Math.max(1, diff + 1));
}

/** Câu tổng kết số đo: tiết kiệm, hoặc nói thật là đang cao hơn mức nền (không có "tiết kiệm âm"). */
export function savedSentence(kwh: number, vnd: number, completeDays: number): string {
  return kwh >= 0
    ? `Đã tiết kiệm ${formatKwh(kwh)} kWh, ${formatVnd(vnd)} qua ${completeDays} ngày hoàn chỉnh.`
    : `Đang cao hơn mức nền ${formatKwh(-kwh)} kWh (${formatVnd(-vnd)}) qua ${completeDays} ngày hoàn chỉnh.`;
}

/** 1 giờ 5 phút / 45 phút. */
export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} giờ` : `${h} giờ ${r} phút`;
}

/** Một thiết bị đang được cấu hình: mức cắt giảm có thể chỉnh trong khoảng `slider`. */
export interface EditableAction {
  appliance: ExperimentAppliance;
  name: string;
  knob: 'minutes_per_day' | 'runs_per_week';
  unit_label: string;
  amount: number;
  slider: { min: number; max: number; step: number };
  kwh_per_day_per_unit: number;
}

export function actionFromProposal(a: ExperimentActionOut): EditableAction {
  return {
    appliance: a.appliance,
    name: a.name,
    knob: a.knob,
    unit_label: a.unit_label,
    amount: a.amount,
    slider: a.slider,
    kwh_per_day_per_unit: a.kwh_per_day_per_unit,
  };
}

export function actionFromTemplate(t: ExperimentTemplate): EditableAction {
  return {
    appliance: t.appliance,
    name: t.name,
    knob: t.knob,
    unit_label: t.unit_label,
    amount: t.slider.default,
    slider: { min: t.slider.min, max: t.slider.max, step: t.slider.step },
    kwh_per_day_per_unit: t.kwh_per_day_per_unit,
  };
}

/** kWh/ngày dự kiến bớt của một thiết bị: công suất đo được x số đơn vị bớt đi. */
export function actionSaving(a: EditableAction): number {
  return a.amount * a.kwh_per_day_per_unit;
}

/** Tổng hợp của cả thử nghiệm: kWh/ngày, kWh/tháng, đ/tháng. */
export function totalSaving(actions: EditableAction[], vndPerKwh: number) {
  const kwhPerDay = actions.reduce((sum, a) => sum + actionSaving(a), 0);
  const kwhPerMonth = kwhPerDay * DAYS_PER_MONTH;
  return { kwhPerDay, kwhPerMonth, vndPerMonth: kwhPerMonth * vndPerKwh };
}

/** Mô tả mức giảm của một thiết bị: "Bớt 60 phút/ngày". */
export function amountLabel(a: { amount: number; unit_label?: string; unitLabel?: string }): string {
  return `Bớt ${a.amount} ${a.unit_label ?? a.unitLabel}`;
}

export function toExperimentAction(a: EditableAction, baseline: ExperimentBaseline): ExperimentAction {
  return {
    appliance: a.appliance,
    name: a.name,
    knob: a.knob,
    amount: a.amount,
    unitLabel: a.unit_label,
    baselineKwhPerDay: baseline.kwh_per_day,
    baselineMinutesPerDay: baseline.minutes_per_day,
    predictedKwhPerDay: actionSaving(a),
  };
}

export function buildExperiment(input: {
  title: string;
  kind: ActiveExperiment['kind'];
  actions: EditableAction[];
  baselines: Partial<Record<ExperimentAppliance, ExperimentBaseline>>;
  vndPerKwh: number;
}): ActiveExperiment {
  const actions = input.actions.flatMap((a) => {
    const baseline = input.baselines[a.appliance];
    return baseline ? [toExperimentAction(a, baseline)] : [];
  });
  return {
    id: `exp-${Date.now().toString(36)}`,
    title: input.title,
    kind: input.kind,
    startedDate: DEMO_DAY,
    totalDays: TOTAL_DAYS,
    actions,
    predictedKwhPerDay: actions.reduce((sum, a) => sum + a.predictedKwhPerDay, 0),
    vndPerKwh: input.vndPerKwh,
  };
}

export interface MergedDay {
  date: string;
  kwh: number;
  minutes: number;
  runs: number;
  complete: boolean;
}

/** Cộng số đo của các thiết bị theo từng ngày; ngày chỉ hoàn chỉnh khi mọi thiết bị đều hoàn chỉnh. */
export function mergeProgress(list: ExperimentProgress[]) {
  const byDate = new Map<string, MergedDay>();
  for (const p of list) {
    for (const d of p.days) {
      const cur = byDate.get(d.date);
      if (cur) {
        cur.kwh += d.kwh;
        cur.minutes += d.minutes;
        cur.runs += d.runs;
        cur.complete = cur.complete && d.complete;
      } else {
        byDate.set(d.date, { ...d });
      }
    }
  }
  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return {
    days,
    completeDays: days.filter((d) => d.complete).length,
    savedKwh: list.reduce((sum, p) => sum + p.saved_kwh, 0),
    savedVnd: list.reduce((sum, p) => sum + p.saved_vnd, 0),
    baselineKwhPerDay: list.reduce((sum, p) => sum + p.baseline.kwh_per_day, 0),
  };
}
