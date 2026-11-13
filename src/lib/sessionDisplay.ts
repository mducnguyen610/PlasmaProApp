import type { SessionState } from './device/spec.ts';
import type { LinkState } from './device/transport.ts';

/**
 * P0 DV-01: quyết định T02 được trình bày trạng thái phiên như thế nào, chỉ từ dữ liệu đã nhận.
 * Hàm thuần, không đọc hay ghi thiết bị, không đổi ngưỡng (ngưỡng truyền vào từ màn hình).
 * - none: chưa nhận bản tin trạng thái nào.
 * - live: bản tin còn mới và còn kết nối; hiển thị như bình thường.
 * - stale: còn kết nối nhưng đang điều trị mà quá ngưỡng không có bản tin; trạng thái hiện tại không rõ.
 * - lost: mất kết nối khi bản tin cuối chưa phải trạng thái kết thúc; trạng thái hiện tại không rõ.
 * Bản tin cuối là trạng thái kết thúc (done, stopped, error) thì vẫn là sự kiện máy đã báo, giữ live kể cả khi đã ngắt.
 */
export type SessionView = 'none' | 'live' | 'stale' | 'lost';

const ENDED: SessionState[] = ['done', 'stopped', 'error'];

export function sessionDisplay(input: {
  linkState: LinkState;
  state: SessionState | null;
  statusAt: string | null;
  now: number;
  staleAfterSec: number;
}): { view: SessionView; ageSec: number | null } {
  const { linkState, state, statusAt, now, staleAfterSec } = input;
  if (!state) return { view: 'none', ageSec: null };
  const ageSec = statusAt ? Math.max(0, Math.floor((now - new Date(statusAt).getTime()) / 1000)) : null;
  if (ENDED.includes(state)) return { view: 'live', ageSec };
  if (linkState !== 'connected') return { view: 'lost', ageSec };
  if (state === 'running' && ageSec !== null && ageSec > staleAfterSec) return { view: 'stale', ageSec };
  return { view: 'live', ageSec };
}
