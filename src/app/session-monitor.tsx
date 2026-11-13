import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { NoAccess, useCanView } from '@/components/Guard';
import { Text } from '@/components/Text';
import { ClinicalContext } from '@/components/ClinicalContext';
import { UsbLinkStatus } from '@/components/UsbLinkStatus';
import { Button, Card, Header, InfoRow, Muted, Notice, Screen } from '@/components/ui';
import { fmtRemaining, SESSION_LABEL } from '@/lib/device/labels';
import { useDeviceLink } from '@/lib/device/useDeviceLink';
import { confirm } from '@/lib/dialog';
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
  const { patient, wound } = useLookups();
  const p = patient(me?.role === 'patient' ? me.patientId : params.patientId);
  const canView = useCanView(p);
  // kind: 'done' buổi đủ thời gian, 'interrupted' buổi dừng giữa chừng hoặc lỗi, 'fail' chưa ghi được (V03: mỗi sự kiện một thông báo).
  const [saved, setSaved] = useState<{ kind: 'done' | 'interrupted' | 'fail'; text: string; startedAt?: string } | null>(null);
  const link = useDeviceLink({
    onSessionEnd: (done) => {
      if (!p) return;
      try {
        const ok = recordDeviceSession({ patientId: p.id, woundId: params.woundId, startedAt: done.startedAt.toISOString(), durationSec: done.durationSec, outcome: done.outcome });
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

  // UX-03 (Đợt 8): khi máy đang điều trị, rời màn này (nút quay lại, cử chỉ, phím quay lại) thì phiên sẽ không được ghi.
  // Chỉ hỏi lại, không đổi cách ghi phiên, không chặn nút Dừng điều trị. Hết "Đang điều trị" thì không hỏi nữa.
  const running = link.lastStatus?.state === 'running';
  // Người dùng đã chọn "Vẫn rời màn": tắt chặn để không hỏi lại lần nữa (tránh vòng lặp xác nhận).
  const [leaving, setLeaving] = useState(false);
  usePreventRemove(running && !leaving, ({ repeat }) => {
    const patientView = me?.role === 'patient';
    // P0 DV-03: đã mất kết nối thì không nói "đang chạy" theo bản tin cũ.
    const linkLost = link.state !== 'connected';
    confirm(
      'Rời màn theo dõi?',
      linkLost
        ? 'Đã mất kết nối với máy nên không biết máy còn đang điều trị hay không. Phiên này sẽ không được ghi vào nhật ký.'
        : patientView
        ? 'Máy vẫn đang điều trị. Nếu rời màn này, buổi điều trị hôm nay sẽ không được ghi lại và bác sĩ sẽ thấy là bỏ lỡ.'
        : 'Phiên đang chạy. Nếu rời màn này, phiên sẽ không được ghi vào nhật ký.',
      () => { setLeaving(true); repeat(); },
      'Vẫn rời màn',
      'Ở lại màn theo dõi',
    );
  });

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
  return (
    <Screen header={<Header back title="Theo dõi phiên điều trị" />}>
      {/* P0 G1 (ID-07): phiên được ghi theo vết thương này. */}
      <ClinicalContext patient={p} wound={w && w.patientId === p.id ? w : null} />
      <Card>
        <UsbLinkStatus state={link.state} simulated={link.kind === 'simulated'} />
        {link.state !== 'connected' && <Button label="Kết nối" icon="link-outline" onPress={link.connect} loading={link.state === 'connecting'} />}
      </Card>
      {lost && shown.view === 'lost' && <Notice tone="red">{st?.state === 'running' ? 'Mất kết nối với máy trong lúc phiên đang chạy. Hãy cắm lại cáp.' : 'Mất kết nối với máy. Hãy cắm lại cáp.'}</Notice>}
      {stale && <Notice>{`Chưa nhận trạng thái từ máy ${staleSec} giây. Kiểm tra cáp còn cắm chặt.`}</Notice>}
      <Card>
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
      </Card>
      {/* Buổi đủ thời gian: một thông báo success. Buổi gián đoạn: gộp vào thông báo warning của trạng thái bên dưới. */}
      {saved?.kind === 'fail' && <Notice tone={semantic.danger.tone} icon="alert-circle-outline">{saved.text}</Notice>}
      {saved?.kind === 'done' && !(st?.state === 'done' && isPatient) && (
        <Notice tone={semantic.success.tone} icon="checkmark-circle-outline">{saved.text}</Notice>
      )}
      {saved?.kind === 'interrupted' && st?.state !== 'stopped' && st?.state !== 'error' && (
        <Notice tone={semantic.warning.tone} icon="stop-circle-outline">{`Buổi điều trị chưa đủ thời gian. ${saved.text}`}</Notice>
      )}
      {/* Việc tiếp theo sau khi phiên kết thúc (wireframe T02, P1 đến P3). */}
      {st?.state === 'done' && isPatient && (
        <>
          <Notice tone={semantic.success.tone} icon="checkmark-circle-outline">{saved?.kind === 'done' ? `Đã xong buổi điều trị hôm nay. ${saved.text}` : 'Đã xong buổi điều trị hôm nay.'}</Notice>
          {/* Đợt 11 (UX-19): mở thẳng biểu mẫu ghi cảm giác của phiên vừa ghi; không tìm được phiên thì mở Lịch trình như trước. */}
          <Button label="Ghi cảm giác sau khi điều trị" icon="create-outline" onPress={() => router.push(justRecorded ? { pathname: '/schedule', params: { sessionId: justRecorded.sessionId } } : '/schedule')} />
        </>
      )}
      {st?.state === 'stopped' && (
        <>
          <Notice tone={semantic.warning.tone} icon="stop-circle-outline">{`Buổi điều trị dừng trước khi đủ thời gian.${saved?.kind === 'interrupted' ? ` ${saved.text}` : ''} Nếu do đau hoặc khó chịu, hãy báo bác sĩ.`}</Notice>
          {isPatient && <Button label="Báo triệu chứng" variant="secondary" icon="chatbubble-ellipses-outline" onPress={() => router.push('/report')} />}
        </>
      )}
      {st?.state === 'error' && (
        <>
          <Notice tone={semantic.danger.tone}>{`Máy báo lỗi.${saved?.kind === 'interrupted' ? ` ${saved.text}` : ''} Tắt máy, bật lại. Nếu vẫn lỗi, báo sự cố thiết bị.`}</Notice>
          {isPatient && <Button label="Báo sự cố thiết bị" variant="secondary" icon="construct-outline" onPress={() => router.push({ pathname: '/report', params: { kind: 'device' } })} />}
        </>
      )}
      {/* Chỉ thiết bị giả lập có nút bắt đầu, dừng trên ứng dụng. Mỗi lúc một nút theo trạng thái phiên (V01):
          đang điều trị thì chỉ còn "Dừng điều trị" nền đỏ, rộng hết cột. */}
      {link.startSession && link.stopSession && link.state === 'connected' && (
        <View style={{ gap: 6 }}>
          {st?.state === 'running'
            ? <Button label="Dừng điều trị" variant="dangerSolid" icon="stop-circle-outline" onPress={link.stopSession} />
            : <Button label="Bắt đầu điều trị" icon="play-outline" onPress={link.startSession} />}
          <Muted>Nút này thay cho thao tác trên máy, chỉ có với thiết bị giả lập.</Muted>
        </View>
      )}
    </Screen>
  );
}
