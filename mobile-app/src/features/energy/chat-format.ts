import type { ChatThread } from '@/features/energy/types';

export type ThreadGroup = 'today' | 'this_week' | 'earlier';

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Nhóm theo mốc giờ máy: hôm nay, trong 7 ngày gần đây, hoặc cũ hơn. */
export function groupOf(updatedAt: number, now = Date.now()): ThreadGroup {
  const today = startOfDay(now);
  if (updatedAt >= today) return 'today';
  if (updatedAt >= today - 6 * DAY) return 'this_week';
  return 'earlier';
}

/** "Vừa xong", "5 phút trước", "2 giờ trước", "Hôm qua", hoặc dd/mm. */
export function timeAgo(updatedAt: number, now = Date.now()): string {
  const diff = now - updatedAt;
  if (diff < 60 * 1000) return 'Vừa xong';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} phút trước`;
  const today = startOfDay(now);
  if (updatedAt >= today) return `${Math.floor(diff / 3600000)} giờ trước`;
  if (updatedAt >= today - DAY) return 'Hôm qua';
  const d = new Date(updatedAt);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const DOT_COLORS: Record<string, string> = {
  'HÓA ĐƠN': '#B5E930',
  'TIÊU THỤ': '#2F7A0C',
  'THIẾT BỊ': '#164437',
  'ĐIỀU HOÀ': '#4A6B60',
  'BÌNH NÓNG LẠNH': '#E58A2B',
  'TỦ LẠNH': '#7C9588',
  'CHẠY NỀN': '#D4A017',
};

export function dotColorOf(category: ChatThread['category']): string {
  return DOT_COLORS[category] ?? '#B5E930';
}

export function metaOf(thread: ChatThread): string {
  return [thread.category, thread.period, timeAgo(thread.updatedAt)].filter(Boolean).join(' · ');
}
