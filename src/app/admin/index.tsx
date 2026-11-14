import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { NoAccess } from '@/components/Guard';
import { Button, Chip, Choices, Disclosure, Empty, Header, LinkRow, ListCard, Muted, Notice, NumberTile, Screen, SearchField, Segmented, TextLink } from '@/components/ui';
import { ACCOUNT_STATUS, accountDisplayName, accountStatus, filterAccounts, ROLE_LABEL, ROLE_PERMISSIONS, type AccountStatus } from '@/lib/adminView';
import { confirm } from '@/lib/dialog';
import { useStore } from '@/lib/store';
import type { Role } from '@/lib/types';
import { C, T } from '@/theme';

type Part = 'accounts' | 'assign';

// Q01 Quản trị (Stage 6): tổng quan có lối vào, rồi hai việc tách bằng thanh chọn: "Tài khoản" (danh sách, tìm, lọc, mở chi tiết)
// và "Phân công" (đổi bác sĩ phụ trách). Thao tác trên tài khoản chuyển sang màn chi tiết /admin-account/[id]; quyền và quy tắc giữ nguyên.
export default function AdminAccounts() {
  const { data, me, updatePatient } = useStore();
  const [part, setPart] = useState<Part>('accounts');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<AccountStatus | 'all'>('all');
  const [role, setRole] = useState<Role | 'all'>('all');
  const [roleOpen, setRoleOpen] = useState(false);
  const [codeQuery, setCodeQuery] = useState('');
  // UX-04 (Đợt 8): hồ sơ đang mở bảng chọn bác sĩ, và lần đổi vừa xong (để hoàn tác). Quyền và quy tắc phân công giữ nguyên.
  const [picking, setPicking] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState<{ patientId: string; from: string; to: string } | null>(null);
  if (!me || me.role !== 'admin') return <NoAccess />;

  const doctors = data.accounts.filter((a) => a.role === 'doctor' && !a.locked && !a.pendingApproval);
  // Tổng quan hệ thống: chỉ đếm, không hiển thị dữ liệu lâm sàng.
  const usable = data.images.filter((i) => i.status !== 'excluded').length;
  const labeled = data.images.filter((i) => i.status === 'labeled').length;
  const pct = usable ? Math.round((labeled / usable) * 100) : 0;
  const online = data.devices.filter((d) => d.online).length;
  const pending = data.accounts.filter((a) => a.pendingApproval).length;
  const openErrors = data.syncErrors.filter((e) => !e.resolved).length;
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

  const shown = filterAccounts(data, query, status, role);
  const filtered = !!query.trim() || status !== 'all' || role !== 'all';
  const code = codeQuery.trim().toLowerCase();
  const patients = data.patients.filter((p) => !code || p.code.toLowerCase().includes(code));

  return (
    <Screen header={<Header title="Quản lý tài khoản" />}>
      {/* A. Tổng quan: ba ô cần chú ý, mỗi ô là lối vào việc tương ứng. Số liệu còn lại thu gọn. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <NumberTile value={pending} label="Chờ duyệt" tone={pending ? 'amber' : 'gray'} icon="hourglass-outline"
          onPress={() => { setPart('accounts'); setStatus('pending'); setRole('all'); setQuery(''); }} />
        <NumberTile value={`${online}/${data.devices.length}`} label="Trực tuyến" tone={online < data.devices.length ? 'amber' : 'gray'} icon="cloud-done-outline"
          onPress={() => router.navigate('/admin/devices')} />
        <NumberTile value={openErrors} label="Lỗi chưa xử lý" tone={openErrors ? 'red' : 'gray'} icon="alert-circle-outline"
          onPress={() => router.navigate('/admin/logs')} />
      </View>
      <Disclosure icon="stats-chart-outline" title="Số liệu khác" summary={`${data.accounts.length} tài khoản · ảnh đã đo ${pct}%`}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <NumberTile value={data.accounts.length} label="Tài khoản" tone="gray" icon="people-outline" />
          <NumberTile value={`${pct}%`} label={`Ảnh đã đo (${labeled}/${usable})`} tone="gray" icon="image-outline" />
        </View>
        <Muted>Chỉ hiển thị mã hồ sơ, không có dữ liệu lâm sàng.</Muted>
      </Disclosure>

      <Segmented<Part> value={part} onChange={setPart} options={[{ value: 'accounts', label: 'Tài khoản' }, { value: 'assign', label: 'Phân công' }]} />

      {part === 'accounts' ? (
        <>
          <SearchField label="Tìm tài khoản" placeholder="Tên, mã hồ sơ, @tên đăng nhập" value={query} onChangeText={setQuery} />
          <Choices<AccountStatus | 'all'> value={status} onChange={setStatus} options={[
            { value: 'all', label: 'Tất cả' },
            { value: 'pending', label: `Chờ duyệt (${pending})` },
            { value: 'active', label: 'Hoạt động' },
            { value: 'locked', label: 'Đã khóa' },
          ]} />
          {/* Lọc vai trò ít dùng hơn lọc trạng thái nên thu gọn, phần tóm tắt nêu vai trò đang chọn. */}
          <Disclosure icon="funnel-outline" title="Lọc theo vai trò" summary={role === 'all' ? 'Mọi vai trò' : ROLE_LABEL[role]} open={roleOpen} onToggle={setRoleOpen}>
            <Choices<Role | 'all'> value={role} onChange={setRole} options={[
              { value: 'all', label: 'Mọi vai trò' },
              { value: 'doctor', label: ROLE_LABEL.doctor },
              { value: 'patient', label: ROLE_LABEL.patient },
              { value: 'admin', label: ROLE_LABEL.admin },
            ]} />
          </Disclosure>
          <Text style={{ color: C.textSoft, fontSize: T.small }} accessibilityLiveRegion="polite">
            {filtered ? `${shown.length}/${data.accounts.length} tài khoản khớp` : `${data.accounts.length} tài khoản`}
          </Text>
          {shown.length === 0 ? (
            <>
              <Empty icon="search-outline" text="Không có tài khoản khớp bộ lọc." />
              <Button label="Bỏ lọc" variant="secondary" onPress={() => { setQuery(''); setStatus('all'); setRole('all'); }} />
            </>
          ) : (
            <ListCard>
              {shown.map((a) => {
                const st = ACCOUNT_STATUS[accountStatus(a)];
                return (
                  <View key={a.id} style={{ paddingVertical: 6 }}>
                    <LinkRow testID={`tai-khoan-${a.id}`}
                      icon={a.role === 'doctor' ? 'medkit-outline' : a.role === 'patient' ? 'person-outline' : 'construct-outline'}
                      tone={a.role === 'doctor' ? 'blue' : a.role === 'patient' ? 'green' : 'violet'}
                      title={accountDisplayName(data, a)} sub={`${ROLE_LABEL[a.role]} · @${a.username}`}
                      below={<Chip label={st.label} tone={st.tone} />}
                      accessibilityLabel={`${accountDisplayName(data, a)}, ${ROLE_LABEL[a.role]}, ${st.label}. Mở chi tiết`}
                      onPress={() => router.push({ pathname: '/admin-account/[id]', params: { id: a.id } })} />
                  </View>
                );
              })}
            </ListCard>
          )}
          {/* C. Vai trò và quyền: chỉ để tham khảo. Vai trò gắn cố định với tài khoản, ứng dụng không có thao tác đổi vai trò. */}
          <Disclosure icon="key-outline" title="Vai trò và quyền" summary="Tham khảo, không chỉnh ở đây">
            {(['doctor', 'patient', 'admin'] as const).map((r) => (
              <View key={r} style={{ gap: 4 }}>
                <Text style={{ fontWeight: '700', color: C.text }}>{ROLE_LABEL[r]}</Text>
                {ROLE_PERMISSIONS[r].map((line) => <Muted key={line}>{`• ${line}`}</Muted>)}
              </View>
            ))}
            <Muted>Quyền xuất dữ liệu nghiên cứu là quyền riêng của từng tài khoản bác sĩ hoặc quản trị, cấp hoặc thu trên màn chi tiết tài khoản.</Muted>
          </Disclosure>
        </>
      ) : (
        <>
          <Muted>Đổi bác sĩ phụ trách cho từng hồ sơ. Hồ sơ chỉ đổi sau khi xác nhận.</Muted>
          <SearchField label="Tìm mã hồ sơ" placeholder="Tìm mã hồ sơ" value={codeQuery} onChangeText={setCodeQuery} autoCapitalize="characters" />
          {patients.length === 0 ? <Empty icon="search-outline" text="Không có hồ sơ khớp mã này." /> : (
            <ListCard>
              {patients.map((p) => {
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
          )}
        </>
      )}
    </Screen>
  );
}
