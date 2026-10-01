import React from 'react';

import { useAlerts } from '@/features/energy/api';
import { EnergyAlertsBlock } from '@/features/energy/components/energy-alerts-block';

/** Cảnh báo là dữ liệu phụ: không có thì không hiện gì, không chặn phần còn lại của trang. */
export function AlertsSection() {
  const { data } = useAlerts();
  return data.length > 0 ? <EnergyAlertsBlock alerts={data} /> : null;
}
