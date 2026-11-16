import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/Text';

import { ImageTile } from '@/components/items';
import { Card, Choices, Disclosure, Empty, Header, Screen, SectionTitle, Segmented } from '@/components/ui';
import { C, T } from '@/theme';
import { useStore } from '@/lib/store';
import type { LabelStatus } from '@/lib/types';
import { localDay } from '@/lib/course';

// BS08 – Ảnh vết thương: lọc ảnh đã/chưa có diện tích để bác sĩ ghi nhãn.
// Xuất ZIP và xem trước labels.csv chuyển sang màn hình Dữ liệu của quản trị kỹ thuật.
export default function Dataset() {
  const { data, me } = useStore();
  const { width } = useWindowDimensions();
  // P1-01a: thêm nhóm "Chụp lại" (ảnh bác sĩ đã yêu cầu chụp lại, ở bất kỳ trạng thái nhãn nào). Ba nhóm cũ và số đếm giữ nguyên.
  const [filter, setFilter] = useState<LabelStatus | 'retake'>('unlabeled');
  const [pf, setPf] = useState('all');
  const [wf, setWf] = useState('all');
  const [range, setRange] = useState<'7' | '30' | 'all'>('all');
  const [since, setSince] = useState('');
  // UX-17: mở từ ô "Ảnh chưa đo" ở B01 thì về nhóm "Chưa đo", bỏ các bộ lọc đang chọn để thấy đủ ảnh chưa đo.
  const { loc, t } = useLocalSearchParams<{ loc?: string; t?: string }>();
  const [seen, setSeen] = useState<string | undefined>(undefined);
  // P1-01a: mở từ ô "Ảnh cần chụp lại" (khi có từ 2 ảnh) thì về nhóm "Chụp lại", cùng cách bỏ bộ lọc như UX-17.
  const target = loc === 'chua-do' ? 'unlabeled' : loc === 'chup-lai' ? 'retake' : null;
  if (target && `${loc}:${t}` !== seen) { setSeen(`${loc}:${t}`); setFilter(target); setPf('all'); setWf('all'); setRange('all'); setSince(''); }
  const mine = new Set(data.patients.filter((p) => p.doctorId === me?.id && !p.archivedAt).map((p) => p.id));
  const images = data.images.filter((i) => mine.has(i.patientId));
  const count = (s: LabelStatus) => images.filter((i) => i.status === s).length;
  const retakeCount = images.filter((i) => i.retakeRequested).length;
  // Tìm ảnh theo bệnh nhân / vết thương / ngày chụp (đặc tả mục 8).
  const shown = images
    .filter((i) => (filter === 'retake' ? !!i.retakeRequested : i.status === filter))
    .filter((i) => pf === 'all' || i.patientId === pf)
    .filter((i) => wf === 'all' || i.woundId === wf)
    .filter((i) => !since || i.captureDate >= since)
    .sort((a, b) => b.captureDate.localeCompare(a.captureDate));
  const myPatients = data.patients.filter((p) => mine.has(p.id));
  const woundOpts = data.wounds.filter((w) => w.patientId === pf);
  // Stage 9A (bố cục riêng B12): hàng đợi ghi diện tích. Bộ lọc gom vào một mục thu gọn có tóm tắt lựa chọn đang áp dụng
  // (thay cho ba hàng nút luôn mở); kết quả chia theo bệnh nhân để thấy ngay ảnh của ai, vết nào; ô ảnh giãn đủ hai cột ở điện thoại.
  // Câu về xuất bộ dữ liệu nghiên cứu chuyển vào trang Hướng dẫn. Nhóm, số đếm và điều kiện lọc giữ nguyên.
  const filterSummary = [
    pf === 'all' ? 'Mọi bệnh nhân' : myPatients.find((p) => p.id === pf)?.code,
    pf !== 'all' && wf !== 'all' ? woundOpts.find((w) => w.id === wf)?.code : null,
    range === 'all' ? 'Mọi ngày' : `${range} ngày`,
  ].filter(Boolean).join(' · ');
  const content = Math.min(width, 720) - 32;
  const cols = content >= 600 ? 4 : content >= 420 ? 3 : 2;
  const tileW = Math.floor((content - 12 * (cols - 1)) / cols);
  const byPatient = myPatients.map((p) => ({ p, list: shown.filter((i) => i.patientId === p.id) })).filter((g) => g.list.length);
  return (
    <Screen header={<Header title="Ảnh vết thương" subtitle="Ghi diện tích cho ảnh đã chụp" />}>
      <Segmented<LabelStatus | 'retake'>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'unlabeled', label: `Chưa đo (${count('unlabeled')})` },
          { value: 'labeled', label: `Đã đo (${count('labeled')})` },
          { value: 'excluded', label: `Đã loại (${count('excluded')})` },
          // Chỉ hiện khi có ảnh cần chụp lại hoặc đang chọn, để thanh ba nhóm cũ không chật thêm ở 320 px.
          ...(retakeCount > 0 || filter === 'retake' ? [{ value: 'retake' as const, label: `Chụp lại (${retakeCount})` }] : []),
        ]}
      />
      <Card style={{ paddingVertical: 4 }}>
        <Disclosure title="Bộ lọc" icon="funnel-outline" summary={filterSummary}>
          <View style={{ gap: 10, paddingBottom: 10 }}>
            <Choices
              value={pf}
              onChange={(v) => {
                setPf(v);
                setWf('all');
              }}
              options={[{ value: 'all', label: 'Mọi bệnh nhân' }, ...myPatients.map((p) => ({ value: p.id, label: p.code }))]}
            />
            {pf !== 'all' && woundOpts.length > 1 && (
              <Choices value={wf} onChange={setWf} options={[{ value: 'all', label: 'Mọi vết thương' }, ...woundOpts.map((w) => ({ value: w.id, label: w.code }))]} />
            )}
            <Choices
              value={range}
              onChange={(v) => {
                setRange(v);
                setSince(v === 'all' ? '' : localDay(Date.now() - Number(v) * 86400000));
              }}
              options={[{ value: 'all', label: 'Mọi ngày' }, { value: '7', label: '7 ngày' }, { value: '30', label: '30 ngày' }]} />
          </View>
        </Disclosure>
      </Card>
      {shown.length === 0 ? (
        <Card><Empty icon="images-outline" text="Không có ảnh trong nhóm này." /></Card>
      ) : byPatient.map(({ p, list }) => (
        <View key={p.id} style={{ gap: 10 }}>
          <SectionTitle right={<Text style={{ color: C.textSoft, fontSize: T.small }}>{`${list.length} ảnh`}</Text>}>{`${p.code} · ${p.name}`}</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {list.map((im) => (
              <ImageTile key={im.id} image={im} width={tileW} showOwner />
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}
