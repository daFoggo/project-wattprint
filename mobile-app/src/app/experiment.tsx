import { LazyTab } from '@/components/common/lazy-tab';
import { ExperimentScreen } from '@/screens/experiment/index';

export default function ExperimentRoute() {
  return (
    <LazyTab>
      <ExperimentScreen />
    </LazyTab>
  );
}
