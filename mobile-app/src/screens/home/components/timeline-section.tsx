import React from 'react';

import { useTimeline } from '@/features/energy/api';
import { EnergyTimeline } from '@/features/energy/components/energy-timeline';

export function TimelineSection() {
  const { data } = useTimeline();
  return data.length > 0 ? <EnergyTimeline appliances={data} /> : null;
}
