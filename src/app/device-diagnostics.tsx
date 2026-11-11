import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { NoAccess } from '@/components/Guard';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Header, InfoRow, Muted, Notice, Screen, SectionTitle } from '@/components/ui';
import { PROTOCOL } from '@/lib/device';
import { LINK_LABEL, sendResultLabel } from '@/lib/device/labels';
import { checkSpec } from '@/lib/device/spec-check';
import type { TraceEntry } from '@/lib/device/trace';
import { useDeviceLink } from '@/lib/device/useDeviceLink';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

/** Màn chẩn đoán kết nối cho quản trị viên: đặc tả đang dùng, hỏi máy, gửi cấu hình thử, bản ghi byte. */
export default function DeviceDiagnostics() {
  const { me } = useStore();
  const link = useDeviceLink();
  const { transport } = link;
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    // Xóa bản ghi cũ để không hiện khung của phiên lâm sàng trước đó; danh sách trên màn bắt đầu rỗng.
    transport.clearTrace();
    return transport.onTrace((e) => setTrace((t) => [...t.slice(-199), e]));
  }, [transport]);

  if (me?.role !== 'admin') return <NoAccess />;

  const problems = checkSpec(PROTOCOL);
  const fr = PROTOCOL.framing;
  const idInfo = link.identity?.kind === 'known' ? link.identity.info : null;

  const sendTest = async () => {
    const r = await link.send({ patientId: 'TEST01', minTreatmentTimeSec: 60, energyLevel: 1, treatmentMode: 'cold', at: new Date() });
    setNote(sendResultLabel(r));
  };

  return (
    <Screen header={<Header back title="Chẩn đoán kết nối" subtitle={LINK_LABEL[link.state]} />}>
      <Card>
        <Text style={{ fontWeight: '700', color: C.text }}>Đặc tả đang dùng</Text>
        <InfoRow label="Kiểu khung" value={fr.kind === 'text' ? 'Văn bản ASCII' : 'Nhị phân'} />
        <InfoRow label="Checksum" value={PROTOCOL.checksum} mono />
        <InfoRow label="Phiên bản giao thức" value={String(PROTOCOL.protocolVersion)} />
        <InfoRow label="UART" value={`${PROTOCOL.uart.baudRate} ${PROTOCOL.uart.dataBits}${PROTOCOL.uart.parity[0].toUpperCase()}${PROTOCOL.uart.stopBits}`} mono />
        <InfoRow label="Nguồn" value={PROTOCOL.source} stack />
        {PROTOCOL.confirmed ? <Chip label="Đã xác nhận" tone="green" /> : <Chip label="Chưa được firmware xác nhận" tone="amber" />}
        {problems.length === 0 ? <Muted>Đặc tả hợp lệ.</Muted> : problems.map((x) => <Text key={x} style={{ color: C.red }}>{x}</Text>)}
      </Card>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {link.state === 'connected' ? (
          <Button label="Ngắt" variant="secondary" icon="close-circle-outline" onPress={link.disconnect} style={{ flex: 1 }} />
        ) : (
          <Button label="Kết nối" icon="link-outline" onPress={link.connect} loading={link.state === 'connecting'} style={{ flex: 1 }} />
        )}
      </View>
      {link.state === 'connected' && (
        <Card>
          <InfoRow label="Giao thức của máy" value={idInfo ? String(idInfo.protocolVersion) : link.identity?.kind === 'no_reply' ? 'Máy không trả lời' : 'Không rõ'} />
          {idInfo && <InfoRow label="Firmware" value={idInfo.firmwareVersion} />}
          {idInfo && <InfoRow label="Mã mẫu" value={idInfo.model} />}
          <InfoRow label="Năng lực" value={link.caps ? `Mức ${link.caps.energyLevels.join(', ')}; chế độ ${link.caps.treatmentModes.map((m) => m.label).join(', ')} (${link.capsSource === 'device' ? 'từ máy' : 'bảng dự phòng'})` : 'Chưa có'} stack />
          <Button label="Hỏi thông tin máy" variant="secondary" icon="help-circle-outline" onPress={link.identify} />
          <Button label="Gửi cấu hình thử (TEST01)" variant="secondary" icon="send-outline" onPress={sendTest} />
          {note && <Notice tone="blue" icon="information-circle-outline">{note}</Notice>}
        </Card>
      )}

      <SectionTitle action="Xóa bản ghi" onAction={() => { transport.clearTrace(); setTrace([]); }}>Byte gửi và nhận</SectionTitle>
      {trace.length === 0 ? (
        <Muted>Chưa có dữ liệu.</Muted>
      ) : (
        [...trace].reverse().map((e, i) => (
          <Card key={trace.length - i}>
            <Text style={{ fontWeight: '700', color: e.dir === 'tx' ? C.primary : C.green }}>{`${e.dir === 'tx' ? 'Gửi' : 'Nhận'} · ${fmtDateTime(e.at)}`}</Text>
            <Text style={{ fontFamily: 'monospace', color: C.text }}>{e.hex}</Text>
            <Text style={{ fontFamily: 'monospace', color: C.textSoft }}>{e.ascii}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}
