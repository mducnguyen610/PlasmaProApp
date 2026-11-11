import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { NoAccess, useCanView } from '@/components/Guard';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Header, InfoRow, Muted, Notice, Screen } from '@/components/ui';
import { fmtRemaining, LINK_LABEL, SESSION_LABEL } from '@/lib/device/labels';
import { useDeviceLink } from '@/lib/device/useDeviceLink';
import { fmtDateTime } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import { C, semantic } from '@/theme';

/**
 * Theo dõi phiên điều trị qua bản tin trạng thái máy phát mỗi giây.
 * Khi thấy STA chuyển từ running sang done, stopped hoặc error, ghi một phiên vào nhật ký (FR4), để tổng quan bác sĩ thấy "Đã chiếu" (FR10).
 * Phiên chỉ được ghi khi màn này đang mở; mất kết nối giữa phiên thì không ghi.
 */
const STALE_AFTER_SEC = 5;

export default function SessionMonitor() {
  const params = useLocalSearchParams<{ patientId?: string; woundId?: string }>();
  const { me, recordDeviceSession } = useStore();
  const { patient } = useLookups();
  const p = patient(me?.role === 'patient' ? me.patientId : params.patientId);
  const canView = useCanView(p);
  // kind: 'done' buổi đủ thời gian, 'interrupted' buổi dừng giữa chừng hoặc lỗi, 'fail' chưa ghi được (V03: mỗi sự kiện một thông báo).
  const [saved, setSaved] = useState<{ kind: 'done' | 'interrupted' | 'fail'; text: string } | null>(null);
  const link = useDeviceLink({
    onSessionEnd: (done) => {
      if (!p) return;
      try {
        const ok = recordDeviceSession({ patientId: p.id, woundId: params.woundId, startedAt: done.startedAt.toISOString(), durationSec: done.durationSec, outcome: done.outcome });
        setSaved(ok
          ? done.outcome === 'done'
            ? { kind: 'done', text: `Đã ghi phiên điều trị ${Math.round(done.durationSec / 6) / 10} phút vào nhật ký.` }
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

  if (!p || !canView) return <NoAccess />;

  const isPatient = me?.role === 'patient';
  const st = link.lastStatus;
  const lost = link.state === 'disconnected' || link.state === 'error';
  // Ngưỡng 5 s là đề xuất ở wireframe T02 (P5), chưa có nguồn; ICD hiện quy định máy gửi STA mỗi giây.
  const staleSec = link.lastStatusAt ? Math.floor((now - new Date(link.lastStatusAt).getTime()) / 1000) : 0;
  const stale = link.state === 'connected' && st?.state === 'running' && staleSec > STALE_AFTER_SEC;
  return (
    <Screen header={<Header back title="Theo dõi phiên điều trị" subtitle={p.code} />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontWeight: '700', color: C.text, flex: 1 }}>{LINK_LABEL[link.state]}</Text>
          {link.kind === 'simulated' && <Chip label="Thiết bị giả lập" tone="amber" icon="flask-outline" />}
        </View>
        {link.state !== 'connected' && <Button label="Kết nối" icon="link-outline" onPress={link.connect} loading={link.state === 'connecting'} />}
      </Card>
      {lost && st?.state === 'running' && <Notice tone="red">Mất kết nối với máy trong lúc phiên đang chạy. Hãy cắm lại cáp.</Notice>}
      {stale && <Notice>{`Chưa nhận trạng thái từ máy ${staleSec} giây. Kiểm tra cáp còn cắm chặt.`}</Notice>}
      <Card>
        {st && st.state !== 'stopped' && st.state !== 'error' && st.remainingSec != null ? (
          <View accessible accessibilityLabel={`${SESSION_LABEL[st.state]}, còn ${fmtRemaining(st.remainingSec)}`} style={{ alignItems: 'center', gap: 2, paddingVertical: 8 }}>
            <Text style={{ fontSize: 44, fontWeight: '700', color: st.state === 'running' ? C.primary : C.text, fontVariant: ['tabular-nums'] }}>{fmtRemaining(st.remainingSec)}</Text>
            <Text style={{ color: C.textSoft }}>{`${SESSION_LABEL[st.state]}, còn lại`}</Text>
          </View>
        ) : (
          // Chưa nhận STA, hoặc phiên đã dừng, lỗi: không hiện số giây cũ dễ gây hiểu nhầm.
          <View accessible accessibilityLabel={st ? SESSION_LABEL[st.state] : 'Chưa nhận trạng thái'} style={{ alignItems: 'center', gap: 6, paddingVertical: 12 }}>
            <Ionicons name={!st ? 'radio-outline' : st.state === 'error' ? 'warning-outline' : 'stop-circle-outline'} size={36} color={st?.state === 'error' ? C.red : C.textSoft} />
            <Text style={{ fontSize: 20, fontWeight: '700', color: C.text }}>{st ? SESSION_LABEL[st.state] : 'Chưa nhận trạng thái'}</Text>
          </View>
        )}
        <InfoRow label="Nhận lần cuối" value={link.lastStatusAt ? fmtDateTime(link.lastStatusAt) : '–'} />
        {!st && <Muted>Bắt đầu phiên trên máy; trạng thái hiện ở đây khi máy gửi về. Giữ màn này mở tới khi phiên xong để phiên được ghi vào nhật ký.</Muted>}
      </Card>
      {/* Buổi đủ thời gian: một thông báo success. Buổi gián đoạn: gộp vào thông báo warning của trạng thái bên dưới. */}
      {saved?.kind === 'fail' && <Notice tone={semantic.danger.tone} icon="alert-circle-outline">{saved.text}</Notice>}
      {saved?.kind === 'done' && !(st?.state === 'done' && isPatient) && (
        <Notice tone={semantic.success.tone} icon="checkmark-circle-outline">{saved.text}</Notice>
      )}
      {saved?.kind === 'interrupted' && st?.state !== 'stopped' && st?.state !== 'error' && (
        <Notice tone={semantic.warning.tone} icon="stop-circle-outline">{`Buổi chiếu chưa đủ thời gian. ${saved.text}`}</Notice>
      )}
      {/* Việc tiếp theo sau khi phiên kết thúc (wireframe T02, P1 đến P3). */}
      {st?.state === 'done' && isPatient && (
        <>
          <Notice tone={semantic.success.tone} icon="checkmark-circle-outline">{saved?.kind === 'done' ? `Đã xong buổi chiếu hôm nay. ${saved.text}` : 'Đã xong buổi chiếu hôm nay.'}</Notice>
          <Button label="Ghi cảm giác sau khi chiếu" icon="create-outline" onPress={() => router.push('/schedule')} />
        </>
      )}
      {st?.state === 'stopped' && (
        <>
          <Notice tone={semantic.warning.tone} icon="stop-circle-outline">{`Buổi chiếu dừng trước khi đủ thời gian.${saved?.kind === 'interrupted' ? ` ${saved.text}` : ''} Nếu do đau hoặc khó chịu, hãy báo bác sĩ.`}</Notice>
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
          đang chiếu thì chỉ còn "Dừng chiếu" nền đỏ, rộng hết cột. */}
      {link.startSession && link.stopSession && link.state === 'connected' && (
        <View style={{ gap: 6 }}>
          {st?.state === 'running'
            ? <Button label="Dừng chiếu" variant="dangerSolid" icon="stop-circle-outline" onPress={link.stopSession} />
            : <Button label="Bắt đầu chiếu" icon="play-outline" onPress={link.startSession} />}
          <Muted>Nút này thay cho thao tác trên máy, chỉ có với thiết bị giả lập.</Muted>
        </View>
      )}
    </Screen>
  );
}
