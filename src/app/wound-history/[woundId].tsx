import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { AreaProgress } from '@/components/AreaProgress';
import { ClinicalContext } from '@/components/ClinicalContext';
import { NoAccess, useCanView } from '@/components/Guard';
import { ImageTile } from '@/components/items';
import { Card, Chip, Header, InfoRow, Muted, Screen, Segmented, SectionTitle, StatusChip, TextLink } from '@/components/ui';
import { assessmentSummary } from '@/lib/assessment';
import { localDay, sessionsForWound } from '@/lib/course';
import { fmtDate, fmtDateTime, TREND } from '@/lib/format';
import { formatAreaDisplay } from '@/lib/naming';
import { useLookups, useStore } from '@/lib/store';
import { C, T } from '@/theme';
import { TREND_ROLE } from '@/theme.status';

type Tab = 'dien-tich' | 'anh' | 'danh-gia' | 'buoi';
const TABS: Tab[] = ['dien-tich', 'anh', 'danh-gia', 'buoi'];

// Giao diện theo tác vụ, giai đoạn 1: "Tiến triển và lịch sử" của một vết thương. Màn chỉ đọc, mở từ B05.
// Gom phần lịch sử trước đây nằm cuối B05 (biểu đồ, album, đánh giá cũ, buổi điều trị) thành 4 thẻ, mỗi lúc một thẻ.
// Không tính toán mới: biểu đồ, lọc đánh giá, lọc buổi điều trị dùng đúng các hàm và điều kiện B05 đang dùng.
export default function WoundHistory() {
  const { woundId, tab } = useLocalSearchParams<{ woundId: string; tab?: string }>();
  const { data, me } = useStore();
  const { wound, patient, imagesOf, account, sessionsOf } = useLookups();
  const w = wound(woundId);
  const p = patient(w?.patientId);
  const canView = useCanView(p);
  const current: Tab = TABS.includes(tab as Tab) ? (tab as Tab) : 'dien-tich';
  if (!w || !p) return <NoAccess notFound />;
  if (!canView) return <NoAccess />;

  const isDoctor = me?.role === 'doctor';
  const images = imagesOf(w.id);
  const dev = data.devices.find((x) => x.id === p.deviceId);
  // Cùng điều kiện với B05: bệnh nhân chỉ thấy đánh giá đã công bố.
  const evals = data.evaluations
    .filter((e) => e.woundId === w.id && (isDoctor || e.visibleToPatient))
    .sort((a, b) => b.date.localeCompare(a.date) || data.evaluations.indexOf(b) - data.evaluations.indexOf(a));
  const byDate = new Map<string, typeof images>();
  for (const im of [...images].reverse()) byDate.set(im.captureDate, [...(byDate.get(im.captureDate) ?? []), im]);
  // PP-08 (chuyển từ B05): mỗi ngày bắt đầu khác nhau của các đợt (không tính bản nháp) là một mốc "Đợt n".
  const firstWound = data.wounds.find((x) => x.patientId === w.patientId)?.id;
  const courseMarkers = [...new Set(data.plans
    .filter((pl) => pl.patientId === w.patientId && (pl.woundId ?? firstWound) === w.id && pl.status !== 'draft')
    .map((pl) => pl.startDate))]
    .sort()
    .map((date, i) => ({ date, label: `Đợt ${i + 1}` }));
  // P1-02c (chuyển từ B05): buổi điều trị của vết này, cùng bộ lọc với tiến độ đợt, mới trước. Chỉ bác sĩ.
  const woundSessions = isDoctor && dev ? [...sessionsForWound(sessionsOf(dev.id), w.id)].sort((a, b) => b.start.localeCompare(a.start)) : [];

  const options: { value: Tab; label: string }[] = [
    { value: 'dien-tich', label: 'Diện tích' },
    { value: 'anh', label: `Ảnh (${images.length})` },
    { value: 'danh-gia', label: `Đánh giá (${evals.length})` },
    ...(isDoctor ? [{ value: 'buoi' as const, label: 'Buổi điều trị' }] : []),
  ];
  // Đổi thẻ bằng setParams để Back hệ thống quay về B05, không đi lùi qua từng thẻ.
  const pick = (v: Tab) => router.setParams({ tab: v });

  return (
    <Screen header={<Header back title="Tiến triển và lịch sử" subtitle={`Vết thương ${w.code}`} />}>
      <ClinicalContext patient={p} wound={w} />
      <Segmented value={current === 'buoi' && !isDoctor ? 'dien-tich' : current} options={options} onChange={pick} />

      {current === 'dien-tich' && (
        <Card>
          <SectionTitle icon="stats-chart-outline" right={images.length >= 2 ? <TextLink label="So sánh" onPress={() => router.push({ pathname: '/compare/[woundId]', params: { woundId: w.id } })} /> : null}>
            Tiến triển diện tích
          </SectionTitle>
          {/* Cùng biểu đồ đường và tham số với thẻ bác sĩ ở B05 trước đây (P2-02d, QĐ-P2-5): vạch ngày bắt đầu từng đợt chỉ ở phía bác sĩ. */}
          <AreaProgress code={w.code} woundId={w.id} images={images} evaluations={data.evaluations} today={localDay()} isDoctor={isDoctor} markers={isDoctor ? courseMarkers : []} accountName={(id) => account(id)?.name} />
        </Card>
      )}

      {current === 'anh' && (
        <View style={{ gap: 16 }}>
          {images.length === 0 && <Muted>{isDoctor ? 'Chưa có ảnh. Chụp hoặc tải ảnh lên để bắt đầu.' : 'Chưa có ảnh do bác sĩ chụp.'}</Muted>}
          {[...byDate.entries()].map(([date, ims]) => (
            <View key={date} style={{ gap: 8 }}>
              <Text style={{ color: C.textSoft, fontWeight: '700', fontSize: T.small }}>Chụp {fmtDate(date)}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {ims.map((im) => <ImageTile key={im.id} image={im} width={160} />)}
              </View>
            </View>
          ))}
        </View>
      )}

      {current === 'danh-gia' && (
        <Card>
          <SectionTitle icon="clipboard-outline">{isDoctor ? 'Các lần đánh giá' : 'Nhận xét của bác sĩ'}</SectionTitle>
          {evals.length === 0 && <Muted>Chưa có đánh giá.</Muted>}
          {evals.map((e, i) => (
            <View key={e.id} testID="danh-gia-lich-su" style={{ gap: 8, paddingTop: i > 0 ? 10 : 0, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontWeight: '700', color: C.text, flex: 1 }}>{fmtDate(e.date)} · {account(e.doctorId)?.name}</Text>
                <StatusChip status={TREND_ROLE[e.trend]} label={TREND[e.trend].label} />
              </View>
              {/* Cùng các trường với chế độ "Xem đầy đủ" ở B05. */}
              <InfoRow label="Diện tích" value={formatAreaDisplay(e.areaCm2)} />
              {isDoctor && e.assessment ? <Text style={{ color: C.text }}>{assessmentSummary(e.assessment)}</Text> : null}
              {e.characteristics ? <Muted>Đặc điểm: {e.characteristics}</Muted> : null}
              {e.symptoms ? <Muted>Triệu chứng: {e.symptoms} (nguồn: {e.symptomSource || '—'})</Muted> : null}
              {e.instructions ? <Text style={{ color: C.text }}>Hướng dẫn: {e.instructions}</Text> : null}
              {e.nextReview ? <Muted>Tái đánh giá: {fmtDate(e.nextReview)}</Muted> : null}
              {isDoctor && <Chip label={e.visibleToPatient ? 'Bệnh nhân xem được' : 'Chỉ nội bộ'} tone={e.visibleToPatient ? 'blue' : 'gray'} />}
            </View>
          ))}
        </Card>
      )}

      {current === 'buoi' && isDoctor && (
        <Card>
          <SectionTitle icon="time-outline">{`Buổi điều trị của ${w.code} (${woundSessions.length})`}</SectionTitle>
          {!dev && <Muted>Bệnh nhân chưa được giao thiết bị.</Muted>}
          {dev && woundSessions.length === 0 && <Muted>Chưa có buổi nào được ghi.</Muted>}
          {woundSessions.slice(0, 30).map((s) => (
            <View key={s.sessionId + s.start} testID="buoi-dieu-tri" style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border, gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '600', color: C.text }}>{fmtDateTime(s.start)}</Text>
                <Text style={{ color: C.textSoft }}>{s.durationMin} phút</Text>
              </View>
              <Text style={{ fontSize: T.caption, color: C.textSoft }}>{`${SESSION_STATUS[s.status]} · ${SESSION_SOURCE[s.source]}`}</Text>
            </View>
          ))}
          {woundSessions.length > 30 && <Muted>{`Hiện 30 buổi gần nhất trên ${woundSessions.length}. Xem đủ ở màn thiết bị.`}</Muted>}
          {dev && <TextLink label={`Mở thiết bị ${dev.code}`} onPress={() => router.push({ pathname: '/devices/[id]', params: { id: dev.id } })} />}
        </Card>
      )}
    </Screen>
  );
}

// Cùng nhãn với màn thiết bị (DeviceView); chuyển từ B05.
const SESSION_STATUS = { completed: 'Hoàn tất', interrupted: 'Bị ngắt', over_limit: 'Ngắt do vượt ngưỡng' } as const;
const SESSION_SOURCE = { device: 'Thiết bị gửi', manual: 'Nhập tay', simulated: 'Mô phỏng' } as const;
