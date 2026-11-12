import { router } from 'expo-router';
import { useMemo } from 'react';

import { DateBadge } from '@/components/DateBadge';
import { View } from 'react-native';
import { PatientCard } from '@/components/items';
import { Card, Header, ListCard, Muted, NumberTile, Screen, SectionTitle, SimBadge, type IconName } from '@/components/ui';
import { patientSeverity } from '@/lib/access';
import { rankPatients, type AttentionInput } from '@/lib/attention';
import { addDays, isScheduled, localDay } from '@/lib/course';
import { useLookups, useStore } from '@/lib/store';

type Task = { key: string; icon: IconName; tone: 'amber' | 'red' | 'blue' | 'violet'; count: number; label: string; onPress: () => void };

// BS01 – Trang chủ bác sĩ: danh sách việc cần làm rồi danh sách bệnh nhân; số liệu tổng hợp chuyển sang quản trị kỹ thuật.
export default function DoctorHome() {
  const { data, me } = useStore();
  const { device, woundsOf, coursePlan, sessionsOf } = useLookups();
  const mine = data.patients.filter((p) => p.doctorId === me?.id);
  // Xếp người bệnh theo mức cần chú ý (FR10); cách tính ở src/lib/attention.ts.
  const ranked = useMemo(() => {
    const today = localDay();
    const inputs: AttentionInput[] = data.patients
      .filter((p) => p.doctorId === me?.id)
      .map((p) => {
        const plans = woundsOf(p.id)
          .filter((w) => w.status === 'active')
          .map((w) => coursePlan(w.id))
          .filter((pl): pl is NonNullable<typeof pl> => !!pl && pl.status === 'active');
        const dev = device(p.deviceId);
        const lastSyncDay = dev?.lastSync ? localDay(dev.lastSync) : null;
        const completed = (p.deviceId ? sessionsOf(p.deviceId) : []).filter((s) => s.status === 'completed');
        const doneOn = (d: string) => completed.some((s) => localDay(s.start) === d);
        const todayPlans = plans.filter((pl) => isScheduled(pl, today));
        let missedLast7 = 0;
        for (let k = 1; k <= 7; k++) {
          const d = addDays(today, -k);
          // Cùng quy tắc với missed trong courseProgress: chỉ tính ngày đã có dữ liệu đồng bộ.
          if (plans.some((pl) => isScheduled(pl, d)) && !doneOn(d) && lastSyncDay !== null && d <= lastSyncDay) missedLast7++;
        }
        return {
          patientId: p.id,
          hasActivePlan: plans.length > 0,
          scheduledToday: todayPlans.length > 0,
          completedToday: completed.filter((s) => localDay(s.start) === today).length,
          targetPerDay: todayPlans.reduce((n, pl) => n + (pl.sessionsPerDay ?? 1), 0),
          lastSyncDay,
          today,
          missedLast7,
          missedYesterday: (() => {
            const y = addDays(today, -1);
            return plans.some((pl) => isScheduled(pl, y)) && !doneOn(y) && lastSyncDay !== null && y <= lastSyncDay;
          })(),
          openReports: data.reports.filter((r) => r.patientId === p.id && !r.handled).length,
          severity: patientSeverity(data, p.id),
        };
      });
    return rankPatients(inputs);
  }, [data, me?.id, woundsOf, coursePlan, sessionsOf, device]);
  const ids = new Set(mine.map((p) => p.id));
  const myImages = data.images.filter((i) => ids.has(i.patientId));
  const unlabeled = myImages.filter((i) => i.status === 'unlabeled');
  const retakes = myImages.filter((i) => i.retakeRequested);
  const reports = data.reports.filter((r) => ids.has(r.patientId) && !r.handled);
  const drafts = data.plans.filter((p) => ids.has(p.patientId) && p.status === 'draft');
  const offline = mine.map((p) => device(p.deviceId)).filter((d) => d && !d.online);
  // Chỉ hiện việc đang có; số liệu tổng hợp (tỉ lệ gán nhãn, thống kê) nằm ở màn hình quản trị kỹ thuật.
  const candidates: (Task | false)[] = [
    reports.length > 0 && { key: 'reports', icon: 'medkit-outline', tone: 'red', count: reports.length, label: 'Báo cáo mới', onPress: () => router.push({ pathname: '/patients/[id]', params: { id: reports[0].patientId } }) },
    unlabeled.length > 0 && { key: 'unlabeled', icon: 'pricetag-outline', tone: 'amber', count: unlabeled.length, label: 'Ảnh chưa đo', onPress: () => router.push({ pathname: '/images/[id]', params: { id: unlabeled[0].id } }) },
    retakes.length > 0 && { key: 'retakes', icon: 'camera-outline', tone: 'amber', count: retakes.length, label: 'Ảnh cần chụp lại', onPress: () => router.push({ pathname: '/images/[id]', params: { id: retakes[0].id } }) },
    drafts.length > 0 && { key: 'drafts', icon: 'flash-outline', tone: 'amber', count: drafts.length, label: 'Đợt nháp chờ xác nhận', onPress: () => router.push({ pathname: '/plan/[patientId]', params: { patientId: drafts[0].patientId } }) },
    offline.length > 0 && { key: 'offline', icon: 'cloud-offline-outline', tone: 'blue', count: offline.length, label: 'Thiết bị chưa đồng bộ', onPress: () => router.push({ pathname: '/devices/[id]', params: { id: offline[0]!.id } }) },
  ];
  const tasks = candidates.filter((t): t is Task => !!t);

  return (
    <Screen header={<Header title="Trang chủ" subtitle={`Xin chào, ${me?.name ?? ''}`} right={<DateBadge />} />}>
      <SectionTitle>Việc cần làm</SectionTitle>
      {/* Ô số lớn làm điểm neo: bác sĩ thấy ngay có bao nhiêu việc, chạm để mở việc đầu tiên. */}
      {tasks.length === 0 ? <Card><Muted>Không có việc nào đang chờ.</Muted></Card> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {tasks.map((t) => <NumberTile key={t.key} value={t.count} label={t.label} icon={t.icon} tone={t.tone} onPress={t.onPress} />)}
        </View>
      )}

      <SectionTitle action="Danh sách" onAction={() => router.navigate('/doctor/patients')}>Bệnh nhân</SectionTitle>
      <ListCard>
        {ranked.map((a) => {
          const p = mine.find((x) => x.id === a.patientId);
          return p ? <PatientCard key={p.id} patient={p} attention={a} /> : null;
        })}
      </ListCard>
      <SimBadge />
    </Screen>
  );
}
