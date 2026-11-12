import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { NoAccess, useCanView } from '@/components/Guard';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Choices, Disclosure, Header, InfoRow, Muted, Notice, Screen, SectionTitle, StepRow, TextLink, type IconName } from '@/components/ui';
import { fmtDuration } from '@/lib/course';
import { modeLabel } from '@/lib/device/capabilities';
import { planToConfig, PROTOCOL } from '@/lib/device';
import { CONFIG_ERROR_LABEL, LINK_LABEL, MISSING_LABEL, nakHint, sendResultLabel } from '@/lib/device/labels';
import { configToWire, validateConfig } from '@/lib/device/protocol';
import type { SendResult } from '@/lib/device/sender';
import { useDeviceLink } from '@/lib/device/useDeviceLink';
import { useLookups, useStore } from '@/lib/store';
import { C, semantic } from '@/theme';
import { SEND_RESULT } from '@/theme.status';

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
  const isPatient = me?.role === 'patient';
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

  // Bước hiện tại của luồng nạp (1 kết nối, 2 gửi, 3 theo dõi phiên), để người bệnh biết đang ở đâu.
  const step = result?.kind === 'acked' ? 3 : link.state === 'connected' ? 2 : 1;
  // NAK mà gửi lại cũng vô ích (BAD_FIELDS, mã lạ): ẩn Gửi lại, đưa người bệnh sang báo sự cố.
  const noRetry = result?.kind === 'nacked' && !nakHint(result.code).retry;
  const lostAfterSend = !!result && result.kind !== 'acked' && link.state !== 'connected';

  const capsNote = link.capsSource === 'device' ? 'Năng lực đọc từ máy' : link.identity?.kind === 'no_reply' ? 'Máy không trả lời lệnh hỏi, dùng bảng dự phòng' : link.capsSource === 'table' ? 'Dùng bảng năng lực ghi sẵn' : 'Chưa có năng lực cho mẫu này';

  return (
    <Screen header={<Header back title="Nạp liệu trình" subtitle={p.code} />}>
      <StepRow steps={STEPS} step={step} />
      {!PROTOCOL.confirmed && !isPatient && <Notice>Giao thức chưa được firmware xác nhận.</Notice>}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontWeight: '700', color: C.text, flex: 1 }}>{LINK_LABEL[link.state]}</Text>
          {link.kind === 'simulated' && <Chip label="Thiết bị giả lập" tone="amber" icon="flask-outline" />}
        </View>
        {link.detail ? <Muted>{link.detail}</Muted> : null}
        {link.state === 'connected' && !isPatient && (
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
      {noDevice && <Notice tone="red">Hồ sơ chưa được giao máy. Bác sĩ phụ trách cần giao máy trên hồ sơ bệnh nhân trước khi nạp liệu trình.</Notice>}
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
            <Choices<string> value={chosen} onChange={setChosen} options={courses.map((c) => ({ value: c.wound.id, label: `${c.wound.code}: ${c.wound.location}` }))} />
          )}
          {!selected ? (
            <Muted>Chọn vết thương để xem cấu hình sẽ gửi.</Muted>
          ) : prepared && 'missing' in prepared ? (
            <Notice tone="red">{`Đợt điều trị còn thiếu ${prepared.missing.map((m) => MISSING_LABEL[m]).join(', ')}. Bác sĩ cần lưu phiên bản mới.`}</Notice>
          ) : (
            <Card>
              <Text style={{ fontWeight: '700', color: C.text }}>Liệu trình sẽ nạp xuống máy</Text>
              {selected && <InfoRow label="Vết thương" value={`${selected.wound.code}: ${selected.wound.location}`} />}
              {cfg && <InfoRow label="Chế độ" value={modeLabel(cfg.treatmentMode)} />}
              {cfg && <InfoRow label="Mức năng lượng" value={`Mức ${cfg.energyLevel}`} />}
              {cfg && <InfoRow label="Thời gian chiếu" value={fmtDuration(cfg.minTreatmentTimeSec)} />}
              {plan && <InfoRow label="Đợt điều trị" value={`Phiên bản ${plan.version}, bác sĩ đã xác nhận`} />}
              {wire ? (
                <Disclosure title="Chi tiết kỹ thuật" summary="Các trường gói CFG gửi qua USB/UART" icon="code-slash-outline">
                  {Object.entries(wire).map(([k, v]) => <InfoRow key={k} label={k} value={String(v)} mono />)}
                </Disclosure>
              ) : (
                errors.map((e) => (
                  <Text key={e} style={{ color: C.red }}>
                    {CONFIG_ERROR_LABEL[e]}
                  </Text>
                ))
              )}
            </Card>
          )}
        </>
      )}

      {/* Một nút chính mỗi bước (V04): trước khi máy nhận là "Nạp liệu trình vào máy"; sau ACK là "Theo dõi phiên điều trị",
          còn nạp lại thành liên kết chữ. */}
      {result?.kind !== 'acked' && (
        <Button label="Nạp liệu trình vào máy" icon="arrow-down-circle-outline" onPress={send} disabled={!canSend} loading={sending}
          reason={link.state !== 'connected' ? 'Kết nối máy bằng cáp USB trước.' : !cfg || errors.length > 0 ? 'Đợt điều trị chưa sẵn sàng, xem thông báo ở trên.' : 'Máy chưa sẵn sàng nhận liệu trình, xem thông báo ở trên.'} />
      )}
      {result && (
        <Notice tone={semantic[SEND_RESULT[result.kind].role].tone} icon={SEND_RESULT[result.kind].icon as IconName}>
          {sendResultLabel(result)}
        </Notice>
      )}
      {result && result.kind !== 'acked' && canSend && !noRetry && <Button label="Gửi lại" variant="secondary" icon="refresh-outline" onPress={send} />}
      {lostAfterSend && <Button label="Kết nối lại" variant="secondary" icon="link-outline" onPress={link.connect} loading={link.state === 'connecting'} />}
      {noRetry && isPatient && <Button label="Báo sự cố cho bác sĩ" variant="secondary" icon="chatbubble-ellipses-outline" onPress={() => router.push({ pathname: '/report', params: { kind: 'device' } })} />}
      {result?.kind === 'acked' && (
        <>
          <Button label="Theo dõi phiên điều trị" icon="pulse-outline" onPress={() => router.push({ pathname: '/session-monitor', params: { patientId: p.id, woundId: selected?.wound.id } })} />
          {canSend && <View style={{ alignItems: 'center' }}><TextLink label="Nạp lại liệu trình" onPress={send} /></View>}
        </>
      )}
    </Screen>
  );
}

const STEPS = ['Kết nối máy', 'Nạp liệu trình', 'Chiếu'];
