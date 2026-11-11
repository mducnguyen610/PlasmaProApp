// Hook React bọc đường truyền dùng chung: trạng thái kết nối, thông tin máy, gửi cấu hình, trạng thái phiên.

import { useCallback, useEffect, useMemo, useState } from 'react';

import { capabilitiesFor } from './capabilities';
import type { DeviceCapabilities } from './capabilities';
import { createCodec } from './codec';
import { getTransport, PROTOCOL } from './index';
import { toDeviceMessage } from './protocol';
import type { DeviceMessage, TreatmentConfig } from './protocol';
import { identifyDevice, sendConfig } from './sender';
import type { DeviceIdentity, SendResult } from './sender';
import type { LinkState } from './transport';

export type StatusMessage = Extract<DeviceMessage, { kind: 'status' }>;

// Trạng thái giữ ở mức mô-đun để các màn dùng chung một kết nối thấy cùng một thông tin.
let lastState: LinkState = 'disconnected';
let lastIdentity: DeviceIdentity | null = null;

export function useDeviceLink() {
  const transport = getTransport();
  const [state, setState] = useState<LinkState>(lastState);
  const [detail, setDetail] = useState<string | undefined>();
  const [identity, setIdentity] = useState<DeviceIdentity | null>(lastIdentity);
  const [lastStatus, setLastStatus] = useState<StatusMessage | null>(null);
  const [lastStatusAt, setLastStatusAt] = useState<string | null>(null);

  useEffect(() => {
    const reader = createCodec(PROTOCOL).createReader('device_to_app');
    const offState = transport.onState((s, d) => {
      lastState = s;
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
          setLastStatus(m);
          setLastStatusAt(new Date().toISOString());
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

  const disconnect = useCallback(async () => {
    await transport.close().catch(() => {});
  }, [transport]);

  const send = useCallback(
    (cfg: TreatmentConfig): Promise<SendResult> => sendConfig(transport, cfg, caps, PROTOCOL, { deviceVersion: identity?.kind === 'known' ? (identity.info?.protocolVersion ?? null) : null }),
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
    disconnect,
    send,
    lastStatus,
    lastStatusAt,
    startSession: simulated ? transport.startSession : undefined,
    stopSession: simulated ? transport.stopSession : undefined,
  };
}
