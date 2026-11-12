import { Alert, Platform } from 'react-native';

/** Hộp xác nhận. `okLabel` nên nêu hành động cụ thể (Đợt 8). `cancelLabel` tùy chọn, mặc định "Hủy".
 *  Bản web dùng window.confirm nên không đặt được tên nút. */
export function confirm(title: string, msg: string, onOk: () => void, okLabel = 'Đồng ý', cancelLabel = 'Hủy') {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${msg}`)) onOk();
    return;
  }
  Alert.alert(title, msg, [{ text: cancelLabel, style: 'cancel' }, { text: okLabel, onPress: onOk }]);
}

export function notify(title: string, msg?: string) {
  if (Platform.OS === 'web') {
    window.alert(msg ? `${title}\n\n${msg}` : title);
    return;
  }
  Alert.alert(title, msg);
}
