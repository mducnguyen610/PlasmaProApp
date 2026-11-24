import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { Sheet } from '@/components/Sheet';
import { Button, Disclosure, Field, Header, InfoRow, ListCard, Notice, Screen, SectionTitle, SimBadge, StatusChip } from '@/components/ui';
import { DEVICE_MODEL, DEVICE_STATUS, catalogErrors, deviceStatus } from '@/lib/deviceState';
import { fmtDateTime } from '@/lib/format';
import { notify } from '@/lib/dialog';
import { useStore } from '@/lib/store';
import { C, T } from '@/theme';
import { CLOUD_LINK, cloudState } from '@/theme.status';

// Q03 Quản trị: danh mục máy (thêm, sửa mã, số sê-ri; dòng máy cố định HFP) và xem máy đang giao cho ai.
// Giai đoạn B (CN4 D1, XN-09): giao, thu hồi, khử khuẩn, chăm sóc, xử lý lỗi do bác sĩ; quản trị không thao tác với máy.
type Form = { code: string; serial: string };
const EMPTY: Form = { code: '', serial: '' };

export default function AdminDevices() {
  const { data, registerDevice, updateDevice } = useStore();
  const [form, setForm] = useState<Form>(EMPTY);
  const [now] = useState(() => Date.now());
  // Stage 6: đăng ký là thao tác phụ ngắn nên mở trong bảng trượt. Nội dung đang nhập giữ ở màn này, đóng bảng không mất.
  const [sheet, setSheet] = useState(false);
  // Máy đang sửa (null là thêm mới).
  const [editing, setEditing] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const submitting = useRef(false);
  const err = catalogErrors(form, data.devices, editing ?? undefined);
  const touched = { code: !!form.code, serial: !!form.serial };
  const invalid = !!(err.code || err.serial);
  // Máy báo lỗi lên đầu (CN4 D9), rồi máy cần chú ý kết nối (V24); thứ tự còn lại giữ như dữ liệu.
  const attn = (d: (typeof data.devices)[number]) => (d.fault ? 2 : 0) + Number(CLOUD_LINK[cloudState(d.online, d.lastSync, now)].role === 'warning');
  const openNew = () => { submitting.current = false; setAdded(null); if (editing) { setEditing(null); setForm(EMPTY); } setSheet(true); };
  const openEdit = (id: string) => {
    const d = data.devices.find((x) => x.id === id);
    if (!d) return;
    submitting.current = false; setAdded(null); setEditing(id); setForm({ code: d.code, serial: d.serial ?? '' }); setSheet(true);
  };

  return (
    // Stage 9A (bố cục riêng Q03): hai việc của kỹ thuật (đăng ký máy, chẩn đoán cáp) đứng cạnh nhau ở đầu màn; danh sách có tiêu đề
    // đếm số máy và số máy trực tuyến; câu "bác sĩ giao và thu hồi máy" nêu một lần ở tiêu đề danh sách thay cho lặp trong từng máy.
    <Screen header={<Header title="Thiết bị" />}>
      <SimBadge />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <View style={{ flexGrow: 1, flexBasis: 160 }}><Button label={!editing && form.code.trim() ? 'Tiếp tục đăng ký thiết bị' : 'Đăng ký thiết bị mới'} variant="secondary" icon="add-circle-outline" onPress={openNew} /></View>
        <View style={{ flexGrow: 1, flexBasis: 160 }}><Button label="Chẩn đoán kết nối USB/UART" variant="secondary" icon="pulse-outline" onPress={() => router.push('/device-diagnostics')} /></View>
      </View>
      {added && <Notice tone="green" icon="checkmark-circle-outline">{added}</Notice>}
      <Sheet visible={sheet} title={editing ? 'Sửa thông tin máy' : 'Đăng ký thiết bị mới'} onClose={() => setSheet(false)} testID="bang-dang-ky-thiet-bi">
        <Field label="Mã thiết bị" value={form.code} onChangeText={(v) => setForm({ ...form, code: v })} autoCapitalize="characters" placeholder="TB-004"
          error={touched.code ? err.code : null} />
        <Field label="Số sê-ri" value={form.serial} onChangeText={(v) => setForm({ ...form, serial: v })} autoCapitalize="characters" placeholder="Số in trên nhãn máy"
          error={touched.serial ? err.serial : null} />
        <InfoRow label="Dòng máy" value={(editing && data.devices.find((x) => x.id === editing)?.model) || DEVICE_MODEL} />
        <Button
          label={editing ? 'Lưu thay đổi' : 'Đăng ký'}
          icon={editing ? 'save-outline' : 'add'}
          disabled={invalid}
          reason="Nhập đủ mã, số sê-ri, dòng máy và không trùng máy khác."
          onPress={async () => {
            if (submitting.current) return;
            submitting.current = true;
            const c = form.code.trim().toUpperCase();
            // Khóa giữ đến lần mở bảng sau: lần bấm thứ hai trước khi màn vẽ lại không đăng ký trùng.
            try {
              if (editing) await updateDevice(editing, form);
              else await registerDevice(form);
            } catch (e) {
              submitting.current = false;
              notify(editing ? 'Chưa lưu được' : 'Chưa đăng ký được thiết bị', e instanceof Error ? e.message : String(e));
              return;
            }
            setAdded(editing ? `Đã lưu thông tin máy ${c}.` : `Đã đăng ký thiết bị ${c}.`);
            setEditing(null);
            setForm(EMPTY);
            setSheet(false);
          }}
        />
      </Sheet>
      {/* Một thẻ cho cả danh sách: mỗi thiết bị một dòng, gán bệnh nhân và nhật ký nằm trong phần mở rộng. */}
      <SectionTitle right={<Text style={{ color: C.textSoft, fontSize: T.small }}>{`${data.devices.filter((d) => d.online).length}/${data.devices.length} trực tuyến`}</Text>}
        caption="Bác sĩ giao, thu hồi, khử khuẩn và xử lý lỗi máy. Quản trị chỉ quản lý danh mục.">{`${data.devices.length} thiết bị`}</SectionTitle>
      <ListCard>
            {[...data.devices].sort((a, b) => attn(b) - attn(a)).map((d) => (
        <View key={d.id} style={{ paddingVertical: 4 }}>
          <Disclosure icon={d.fault ? 'warning-outline' : 'hardware-chip-outline'} title={d.fault ? `${d.code} · Lỗi` : d.code} summary={`${data.patients.find((p) => p.id === d.patientId)?.code ?? 'Chưa gán'} · đồng bộ ${d.lastSync ? fmtDateTime(d.lastSync) : 'chưa từng'}`}
            below={<StatusChip status={CLOUD_LINK[cloudState(d.online, d.lastSync, now)]} label={CLOUD_LINK[cloudState(d.online, d.lastSync, now)].label} />}>
          <InfoRow label="Trạng thái" value={DEVICE_STATUS[deviceStatus(d)].label} />
          {d.fault && <Notice tone="red" icon="warning-outline">{`Lỗi lúc ${fmtDateTime(d.fault.at)}. ${d.fault.message}`}</Notice>}
          <InfoRow label="Số sê-ri" value={d.serial || '—'} />
          <InfoRow label="Dòng máy" value={d.model} />
          <InfoRow label="Đang giao cho" value={data.patients.find((p) => p.id === d.patientId)?.code ?? 'chưa giao'} />
          <InfoRow label="Firmware" value={d.firmware} />
          <Button label="Sửa thông tin máy" variant="ghost" icon="create-outline" onPress={() => openEdit(d.id)} />
          <Button label="Xem nhật ký" variant="ghost" icon="list-outline" onPress={() => router.push({ pathname: '/devices/[id]', params: { id: d.id } })} />
          </Disclosure>
        </View>
      ))}
      </ListCard>
    </Screen>
  );
}
