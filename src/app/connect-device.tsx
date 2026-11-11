import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { NoAccess, useCanView } from '@/components/Guard';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Choices, Header, InfoRow, Muted, Notice, Screen, SectionTitle } from '@/components/ui';
import { modeLabel } from '@/lib/device/capabilities';
import { planToConfig, PROTOCOL } from '@/lib/device';
import { CONFIG_ERROR_LABEL, LINK_LABEL, MISSING_LABEL, sendResultLabel } from '@/lib/device/labels';
import { configToWire, validateConfig } from '@/lib/device/protocol';
import type { SendResult } from '@/lib/device/sender';
import { useDeviceLink } from '@/lib/device/useDeviceLink';
import { useLookups, useStore } from '@/lib/store';
import { C } from '@/theme';

/** Nạp liệu trình bác sĩ đã xác nhận xuống máy qua USB/UART (giai đoạn 1: thiết bị giả lập). */
export default function ConnectDevice() {
  const params = useLocalSearchParams<{ patientId?: string; woundId?: string }>();
  const { me, recordDeviceLink } = useStore();
  const { patient, woundsOf, coursePlan } = useLookups();
  const p = patient(me?.role === 'patient' ? me.patientId : params.patientId);
  const canView = useCanView(p);
  const link = useDeviceLink();
  const [chosen, setChosen] = useState<string>(params.woundId ?? '');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  const courses = useMemo(
    () =>
      (p ? woundsOf(p.id) : [])
        .map((w) => ({ wound: w, plan: coursePlan(w.id) }))
        .filter((x) => x.plan && x.plan.status === 'active' && x.plan.confirmed),
    [p, woundsOf, coursePlan],
  );
  const selected = courses.length === 1 ? courses[0] : courses.find((c) => c.wound.id === chosen);

  if (!p || !canView) return <NoAccess />;

  const plan = selected?.plan;
  const prepared = plan ? planToConfig(plan, p, new Date()) : null;
  const cfg = prepared && !('missing' in prepared) ? prepared : null;
  const errors = cfg ? validateConfig(cfg, link.caps, PROTOCOL) : [];
  const wire = cfg && errors.length === 0 ? configToWire(cfg, PROTOCOL) : null;
  const idInfo = link.identity?.kind === 'known' ? link.identity.info : null;
  const versionMismatch = !!idInfo && idInfo.protocolVersion !== PROTOCOL.protocolVersion;
  const noDevice = !p.deviceId;
  // Máy chưa trả lời lệnh hỏi thông tin: chưa kiểm được phiên bản, không gửi (RK3).
  const unidentified = link.state === 'connected' && !!PROTOCOL.messages.query_info && link.identity?.kind !== 'known';
  const canSend = link.state === 'connected' && !!cfg && errors.length === 0 && !versionMismatch && !unidentified && !noDevice && !sending;

  const send = async () => {
    if (!cfg || !plan || !p.deviceId) return;
    setSending(true);
    try {
      const r = await link.send(cfg);
      setResult(r);
      recordDeviceLink({
        deviceId: p.deviceId!,
        patientId: p.id,
        planId: plan.id,
        planVersion: plan.version,
        transport: link.kind,
        result: r.kind,
        attempts: 'attempts' in r ? r.attempts : 0,
        code: r.kind === 'nacked' ? r.code : undefined,
        protocolVersion: PROTOCOL.protocolVersion,
        capsSource: link.capsSource,
      });
    } finally {
      setSending(false);
    }
  };

  const capsNote = link.capsSource === 'device' ? 'Năng lực đọc từ máy' : link.identity?.kind === 'no_reply' ? 'Máy không trả lời lệnh hỏi, dùng bảng dự phòng' : link.capsSource === 'table' ? 'Dùng bảng năng lực ghi sẵn' : 'Chưa có năng lực cho mẫu này';

  return (
    <Screen header={<Header back title="Nạp liệu trình xuống máy" subtitle={p.code} />}>
      {!PROTOCOL.confirmed && <Notice>Giao thức chưa được firmware xác nhận.</Notice>}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontWeight: '700', color: C.text, flex: 1 }}>{LINK_LABEL[link.state]}</Text>
          {link.kind === 'simulated' && <Chip label="Thiết bị giả lập" tone="amber" icon="flask-outline" />}
        </View>
        {link.detail ? <Muted>{link.detail}</Muted> : null}
        {link.state === 'connected' && (
          <>
            <InfoRow label="Giao thức của máy" value={idInfo ? `Phiên bản ${idInfo.protocolVersion}` : 'Không rõ'} />
            {idInfo && <InfoRow label="Firmware" value={idInfo.firmwareVersion} />}
            {idInfo && <InfoRow label="Mã mẫu" value={idInfo.model} />}
            <InfoRow label="Năng lực" value={capsNote} />
          </>
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {link.state === 'connected' ? (
            <Button label="Ngắt" variant="secondary" icon="close-circle-outline" onPress={link.disconnect} style={{ flex: 1 }} />
          ) : (
            <Button label="Kết nối" icon="link-outline" onPress={link.connect} loading={link.state === 'connecting'} style={{ flex: 1 }} />
          )}
        </View>
      </Card>
      {noDevice && <Notice tone="red">Hồ sơ chưa được giao máy. Bác sĩ phụ trách cần giao máy trên hồ sơ người bệnh trước khi nạp liệu trình.</Notice>}
      {unidentified && <Notice tone="red">Máy chưa trả lời lệnh hỏi thông tin nên chưa kiểm được phiên bản giao thức. Hãy ngắt rồi kết nối lại.</Notice>}
      {versionMismatch && idInfo && (
        <Notice tone="red">{`Máy dùng giao thức phiên bản ${idInfo.protocolVersion}, ứng dụng dùng phiên bản ${PROTOCOL.protocolVersion}, cần cập nhật ứng dụng hoặc firmware.`}</Notice>
      )}

      <SectionTitle>Đợt điều trị</SectionTitle>
      {courses.length === 0 ? (
        <Card>
          <Muted>Chưa có đợt điều trị được bác sĩ xác nhận.</Muted>
        </Card>
      ) : (
        <>
          {courses.length > 1 && (
            <Choices<string> value={chosen} onChange={setChosen} options={courses.map((c) => ({ value: c.wound.id, label: `${c.wound.code} · ${c.wound.location}` }))} />
          )}
          {!selected ? (
            <Muted>Chọn vết thương để xem cấu hình sẽ gửi.</Muted>
          ) : prepared && 'missing' in prepared ? (
            <Notice tone="red">{`Đợt điều trị còn thiếu ${prepared.missing.map((m) => MISSING_LABEL[m]).join(', ')}. Bác sĩ cần lưu phiên bản mới.`}</Notice>
          ) : (
            <Card>
              <Text style={{ fontWeight: '700', color: C.text }}>Cấu hình sẽ gửi</Text>
              {cfg && <InfoRow label="Chế độ" value={modeLabel(cfg.treatmentMode)} />}
              {wire
                ? Object.entries(wire).map(([k, v]) => <InfoRow key={k} label={k} value={String(v)} mono />)
                : errors.map((e) => (
                    <Text key={e} style={{ color: C.red }}>
                      {CONFIG_ERROR_LABEL[e]}
                    </Text>
                  ))}
            </Card>
          )}
        </>
      )}

      <Button label="Gửi cấu hình xuống máy" icon="arrow-down-circle-outline" onPress={send} disabled={!canSend} loading={sending} />
      {result && (
        <Notice tone={result.kind === 'acked' ? 'green' : 'red'} icon={result.kind === 'acked' ? 'checkmark-circle-outline' : 'alert-circle-outline'}>
          {sendResultLabel(result)}
        </Notice>
      )}
      {result && result.kind !== 'acked' && canSend && <Button label="Gửi lại" variant="secondary" icon="refresh-outline" onPress={send} />}
      {result?.kind === 'acked' && (
        <Button label="Theo dõi phiên điều trị" variant="secondary" icon="pulse-outline" onPress={() => router.push({ pathname: '/session-monitor', params: { patientId: p.id, woundId: selected?.wound.id } })} />
      )}
    </Screen>
  );
}
