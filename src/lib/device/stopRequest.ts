// Stage 9C (gói C): vòng đời yêu cầu dừng ở T02, gom về lớp thiết bị để có một nơi duy nhất quyết định "đã dừng".
// Ba mốc tách biệt: ứng dụng gửi yêu cầu (stopAt) → máy gửi bản tin trạng thái kết thúc SAU lúc gửi → mới coi là đã xác nhận.
// Bản tin cũ (trước lúc bấm) không được tính, để không báo đã dừng trước khi máy xác nhận (P0 DV-01). Logic giữ nguyên như T02 trước đây.

export type StopEndState = 'stopped' | 'done' | 'error';

export interface StopRequestInput {
  /** Thời điểm bấm Dừng (ms); null khi chưa bấm. */
  stopAt: number | null;
  /** Trạng thái phiên trong bản tin STA mới nhất; null khi chưa có. */
  state: string | null;
  /** Thời điểm nhận bản tin STA mới nhất (ISO); null khi chưa có. */
  statusAt: string | null;
  /** Đồng hồ hiện tại (ms). */
  now: number;
}

export interface StopRequestView {
  /** Máy đã gửi trạng thái kết thúc sau lúc bấm. */
  confirmed: boolean;
  /** Số giây đã chờ xác nhận; null khi chưa bấm hoặc đã xác nhận. */
  waitSec: number | null;
}

const END: readonly string[] = ['stopped', 'done', 'error'];

export function stopRequestView(x: StopRequestInput): StopRequestView {
  const confirmed = x.stopAt !== null && !!x.state && END.includes(x.state) && !!x.statusAt && new Date(x.statusAt).getTime() >= x.stopAt;
  const waitSec = x.stopAt !== null && !confirmed ? Math.max(0, Math.floor((x.now - x.stopAt) / 1000)) : null;
  return { confirmed, waitSec };
}
