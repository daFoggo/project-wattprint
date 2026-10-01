import { useSuspenseQueries } from '@tanstack/react-query';

import { experimentProgressQueryOptions } from './api';
import { mergeProgress } from './experiment-utils';
import type { ActiveExperiment } from './types';

/** Số đo của mọi thiết bị trong thử nghiệm đang chạy: từng thiết bị và tổng cộng theo ngày. */
export function useActiveExperimentProgress(experiment: ActiveExperiment) {
  const results = useSuspenseQueries({
    queries: experiment.actions.map((a) => experimentProgressQueryOptions(a.appliance, experiment.startedDate)),
  });
  const perAppliance = results.map((r) => r.data);
  return { perAppliance, ...mergeProgress(perAppliance) };
}
