import { Asset } from 'expo-asset';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import JSZip from 'jszip';
import { Platform } from 'react-native';

import { trainingImages } from './imageLabel';
import { researchCaptureMetadata, researchCsv, researchFilename, researchLabels } from './research';
import { DEMO_ASSETS } from './seed';
import type { AppData, WoundImage } from './types';

export function exportableImages(data: AppData, actorId: string): WoundImage[] {
  return trainingImages(data, data.accounts.find(a => a.id === actorId));
}
export const buildCsv = researchCsv;

export async function readImageBytes(im: WoundImage): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const url = im.uri ?? Asset.fromModule(DEMO_ASSETS[im.demoAsset ?? 1]).uri;
    return new Uint8Array(await (await fetch(url)).arrayBuffer());
  }
  const { File } = await import('expo-file-system');
  if (im.uri) return new File(im.uri).bytes();
  const asset = await Asset.fromModule(DEMO_ASSETS[im.demoAsset ?? 1]).downloadAsync();
  return new File(asset.localUri ?? asset.uri).bytes();
}

/**
 * Giai đoạn B (CN2): bản PNG vẽ lại từ điểm ảnh để bỏ metadata (EXIF, vị trí, thiết bị). Ảnh gốc không bị sửa.
 * Ảnh demo và bản nghiên cứu cũ (researchUri) dùng thẳng vì đã là bản không metadata.
 */
async function strippedBytes(im: WoundImage): Promise<Uint8Array> {
  if (im.researchUri === 'demo' || !im.uri) return readImageBytes({ ...im, uri: null });
  if (im.researchUri) return readImageBytes({ ...im, uri: im.researchUri });
  const rendered = await ImageManipulator.manipulate(im.uri).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.PNG, compress: 1 });
  return readImageBytes({ ...im, uri: saved.uri });
}

export interface ExportResult {
  count: number;
  zipName: string;
  shared: boolean;
  location: string;
}

/** Tạo ZIP chứa ảnh mang tên đã sửa + labels.csv, rồi mở bảng chia sẻ của iOS để lưu/gửi. */
export async function exportDataset(data: AppData, images: WoundImage[], actorId: string): Promise<ExportResult> {
  const allowed = new Map(exportableImages(data, actorId).map(im => [im.id, im]));
  if (!images.length || images.some(im => !allowed.has(im.id))) throw new Error('Ảnh hoặc tài khoản không đủ quyền xuất dữ liệu.');
  images = images.map(im => allowed.get(im.id)!);
  const zip = new JSZip();
  const folder = zip.folder('images')!;
  for (const im of images) {
    // Tệp trong ZIP mang tên đã sửa, không chỉ đổi tiêu đề hiển thị (đặc tả 4.4, 12).
    folder.file(researchFilename(data, im), await strippedBytes(im));
  }
  zip.file('labels.csv', buildCsv(data, images));
  zip.file('labels.json', JSON.stringify(researchLabels(data, images), null, 2));
  zip.file('capture-quality.json', JSON.stringify(researchCaptureMetadata(images), null, 2));
  zip.file(
    'README.txt',
    [
      'Bo du lieu anh vet thuong da duoc bac si gan nhan va xac nhan (loai anh, vien vet, 5 tinh chat, muc tin cay, chat luong Dat).',
      'Ten tep: <ma_nghien_cuu>_<ma_vet_thuong>_<ma_anh>[_area_<dien_tich>_cm2].png',
      'Chi gom anh da xac nhan nhan, chat luong Dat, khong danh dau Khong su dung, va benh nhan dong y dung du lieu.',
      'Anh PNG la ban ve lai da bo metadata; anh goc va du doan AI ban dau duoc giu rieng trong ung dung.',
      'CSV va labels.json khong co ho ten, dien thoai, nam sinh, ngay chup, ma ho so lam sang hay ghi chu tu do.',
      'labels.json: vien bac si chot (toa do 0..1), muc 5 tinh chat, du doan AI goc, so ngay tu ngay bat dau theo doi vet, thu tu chup, phien ban phac do neu anh chup sau phien.',
      'Cot split: chia train/val/test theo benh nhan.',
      'capture-quality.json: nguon anh, ROI, chat luong thu nghiem va so do tham chieu; khong co ID thiet bi/bac si, thoi gian hay ghi chu tu do.',
      'automatic_area_cm2: uoc luong AR (vung khoanh theo mau + khoang cach + noi tham so camera), CHUA KIEM CHUNG; null neu khong co AR. Nhan chuan la area_reference_cm2 do bac si xac nhan. Nhan synthetic_demo chi la du lieu mo phong.',
      `Xuat luc: ${new Date().toISOString()}`,
    ].join('\n'),
  );
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '').replace('T', '_');
  const zipName = `plasmapro_dataset_${stamp}.zip`;

  if (Platform.OS === 'web') {
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = zipName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    return { count: images.length, zipName, shared: true, location: 'Thư mục Tải xuống của trình duyệt' };
  }

  const bytes = await zip.generateAsync({ type: 'uint8array' });
  const { Directory, File, Paths } = await import('expo-file-system');
  const dir = new Directory(Paths.document, 'exports');
  if (!dir.exists) dir.create();
  const out = new File(dir, zipName);
  out.create();
  out.write(bytes);
  const Sharing = await import('expo-sharing');
  let shared = false;
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(out.uri, { UTI: 'public.zip-archive', mimeType: 'application/zip', dialogTitle: zipName });
    shared = true;
  }
  return { count: images.length, zipName, shared, location: out.uri };
}
