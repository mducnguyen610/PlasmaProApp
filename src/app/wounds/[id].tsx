import { useLocalSearchParams } from 'expo-router';

import { DoctorWound, woundTitle } from '@/components/DoctorWound';
import { NoAccess, useCanView } from '@/components/Guard';
import { PatientWoundDashboard } from '@/components/PatientWoundDashboard';
import { Header, Screen } from '@/components/ui';
import { useLookups, useStore } from '@/lib/store';

// BS04 Chi tiết vết thương. Bệnh nhân: tổng quan theo tác vụ (N05). Bác sĩ: tổng quan và ba thẻ (logic chốt 25/11/2026).
export default function WoundDetail() {
  const { id, the } = useLocalSearchParams<{ id: string; the?: string }>();
  const { me } = useStore();
  const { wound, patient } = useLookups();
  const w = wound(id);
  const p = patient(w?.patientId);
  const canView = useCanView(p);
  if (!w || !p) return <NoAccess notFound />;
  if (!canView) return <NoAccess />;

  const isDoctor = me?.role === 'doctor';
  // N05 (vai trò khác bác sĩ, tức bệnh nhân): trang tổng quan theo tác vụ, các phần chuyên sâu mở màn riêng (PatientWoundDashboard).
  // Nhánh bác sĩ (B05) bên dưới giữ nguyên.
  if (!isDoctor) {
    return (
      <Screen header={<Header back title={`Vết thương ${w.code}`} />}>
        <PatientWoundDashboard patient={p} wound={w} />
      </Screen>
    );
  }
  // Logic chốt 25/11/2026 (mục 3.4): trang vết thương của bác sĩ gồm tổng quan và ba thẻ Ảnh, Đánh giá, Phác đồ (DoctorWound).
  return (
    <Screen header={<Header back title={woundTitle(w.code)} subtitle={`${p.name} · ${w.location}`} />}>
      <DoctorWound patient={p} wound={w} initialTab={the} />
    </Screen>
  );
}
