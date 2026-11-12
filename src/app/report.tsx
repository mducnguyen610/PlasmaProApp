import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { NoAccess } from '@/components/Guard';
import { Text } from '@/components/Text';

import { Button, Card, Field, Header, Muted, Screen, Segmented } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { useStore } from '@/lib/store';
import { C, size } from '@/theme';

// Báo triệu chứng / sự cố gửi cho người phụ trách (đặc tả mục 6).
// Ngưỡng đau 7/10 để hiện cảnh báo là đề xuất cho bản demo, cần bác sĩ xác nhận.
const HIGH_PAIN = 7;
export default function Report() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const { me, addReport } = useStore();
  const [kind, setKind] = useState<'symptom' | 'device'>(params.kind === 'device' ? 'device' : 'symptom');
  const [content, setContent] = useState('');
  const [pain, setPain] = useState<number | null>(null);
  // Máy hẹp (dưới 380 px) chia 3 hàng 4 ô để mỗi ô vẫn rộng ít nhất 44 px (A04, audit lần 2).
  const { width } = useWindowDimensions();
  const rows = width < 380 ? [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10]] : [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10]];
  const perRow = rows[0].length;
  if (!me?.patientId) return <NoAccess />;

  // Luồng an toàn (UR4): chọn mức đau là đủ để gửi, không bắt gõ chữ.
  const hasPain = kind === 'symptom' && pain !== null;
  const canSend = !!content.trim() || hasPain;

  const send = () => {
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
            <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>Mức đau</Text>
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
                <Text style={{ color: C.textSoft, fontSize: 14 }}>0: không đau</Text>
                <Text style={{ color: C.textSoft, fontSize: 14 }}>10: đau nhất</Text>
              </View>
            </View>
            {pain !== null && pain >= HIGH_PAIN && (
              <Text accessibilityRole="alert" style={{ color: C.red, fontWeight: '700' }}>
                Mức đau {pain}/10 là cao. Hãy gọi bác sĩ hoặc đến cơ sở y tế ngay. Đồng thời, gửi báo cáo này.
              </Text>
            )}
          </>
        )}
        <Field label="Mô tả" value={content} onChangeText={setContent} multiline placeholder={kind === 'symptom' ? 'Đau, rát, chảy dịch, sốt…' : 'Không bật được, mất Wi-Fi, báo lỗi…'} />
      </Card>
      <Button label="Gửi" icon="send" disabled={!canSend} onPress={send} reason={kind === 'symptom' ? 'Chọn mức đau hoặc nhập mô tả để gửi.' : 'Nhập mô tả sự cố để gửi.'} />
    </Screen>
  );
}
