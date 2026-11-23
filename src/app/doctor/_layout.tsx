import { router } from 'expo-router';

import { RoleTabs } from '@/components/RoleTabs';
import { needsLabel } from '@/lib/imageLabel';
import { useStore } from '@/lib/store';

export default function DoctorTabs() {
  const { data, me } = useStore();
  const mine = new Set(data.patients.filter((p) => p.doctorId === me?.id && !p.archivedAt).map((p) => p.id));
  // Giai đoạn B (CN2 T1): huy hiệu tab Ảnh đếm ảnh chưa gán đủ nhãn.
  const unlabeled = data.images.filter((i) => mine.has(i.patientId) && needsLabel(i)).length;
  return (
    <RoleTabs
      role="doctor"
      fab={{ icon: 'camera', label: 'Chụp ảnh vết thương', title: 'Chụp ảnh', onPress: () => router.push('/capture') }}
      tabs={[
        { name: 'index', title: 'Trang chủ', icon: 'home-outline', iconOn: 'home' },
        { name: 'patients', title: 'Bệnh nhân', icon: 'people-outline', iconOn: 'people' },
        { name: 'dataset', title: 'Ảnh', icon: 'images-outline', iconOn: 'images', badge: unlabeled },
        { name: 'account', title: 'Cá nhân', icon: 'person-circle-outline', iconOn: 'person-circle' },
      ]}
    />
  );
}
