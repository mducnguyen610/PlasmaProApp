import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { NoAccess, useCanView } from '@/components/Guard';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Header, InfoRow, Muted, Notice, Screen } from '@/components/ui';
import { LINK_LABEL, SESSION_LABEL } from '@/lib/device/labels';
import { useDeviceLink } from '@/lib/device/useDeviceLink';
import { fmtDateTime } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import { C } from '@/theme';

/** Theo dõi phiên điều trị qua bản tin trạng thái máy phát mỗi giây. */
export default function SessionMonitor() {
  const params = useLocalSearchParams<{ patientId?: string }>();
  const { me } = useStore();
  const { patient } = useLookups();
  const p = patient(me?.role === 'patient' ? me.patientId : params.patientId);
  const canView = useCanView(p);
  const link = useDeviceLink();
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
        {!st && <Muted>Bắt đầu phiên trên máy; trạng thái hiện ở đây khi máy gửi về.</Muted>}
      </Card>
      {link.startSession && link.stopSession && link.state === 'connected' && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Bắt đầu phiên (giả lập)" icon="play-outline" onPress={link.startSession} style={{ flex: 1 }} />
          <Button label="Dừng phiên (giả lập)" variant="secondary" icon="stop-outline" onPress={link.stopSession} style={{ flex: 1 }} />
        </View>
      )}
    </Screen>
  );
}
