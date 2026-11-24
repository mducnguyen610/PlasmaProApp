import { RoleTabs } from '@/components/RoleTabs';
import { doctorTasks } from '@/lib/doctorTasks';
import { useStore } from '@/lib/store';

/**
 * Logic chốt 25/11/2026 (TONG-HOP-LOGIC-BAC-SI.md mục 2; TC-1..TC-4, TC-12, M10): Trang chủ không có thanh dưới. Vào một chức năng
 * thì thanh dưới cùng có 4 mục cố định: Bệnh nhân, Chụp ảnh và gán nhãn, Thiết bị, Cài đặt; mục đang mở được tô nền.
 * Phác đồ không còn là chức năng cấp 1 (vào qua Bệnh nhân > Vết thương). Không còn nút giữa "Chụp ảnh vết thương".
 * Tên tuyến "account" giữ nguyên để liên kết cũ vẫn mở được; nội dung là trang Cài đặt (gộp Cá nhân, TC-11).
 */
export default function DoctorTabs() {
  const { data, me } = useStore();
  const tasks = doctorTasks(data, me?.id);
  return (
    <RoleTabs
      role="doctor"
      tabs={[
        { name: 'index', title: 'Trang chủ', icon: 'home-outline', iconOn: 'home', hidden: true },
        { name: 'patients', title: 'Bệnh nhân', icon: 'people-outline', iconOn: 'people' },
        { name: 'dataset', title: 'Chụp ảnh và gán nhãn', icon: 'camera-outline', iconOn: 'camera', badge: tasks.unlabeled.length },
        { name: 'devices', title: 'Thiết bị', icon: 'hardware-chip-outline', iconOn: 'hardware-chip', badge: tasks.faults.length },
        { name: 'account', title: 'Cài đặt', icon: 'settings-outline', iconOn: 'settings' },
      ]}
    />
  );
}
