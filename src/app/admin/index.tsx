import { View } from 'react-native';
import { Text } from '@/components/Text';

import { Button, Card, Chip, Choices, Disclosure, Header, IconBadge, ListCard, Muted, NumberTile, Screen, SectionTitle, SwitchRow } from '@/components/ui';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

const ROLE = { doctor: 'Bác sĩ', patient: 'Bệnh nhân', admin: 'Quản trị' } as const;

// Quản trị: quản lý tài khoản, khóa/mở, cấp quyền nghiên cứu, phân công bác sĩ (đặc tả mục 9).
export default function AdminAccounts() {
  const { data, me, updateAccount, updatePatient } = useStore();
  const doctors = data.accounts.filter((a) => a.role === 'doctor' && !a.locked && !a.pendingApproval);
  // Tổng quan hệ thống: số liệu tổng hợp chuyển từ trang chủ bác sĩ sang đây (chỉ đếm, không hiển thị dữ liệu lâm sàng).
  const usable = data.images.filter((i) => i.status !== 'excluded').length;
  const labeled = data.images.filter((i) => i.status === 'labeled').length;
  const pct = usable ? Math.round((labeled / usable) * 100) : 0;
  const online = data.devices.filter((d) => d.online).length;
  const pending = data.accounts.filter((a) => a.pendingApproval).length;
  const openErrors = data.syncErrors.filter((e) => !e.resolved).length;
  return (
    <Screen header={<Header title="Quản lý tài khoản" />}>
      {/* Điểm neo: ô số tổng quan. Mỗi tài khoản một dòng; công tắc nằm trong phần mở rộng. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <NumberTile value={data.accounts.length} label="Tài khoản" tone="gray" icon="people-outline" />
        <NumberTile value={pending} label="Chờ duyệt" tone={pending ? 'amber' : 'gray'} icon="hourglass-outline" />
        <NumberTile value={`${online}/${data.devices.length}`} label="Trực tuyến" tone={online < data.devices.length ? 'amber' : 'gray'} icon="cloud-done-outline" />
        <NumberTile value={openErrors} label="Lỗi chưa xử lý" tone={openErrors ? 'red' : 'gray'} icon="alert-circle-outline" />
        <NumberTile value={`${pct}%`} label={`Ảnh đã đo (${labeled}/${usable})`} tone="gray" icon="image-outline" />
      </View>
      <Muted>Chỉ hiển thị mã hồ sơ, không có dữ liệu lâm sàng.</Muted>

      <SectionTitle icon="people-outline">Tài khoản</SectionTitle>
      <Card>
        {data.accounts.map((a, i) => {
          const name = a.role === 'patient' ? data.patients.find((p) => p.id === a.patientId)?.code ?? a.name : a.name;
          const status = a.pendingApproval ? 'Chờ duyệt' : a.locked ? 'Đã khóa' : 'Hoạt động';
          return (
            <View key={a.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: C.border, paddingTop: i ? 4 : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <IconBadge icon={a.role === 'doctor' ? 'medkit-outline' : a.role === 'patient' ? 'person-outline' : 'construct-outline'} tone={a.role === 'doctor' ? 'blue' : a.role === 'patient' ? 'green' : 'violet'} />
                <View style={{ flex: 1 }}>
                  <Disclosure title={name} summary={`${ROLE[a.role]} · @${a.username}`} right={<Chip label={status} tone={a.pendingApproval ? 'amber' : a.locked ? 'red' : 'green'} />}>
                    {a.pendingApproval && <Button label="Duyệt tài khoản" onPress={() => updateAccount(a.id, { pendingApproval: false, locked: false })} />}
                    {a.id !== me?.id ? (
                      <SwitchRow label="Khóa tài khoản" value={a.locked} onChange={(v) => updateAccount(a.id, { locked: v })} />
                    ) : <Muted>Tài khoản đang đăng nhập.</Muted>}
                    {(a.role === 'doctor' || a.role === 'admin') && !a.pendingApproval && (
                      <SwitchRow label="Quyền xuất dữ liệu nghiên cứu" value={!!a.researchAccess} onChange={(v) => updateAccount(a.id, { researchAccess: v })} />
                    )}
                  </Disclosure>
                </View>
              </View>
            </View>
          );
        })}
      </Card>

      <SectionTitle icon="git-network-outline">Phân công bác sĩ phụ trách</SectionTitle>
      <ListCard>
        {data.patients.map((p) => (
          <View key={p.id} style={{ gap: 8, paddingVertical: 12 }}>
            <Text style={{ fontWeight: '700', color: C.text }}>{p.code}</Text>
            <Choices value={p.doctorId} onChange={(v) => updatePatient(p.id, { doctorId: v })} options={doctors.map((d) => ({ value: d.id, label: d.name }))} />
          </View>
        ))}
      </ListCard>
    </Screen>
  );
}
