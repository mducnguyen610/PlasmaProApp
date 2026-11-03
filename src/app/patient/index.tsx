import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { latestEvaluation } from '@/lib/access';
import { areaReview, courseProgress, courseStatus, followUpDates, phaseLabel, phasesOf } from '@/lib/course';
import { ReviewNote } from '@/components/CourseCard';
import { SeverityCard } from '@/components/SeverityCard';
import { DateBadge } from '@/components/DateBadge';
import { TaskRow } from '@/components/items';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Header, Muted, Ring, Screen, SectionTitle, SimBadge, Stat, WoundPhoto } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime, TREND } from '@/lib/format';
import { formatAreaForName } from '@/lib/naming';
import { computeReminders, scheduleReminders } from '@/lib/reminders';
import { useLookups, useStore } from '@/lib/store';
import { bar, C } from '@/theme';

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
  const wounds = woundsOf(p.id);
  const woundIds = new Set(wounds.map((w) => w.id));
  const courses = wounds.map((w) => ({ w, plan: coursePlan(w.id, { patientView: true }) }));
  const treating = courses.find((c) => c.plan?.status === 'active');
  const plan = treating?.plan;
  const followUp = courses.find((c) => c.w.status === 'follow_up');
  const awaiting = courses.find((c) => c.w.status === 'awaiting_closure');
  const evals = data.evaluations.filter((e) => woundIds.has(e.woundId) && e.visibleToPatient).sort((a, b) => b.date.localeCompare(a.date) || data.evaluations.indexOf(b) - data.evaluations.indexOf(a));
  const latest = evals[0];
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
  const lastLabeled = data.images
    .filter((i) => i.patientId === p.id && i.areaCm2 !== null && i.status === 'labeled')
    .sort((a, b) => b.captureDate.localeCompare(a.captureDate))[0];

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
              <Muted>{dev.lastSync ? `Thiết bị gửi dữ liệu lần cuối ${fmtDateTime(dev.lastSync)}, nên số lần hôm nay có thể chưa đầy đủ.` : 'Thiết bị chưa gửi dữ liệu, nên số lần hôm nay có thể chưa đầy đủ.'}</Muted>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <View style={{ flex: 1, gap: 14 }}>
                <Stat label="Dự kiến xem lại đợt" value={fmtDate(plan.endDate).slice(0, 5)} unit={fmtDate(plan.endDate).slice(6)} tone="red" />
              </View>
              <Ring value={pr.done} max={pr.total} label={`${pr.done}`} sub={`/ ${pr.total} buổi`} />
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
              <Pressable key={t} onPress={() => setChecked({ ...checked, [t]: !on })} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? C.green : C.textSoft} />
                <Text style={{ flex: 1, color: C.text }}>{t}</Text>
              </Pressable>
            );
          })}
          <Muted>Nội dung theo hướng dẫn chung, bác sĩ có thể dặn khác cho từng người.</Muted>
        </Card>
      )}

      <SectionTitle>Tình trạng vết thương</SectionTitle>
      {wounds.length === 0 && <Card><Muted>Hồ sơ mới đang chờ bác sĩ phụ trách tiếp nhận và đánh giá.</Muted></Card>}
      {wounds.map(w => {
        const evaluation = latestEvaluation(data, w.id, true);
        return <SeverityCard key={w.id} title={w.code + ' · ' + w.location} evaluation={evaluation} doctor={account(evaluation?.doctorId)?.name} />;
      })}
      {retakes.length > 0 && (
        <Card style={{ borderWidth: 1.5, borderColor: C.red }}>
          <Text style={{ color: C.red, fontWeight: '700' }}>Cần hẹn bác sĩ chụp lại</Text>
          {retakes.map((im) => (
            <TaskRow key={im.id} icon="camera-outline" tone="red" title={`Ảnh ${im.id} · ${im.capture?.sourceDateKnown === false ? 'Chưa rõ ngày chụp' : fmtDate(im.captureDate)}`} detail={im.retakeRequested!} onPress={() => router.push('/schedule')} />
          ))}
        </Card>
      )}

      <Button label="Báo triệu chứng hoặc sự cố" icon="medkit-outline" variant="secondary" onPress={() => router.push('/report')} />
      <SectionTitle>Nhận xét của bác sĩ</SectionTitle>
      <Card>
        {latest ? (
          <>
            <Text style={{ color: C.textSoft, fontSize: 12 }}>{fmtDate(latest.date)} · {account(latest.doctorId)?.name}</Text>
            <Text style={{ color: C.text, lineHeight: 21 }}>{latest.instructions || latest.characteristics}</Text>
            {latest.nextReview && latest.nextReview >= today ? <Muted>Tái đánh giá: {fmtDate(latest.nextReview)}</Muted> : null}
          </>
        ) : (
          <Muted>Chưa có nhận xét được công bố.</Muted>
        )}
        <Chip label={`Bác sĩ phụ trách: ${account(p.doctorId)?.name ?? '—'}`} tone="blue" icon="medkit-outline" />
      </Card>
      <SectionTitle>Nhắc lịch</SectionTitle>
      <Card>
        {reminders.length === 0 && <Muted>Chưa có lịch nhắc. Lịch được lấy từ liệu trình và đánh giá của bác sĩ.</Muted>}
        {reminders.map((r) => (
          <View key={r.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 2, alignSelf: 'stretch', borderRadius: 4, backgroundColor: r.date === today ? bar.red : bar.blue }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: '500' }}>{r.title}</Text>
              <Text style={{ color: C.textSoft, fontSize: 12 }}>{r.body}</Text>
            </View>
            <Text style={{ color: r.date === today ? C.red : C.primary, fontWeight: '700', fontSize: 13 }}>{r.date === today ? 'Hôm nay' : fmtDate(r.date).slice(0, 5)}</Text>
          </View>
        ))}
        {reminders.length > 0 && (
          <Button
            label="Bật nhắc trên điện thoại"
            icon="notifications-outline"
            variant="secondary"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              try {
                const r = await scheduleReminders(reminders);
                notify(
                  r.denied ? 'Chưa bật được nhắc' : 'Đã đặt nhắc',
                  r.denied ? 'Cần cho phép thông báo trong Cài đặt (trình duyệt không hỗ trợ).' : `${r.scheduled} thông báo lúc 8:00 các ngày trên.`,
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

      <SectionTitle action="Lịch sử" onAction={() => router.navigate('/patient/history')}>Diện tích gần nhất</SectionTitle>
      <Card hero style={{ padding: 20 }}>
        {lastLabeled ? (
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.textSoft, fontWeight: '500' }}>Bác sĩ đã đo</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ fontSize: 32, fontWeight: '500', color: C.primary }}>{formatAreaForName(lastLabeled.areaCm2!).replace('.', ',')}</Text>
                <Text style={{ fontSize: 18, fontWeight: '500', color: C.primary, marginBottom: 5 }}>cm²</Text>
              </View>
              <Text style={{ color: C.textSoft, fontSize: 13 }}>{lastLabeled.capture?.sourceDateKnown === false ? 'Ngày chụp chưa xác định' : 'Ngày chụp ' + fmtDate(lastLabeled.captureDate)}</Text>
              {latest && <View style={{ marginTop: 8 }}><Chip label={TREND[latest.trend].label} tone={TREND[latest.trend].tone} /></View>}
              {review && review.state !== 'no_data' && <View style={{ marginTop: 8 }}><ReviewNote review={review} forPatient /></View>}
            </View>
            <WoundPhoto image={lastLabeled} style={{ width: 110, height: 82, borderRadius: 8, borderTopRightRadius: 40 }} />
          </View>
        ) : (
          <Muted>Chưa có số đo do bác sĩ nhập.</Muted>
        )}
      </Card>

    </Screen>
  );
}
