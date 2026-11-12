import { View } from 'react-native';
import { Text } from './Text';
import { Card, Chip, Muted } from './ui';
import type { CaptureQuality } from '@/lib/capture/types';
import { T } from '@/theme';

export function CaptureQualityCard({ quality, busy = false }: { quality: CaptureQuality; busy?: boolean }) {
  return <Card>
    <Text style={{ fontWeight: '700', fontSize: T.body }}>{busy ? 'Đang kiểm tra vùng chọn…' : 'Kiểm tra ảnh'}</Text>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Chip label={quality.lighting === 'warn' ? 'Ánh sáng: cần xem lại' : 'Ánh sáng: cần xác nhận'} tone={quality.lighting === 'warn' ? 'amber' : 'gray'} />
      <Chip label={quality.sharpness === 'warn' ? 'Độ nét: cần xem lại' : 'Độ nét: cần xác nhận'} tone={quality.sharpness === 'warn' ? 'amber' : 'gray'} />
    </View>
    <Muted>{quality.warnings[0] || 'Kiểm tra ánh sáng, độ nét và toàn bộ vết thương trước khi lưu.'}</Muted>
    <Muted>Gợi ý chất lượng đang thử nghiệm, chưa hiệu chuẩn cho từng loại mô và màu da. Không xác nhận độ chính xác của phép đo.</Muted>
  </Card>;
}

