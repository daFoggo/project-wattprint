import { CopilotListSkeleton } from '@/features/energy/components/chat-skeletons';
import { CopilotScreen } from '@/screens/copilot/index';

export default CopilotScreen;

export { ErrorBoundary } from 'expo-router';
export const SuspenseFallback = CopilotListSkeleton;
