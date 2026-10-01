import { BillingPageSkeleton } from '@/features/energy/components/billing-skeletons';
import { BillingScreen } from '@/screens/billing/index';

export default BillingScreen;

export { ErrorBoundary } from 'expo-router';
export const SuspenseFallback = BillingPageSkeleton;
