import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { NoAccess } from '@/components/Guard';
import { Text } from '@/components/Text';

import { Button, Card, Field, Header, Muted, Screen, Segmented } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

// Báo triệu chứng / sự cố gửi cho người phụ trách (đặc tả mục 6).
// Ngưỡng đau 7/10 để hiện cảnh báo là đề xuất cho bản demo, cần bác sĩ xác nhận.
const HIGH_PAIN = 7;
export default function Report() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const { me, addReport } = useStore();
  const [kind, setKind] = useState<'symptom' | 'device'>(params.kind === 'device' ? 'device' : 'symptom');
  const [content, setContent] = useState('');
  const [pain, setPain] = useState<number | null>(null);
  if (!me?.patientId) return <NoAccess />;

  // Luồng an toàn (UR4): chọn mức đau là đủ để gửi, không bắt gõ chữ.
  const hasPain = kind === 'symptom' && pain !== null;
  const canSend = !!content.trim() || hasPain;

  const send = () => {
    addReport({ patientId: me.patientId!, kind, content: content.trim() || `Mức đau ${pain}/10`, painLevel: kind === 'symptom' && pain !== null ? pain : undefined });
    // Không hứa thời gian phản hồi: bản demo lưu cục bộ, bác sĩ chỉ thấy khi mở ứng dụng.
    notify('Đã ghi nhận', 'Bác sĩ phụ trách sẽ xem khi mở ứng dụng. Nếu đau tăng, sốt, chảy máu hoặc mủ nhiều, hãy gọi 115 hoặc đến cơ sở y tế, không chờ phản hồi trong ứng dụng.');
    router.back();
  };

  return (
    <Screen header={<Header back title="Báo triệu chứng / sự cố" />}>
      <Card style={{ backgroundColor: C.redSoft }}>
        <Text style={{ color: C.red, fontWeight: '700' }}>Trường hợp khẩn cấp hãy gọi 115 hoặc đến cơ sở y tế gần nhất.</Text>
        <Muted>Ứng dụng không thay thế cấp cứu và không được theo dõi liên tục.</Muted>
      </Card>
      <Card>
        <Segmented value={kind} onChange={setKind} options={[{ value: 'symptom', label: 'Triệu chứng' }, { value: 'device', label: 'Sự cố thiết bị' }]} />
        {kind === 'symptom' && (
          <>
            <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>Mức đau (0 = không đau, 10 = đau nhất)</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Mức đau" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {Array.from({ length: 11 }, (_, i) => (
                <Pressable key={i} onPress={() => setPain(i)} accessibilityRole="radio" accessibilityLabel={`Mức đau ${i}`} accessibilityState={{ checked: pain === i, selected: pain === i }} style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: pain === i ? C.primary : C.surfaceMuted }}>
                  <Text style={{ color: pain === i ? C.onPrimary : C.text, fontWeight: '700' }}>{i}</Text>
                </Pressable>
              ))}
            </View>
            {pain !== null && pain >= HIGH_PAIN && (
              <Text accessibilityRole="alert" style={{ color: C.red, fontWeight: '700' }}>
                Mức đau {pain}/10 là cao. Hãy gọi bác sĩ hoặc đến cơ sở y tế ngay, đồng thời gửi báo cáo này.
              </Text>
            )}
          </>
        )}
        <Field label="Mô tả" value={content} onChangeText={setContent} multiline placeholder={kind === 'symptom' ? 'Đau, rát, chảy dịch, sốt…' : 'Không bật được, mất Wi-Fi, báo lỗi…'} />
      </Card>
      <Button label="Gửi" icon="send" disabled={!canSend} onPress={send} />
      {!canSend && <Muted>{kind === 'symptom' ? 'Chọn mức đau hoặc nhập mô tả để gửi.' : 'Nhập mô tả sự cố để gửi.'}</Muted>}
    </Screen>
  );
}
