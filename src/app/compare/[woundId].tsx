import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { ClinicalContext } from '@/components/ClinicalContext';
import { NoAccess, useCanView } from '@/components/Guard';
import { Card, Chip, Choices, Header, Muted, Notice, Screen, StatusChip, TextLink, WoundPhoto } from '@/components/ui';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { daysBetween, measurementSource } from '@/lib/measurementSource';
import { formatAreaDisplay } from '@/lib/naming';
import { useLookups } from '@/lib/store';
import { C } from '@/theme';
import { SOURCE } from '@/theme.status';

// So sánh ảnh trước và sau của cùng một vết thương (đặc tả mục 8).
export default function Compare() {
  const { woundId } = useLocalSearchParams<{ woundId: string }>();
  const { wound, patient, imagesOf, account } = useLookups();
  const w = wound(woundId);
  const p = patient(w?.patientId);
  const canView = useCanView(p);
  const images = w ? imagesOf(w.id) : [];
  const [a, setA] = useState(images[0]?.id ?? '');
  const [b, setB] = useState(images[images.length - 1]?.id ?? '');
  // P1-04b: bộ chọn đang mở (0 = ảnh trước, 1 = ảnh sau), danh sách hiện ngay dưới hai dòng chọn.
  const [picking, setPicking] = useState<0 | 1 | null>(null);
  if (!w || !p || !canView || images.length === 0) return <NoAccess />;

  const A = images.find((i) => i.id === a) ?? images[0];
  const B = images.find((i) => i.id === b) ?? images[images.length - 1];
  // Nhãn chip là ngày và diện tích, mã ảnh chỉ đọc cho trình đọc màn hình (V31).
  // P1-07e: danh sách chọn xếp mới trước, như album B05 và B12. Chỉ gồm ảnh của vết đang mở (imagesOf).
  const opts = [...images].reverse().map((i) => {
    const day = i.capture?.sourceDateKnown === false ? 'Chưa rõ ngày' : fmtDate(i.captureDate).slice(0, 5);
    const area = i.areaCm2 === null ? 'chưa đo' : formatAreaDisplay(i.areaCm2);
    return { value: i.id, label: `${day}, ${area}`, a11y: `Ảnh ${i.id}, ${day}, ${area}` };
  });
  const diff = A.areaCm2 !== null && B.areaCm2 !== null ? B.areaCm2 - A.areaCm2 : null;
  // P0 DS-05: chỉ nêu điều đọc được từ dữ liệu, không đổi cách tính chênh lệch.
  const methodOf = (i: typeof A) => i.measureMethod?.trim() || null;
  const methodsDiffer = diff !== null && methodOf(A) !== methodOf(B);
  const dateKnown = (i: typeof A) => i.capture?.sourceDateKnown !== false;
  const reversed = A.id !== B.id && dateKnown(A) && dateKnown(B) && A.captureDate > B.captureDate;
  const gapDays = A.id !== B.id && dateKnown(A) && dateKnown(B) ? daysBetween(A.captureDate, B.captureDate) : null;
  const dayText = (i: typeof A) => (dateKnown(i) ? fmtDate(i.captureDate) : 'Chưa rõ ngày');
  // P1-04a: người nhập số đo, cùng hàm với B11.
  const sourceText = (i: typeof A) => {
    const src = measurementSource(i);
    return src ? `Nhập bởi ${account(src.by)?.name ?? 'tài khoản không còn trong danh sách'}${src.at ? ` lúc ${fmtDateTime(src.at)}` : ''}` : 'Chưa có thông tin người nhập';
  };
  const pick = (side: 0 | 1) => (v: string) => { (side === 0 ? setA : setB)(v); setPicking(null); };

  return (
    <Screen header={<Header back title="So sánh trước / sau" />}>
      {/* P0 G1: bệnh nhân và vết thương của hai ảnh. */}
      <ClinicalContext patient={p} wound={w} />
      {/* P1-04b: mỗi bên một dòng chọn ngay trên ảnh; chạm mở danh sách ảnh của vết (mới trước), chọn xong tự đóng. */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[A, B].map((im, i) => (
          <View key={i} style={{ flex: 1 }}>
            <TextLink label={picking === i ? 'Đóng danh sách' : `Đổi ảnh ${i === 0 ? 'trước' : 'sau'}`} accessibilityLabel={`${picking === i ? 'Đóng danh sách chọn' : 'Đổi'} ảnh ${i === 0 ? 'trước' : 'sau'}, đang chọn ${im.id}, ${dayText(im)}`} onPress={() => setPicking(picking === i ? null : (i as 0 | 1))} />
          </View>
        ))}
      </View>
      {picking !== null && (
        <Card>
          <Text style={{ fontWeight: '600', color: C.text }}>{picking === 0 ? 'Chọn ảnh trước' : 'Chọn ảnh sau'} của {w.code} (mới trước)</Text>
          <Choices value={picking === 0 ? A.id : B.id} onChange={pick(picking)} options={opts} />
        </Card>
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[A, B].map((im, i) => (
          <View key={i} style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontWeight: '700', color: C.text }}>{i === 0 ? 'Trước' : 'Sau'}</Text>
            {/* P1-04a: chạm ảnh mở B11 của đúng ảnh đó; quay lại vẫn giữ cặp đang so. P1-04b: contain để không cắt mép ảnh gốc. */}
            <Pressable onPress={() => router.push(`/images/${im.id}`)} accessibilityRole="button" accessibilityLabel={`Mở ảnh ${im.id}, ${dayText(im)}`}>
              <WoundPhoto image={im} fit="contain" style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 14 }} />
            </Pressable>
            <Text style={{ color: C.text, fontWeight: '600' }}>{im.capture?.sourceDateKnown === false ? 'Ngày chụp chưa xác định' : fmtDate(im.captureDate)}</Text>
            <Muted>{im.areaCm2 === null ? 'Chưa đo' : formatAreaDisplay(im.areaCm2)}</Muted>
            {im.areaCm2 !== null && <View style={{ flexDirection: 'row' }}><StatusChip status={SOURCE.doctor} label={SOURCE.doctor.label} /></View>}
            {im.areaCm2 !== null && <Muted>{`Phương pháp: ${methodOf(im) ?? 'chưa ghi'}`}</Muted>}
            {im.areaCm2 !== null && <Muted>{sourceText(im)}</Muted>}
            {im.status === 'excluded' && <View style={{ flexDirection: 'row' }}><Chip label="Đã loại khỏi bộ dữ liệu" tone="gray" /></View>}
          </View>
        ))}
      </View>
      {reversed && <Notice icon="swap-vertical-outline">{`Ảnh "Trước" (${fmtDate(A.captureDate)}) chụp sau ảnh "Sau" (${fmtDate(B.captureDate)}). Chênh lệch bên dưới đang tính ngược thời gian.`}</Notice>}
      {methodsDiffer && <Notice icon="alert-circle-outline">{`Hai số đo dùng phương pháp khác nhau (${methodOf(A) ?? 'chưa ghi'} và ${methodOf(B) ?? 'chưa ghi'}). Chênh lệch có thể do cách đo.`}</Notice>}
      <Card>
        <Text style={{ fontWeight: '700', color: C.text }}>
          {diff === null ? 'Chưa đủ số đo để so sánh diện tích.' : `Chênh lệch: ${diff > 0 ? '+' : ''}${formatAreaDisplay(Math.round(diff * 1000) / 1000)}`}
        </Text>
        {gapDays !== null && <Muted>{`Hai ảnh chụp cách nhau ${gapDays} ngày.`}</Muted>}
        <Muted>Số đo do bác sĩ nhập; nếu phương pháp đo thay đổi giữa hai lần, cần lưu ý khi so sánh.</Muted>
      </Card>
    </Screen>
  );
}
