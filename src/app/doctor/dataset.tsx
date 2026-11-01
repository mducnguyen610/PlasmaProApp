import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { ImageTile } from '@/components/items';
import { Button, Card, Chip, Choices, Empty, Header, Muted, Screen, SectionTitle, Segmented } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { buildCsv, exportableImages, exportDataset } from '@/lib/export';
import { useStore } from '@/lib/store';
import type { LabelStatus } from '@/lib/types';
import { C } from '@/theme';

// BS08 – Dữ liệu huấn luyện: lọc ảnh đã/chưa có diện tích, kiểm tra nhãn, tải bộ ảnh đã đổi tên.
export default function Dataset() {
  const { data, me } = useStore();
  const [filter, setFilter] = useState<LabelStatus>('unlabeled');
  const [busy, setBusy] = useState(false);
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
  const eligible = (me ? exportableImages(data, me.id) : []).filter(i => (pf === 'all' || i.patientId === pf) && (wf === 'all' || i.woundId === wf) && (!since || i.captureDate >= since));
  const noConsent = images.filter((i) => i.status === 'labeled' && !data.patients.find((p) => p.id === i.patientId)?.researchConsent).length;
  const csv = buildCsv(data, eligible).split('\n').slice(0, 4).join('\n');

  const run = async () => {
    setBusy(true);
    try {
      const r = await exportDataset(data, eligible, me!.id);
      notify('Đã tạo bộ dữ liệu', `${r.count} ảnh + labels.csv\n${r.zipName}\nLưu tại: ${r.location}`);
    } catch (e) {
      notify('Xuất dữ liệu thất bại', String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen header={<Header title="Dữ liệu huấn luyện" subtitle="Ảnh có nhãn diện tích do bác sĩ nhập" />}>
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

      <Card>
        <SectionTitle icon="cloud-download-outline">Xuất bộ dữ liệu (ZIP)</SectionTitle>
        {me?.researchAccess ? (
          <Chip label="Tài khoản được cấp quyền nghiên cứu" tone="green" icon="shield-checkmark-outline" />
        ) : (
          <Chip label="Chưa được cấp quyền xuất dữ liệu nghiên cứu" tone="red" icon="lock-closed-outline" />
        )}
        <Muted>
          Gồm {eligible.length} ảnh theo bộ lọc, đã có diện tích, được bác sĩ xác nhận chia sẻ và bệnh nhân đồng ý nghiên cứu.
          ZIP dùng bản sao PNG bỏ metadata và mã nghiên cứu; kèm labels.csv. Mở chi tiết ảnh để xác nhận chia sẻ cho kỹ thuật.
        </Muted>
        {noConsent > 0 && <Text style={{ color: C.amber, fontSize: 13 }}>{noConsent} ảnh có nhãn không được xuất vì bệnh nhân chưa đồng ý.</Text>}
        <Text style={{ color: C.textSoft, fontSize: 12 }}>Xem trước labels.csv</Text>
        <Text selectable style={{ fontFamily: 'Menlo', fontSize: 12, color: C.text, backgroundColor: C.surfaceMuted, padding: 10, borderRadius: 10 }}>{csv}</Text>
        <Button label={`Tải ZIP (${eligible.length} ảnh)`} icon="download-outline" loading={busy} disabled={!me?.researchAccess || eligible.length === 0} onPress={run} />
      </Card>
    </Screen>
  );
}
