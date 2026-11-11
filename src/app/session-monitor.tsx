import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { NoAccess, useCanView } from '@/components/Guard';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Header, InfoRow, Muted, Notice, Screen } from '@/components/ui';
import { LINK_LABEL, SESSION_LABEL } from '@/lib/device/labels';
import { useDeviceLink } from '@/lib/device/useDeviceLink';
import { fmtDateTime } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import { C } from '@/theme';

/**
 * Theo dõi phiên điều trị qua bản tin trạng thái máy phát mỗi giây.
 * Khi thấy STA chuyển từ running sang done, stopped hoặc error, ghi một phiên vào nhật ký (FR4), để tổng quan bác sĩ thấy "Đã chiếu" (FR10).
 * Phiên chỉ được ghi khi màn này đang mở; mất kết nối giữa phiên thì không ghi.
 */
export default function SessionMonitor() {
  const params = useLocalSearchParams<{ patientId?: string; woundId?: string }>();
  const { me, recordDeviceSession } = useStore();
  const { patient } = useLookups();
  const p = patient(me?.role === 'patient' ? me.patientId : params.patientId);
  const canView = useCanView(p);
  const [saved, setSaved] = useState<{ ok: boolean; text: string } | null>(null);
  const link = useDeviceLink({
    onSessionEnd: (done) => {
      if (!p) return;
      try {
        const ok = recordDeviceSession({ patientId: p.id, woundId: params.woundId, startedAt: done.startedAt.toISOString(), durationSec: done.durationSec, outcome: done.outcome });
        setSaved(ok
          ? { ok: true, text: done.outcome === 'done' ? `Đã ghi phiên điều trị ${Math.round(done.durationSec / 6) / 10} phút vào nhật ký.` : 'Phiên dừng giữa chừng, đã ghi vào nhật ký là phiên bị gián đoạn.' }
          : { ok: false, text: 'Hồ sơ chưa được giao máy nên phiên chưa được ghi. Bác sĩ cần giao máy trên hồ sơ người bệnh.' });
      } catch (e) {
        setSaved({ ok: false, text: e instanceof Error ? e.message : String(e) });
      }
    },
  });

  if (!p || !canView) return <NoAccess />;

  const st = link.lastStatus;
  const lost = link.state === 'disconnected' || link.state === 'error';
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
      <Card>
        <InfoRow label="Trạng thái phiên" value={st ? SESSION_LABEL[st.state] : 'Chưa nhận trạng thái'} />
        <InfoRow label="Giây còn lại" value={st?.remainingSec != null ? String(st.remainingSec) : '–'} />
        <InfoRow label="Nhận lần cuối" value={link.lastStatusAt ? fmtDateTime(link.lastStatusAt) : '–'} />
        {!st && <Muted>Bắt đầu phiên trên máy; trạng thái hiện ở đây khi máy gửi về. Giữ màn này mở tới khi phiên xong để phiên được ghi vào nhật ký.</Muted>}
      </Card>
      {saved && (
        <Notice tone={saved.ok ? 'green' : 'red'} icon={saved.ok ? 'checkmark-circle-outline' : 'alert-circle-outline'}>
          {saved.text}
        </Notice>
      )}
      {link.startSession && link.stopSession && link.state === 'connected' && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Bắt đầu phiên (giả lập)" icon="play-outline" onPress={link.startSession} style={{ flex: 1 }} />
          <Button label="Dừng phiên (giả lập)" variant="secondary" icon="stop-outline" onPress={link.stopSession} style={{ flex: 1 }} />
        </View>
      )}
    </Screen>
  );
}
