import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { Button, Card, Chip, Disclosure, Field, InfoRow, Muted, Notice, SectionTitle } from '@/components/ui';
import { confirm, notify } from '@/lib/dialog';
import { DEVICE_EVENT_LABEL, DEVICE_STATUS, deviceHistory, deviceStatus } from '@/lib/deviceState';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { CARE_ITEMS, LIFECYCLE } from '@/lib/maintenance';
import { useLookups, useStore } from '@/lib/store';
import type { Device } from '@/lib/types';
import { C, T } from '@/theme';

/**
 * Giai đoạn B (CN4 D1, D3, D5, XN-09): việc của bác sĩ với máy: xem trạng thái, đánh dấu Đã khử khuẩn sau thu hồi (máy về Sẵn sàng),
 * chăm sóc máy, ghi đã xử lý lỗi. Không kết nối, không gửi lệnh xuống máy (D6). Thu hồi làm trên hồ sơ bệnh nhân giữ máy.
 */
export function DeviceManageCard({ device }: { device: Device }) {
  const { setLifecycle, markCareDone, clearDeviceFault } = useStore();
  const { patient, account } = useLookups();
  const [note, setNote] = useState('');
  const busy = useRef(false);
  const [working, setWorking] = useState(false);
  const run = async (op: () => Promise<void>, done: string) => {
    if (busy.current) return;
    busy.current = true; setWorking(true);
    try { await op(); notify(done, ''); }
    catch (e) { notify('Chưa thực hiện được', e instanceof Error ? e.message : String(e)); }
    finally { busy.current = false; setWorking(false); }
  };
  const st = deviceStatus(device);
  const lc = device.lifecycle ?? (device.patientId ? 'in_use' : 'ready');
  const owner = patient(device.patientId);
  const faultOwner = patient(device.fault?.patientId);
  return (
    <Card testID="quan-ly-may" style={{ gap: 10 }}>
      <SectionTitle icon="hardware-chip-outline">Trạng thái máy</SectionTitle>
      <View style={{ flexDirection: 'row' }}><Chip label={DEVICE_STATUS[st].label} tone={DEVICE_STATUS[st].tone} icon={st === 'fault' ? 'warning-outline' : undefined} /></View>
      <InfoRow label="Số sê-ri" value={device.serial || '—'} />
      <InfoRow label="Dòng máy" value={device.model} />
      {owner && <InfoRow label="Bệnh nhân đang giữ" value={owner.code} />}
      {owner && device.assignedAt && <InfoRow label="Giao lúc" value={`${fmtDateTime(device.assignedAt)} · ${account(device.assignedBy)?.name ?? '—'}`} />}
      {device.fault && (
        <View style={{ gap: 8 }}>
          <Notice tone="red" icon="warning-outline">{`Máy báo lỗi lúc ${fmtDateTime(device.fault.at)}. ${device.fault.message}`}</Notice>
          <InfoRow label="Thời điểm" value={fmtDateTime(device.fault.at)} />
          <InfoRow label="Bệnh nhân đang giữ khi lỗi" value={faultOwner?.code ?? '—'} />
          <Muted>Ứng dụng không gửi lệnh khắc phục xuống máy. Kiểm tra máy theo hướng dẫn nhà sản xuất, rồi ghi lại đã xử lý.</Muted>
          <Field label="Ghi chú xử lý lỗi" value={note} onChangeText={setNote} placeholder="Ví dụ: đã kiểm tra cáp, máy hoạt động lại" />
          <Button label="Ghi đã xử lý lỗi" icon="checkmark-done-outline" variant="secondary" loading={working} disabled={!note.trim()} reason="Nhập ghi chú xử lý trước."
            onPress={() => confirm('Ghi đã xử lý lỗi', 'Máy bỏ trạng thái Lỗi. Nhật ký máy giữ lỗi và ghi chú này.', () => run(async () => { await clearDeviceFault(device.id, note); setNote(''); }, 'Đã ghi xử lý lỗi'), 'Ghi lại')} />
        </View>
      )}
      {(lc === 'returned' || lc === 'disinfected') && (
        <View style={{ gap: 8 }}>
          <Muted>Máy đã thu hồi. Khử khuẩn theo hướng dẫn nhà sản xuất rồi đánh dấu; máy về Sẵn sàng để giao cho bệnh nhân khác. Đầu phát cũ không cấp lại.</Muted>
          <Button label={LIFECYCLE[lc].action!} icon="sparkles-outline" variant="secondary" loading={working}
            onPress={() => confirm(LIFECYCLE[lc].action!, `Ghi nhận ${device.code} đã khử khuẩn. Máy chuyển sang Sẵn sàng.`, () => run(() => setLifecycle(device.id, 'ready'), 'Máy đã sẵn sàng'), 'Xác nhận')} />
        </View>
      )}
      {lc === 'in_use' && <Muted>Thu hồi máy trên hồ sơ bệnh nhân đang giữ máy.</Muted>}
      <Disclosure icon="construct-outline" title="Chăm sóc máy" summary={CARE_ITEMS.map((c) => `${c.label}: ${device.care?.[c.id] ? fmtDate(device.care[c.id]) : 'chưa ghi'}`).join(' · ')}>
        {CARE_ITEMS.map((c) => (
          <View key={c.id} style={{ gap: 4, paddingVertical: 4 }}>
            <Text style={{ fontWeight: '600', color: C.text, fontSize: T.small }}>{c.label}</Text>
            <Muted>{`${c.howTo} Lần gần nhất: ${device.care?.[c.id] ? fmtDateTime(device.care[c.id]) : 'chưa ghi nhận'}.`}</Muted>
            <Button label="Đánh dấu đã làm" variant="ghost" icon="checkmark-done-outline" disabled={working}
              onPress={() => confirm(c.label, 'Ghi nhận đã làm xong; bộ đếm của mục này bắt đầu lại từ 0.', () => run(() => markCareDone(device.id, c.id), 'Đã ghi'), 'Đã làm xong')} />
          </View>
        ))}
      </Disclosure>
    </Card>
  );
}

/** Giai đoạn B (CN4 D4, AU-27): lịch sử máy: giao, thu hồi, khử khuẩn, kết nối, ngắt kết nối, nạp phác đồ, phiên, lỗi. Chỉ xem. */
export function DeviceHistoryCard({ device }: { device: Device }) {
  const { data } = useStore();
  const { patient, account } = useLookups();
  const rows = deviceHistory(device.id, data.deviceEvents ?? [], data.sessions, data.deviceLinks ?? []);
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, 10);
  return (
    <Card testID="lich-su-may" style={{ gap: 6 }}>
      <SectionTitle icon="time-outline" caption="Chỉ xem. Sự kiện trước Giai đoạn B chỉ còn phiên và lần nạp.">{`Lịch sử máy (${rows.length})`}</SectionTitle>
      {rows.length === 0 && <Muted>Chưa có sự kiện nào.</Muted>}
      {shown.map((r) => (
        <View key={r.key} accessible style={{ gap: 2, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.border }}>
          <Text style={{ fontSize: T.small, fontWeight: '600', color: r.kind === 'error' ? C.red : C.text }}>{`${fmtDateTime(r.at)} · ${DEVICE_EVENT_LABEL[r.kind]}`}</Text>
          {[r.patientId ? `Bệnh nhân ${patient(r.patientId)?.code ?? '—'}` : '', r.by ? `Người ghi ${account(r.by)?.name ?? '—'}` : '', r.detail ?? '']
            .filter(Boolean).map((t, i) => <Muted key={i}>{t}</Muted>)}
        </View>
      ))}
      {rows.length > 10 && <Button label={all ? 'Thu gọn' : `Xem tất cả ${rows.length} sự kiện`} variant="ghost" onPress={() => setAll(!all)} />}
    </Card>
  );
}
