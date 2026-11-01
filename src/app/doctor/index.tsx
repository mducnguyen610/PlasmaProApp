import { router } from 'expo-router';

import { DateBadge } from '@/components/DateBadge';
import { PatientCard, TaskRow } from '@/components/items';
import { Card, Header, Muted, Screen, SectionTitle, SimBadge, type IconName } from '@/components/ui';
import { useLookups, useStore } from '@/lib/store';

type Task = { key: string; icon: IconName; tone: 'amber' | 'red' | 'blue' | 'violet'; title: string; detail: string; onPress: () => void };

// BS01 – Trang chủ bác sĩ: danh sách việc cần làm rồi danh sách bệnh nhân; số liệu tổng hợp chuyển sang quản trị kỹ thuật.
export default function DoctorHome() {
  const { data, me } = useStore();
  const { patient, device } = useLookups();
  const mine = data.patients.filter((p) => p.doctorId === me?.id);
  const ids = new Set(mine.map((p) => p.id));
  const myImages = data.images.filter((i) => ids.has(i.patientId));
  const unlabeled = myImages.filter((i) => i.status === 'unlabeled');
  const retakes = myImages.filter((i) => i.retakeRequested);
  const reports = data.reports.filter((r) => ids.has(r.patientId) && !r.handled);
  const drafts = data.plans.filter((p) => ids.has(p.patientId) && p.status === 'draft');
  const offline = mine.map((p) => device(p.deviceId)).filter((d) => d && !d.online);
  const codes = (ids: (string | undefined)[]) => [...new Set(ids.map((id) => patient(id)?.code).filter(Boolean))].join(', ');
  // Chỉ hiện việc đang có; số liệu tổng hợp (tỉ lệ gán nhãn, thống kê) nằm ở màn hình quản trị kỹ thuật.
  const candidates: (Task | false)[] = [
    reports.length > 0 && { key: 'reports', icon: 'medkit-outline', tone: 'red', title: `${reports.length} báo cáo triệu chứng, sự cố`, detail: reports.slice(0, 2).map((r) => `${patient(r.patientId)?.code}: ${r.content}`).join(' · '), onPress: () => router.push({ pathname: '/patients/[id]', params: { id: reports[0].patientId } }) },
    unlabeled.length > 0 && { key: 'unlabeled', icon: 'pricetag-outline', tone: 'amber', title: `${unlabeled.length} ảnh chờ ghi diện tích`, detail: codes(unlabeled.map((i) => i.patientId)), onPress: () => router.push({ pathname: '/images/[id]', params: { id: unlabeled[0].id } }) },
    retakes.length > 0 && { key: 'retakes', icon: 'camera-outline', tone: 'amber', title: `${retakes.length} ảnh cần chụp lại`, detail: codes(retakes.map((i) => i.patientId)), onPress: () => router.push({ pathname: '/images/[id]', params: { id: retakes[0].id } }) },
    drafts.length > 0 && { key: 'drafts', icon: 'flash-outline', tone: 'violet', title: `${drafts.length} liệu trình nháp chờ xác nhận`, detail: codes(drafts.map((d) => d.patientId)), onPress: () => router.push({ pathname: '/plan/[patientId]', params: { patientId: drafts[0].patientId } }) },
    offline.length > 0 && { key: 'offline', icon: 'cloud-offline-outline', tone: 'blue', title: `${offline.length} thiết bị chưa đồng bộ`, detail: offline.map((d) => d!.code).join(', '), onPress: () => router.push({ pathname: '/devices/[id]', params: { id: offline[0]!.id } }) },
  ];
  const tasks = candidates.filter((t): t is Task => !!t);

  return (
    <Screen header={<Header title="Trang chủ" subtitle={`Xin chào, ${me?.name ?? ''}`} right={<DateBadge />} />}>
      <SimBadge />
      <SectionTitle>Việc cần làm</SectionTitle>
      <Card>
        {tasks.length === 0 && <Muted>Không có việc nào đang chờ.</Muted>}
        {tasks.map((t) => (
          <TaskRow key={t.key} icon={t.icon} tone={t.tone} title={t.title} detail={t.detail} onPress={t.onPress} />
        ))}
      </Card>

      <SectionTitle action="Danh sách" onAction={() => router.navigate('/doctor/patients')}>Bệnh nhân</SectionTitle>
      {mine.map((p) => (
        <PatientCard key={p.id} patient={p} />
      ))}
    </Screen>
  );
}
