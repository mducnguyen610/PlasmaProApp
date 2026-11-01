import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { Button, Card, Field, Header, Muted, Screen, Segmented } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

// Báo triệu chứng / sự cố gửi cho người phụ trách (đặc tả mục 6).
export default function Report() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const { me, addReport } = useStore();
  const [kind, setKind] = useState<'symptom' | 'device'>(params.kind === 'device' ? 'device' : 'symptom');
  const [content, setContent] = useState('');
  const [pain, setPain] = useState<number | null>(null);
  if (!me?.patientId) return null;

  const send = () => {
    addReport({ patientId: me.patientId!, kind, content: content.trim(), painLevel: kind === 'symptom' && pain !== null ? pain : undefined });
    notify('Đã gửi', 'Bác sĩ phụ trách sẽ nhận được thông tin.');
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
            <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>Mức đau (0 = không đau, 10 = đau nhất)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {Array.from({ length: 11 }, (_, i) => (
                <Pressable key={i} onPress={() => setPain(i)} style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: pain === i ? C.primary : C.surfaceMuted }}>
                  <Text style={{ color: pain === i ? C.onPrimary : C.text, fontWeight: '700' }}>{i}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        <Field label="Mô tả" value={content} onChangeText={setContent} multiline placeholder={kind === 'symptom' ? 'Đau, rát, chảy dịch, sốt…' : 'Không bật được, mất Wi-Fi, báo lỗi…'} />
      </Card>
      <Button label="Gửi" icon="send" disabled={!content.trim()} onPress={send} />
    </Screen>
  );
}
