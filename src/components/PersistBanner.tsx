// Stage 9C (gói D): báo sự cố lưu trữ ở đầu mọi màn. Chỉ hiện khi có sự cố; bình thường không chiếm chỗ.
// Đặt ở đầu màn, không phủ lên chân màn, nên nút Dừng điều trị ở T02 vẫn thấy và bấm được.
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Notice } from '@/components/ui';
import { useStore } from '@/lib/store';

export function PersistBanner() {
  const { persistIssue, retryPersist, dismissPersistIssue } = useStore();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [failedAgain, setFailedAgain] = useState(false);
  if (!persistIssue) return null;
  const retry = async () => {
    setBusy(true);
    try {
      await retryPersist();
      setFailedAgain(false);
    } catch {
      setFailedAgain(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View testID="persist-banner" style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
      {persistIssue.kind === 'write_failed' && (
        <>
          <Notice tone="red" icon="cloud-offline-outline">
            {failedAgain
              ? 'Vẫn chưa lưu được vào bộ nhớ máy. Thay đổi gần nhất đang hiển thị nhưng có thể mất khi đóng ứng dụng. Kiểm tra dung lượng trống rồi thử lại.'
              : 'Chưa lưu được thay đổi gần nhất vào bộ nhớ máy. Thay đổi đang hiển thị nhưng có thể mất khi đóng ứng dụng.'}
          </Notice>
          <Button label="Thử lưu lại" variant="secondary" icon="refresh-outline" onPress={retry} loading={busy} />
        </>
      )}
      {persistIssue.kind === 'unreadable' && (
        <>
          <Notice tone="amber" icon="alert-circle-outline">
            {persistIssue.backupKey
              ? 'Dữ liệu cũ trên máy không đọc được nên ứng dụng đang dùng dữ liệu mẫu. Bản cũ đã được giữ lại nguyên vẹn để kiểm tra.'
              : 'Dữ liệu cũ trên máy không đọc được nên ứng dụng đang dùng dữ liệu mẫu. Chưa giữ lại được bản cũ.'}
          </Notice>
          <Button label="Đã hiểu" variant="ghost" onPress={dismissPersistIssue} />
        </>
      )}
      {persistIssue.kind === 'read_failed' && (
        <Notice tone="red" icon="cloud-offline-outline">
          Không đọc được bộ nhớ máy. Ứng dụng tạm không lưu thay đổi để không ghi đè dữ liệu cũ. Đóng rồi mở lại ứng dụng.
        </Notice>
      )}
    </View>
  );
}
