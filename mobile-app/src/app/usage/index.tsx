import { UsagePageSkeleton } from '@/screens/usage/components/usage-skeletons';
import { UsageScreen } from '@/screens/usage/index';

export default UsageScreen;

export { ErrorBoundary } from 'expo-router';
export const SuspenseFallback = UsagePageSkeleton;
