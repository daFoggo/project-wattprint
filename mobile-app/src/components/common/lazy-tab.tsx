import React, { type PropsWithChildren, type ReactNode, useState } from 'react';
import { useIsFocused } from 'expo-router';

interface LazyTabProps extends PropsWithChildren {
  /** Hiện trong lúc tab chưa được mở lần nào (mặc định không hiện gì). */
  fallback?: ReactNode;
}

/**
 * NativeTabs dựng sẵn mọi tab ngay khi mở app, nên cả 5 màn cùng render và cùng gọi API trong lúc
 * người dùng chỉ nhìn thấy Trang chủ. Bọc nội dung tab bằng component này để nó chỉ được dựng ở
 * lần đầu tab được chọn; từ đó giữ nguyên (không dựng lại, không mất trạng thái).
 */
export function LazyTab({ children, fallback = null }: LazyTabProps) {
  const focused = useIsFocused();
  const [opened, setOpened] = useState(focused);
  if (focused && !opened) setOpened(true);
  return <>{opened ? children : fallback}</>;
}
