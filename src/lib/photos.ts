import * as ImagePicker from 'expo-image-picker';

import { notify } from './dialog';
import { extFromUri } from './naming';
import type { WoundImage } from './types';
import { localDay } from './course';

export interface PickedPhoto {
  uri: string;
  ext: WoundImage['ext'];
  /** Ngày chụp lấy từ EXIF nếu có; khác với ngày tải lên (đặc tả mục 10). */
  captureDate: string;
  width: number;
  height: number;
  sourceDateKnown: boolean;
}

function exifDate(exif: Record<string, unknown> | null | undefined): string | null {
  const raw = (exif?.DateTimeOriginal ?? exif?.DateTime) as string | undefined;
  const m = typeof raw === 'string' ? raw.match(/^(\d{4}):(\d{2}):(\d{2})/) : null;
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export async function pickPhoto(source: 'camera' | 'library'): Promise<PickedPhoto | null> {
  const perm = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    notify('Chưa được cấp quyền', source === 'camera' ? 'Hãy cho phép ứng dụng dùng camera trong Cài đặt.' : 'Hãy cho phép ứng dụng truy cập ảnh trong Cài đặt.');
    return null;
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: true, allowsEditing: false };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    ext: extFromUri(a.fileName ?? a.uri, a.mimeType),
    captureDate: exifDate(a.exif) ?? localDay(),
    width: a.width,
    height: a.height,
    sourceDateKnown: source === 'camera' || exifDate(a.exif) !== null,
  };
}
