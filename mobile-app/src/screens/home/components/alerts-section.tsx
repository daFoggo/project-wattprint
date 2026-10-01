import React, { useDeferredValue } from 'react';

import { useAlerts } from '@/features/energy/api';
import { mutedCodes } from '@/features/energy/alert-prefs';
import { EnergyAlertsBlock } from '@/features/energy/components/energy-alerts-block';
import { useEnergyStore } from '@/features/energy/use-energy-store';

/** Cảnh báo là dữ liệu phụ: không có thì không hiện gì, không chặn phần còn lại của trang. */
export function AlertsSection() {
  const { alertPrefs } = useEnergyStore();
  // tắt/bật công tắc ở Tài khoản đổi khoá truy vấn: giữ danh sách cũ cho tới khi danh sách mới về
  const mute = useDeferredValue(mutedCodes(alertPrefs));
  const { data } = useAlerts('household', mute);
  return data.length > 0 ? <EnergyAlertsBlock alerts={data} /> : null;
}
