import type { DeviceSession } from './types';

/**
 * Chăm sóc thiết bị theo đặc thù điều trị plasma (thay mẫu myAir đếm 12/60/300 phiên):
 * - Đầu phát dùng riêng cho từng bệnh nhân (slide 25), cấp khi giao thiết bị, thay khi hết đợt hoặc khi hỏng.
 * - Vệ sinh đầu phát sau MỖI phiên, vì vết thương có thể nhiễm khuẩn đa kháng (slide 10, 34).
 *
 * GIÁ TRỊ GIẢ ĐỊNH CHO DEMO: cách vệ sinh phải theo hướng dẫn của nhà sản xuất, chờ nhóm phần cứng xác nhận.
 */
export interface CareItem {
  id: string;
  label: string;
  /** Ai được đánh dấu đã làm: bệnh nhân tự vệ sinh; thay linh kiện do kỹ thuật. */
  doneBy: 'patient' | 'tech';
  everySessions: number;
  howTo: string;
}

export const CARE_ITEMS: CareItem[] = [
  { id: 'clean', label: 'Vệ sinh đầu phát', doneBy: 'patient', everySessions: 1, howTo: 'Tắt thiết bị, lau đầu phát theo hướng dẫn đi kèm, để khô rồi đậy nắp. Không dùng chung đầu phát với người khác.' },
];

/** Còn ≤ mức này thì nhắc bệnh nhân trên màn Thiết bị (0: nhắc ngay sau mỗi phiên). */
export const CARE_DUE_SOON = 0;

/** Các bước của vòng đời thiết bị cho thuê (slide 24). */
export const LIFECYCLE: Record<string, { label: string; next?: string; action?: string }> = {
  in_use: { label: 'Đang giao cho bệnh nhân', next: 'returned', action: 'Thu hồi khi kết thúc đợt' },
  returned: { label: 'Đã thu hồi, chờ khử khuẩn', next: 'disinfected', action: 'Đã khử khuẩn' },
  disinfected: { label: 'Đã khử khuẩn, chờ kiểm tra', next: 'ready', action: 'Kiểm tra xong' },
  ready: { label: 'Sẵn sàng cấp cho bệnh nhân' },
};

export interface CareStatus { item: CareItem; used: number; remaining: number; due: boolean; lastDone: string | null }

/** Số phiên hoàn tất kể từ lần làm gần nhất; chưa từng làm thì tính từ phiên đầu tiên. */
export function careStatus(item: CareItem, sessions: DeviceSession[], lastDone: string | null | undefined): CareStatus {
  const used = sessions.filter((s) => s.status === 'completed' && (!lastDone || s.start > lastDone)).length;
  const remaining = item.everySessions - used;
  return { item, used, remaining, due: remaining <= CARE_DUE_SOON, lastDone: lastDone ?? null };
}
