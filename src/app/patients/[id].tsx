import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { ActivationCode } from '@/components/ActivationCode';
import { NoAccess, useCanView } from '@/components/Guard';
import { Button, Card, Chip, Disclosure, Divider, Field, Header, IconBadge, InfoRow, ListCard, Muted, NumberTile, Screen, SectionTitle, WoundPhoto, SwitchRow, type IconName, StatusChip, Empty } from '@/components/ui';
import { isPendingActivation } from '@/lib/auth';
import { confirm, notify } from '@/lib/dialog';
import { buildReportHtml, shareReport } from '@/lib/report';
import { fmtDate, fmtDateTime, PLAN_STATUS, WOUND_STATUS } from '@/lib/format';
import { useLookups, useStore, type Activation } from '@/lib/store';
import { C, semantic } from '@/theme';
import { CLOUD_LINK, WOUND, cloudState } from '@/theme.status';
import { courseProgress, localDay } from '@/lib/course';

// BS03 – Hồ sơ bệnh nhân: thông tin, bác sĩ phụ trách, thiết bị, liệu trình, vết thương.
export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, me, updatePatient, addWound, setReportHandled, issueActivation, assignDevice, setLifecycle } = useStore();
  const { patient, account, device, woundsOf, imagesOf, activePlan, sessionsOf } = useLookups();
  const p = patient(id);
  const canView = useCanView(p);
  const [newWound, setNewWound] = useState('');
  const [reporting, setReporting] = useState(false);
  const [activation, setActivation] = useState<Activation | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [now] = useState(() => Date.now());
  if (!p) return <NoAccess notFound />;
  if (!canView) return <NoAccess />;

  const isDoctor = me?.role === 'doctor';
  const dev = device(p.deviceId);
  const cloud = dev ? CLOUD_LINK[cloudState(dev.online, dev.lastSync, now)] : null;
  const plan = isDoctor ? activePlan(p.id) : data.plans.filter(x => x.patientId === p.id && x.confirmed && x.status !== 'draft').sort((a,b) => b.version - a.version)[0];
  const pr = plan && dev ? courseProgress(plan, sessionsOf(dev.id), localDay(), dev.lastSync ? localDay(dev.lastSync) : null) : null;
  const wounds = woundsOf(p.id);
  const reports = data.reports.filter((r) => r.patientId === p.id);
  const login = data.accounts.find((a) => a.patientId === p.id);
  const pending = !login || isPendingActivation(login);
  const codeLive = !!login?.activationHash && !!login.activationExpiresAt && login.activationExpiresAt > new Date().toISOString();
  // Máy rảnh để giao: chưa gán ai và đã qua khử khuẩn, kiểm tra (vòng đời sẵn sàng).
  const freeDevices = data.devices.filter((d) => !d.patientId && (d.lifecycle ?? 'ready') === 'ready');
  const giveDevice = (deviceId: string) => {
    try {
      assignDevice(deviceId, p.id);
    } catch (e) {
      notify('Chưa giao được máy', e instanceof Error ? e.message : String(e));
    }
  };
  const takeBack = () =>
    confirm('Thu hồi máy', 'Gỡ máy khỏi bệnh nhân và bỏ đầu phát đang dùng. Máy chuyển sang chờ khử khuẩn.', () => {
      try {
        if (dev?.lifecycle === 'in_use') setLifecycle(dev.id, 'returned');
        else if (dev) assignDevice(dev.id, null);
      } catch (e) {
        notify('Chưa thu hồi được', e instanceof Error ? e.message : String(e));
      }
    }, 'Thu hồi');
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
      {/* Một thẻ hồ sơ: đầu thẻ, các dòng chạm được (tài khoản, liệu trình, thiết bị), thông tin hành chính thu gọn. */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBadge icon="person-outline" size={48} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>{p.name}</Text>
            <Text style={{ color: C.textSoft, fontSize: 14 }}>{p.code} · {p.sex}, {p.birthYear}</Text>
          </View>
        </View>
        <Divider />
        {isDoctor && (
          <>
            <LinkRow icon="key-outline" tone={pending ? 'amber' : 'green'} title="Tài khoản" sub={login ? `@${login.username}` : 'Chưa có tài khoản'}
              right={<Chip label={!pending ? 'Đã kích hoạt' : codeLive ? 'Chờ kích hoạt' : 'Chưa kích hoạt'} tone={!pending ? 'green' : 'amber'} />} />
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
          </>
        )}
        {/* Ô số: tiến độ đợt (neutral) và kênh Wi-Fi của thiết bị (tông theo CLOUD_LINK, V02, V07), chạm để mở. */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <NumberTile icon="flash-outline" tone="gray" value={pr ? `${pr.done}/${pr.total}` : plan ? `v${plan.version}` : '—'} label={pr && plan?.status === 'active' ? 'Buổi đã làm' : plan ? PLAN_STATUS[plan.status].label : 'Chưa lập đợt'}
            onPress={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id } })} />
          <NumberTile icon={(cloud ? cloud.icon : 'hardware-chip-outline') as IconName} tone={cloud ? semantic[cloud.role].tone : 'amber'} value={dev?.code ?? '—'} label={cloud ? cloud.label : 'Chưa gán thiết bị'}
            onPress={dev ? () => router.push({ pathname: '/devices/[id]', params: { id: dev.id } }) : undefined} />
        </View>
        {/* Giao máy, thu hồi thuộc bác sĩ phụ trách (UR11). */}
        {isDoctor && (
          <Disclosure icon="hardware-chip-outline" title="Giao máy" summary={dev ? `Đang giữ ${dev.code}` : freeDevices.length ? `${freeDevices.length} máy sẵn sàng` : 'Không có máy sẵn sàng'}>
            {dev ? (
              <Button label={`Thu hồi ${dev.code}`} variant="secondary" icon="return-down-back-outline" onPress={takeBack} />
            ) : freeDevices.length === 0 ? (
              <Muted>Chưa có máy nào đã khử khuẩn và kiểm tra xong. Quản trị kỹ thuật cập nhật vòng đời máy.</Muted>
            ) : (
              freeDevices.map((d) => <Button key={d.id} label={`Giao ${d.code}`} variant="secondary" icon="arrow-forward-circle-outline" onPress={() => giveDevice(d.id)} />)
            )}
          </Disclosure>
        )}
        <Divider />
        <Disclosure title="Thông tin hồ sơ" summary={`${account(p.doctorId)?.name ?? 'Chưa có bác sĩ'} · ${p.researchConsent ? 'đồng ý nghiên cứu' : 'chưa đồng ý nghiên cứu'}`}>
          <InfoRow label="SĐT" value={p.phone || '—'} />
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
                () => updatePatient(p.id, { researchConsent: v, consentDate: v ? localDay() : undefined }),
              )
            }
          />
        </Disclosure>
      </Card>


      <SectionTitle icon="bandage-outline">Vết thương</SectionTitle>
      <ListCard>
      {wounds.map((w) => {
        const imgs = imagesOf(w.id);
        const last = imgs[imgs.length - 1];
        return (
          <Pressable key={w.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/wounds/[id]', params: { id: w.id } })} style={({ pressed }) => ({ paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {last ? <WoundPhoto image={last} style={{ width: 64, height: 64, borderRadius: 12 }} /> : <IconBadge icon="image-outline" size={64} tone="gray" />}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: '700', color: C.text }}>{w.code} · {w.location}</Text>
                <Muted>Theo dõi từ {fmtDate(w.startDate)} · {imgs.length} ảnh</Muted>
                <StatusChip status={WOUND[w.status]} label={WOUND_STATUS[w.status].label} />
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
            </View>
          </Pressable>
        );
      })}
      {isDoctor && <View style={{ paddingVertical: 4 }}><Disclosure icon="add-circle-outline" title="Thêm vết thương">
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
      </Disclosure></View>}
      </ListCard>

      <SectionTitle icon="chatbubble-ellipses-outline">Triệu chứng và sự cố bệnh nhân báo</SectionTitle>
      {reports.length === 0 ? <Empty icon="chatbubble-ellipses-outline" text="Bệnh nhân chưa gửi báo cáo triệu chứng hay sự cố nào." /> : <Card>
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
      </Card>}

      {/* Xuất PDF đặt cuối màn để không giành chú ý với nội dung lâm sàng (V28). */}
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
    </Screen>
  );
}

/** Một dòng trong thẻ hồ sơ: biểu tượng, tên, phụ đề, giá trị bên phải; có mũi tên khi chạm được. */
function LinkRow({ icon, tone, title, sub, right, onPress }: { icon: IconName; tone: 'violet' | 'teal' | 'amber' | 'green'; title: string; sub?: string; right?: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
      <IconBadge icon={icon} tone={tone} size={36} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: C.text }}>{title}</Text>
        {sub ? <Text style={{ color: C.textSoft, fontSize: 14 }}>{sub}</Text> : null}
      </View>
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={C.textFaint} /> : null}
    </Pressable>
  );
}
