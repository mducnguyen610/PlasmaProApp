import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { latestEvaluation } from '@/lib/access';
import { SeverityCard } from '@/components/SeverityCard';
import { DateBadge } from '@/components/DateBadge';
import { TaskRow } from '@/components/items';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Header, Muted, Ring, Screen, SectionTitle, SimBadge, Stat, WoundPhoto } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { fmtDate, TREND } from '@/lib/format';
import { formatAreaForName } from '@/lib/naming';
import { computeReminders, scheduleReminders } from '@/lib/reminders';
import { useLookups, useStore } from '@/lib/store';
import { bar, C } from '@/theme';

const dayDiff = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000);

// Trang chủ bệnh nhân (đặc tả mục 6): một cột, theo thứ tự việc bệnh nhân cần biết trong ngày.
// Điều hướng sang Lịch trình, Lịch sử, Thiết bị nằm ở thanh tab, không lặp lại bằng thẻ gradient.
export default function PatientHome() {
  const { data, me } = useStore();
  const { patient, account, woundsOf, sessionsOf } = useLookups();
  const [busy, setBusy] = useState(false);
  const p = patient(me?.patientId);
  if (!p) return null;
  const today = new Date().toISOString().slice(0, 10);
  const reminders = computeReminders(data, p.id, today);
  const wounds = woundsOf(p.id);
  const woundIds = new Set(wounds.map((w) => w.id));
  const plan = data.plans.filter((x) => x.patientId === p.id && x.confirmed && x.status === 'active').sort((a, b) => b.version - a.version)[0];
  const evals = data.evaluations.filter((e) => woundIds.has(e.woundId) && e.visibleToPatient).sort((a, b) => b.date.localeCompare(a.date) || data.evaluations.indexOf(b) - data.evaluations.indexOf(a));
  const latest = evals[0];
  const retakes = data.images.filter((i) => i.patientId === p.id && i.retakeRequested);
  const todaySessions = p.deviceId ? sessionsOf(p.deviceId).filter((s) => s.start.slice(0, 10) === today && s.status === 'completed').length : 0;
  const totalDays = plan ? Math.max(1, dayDiff(plan.startDate, plan.endDate)) : 0;
  const doneDays = plan ? Math.min(totalDays, Math.max(0, dayDiff(plan.startDate, today))) : 0;
  const lastLabeled = data.images
    .filter((i) => i.patientId === p.id && i.areaCm2 !== null && i.status === 'labeled')
    .sort((a, b) => b.captureDate.localeCompare(a.captureDate))[0];

  return (
    <Screen header={<Header title="Trang chủ" subtitle={`${p.name} · ${p.code}`} right={<DateBadge />} />}>
      <SimBadge />
      <SectionTitle action="Chi tiết" onAction={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id } })}>Điều trị hôm nay</SectionTitle>
      <Card hero style={{ padding: 20 }}>
        {plan ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 14 }}>
              <Stat label="Hôm nay" value={plan.sessionsPerDay != null ? `${todaySessions}/${plan.sessionsPerDay}` : todaySessions} unit="lần" tone="blue" />
              <Stat label="Hiệu lực đến" value={fmtDate(plan.endDate).slice(0, 5)} unit={fmtDate(plan.endDate).slice(6)} tone="red" />
            </View>
            <Ring value={doneDays} max={totalDays} label={`${doneDays}`} sub={`/ ${totalDays} ngày`} />
          </View>
        ) : (
          <Muted>Chưa có liệu trình được bác sĩ xác nhận.</Muted>
        )}
      </Card>

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
