import { router } from 'expo-router';

import { DateBadge } from '@/components/DateBadge';
import { View } from 'react-native';
import { PatientCard } from '@/components/items';
import { Card, Header, ListCard, Muted, NumberTile, Screen, SectionTitle, SimBadge, type IconName } from '@/components/ui';
import { useLookups, useStore } from '@/lib/store';

type Task = { key: string; icon: IconName; tone: 'amber' | 'red' | 'blue' | 'violet'; count: number; label: string; onPress: () => void };

// BS01 – Trang chủ bác sĩ: danh sách việc cần làm rồi danh sách bệnh nhân; số liệu tổng hợp chuyển sang quản trị kỹ thuật.
export default function DoctorHome() {
  const { data, me } = useStore();
  const { device } = useLookups();
  const mine = data.patients.filter((p) => p.doctorId === me?.id);
  const ids = new Set(mine.map((p) => p.id));
  const myImages = data.images.filter((i) => ids.has(i.patientId));
  const unlabeled = myImages.filter((i) => i.status === 'unlabeled');
  const retakes = myImages.filter((i) => i.retakeRequested);
  const reports = data.reports.filter((r) => ids.has(r.patientId) && !r.handled);
  const drafts = data.plans.filter((p) => ids.has(p.patientId) && p.status === 'draft');
  const offline = mine.map((p) => device(p.deviceId)).filter((d) => d && !d.online);
  // Chỉ hiện việc đang có; số liệu tổng hợp (tỉ lệ gán nhãn, thống kê) nằm ở màn hình quản trị kỹ thuật.
  const candidates: (Task | false)[] = [
    reports.length > 0 && { key: 'reports', icon: 'medkit-outline', tone: 'red', count: reports.length, label: 'Báo cáo triệu chứng, sự cố', onPress: () => router.push({ pathname: '/patients/[id]', params: { id: reports[0].patientId } }) },
    unlabeled.length > 0 && { key: 'unlabeled', icon: 'pricetag-outline', tone: 'amber', count: unlabeled.length, label: 'Ảnh chưa đo', onPress: () => router.push({ pathname: '/images/[id]', params: { id: unlabeled[0].id } }) },
    retakes.length > 0 && { key: 'retakes', icon: 'camera-outline', tone: 'amber', count: retakes.length, label: 'Ảnh cần chụp lại', onPress: () => router.push({ pathname: '/images/[id]', params: { id: retakes[0].id } }) },
    drafts.length > 0 && { key: 'drafts', icon: 'flash-outline', tone: 'violet', count: drafts.length, label: 'Đợt nháp chờ xác nhận', onPress: () => router.push({ pathname: '/plan/[patientId]', params: { patientId: drafts[0].patientId } }) },
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
        {mine.map((p) => <PatientCard key={p.id} patient={p} />)}
      </ListCard>
      <SimBadge />
    </Screen>
  );
}
