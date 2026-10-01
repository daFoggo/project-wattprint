import { HomePageSkeleton } from '@/screens/home/components/home-skeletons';
import { HomeScreen } from '@/screens/home/index';

export default HomeScreen;

// Expo Router: hiện khi module màn hình đang được nạp theo nhu cầu / một ranh giới Suspense cấp route
export { ErrorBoundary } from 'expo-router';
export const SuspenseFallback = HomePageSkeleton;
