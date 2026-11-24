import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/Text';

import { ImageTile } from '@/components/items';
import { Button, Card, Choices, Disclosure, Empty, Field, Header, Screen, SectionTitle, Segmented } from '@/components/ui';
import { C, T } from '@/theme';
import { useStore } from '@/lib/store';
import type { WoundImage } from '@/lib/types';
import { LABEL_STATE, labelState, needsLabel } from '@/lib/imageLabel';
import { isoToVn, parseBirthDate } from '@/lib/patientIdentity';
import { localDay } from '@/lib/course';

// BS08 – Ảnh vết thương. Giai đoạn B (CN2 T1): trang Hình ảnh chung của mọi bệnh nhân bác sĩ phụ trách, lọc theo trạng thái nhãn
// (mặc định "Chưa gán đủ nhãn"), bệnh nhân, vết, thời gian (7, 30, 90 ngày, tất cả, tùy chọn) và diện tích (chưa đo, đã đo, chụp lại).
// Xuất ZIP và xem trước labels.csv ở màn Dữ liệu của quản trị.
type LabelFilter = 'needs' | 'complete' | 'confirmed' | 'rejected' | 'all';
type AreaFilter = 'all' | 'unlabeled' | 'labeled' | 'retake';
export default function Dataset() {
  const { data, me } = useStore();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<LabelFilter>('needs');
  const [area, setArea] = useState<AreaFilter>('all');
  const [pf, setPf] = useState('all');
  const [wf, setWf] = useState('all');
  const [range, setRange] = useState<'7' | '30' | '90' | 'all' | 'custom'>('all');
  const [since, setSince] = useState('');
  const [sinceText, setSinceText] = useState('');
  // UX-17, P1-01a: mở từ ô "Ảnh chưa đo" hoặc "Ảnh cần chụp lại" ở B01 thì lọc theo diện tích tương ứng, bỏ các bộ lọc khác.
  const { loc, t } = useLocalSearchParams<{ loc?: string; t?: string }>();
  const [seen, setSeen] = useState<string | undefined>(undefined);
  const target: AreaFilter | null = loc === 'chua-do' ? 'unlabeled' : loc === 'chup-lai' ? 'retake' : null;
  if (target && `${loc}:${t}` !== seen) { setSeen(`${loc}:${t}`); setArea(target); setFilter('all'); setPf('all'); setWf('all'); setRange('all'); setSince(''); }
  const mine = new Set(data.patients.filter((p) => p.doctorId === me?.id && !p.archivedAt).map((p) => p.id));
  const images = data.images.filter((i) => mine.has(i.patientId));
  const inLabel = (f: LabelFilter, i: WoundImage) => f === 'all' || (f === 'needs' ? needsLabel(i) : labelState(i) === f);
  const count = (f: LabelFilter) => images.filter((i) => inLabel(f, i)).length;
  const inArea = (i: WoundImage) => area === 'all' || (area === 'retake' ? !!i.retakeRequested : i.status === area);
  const shown = images
    .filter((i) => inLabel(filter, i))
    .filter(inArea)
    .filter((i) => pf === 'all' || i.patientId === pf)
    .filter((i) => wf === 'all' || i.woundId === wf)
    .filter((i) => !since || i.captureDate >= since)
    .sort((a, b) => b.captureDate.localeCompare(a.captureDate));
  const myPatients = data.patients.filter((p) => mine.has(p.id));
  const woundOpts = data.wounds.filter((w) => w.patientId === pf);
  const customError = range === 'custom' && sinceText.trim() ? parseBirthDate(sinceText, '9999-12-31').error?.replace('Ngày sinh', 'Ngày').replace('Năm sinh', 'Năm') : undefined;
  const filterSummary = [
    pf === 'all' ? 'Mọi bệnh nhân' : myPatients.find((p) => p.id === pf)?.code,
    pf !== 'all' && wf !== 'all' ? woundOpts.find((w) => w.id === wf)?.code : null,
    range === 'all' ? 'Mọi ngày' : range === 'custom' ? (since ? `Từ ${isoToVn(since)}` : 'Tùy chọn ngày') : `${range} ngày`,
    area === 'all' ? null : area === 'unlabeled' ? 'Chưa đo' : area === 'labeled' ? 'Đã đo' : 'Chụp lại',
  ].filter(Boolean).join(' · ');
  const content = Math.min(width, 720) - 32;
  const cols = content >= 600 ? 4 : content >= 420 ? 3 : 2;
  const tileW = Math.floor((content - 12 * (cols - 1)) / cols);
  const byPatient = myPatients.map((p) => ({ p, list: shown.filter((i) => i.patientId === p.id) })).filter((g) => g.list.length);
  return (
    // Logic chốt 25/11 (mục 2, mục 6): chức năng "Chụp ảnh và gán nhãn": nút Chụp ảnh (chọn bệnh nhân và vết trước, A1)
    // thay cho nút giữa thanh tab cũ, rồi trang Hình ảnh chung (T1).
    <Screen header={<Header home="/doctor" title="Chụp ảnh và gán nhãn" subtitle="Hình ảnh của bệnh nhân bạn phụ trách" />}>
      <Button label="Chụp ảnh" icon="camera" onPress={() => router.push('/capture')} />
      <Choices<LabelFilter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'needs', label: `Chưa gán đủ nhãn (${count('needs')})` },
          { value: 'complete', label: `${LABEL_STATE.complete.label} (${count('complete')})` },
          { value: 'confirmed', label: `${LABEL_STATE.confirmed.label} (${count('confirmed')})` },
          { value: 'rejected', label: `${LABEL_STATE.rejected.label} (${count('rejected')})` },
          { value: 'all', label: `Tất cả (${images.length})` },
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
                setSince(v === 'all' ? '' : v === 'custom' ? (parseBirthDate(sinceText, localDay(Date.now())).value ?? '') : localDay(Date.now() - Number(v) * 86400000));
              }}
              options={[{ value: 'all', label: 'Mọi ngày' }, { value: '7', label: '7 ngày' }, { value: '30', label: '30 ngày' }, { value: '90', label: '90 ngày' }, { value: 'custom', label: 'Tùy chọn' }]} />
            {range === 'custom' && (
              <Field label="Chụp từ ngày" value={sinceText} placeholder="dd/mm/yyyy" error={customError}
                onChangeText={(v) => { setSinceText(v); const r = parseBirthDate(v, localDay(Date.now())); setSince(r.value ?? ''); }} />
            )}
            <Segmented<AreaFilter> value={area} onChange={setArea} options={[
              { value: 'all', label: 'Mọi ảnh' }, { value: 'unlabeled', label: 'Chưa đo' }, { value: 'labeled', label: 'Đã đo' },
              ...(images.some((i) => i.retakeRequested) || area === 'retake' ? [{ value: 'retake' as const, label: 'Chụp lại' }] : []),
            ]} />
          </View>
        </Disclosure>
      </Card>
      {shown.length === 0 ? (
        <Card><Empty icon="images-outline" text={filter === 'needs' ? 'Không còn ảnh cần gán nhãn theo bộ lọc này.' : 'Không có ảnh trong nhóm này.'} /></Card>
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
