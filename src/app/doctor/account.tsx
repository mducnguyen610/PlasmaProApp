import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Disclosure, Divider, Field, Header, InfoRow, Muted, Screen, SectionTitle, type IconName } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { useStore } from '@/lib/store';
import { C, T } from '@/theme';

function Row({ icon, title, value, onPress, last }: { icon: IconName; title: string; value?: string; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={value ? `${title}, ${value}` : title}
      style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.border, opacity: pressed ? 0.7 : 1 })}>
      <Ionicons name={icon} size={22} color={C.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontWeight: '600' }}>{title}</Text>
        {value ? <Text style={{ color: C.textSoft, fontSize: T.small }}>{value}</Text> : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={20} color={C.textFaint} /> : null}
    </Pressable>
  );
}

/**
 * Logic chốt 25/11/2026 (mục 2.7; TC-8..TC-11): Cài đặt của bác sĩ, gộp Cá nhân. Từ trên xuống: Cá nhân (tài khoản, họ tên, vai trò,
 * liên hệ có email, quyền xuất dữ liệu nghiên cứu, đổi mật khẩu chỉ trên máy); Ngôn ngữ (chỉ Tiếng Việt), Thông báo (chỉ hiển thị),
 * Giao diện (chỉ Sáng); Thông tin (Điều khoản, Hướng dẫn, Căn cứ pháp lý); Đăng xuất ở cuối, tách riêng, có hộp xác nhận.
 */
export default function DoctorSettings() {
  const { me, logout, changePassword, updateMyContact } = useStore();
  const [email, setEmail] = useState(me?.email ?? '');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [askLogout, setAskLogout] = useState(false);
  if (!me) return null;
  const run = async (op: () => Promise<void>, done: string, after?: () => void) => {
    if (busy) return;
    setBusy(true);
    try { await op(); after?.(); notify(done); } catch (e) { notify('Chưa lưu được', e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <Screen header={<Header home="/doctor" title="Cài đặt" />}>
      <SectionTitle>Cá nhân</SectionTitle>
      <Card testID="cai-dat-ca-nhan">
        <InfoRow label="Tài khoản" value={`@${me.username}`} />
        <InfoRow label="Họ và tên" value={me.name} />
        <InfoRow label="Vai trò" value={`Bác sĩ${me.title ? ` · ${me.title}` : ''}`} />
        <InfoRow label="Quyền xuất dữ liệu nghiên cứu" value={<Chip label={me.researchAccess ? 'Được cấp' : 'Chưa cấp'} tone={me.researchAccess ? 'green' : 'gray'} />} />
        <Divider />
        <Text style={{ color: C.text, fontWeight: '700' }}>Liên hệ</Text>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="ten@benhvien.vn" optional />
        <Button label="Lưu email" variant="secondary" icon="save-outline" loading={busy} disabled={email.trim() === (me.email ?? '')} reason="Chưa có thay đổi."
          onPress={() => run(() => updateMyContact({ email }), 'Đã lưu email')} />
        <Divider />
        <Disclosure icon="key-outline" title="Đổi mật khẩu" summary="Chỉ đổi trên máy này (chưa có máy chủ)">
          <View style={{ gap: 10, paddingBottom: 8 }}>
            <Field label="Mật khẩu hiện tại" value={oldPw} onChangeText={setOldPw} secureTextEntry />
            <Field label="Mật khẩu mới" value={newPw} onChangeText={setNewPw} secureTextEntry hint="Ít nhất 8 ký tự." />
            <Field label="Nhập lại mật khẩu mới" value={newPw2} onChangeText={setNewPw2} secureTextEntry error={newPw2 && newPw2 !== newPw ? 'Hai mật khẩu mới chưa khớp.' : null} />
            <Button label="Đổi mật khẩu" icon="key-outline" loading={busy} disabled={!oldPw || !newPw || newPw !== newPw2} reason="Nhập đủ và khớp hai lần mật khẩu mới."
              onPress={() => run(() => changePassword(oldPw, newPw), 'Đã đổi mật khẩu', () => { setOldPw(''); setNewPw(''); setNewPw2(''); })} />
          </View>
        </Disclosure>
      </Card>

      <SectionTitle>Ứng dụng</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <Row icon="language-outline" title="Ngôn ngữ" value="Tiếng Việt (bản này chỉ có tiếng Việt)" />
        <Row icon="notifications-outline" title="Thông báo" value="Chuông luôn báo đủ: ảnh chưa đủ nhãn, ảnh cần chụp lại, phác đồ chờ bệnh nhân xác nhận, máy báo lỗi. Không điều chỉnh được." />
        <Row icon="contrast-outline" title="Giao diện" value="Sáng (bản này chỉ có giao diện sáng)" last />
      </Card>

      <SectionTitle>Thông tin</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <Row icon="shield-checkmark-outline" title="Điều khoản" onPress={() => router.push('/terms')} />
        <Row icon="help-circle-outline" title="Hướng dẫn" onPress={() => router.push('/help')} />
        <Row icon="document-text-outline" title="Căn cứ pháp lý" onPress={() => router.push('/compliance')} last />
      </Card>

      <View style={{ height: 16 }} />
      <Button label="Đăng xuất" variant="danger" icon="log-out-outline" onPress={() => setAskLogout(true)} />
      <Sheet visible={askLogout} title="Bạn có chắc chắn muốn đăng xuất không?" onClose={() => setAskLogout(false)} testID="hoi-dang-xuat">
        <Muted>Dữ liệu vẫn lưu trên máy. Đăng nhập lại để tiếp tục.</Muted>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Button label="Hủy" variant="secondary" onPress={() => setAskLogout(false)} /></View>
          <View style={{ flex: 1 }}><Button label="Đăng xuất" variant="danger" icon="log-out-outline" onPress={() => { setAskLogout(false); logout(); router.replace('/'); }} /></View>
        </View>
      </Sheet>
    </Screen>
  );
}
