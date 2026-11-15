/**
 * Stage 9C (gói C): dịch vụ vòng đời lệnh nạp liệu trình (CFG) ở tầng thiết bị. Màn T01 chỉ hiển thị kết quả.
 *
 * Vòng đời tách ba mốc, không gộp:
 * 1. Đã gửi (sending): ứng dụng đang ghi khung xuống cáp và chờ trả lời.
 * 2. Máy đã nhận (accepted): máy trả ACK. ACK chỉ nghĩa là máy nhận liệu trình, KHÔNG nghĩa là máy đang điều trị.
 * 3. Máy đang chạy (executing): chỉ khi có bản tin trạng thái STA "running" nhận được từ lúc ACK trở đi.
 * NAK, lệnh bị chặn trước khi gửi: rejected. Hết thời gian, khung lỗi, mất kết nối: failed.
 *
 * Không tự gửi lại (ICD mục 7): mọi lần gửi lại do người dùng bấm. Không đổi giao thức, lệnh hay tham số điều trị.
 */
import { nakHint } from './labels';
import type { SendResult, DeviceIdentity } from './sender';
import type { SessionState } from './spec';
import type { LinkState, TransportKind } from './transport';

export type CommandPhase = 'idle' | 'sending' | 'accepted' | 'executing' | 'rejected' | 'failed';

export interface ConfigCommandInput {
  linkState: LinkState;
  identity: DeviceIdentity | null;
  /** Đặc tả có lệnh hỏi thông tin (INF) hay không. */
  hasQueryInfo: boolean;
  appProtocolVersion: number;
  /** Cấu hình hợp lệ và có giá trị trên dây (checkTreatmentConfig không lỗi). */
  configReady: boolean;
  /** Hồ sơ đã được giao máy. */
  hasDevice: boolean;
  sending: boolean;
  result: SendResult | null;
  /** Lúc nhận kết quả gửi (ISO). */
  resultAt: string | null;
  /** Trạng thái STA gần nhất và lúc nhận. */
  sessionState: SessionState | null;
  statusAt: string | null;
}

export interface ConfigCommandView {
  versionMismatch: boolean;
  /** Máy chưa trả lời lệnh hỏi thông tin: chưa kiểm được phiên bản, không gửi (RK3). */
  unidentified: boolean;
  /** Đủ điều kiện nạp, không tính cờ đang gửi. */
  readyToSend: boolean;
  /** Nút nạp bật được. */
  canSend: boolean;
  /** Bước của luồng T01: 1 kết nối, 2 gửi, 3 theo dõi phiên. */
  step: 1 | 2 | 3;
  /** NAK mà gửi lại cũng vô ích: ẩn Gửi lại. */
  noRetry: boolean;
  nakBusy: boolean;
  phase: CommandPhase;
  /** Có STA running nhận được từ lúc ACK: bằng chứng máy đang chạy, khác với ACK. */
  executionConfirmed: boolean;
}

export function configCommandView(i: ConfigCommandInput): ConfigCommandView {
  const connected = i.linkState === 'connected';
  const info = i.identity?.kind === 'known' ? i.identity.info : null;
  const versionMismatch = !!info && info.protocolVersion !== i.appProtocolVersion;
  const unidentified = connected && i.hasQueryInfo && i.identity?.kind !== 'known';
  const readyToSend = connected && i.configReady && !versionMismatch && !unidentified && i.hasDevice;
  const r = i.result;
  const acked = r?.kind === 'acked';
  const executionConfirmed =
    acked && i.sessionState === 'running' && !!i.statusAt && !!i.resultAt && new Date(i.statusAt).getTime() >= new Date(i.resultAt).getTime();
  const phase: CommandPhase = i.sending
    ? 'sending'
    : !r
      ? 'idle'
      : acked
        ? executionConfirmed ? 'executing' : 'accepted'
        : r.kind === 'timeout' || r.kind === 'corrupted' || r.kind === 'disconnected'
          ? 'failed'
          : 'rejected';
  return {
    versionMismatch,
    unidentified,
    readyToSend,
    canSend: readyToSend && !i.sending,
    step: acked ? 3 : connected ? 2 : 1,
    noRetry: r?.kind === 'nacked' && !nakHint(r.code).retry,
    nakBusy: r?.kind === 'nacked' && r.code === 'BUSY',
    phase,
    executionConfirmed,
  };
}

/** Bản ghi nhật ký nạp (DeviceLinkLog không có id, at, by: store điền). */
export interface ConfigSendLog {
  deviceId: string;
  patientId: string;
  planId: string;
  planVersion: number;
  transport: TransportKind;
  result: SendResult['kind'];
  attempts: number;
  code?: string;
  protocolVersion: number;
  capsSource: 'device' | 'table' | 'none';
}

/**
 * Gửi một lần rồi ghi nhật ký. Lỗi ghi nhật ký không đổi kết quả gửi (máy đã nhận hay chưa vẫn đúng như máy trả lời)
 * mà được trả riêng để màn hình báo. Không gửi lại.
 */
export async function sendTreatmentConfig<C>(
  deps: { send: (cfg: C) => Promise<SendResult>; record: (log: ConfigSendLog) => Promise<void>; now?: () => Date },
  cfg: C,
  meta: Omit<ConfigSendLog, 'result' | 'attempts' | 'code'>,
): Promise<{ result: SendResult; at: string; logError: unknown | null }> {
  const result = await deps.send(cfg);
  const at = (deps.now ?? (() => new Date()))().toISOString();
  let logError: unknown | null = null;
  try {
    await deps.record({
      ...meta,
      result: result.kind,
      attempts: 'attempts' in result ? result.attempts : 0,
      code: result.kind === 'nacked' ? result.code : undefined,
    });
  } catch (e) {
    logError = e;
  }
  return { result, at, logError };
}

/**
 * Một lệnh trên dây tại một thời điểm: trong lúc lệnh trước chưa có kết quả, lời gọi mới nhận lại đúng lời hứa đó
 * (không gửi khung mới). Xong (kể cả lỗi) thì lời gọi sau gửi bình thường.
 */
export function createSingleFlight<R>() {
  let current: Promise<R> | null = null;
  return {
    run(start: () => Promise<R>): Promise<R> {
      if (current) return current;
      const p = start().finally(() => {
        if (current === p) current = null;
      });
      current = p;
      return p;
    },
    reset() {
      current = null;
    },
  };
}
