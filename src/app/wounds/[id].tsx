import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { SeverityCard } from '@/components/SeverityCard';
import { AreaChart } from '@/components/AreaChart';
import { NoAccess, useCanView } from '@/components/Guard';
import { ImageTile } from '@/components/items';
import { Button, Card, Chip, Empty, Header, InfoRow, Muted, Screen, SectionTitle, Segmented } from '@/components/ui';
import { fmtDate, TREND, WOUND_STATUS } from '@/lib/format';
import { assessmentSummary } from '@/lib/assessment';
import { formatAreaDisplay } from '@/lib/naming';
import { useLookups, useStore } from '@/lib/store';
import type { WoundStatus } from '@/lib/types';
import { C } from '@/theme';

// BS04 – Chi tiết vết thương: vị trí, ngày bắt đầu, album ảnh theo ngày, diện tích đã nhập, lịch sử đánh giá.
export default function WoundDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, me, updateWound } = useStore();
  const { wound, patient, imagesOf, account } = useLookups();
  const w = wound(id);
  const p = patient(w?.patientId);
  const canView = useCanView(p);
  if (!w || !p || !canView) return <NoAccess />;

  const isDoctor = me?.role === 'doctor';
  const images = imagesOf(w.id);
  const byDate = new Map<string, typeof images>();
  for (const im of [...images].reverse()) byDate.set(im.captureDate, [...(byDate.get(im.captureDate) ?? []), im]);
  const evals = data.evaluations
    .filter((e) => e.woundId === w.id && (isDoctor || e.visibleToPatient))
    .sort((a, b) => b.date.localeCompare(a.date) || data.evaluations.indexOf(b) - data.evaluations.indexOf(a));


  return (
    <Screen header={<Header back title={`${w.code} · ${w.location}`} subtitle={`${p.name} · ${p.code}`} />}>
      <Card>
        <InfoRow label="Vị trí" value={w.location} />
        {w.group ? <InfoRow label="Nhóm tổn thương" value={w.group} /> : null}
        <InfoRow label="Bắt đầu theo dõi" value={fmtDate(w.startDate)} />
        <InfoRow label="Số ảnh" value={String(images.length)} />
        {isDoctor ? (
          <Segmented<WoundStatus>
            value={w.status}
            onChange={(v) => updateWound(w.id, { status: v })}
            options={(['active', 'paused', 'closed'] as const).map((v) => ({ value: v, label: WOUND_STATUS[v].label }))}
          />
        ) : (
          <Chip label={WOUND_STATUS[w.status].label} tone={WOUND_STATUS[w.status].tone} />
        )}
      </Card>

      <SeverityCard title="Mức độ vết thương" evaluation={evals[0]} doctor={account(evals[0]?.doctorId)?.name} />
      {isDoctor && <Button label="Chụp / thêm ảnh có hướng dẫn" icon="camera-outline" onPress={() => router.push({ pathname: '/guided-capture', params: { woundId: w.id } })} />}

      <Card>
        <SectionTitle icon="stats-chart-outline">Diện tích theo thời gian</SectionTitle>
        <AreaChart images={images} />
      </Card>

      <SectionTitle
        icon="albums-outline"
        right={images.length >= 2 ? <Text onPress={() => router.push({ pathname: '/compare/[woundId]', params: { woundId: w.id } })} style={{ color: C.primary, fontWeight: '600' }}>So sánh trước/sau</Text> : null}>
        Album ảnh
      </SectionTitle>
      {images.length === 0 && <Card><Empty icon="image-outline" text={isDoctor ? "Chưa có ảnh. Chụp hoặc tải ảnh lên để bắt đầu." : "Chưa có ảnh do bác sĩ chụp."} /></Card>}
      {[...byDate.entries()].map(([date, ims]) => (
        <View key={date} style={{ gap: 8 }}>
          <Text style={{ color: C.textSoft, fontWeight: '700', fontSize: 13 }}>Ngày chụp / thêm ảnh {fmtDate(date)}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {ims.map((im) => (
              <ImageTile key={im.id} image={im} width={160} />
            ))}
          </View>
        </View>
      ))}

      <SectionTitle
        icon="clipboard-outline"
        right={isDoctor ? <Text onPress={() => router.push({ pathname: '/evaluate/[woundId]', params: { woundId: w.id } })} style={{ color: C.primary, fontWeight: '600' }}>+ Ghi đánh giá</Text> : null}>
        {isDoctor ? 'Lịch sử đánh giá' : 'Nhận xét của bác sĩ'}
      </SectionTitle>
      {evals.length === 0 && <Card><Empty text="Chưa có đánh giá." /></Card>}
      {evals.map((e) => (
        <Card key={e.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontWeight: '700', color: C.text, flex: 1 }}>{fmtDate(e.date)} · {account(e.doctorId)?.name}</Text>
            <Chip label={TREND[e.trend].label} tone={TREND[e.trend].tone} />
          </View>
          <InfoRow label="Diện tích" value={formatAreaDisplay(e.areaCm2)} />
          {isDoctor && e.assessment ? <Text style={{ color: C.text }}>{assessmentSummary(e.assessment)}</Text> : null}
          {e.characteristics ? <Muted>Đặc điểm: {e.characteristics}</Muted> : null}
          {e.symptoms ? <Muted>Triệu chứng: {e.symptoms} (nguồn: {e.symptomSource || '—'})</Muted> : null}
          {e.instructions ? <Text style={{ color: C.text }}>Hướng dẫn: {e.instructions}</Text> : null}
          {e.nextReview ? <Muted>Tái đánh giá: {fmtDate(e.nextReview)}</Muted> : null}
          {isDoctor && <Chip label={e.visibleToPatient ? 'Bệnh nhân xem được' : 'Chỉ nội bộ'} tone={e.visibleToPatient ? 'blue' : 'gray'} />}
        </Card>
      ))}
    </Screen>
  );
}
