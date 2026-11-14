import { useLocalSearchParams } from 'expo-router';

import { ClinicalContext } from '@/components/ClinicalContext';
import { NoAccess, useCanView } from '@/components/Guard';
import { Card, Header, Muted, Screen } from '@/components/ui';
import { WoundTimeline } from '@/components/WoundTimeline';
import { useLookups, useStore } from '@/lib/store';

/**
 * Lịch sử vết thương (màn riêng mở từ N05): cùng dòng thời gian P2-07a, nay mở sẵn thay vì nằm trong mục thu gọn cuối N05.
 * Chỉ đọc. Nhận xét: bác sĩ thấy mọi đánh giá, bệnh nhân chỉ thấy đánh giá đã công bố (cùng quy tắc N05).
 * Buổi điều trị: chỉ buổi có woundId đúng vết (A26).
 */
export default function WoundTimelineScreen() {
  const { woundId } = useLocalSearchParams<{ woundId: string }>();
  const { data, me } = useStore();
  const { wound, patient, imagesOf, account, sessionsOf } = useLookups();
  const w = wound(woundId);
  const p = patient(w?.patientId);
  const canView = useCanView(p);
  if (!w || !p) return <NoAccess notFound />;
  if (!canView) return <NoAccess />;
  const isDoctor = me?.role === 'doctor';
  const evals = data.evaluations.filter((e) => e.woundId === w.id && (isDoctor || e.visibleToPatient));
  const dev = data.devices.find((x) => x.id === p.deviceId);
  return (
    <Screen header={<Header back title="Lịch sử vết thương" subtitle={`${w.code} · ${w.location}`} />}>
      <ClinicalContext patient={p} wound={w} />
      <Card>
        <WoundTimeline expanded images={imagesOf(w.id)} evaluations={evals} sessions={dev ? sessionsOf(dev.id).filter((s) => s.woundId === w.id) : []} doctorName={(id) => account(id)?.name} />
      </Card>
      <Muted>Gồm ảnh và lần đo, nhận xét của bác sĩ, buổi điều trị của vết này. Chạm ảnh hoặc lần đo để mở ảnh.</Muted>
    </Screen>
  );
}
