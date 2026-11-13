import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { ClinicalContext } from '@/components/ClinicalContext';
import { NoAccess, useCanView } from '@/components/Guard';
import { Card, Chip, Choices, Header, Muted, Notice, Screen, StatusChip, WoundPhoto } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { formatAreaDisplay } from '@/lib/naming';
import { useLookups } from '@/lib/store';
import { C } from '@/theme';
import { SOURCE } from '@/theme.status';

// So sánh ảnh trước và sau của cùng một vết thương (đặc tả mục 8).
export default function Compare() {
  const { woundId } = useLocalSearchParams<{ woundId: string }>();
  const { wound, patient, imagesOf } = useLookups();
  const w = wound(woundId);
  const p = patient(w?.patientId);
  const canView = useCanView(p);
  const images = w ? imagesOf(w.id) : [];
  const [a, setA] = useState(images[0]?.id ?? '');
  const [b, setB] = useState(images[images.length - 1]?.id ?? '');
  if (!w || !p || !canView || images.length === 0) return <NoAccess />;

  const A = images.find((i) => i.id === a) ?? images[0];
  const B = images.find((i) => i.id === b) ?? images[images.length - 1];
  // Nhãn chip là ngày và diện tích, mã ảnh chỉ đọc cho trình đọc màn hình (V31).
  const opts = images.map((i) => {
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

  return (
    <Screen header={<Header back title="So sánh trước / sau" />}>
      {/* P0 G1: bệnh nhân và vết thương của hai ảnh. */}
      <ClinicalContext patient={p} wound={w} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[A, B].map((im, i) => (
          <View key={i} style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontWeight: '700', color: C.text }}>{i === 0 ? 'Trước' : 'Sau'}</Text>
            <WoundPhoto image={im} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 14 }} />
            <Text style={{ color: C.text, fontWeight: '600' }}>{im.capture?.sourceDateKnown === false ? 'Ngày chụp chưa xác định' : fmtDate(im.captureDate)}</Text>
            <Muted>{im.areaCm2 === null ? 'Chưa đo' : formatAreaDisplay(im.areaCm2)}</Muted>
            {im.areaCm2 !== null && <View style={{ flexDirection: 'row' }}><StatusChip status={SOURCE.doctor} label={SOURCE.doctor.label} /></View>}
            {im.areaCm2 !== null && <Muted>{`Phương pháp: ${methodOf(im) ?? 'chưa ghi'}`}</Muted>}
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
        <Muted>Số đo do bác sĩ nhập; nếu phương pháp đo thay đổi giữa hai lần, cần lưu ý khi so sánh.</Muted>
      </Card>
      <Card>
        <Text style={{ fontWeight: '600', color: C.text }}>Ảnh trước</Text>
        <Choices value={A.id} onChange={setA} options={opts} />
        <Text style={{ fontWeight: '600', color: C.text }}>Ảnh sau</Text>
        <Choices value={B.id} onChange={setB} options={opts} />
      </Card>
    </Screen>
  );
}
