import type { DeviceSession } from './types';

/**
 * Chăm sóc thiết bị theo mẫu myAir "Equipment care", nhưng đếm theo số phiên thiết bị đã ghi
 * thay vì theo số ngày, vì Plasma Pro gửi nhật ký từng phiên.
 *
 * GIÁ TRỊ GIẢ ĐỊNH CHO DEMO: danh mục và chu kỳ dưới đây chưa được nhóm phần cứng xác nhận.
 * Khi có thông số thật, chỉ cần sửa bảng này.
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
  { id: 'clean', label: 'Vệ sinh đầu phát', doneBy: 'patient', everySessions: 12, howTo: 'Tắt thiết bị rồi vệ sinh đầu phát theo hướng dẫn đi kèm thiết bị.' },
  { id: 'cap', label: 'Thay nắp bảo vệ đầu phát', doneBy: 'tech', everySessions: 60, howTo: 'Kỹ thuật viên thay nắp khi bệnh nhân tái khám.' },
  { id: 'electrode', label: 'Kiểm tra điện cực', doneBy: 'tech', everySessions: 300, howTo: 'Kỹ thuật viên kiểm tra và thay điện cực nếu mòn.' },
];

/** Còn ≤ mức này thì nhắc bệnh nhân trên màn Thiết bị. */
export const CARE_DUE_SOON = 2;

export interface CareStatus { item: CareItem; used: number; remaining: number; due: boolean; lastDone: string | null }

/** Số phiên hoàn tất kể từ lần làm gần nhất; chưa từng làm thì tính từ phiên đầu tiên. */
export function careStatus(item: CareItem, sessions: DeviceSession[], lastDone: string | null | undefined): CareStatus {
  const used = sessions.filter((s) => s.status === 'completed' && (!lastDone || s.start > lastDone)).length;
  const remaining = item.everySessions - used;
  return { item, used, remaining, due: remaining <= CARE_DUE_SOON, lastDone: lastDone ?? null };
}
