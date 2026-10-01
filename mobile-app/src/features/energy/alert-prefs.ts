/** Công tắc thông báo ở tab Tài khoản. Mỗi công tắc tắt một nhóm mã cảnh báo của `/demo/alerts`. */
export interface AlertPrefs {
  tier: boolean;
  today: boolean;
  longRun: boolean;
}

export const DEFAULT_ALERT_PREFS: AlertPrefs = { tier: true, today: true, longRun: true };

export const ALERT_PREF_ITEMS: { key: keyof AlertPrefs; label: string; codes: string[] }[] = [
  {
    key: 'tier',
    label: 'Cảnh báo nhảy bậc điện',
    codes: ['tier_approaching', 'tier_headroom', 'tou_peak_share'],
  },
  { key: 'today', label: 'So sánh với hôm qua', codes: ['day_vs_yesterday', 'big_share'] },
  { key: 'longRun', label: 'Thiết bị chạy liên tục lâu', codes: ['long_run'] },
];

/** Mã cảnh báo cần tắt theo các công tắc, đã sắp xếp để khoá cache ổn định. */
export function mutedCodes(prefs: AlertPrefs): string[] {
  return ALERT_PREF_ITEMS.filter((i) => !prefs[i.key])
    .flatMap((i) => i.codes)
    .sort();
}
