import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { Card, Chip, Header, Muted, Screen, SectionTitle, TextLink } from '@/components/ui';
import { HARDWARE_STANDARDS, LEGAL_GROUPS } from '@/lib/compliance';
import { C } from '@/theme';

export default function Compliance() {
  return (
    <Screen header={<Header back title="Căn cứ pháp lý" subtitle="Văn bản áp dụng cho ứng dụng" />}>
      <Muted>
        Danh sách được đối chiếu số hiệu, ngày ban hành với nguồn ngày 12/10/2026. Đây không phải tư vấn pháp lý; cần đọc văn bản gốc trước khi triển khai thật.
      </Muted>
      {LEGAL_GROUPS.map((g) => (
        <View key={g.group} style={{ gap: 10 }}>
          <SectionTitle icon="document-text-outline">{g.group}</SectionTitle>
          {g.items.map((it) => (
            <Card key={it.id}>
              <Text style={{ fontWeight: '800', color: C.text, fontSize: 15 }}>{it.id}</Text>
              <Text style={{ color: C.text }}>{it.title}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <Chip label={`${it.issuer} · ${it.issued}`} tone="blue" />
                {it.effective && <Chip label={`Hiệu lực ${it.effective}`} tone="teal" />}
                <Chip label={it.verified ? 'Đã đối chiếu nguồn' : 'Chưa xác minh'} tone={it.verified ? 'green' : 'amber'} />
              </View>
              <Muted><Text style={{ fontWeight: '700' }}>Áp dụng: </Text>{it.appliesTo}</Muted>
              <Muted><Text style={{ fontWeight: '700' }}>Trong ứng dụng: </Text>{it.inApp}</Muted>
              {it.note ? <Muted style={{ color: C.amber }}>{it.note}</Muted> : null}
              <TextLink label="Mở nguồn" onPress={() => WebBrowser.openBrowserAsync(it.source)} />
            </Card>
          ))}
        </View>
      ))}
      <Card>
        <SectionTitle icon="hardware-chip-outline">Tiêu chuẩn phần cứng (từ slide đề tài)</SectionTitle>
        {HARDWARE_STANDARDS.map((s) => <Text key={s} style={{ color: C.text }}>• {s}</Text>)}
        <Muted>Đây là tiêu chuẩn quốc tế IEC, không phải văn bản của Bộ Y tế.</Muted>
      </Card>
    </Screen>
  );
}
