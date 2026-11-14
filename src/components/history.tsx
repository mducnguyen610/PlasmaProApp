import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { Chip, WoundPhoto } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { formatAreaDisplay } from '@/lib/naming';
import type { WoundImage } from '@/lib/types';
import type { RecordKind, SaveState } from '@/lib/woundHistory';
import { C, T, radius, type Tone } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

// Giai đoạn 4 giao diện theo tác vụ: thành phần dùng chung cho Lịch sử vết thương (wound-history), chi tiết bản ghi, so sánh ảnh.

export const KIND_META: Record<RecordKind, { label: string; icon: IconName; tone: Tone }> = {
  'danh-gia': { label: 'Đánh giá', icon: 'clipboard-outline', tone: 'violet' },
  anh: { label: 'Ảnh chụp', icon: 'image-outline', tone: 'teal' },
  dot: { label: 'Đợt điều trị', icon: 'flash-outline', tone: 'violet' },
  buoi: { label: 'Buổi điều trị', icon: 'time-outline', tone: 'teal' },
};

/** Nhãn trạng thái lưu theo loại bản ghi. Chỉ đặt tên cho trạng thái có sẵn trong dữ liệu, không thêm trạng thái mới. */
export function saveStateLabel(kind: RecordKind, state: SaveState): { label: string; tone: Tone; icon: IconName } {
  if (state === 'nhap') return { label: 'Nháp, chưa áp dụng', tone: 'gray', icon: 'create-outline' };
  if (state === 'da-loai') return { label: 'Đã loại khỏi bộ dữ liệu', tone: 'gray', icon: 'remove-circle-outline' };
  if (kind === 'anh') return state === 'xac-nhan' ? { label: 'Đã lưu, có số đo bác sĩ', tone: 'green', icon: 'checkmark-circle-outline' } : { label: 'Đã lưu, chưa đo', tone: 'amber', icon: 'ellipse-outline' };
  if (kind === 'dot') return state === 'xac-nhan' ? { label: 'Bác sĩ đã xác nhận', tone: 'green', icon: 'checkmark-circle-outline' } : { label: 'Đã lưu, chưa xác nhận', tone: 'amber', icon: 'ellipse-outline' };
  if (kind === 'buoi') return { label: 'Đã ghi', tone: 'blue', icon: 'checkmark-outline' };
  return { label: 'Đã lưu', tone: 'blue', icon: 'checkmark-outline' };
}

export function SaveStateChip({ kind, state }: { kind: RecordKind; state: SaveState }) {
  const s = saveStateLabel(kind, state);
  return <Chip label={s.label} tone={s.tone} icon={s.icon} />;
}

/** Ngày chụp của ảnh, ghi rõ khi chưa xác định (không lấy ngày tải lên thay). */
export const photoDay = (im: Pick<WoundImage, 'captureDate' | 'capture'>) => (im.capture?.sourceDateKnown === false ? 'Ngày chụp chưa rõ' : fmtDate(im.captureDate));

/**
 * Ô ảnh trong Lịch sử vết thương. Chạm mở ảnh ở chế độ xem riêng; ở chế độ chọn thì chọn hoặc bỏ chọn để so sánh.
 * `pick` là nhãn vai trò khi đang được chọn ("Trước"/"Sau"). Ảnh gốc hiển thị, không cắt sửa.
 */
export function HistoryPhotoTile({ image, width, onPress, selecting, pick, disabledNote, role = 'button' }: {
  image: WoundImage; width: number; onPress: () => void; selecting?: boolean; pick?: string | null; disabledNote?: string; role?: 'button' | 'checkbox' | 'radio';
}) {
  const day = photoDay(image);
  const area = image.areaCm2 === null ? 'chưa đo' : formatAreaDisplay(image.areaCm2);
  const checked = !!pick;
  const a11y = role === 'button'
    ? `Xem ảnh ${image.id}, ${day}, ${area}`
    : `Ảnh ${image.id}, ${day}, ${area}${pick ? `, đang chọn làm ảnh ${pick.toLowerCase()}` : ''}${disabledNote ? `, ${disabledNote}` : ''}`;
  return (
    <Pressable onPress={onPress} accessibilityRole={role} accessibilityState={role === 'button' ? undefined : { checked }} accessibilityLabel={a11y} style={({ pressed }) => ({ width, opacity: pressed ? 0.8 : 1 })}>
      <View style={{ borderRadius: radius.m, borderWidth: 3, borderColor: checked ? C.primary : 'transparent' }}>
        <WoundPhoto image={image} style={{ width: width - 6, height: (width - 6) * 0.75, borderRadius: radius.m - 2 }} />
        <View style={{ position: 'absolute', top: 6, left: 6 }}>
          <Chip label={image.areaCm2 !== null ? formatAreaDisplay(image.areaCm2) : 'Chưa đo'} tone={image.status === 'excluded' ? 'gray' : image.areaCm2 !== null ? 'green' : 'amber'} />
        </View>
        {selecting && (
          <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: checked ? C.primary : C.card, borderRadius: 14, minWidth: 28, height: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: checked ? C.primary : C.border }}>
            {checked ? <Text style={{ color: C.onPrimary, fontWeight: '700', fontSize: T.caption }}>{pick}</Text> : <Ionicons name="ellipse-outline" size={16} color={C.textSoft} />}
          </View>
        )}
      </View>
      <Text style={{ fontSize: T.caption, color: C.text, fontWeight: '600', marginTop: 6 }}>{image.id} · {day}</Text>
      {disabledNote ? <Text style={{ fontSize: T.caption, color: C.textSoft }}>{disabledNote}</Text> : null}
    </Pressable>
  );
}

// Cùng nhãn với màn thiết bị (DeviceView); chuyển từ B05 qua giai đoạn 1.
export const SESSION_STATUS = { completed: 'Hoàn tất', interrupted: 'Bị ngắt', over_limit: 'Ngắt do vượt ngưỡng' } as const;
export const SESSION_SOURCE = { device: 'Thiết bị gửi', manual: 'Nhập tay', simulated: 'Mô phỏng' } as const;
