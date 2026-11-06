import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { latestEvaluation, SEVERITY } from '@/lib/access';
import { areaReview, courseProgress, courseStatus, followUpDates, phaseLabel, phasesOf } from '@/lib/course';
import { ReviewNote } from '@/components/CourseCard';
import { DateBadge } from '@/components/DateBadge';
import { AppointmentRow, TaskRow } from '@/components/items';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Header, Muted, Notice, Ring, Screen, SectionTitle, SimBadge, Stat, WoundPhoto } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime, TREND } from '@/lib/format';
import { formatAreaForName } from '@/lib/naming';
import { computeReminders, scheduleReminders } from '@/lib/reminders';
import { useLookups, useStore } from '@/lib/store';
import { C, radius } from '@/theme';

// Việc trước và sau mỗi lần chiếu (slide 34: chiếu sau chăm sóc thường quy; S2k 2022: loại dịch tiết, không làm khô vết).
// Nội dung là bản nháp cho demo, cần bác sĩ trong nhóm duyệt.
const BEFORE = ['Rửa tay, thay băng và làm sạch vết thương theo dặn', 'Không lau khô hẳn vết thương', 'Lắp đầu phát riêng của mình'];
const AFTER = ['Vệ sinh đầu phát rồi đậy nắp', 'Băng lại hoặc bôi thuốc theo dặn', 'Ghi cảm giác của lần chiếu trong Lịch trình'];

// Trang chủ bệnh nhân (đặc tả mục 6): một cột, theo thứ tự việc bệnh nhân cần biết trong ngày.
// Điều hướng sang Lịch trình, Lịch sử, Thiết bị nằm ở thanh tab, không lặp lại bằng thẻ gradient.
export default function PatientHome() {
  const { data, me, addReport } = useStore();
  const { patient, account, woundsOf, sessionsOf, device, coursePlan, imagesOf } = useLookups();
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const p = patient(me?.patientId);
  if (!p) return null;
  const today = new Date().toISOString().slice(0, 10);
  const reminders = computeReminders(data, p.id, today);
  const upcoming = reminders.filter((r) => r.date >= today);
  const next = upcoming[0];
  const wounds = woundsOf(p.id);
  const courses = wounds.map((w) => ({ w, plan: coursePlan(w.id, { patientView: true }) }));
  const treating = courses.find((c) => c.plan?.status === 'active');
  const plan = treating?.plan;
  const followUp = courses.find((c) => c.w.status === 'follow_up');
  const awaiting = courses.find((c) => c.w.status === 'awaiting_closure');
  const retakes = data.images.filter((i) => i.patientId === p.id && i.retakeRequested);
  const sessions = p.deviceId ? sessionsOf(p.deviceId) : [];
  const dev = device(p.deviceId);
  const lastSyncDay = dev?.lastSync?.slice(0, 10) ?? null;
  const woundSessions = plan ? sessions.filter((s) => !s.woundId || s.woundId === treating!.w.id) : [];
  const pr = plan ? courseProgress(plan, woundSessions, today, lastSyncDay) : null;
  const status = pr ? courseStatus(pr, fmtDate) : null;
  const statusColor = status?.kind === 'done' ? C.green : status?.kind === 'over' ? C.amber : status?.kind === 'rest' ? C.textSoft : C.primary;
  const phase = plan && pr && pr.phaseIndex >= 0 ? phasesOf(plan)[pr.phaseIndex] : undefined;
  const review = plan && treating ? areaReview(imagesOf(treating.w.id), plan, today) : null;
  const nextCheck = followUp?.w.followUpFrom ? followUpDates(followUp.w.followUpFrom).find((x) => x.date >= today) : undefined;
  const steps = status?.kind === 'treat' ? BEFORE : status?.kind === 'done' ? AFTER : [];

  return (
    <Screen header={<Header title="Trang chủ" subtitle={`${p.name} · ${p.code}`} right={<DateBadge />} />}>
      <SimBadge />
      <SectionTitle action="Chi tiết" onAction={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id } })}>
        {treating ? `Đợt điều trị · ${treating.w.code} ${treating.w.location}` : 'Đợt điều trị'}
      </SectionTitle>
      <Card hero style={{ padding: 20 }}>
        {plan && pr && status ? (
          <>
            {/* Câu chính theo lịch của đợt: ngày có buổi, ngày nghỉ, đã xong. Không dùng chuỗi ngày liên tiếp. */}
            <View accessible accessibilityRole="summary" accessibilityLabel={`${status.title}. ${status.detail}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name={status.kind === 'done' ? 'checkmark-circle' : status.kind === 'over' ? 'alert-circle' : status.kind === 'rest' ? 'moon-outline' : 'time-outline'} size={30} color={statusColor} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: statusColor }}>{status.title}</Text>
                <Text style={{ color: C.textSoft }}>{status.detail}</Text>
              </View>
            </View>
            {/* Mức năng lượng và thời gian chỉ hiện ở Lịch trình: trang chủ giữ một câu chính và một chip (quy tắc đơn giản cho bệnh nhân). */}
            {phase && <View style={{ flexDirection: 'row' }}><Chip icon="layers-outline" tone="blue" label={`Giai đoạn ${pr.phaseIndex + 1}/${pr.phaseCount}: ${phaseLabel(phase)}`} /></View>}
            {dev && lastSyncDay !== today && (
              <Notice icon="cloud-offline-outline">
                {dev.lastSync ? `Chưa nhận dữ liệu hôm nay (lần cuối ${fmtDateTime(dev.lastSync)}). Số buổi có thể chưa đủ.` : 'Thiết bị chưa gửi dữ liệu. Số buổi có thể chưa đủ.'}
              </Notice>
            )}
            {/* Vòng tiến độ đặt trước, mốc xem lại đợt nằm sát bên phải: không còn khoảng trống giữa hai khối. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 }}>
              <Ring size={128} value={pr.done} max={pr.total} label={`${pr.done}/${pr.total}`} sub="buổi đã xong" />
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Stat label="Dự kiến xem lại đợt" value={fmtDate(plan.endDate)} tone="red" />
              </View>
            </View>
          </>
        ) : followUp ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="checkmark-done-circle" size={30} color={C.green} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: C.green }}>Vết thương {followUp.w.code} đã liền</Text>
                <Text style={{ color: C.textSoft }}>Đợt điều trị đã kết thúc. Không cần chiếu plasma nữa.</Text>
              </View>
            </View>
            <Muted>{nextCheck ? `Lần kiểm tra tiếp theo: ${fmtDate(nextCheck.date)} (${nextCheck.days} ngày sau khi liền). Bác sĩ sẽ chụp ảnh để chắc vết thương không mở lại.` : 'Đã qua các mốc theo dõi.'}</Muted>
            <Button
              label="Báo vết thương mở lại"
              icon="alert-circle-outline"
              variant="secondary"
              onPress={() => {
                addReport({ patientId: p.id, kind: 'symptom', content: `Vết thương ${followUp.w.code} (${followUp.w.location}) có dấu hiệu mở lại.` });
                notify('Đã gửi cho bác sĩ', 'Bác sĩ sẽ liên hệ để hẹn khám. Nếu chảy máu, có mủ hoặc sốt, hãy đến cơ sở y tế.');
              }}
            />
          </>
        ) : awaiting ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="hourglass-outline" size={30} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: C.primary }}>Đã dừng chiếu, chờ bác sĩ xác nhận liền</Text>
                <Text style={{ color: C.textSoft }}>Bác sĩ ghi nhận vết thương {awaiting.w.code} đã khép ngày {fmtDate(awaiting.w.closureCheck1)}. Cần một lần khám nữa sau 2 tuần để xác nhận.</Text>
              </View>
            </View>
          </>
        ) : (
          <Muted>Chưa có đợt điều trị được bác sĩ xác nhận.</Muted>
        )}
      </Card>

      {steps.length > 0 && (
        <Card>
          <SectionTitle icon="list-circle-outline">{status?.kind === 'treat' ? 'Trước khi chiếu' : 'Sau khi chiếu'}</SectionTitle>
          {steps.map((t) => {
            const on = !!checked[t];
            return (
              // Cả dòng là vùng bấm, cao tối thiểu 48 pt (Apple HIG 44 pt, Material 48 dp), có phản hồi khi chạm.
              <Pressable key={t} onPress={() => setChecked({ ...checked, [t]: !on })} accessibilityRole="checkbox" accessibilityLabel={t} accessibilityState={{ checked: on }} style={({ pressed }) => ({ minHeight: 48, paddingVertical: 6, marginHorizontal: -8, paddingHorizontal: 8, borderRadius: radius.s, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? C.surfaceMuted : 'transparent' })}>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={28} color={on ? C.green : C.textSoft} />
                <Text style={{ flex: 1, color: C.text }}>{t}</Text>
              </Pressable>
            );
          })}
          <Muted>Nội dung theo hướng dẫn chung, bác sĩ có thể dặn khác cho từng người.</Muted>
        </Card>
      )}

      {retakes.length > 0 && (
        <Card style={{ borderWidth: 1.5, borderColor: C.red }}>
          <Text style={{ color: C.red, fontWeight: '700' }}>Cần hẹn bác sĩ chụp lại</Text>
          {retakes.map((im) => (
            <TaskRow key={im.id} icon="camera-outline" tone="red" title={`Ảnh ${im.id} · ${im.capture?.sourceDateKnown === false ? 'Chưa rõ ngày chụp' : fmtDate(im.captureDate)}`} detail={im.retakeRequested!} onPress={() => router.push('/schedule')} />
          ))}
        </Card>
      )}

      {/* Chỉ một lịch hẹn gần nhất; danh sách đầy đủ ở Lịch trình (đề xuất 4). */}
      <SectionTitle action={upcoming.length > 1 ? `Tất cả (${upcoming.length})` : undefined} onAction={() => router.push('/schedule')}>Lịch hẹn gần nhất</SectionTitle>
      <Card>
        {next ? (
          <AppointmentRow date={next.date} title={next.title} body={next.body} today={today} />
        ) : (
          <Muted>Chưa có lịch hẹn. Lịch được lấy từ đợt điều trị và đánh giá của bác sĩ.</Muted>
        )}
        {upcoming.length > 0 && (
          <Button
            label="Bật nhắc trên điện thoại"
            icon="notifications-outline"
            variant="ghost"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              try {
                const r = await scheduleReminders(reminders);
                notify(
                  r.denied ? 'Chưa bật được nhắc' : 'Đã đặt nhắc',
                  r.denied ? 'Cần cho phép thông báo trong Cài đặt (trình duyệt không hỗ trợ).' : `${r.scheduled} thông báo lúc 8:00 các ngày hẹn.`,
                );
              } catch (e) {
                notify('Chưa bật được nhắc', String(e));
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
      </Card>

      {/* Một thẻ cho mỗi vết thương: diện tích, ảnh, mức độ và lời dặn của bác sĩ. Trước đây lời dặn lặp ở hai thẻ (đề xuất 4). */}
      <SectionTitle action="Lịch sử" onAction={() => router.navigate('/patient/history')}>Vết thương</SectionTitle>
      {wounds.length === 0 && <Card><Muted>Hồ sơ mới đang chờ bác sĩ phụ trách tiếp nhận và đánh giá.</Muted></Card>}
      {wounds.map((w) => {
        const ev = latestEvaluation(data, w.id, true);
        const img = data.images
          .filter((i) => i.woundId === w.id && i.areaCm2 !== null && i.status === 'labeled')
          .sort((a, b) => b.captureDate.localeCompare(a.captureDate))[0];
        const rv = treating && treating.w.id === w.id ? review : null;
        return (
          <Card key={w.id}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>{w.code} · {w.location}</Text>
            {img ? (
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ fontSize: 32, fontWeight: '600', color: C.primary }}>{formatAreaForName(img.areaCm2!).replace('.', ',')}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '500', color: C.primary, marginBottom: 5 }}>cm²</Text>
                  </View>
                  <Muted>{img.capture?.sourceDateKnown === false ? 'Ngày chụp chưa xác định' : 'Bác sĩ đo ngày ' + fmtDate(img.captureDate)}</Muted>
                </View>
                <WoundPhoto image={img} style={{ width: 110, height: 82, borderRadius: radius.m }} />
              </View>
            ) : <Muted>Chưa có số đo do bác sĩ nhập.</Muted>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {ev?.severity && <Chip label={`Mức độ: ${SEVERITY[ev.severity].label}`} tone={SEVERITY[ev.severity].tone} />}
              {ev && <Chip label={TREND[ev.trend].label} tone={TREND[ev.trend].tone} />}
            </View>
            {rv && rv.state !== 'no_data' && <ReviewNote review={rv} forPatient />}
            {ev ? (
              <View style={{ gap: 4, padding: 12, borderRadius: radius.m, backgroundColor: C.surfaceMuted }}>
                <Text style={{ color: C.text, fontWeight: '600' }}>Lời dặn của bác sĩ</Text>
                <Text style={{ color: C.text, lineHeight: 24 }}>{ev.instructions || ev.characteristics}</Text>
                <Muted>{account(ev.doctorId)?.name ?? 'Bác sĩ phụ trách'} · {fmtDate(ev.date)}{ev.nextReview && ev.nextReview >= today ? ` · tái đánh giá ${fmtDate(ev.nextReview)}` : ''}</Muted>
              </View>
            ) : <Muted>Chưa có đánh giá được công bố. Không suy ra mức độ từ diện tích.</Muted>}
          </Card>
        );
      })}

      <Button label="Báo triệu chứng hoặc sự cố" icon="medkit-outline" variant="secondary" onPress={() => router.push('/report')} />
      <Chip label={`Bác sĩ phụ trách: ${account(p.doctorId)?.name ?? '—'}`} tone="blue" icon="medkit-outline" />
    </Screen>
  );
}
