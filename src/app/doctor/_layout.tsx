import { router } from 'expo-router';

import { RoleTabs } from '@/components/RoleTabs';
import { useStore } from '@/lib/store';

export default function DoctorTabs() {
  const { data, me } = useStore();
  const mine = new Set(data.patients.filter((p) => p.doctorId === me?.id).map((p) => p.id));
  const unlabeled = data.images.filter((i) => mine.has(i.patientId) && i.status === 'unlabeled').length;
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
