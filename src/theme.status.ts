// Quy tắc màu cho trạng thái thiết bị, quá trình điều trị và kết quả AI (DESIGN_SYSTEM.md mục 6).
// Mỗi trạng thái trả về một vai trò ngữ nghĩa (Semantic) và một biểu tượng Ionicons; màu lấy từ `semantic[role]` trong theme.ts.
// Tệp chạy được bằng node trong kiểm thử nên chỉ import kiểu, không import giá trị.
//
// Các bảng này là chuẩn ĐÍCH. Một số chỗ khác với tông màn hình đang dùng (ví dụ PLAN_STATUS.active đang 'green',
// chuẩn là 'info'); màn chuyển sang theo bảng "Lộ trình áp dụng" trong DESIGN_SYSTEM.md, không đổi trong giai đoạn này.

import type { DayKind } from './lib/adherence';
import type { SendResult } from './lib/device/sender';
import type { SessionState } from './lib/device/spec';
import type { LinkState } from './lib/device/transport';
import type { LabelStatus, PlanStatus, Severity, Trend, WoundStatus } from './lib/types';
import type { Semantic } from './theme';

export interface StatusStyle {
  role: Semantic;
  /** Tên biểu tượng Ionicons. Màu không bao giờ đứng một mình: luôn kèm biểu tượng và chữ. */
  icon: string;
}

// --- Thiết bị --------------------------------------------------------------

/** Kênh 1, cáp USB/UART (T01, T02, Q05). Nhãn chữ giữ LINK_LABEL trong src/lib/device/labels.ts. */
export const USB_LINK: Record<LinkState, StatusStyle> = {
  disconnected: { role: 'neutral', icon: 'unlink-outline' },
  connecting: { role: 'info', icon: 'sync-outline' },
  connected: { role: 'success', icon: 'link-outline' },
  error: { role: 'danger', icon: 'alert-circle-outline' },
};

/**
 * Kênh 2, thiết bị đồng bộ máy chủ qua Wi-Fi (N07, B04, B13, Q01, Q03). Tách hẳn chữ với kênh USB (V02):
 * không dùng "kết nối" cho kênh này.
 */
export type CloudState = 'online' | 'stale' | 'offline' | 'never';
export const CLOUD_LINK: Record<CloudState, StatusStyle & { label: string }> = {
  online: { role: 'success', icon: 'cloud-done-outline', label: 'Trực tuyến' },
  /** Có đồng bộ nhưng quá ngưỡng (CLOUD_STALE_HOURS). */
  stale: { role: 'warning', icon: 'cloud-outline', label: 'Lâu chưa đồng bộ' },
  offline: { role: 'warning', icon: 'cloud-offline-outline', label: 'Ngoại tuyến' },
  never: { role: 'neutral', icon: 'cloud-outline', label: 'Chưa đồng bộ lần nào' },
};
/** Giá trị đề xuất, chưa có nguồn; cần nhóm phần cứng và bác sĩ chốt. */
export const CLOUD_STALE_HOURS = 48;

/** Kết quả gửi cấu hình CFG. Nhãn chữ giữ sendResultLabel. */
export const SEND_RESULT: Record<SendResult['kind'], StatusStyle> = {
  acked: { role: 'success', icon: 'checkmark-circle-outline' },
  nacked: { role: 'danger', icon: 'close-circle-outline' },
  timeout: { role: 'warning', icon: 'time-outline' },
  corrupted: { role: 'warning', icon: 'warning-outline' },
  disconnected: { role: 'warning', icon: 'unlink-outline' },
  unidentified: { role: 'warning', icon: 'help-circle-outline' },
  incompatible: { role: 'danger', icon: 'close-circle-outline' },
  invalid: { role: 'danger', icon: 'alert-circle-outline' },
};

// --- Điều trị --------------------------------------------------------------

/** Phiên chiếu trên máy (T02). Đang chiếu là info, không phải success: success chỉ dành cho "đã xong". */
export const SESSION: Record<SessionState, StatusStyle> = {
  idle: { role: 'neutral', icon: 'ellipse-outline' },
  running: { role: 'info', icon: 'radio-button-on-outline' },
  done: { role: 'success', icon: 'checkmark-circle-outline' },
  stopped: { role: 'warning', icon: 'stop-circle-outline' },
  error: { role: 'danger', icon: 'alert-circle-outline' },
};

/** Ô lịch tuân thủ (N03, B13). */
export const ADHERENCE_DAY: Record<DayKind, StatusStyle> = {
  met: { role: 'success', icon: 'checkmark-circle-outline' },
  partial: { role: 'warning', icon: 'remove-circle-outline' },
  none: { role: 'warning', icon: 'close-circle-outline' },
  over: { role: 'warning', icon: 'warning-outline' },
  unsynced: { role: 'neutral', icon: 'cloud-offline-outline' },
  today: { role: 'info', icon: 'today-outline' },
  rest: { role: 'neutral', icon: 'moon-outline' },
  planned: { role: 'neutral', icon: 'calendar-outline' },
  outside: { role: 'neutral', icon: '' },
};

/** Đợt điều trị. "Đang áp dụng" là info; "Kết thúc" là neutral, không phải danger. */
export const PLAN: Record<PlanStatus, StatusStyle> = {
  draft: { role: 'neutral', icon: 'create-outline' },
  active: { role: 'info', icon: 'play-circle-outline' },
  paused: { role: 'warning', icon: 'pause-circle-outline' },
  ended: { role: 'neutral', icon: 'stop-circle-outline' },
};

export const WOUND: Record<WoundStatus, StatusStyle> = {
  active: { role: 'info', icon: 'medkit-outline' },
  paused: { role: 'warning', icon: 'pause-circle-outline' },
  awaiting_closure: { role: 'info', icon: 'hourglass-outline' },
  follow_up: { role: 'success', icon: 'checkmark-circle-outline' },
  closed: { role: 'neutral', icon: 'archive-outline' },
};

/** Mức độ vết thương: Nhẹ là neutral để xanh lá chỉ còn nghĩa hoàn thành (V07). */
export const SEVERITY_ROLE: Record<Severity, StatusStyle> = {
  mild: { role: 'neutral', icon: 'ellipse-outline' },
  moderate: { role: 'warning', icon: 'alert-circle-outline' },
  severe: { role: 'danger', icon: 'warning-outline' },
};

export const TREND_ROLE: Record<Trend, StatusStyle> = {
  improving: { role: 'success', icon: 'trending-down-outline' },
  stable: { role: 'neutral', icon: 'remove-outline' },
  worsening: { role: 'danger', icon: 'trending-up-outline' },
  insufficient: { role: 'neutral', icon: 'help-circle-outline' },
};

// --- Kết quả AI và nhãn ảnh -------------------------------------------------

/** Ai đưa ra con số. Luôn hiện nguồn cạnh số diện tích (V06). */
export type ValueSource = 'ai' | 'doctor';
export const SOURCE: Record<ValueSource, StatusStyle & { label: string }> = {
  ai: { role: 'info', icon: 'sparkles-outline', label: 'Gợi ý của AI' },
  doctor: { role: 'neutral', icon: 'person-outline', label: 'Bác sĩ nhập' },
};

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';
export const AI_CONFIDENCE: Record<ConfidenceLevel, StatusStyle & { label: string }> = {
  high: { role: 'info', icon: 'sparkles-outline', label: 'Độ tin cậy cao' },
  medium: { role: 'info', icon: 'sparkles-outline', label: 'Độ tin cậy trung bình' },
  low: { role: 'warning', icon: 'warning-outline', label: 'Độ tin cậy thấp, cần bác sĩ kiểm' },
  unknown: { role: 'neutral', icon: 'help-circle-outline', label: 'Mô-đun không cung cấp độ tin cậy' },
};

/**
 * Ngưỡng tạm, chưa có nguồn: chờ nhóm AI cung cấp theo mô hình thật. Độ tin cậy cao vẫn là "gợi ý",
 * không bao giờ dùng success, vì kết quả AI chưa được bác sĩ xác nhận.
 */
export const AI_CONFIDENCE_THRESHOLDS = { high: 0.8, medium: 0.5 } as const;

export function aiConfidenceLevel(confidence: number | null, t: { high: number; medium: number } = AI_CONFIDENCE_THRESHOLDS): ConfidenceLevel {
  if (confidence == null || !Number.isFinite(confidence)) return 'unknown';
  if (confidence >= t.high) return 'high';
  if (confidence >= t.medium) return 'medium';
  return 'low';
}

export const LABEL: Record<LabelStatus, StatusStyle> = {
  labeled: { role: 'success', icon: 'checkmark-circle-outline' },
  unlabeled: { role: 'warning', icon: 'create-outline' },
  excluded: { role: 'neutral', icon: 'remove-circle-outline' },
};
