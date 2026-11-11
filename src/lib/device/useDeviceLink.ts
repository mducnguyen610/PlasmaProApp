// Hook React bọc đường truyền dùng chung: trạng thái kết nối, thông tin máy, gửi cấu hình, trạng thái phiên.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { capabilitiesFor } from './capabilities';
import type { DeviceCapabilities } from './capabilities';
import { createCodec } from './codec';
import { getTransport, onTransportChange, PROTOCOL } from './index';
import { toDeviceMessage } from './protocol';
import type { DeviceMessage, TreatmentConfig } from './protocol';
import { identifyDevice, sendConfig } from './sender';
import { createSessionTracker } from './session-tracker';
import type { FinishedSession } from './session-tracker';
import type { DeviceIdentity, SendResult } from './sender';
import type { LinkState } from './transport';

export type StatusMessage = Extract<DeviceMessage, { kind: 'status' }>;

// Trạng thái giữ ở mức mô-đun để các màn dùng chung một kết nối thấy cùng một thông tin.
let lastState: LinkState = 'disconnected';
let lastIdentity: DeviceIdentity | null = null;

export interface DeviceLinkOptions {
  /** Gọi khi chuỗi STA cho thấy một phiên vừa kết thúc (running rồi done, stopped hoặc error). */
  onSessionEnd?: (s: FinishedSession) => void;
}

export function useDeviceLink(opts: DeviceLinkOptions = {}) {
  const [, setGen] = useState(0);
  const onSessionEnd = useRef(opts.onSessionEnd);
  useEffect(() => {
    onSessionEnd.current = opts.onSessionEnd;
  });
  const transport = getTransport();
  const [state, setState] = useState<LinkState>(lastState);
  const [detail, setDetail] = useState<string | undefined>();
  const [identity, setIdentity] = useState<DeviceIdentity | null>(lastIdentity);
  const [lastStatus, setLastStatus] = useState<StatusMessage | null>(null);
  const [lastStatusAt, setLastStatusAt] = useState<string | null>(null);

  // Quản trị viên đổi giữa USB thật và giả lập: bỏ trạng thái của đường truyền cũ, vẽ lại với đường truyền mới.
  useEffect(
    () =>
      onTransportChange(() => {
        lastState = 'disconnected';
        lastIdentity = null;
        setState('disconnected');
        setDetail(undefined);
        setIdentity(null);
        setLastStatus(null);
        setLastStatusAt(null);
        setGen((g) => g + 1);
      }),
    [],
  );

  useEffect(() => {
    const reader = createCodec(PROTOCOL).createReader('device_to_app');
    const tracker = createSessionTracker();
    const offState = transport.onState((s, d) => {
      lastState = s;
      // Mất kết nối giữa phiên: bỏ phiên dở, không ghi.
      if (s !== 'connected') tracker.reset();
      setState(s);
      setDetail(d);
      if (s !== 'connected') {
        lastIdentity = null;
        setIdentity(null);
      }
    });
    const offData = transport.onData((chunk) => {
      for (const f of reader.push(chunk)) {
        if (f.kind !== 'frame') continue;
        const m = toDeviceMessage(f, PROTOCOL);
        if (m.kind === 'status') {
          const now = new Date();
          setLastStatus(m);
          setLastStatusAt(now.toISOString());
          const done = tracker.push(m, now);
          if (done) onSessionEnd.current?.(done);
        }
      }
    });
    return () => {
      offState();
      offData();
    };
  }, [transport]);

  const caps: DeviceCapabilities | null = useMemo(() => {
    if (identity?.kind === 'known' && identity.caps) return identity.caps;
    return capabilitiesFor(transport.model);
  }, [identity, transport.model]);
  const capsSource: 'device' | 'table' | 'none' = identity?.kind === 'known' && identity.caps ? 'device' : capabilitiesFor(transport.model) ? 'table' : 'none';

  const connect = useCallback(async () => {
    try {
      await transport.open();
      const id = await identifyDevice(transport, PROTOCOL);
      lastIdentity = id;
      setIdentity(id);
    } catch {
      // Lỗi hiện qua state 'error' do đường truyền phát.
    }
  }, [transport]);

  /** Hỏi lại thông tin và năng lực máy khi đã kết nối. */
  const identify = useCallback(async () => {
    const id = await identifyDevice(transport, PROTOCOL);
    lastIdentity = id;
    setIdentity(id);
  }, [transport]);

  const disconnect = useCallback(async () => {
    await transport.close().catch(() => {});
  }, [transport]);

  const send = useCallback(
    (cfg: TreatmentConfig): Promise<SendResult> =>
      sendConfig(transport, cfg, caps, PROTOCOL, {
        // Máy đã trả INF: kiểm phiên bản. Đặc tả không có lệnh hỏi: bỏ qua. Còn lại (chưa hỏi, không trả lời): chặn gửi.
        deviceVersion: identity?.kind === 'known' ? (identity.info ? identity.info.protocolVersion : undefined) : null,
        // Ngày giờ lấy lại ở mỗi lần gửi, không dùng lúc vẽ màn.
        now: () => new Date(),
      }),
    [transport, caps, identity],
  );

  const simulated = transport.kind === 'simulated';
  return {
    transport,
    kind: transport.kind,
    model: transport.model,
    state,
    detail,
    identity,
    caps,
    capsSource,
    connect,
    identify,
    disconnect,
    send,
    lastStatus,
    lastStatusAt,
    startSession: simulated ? transport.startSession : undefined,
    stopSession: simulated ? transport.stopSession : undefined,
  };
}
