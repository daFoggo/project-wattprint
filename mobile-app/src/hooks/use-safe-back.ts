import { useCallback, useRef } from 'react';
import { useRouter, type Href } from 'expo-router';

/**
 * Quay lại một màn, không bao giờ ném lỗi `GO_BACK was not handled`.
 *
 * - Chạm đúp hoặc vừa vuốt vừa chạm: lần thứ hai bị bỏ qua (nếu không, nó pop luôn màn bên dưới
 *   hoặc báo lỗi vì không còn gì để quay lại).
 * - Không có lịch sử (mở thẳng vào màn này): về `fallback` thay vì báo lỗi.
 */
export function useSafeBack(fallback: Href) {
  const router = useRouter();
  const busy = useRef(false);

  return useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    setTimeout(() => {
      busy.current = false;
    }, 700); // dài hơn animation pop của native stack
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}
