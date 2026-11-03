import { Redirect, router } from 'expo-router';

import { RoleTabs } from '@/components/RoleTabs';
import { useStore } from '@/lib/store';

export default function PatientTabs() {
  const { me } = useStore();
  // Lần đầu đăng nhập: xem hướng dẫn 4 màn trước khi vào trang chủ (có thể bỏ qua).
  if (me?.role === 'patient' && !me.onboardingDoneAt) return <Redirect href="/onboarding" />;
  return (
    <RoleTabs
      role="patient"
      fab={{ icon: 'calendar', label: 'Lịch trình điều trị', onPress: () => router.push('/schedule') }}
      tabs={[
        { name: 'index', title: 'Trang chủ', icon: 'home-outline', iconOn: 'home' },
        { name: 'history', title: 'Lịch sử', icon: 'time-outline', iconOn: 'time' },
        { name: 'device', title: 'Thiết bị', icon: 'hardware-chip-outline', iconOn: 'hardware-chip' },
        { name: 'account', title: 'Tài khoản', icon: 'person-circle-outline', iconOn: 'person-circle' },
      ]}
    />
  );
}
