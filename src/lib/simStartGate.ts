/**
 * Stage 9B (S8-B07): điều kiện hiện nút "Bắt đầu điều trị" ở T02. Nút này chỉ có với thiết bị giả lập (thay cho thao tác trên máy).
 * Máy giả lập chưa có liệu trình (ví dụ sau khi tải lại trang) thì không hiện nút và nói rõ lý do; không tự nạp lại,
 * không giả lập phản hồi thành công. Thiết bị thật không có nút này nên không đổi.
 */
export type SimStartGate = { show: boolean; reason: string | null };

export const SIM_NO_CONFIG_TEXT =
  'Máy giả lập chưa có liệu trình nên chưa bắt đầu được. Tải lại trang làm máy giả lập khởi động lại và mất liệu trình đã nạp. Vào "Nạp liệu trình" để nạp lại trước khi bắt đầu.';

export function simStartGate(x: { simControls: boolean; connected: boolean; running: boolean; configLoaded: boolean | undefined }): SimStartGate {
  if (!x.simControls || !x.connected || x.running) return { show: false, reason: null };
  if (x.configLoaded !== true) return { show: false, reason: SIM_NO_CONFIG_TEXT };
  return { show: true, reason: null };
}
