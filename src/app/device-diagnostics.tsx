import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { NoAccess } from '@/components/Guard';
import { Text } from '@/components/Text';
import { UsbLinkStatus } from '@/components/UsbLinkStatus';
import { Button, Card, Chip, Header, InfoRow, Muted, Notice, Screen, SectionTitle, Empty } from '@/components/ui';
import { PROTOCOL, setTransportPreference, transportPreference, usbAndroidAvailable } from '@/lib/device';
import { LINK_LABEL, sendResultLabel } from '@/lib/device/labels';
import { checkSpec } from '@/lib/device/spec-check';
import type { TraceEntry } from '@/lib/device/trace';
import { useDeviceLink } from '@/lib/device/useDeviceLink';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

/**
 * Màn chẩn đoán kết nối cho quản trị viên: đặc tả đang dùng, hỏi máy, bản ghi byte.
 * Với máy thật, màn này chỉ hỏi (INF, CAP), không nạp cấu hình điều trị: giá trị điều trị chỉ đến từ liệu trình
 * bác sĩ đã xác nhận (FR2, KT5) và mỗi lần nạp phải có nhật ký (DR15). Cấu hình thử chỉ gửi được tới thiết bị giả lập.
 */
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

  const simulated = link.kind === 'simulated';
  const sendTest = async () => {
    if (!simulated) return;
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

      <Card>
        <Text style={{ fontWeight: '700', color: C.text }}>Đường truyền</Text>
        <UsbLinkStatus state={link.state} simulated={link.kind === 'simulated'} />
        <InfoRow label="Đang dùng" value={link.kind === 'usb-android' ? 'USB thật (Android)' : link.kind === 'simulated' ? 'Thiết bị giả lập' : link.kind} />
        {link.detail ? <Muted>{link.detail}</Muted> : null}
        {usbAndroidAvailable() ? (
          transportPreference() === 'auto' ? (
            <Button label="Chuyển sang thiết bị giả lập" variant="secondary" icon="flask-outline" onPress={() => void setTransportPreference('simulated')} />
          ) : (
            <Button label="Dùng USB thật" variant="secondary" icon="hardware-chip-outline" onPress={() => void setTransportPreference('auto')} />
          )
        ) : (
          <Muted>USB thật chỉ có trong bản dựng Android (không có trong Expo Go hay bản web).</Muted>
        )}
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
          {simulated ? (
            <Button label="Gửi cấu hình thử tới thiết bị giả lập (TEST01)" variant="secondary" icon="send-outline" onPress={sendTest} />
          ) : (
            <Muted>Với máy thật, thử nạp cấu hình bằng luồng của bệnh nhân (Thiết bị, Kết nối máy và nạp liệu trình) để lần nạp có nhật ký.</Muted>
          )}
          {note && <Notice tone="blue" icon="information-circle-outline">{note}</Notice>}
        </Card>
      )}

      <SectionTitle action="Xóa bản ghi" onAction={() => { transport.clearTrace(); setTrace([]); }}>Byte gửi và nhận</SectionTitle>
      {trace.length === 0 ? (
        <Empty icon="swap-vertical-outline" text={link.state === 'connected' ? 'Chưa có byte gửi hoặc nhận. Bấm Hỏi thông tin máy để thử.' : 'Chưa có byte gửi hoặc nhận. Kết nối máy để bắt đầu.'} />
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
