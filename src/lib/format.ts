import type { LabelStatus, PlanStatus, Trend, WoundStatus } from './types';

export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  const day = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return `${hh}:${mm} ${fmtDate(day)}`;
}

export const WOUND_STATUS: Record<WoundStatus, { label: string; tone: 'green' | 'amber' | 'gray' | 'blue' | 'violet' }> = {
  active: { label: 'Đang điều trị', tone: 'green' },
  paused: { label: 'Tạm dừng', tone: 'amber' },
  awaiting_closure: { label: 'Chờ xác nhận liền', tone: 'blue' },
  follow_up: { label: 'Đã liền, đang theo dõi', tone: 'violet' },
  closed: { label: 'Kết thúc', tone: 'gray' },
};

export const LABEL_STATUS: Record<LabelStatus, { label: string; tone: 'green' | 'amber' | 'gray' }> = {
  labeled: { label: 'Đã có diện tích', tone: 'green' },
  unlabeled: { label: 'Chưa có nhãn diện tích', tone: 'amber' },
  excluded: { label: 'Loại khỏi bộ dữ liệu', tone: 'gray' },
};

export const PLAN_STATUS: Record<PlanStatus, { label: string; tone: 'gray' | 'green' | 'amber' | 'red' }> = {
  draft: { label: 'Nháp', tone: 'gray' },
  active: { label: 'Đang áp dụng', tone: 'green' },
  paused: { label: 'Tạm dừng', tone: 'amber' },
  ended: { label: 'Kết thúc', tone: 'red' },
};

export const TREND: Record<Trend, { label: string; tone: 'green' | 'blue' | 'red' | 'gray' }> = {
  improving: { label: 'Cải thiện', tone: 'green' },
  stable: { label: 'Ít thay đổi', tone: 'blue' },
  worsening: { label: 'Diễn biến bất lợi', tone: 'red' },
  insufficient: { label: 'Chưa đủ thông tin', tone: 'gray' },
};
