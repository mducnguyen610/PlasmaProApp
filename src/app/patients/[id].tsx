import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { ActivationCode } from '@/components/ActivationCode';
import { NoAccess, useCanView } from '@/components/Guard';
import { Button, Card, Chip, Empty, Field, Header, IconBadge, InfoRow, Muted, Screen, SectionTitle, WoundPhoto, SwitchRow } from '@/components/ui';
import { isPendingActivation } from '@/lib/auth';
import { confirm, notify } from '@/lib/dialog';
import { buildReportHtml, shareReport } from '@/lib/report';
import { fmtDate, fmtDateTime, PLAN_STATUS, WOUND_STATUS } from '@/lib/format';
import { useLookups, useStore, type Activation } from '@/lib/store';
import { C } from '@/theme';

// BS03 – Hồ sơ bệnh nhân: thông tin, bác sĩ phụ trách, thiết bị, liệu trình, vết thương.
export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, me, updatePatient, addWound, setReportHandled, issueActivation } = useStore();
  const { patient, account, device, woundsOf, imagesOf, activePlan } = useLookups();
  const p = patient(id);
  const canView = useCanView(p);
  const [newWound, setNewWound] = useState('');
  const [reporting, setReporting] = useState(false);
  const [activation, setActivation] = useState<Activation | null>(null);
  const [issuing, setIssuing] = useState(false);
  if (!p || !canView) return <NoAccess />;

  const isDoctor = me?.role === 'doctor';
  const dev = device(p.deviceId);
  const plan = isDoctor ? activePlan(p.id) : data.plans.filter(x => x.patientId === p.id && x.confirmed && x.status !== 'draft').sort((a,b) => b.version - a.version)[0];
  const wounds = woundsOf(p.id);
  const reports = data.reports.filter((r) => r.patientId === p.id);
  const login = data.accounts.find((a) => a.patientId === p.id);
  const pending = !login || isPendingActivation(login);
  const codeLive = !!login?.activationHash && !!login.activationExpiresAt && login.activationExpiresAt > new Date().toISOString();
  const issue = async () => {
    setIssuing(true);
    try {
      setActivation(await issueActivation(p.id));
    } catch (e) {
      notify('Chưa cấp được mã', e instanceof Error ? e.message : String(e));
    } finally {
      setIssuing(false);
    }
  };

  return (
    <Screen header={<Header back title="Hồ sơ bệnh nhân" subtitle={`${p.name} · ${p.code}`} />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBadge icon="person-outline" size={48} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>{p.name}</Text>
            <Text style={{ color: C.textSoft, fontSize: 14 }}>SĐT: {p.phone || '—'} · Thiết bị: <Text style={{ color: C.primary, fontWeight: '700' }}>{dev?.code ?? 'Chưa gán'}</Text></Text>
          </View>
        </View>
        <InfoRow label="Mã hồ sơ" value={p.code} />
        <InfoRow label="Giới tính, năm sinh" value={`${p.sex}, ${p.birthYear}`} />
        <InfoRow label="Bác sĩ phụ trách" value={account(p.doctorId)?.name ?? '—'} />
        <InfoRow label="Ngày tạo hồ sơ" value={fmtDate(p.createdAt)} />
        <SwitchRow
          muted
          label="Đồng ý dùng ảnh cho nghiên cứu"
          detail={p.researchConsent ? `Ghi nhận ngày ${fmtDate(p.consentDate)}` : 'Chưa đồng ý: ảnh không được đưa vào bộ dữ liệu xuất'}
          disabled={!isDoctor}
          value={p.researchConsent}
          onChange={(v) =>
            confirm(
              v ? 'Ghi nhận đồng ý' : 'Rút lại đồng ý',
              v ? 'Xác nhận bệnh nhân đã đồng ý bằng văn bản cho việc dùng ảnh (đã mã hóa) để nghiên cứu.' : 'Ảnh của bệnh nhân sẽ không còn được xuất vào bộ dữ liệu.',
              () => updatePatient(p.id, { researchConsent: v, consentDate: v ? new Date().toISOString().slice(0, 10) : undefined }),
            )
          }
        />
      </Card>

      {isDoctor && (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconBadge icon="key-outline" tone={pending ? 'amber' : 'green'} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: C.text }}>Tài khoản đăng nhập</Text>
              <Muted>{login ? `@${login.username}` : 'Chưa có tài khoản'}</Muted>
            </View>
            <Chip label={!pending ? 'Đã kích hoạt' : codeLive ? 'Chờ kích hoạt' : 'Chưa kích hoạt'} tone={!pending ? 'green' : 'amber'} />
          </View>
          {activation && <ActivationCode activation={activation} />}
          {pending && !activation && (
            <>
              <Muted>
                {codeLive
                  ? `Đã cấp mã, hết hạn ${fmtDate(login!.activationExpiresAt!.slice(0, 10))}. Mã không hiện lại; nếu bệnh nhân làm mất, cấp mã mới (mã cũ hết hiệu lực).`
                  : 'Bệnh nhân chưa đăng nhập được. Cấp mã kích hoạt để bệnh nhân tự đặt mật khẩu.'}
              </Muted>
              <Button
                label={codeLive ? 'Cấp lại mã kích hoạt' : 'Cấp mã kích hoạt'}
                icon="key-outline"
                variant="secondary"
                loading={issuing}
                onPress={() => (codeLive ? confirm('Cấp lại mã', 'Mã cũ sẽ hết hiệu lực ngay.', issue) : issue())}
              />
            </>
          )}
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }} onPress={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id } })}>
          <IconBadge icon="flash-outline" tone="violet" size={36} />
          <Text style={{ fontWeight: '700', color: C.text }}>Liệu trình</Text>
          {plan ? <Chip label={`v${plan.version} · ${PLAN_STATUS[plan.status].label}`} tone={PLAN_STATUS[plan.status].tone} /> : <Muted>Chưa thiết lập</Muted>}
        </Card>
        <Card style={{ flex: 1 }} onPress={() => (dev ? router.push({ pathname: '/devices/[id]', params: { id: dev.id } }) : undefined)}>
          <IconBadge icon="hardware-chip-outline" tone="teal" size={36} />
          <Text style={{ fontWeight: '700', color: C.text }}>Thiết bị</Text>
          {dev ? <Chip label={dev.online ? 'Đang kết nối' : 'Mất kết nối'} tone={dev.online ? 'green' : 'gray'} /> : <Muted>Chưa gán (quản trị gán)</Muted>}
        </Card>
      </View>

      <Button
        label="Xuất báo cáo theo dõi (PDF)"
        icon="document-attach-outline"
        variant="secondary"
        loading={reporting}
        onPress={async () => {
          setReporting(true);
          try {
            const where = await shareReport(await buildReportHtml(data, p.id, me?.name ?? ''), p.code);
            notify('Đã tạo báo cáo', `Lưu tại: ${where}`);
          } catch (e) {
            notify('Chưa tạo được báo cáo', String(e));
          } finally {
            setReporting(false);
          }
        }}
      />

      <SectionTitle icon="bandage-outline">Vết thương</SectionTitle>
      {wounds.map((w) => {
        const imgs = imagesOf(w.id);
        const last = imgs[imgs.length - 1];
        return (
          <Card key={w.id} onPress={() => router.push({ pathname: '/wounds/[id]', params: { id: w.id } })}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {last ? <WoundPhoto image={last} style={{ width: 64, height: 64, borderRadius: 12 }} /> : <IconBadge icon="image-outline" size={64} tone="gray" />}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: '700', color: C.text }}>{w.code} · {w.location}</Text>
                <Muted>Theo dõi từ {fmtDate(w.startDate)} · {imgs.length} ảnh</Muted>
                <Chip label={WOUND_STATUS[w.status].label} tone={WOUND_STATUS[w.status].tone} />
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
            </View>
          </Card>
        );
      })}
      {isDoctor && <Card>
        <Field label="Thêm vết thương" value={newWound} onChangeText={setNewWound} placeholder="Vị trí, ví dụ: Gót chân phải" />
        <Button
          label="Thêm vết thương"
          variant="secondary"
          icon="add"
          disabled={!newWound.trim()}
          onPress={() => {
            const w = addWound(p.id, newWound.trim());
            setNewWound('');
            router.push({ pathname: '/wounds/[id]', params: { id: w.id } });
          }}
        />
      </Card>}

      <SectionTitle icon="chatbubble-ellipses-outline">Triệu chứng và sự cố bệnh nhân báo</SectionTitle>
      <Card>
        {reports.length === 0 && <Empty text="Chưa có báo cáo." />}
        {reports.map((r) => (
          <View key={r.id} style={{ gap: 4, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Chip label={r.kind === 'device' ? 'Sự cố thiết bị' : 'Triệu chứng'} tone={r.kind === 'device' ? 'teal' : 'red'} />
              {r.painLevel !== undefined && <Chip label={`Mức đau ${r.painLevel}/10`} tone="gray" />}
              <View style={{ flex: 1 }} />
              <Text style={{ color: C.textFaint, fontSize: 13 }}>{fmtDateTime(r.date)}</Text>
            </View>
            <Text style={{ color: C.text }}>{r.content}</Text>
            <Muted>Nguồn: bệnh nhân báo qua ứng dụng</Muted>
            {r.handled ? (
              <Chip label="Đã xử lý" tone="green" icon="checkmark" />
            ) : isDoctor ? (
              <Pressable onPress={() => setReportHandled(r.id)}>
                <Text style={{ color: C.primary, fontWeight: '600' }}>Đánh dấu đã xử lý</Text>
              </Pressable>
            ) : <Chip label="Đang chờ bác sĩ" tone="amber" />}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
