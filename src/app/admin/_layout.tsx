import { RoleTabs } from '@/components/RoleTabs';
import { useStore } from '@/lib/store';

export default function AdminTabs() {
  const { data } = useStore();
  const open = data.syncErrors.filter((e) => !e.resolved).length;
  return (
    <RoleTabs
      role="admin"
      tabs={[
        { name: 'index', title: 'Tài khoản', icon: 'people-outline', iconOn: 'people' },
        { name: 'dataset', title: 'Dữ liệu', icon: 'layers-outline', iconOn: 'layers' },
        { name: 'devices', title: 'Thiết bị', icon: 'hardware-chip-outline', iconOn: 'hardware-chip' },
        { name: 'logs', title: 'Lỗi', icon: 'warning-outline', iconOn: 'warning', badge: open },
        { name: 'account', title: 'Cá nhân', icon: 'person-circle-outline', iconOn: 'person-circle' },
      ]}
    />
  );
}
