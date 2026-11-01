import { useState } from 'react';
import { View } from 'react-native';

import { ImageTile } from '@/components/items';
import { Card, Choices, Empty, Header, Muted, Screen, Segmented } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { LabelStatus } from '@/lib/types';

// BS08 – Ảnh vết thương: lọc ảnh đã/chưa có diện tích để bác sĩ ghi nhãn.
// Xuất ZIP và xem trước labels.csv chuyển sang màn hình Dữ liệu của quản trị kỹ thuật.
export default function Dataset() {
  const { data, me } = useStore();
  const [filter, setFilter] = useState<LabelStatus>('unlabeled');
  const [pf, setPf] = useState('all');
  const [wf, setWf] = useState('all');
  const [range, setRange] = useState<'7' | '30' | 'all'>('all');
  const [since, setSince] = useState('');
  const mine = new Set(data.patients.filter((p) => p.doctorId === me?.id).map((p) => p.id));
  const images = data.images.filter((i) => mine.has(i.patientId));
  const count = (s: LabelStatus) => images.filter((i) => i.status === s).length;
  // Tìm ảnh theo bệnh nhân / vết thương / ngày chụp (đặc tả mục 8).
  const shown = images
    .filter((i) => i.status === filter)
    .filter((i) => pf === 'all' || i.patientId === pf)
    .filter((i) => wf === 'all' || i.woundId === wf)
    .filter((i) => !since || i.captureDate >= since)
    .sort((a, b) => b.captureDate.localeCompare(a.captureDate));
  const myPatients = data.patients.filter((p) => mine.has(p.id));
  const woundOpts = data.wounds.filter((w) => w.patientId === pf);
  return (
    <Screen header={<Header title="Ảnh vết thương" subtitle="Ghi diện tích cho ảnh đã chụp" />}>
      <Segmented<LabelStatus>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'unlabeled', label: `Chưa có (${count('unlabeled')})` },
          { value: 'labeled', label: `Đã có (${count('labeled')})` },
          { value: 'excluded', label: `Đã loại (${count('excluded')})` },
        ]}
      />
      <Card>
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
            setSince(v === 'all' ? '' : new Date(Date.now() - Number(v) * 86400000).toISOString().slice(0, 10));
          }}
          options={[{ value: 'all', label: 'Mọi ngày' }, { value: '7', label: '7 ngày' }, { value: '30', label: '30 ngày' }]} />
      </Card>
      {shown.length === 0 ? (
        <Card><Empty icon="images-outline" text="Không có ảnh trong nhóm này." /></Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {shown.map((im) => (
            <ImageTile key={im.id} image={im} width={160} />
          ))}
        </View>
      )}

      <Muted>Ảnh đã có diện tích và được xác nhận chia sẻ sẽ do quản trị kỹ thuật xuất thành bộ dữ liệu nghiên cứu.</Muted>
    </Screen>
  );
}
