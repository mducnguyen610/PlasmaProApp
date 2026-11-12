import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { Button, Card, Chip, Choices, Disclosure, Header, IconBadge, ListCard, Muted, Notice, NumberTile, Screen, SectionTitle, SwitchRow, TextLink } from '@/components/ui';
import { confirm } from '@/lib/dialog';
import { useStore } from '@/lib/store';
import type { Account } from '@/lib/types';
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
  // UX-04 (Đợt 8): hồ sơ đang mở bảng chọn bác sĩ, và lần đổi vừa xong (để hoàn tác). Quyền và quy tắc phân công giữ nguyên.
  const [picking, setPicking] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState<{ patientId: string; from: string; to: string } | null>(null);
  const nameOf = (id?: string) => data.accounts.find((a) => a.id === id)?.name ?? 'Chưa có bác sĩ';
  const reassign = (patientId: string, to: string) => {
    const p = data.patients.find((x) => x.id === patientId);
    if (!p || to === p.doctorId) return;
    const open = data.reports.filter((r) => r.patientId === p.id && !r.handled).length;
    const active = data.plans.some((x) => x.patientId === p.id && x.status === 'active' && x.confirmed);
    const facts = [open ? `${open} báo cáo chưa xử lý` : '', active ? 'đợt điều trị đang áp dụng' : ''].filter(Boolean).join(' và ');
    confirm(
      `Đổi bác sĩ phụ trách ${p.code}?`,
      `Hiện tại: ${nameOf(p.doctorId)}\nChuyển sang: ${nameOf(to)}\n\n${facts ? `${p.code} có ${facts}. ` : ''}${nameOf(p.doctorId)} sẽ không còn thấy hồ sơ này.`,
      () => {
        updatePatient(p.id, { doctorId: to });
        setLastChange({ patientId: p.id, from: p.doctorId, to });
        setPicking(null);
      },
      'Đổi bác sĩ',
    );
  };
  // UX-05 (Đợt 8): khóa tài khoản và cấp quyền xuất dữ liệu cần xác nhận; mở khóa và thu quyền đổi ngay như trước.
  const setLocked = (a: Account, v: boolean) => {
    if (!v) return updateAccount(a.id, { locked: false });
    const n = a.role === 'doctor' ? data.patients.filter((p) => p.doctorId === a.id).length : 0;
    confirm(
      `Khóa tài khoản ${a.name}?`,
      `${a.name} sẽ không đăng nhập được.${n ? ` Tài khoản đang phụ trách ${n} bệnh nhân; hãy phân công bác sĩ khác nếu cần.` : ''}`,
      () => updateAccount(a.id, { locked: true }),
      'Khóa tài khoản',
    );
  };
  const setResearch = (a: Account, v: boolean) => {
    if (!v) return updateAccount(a.id, { researchAccess: false });
    confirm(
      `Cấp quyền xuất dữ liệu cho ${a.name}?`,
      `${a.name} sẽ tải được ảnh vết thương và diện tích của các bệnh nhân đã đồng ý nghiên cứu.`,
      () => updateAccount(a.id, { researchAccess: true }),
      'Cấp quyền',
    );
  };
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
                      <SwitchRow label="Khóa tài khoản" value={a.locked} onChange={(v) => setLocked(a, v)} />
                    ) : <Muted>Tài khoản đang đăng nhập.</Muted>}
                    {(a.role === 'doctor' || a.role === 'admin') && !a.pendingApproval && (
                      <SwitchRow label="Quyền xuất dữ liệu nghiên cứu" value={!!a.researchAccess} onChange={(v) => setResearch(a, v)} />
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
        {data.patients.map((p) => {
          const others = doctors.filter((d) => d.id !== p.doctorId);
          const changed = lastChange?.patientId === p.id && lastChange.to === p.doctorId ? lastChange : null;
          return (
            <View key={p.id} style={{ gap: 8, paddingVertical: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: C.text }}>{p.code}</Text>
                  <Muted>{nameOf(p.doctorId)}</Muted>
                </View>
                {others.length > 0 && (
                  <Button label={picking === p.id ? 'Đóng' : 'Đổi'} variant="secondary"
                    onPress={() => setPicking(picking === p.id ? null : p.id)} style={{ minWidth: 88 }} />
                )}
              </View>
              {picking === p.id && (
                <>
                  <Muted>Chọn bác sĩ mới. Hồ sơ chỉ đổi sau khi xác nhận.</Muted>
                  <Choices value="" onChange={(v) => reassign(p.id, v)} options={others.map((d) => ({ value: d.id, label: d.name }))} />
                </>
              )}
              {changed && (
                <Notice tone="green" icon="checkmark-circle-outline">
                  {`Đã chuyển ${p.code} từ ${nameOf(changed.from)} sang ${nameOf(changed.to)}.`}
                </Notice>
              )}
              {changed && (
                <TextLink label="Hoàn tác" accessibilityLabel={`Hoàn tác, trả ${p.code} về ${nameOf(changed.from)}`}
                  onPress={() => { updatePatient(p.id, { doctorId: changed.from }); setLastChange(null); }} />
              )}
            </View>
          );
        })}
      </ListCard>
    </Screen>
  );
}
