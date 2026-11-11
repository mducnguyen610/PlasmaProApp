// Nối mô-đun gốc PlasmaUsb (modules/plasma-usb) vào đường truyền. Chỉ có trong bản dựng Android
// (development build hoặc APK), không có trong Expo Go hay bản web.

import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

import { SIM_MODEL } from './capabilities';
import type { ProtocolSpec } from './spec';
import type { DeviceTransport } from './transport';
import { createUsbAndroidTransport } from './usb-android-core';
import type { UsbNative } from './usb-android-core';

export function usbAndroidAvailable(): boolean {
  return Platform.OS === 'android' && !!requireOptionalNativeModule('PlasmaUsb');
}

/** null khi không chạy được USB (không phải Android hoặc thiếu mô-đun gốc). */
export function createUsbAndroid(spec: ProtocolSpec): DeviceTransport | null {
  if (Platform.OS !== 'android') return null;
  const native = requireOptionalNativeModule<UsbNative>('PlasmaUsb');
  if (!native) return null;
  // Mẫu máy chưa biết trước khi hỏi INF; dùng khóa bảng năng lực dự phòng như giả lập.
  return createUsbAndroidTransport(native, spec, SIM_MODEL);
}
