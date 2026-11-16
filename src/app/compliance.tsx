import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { Card, Header, ListCard, Notice, Screen, SectionTitle, TextLink } from '@/components/ui';
import { HARDWARE_STANDARDS, LEGAL_GROUPS, type LegalRef } from '@/lib/compliance';
import { C, T } from '@/theme';

/**
 * C05 Căn cứ pháp lý. Stage 9A (bố cục riêng): mỗi nhóm văn bản là một danh sách; mỗi dòng cho thấy ngay số hiệu, tên,
 * cơ quan, ngày và trạng thái đối chiếu, chạm để mở phần áp dụng và lối mở nguồn. Ghi chú sửa đổi (màu hổ phách) vẫn hiện
 * ngay dưới dòng vì ảnh hưởng tới việc trích dẫn. Trang ngắn từ khoảng 5,7 còn dưới 2 màn ở 390 px khi chưa mở mục nào.
 */
function LegalItem({ it }: { it: LegalRef }) {
  const [open, setOpen] = useState(false);
  const meta = `${it.issuer} · ban hành ${it.issued}${it.effective ? ` · hiệu lực ${it.effective}` : ''}`;
  return (
    <View style={{ paddingVertical: 10, gap: 6 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${it.id}, ${it.title}, ${it.verified ? 'đã đối chiếu nguồn' : 'chưa xác minh'}`}
        style={{ flexDirection: 'row', gap: 10, minHeight: 44 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontWeight: '700', color: C.text }}>{it.id}</Text>
          <Text style={{ color: C.textBody, fontSize: T.small, lineHeight: 20 }}>{it.title}</Text>
          <Text style={{ color: C.textSoft, fontSize: T.caption, lineHeight: 18 }}>{meta}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={it.verified ? 'checkmark-circle' : 'alert-circle'} size={15} color={it.verified ? C.green : C.amber} />
            <Text style={{ fontSize: T.caption, color: it.verified ? C.green : C.amber, fontWeight: '600' }}>{it.verified ? 'Đã đối chiếu nguồn' : 'Chưa xác minh'}</Text>
          </View>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={C.textSoft} style={{ marginTop: 2 }} />
      </Pressable>
      {it.note ? <Text style={{ color: C.amber, fontSize: T.small, lineHeight: 20 }}>{it.note}</Text> : null}
      {open && (
        <View style={{ gap: 8, paddingTop: 2 }}>
          <Text style={{ color: C.textBody, fontSize: T.small, lineHeight: 21 }}><Text style={{ fontWeight: '700', color: C.text }}>Áp dụng: </Text>{it.appliesTo}</Text>
          <Text style={{ color: C.textBody, fontSize: T.small, lineHeight: 21 }}><Text style={{ fontWeight: '700', color: C.text }}>Trong ứng dụng: </Text>{it.inApp}</Text>
          <TextLink label="Mở nguồn" accessibilityLabel={`Mở nguồn ${it.id}`} onPress={() => WebBrowser.openBrowserAsync(it.source)} />
        </View>
      )}
    </View>
  );
}

export default function Compliance() {
  const all = LEGAL_GROUPS.flatMap((g) => g.items);
  const verified = all.filter((i) => i.verified).length;
  return (
    <Screen header={<Header back title="Căn cứ pháp lý" subtitle={`${all.length} văn bản, ${verified} đã đối chiếu nguồn`} />}>
      <Notice tone="gray" icon="information-circle-outline">
        Danh sách được đối chiếu số hiệu, ngày ban hành với nguồn ngày 12/10/2026. Đây không phải tư vấn pháp lý; cần đọc văn bản gốc trước khi triển khai thật.
      </Notice>
      {LEGAL_GROUPS.map((g) => (
        <View key={g.group} style={{ gap: 10 }}>
          <SectionTitle>{g.group}</SectionTitle>
          <ListCard>{g.items.map((it) => <LegalItem key={it.id} it={it} />)}</ListCard>
        </View>
      ))}
      <SectionTitle>Tiêu chuẩn phần cứng (từ slide đề tài)</SectionTitle>
      <Card style={{ gap: 6 }}>
        {HARDWARE_STANDARDS.map((s) => <Text key={s} style={{ color: C.text }}>• {s}</Text>)}
        <Text style={{ color: C.textSoft, fontSize: T.small, marginTop: 4 }}>Đây là tiêu chuẩn quốc tế IEC, không phải văn bản của Bộ Y tế.</Text>
      </Card>
    </Screen>
  );
}
