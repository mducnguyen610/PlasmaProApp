import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { Button, Empty, Header, Screen } from '@/components/ui';
import { canManagePatient } from '@/lib/access';
import { useStore } from '@/lib/store';
import type { Patient } from '@/lib/types';

/**
 * Quyền xem hồ sơ lâm sàng: mọi bác sĩ (Giai đoạn B, CN1 H9: bác sĩ khác xem hồ sơ và lịch sử điều trị, không sửa),
 * hoặc chính bệnh nhân. Quản trị kỹ thuật không mặc định có quyền xem lâm sàng.
 * Sửa dữ liệu dùng useCanManage (bác sĩ phụ trách). Đây là kiểm tra phía ứng dụng, không thay phân quyền máy chủ.
 */
export function useCanView(patient?: Patient) {
  const { me } = useStore();
  if (!me || !patient) return false;
  if (me.role === 'doctor') return !me.locked && !me.pendingApproval;
  if (me.role === 'patient') return me.patientId === patient.id;
  return false;
}

/**
 * Màn chặn. Tách hai trường hợp (rà soát giao diện 11/11/2026, mục 7): `notFound` khi mã trong đường dẫn không có trong dữ liệu,
 * còn lại là không có quyền. Tiêu đề ngắn để không bị cắt trên máy 360 pt.
 */
export function NoAccess({ notFound = false }: { notFound?: boolean }): ReactNode {
  return (
    <Screen header={<Header back title={notFound ? 'Không tìm thấy' : 'Không có quyền'} />}>
      {notFound
        ? <Empty icon="search-outline" text="Không tìm thấy mục này. Có thể mục đã bị xóa hoặc đường dẫn không đúng." />
        : <Empty icon="lock-closed-outline" text="Tài khoản này không được phân công cho hồ sơ này nên không xem được." />}
      <Button label="Quay lại" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  );
}

/** Giai đoạn B (CN1 H8, H9): bác sĩ phụ trách hồ sơ (cùng quy tắc với store.requireDoctor, chưa xét lưu trữ). */
export function useCanManage(patient?: Patient) {
  const { me } = useStore();
  return canManagePatient(me, patient);
}
