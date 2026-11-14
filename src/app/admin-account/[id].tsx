import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { NoAccess } from '@/components/Guard';
import { Button, Card, Chip, Disclosure, Header, InfoRow, Muted, Notice, Screen, SectionTitle } from '@/components/ui';
import { ACCOUNT_STATUS, accountDisplayName, accountStatus, ROLE_LABEL, ROLE_PERMISSIONS } from '@/lib/adminView';
import { confirm } from '@/lib/dialog';
import { useStore } from '@/lib/store';
import type { Account } from '@/lib/types';
import { C } from '@/theme';

// Q01b Chi tiết tài khoản (Stage 6): tác vụ toàn màn, mở từ danh sách Q01. Phần trên chỉ xem (thông tin, trạng thái, quyền);
// phần "Thao tác" là các thao tác cũ của Q01 với cùng quy tắc xác nhận (UX-05, Đợt 8): khóa và cấp quyền hỏi trước,
// mở khóa, thu quyền và duyệt đổi ngay. Không có thao tác đổi vai trò, sửa tên hay tạo tài khoản vì kho dữ liệu chưa hỗ trợ.
export default function AdminAccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, me, updateAccount } = useStore();
  const [done, setDone] = useState<string | null>(null);
  if (!me || me.role !== 'admin') return <NoAccess />;
  const a = data.accounts.find((x) => x.id === id);
  if (!a) return <NoAccess notFound />;

  const name = accountDisplayName(data, a);
  const st = ACCOUNT_STATUS[accountStatus(a)];
  const isMe = a.id === me.id;
  const managed = a.role === 'doctor' ? data.patients.filter((p) => p.doctorId === a.id).length : 0;
  const research = (a.role === 'doctor' || a.role === 'admin') && !a.pendingApproval;
  const run = (patch: Partial<Account>, message: string) => { updateAccount(a.id, patch); setDone(message); };

  const lock = () => confirm(
    `Khóa tài khoản ${a.name}?`,
    `${a.name} sẽ không đăng nhập được.${managed ? ` Tài khoản đang phụ trách ${managed} bệnh nhân; hãy phân công bác sĩ khác nếu cần.` : ''}`,
    () => run({ locked: true }, 'Đã khóa tài khoản.'),
    'Khóa tài khoản',
  );
  const grant = () => confirm(
    `Cấp quyền xuất dữ liệu cho ${a.name}?`,
    `${a.name} sẽ tải được ảnh vết thương và diện tích của các bệnh nhân đã đồng ý nghiên cứu.`,
    () => run({ researchAccess: true }, 'Đã cấp quyền xuất dữ liệu nghiên cứu.'),
    'Cấp quyền',
  );

  return (
    <Screen header={<Header back title={name} subtitle={ROLE_LABEL[a.role]} />}>
      {done && <Notice tone="green" icon="checkmark-circle-outline">{done}</Notice>}
      <Card hero>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Chip label={st.label} tone={st.tone} />
          {isMe && <Chip label="Đang đăng nhập" tone="gray" />}
        </View>
        <InfoRow label="Tên đăng nhập" value={`@${a.username}`} />
        <InfoRow label="Vai trò" value={ROLE_LABEL[a.role]} />
        {a.title ? <InfoRow label="Chức danh" value={a.title} /> : null}
        {a.role === 'doctor' && <InfoRow label="Bệnh nhân phụ trách" value={String(managed)} />}
        {a.role === 'patient' && <Muted>Tài khoản bệnh nhân chỉ hiện mã hồ sơ, không hiện họ tên và dữ liệu lâm sàng.</Muted>}
      </Card>

      <SectionTitle>Quyền</SectionTitle>
      <Card>
        {research ? (
          <InfoRow label="Xuất dữ liệu nghiên cứu" value={<Chip label={a.researchAccess ? 'Được cấp' : 'Chưa cấp'} tone={a.researchAccess ? 'green' : 'gray'} />} />
        ) : (
          <Muted>{a.role === 'patient' ? 'Vai trò bệnh nhân không có quyền xuất dữ liệu.' : 'Duyệt tài khoản trước khi cấp quyền xuất dữ liệu.'}</Muted>
        )}
        <Disclosure title={`Quyền của vai trò ${ROLE_LABEL[a.role].toLowerCase()}`}>
          {ROLE_PERMISSIONS[a.role].map((line) => <Muted key={line}>{`• ${line}`}</Muted>)}
          <Muted>Vai trò gắn cố định với tài khoản; ứng dụng không có thao tác đổi vai trò.</Muted>
        </Disclosure>
      </Card>

      <SectionTitle>Thao tác</SectionTitle>
      <Card>
        {a.pendingApproval && (
          <Button label="Duyệt tài khoản" icon="checkmark-circle-outline" onPress={() => run({ pendingApproval: false, locked: false }, 'Đã duyệt tài khoản.')} />
        )}
        {isMe ? (
          <Muted>Tài khoản đang đăng nhập, không khóa được.</Muted>
        ) : a.locked ? (
          <Button label="Mở khóa tài khoản" variant="secondary" icon="lock-open-outline" onPress={() => run({ locked: false }, 'Đã mở khóa tài khoản.')} />
        ) : (
          <Button label="Khóa tài khoản" variant="danger" icon="lock-closed-outline" onPress={lock} />
        )}
        {research && (a.researchAccess ? (
          <Button label="Thu quyền xuất dữ liệu" variant="secondary" icon="remove-circle-outline" onPress={() => run({ researchAccess: false }, 'Đã thu quyền xuất dữ liệu nghiên cứu.')} />
        ) : (
          <Button label="Cấp quyền xuất dữ liệu" variant="secondary" icon="key-outline" onPress={grant} />
        ))}
        <Text style={{ color: C.textSoft }}>Khóa tài khoản và cấp quyền xuất dữ liệu cần xác nhận trước khi đổi.</Text>
      </Card>
    </Screen>
  );
}
