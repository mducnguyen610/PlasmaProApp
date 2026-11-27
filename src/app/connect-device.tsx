import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { NoAccess, useCanView } from '@/components/Guard';
import { useConnectionLog } from '@/components/useConnectionLog';
import { Text } from '@/components/Text';
import { ClinicalContext } from '@/components/ClinicalContext';
import { PlanAckCard } from '@/components/PlanAckCard';
import { needsPatientAck } from '@/lib/planVersion';
import { DeviceOverviewRows, DeviceStatusBar, LinkDiagram } from '@/components/DeviceStatus';
import { Button, Card, Choices, Disclosure, Divider, Header, InfoRow, Muted, Notice, Screen, SectionTitle, StepRow, TextLink, type IconName } from '@/components/ui';
import { fmtDuration } from '@/lib/course';
import { modeLabel } from '@/lib/device/capabilities';
import { planToConfig, PROTOCOL } from '@/lib/device';
import { CONFIG_ERROR_LABEL, MISSING_LABEL, SESSION_LABEL, sendResultLabel } from '@/lib/device/labels';
import type { SendResult } from '@/lib/device/sender';
import { configCommandView, sendTreatmentConfigOnce } from '@/lib/device/configCommand';
import { checkTreatmentConfig } from '@/lib/device/treatmentConfig';
import { useDeviceLink } from '@/lib/device/useDeviceLink';
import { deviceStatusView } from '@/lib/deviceStatusView';
import { sessionDisplay } from '@/lib/sessionDisplay';
import { PATIENT_CONFIG_ERROR, PATIENT_MISSING_LABEL, PATIENT_UNIDENTIFIED, patientIncompatible, patientSendResultLabel } from '@/lib/patientDeviceText';
import { notify } from '@/lib/dialog';
import { useLookups, useStore } from '@/lib/store';
import { C, semantic } from '@/theme';
import { SEND_RESULT } from '@/theme.status';

/** Nạp liệu trình bác sĩ đã xác nhận xuống máy qua USB/UART (giai đoạn 1: thiết bị giả lập).
 *  Đợt 5 (PP-13): bệnh nhân thấy câu chữ theo bảng đã duyệt C30 đến C66 (DOT5_BANG_CAU_CHU.md); bác sĩ và quản trị viên giữ câu cũ. */
export default function ConnectDevice() {
  // 27/11/2026 (FR6, FR7): woundId, planId là vết và phiên bản bệnh nhân đã chọn ở lịch (mục lịch = mã phác đồ + ngày).
  const params = useLocalSearchParams<{ patientId?: string; woundId?: string; planId?: string; date?: string }>();
  const { me, recordDeviceLink, loadBlockerNow } = useStore();
  const { patient, woundsOf, coursePlan, device, wound } = useLookups();
  const p = patient(me?.role === 'patient' ? me.patientId : params.patientId);
  const canView = useCanView(p);
  const link = useDeviceLink();
  // Giai đoạn B (CN4 D4): ghi nhật ký kết nối, ngắt kết nối; chỉ đọc trạng thái đường truyền.
  useConnectionLog(link.state, link.kind);
  const [chosen, setChosen] = useState<string>(params.woundId ?? '');
  const [sending, setSending] = useState(false);
  // 27/11/2026 (T04): kết quả nạp gắn với đúng (vết, phiên bản, máy). Đổi vết, đổi phiên bản hoặc đổi máy thì kết quả cũ không hiện.
  // P0 DV-05: thời điểm nhận kết quả đi cùng kết quả, để "Máy đã nhận" luôn kèm mốc giờ.
  const [outcome, setOutcome] = useState<{ key: string; result: SendResult; at: string; linkId?: string } | null>(null);
  // Đồng hồ một giây chỉ để nhận ra bản tin STA đã cũ (cùng ngưỡng với T02); không gửi gì tới máy.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const courses = useMemo(
    () =>
      (p ? woundsOf(p.id) : [])
        .map((w) => ({ wound: w, plan: coursePlan(w.id, { patientView: true }) }))
        .filter((x) => x.plan && x.plan.status === 'active' && x.plan.confirmed)
        // Thứ tự hiển thị theo mã vết, không phải thứ tự ưu tiên điều trị.
        .sort((a, b) => a.wound.code.localeCompare(b.wound.code)),
    [p, woundsOf, coursePlan],
  );
  // Vào từ một mục lịch: giữ đúng vết đó, không thay bằng vết khác kể cả khi chỉ còn một vết đủ điều kiện.
  // Vào thẳng (tab Thiết bị): một vết thì chọn sẵn, nhiều vết thì bệnh nhân phải chọn rõ trước khi nạp.
  const fixedWound = params.woundId ? wound(params.woundId) : undefined;
  const selected = params.woundId ? courses.find((c) => c.wound.id === params.woundId) : courses.length === 1 ? courses[0] : courses.find((c) => c.wound.id === chosen);

  // Giai đoạn B (AU-03): chỉ bệnh nhân kết nối máy, nạp liệu trình và theo dõi phiên. Bác sĩ xem lịch sử phiên ở hồ sơ và thiết bị.
  if (!p || !canView || me?.role !== 'patient') return <NoAccess />;

  const plan = selected?.plan;
  // T02: bệnh nhân đã xem phiên bản khác phiên bản đang áp dụng (bác sĩ vừa ban hành phiên bản mới).
  const viewedOther = !!params.planId && !!plan && params.planId !== plan.id;
  const ctxKey = `${selected?.wound.id ?? ''}|${plan?.id ?? ''}|${p.deviceId ?? ''}`;
  const sendOutcome = outcome?.key === ctxKey ? outcome : null;
  const result = sendOutcome?.result ?? null;
  const resultAt = sendOutcome?.at ?? null;
  // Giai đoạn B (AU-04): phiên bản bệnh nhân chưa xác nhận đọc thì không dựng cấu hình, nút nạp bị khóa.
  const ackMissing = needsPatientAck(plan);
  const prepared = plan && !ackMissing ? planToConfig(plan, p, new Date()) : null;
  // Stage 9C: kiểm cấu hình và giá trị trên dây qua dịch vụ thiết bị, màn không gọi trực tiếp lớp giao thức.
  const { cfg, errors, wire } = checkTreatmentConfig(prepared, link.caps, PROTOCOL);
  const idInfo = link.identity?.kind === 'known' ? link.identity.info : null;
  const noDevice = !p.deviceId;
  const isPatient = me?.role === 'patient';
  // Stage 9C (gói C): điều kiện gửi, bước, vòng đời lệnh (gửi, máy nhận, máy chạy) tính ở dịch vụ thiết bị (configCommand.ts).
  const command = configCommandView({
    linkState: link.state, identity: link.identity, hasQueryInfo: !!PROTOCOL.messages.query_info, appProtocolVersion: PROTOCOL.protocolVersion,
    configReady: !!cfg && errors.length === 0, hasDevice: !noDevice, sending, result, resultAt,
    sessionState: link.lastStatus?.state ?? null, statusAt: link.lastStatusAt,
  });
  const { versionMismatch, unidentified, canSend } = command;

  const send = async () => {
    if (!cfg || !plan || !p.deviceId || !selected) return;
    // 27/11/2026 (FR7): kiểm lại trên dữ liệu mới nhất ngay trước khi gửi (bác sĩ có thể vừa ban hành phiên bản mới, thu hồi máy).
    const why = loadBlockerNow({ patientId: p.id, woundId: selected.wound.id, planId: plan.id, deviceId: p.deviceId });
    if (why) {
      notify('Chưa nạp liệu trình', why);
      return;
    }
    const key = ctxKey;
    setSending(true);
    try {
      let linkId: string | undefined;
      // Gửi một lần rồi ghi nhật ký (dịch vụ thiết bị). Lỗi ghi nhật ký không đổi kết quả máy trả lời, chỉ được báo thêm.
      const { result: r, at, logError } = await sendTreatmentConfigOnce({ send: link.send, record: async (log) => { linkId = (await recordDeviceLink(log)).id; } }, cfg, {
        deviceId: p.deviceId!,
        patientId: p.id,
        planId: plan.id,
        planVersion: plan.version,
        woundId: selected.wound.id,
        transport: link.kind,
        protocolVersion: PROTOCOL.protocolVersion,
        capsSource: link.capsSource,
      });
      setOutcome({ key, result: r, at, linkId });
      if (logError) notify('Chưa ghi được nhật ký nạp', logError instanceof Error ? logError.message : String(logError));
    } finally {
      setSending(false);
    }
  };

  // Bước hiện tại của luồng nạp (1 kết nối, 2 gửi, 3 theo dõi phiên), để người bệnh biết đang ở đâu.
  const step = command.step;
  // NAK mà gửi lại cũng vô ích (BAD_FIELDS, mã lạ): ẩn Gửi lại, đưa người bệnh sang báo sự cố.
  const noRetry = command.noRetry;

  const capsNote = link.capsSource === 'device' ? 'Năng lực đọc từ máy' : link.identity?.kind === 'no_reply' ? 'Máy không trả lời lệnh hỏi, dùng bảng dự phòng' : link.capsSource === 'table' ? 'Dùng bảng năng lực ghi sẵn' : 'Chưa có năng lực cho mẫu này';

  // Stage 7: thanh trạng thái và bảng tổng quan chỉ đọc dữ liệu đã có (đường truyền, INF, STA, kết quả gửi); không gửi lệnh nào.
  const deviceCode = p.deviceId ? device(p.deviceId)?.code ?? p.deviceId : null;
  const st = link.lastStatus;
  const shown = sessionDisplay({ linkState: link.state, state: st?.state ?? null, statusAt: link.lastStatusAt, now, staleAfterSec: STALE_AFTER_SEC });
  // Đủ điều kiện nạp: đúng điều kiện của nút nạp, bỏ cờ đang gửi.
  const readyToSend = command.readyToSend;
  const nakBusy = command.nakBusy;
  const status = deviceStatusView({ linkState: link.state, sessionState: st?.state ?? null, sessionView: shown.view, readyToSend, nakBusy, unidentified });
  const sessionText = !st ? 'Chưa nhận trạng thái' : shown.view === 'lost' || shown.view === 'stale' ? 'Không rõ' : SESSION_LABEL[st.state];
  const updatedAt = [link.lastStatusAt, resultAt].filter((x): x is string => !!x).sort().pop() ?? null;
  const readyText = link.state !== 'connected' ? 'Chưa, máy chưa kết nối' : readyToSend ? 'Có' : noDevice ? 'Chưa, hồ sơ chưa giao máy' : unidentified ? 'Chưa, máy chưa trả lời lệnh hỏi thông tin' : versionMismatch ? 'Chưa, khác phiên bản giao thức' : 'Chưa, đợt điều trị chưa sẵn sàng';
  const errorText = link.state === 'error' ? link.detail ?? 'Lỗi kết nối' : st?.state === 'error' && shown.view === 'live' ? 'Máy báo lỗi' : result && result.kind !== 'acked' && result.kind !== 'disconnected' ? (isPatient ? patientSendResultLabel(result) : sendResultLabel(result)) : null;
  const reasonText = ackMissing ? 'Hãy đọc và xác nhận phiên bản đợt điều trị trước khi nạp.' : link.state !== 'connected' ? 'Kết nối máy bằng cáp USB trước.' : !cfg || errors.length > 0 ? (isPatient ? 'Đợt điều trị chưa sẵn sàng. Xem thông báo ở trên.' : 'Đợt điều trị chưa sẵn sàng, xem thông báo ở trên.') : isPatient ? 'Máy chưa sẵn sàng nhận liệu trình. Xem thông báo ở trên.' : 'Máy chưa sẵn sàng nhận liệu trình, xem thông báo ở trên.';
  const openMonitor = () => router.push({ pathname: '/session-monitor', params: { patientId: p.id, ...(selected ? { woundId: selected.wound.id } : {}), ...(sendOutcome?.linkId ? { linkId: sendOutcome.linkId } : {}) } });

  // Thông báo trạng thái gửi đi cùng nút trong chân màn (GĐ-9): bấm nạp là thấy phản hồi ngay, không phải cuộn.
  const sendNotices = (
    <>
      {/* P0 DV-04: phân biệt đang gửi với máy đã nhận; chỉ báo thành công khi có ACK. */}
      {sending && <Notice tone={semantic.info.tone} icon="hourglass-outline">Đang gửi liệu trình, chờ máy xác nhận…</Notice>}
      {result && !sending && (
        <Notice tone={semantic[SEND_RESULT[result.kind].role].tone} icon={SEND_RESULT[result.kind].icon as IconName}>
          {`${isPatient ? patientSendResultLabel(result) : sendResultLabel(result)}${resultAt ? ` (lúc ${new Date(resultAt).toLocaleTimeString('vi-VN')})` : ''}`}
        </Notice>
      )}
      {result?.kind === 'acked' && !sending && link.state !== 'connected' && (
        <Notice tone={semantic.warning.tone} icon="unlink-outline">Đã mất kết nối sau khi máy nhận. Cắm lại cáp và kết nối trước khi theo dõi phiên.</Notice>
      )}
    </>
  );

  // Một nút chính mỗi bước (V04), đặt ở chân màn: bước 1 "Kết nối", bước 2 "Nạp liệu trình vào máy", bước 3 "Theo dõi phiên điều trị".
  // Điều kiện bật, tắt và hàm gọi giữ nguyên bản trước Stage 7. Không tự chuyển sang T02 (QĐ-6).
  const footer = (
    <View style={{ gap: 8 }}>
      {sendNotices}
      {link.state !== 'connected' ? (
        <>
          {link.state === 'error' && <Notice tone={semantic.danger.tone} icon="alert-circle-outline">{isPatient ? 'Chưa kết nối được máy. Kiểm tra máy đã bật và cáp đã cắm chặt, rồi bấm Kết nối.' : 'Không mở được kết nối. Kiểm tra máy đã bật, cáp đã cắm, rồi bấm Kết nối.'}</Notice>}
          <Button key="ket-noi" label="Kết nối" icon="link-outline" onPress={link.connect} loading={link.state === 'connecting'} />
          {result?.kind === 'acked' && <Button key="theo-doi-phu" label="Theo dõi phiên điều trị" variant="secondary" icon="pulse-outline" onPress={openMonitor} />}
        </>
      ) : result?.kind === 'acked' ? (
        <Button key="theo-doi" label="Theo dõi phiên điều trị" icon="pulse-outline" onPress={openMonitor} armAfterMs={ARM_AFTER_MS} />
      ) : (
        <>
          {/* Stage 8 (S8-B01): nút nạp hiện đúng chỗ nút Kết nối vừa bấm; chạm lần hai vào chỗ cũ không được gửi liệu trình. */}
          <Button key="nap" label="Nạp liệu trình vào máy" icon="arrow-down-circle-outline" onPress={send} disabled={!canSend} loading={sending} reason={reasonText} armAfterMs={ARM_AFTER_MS} />
          {result && canSend && !noRetry && <Button label="Gửi lại" variant="secondary" icon="refresh-outline" onPress={send} />}
        </>
      )}
      {noRetry && isPatient && <Button label="Báo sự cố cho bác sĩ" variant="secondary" icon="chatbubble-ellipses-outline" onPress={() => router.push({ pathname: '/report', params: { kind: 'device' } })} />}
    </View>
  );

  const courseCard = courses.length === 0 ? (
    <Card>
      <Muted>{isPatient ? 'Bác sĩ chưa xác nhận đợt điều trị nào cho bạn.' : 'Chưa có đợt điều trị được bác sĩ xác nhận.'}</Muted>
    </Card>
  ) : (
    <>
      {courses.length > 1 && !params.woundId && (
        <Choices<string> value={chosen} onChange={setChosen} options={courses.map((c) => ({ value: c.wound.id, label: `${c.wound.code}: ${c.wound.location}` }))} />
      )}
      {viewedOther && plan && (
        <Notice tone="amber" icon="document-text-outline">{`Bác sĩ đã áp dụng phiên bản ${plan.version} thay cho phiên bản bạn đã xem. Liệu trình nạp xuống máy là phiên bản ${plan.version}.`}</Notice>
      )}
      {!selected ? (
        params.woundId
          ? <Notice tone="amber">{`Vết thương ${fixedWound?.code ?? ''} hiện không có đợt điều trị đang áp dụng nên chưa nạp được. Hãy xem Lịch trình hoặc báo bác sĩ.`}</Notice>
          : <Muted>{isPatient ? 'Có nhiều vết thương đang điều trị. Chọn vết thương để xem liệu trình sẽ nạp.' : 'Chọn vết thương để xem cấu hình sẽ gửi.'}</Muted>
      ) : ackMissing && plan ? (
        <Card><PlanAckCard plan={plan} wound={selected.wound} /></Card>
      ) : prepared && 'missing' in prepared ? (
        <Notice tone="red">{isPatient
          ? `Đợt điều trị còn thiếu ${prepared.missing.map((m) => PATIENT_MISSING_LABEL[m]).join(', ')}. Bác sĩ cần cập nhật đợt điều trị. Hãy báo bác sĩ.`
          : `Đợt điều trị còn thiếu ${prepared.missing.map((m) => MISSING_LABEL[m]).join(', ')}. Bác sĩ cần lưu phiên bản mới.`}</Notice>
      ) : (
        <Card>
          <Text style={{ fontWeight: '700', color: C.text }}>Liệu trình sẽ nạp xuống máy</Text>
          {selected && <InfoRow label="Vết thương" value={`${selected.wound.code}: ${selected.wound.location}`} />}
          {/* Cùng tên và thứ tự nhãn với DoseRows (B05, N03, N06) để một thông số chỉ có một tên (A10). */}
          {cfg && <InfoRow label="Mức năng lượng" value={`Mức ${cfg.energyLevel}`} />}
          {cfg && <InfoRow label="Chế độ điều trị" value={modeLabel(cfg.treatmentMode)} />}
          {cfg && <InfoRow label="Thời gian mỗi lần điều trị" value={fmtDuration(cfg.minTreatmentTimeSec)} />}
          {plan && <InfoRow label="Đợt điều trị" value={isPatient ? `Bác sĩ đã xác nhận (phiên bản ${plan.version})` : `Phiên bản ${plan.version}, bác sĩ đã xác nhận`} />}
          {/* Bệnh nhân vẫn xem được, nhưng tiêu đề bằng lời thường; mã trường CFG chỉ nằm bên trong phần thu gọn (A12). */}
          {wire ? (
            <Disclosure title={isPatient ? 'Dữ liệu gửi xuống máy' : 'Chi tiết kỹ thuật'} summary={isPatient ? 'Chỉ cần khi kỹ thuật viên hỏi' : 'Các trường gói CFG gửi qua USB/UART'} icon="code-slash-outline">
              {Object.entries(wire).map(([k, v]) => <InfoRow key={k} label={k} value={String(v)} mono />)}
            </Disclosure>
          ) : (
            errors.map((e) => (
              <Text key={e} style={{ color: C.red }}>
                {isPatient ? PATIENT_CONFIG_ERROR[e] : CONFIG_ERROR_LABEL[e]}
              </Text>
            ))
          )}
        </Card>
      )}
    </>
  );

  return (
    <Screen
      header={
        <Header back title="Nạp liệu trình">
          <DeviceStatusBar status={status} deviceCode={deviceCode} linkState={link.state} simulated={link.kind === 'simulated'} sessionText={sessionText} updatedAt={updatedAt} />
        </Header>
      }
      footer={footer}>
      {/* P0 G1: bệnh nhân và vết thương của liệu trình sắp nạp. */}
      <ClinicalContext patient={p} wound={selected?.wound ?? null} />
      <StepRow steps={isPatient ? PATIENT_STEPS : STEPS} step={step} />
      {!PROTOCOL.confirmed && !isPatient && <Notice>Giao thức chưa được firmware xác nhận.</Notice>}

      {/* Tổng quan thiết bị. Bước 1 (kết nối) là tác vụ riêng: chỉ hiện máy, cáp và hướng dẫn kết nối; liệu trình hiện từ bước 2. */}
      <Card>
        <SectionTitle icon="hardware-chip-outline">{step === 1 ? 'Kết nối máy' : 'Thiết bị'}</SectionTitle>
        {/* Stage 9A: sơ đồ nối máy chỉ ở bước 1 (tác vụ kết nối); từ bước 2 bỏ để "Bước tiếp theo" vẫn nằm trên chân màn ở 320 px (D8-03b). */}
        {step === 1 && (
          <>
            <LinkDiagram linkState={link.state} deviceCode={deviceCode} />
            <Divider />
          </>
        )}
        <DeviceOverviewRows deviceCode={deviceCode} linkState={link.state} readyText={readyText} sessionText={sessionText} errorText={errorText} updatedAt={updatedAt} />
        {link.detail ? <Muted>{link.detail}</Muted> : null}
        {link.state === 'connected' && !isPatient && (
          <>
            <InfoRow label="Giao thức của máy" value={idInfo ? `Phiên bản ${idInfo.protocolVersion}` : 'Không rõ'} />
            {idInfo && <InfoRow label="Firmware" value={idInfo.firmwareVersion} />}
            {idInfo && <InfoRow label="Mã mẫu" value={idInfo.model} />}
            <InfoRow label="Năng lực" value={capsNote} />
          </>
        )}
        {link.state !== 'connected' && (
          <Muted>{isPatient ? 'Bật máy, cắm cáp USB từ máy vào điện thoại, rồi bấm "Kết nối" ở cuối màn.' : 'Bật máy, cắm cáp USB vào điện thoại, rồi bấm "Kết nối" ở cuối màn.'}</Muted>
        )}
        {/* Ngắt kết nối là thao tác phụ, đặt trong thẻ thiết bị, tách khỏi nút chính ở chân màn để tránh bấm nhầm. */}
        {link.state === 'connected' && (
          <Button label={isPatient ? 'Ngắt kết nối' : 'Ngắt'} variant="secondary" icon="close-circle-outline" onPress={link.disconnect} />
        )}
      </Card>
      {noDevice && <Notice tone="red">{isPatient ? 'Hồ sơ của bạn chưa có máy. Bác sĩ phụ trách cần giao máy cho bạn trước.' : 'Hồ sơ chưa được giao máy. Bác sĩ phụ trách cần giao máy trên hồ sơ bệnh nhân trước khi nạp liệu trình.'}</Notice>}
      {unidentified && <Notice tone="red">{isPatient ? PATIENT_UNIDENTIFIED : 'Máy chưa trả lời lệnh hỏi thông tin nên chưa kiểm được phiên bản giao thức. Hãy ngắt rồi kết nối lại.'}</Notice>}
      {versionMismatch && idInfo && (
        <Notice tone="red">{isPatient ? patientIncompatible(idInfo.protocolVersion, PROTOCOL.protocolVersion) : `Máy dùng giao thức phiên bản ${idInfo.protocolVersion}, ứng dụng dùng phiên bản ${PROTOCOL.protocolVersion}, cần cập nhật ứng dụng hoặc firmware.`}</Notice>
      )}

      {result?.kind === 'acked' && (
        <>
          {/* UX-03 (Đợt 8): phiên chỉ được ghi khi màn Theo dõi đang mở (session-monitor.tsx), nên nói thứ tự hai thao tác ngay tại đây. */}
          <Card hero>
            <Text style={{ fontWeight: '700', color: C.text }}>Bước tiếp theo</Text>
            <Text style={{ color: C.text }}>{isPatient ? '1. Chạm "Theo dõi phiên điều trị".\n2. Sau đó mới bấm nút bắt đầu trên máy.' : '1. Mở "Theo dõi phiên điều trị".\n2. Sau đó mới bắt đầu phiên trên máy.'}</Text>
            <Muted>{isPatient ? 'Buổi điều trị chỉ được ghi lại khi màn theo dõi đang mở.' : 'Phiên chỉ được ghi vào nhật ký khi màn theo dõi đang mở.'}</Muted>
          </Card>
          {canSend && <View style={{ alignItems: 'center' }}><TextLink label="Nạp lại liệu trình" onPress={send} /></View>}
        </>
      )}

      {step >= 2 && (
        <>
          <SectionTitle>Đợt điều trị</SectionTitle>
          {courseCard}
        </>
      )}
    </Screen>
  );
}

/** Cùng ngưỡng hiển thị với T02 (session-monitor.tsx). */
const STALE_AFTER_SEC = 5;
// Stage 8 (S8-B01, S8-B02): nút ở chân màn đổi chỗ cho nhau sau Kết nối và sau ACK. Lần chạm trong 800 ms đầu bị bỏ qua để chạm đúp
// không gửi liệu trình hay mở T02 ngoài ý muốn. 800 ms: gấp hơn hai lần ngưỡng chạm đúp mặc định 300 ms của Android; đề xuất, chưa thử người dùng.
const ARM_AFTER_MS = 800;
const STEPS = ['Kết nối máy', 'Nạp liệu trình', 'Điều trị'];
/** Bệnh nhân: "điều trị" thay "chiếu" (duyệt 12/11/2026, C40). */
const PATIENT_STEPS = ['Kết nối máy', 'Nạp liệu trình', 'Điều trị'];
