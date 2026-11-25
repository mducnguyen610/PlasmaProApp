import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { ActivationCode } from '@/components/ActivationCode';
import { noteNeedsAttention, noteText } from '@/components/AdherenceCalendar';
import { NoAccess, useCanView } from '@/components/Guard';
import { Button, Card, Chip, Disclosure, Divider, Field, Header, InfoRow, LinkRow, ListCard, Muted, Notice, PatientAvatar, Screen, SectionTitle, WoundPhoto, StatusChip, Empty, TextLink } from '@/components/ui';
import { isPendingActivation } from '@/lib/auth';
import { confirm, notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime, PLAN_STATUS, WOUND_STATUS } from '@/lib/format';
import { formatAreaDisplay } from '@/lib/naming';
import { archiveBlocker } from '@/lib/patientRecord';
import { deviceStatus, hasActivePlan } from '@/lib/deviceState';
import { woundSummary } from '@/lib/woundSummary';
import { useLookups, useStore, type Activation } from '@/lib/store';
import { C, numeric, T } from '@/theme';
import { CLOUD_LINK, WOUND, cloudState } from '@/theme.status';
import { localDay } from '@/lib/course';
import { birthLabel } from '@/lib/patientIdentity';
import { CARE_STATUS, patientCareStatus, woundCareStatus, woundUpdatedAt } from '@/lib/woundStatus';
import { isOpenStatus, protocolsOfWound } from '@/lib/planLifecycle';

// BS03 – Hồ sơ bệnh nhân: thông tin, bác sĩ phụ trách, thiết bị, liệu trình, vết thương.
export default function PatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, me, setPatientArchived, addWound, setReportHandled, issueActivation, assignDevice, setLifecycle } = useStore();
  const { patient, account, device, woundsOf, imagesOf, sessionsOf } = useLookups();
  const p = patient(id);
  const canView = useCanView(p);
  const [newWound, setNewWound] = useState('');
  const [activation, setActivation] = useState<Activation | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [now] = useState(() => Date.now());
  if (!p) return <NoAccess notFound />;
  if (!canView) return <NoAccess />;

  const isDoctor = me?.role === 'doctor';
  // Giai đoạn B (CN1 H9): bác sĩ khác xem được hồ sơ và lịch sử, không sửa. Mọi nút sửa chỉ cho bác sĩ phụ trách.
  const isOwner = isDoctor && p.doctorId === me?.id;
  // Hồ sơ đã lưu trữ: chỉ xem. Ẩn các nút tạo dữ liệu mới; store cũng từ chối (requireDoctor), không chỉ dựa vào việc ẩn nút.
  const archived = !!p.archivedAt;
  const canEdit = isOwner && !archived;
  const dev = device(p.deviceId);
  const cloud = dev ? CLOUD_LINK[cloudState(dev.online, dev.lastSync, now)] : null;
  // Giai đoạn B (CN1 H6): vết mới cập nhật trước (ảnh, phác đồ, phiên, mốc liền thương, sửa vị trí).
  const updatedOf = (wid: string) => { const w = data.wounds.find((x) => x.id === wid)!; return woundUpdatedAt(w, data.images, data.plans, data.sessions); };
  const wounds = [...woundsOf(p.id)].sort((a, b) => updatedOf(b.id).localeCompare(updatedOf(a.id)) || b.code.localeCompare(a.code));
  // CN1 H7 (XN-12): trạng thái chung theo ưu tiên đang điều trị > cần tái khám > chưa điều trị > đã kết thúc.
  const overall = CARE_STATUS[patientCareStatus(wounds, data.plans)];
  const reports = data.reports.filter((r) => r.patientId === p.id);
  // P1-02a (A-11): báo cáo chưa xử lý trước, đã xử lý thu gọn.
  const openReports = reports.filter((r) => !r.handled);
  const doneReports = reports.filter((r) => r.handled);
  // UX-09 a (Đợt 11): ghi chú sau buổi điều trị có đau từ 7, đỏ da hoặc sưng hiện cùng khối báo cáo. Chỉ hiển thị;
  // không tính vào điểm chú ý, không tạo báo cáo (QĐ-3 chưa đổi).
  const flaggedNotes = dev ? sessionsOf(dev.id)
    .map((s) => ({ s, n: data.sessionNotes.find((x) => x.sessionId === s.sessionId) }))
    .filter((x): x is { s: (typeof x)['s']; n: NonNullable<(typeof x)['n']> } => !!x.n && noteNeedsAttention(x.n))
    .sort((a, b) => b.s.start.localeCompare(a.s.start)) : [];
  const login = data.accounts.find((a) => a.patientId === p.id);
  const pending = !login || isPendingActivation(login);
  const codeLive = !!login?.activationHash && !!login.activationExpiresAt && login.activationExpiresAt > new Date().toISOString();
  // Máy rảnh để giao: chưa gán ai, đã khử khuẩn (Sẵn sàng) và không báo lỗi (CN4 D2).
  const freeDevices = data.devices.filter((d) => !d.patientId && deviceStatus(d) === 'ready');
  // CN4 D2: chỉ giao khi bệnh nhân có phác đồ đang hoạt động; store kiểm lại (assignBlocker).
  const noActivePlan = !hasActivePlan(data.plans, p.id);
  // UX-07 (Đợt 8): giao máy cần xác nhận, nêu mã máy và hồ sơ, vì giao nhầm thì thu hồi kéo theo khử khuẩn. Quy tắc giao giữ nguyên.
  const giveDevice = (deviceId: string, code: string) =>
    confirm(
      `Giao ${code} cho ${p.name}?`,
      `Mã hồ sơ ${p.code}. Liệu trình nạp xuống máy và các phiên điều trị sẽ gắn với hồ sơ này. Nếu giao nhầm, thu hồi sẽ chuyển máy sang chờ khử khuẩn.`,
      async () => {
        try {
          await assignDevice(deviceId, p.id);
        } catch (e) {
          notify('Chưa giao được máy', e instanceof Error ? e.message : String(e));
        }
      },
      `Giao ${code}`,
    );
  const takeBack = () =>
    confirm('Thu hồi máy', 'Gỡ máy khỏi bệnh nhân và bỏ đầu phát đang dùng. Máy chuyển sang chờ khử khuẩn.', async () => {
      try {
        if (dev) await setLifecycle(dev.id, 'returned');
      } catch (e) {
        notify('Chưa thu hồi được', e instanceof Error ? e.message : String(e));
      }
    }, 'Thu hồi');
  const archiveWhy = archiveBlocker(p, data.devices);
  const runArchive = async (next: boolean) => {
    if (archiving) return;
    setArchiving(true);
    try {
      await setPatientArchived(p.id, next);
      notify(next ? 'Đã lưu trữ hồ sơ' : 'Đã khôi phục hồ sơ', next
        ? `${p.name} (${p.code}) không còn trong danh sách đang theo dõi. Xem lại ở mục "Hồ sơ đã lưu trữ" của màn Bệnh nhân.`
        : `${p.name} (${p.code}) đã trở lại danh sách đang theo dõi.`);
    } catch (e) {
      notify(next ? 'Chưa lưu trữ được' : 'Chưa khôi phục được', e instanceof Error ? e.message : String(e));
    } finally {
      setArchiving(false);
    }
  };
  const askArchive = () =>
    confirm(
      `Lưu trữ hồ sơ ${p.name}?`,
      `Hồ sơ ${p.code} sẽ được lưu trữ, không bị xóa. Hồ sơ rời danh sách đang theo dõi và chỉ xem được: không thêm ảnh, đánh giá, đợt điều trị, vết thương hay giao máy mới. Toàn bộ lịch sử lâm sàng (vết thương, ảnh, số đo, đánh giá, đợt và buổi điều trị) được giữ nguyên. Có thể khôi phục hồ sơ sau.`,
      () => { void runArchive(true); },
      'Lưu trữ hồ sơ',
    );
  const askRestore = () =>
    confirm(`Khôi phục hồ sơ ${p.name}?`, `Hồ sơ ${p.code} trở lại danh sách đang theo dõi và có thể thêm dữ liệu mới.`, () => { void runArchive(false); }, 'Khôi phục');
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
      {/* P1-02a: thứ tự theo việc lâm sàng: định danh, vết thương, cần xử lý, đợt điều trị, rồi thiết bị và tài khoản, thông tin hồ sơ. */}
      {/* Stage 9A: khối định danh là khối chính của màn (hero): ký hiệu chữ cái đầu, họ tên lớn, dòng mã, rồi trạng thái. */}
      <Card hero style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <PatientAvatar name={p.name} size={52} muted={archived} />
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={{ fontSize: T.titleL, lineHeight: 26, fontWeight: '700', color: C.text }}>{p.name}</Text>
            {/* P1-07a: cùng định dạng với thanh ngữ cảnh và thẻ B02. */}
          </View>
        </View>
        {/* Giai đoạn 1 giao diện theo tác vụ: trạng thái cần biết ngay ở thẻ định danh (máy và kết nối, việc chờ xử lý).
            Chỉ đếm và hiển thị dữ liệu sẵn có; nội dung báo cáo vẫn ở mục "Triệu chứng và sự cố" bên dưới. */}
        <View testID="trang-thai-ho-so" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {isDoctor && <Chip label={overall.label} tone={overall.tone} icon="medkit-outline" />}
          {isDoctor && (archived
            ? <Chip label={`Đã lưu trữ ${fmtDate(localDay(p.archivedAt!))}`} tone="gray" icon="archive-outline" />
            : <Chip label="Đang theo dõi" tone="blue" icon="pulse-outline" />)}
          {dev && cloud ? <StatusChip status={cloud} label={`${dev.code} · ${cloud.label}`} /> : <Chip label="Chưa gán thiết bị" tone="gray" icon="hardware-chip-outline" />}
          {/* Giai đoạn B (CN4 D9): máy đang giữ báo lỗi thì có cảnh báo ngay ở thẻ định danh. */}
          {dev?.fault && <Chip label={`${dev.code} báo lỗi`} tone="red" icon="warning-outline" />}
          {/* Tài khoản chỉ hiện khi còn việc (chưa kích hoạt); trạng thái đầy đủ ở mục "Thiết bị và tài khoản". */}
          {isOwner && pending && <StatusChip status={{ role: 'warning', icon: 'time-outline' }} label={codeLive ? 'Chờ kích hoạt' : 'Chưa kích hoạt'} />}
          {/* Một chip đếm việc chờ; nội dung ở mục "Triệu chứng và sự cố" bên dưới. */}
          {openReports.length + flaggedNotes.length > 0 && <Chip tone="amber" icon="alert-circle-outline"
            label={`Cần xem: ${[openReports.length ? `${openReports.length} báo cáo` : '', flaggedNotes.length ? `${flaggedNotes.length} ghi chú` : ''].filter(Boolean).join(', ')}`} />}
        </View>
        {/* Logic chốt 25/11/2026 (mục 3.3, M11): khối thông tin cá nhân gồm mã, ngày sinh, giới tính, số điện thoại, trạng thái chung. */}
        <View testID="thong-tin-ca-nhan">
          <InfoRow label="Mã bệnh nhân" value={p.code} mono />
          <InfoRow label="Ngày sinh" value={birthLabel(p)} />
          <InfoRow label="Giới tính" value={p.sex} />
          <InfoRow label="Số điện thoại" value={p.phone || 'Chưa có'} />
          {isDoctor && <InfoRow label="Trạng thái chung" value={overall.label} />}
        </View>
        {canEdit && <Button label="Chỉnh sửa hồ sơ" icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: '/patient-edit/[id]', params: { id: p.id } })} />}
      </Card>
      {isDoctor && !isOwner && (
        <Notice icon="eye-outline" tone="gray">{`Hồ sơ do ${account(p.doctorId)?.name ?? 'bác sĩ khác'} phụ trách. Bạn chỉ xem được hồ sơ và lịch sử điều trị, không sửa.`}</Notice>
      )}
      {isDoctor && archived && (
        <Notice icon="archive-outline" tone="gray">{`Hồ sơ đã lưu trữ ngày ${fmtDate(localDay(p.archivedAt!))}${account(p.archivedBy ?? '')?.name ? ` bởi ${account(p.archivedBy ?? '')!.name}` : ''}. Lịch sử vẫn xem được; thêm hoặc sửa dữ liệu cần khôi phục hồ sơ.`}</Notice>
      )}

      <SectionTitle icon="bandage-outline">Vết thương đang quản lý</SectionTitle>
      <ListCard>
      {wounds.map((w) => {
        const imgs = imagesOf(w.id);
        const sum = woundSummary(imgs, data.evaluations.filter((e) => isDoctor || e.visibleToPatient), w.id);
        // Logic chốt 25/11/2026 (mục 3.3, M37): ảnh nhỏ khoảng 52 px lấy từ ảnh mới nhất của vết (mọi loại ảnh), kèm diện tích mới nhất và phác đồ đang hoạt động.
        const last = [...imgs].sort((a, b) => (a.captureDate || a.uploadDate).localeCompare(b.captureDate || b.uploadDate)).pop();
        const areaLine = sum.latest ? `Diện tích mới nhất ${formatAreaDisplay(sum.latest.areaCm2)} · ${fmtDate(sum.latest.captureDate)}` : 'Chưa có số đo';
        const openProto = protocolsOfWound(data.plans, p.id, w.id).find((x) => isOpenStatus(x.current.status));
        const planLine = openProto ? `${openProto.title} · ${PLAN_STATUS[openProto.current.status].label}` : 'Chưa có phác đồ hoạt động';
        return (
          <Pressable key={w.id} testID="dong-vet" accessibilityRole="button" accessibilityLabel={`${w.code}, ${w.location}, ${CARE_STATUS[woundCareStatus(w, data.plans)].label}. ${areaLine}. ${planLine}.${isDoctor && sum.newerUnmeasured.length ? ` Có ${sum.newerUnmeasured.length} ảnh mới chưa đo.` : ''}`}
            onPress={() => router.push({ pathname: '/wounds/[id]', params: { id: w.id } })} style={({ pressed }) => ({ paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {last ? <WoundPhoto image={last} style={{ width: 52, height: 52, borderRadius: 8 }} /> : (
                <View testID="chua-co-anh" style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: C.photoPlaceholder, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: C.textSoft, fontSize: 11, textAlign: 'center' }}>Chưa có ảnh</Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: '700', color: C.text }}>{w.code} · {w.location}</Text>
                {/* CN1 H7: trạng thái theo 4 mức; bước của quy trình liền thương ghi thêm khi đang chờ xác nhận lần 2. */}
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <Chip label={CARE_STATUS[woundCareStatus(w, data.plans)].label} tone={CARE_STATUS[woundCareStatus(w, data.plans)].tone} />
                  {w.status === 'awaiting_closure' && <StatusChip status={WOUND[w.status]} label={WOUND_STATUS[w.status].label} />}
                </View>
                <Text style={[{ color: C.text, fontSize: T.small, fontWeight: '500' }, numeric]}>{areaLine}</Text>
                <Text style={{ color: openProto ? C.primary : C.textSoft, fontSize: T.small, fontWeight: '600' }}>{planLine}</Text>
                {isDoctor && sum.newerUnmeasured.length > 0 ? <Text style={{ color: C.amber, fontSize: T.small, fontWeight: '600' }}>{`Có ${sum.newerUnmeasured.length} ảnh mới chưa đo`}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
            </View>
          </Pressable>
        );
      })}
      {wounds.length === 0 && <Muted>Chưa có vết thương.</Muted>}
      {canEdit && <View style={{ paddingVertical: 4 }}><Disclosure icon="add-circle-outline" title="Thêm vết thương">
        <Field label="Vị trí vết thương" value={newWound} onChangeText={setNewWound} placeholder="Ví dụ: Gót chân phải" />
        <Button
          label="Thêm vết thương"
          variant="secondary"
          icon="add"
          disabled={!newWound.trim()}
          onPress={async () => {
            try {
              const w = await addWound(p.id, newWound.trim());
              setNewWound('');
              router.push({ pathname: '/wounds/[id]', params: { id: w.id } });
            } catch (e) {
              notify('Chưa thêm được vết thương', e instanceof Error ? e.message : String(e));
            }
          }}
        />
      </Disclosure></View>}
      </ListCard>

      <SectionTitle icon="chatbubble-ellipses-outline">Triệu chứng và sự cố bệnh nhân báo</SectionTitle>
      {flaggedNotes.length > 0 && <Card>
        {flaggedNotes.map(({ s, n }) => (
          <View key={s.sessionId} accessible accessibilityLabel={`Ghi sau buổi điều trị ${fmtDate(s.start)}: ${noteText(n)}`} style={{ gap: 4, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip label={`Ghi sau buổi điều trị ${fmtDate(s.start).slice(0, 5)}`} tone="amber" icon="create-outline" />
            </View>
            <Text style={{ color: C.text }}>{noteText(n)}</Text>
            <Muted>Nguồn: bệnh nhân ghi cảm giác sau buổi điều trị. Chỉ hiển thị, không phải báo cáo cần đánh dấu.</Muted>
          </View>
        ))}
      </Card>}
      {reports.length === 0 ? (flaggedNotes.length ? null : <Empty icon="chatbubble-ellipses-outline" text="Bệnh nhân chưa gửi báo cáo triệu chứng hay sự cố nào." />) : <Card>
        {openReports.length === 0 ? <Muted>Không có báo cáo chưa xử lý.</Muted> : openReports.map((r) => <ReportRow key={r.id} r={r} isDoctor={isOwner} onHandle={async () => { try { await setReportHandled(r.id); } catch (e) { notify('Chưa đánh dấu được', e instanceof Error ? e.message : String(e)); } }} />)}
        {doneReports.length > 0 && (
          <Disclosure title={`Đã xử lý (${doneReports.length})`} summary="Báo cáo bác sĩ đã đánh dấu">
            {doneReports.map((r) => <ReportRow key={r.id} r={r} isDoctor={isOwner} />)}
          </Disclosure>
        )}
      </Card>}

      {/* Logic chốt 25/11/2026 (mục 3.3, D8): thiết bị đang giữ ở cấp bệnh nhân, tối đa một máy, dùng cho mọi vết. */}
      <SectionTitle icon="hardware-chip-outline">Thiết bị đang giữ</SectionTitle>
      <Card>
        <View testID="thiet-bi-dang-giu">
          <InfoRow label="Thiết bị" value={dev ? `${dev.code}${cloud ? ` · ${cloud.label}` : ''}${dev.fault ? ' · báo lỗi' : ''}` : 'Chưa giữ máy nào'} />
        </View>
        <Divider />
        {/* Lối vào lịch sử điều trị: nhật ký thiết bị và buổi điều trị (B13), luôn hiện thay vì nằm trong mục thu gọn. */}
        {/* Chỉ hiện khi đã gán máy; chưa gán thì mục "Thiết bị và tài khoản" bên dưới đã nói rõ. */}
        {dev && (
          <>
            <LinkRow icon="time-outline" tone="teal" title="Lịch sử điều trị" sub={`${dev.code} · buổi điều trị, tiến độ`}
              onPress={() => router.push({ pathname: '/devices/[id]', params: { id: dev.id } })} />
            <Divider />
          </>
        )}
        <Disclosure icon="hardware-chip-outline" title="Thiết bị và tài khoản" initiallyOpen={isOwner && (pending || !dev)}
          summary={`${dev ? dev.code : 'Chưa gán thiết bị'}${isOwner ? ` · ${!pending ? 'đã kích hoạt' : codeLive ? 'chờ kích hoạt' : 'chưa kích hoạt'}` : ''}`}>
        {isOwner && (
          <>
            <LinkRow icon="key-outline" tone={pending ? 'amber' : 'green'} title="Tài khoản" sub={login ? `@${login.username}` : 'Chưa có tài khoản'}
              right={<StatusChip status={{ role: !pending ? 'success' : 'warning', icon: !pending ? 'checkmark-circle-outline' : 'time-outline' }} label={!pending ? 'Đã kích hoạt' : codeLive ? 'Chờ kích hoạt' : 'Chưa kích hoạt'} />} />
            {activation && <ActivationCode activation={activation} />}
            {pending && !activation && !archived && (
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
        {/* Giao máy, thu hồi thuộc bác sĩ phụ trách (UR11). */}
        {canEdit && (
          <Disclosure icon="hardware-chip-outline" title="Giao máy" summary={dev ? `Đang giữ ${dev.code}` : noActivePlan ? 'Cần phác đồ đang hoạt động' : freeDevices.length ? `${freeDevices.length} máy sẵn sàng` : 'Không có máy sẵn sàng'}>
            {dev ? (
              <Button label={`Thu hồi ${dev.code}`} variant="secondary" icon="return-down-back-outline" onPress={takeBack} />
            ) : noActivePlan ? (
              <Muted>Bệnh nhân chưa có phác đồ đang hoạt động. Lập và xác nhận phác đồ trước khi giao máy.</Muted>
            ) : freeDevices.length === 0 ? (
              <>
                <Muted>Chưa có máy Sẵn sàng. Máy đã thu hồi cần được đánh dấu Đã khử khuẩn ở danh sách thiết bị.</Muted>
                <TextLink label="Mở danh sách thiết bị" onPress={() => router.push('/devices')} />
              </>
            ) : (
              freeDevices.map((d) => <Button key={d.id} label={`Giao ${d.code}`} variant="secondary" icon="arrow-forward-circle-outline" onPress={() => giveDevice(d.id, d.code)} />)
            )}
          </Disclosure>
        )}
        </Disclosure>
        <Divider />
        <Disclosure title="Thông tin hồ sơ" summary={`${account(p.doctorId)?.name ?? 'Chưa có bác sĩ'} · ${p.researchConsent ? 'đồng ý nghiên cứu' : 'chưa đồng ý nghiên cứu'}`}>
          <InfoRow label="SĐT" value={p.phone || '—'} />
          <InfoRow label="Bác sĩ phụ trách" value={account(p.doctorId)?.name ?? '—'} />
          <InfoRow label="Ngày tạo hồ sơ" value={fmtDate(p.createdAt)} />
          <InfoRow label="Ngày sinh" value={birthLabel(p)} />
          {/* Giai đoạn B (CN1 H8): nhật ký sửa hồ sơ, mới trước. */}
          {isDoctor && (() => {
            const edits = (data.patientEdits ?? []).filter((x) => x.patientId === p.id).sort((a, b) => b.at.localeCompare(a.at));
            return (
              <Disclosure title="Lịch sử sửa hồ sơ" summary={edits.length ? `${edits.length} thay đổi` : 'Chưa có thay đổi'}>
                {edits.length === 0 && <Muted>Chưa có thay đổi.</Muted>}
                {edits.map((x) => (
                  <View key={x.id} style={{ gap: 2, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
                    <Text style={{ color: C.text, fontWeight: '600', fontSize: T.small }}>{`${fmtDateTime(x.at)} · ${account(x.by)?.name ?? x.by}`}</Text>
                    <Muted>{`${x.field}: ${x.from} → ${x.to}`}</Muted>
                  </View>
                ))}
              </Disclosure>
            );
          })()}
          {/* Giai đoạn B (CN2 N10, C1): đồng ý dùng dữ liệu do bệnh nhân tự chọn (khi kích hoạt hoặc ở trang của bệnh nhân); bác sĩ chỉ xem. */}
          <InfoRow label="Đồng ý dùng dữ liệu" value={p.researchConsent ? `Đã đồng ý${p.consentDate ? ` ngày ${fmtDate(p.consentDate)}` : ''}` : 'Chưa đồng ý: ảnh vẫn lưu, gán nhãn được, không vào tập huấn luyện'} />
        </Disclosure>
      </Card>

      {/* Giai đoạn B (XN-13): xuất báo cáo PDF ẩn khỏi bác sĩ ở đợt này; mã tạo báo cáo (src/lib/report.ts) và dữ liệu giữ nguyên. */}
      {/* Lưu trữ đặt cuối màn, tách khỏi việc lâm sàng hằng ngày; luôn hỏi xác nhận, không xóa dữ liệu. */}
      {isOwner && (archived
        ? <Button label="Khôi phục hồ sơ" icon="arrow-undo-outline" variant="secondary" loading={archiving} onPress={askRestore} />
        : <Button label="Lưu trữ hồ sơ" icon="archive-outline" variant="danger" loading={archiving} disabled={!!archiveWhy} reason={archiveWhy ?? undefined} onPress={askArchive} />)}
    </Screen>
  );
}

/** Một báo cáo của bệnh nhân. Nội dung và nút giữ như trước P1-02a; chỉ tách nhóm chưa xử lý và đã xử lý. */
function ReportRow({ r, isDoctor, onHandle }: { r: { id: string; kind: 'symptom' | 'device'; painLevel?: number; date: string; content: string; handled: boolean }; isDoctor: boolean; onHandle?: () => void }) {
  return (
    <View testID={r.handled ? 'bao-cao-da-xu-ly' : 'bao-cao-chua-xu-ly'} style={{ gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.divider }}>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <Chip label={r.kind === 'device' ? 'Sự cố thiết bị' : 'Triệu chứng'} tone={r.kind === 'device' ? 'teal' : 'red'} />
        {r.painLevel !== undefined && <Chip label={`Mức đau ${r.painLevel}/10`} tone="gray" />}
        <View style={{ flex: 1 }} />
        <Text style={{ color: C.textFaint, fontSize: T.caption }}>{fmtDateTime(r.date)}</Text>
      </View>
      <Text style={{ color: C.text }}>{r.content}</Text>
      <Muted>Nguồn: bệnh nhân báo qua ứng dụng</Muted>
      {r.handled ? (
        <Chip label="Đã xử lý" tone="green" icon="checkmark" />
      ) : isDoctor ? (
        // Stage 9A: vùng chạm tối thiểu 44 (trước đây chỉ bằng dòng chữ); hành động giữ nguyên.
        <View style={{ flexDirection: 'row' }}><TextLink label="Đánh dấu đã xử lý" onPress={onHandle ?? (() => {})} /></View>
      ) : <Chip label="Đang chờ bác sĩ" tone="amber" />}
    </View>
  );
}
