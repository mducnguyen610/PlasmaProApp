import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { NoAccess } from '@/components/Guard';
import { Text } from '@/components/Text';

import { Button, Card, Chip, Disclosure, Field, Header, Muted, Screen, Segmented } from '@/components/ui';
import { useDiscardGuard } from '@/components/useDiscardGuard';
import { notify } from '@/lib/dialog';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/lib/store';
import { C, size, T } from '@/theme';

// Báo triệu chứng / sự cố gửi cho người phụ trách (đặc tả mục 6).
// Ngưỡng đau 7/10 để hiện cảnh báo là đề xuất cho bản demo, cần bác sĩ xác nhận.
const HIGH_PAIN = 7;
export default function Report() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const { me, data, addReport } = useStore();
  const [kind, setKind] = useState<'symptom' | 'device'>(params.kind === 'device' ? 'device' : 'symptom');
  const [content, setContent] = useState('');
  const [pain, setPain] = useState<number | null>(null);
  // Máy hẹp (dưới 380 px) chia 3 hàng 4 ô để mỗi ô vẫn rộng ít nhất 44 px (A04, audit lần 2).
  const { width } = useWindowDimensions();
  const rows = width < 380 ? [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10]] : [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10]];
  const perRow = rows[0].length;
  // P2-06 (R2-06, A22): đã nhập mà rời màn thì hỏi trước. Không tự lưu.
  const [sent, setSent] = useState(false);
  const allowLeave = useDiscardGuard((!!content.trim() || pain !== null) && !sent);
  if (!me?.patientId) return <NoAccess />;
  // P2-06 (R2-06, A21): báo cáo đã gửi của chính bệnh nhân, trạng thái lấy từ trường handled bác sĩ đánh dấu.
  const mine = data.reports.filter((r) => r.patientId === me.patientId).slice(0, 10);

  // Luồng an toàn (UR4): chọn mức đau là đủ để gửi, không bắt gõ chữ.
  const hasPain = kind === 'symptom' && pain !== null;
  const canSend = !!content.trim() || hasPain;

  const send = () => {
    setSent(true); allowLeave();
    addReport({ patientId: me.patientId!, kind, content: content.trim() || `Mức đau ${pain}/10`, painLevel: kind === 'symptom' && pain !== null ? pain : undefined });
    // Không hứa thời gian phản hồi: bản demo lưu cục bộ, bác sĩ chỉ thấy khi mở ứng dụng.
    notify('Đã ghi nhận', 'Bác sĩ phụ trách sẽ xem khi mở ứng dụng. Nếu đau tăng, sốt, chảy máu hoặc mủ nhiều, hãy gọi 115 hoặc đến cơ sở y tế. Đừng chờ trả lời trong ứng dụng.');
    router.back();
  };

  // PP-15: ở 320 px tiêu đề một dòng bị cắt; cho xuống 2 dòng, giữ chữ. Câu chữ theo bảng đã duyệt C21 đến C24 (Đợt 5).
  return (
    <Screen header={<Header back title="Báo triệu chứng / sự cố" titleLines={2} />}>
      <Card style={{ backgroundColor: C.redSoft }}>
        <Text style={{ color: C.red, fontWeight: '700' }}>Khi khẩn cấp, hãy gọi 115 hoặc đến cơ sở y tế gần nhất.</Text>
        <Muted>Ứng dụng không thay thế cấp cứu. Không có ai theo dõi ứng dụng liên tục.</Muted>
      </Card>
      <Card>
        <Segmented value={kind} onChange={setKind} options={[{ value: 'symptom', label: 'Triệu chứng' }, { value: 'device', label: 'Sự cố thiết bị' }]} />
        {kind === 'symptom' && (
          <>
            {/* P2-06 (R2-06): tiêu đề nhóm ghi rõ hai đầu thang; thang, ngưỡng và câu cảnh báo giữ nguyên. */}
            <Text style={{ color: C.text, fontSize: T.small, fontWeight: '600' }}>Mức đau (0 là không đau, 10 là đau nhất)</Text>
            {/* Các hàng đều cột, chữ mốc ở hai đầu thang (V18); số hàng theo độ rộng màn (A04). */}
            <View accessibilityRole="radiogroup" accessibilityLabel="Mức đau" style={{ gap: 6 }}>
              {rows.map((row) => (
                <View key={row[0]} style={{ flexDirection: 'row', gap: 6 }}>
                  {row.map((i) => (
                    <Pressable key={i} onPress={() => setPain(i)} accessibilityRole="radio" accessibilityLabel={`Mức đau ${i}${i === 0 ? ', không đau' : i === 10 ? ', đau nhất' : ''}`} accessibilityState={{ checked: pain === i, selected: pain === i }} style={{ flex: 1, minWidth: size.touch, height: size.touch, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: pain === i ? C.primary : C.surfaceMuted, borderWidth: 1, borderColor: pain === i ? C.primary : C.cardBorder }}>
                      <Text style={{ color: pain === i ? C.onPrimary : C.text, fontWeight: '700' }}>{i}</Text>
                    </Pressable>
                  ))}
                  {Array.from({ length: perRow - row.length }, (_, k) => <View key={`pad-${k}`} style={{ flex: 1, minWidth: size.touch }} />)}
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: C.textSoft, fontSize: T.small }}>0: không đau</Text>
                <Text style={{ color: C.textSoft, fontSize: T.small }}>10: đau nhất</Text>
              </View>
            </View>
            {pain !== null && pain >= HIGH_PAIN && (
              <Text accessibilityRole="alert" style={{ color: C.red, fontWeight: '700' }}>
                Mức đau {pain}/10 là cao. Hãy gọi bác sĩ hoặc đến cơ sở y tế ngay. Đồng thời, gửi báo cáo này.
              </Text>
            )}
          </>
        )}
        <Field label={kind === 'symptom' ? 'Mô tả thêm (không bắt buộc)' : 'Mô tả'} value={content} onChangeText={setContent} multiline placeholder={kind === 'symptom' ? 'Đau, rát, chảy dịch, sốt…' : 'Không bật được, mất Wi-Fi, báo lỗi…'} />
      </Card>
      <Button label="Gửi" icon="send" disabled={!canSend} onPress={send} reason={kind === 'symptom' ? 'Chọn mức đau hoặc nhập mô tả để gửi.' : 'Nhập mô tả sự cố để gửi.'} />
      {mine.length > 0 && (
        <Card>
          <Disclosure icon="document-text-outline" title="Đã gửi" summary={`${mine.length} báo cáo gần nhất`}>
            {mine.map((r, i) => (
              <View key={r.id} style={[{ gap: 4 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }]}>
                <Text style={{ color: C.text, fontWeight: '600' }}>{fmtDateTime(r.date)} · {r.kind === 'symptom' ? 'Triệu chứng' : 'Sự cố thiết bị'}{r.painLevel != null ? ` · Mức đau ${r.painLevel}/10` : ''}</Text>
                <Text style={{ color: C.textSoft }}>{r.content}</Text>
                <View style={{ flexDirection: 'row' }}>
                  {r.handled
                    ? <Chip label="Bác sĩ đã đánh dấu đã xử lý" tone="gray" icon="checkmark-circle-outline" />
                    : <Chip label="Chưa được xử lý" tone="gray" icon="time-outline" />}
                </View>
              </View>
            ))}
            <Muted>Trạng thái do bác sĩ đánh dấu khi mở ứng dụng. Ứng dụng không hẹn thời gian trả lời.</Muted>
          </Disclosure>
        </Card>
      )}
    </Screen>
  );
}
