import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Các tab trong app luôn mounted nên `refetchOnWindowFocus` không chạy khi đổi tab.
 * Hook này refetch các query đang active và đã stale mỗi khi màn hình được focus lại
 * (bỏ qua lần focus đầu, vì lúc đó query đã tự fetch lúc mount).
 */
export function useRefreshOnFocus() {
  const queryClient = useQueryClient();
  const firstTime = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstTime.current) {
        firstTime.current = false;
        return;
      }
      queryClient.refetchQueries({ stale: true, type: 'active' });
    }, [queryClient])
  );
}
