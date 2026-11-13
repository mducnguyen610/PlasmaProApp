import { usePreventRemove } from 'expo-router';
import { useState } from 'react';

import { confirm } from '@/lib/dialog';

/**
 * P0 SV-05: rời màn khi biểu mẫu còn dữ liệu chưa lưu thì hỏi trước. Không tự lưu.
 * Trả về hàm tắt chặn, gọi ngay trước khi màn tự điều hướng sau khi lưu xong.
 */
export function useDiscardGuard(dirty: boolean): () => void {
  const [leaving, setLeaving] = useState(false);
  return usePreventRemove(dirty && !leaving, ({ repeat }) => {
    confirm(
      'Bỏ dữ liệu chưa lưu?',
      'Thông tin vừa nhập trên màn này chưa được lưu và sẽ mất khi rời màn.',
      () => { setLeaving(true); repeat(); },
      'Bỏ dữ liệu',
      'Ở lại',
    );
  });
}
