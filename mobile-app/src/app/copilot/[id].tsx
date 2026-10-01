import { CopilotThreadSkeleton } from '@/features/energy/components/chat-skeletons';
import { CopilotThreadScreen } from '@/screens/copilot/thread';

export default CopilotThreadScreen;

export { ErrorBoundary } from 'expo-router';
export const SuspenseFallback = CopilotThreadSkeleton;
