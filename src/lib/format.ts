import type { LabelStatus, PlanStatus, Trend, WoundStatus } from './types';

export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  // Giờ Việt Nam (UTC+7), cùng mốc với localDay và đồng hồ máy; không theo múi giờ điện thoại.
  const vn = new Date(new Date(iso).getTime() + 420 * 60000).toISOString();
  return `${vn.slice(11, 16)} ${fmtDate(vn.slice(0, 10))}`;
}

// Tông của các bảng dưới đây theo src/theme.status.ts (DESIGN_SYSTEM.md mục 6): đang diễn ra = teal (info), hoàn thành = green.
export const WOUND_STATUS: Record<WoundStatus, { label: string; tone: 'green' | 'amber' | 'gray' | 'teal' }> = {
  active: { label: 'Đang điều trị', tone: 'teal' },
  paused: { label: 'Tạm dừng', tone: 'amber' },
  awaiting_closure: { label: 'Chờ xác nhận liền', tone: 'teal' },
  follow_up: { label: 'Đã liền, đang theo dõi', tone: 'green' },
  closed: { label: 'Kết thúc', tone: 'gray' },
};

export const LABEL_STATUS: Record<LabelStatus, { label: string; tone: 'green' | 'amber' | 'gray' }> = {
  labeled: { label: 'Đã có diện tích', tone: 'green' },
  unlabeled: { label: 'Chưa có nhãn diện tích', tone: 'amber' },
  excluded: { label: 'Loại khỏi bộ dữ liệu', tone: 'gray' },
};

export const PLAN_STATUS: Record<PlanStatus, { label: string; tone: 'gray' | 'teal' | 'amber' }> = {
  draft: { label: 'Nháp', tone: 'gray' },
  active: { label: 'Đang áp dụng', tone: 'teal' },
  paused: { label: 'Tạm dừng', tone: 'amber' },
  ended: { label: 'Kết thúc', tone: 'gray' },
};

export const TREND: Record<Trend, { label: string; tone: 'green' | 'red' | 'gray' }> = {
  improving: { label: 'Cải thiện', tone: 'green' },
  stable: { label: 'Ít thay đổi', tone: 'gray' },
  worsening: { label: 'Diễn biến bất lợi', tone: 'red' },
  insufficient: { label: 'Chưa đủ thông tin', tone: 'gray' },
};
