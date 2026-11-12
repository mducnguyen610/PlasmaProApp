import { useState } from 'react';
import { View } from 'react-native';
import { NoAccess } from '@/components/Guard';
import { MONO, Text } from '@/components/Text';
import { Button, Card, Chip, Choices, Empty, Header, Muted, Screen, SectionTitle, WoundPhoto } from '@/components/ui';
import { researchImages } from '@/lib/access';
import { notify } from '@/lib/dialog';
import { buildCsv, exportDataset } from '@/lib/export';
import { formatAreaDisplay } from '@/lib/naming';
import { researchFilename, researchPhoto } from '@/lib/research';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

export default function TechnicalDataset() {
  const { me, data } = useStore();
  const [subject, setSubject] = useState('all');
  const [busy, setBusy] = useState(false);
  if (!me || me.role !== 'admin') return <NoAccess />;
  const eligible = researchImages(data, me);
  const subjects = [...new Set(eligible.map(im => data.patients.find(p => p.id === im.patientId)!.researchCode!))];
  const shown = eligible.filter(im => subject === 'all' || data.patients.find(p => p.id === im.patientId)?.researchCode === subject);
  return <Screen header={<Header title="Kho dữ liệu kỹ thuật" subtitle="Ảnh và diện tích do bác sĩ cung cấp" />}>
    <Card hero>
      <Chip label={me.researchAccess ? 'Đã cấp quyền nghiên cứu' : 'Chưa có quyền nghiên cứu'} tone={me.researchAccess ? 'green' : 'amber'} />
      <Text style={{ fontSize: 28, fontWeight: '700' }}>{eligible.length} ảnh sẵn sàng</Text>
      <Muted>Chỉ gồm ảnh được bác sĩ kiểm tra và bệnh nhân đồng ý nghiên cứu. Dùng mã nghiên cứu; không hiển thị họ tên, số điện thoại, năm sinh hay hồ sơ lâm sàng.</Muted>
      <Muted>Bản ảnh nghiên cứu đã bỏ metadata. Nội dung ảnh được bác sĩ kiểm tra trước khi chia sẻ.</Muted>
    </Card>
    <Choices value={subject} onChange={setSubject} options={[{ value: 'all', label: 'Tất cả' }, ...subjects.map(value => ({ value, label: value }))]} />
    <SectionTitle>Bộ ảnh đã gán diện tích</SectionTitle>
    {shown.length === 0 && <Empty text={me.researchAccess ? 'Chưa có ảnh đủ điều kiện. Bác sĩ cần nhập diện tích và xác nhận chia sẻ.' : 'Quản trị cần cấp quyền nghiên cứu cho tài khoản này.'} />}
    {/* Lưới 2 cột ảnh vuông như danh sách ảnh của bác sĩ (V25); tên tệp đầy đủ vẫn chọn sao chép được. */}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {shown.map(im => <Card key={im.id} style={{ flexBasis: '45%', flexGrow: 1, maxWidth: 360, padding: 10, gap: 6 }}>
        <WoundPhoto image={researchPhoto(im)} style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }} />
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{data.patients.find(p => p.id === im.patientId)!.researchCode!}</Text>
        <Text style={{ fontSize: 14, color: C.textSoft }}>{formatAreaDisplay(im.areaCm2)}</Text>
        <Text selectable numberOfLines={1} ellipsizeMode="middle" style={{ fontSize: 13, color: C.textFaint }}>{researchFilename(data, im)}</Text>
      </Card>)}
    </View>
    <Card>
      <Text style={{ fontWeight: '700' }}>Tải dữ liệu theo bộ lọc</Text>
      <Muted>ZIP gồm {shown.length} ảnh PNG và labels.csv. Ảnh cùng một người được giữ trong cùng tập train/validation/test.</Muted>
      <Text style={{ color: C.textSoft, fontSize: 13 }}>Xem trước labels.csv (4 dòng đầu)</Text>
      <Text selectable style={{ fontFamily: MONO, fontSize: 13, color: C.text, backgroundColor: C.surfaceMuted, padding: 10, borderRadius: 10 }}>{buildCsv(data, shown).split('\n').slice(0, 4).join('\n')}</Text>
      <Button label={'Tải bộ dữ liệu (' + shown.length + ' ảnh)'} icon="download-outline" disabled={!shown.length || !me.researchAccess} loading={busy} onPress={async () => {
        setBusy(true);
        try { const result = await exportDataset(data, shown, me.id); notify('Đã xuất dữ liệu', result.count + ' ảnh · ' + result.location); }
        catch(e) { notify('Chưa xuất được dữ liệu', String(e)); }
        finally { setBusy(false); }
      }} />
    </Card>
  </Screen>;
}

