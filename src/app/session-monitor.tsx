import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';

import { NoAccess, useCanView } from '@/components/Guard';
import { Text } from '@/components/Text';
import { ClinicalContext } from '@/components/ClinicalContext';
import { DeviceStatusBar } from '@/components/DeviceStatus';
import { Button, Card, Header, InfoRow, Muted, Notice, Screen, SectionTitle } from '@/components/ui';
import { fmtDuration } from '@/lib/course';
import { modeLabel } from '@/lib/device/capabilities';
import { fmtRemaining, SESSION_LABEL } from '@/lib/device/labels';
import { useDeviceLink } from '@/lib/device/useDeviceLink';
import { deviceStatusView } from '@/lib/deviceStatusView';
import { fmtDateTime } from '@/lib/format';
import { sessionDisplay } from '@/lib/sessionDisplay';
import { useLookups, useStore } from '@/lib/store';
import { C, semantic, typeScale } from '@/theme';

/**
 * Theo dõi phiên điều trị qua bản tin trạng thái máy phát mỗi giây.
 * Khi thấy STA chuyển từ running sang done, stopped hoặc error, ghi một phiên vào nhật ký (FR4), để tổng quan bác sĩ thấy "Đã chiếu" (FR10).
 * Phiên chỉ được ghi khi màn này đang mở; mất kết nối giữa phiên thì không ghi.
 */
const STALE_AFTER_SEC = 5;

export default function SessionMonitor() {
  const params = useLocalSearchParams<{ patientId?: string; woundId?: string }>();
  const { data, me, recordDeviceSession } = useStore();
  const { patient, wound, device, coursePlan } = useLookups();
  const p = patient(me?.role === 'patient' ? me.patientId : params.patientId);
  const canView = useCanView(p);
  // kind: 'done' buổi đủ thời gian, 'interrupted' buổi dừng giữa chừng hoặc lỗi, 'fail' chưa ghi được (V03: mỗi sự kiện một thông báo).
  const [saved, setSaved] = useState<{ kind: 'done' | 'interrupted' | 'fail'; text: string; startedAt?: string } | null>(null);
  const link = useDeviceLink({
    onSessionEnd: async (done) => {
      if (!p) return;
      try {
        const ok = await recordDeviceSession({ patientId: p.id, woundId: params.woundId, startedAt: done.startedAt.toISOString(), durationSec: done.durationSec, outcome: done.outcome });
        setSaved(ok
          ? done.outcome === 'done'
            ? { kind: 'done', text: `Đã ghi phiên điều trị ${Math.round(done.durationSec / 6) / 10} phút vào nhật ký.`, startedAt: done.startedAt.toISOString() }
            : { kind: 'interrupted', text: 'Đã ghi vào nhật ký là phiên bị gián đoạn.' }
          : { kind: 'fail', text: 'Hồ sơ chưa được giao máy nên phiên chưa được ghi. Bác sĩ cần giao máy trên hồ sơ bệnh nhân.' });
      } catch (e) {
        setSaved({ kind: 'fail', text: e instanceof Error ? e.message : String(e) });
      }
    },
  });

  // Đồng hồ một giây để phát hiện bản tin STA ngừng đến (P5).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // Stage 7, khôi phục phiên: quay lại từ nền thì tính lại ngay độ cũ của bản tin, không chờ nhịp kế tiếp.
  // Chỉ cập nhật hiển thị; không gửi lại lệnh, không tự bắt đầu phiên.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') setNow(Date.now()); });
    return () => sub.remove();
  }, []);

  // UX-03 (Đợt 8): khi máy đang điều trị, rời màn này (nút quay lại, cử chỉ, phím quay lại) thì phiên sẽ không được ghi.
  // Chỉ hỏi lại, không đổi cách ghi phiên, không chặn nút Dừng điều trị. Hết "Đang điều trị" thì không hỏi nữa.
  const running = link.lastStatus?.state === 'running';
  // Người dùng đã chọn "Vẫn rời màn": tắt chặn để không hỏi lại lần nữa (tránh vòng lặp xác nhận).
  const [leaving, setLeaving] = useState(false);
  // Stage 7 (an toàn): hỏi lại ngay trong chân màn thay cho hộp thoại, để không có hộp thoại nào che nút Dừng điều trị.
  // Nội dung câu hỏi và hai lựa chọn giữ như Đợt 8; chọn "Vẫn rời màn" thì rời đúng một lần.
  const [leaveAsk, setLeaveAsk] = useState(false);
  const repeatRef = useRef<(() => void) | null>(null);
  usePreventRemove(running && !leaving, ({ repeat }) => {
    repeatRef.current = repeat;
    setLeaveAsk(true);
  });
  // Chọn "Vẫn rời màn": đợi lần vẽ đã tắt chặn rồi mới cho rời, để không bị hỏi lần hai.
  useEffect(() => {
    if (!leaving || !repeatRef.current) return;
    const r = repeatRef.current;
    repeatRef.current = null;
    r();
  }, [leaving]);
  // Yêu cầu dừng: ghi thời điểm bấm để phân biệt "đã gửi yêu cầu" với "máy đã xác nhận dừng". Không đổi cách dừng.
  const [stopAt, setStopAt] = useState<number | null>(null);

  if (!p || !canView) return <NoAccess />;

  const isPatient = me?.role === 'patient';
  const justRecorded = saved?.startedAt ? data.sessions.find((s) => s.start === saved.startedAt && s.deviceId === p.deviceId) : undefined;
  const st = link.lastStatus;
  const lost = link.state === 'disconnected' || link.state === 'error';
  // Ngưỡng 5 s là đề xuất ở wireframe T02 (P5), chưa có nguồn; ICD hiện quy định máy gửi STA mỗi giây.
  // P0 DV-01: mất kết nối hoặc quá ngưỡng thì không trình bày bản tin cũ như trạng thái hiện tại.
  const shown = sessionDisplay({ linkState: link.state, state: st?.state ?? null, statusAt: link.lastStatusAt, now, staleAfterSec: STALE_AFTER_SEC });
  const staleSec = shown.ageSec ?? 0;
  const stale = shown.view === 'stale';
  const unknownNow = shown.view === 'stale' || shown.view === 'lost';
  const w = wound(params.woundId);
  const linkLost = link.state !== 'connected';
  const deviceCode = p.deviceId ? device(p.deviceId)?.code ?? p.deviceId : null;
  const status = deviceStatusView({ linkState: link.state, sessionState: st?.state ?? null, sessionView: shown.view, readyToSend: null });
  const sessionText = !st ? 'Chưa nhận trạng thái' : unknownNow ? 'Không rõ' : SESSION_LABEL[st.state];
  // Liệu trình của đợt (bác sĩ đã xác nhận), chỉ để đọc; máy không gửi lại thông số nên không ghi là "máy đang chạy".
  const plan = w && w.patientId === p.id ? coursePlan(w.id, isPatient ? { patientView: true } : undefined) : undefined;
  const canStop = !!link.startSession && !!link.stopSession && link.state === 'connected' && st?.state === 'running';
  const canStart = !!link.startSession && !!link.stopSession && link.state === 'connected' && st?.state !== 'running';
  // Xác nhận dừng: chỉ khi máy gửi bản tin kết thúc SAU lúc bấm (P0 DV-01: không báo đã dừng trước khi máy xác nhận).
  const stopConfirmed = stopAt !== null && !!st && (st.state === 'stopped' || st.state === 'done' || st.state === 'error') && !!link.lastStatusAt && new Date(link.lastStatusAt).getTime() >= stopAt;
  const stopWaitSec = stopAt !== null && !stopConfirmed ? Math.max(0, Math.floor((now - stopAt) / 1000)) : null;
  const requestStop = () => {
    setStopAt(Date.now());
    link.stopSession?.();
  };
  const requestStart = () => {
    setStopAt(null);
    link.startSession?.();
  };
  const askOpen = leaveAsk && running && !leaving;

  // Chân màn cố định: nút Dừng điều trị luôn ở đây khi máy đang điều trị, không phải cuộn, không bị hộp thoại che.
  // Nút Bắt đầu (giả lập) nằm trong thân màn, khác chỗ nút Dừng, để bấm hai lần vào Dừng không bắt đầu phiên mới.
  const footer = (
    <View style={{ gap: 8 }}>
      {askOpen && (
        <View testID="leave-ask" accessibilityRole="alert" style={{ gap: 8, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: C.amber, backgroundColor: C.amberSoft }}>
          <Text style={{ fontWeight: '700', color: C.text }}>Rời màn theo dõi?</Text>
          <Text style={{ color: C.text }}>{linkLost
            ? 'Đã mất kết nối với máy nên không biết máy còn đang điều trị hay không. Phiên này sẽ không được ghi vào nhật ký.'
            : isPatient
            ? 'Máy vẫn đang điều trị. Nếu rời màn này, buổi điều trị hôm nay sẽ không được ghi lại và bác sĩ sẽ thấy là bỏ lỡ.'
            : 'Phiên đang chạy. Nếu rời màn này, phiên sẽ không được ghi vào nhật ký.'}</Text>
          <Muted>Rời màn không dừng máy.</Muted>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Ở lại màn theo dõi" variant="secondary" onPress={() => setLeaveAsk(false)} style={{ flex: 1 }} />
            <Button label="Vẫn rời màn" variant="ghost" onPress={() => { setLeaveAsk(false); setLeaving(true); }} style={{ flex: 1 }} />
          </View>
        </View>
      )}
      {canStop ? (
        <Button label="Dừng điều trị" variant="dangerSolid" icon="stop-circle-outline" onPress={requestStop} />
      ) : running ? (
        // Không có lệnh dừng qua cáp trong giao thức hiện tại (chỉ giả lập có): nói rõ, không tự tạo cơ chế thay thế.
        <Notice tone={semantic.danger.tone} icon="hand-left-outline">{linkLost
          ? 'Mất kết nối nên ứng dụng không gửi được yêu cầu dừng. Muốn dừng ngay, dùng nút dừng trên máy.'
          : 'Ứng dụng chưa có lệnh dừng máy qua cáp USB. Muốn dừng, dùng nút dừng trên máy.'}</Notice>
      ) : null}
      {linkLost && <Button label="Kết nối" icon="link-outline" onPress={link.connect} loading={link.state === 'connecting'} variant={running ? 'secondary' : 'primary'} />}
      {!running && !linkLost && st?.state === 'done' && isPatient && (
        // Đợt 11 (UX-19): mở thẳng biểu mẫu ghi cảm giác của phiên vừa ghi; không tìm được phiên thì mở Lịch trình như trước.
        <Button label="Ghi cảm giác sau khi điều trị" icon="create-outline" onPress={() => router.push(justRecorded ? { pathname: '/schedule', params: { sessionId: justRecorded.sessionId } } : '/schedule')} />
      )}
      {!running && st?.state === 'stopped' && isPatient && <Button label="Báo triệu chứng" variant="secondary" icon="chatbubble-ellipses-outline" onPress={() => router.push('/report')} />}
      {!running && st?.state === 'error' && isPatient && <Button label="Báo sự cố thiết bị" variant="secondary" icon="construct-outline" onPress={() => router.push({ pathname: '/report', params: { kind: 'device' } })} />}
      {/* Phản hồi yêu cầu dừng đặt cuối chân màn: nút Dừng biến mất khi máy xác nhận, chỗ đó thành dòng thông báo,
          nên bấm thêm một lần vào chỗ cũ không mở màn khác hay bắt đầu phiên mới. */}
      {stopWaitSec !== null && (
        stopWaitSec <= STALE_AFTER_SEC
          ? <Notice tone={semantic.info.tone} icon="hourglass-outline">Đã gửi yêu cầu dừng. Đang chờ máy xác nhận…</Notice>
          : <Notice tone={semantic.danger.tone} icon="alert-circle-outline">{`Chưa nhận xác nhận dừng từ máy sau ${stopWaitSec} giây. Chưa coi là đã dừng. Kiểm tra máy trực tiếp.`}</Notice>
      )}
      {stopConfirmed && st && <Notice tone={semantic[st.state === 'error' ? 'danger' : st.state === 'done' ? 'success' : 'warning'].tone} icon="checkmark-done-outline">{`Máy đã xác nhận: ${SESSION_LABEL[st.state]}${link.lastStatusAt ? ` (lúc ${new Date(link.lastStatusAt).toLocaleTimeString('vi-VN')})` : ''}.`}</Notice>}
    </View>
  );

  return (
    <Screen
      header={
        <Header back title="Theo dõi phiên điều trị">
          <DeviceStatusBar status={status} deviceCode={deviceCode} linkState={link.state} simulated={link.kind === 'simulated'} sessionText={sessionText} updatedAt={link.lastStatusAt} />
        </Header>
      }
      footer={footer}>
      {/* P0 G1 (ID-07): phiên được ghi theo vết thương này. */}
      <ClinicalContext patient={p} wound={w && w.patientId === p.id ? w : null} />
      {lost && shown.view === 'lost' && <Notice tone="red">{st?.state === 'running' ? 'Mất kết nối với máy trong lúc phiên đang chạy. Hãy cắm lại cáp.' : 'Mất kết nối với máy. Hãy cắm lại cáp.'}</Notice>}
      {stale && <Notice>{`Chưa nhận trạng thái từ máy ${staleSec} giây. Kiểm tra cáp còn cắm chặt.`}</Notice>}
      <Card hero>
        {st && unknownNow ? (
          // P0 DV-01: không đếm ngược theo bản tin cũ, không giả định máy đã dừng hay vẫn chạy.
          <View testID="session-unknown" accessible accessibilityLabel={`Không rõ trạng thái hiện tại của máy. Trạng thái cuối nhận được: ${SESSION_LABEL[st.state]}${st.remainingSec != null ? `, còn ${fmtRemaining(st.remainingSec)}` : ''}`} style={{ alignItems: 'center', gap: 6, paddingVertical: 12 }}>
            <Ionicons name="help-circle-outline" size={36} color={C.amber} />
            <Text style={{ fontSize: typeScale.sectionTitle.size, fontWeight: '700', color: C.text, textAlign: 'center' }}>Không rõ trạng thái hiện tại của máy</Text>
            <Text style={{ color: C.textSoft, textAlign: 'center' }}>{`Trạng thái cuối nhận được: ${SESSION_LABEL[st.state]}${st.remainingSec != null ? `, còn ${fmtRemaining(st.remainingSec)}` : ''}${link.lastStatusAt ? ` lúc ${new Date(link.lastStatusAt).toLocaleTimeString('vi-VN')}` : ''}. Số này không còn cập nhật.`}</Text>
          </View>
        ) : st && st.state !== 'stopped' && st.state !== 'error' && st.remainingSec != null ? (
          <View accessible accessibilityLabel={`${SESSION_LABEL[st.state]}, còn ${fmtRemaining(st.remainingSec)}`} style={{ alignItems: 'center', gap: 2, paddingVertical: 8 }}>
            <Text style={{ fontSize: typeScale.timer.size, fontWeight: typeScale.timer.weight, color: st.state === 'running' ? C.primary : C.text, fontVariant: ['tabular-nums'] }}>{fmtRemaining(st.remainingSec)}</Text>
            <Text style={{ color: C.textSoft }}>{`${SESSION_LABEL[st.state]}, còn lại`}</Text>
          </View>
        ) : (
          // Chưa nhận STA, hoặc phiên đã dừng, lỗi: không hiện số giây cũ dễ gây hiểu nhầm.
          <View accessible accessibilityLabel={st ? SESSION_LABEL[st.state] : 'Chưa nhận trạng thái'} style={{ alignItems: 'center', gap: 6, paddingVertical: 12 }}>
            <Ionicons name={!st ? 'radio-outline' : st.state === 'error' ? 'warning-outline' : 'stop-circle-outline'} size={36} color={st?.state === 'error' ? C.red : C.textSoft} />
            <Text style={{ fontSize: typeScale.sectionTitle.size, fontWeight: '700', color: C.text }}>{st ? SESSION_LABEL[st.state] : 'Chưa nhận trạng thái'}</Text>
          </View>
        )}
        <InfoRow label="Nhận lần cuối" value={link.lastStatusAt ? fmtDateTime(link.lastStatusAt) : '–'} />
        {/* P0 DV-06: tách điều máy báo với việc ứng dụng đã ghi phiên hay chưa; máy xong không có nghĩa là đã ghi. */}
        {st && (st.state === 'done' || st.state === 'stopped' || st.state === 'error') && (
          <>
            <InfoRow label="Máy báo" value={SESSION_LABEL[st.state]} />
            <InfoRow label="Nhật ký ứng dụng" value={!saved ? 'Chưa ghi phiên này' : saved.kind === 'fail' ? 'Chưa ghi được' : saved.kind === 'done' ? 'Đã ghi (đủ thời gian)' : 'Đã ghi (gián đoạn)'} />
          </>
        )}
        {!st && <Muted>Bắt đầu phiên trên máy; trạng thái hiện ở đây khi máy gửi về. Giữ màn này mở tới khi phiên xong để phiên được ghi vào nhật ký.</Muted>}
        {/* Chỉ thiết bị giả lập có nút bắt đầu trên ứng dụng. Nút này ở thân màn, không ở chỗ nút Dừng (chân màn). */}
        {canStart && (
          <View style={{ gap: 6 }}>
            <Button label="Bắt đầu điều trị" variant="secondary" icon="play-outline" onPress={requestStart} />
            <Muted>Nút này thay cho thao tác trên máy, chỉ có với thiết bị giả lập.</Muted>
          </View>
        )}
      </Card>
      {/* Buổi đủ thời gian: một thông báo success. Buổi gián đoạn: gộp vào thông báo warning của trạng thái bên dưới. */}
      {saved?.kind === 'fail' && <Notice tone={semantic.danger.tone} icon="alert-circle-outline">{saved.text}</Notice>}
      {saved?.kind === 'done' && !(st?.state === 'done' && isPatient) && (
        <Notice tone={semantic.success.tone} icon="checkmark-circle-outline">{saved.text}</Notice>
      )}
      {saved?.kind === 'interrupted' && st?.state !== 'stopped' && st?.state !== 'error' && (
        <Notice tone={semantic.warning.tone} icon="stop-circle-outline">{`Buổi điều trị chưa đủ thời gian. ${saved.text}`}</Notice>
      )}
      {/* Việc tiếp theo sau khi phiên kết thúc (wireframe T02, P1 đến P3); nút đi kèm nằm ở chân màn. */}
      {st?.state === 'done' && isPatient && (
        <Notice tone={semantic.success.tone} icon="checkmark-circle-outline">{saved?.kind === 'done' ? `Đã xong buổi điều trị hôm nay. ${saved.text}` : 'Đã xong buổi điều trị hôm nay.'}</Notice>
      )}
      {st?.state === 'stopped' && (
        <Notice tone={semantic.warning.tone} icon="stop-circle-outline">{`Buổi điều trị dừng trước khi đủ thời gian.${saved?.kind === 'interrupted' ? ` ${saved.text}` : ''} Nếu do đau hoặc khó chịu, hãy báo bác sĩ.`}</Notice>
      )}
      {st?.state === 'error' && (
        <Notice tone={semantic.danger.tone}>{`Máy báo lỗi.${saved?.kind === 'interrupted' ? ` ${saved.text}` : ''} Tắt máy, bật lại. Nếu vẫn lỗi, báo sự cố thiết bị.`}</Notice>
      )}
      {/* Thiết bị và liệu trình của phiên: chỉ đọc. Thông số là của đợt bác sĩ đã xác nhận, không phải số máy gửi về. */}
      <Card>
        <SectionTitle icon="hardware-chip-outline">Thiết bị và liệu trình</SectionTitle>
        <InfoRow label="Thiết bị" value={deviceCode ?? 'Chưa giao máy'} />
        {plan ? (
          <>
            <InfoRow label="Mức năng lượng" value={plan.doseLevel != null ? `Mức ${plan.doseLevel}` : '–'} />
            <InfoRow label="Chế độ điều trị" value={plan.treatmentMode ? modeLabel(plan.treatmentMode) : '–'} />
            <InfoRow label="Thời gian mỗi lần điều trị" value={plan.durationSec != null ? fmtDuration(plan.durationSec) : '–'} />
            <Muted>{`Theo đợt điều trị phiên bản ${plan.version}. Máy không gửi lại thông số này qua cáp.`}</Muted>
          </>
        ) : (
          <Muted>{'Chưa chọn vết thương nên không hiện liệu trình. Mở màn này từ bước "Nạp liệu trình" để xem.'}</Muted>
        )}
      </Card>
    </Screen>
  );
}
