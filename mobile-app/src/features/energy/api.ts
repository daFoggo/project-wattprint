import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import type { DeviceUsage, EnergySummary, Range, UsagePoint } from './types';

export const energyKeys = {
  all: ['energy'] as const,
  summary: () => [...energyKeys.all, 'summary'] as const,
  breakdown: (range: Range) => [...energyKeys.all, 'breakdown', range] as const,
  usage: (range: Range) => [...energyKeys.all, 'usage', range] as const,
};

export function useEnergySummary() {
  return useQuery({
    queryKey: energyKeys.summary(),
    queryFn: () => apiClient.get<EnergySummary>('/energy/summary'),
  });
}

export function useDeviceBreakdown(range: Range) {
  return useQuery({
    queryKey: energyKeys.breakdown(range),
    queryFn: () => apiClient.get<DeviceUsage[]>('/energy/breakdown', { params: { range } }),
  });
}

export function useUsageSeries(range: Range) {
  return useQuery({
    queryKey: energyKeys.usage(range),
    queryFn: () => apiClient.get<UsagePoint[]>('/energy/usage', { params: { range } }),
  });
}
