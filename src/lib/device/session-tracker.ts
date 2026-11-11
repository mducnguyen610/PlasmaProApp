// Theo dõi chuỗi bản tin STA để nhận ra một phiên điều trị đã kết thúc (FR4).
// ICD chưa có mã phiên do máy sinh, nên ứng dụng lấy thời điểm thấy "running" đầu tiên làm mốc bắt đầu.

import type { SessionState } from './spec';

export interface StatusSample { state: SessionState; remainingSec: number | null }

export interface FinishedSession {
  /** done: máy chiếu đủ; stopped: người dùng dừng; error: máy báo lỗi giữa phiên. */
  outcome: 'done' | 'stopped' | 'error';
  startedAt: Date;
  endedAt: Date;
  /** Thời gian chiếu quan sát được, tính từ STA running đầu tiên tới STA kết thúc. */
  durationSec: number;
}

export interface SessionTracker {
  /** Đưa một bản tin STA vào; trả phiên vừa kết thúc, hoặc null. */
  push(s: StatusSample, at: Date): FinishedSession | null;
  /** Mất kết nối: bỏ phiên đang dở, không ghi gì. */
  reset(): void;
  readonly running: boolean;
}

export function createSessionTracker(): SessionTracker {
  let startedAt: Date | null = null;
  return {
    push(s, at) {
      if (s.state === 'running') {
        if (!startedAt) startedAt = at;
        return null;
      }
      if (s.state === 'idle') {
        startedAt = null;
        return null;
      }
      // done, stopped, error: chỉ ghi khi đã thấy phiên chạy, nên STA kết thúc lặp lại không sinh bản ghi thứ hai.
      if (!startedAt) return null;
      const start = startedAt;
      startedAt = null;
      return { outcome: s.state, startedAt: start, endedAt: at, durationSec: Math.max(0, Math.round((at.getTime() - start.getTime()) / 1000)) };
    },
    reset() {
      startedAt = null;
    },
    get running() {
      return startedAt !== null;
    },
  };
}
