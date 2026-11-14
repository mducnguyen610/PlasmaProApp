import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/Text';

import { AreaProgress } from '@/components/AreaProgress';
import { WoundTimeline } from '@/components/WoundTimeline';
import { ClinicalContext } from '@/components/ClinicalContext';
import { NoAccess, useCanView } from '@/components/Guard';
import { HistoryPhotoTile, KIND_META, SaveStateChip, SESSION_SOURCE, SESSION_STATUS, photoDay } from '@/components/history';
import { Button, Card, Choices, Chip, Divider, Empty, Header, LinkRow, Muted, Screen, Segmented, SectionTitle, StatusChip, TextLink } from '@/components/ui';
import { localDay, sessionsForWound } from '@/lib/course';
import { fmtDate, fmtDateTime, PLAN_STATUS, TREND } from '@/lib/format';
import { measurementSource } from '@/lib/measurementSource';
import { formatAreaDisplay } from '@/lib/naming';
import { useLookups, useStore } from '@/lib/store';
import { buildTimeline, groupImagesByDay, measurementHistory, orderPair, parseSelection, plansOfWound, toggleSelection, type MeasurementEntry, type TimelineEntry } from '@/lib/woundHistory';
import { C, T } from '@/theme';
import { SOURCE } from '@/theme.status';

// Giao diện theo tác vụ, giai đoạn 4 (B08 Lịch sử và so sánh ảnh): "Lịch sử vết thương" là một tác vụ toàn màn, chỉ đọc, ba thẻ:
// - Lịch sử: dòng thời gian (đánh giá, ảnh, phiên bản đợt, buổi điều trị), mỗi dòng mở chi tiết ở màn riêng.
// - Ảnh: nhóm theo ngày chụp; chạm ảnh mở chế độ xem riêng; chế độ chọn 2 ảnh để so sánh.
// - Số đo: biểu đồ (giữ nguyên AreaProgress) và danh sách kết quả đo đã lưu, tách số bác sĩ, số trong đánh giá, số tham khảo.
// Không tính toán mới, không ghi dữ liệu. Thẻ, bộ lọc và lựa chọn ảnh nằm trong tham số đường dẫn (setParams) để Back hệ thống
// quay về màn trước (B05) và quay lại từ màn con vẫn giữ đúng thẻ, bộ lọc, ảnh đang chọn.
type Tab = 'lich-su' | 'anh' | 'dien-tich';
type Filter = 'kham' | 'danh-gia' | 'buoi';
type Measure = 'bieu-do' | 'danh-sach';

export default function WoundHistory() {
  // tab=danh-gia và tab=buoi là lối vào cũ từ B05 (giai đoạn 1): mở thẻ Lịch sử với bộ lọc tương ứng.
  const params = useLocalSearchParams<{ woundId: string; tab?: string; loc?: string; xem?: string; chon?: string; chonAnh?: string }>();
  const { woundId } = params;
  const { data, me } = useStore();
  const { wound, patient, imagesOf, account, sessionsOf } = useLookups();
  const { width } = useWindowDimensions();
  const w = wound(woundId);
  const p = patient(w?.patientId);
  const canView = useCanView(p);
  if (!w || !p) return <NoAccess notFound />;
  if (!canView) return <NoAccess />;

  const isDoctor = me?.role === 'doctor';
  const legacy = params.tab === 'danh-gia' || params.tab === 'buoi';
  const tab: Tab = legacy ? 'lich-su' : params.tab === 'anh' || params.tab === 'dien-tich' ? params.tab : 'lich-su';
  const rawFilter = (legacy ? params.tab : params.loc) as Filter | undefined;
  const filter: Filter = rawFilter === 'danh-gia' || (rawFilter === 'buoi' && isDoctor) ? rawFilter : 'kham';
  const patientTimeline = !isDoctor && filter === 'kham';
  const measureView: Measure = params.xem === 'danh-sach' ? 'danh-sach' : 'bieu-do';

  const images = imagesOf(w.id);
  const dev = data.devices.find((x) => x.id === p.deviceId);
  const firstWound = data.wounds.find((x) => x.patientId === w.patientId)?.id;
  // Buổi điều trị: cùng bộ lọc sessionsForWound với B05 và tiến độ đợt. Chỉ bác sĩ.
  const woundSessions = isDoctor && dev ? sessionsForWound(sessionsOf(dev.id), w.id) : [];
  const timeline = buildTimeline({ wound: w, firstWoundId: firstWound, images, evaluations: data.evaluations, plans: data.plans, sessions: woundSessions, isDoctor });
  const shown = timeline.filter((t) => (filter === 'kham' ? t.kind !== 'buoi' : filter === 'danh-gia' ? t.kind === 'danh-gia' : t.kind === 'buoi'));
  const evalCount = timeline.filter((t) => t.kind === 'danh-gia').length;
  const sessionCount = timeline.filter((t) => t.kind === 'buoi').length;
  // PP-08 (chuyển từ B05): mỗi ngày bắt đầu khác nhau của các đợt (không tính bản nháp) là một mốc "Đợt n" trên biểu đồ.
  const courseMarkers = [...new Set(plansOfWound(data.plans, w, firstWound).filter((pl) => pl.status !== 'draft').map((pl) => pl.startDate))]
    .sort()
    .map((date, i) => ({ date, label: `Đợt ${i + 1}` }));

  const selecting = params.chonAnh === '1';
  const selection = parseSelection(params.chon, images, w.id);
  const pair = orderPair(selection, images);
  const roleOf = (id: string) => (pair ? (pair[0].id === id ? 'Trước' : pair[1].id === id ? 'Sau' : null) : selection.includes(id) ? 'Đã chọn' : null);

  const setTab = (v: Tab) => router.setParams({ tab: v, loc: undefined, chonAnh: undefined, chon: undefined });
  const openRecord = (t: TimelineEntry) => router.push({ pathname: '/wound-history/[woundId]/ban-ghi/[recordId]', params: { woundId: w.id, recordId: t.id, loai: t.kind } });
  const openPhoto = (id: string) => router.push({ pathname: '/wound-history/[woundId]/anh/[imageId]', params: { woundId: w.id, imageId: id } });
  const comparePair = () => pair && router.push({ pathname: '/compare/[woundId]', params: { woundId: w.id, truoc: pair[0].id, sau: pair[1].id } });

  const options: { value: Tab; label: string }[] = [
    { value: 'lich-su', label: 'Lịch sử' },
    { value: 'anh', label: `Ảnh (${images.length})` },
    { value: 'dien-tich', label: 'Số đo' },
  ];
  // Hai cột ảnh ở máy nhỏ, nhiều cột hơn ở máy tính bảng; trừ lề màn 2 x 20 và khe 12.
  const content = Math.min(width, 720) - 40;
  const cols = content >= 600 ? 4 : content >= 420 ? 3 : 2;
  const tileW = Math.floor((content - 12 * (cols - 1)) / cols);

  const footer = tab === 'anh' && selecting ? (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 1 }}><Button label="Hủy chọn" variant="secondary" onPress={() => router.setParams({ chonAnh: undefined, chon: undefined })} /></View>
      <View style={{ flex: 1 }}><Button label={pair ? 'So sánh 2 ảnh' : `Chọn thêm ${2 - selection.length} ảnh`} disabled={!pair} onPress={comparePair} /></View>
    </View>
  ) : undefined;

  return (
    <Screen header={<Header back title="Lịch sử vết thương" subtitle={`Vết thương ${w.code}`} />} footer={footer}>
      <ClinicalContext patient={p} wound={w} />
      <Segmented value={tab} options={options} onChange={setTab} />

      {tab === 'lich-su' && (
        <Card>
          {isDoctor || evalCount > 0 ? (
            <Choices
              value={filter}
              onChange={(v) => router.setParams({ tab: 'lich-su', loc: v })}
              options={[
                { value: 'kham' as const, label: isDoctor ? 'Khám và đánh giá' : 'Tất cả' },
                { value: 'danh-gia' as const, label: `Chỉ đánh giá (${evalCount})` },
                ...(isDoctor ? [{ value: 'buoi' as const, label: `Buổi điều trị (${sessionCount})` }] : []),
              ]}
            />
          ) : null}
          {/* N05: bệnh nhân mở "Lịch sử vết thương" từ trang tổng quan, cạnh thẻ Ảnh và Số đo. Bộ lọc "Tất cả" dùng dòng thời gian P2-07a
              (ảnh và lần đo, nhận xét đã công bố, buổi có woundId đúng vết, A26) như trước đây trên N05; "Chỉ đánh giá" giữ danh sách B08. */}
          {patientTimeline && (
            <WoundTimeline expanded images={images} evaluations={data.evaluations.filter((e) => e.woundId === w.id && e.visibleToPatient)}
              sessions={dev ? sessionsOf(dev.id).filter((s) => s.woundId === w.id) : []} doctorName={(id) => account(id)?.name} />
          )}
          {filter === 'buoi' && !dev && <Muted>Bệnh nhân chưa được giao thiết bị.</Muted>}
          {!patientTimeline && shown.length === 0 && !(filter === 'buoi' && !dev) && (
            <Empty icon="time-outline" text={filter === 'danh-gia' ? 'Chưa có đánh giá.' : filter === 'buoi' ? 'Chưa có buổi nào được ghi.' : 'Vết thương này chưa có lịch sử khám, ảnh hoặc đợt điều trị.'} />
          )}
          {/* Buổi điều trị nhiều (mỗi ngày một buổi): hiện 30 buổi gần nhất như trước. */}
          {(patientTimeline ? [] : filter === 'buoi' ? shown.slice(0, 30) : shown).map((t, i) => (
            <View key={`${t.kind}-${t.id}-${i}`}>
              {i > 0 && <Divider />}
              {timelineRow(t)}
            </View>
          ))}
          {filter === 'buoi' && shown.length > 30 && <Muted>{`Hiện 30 buổi gần nhất trên ${shown.length}. Xem đủ ở màn thiết bị.`}</Muted>}
          {filter === 'buoi' && dev && <TextLink label={`Mở thiết bị ${dev.code}`} onPress={() => router.push({ pathname: '/devices/[id]', params: { id: dev.id } })} />}
        </Card>
      )}

      {tab === 'anh' && (
        <View style={{ gap: 16 }}>
          {images.length === 0 && <Empty icon="images-outline" text={isDoctor ? 'Chưa có ảnh. Chụp hoặc tải ảnh lên để bắt đầu.' : 'Chưa có ảnh do bác sĩ chụp.'} />}
          {images.length >= 2 && !selecting && (
            <Button label="Chọn 2 ảnh để so sánh" variant="secondary" icon="git-compare-outline" onPress={() => router.setParams({ chonAnh: '1' })} />
          )}
          {selecting && (
            <Muted>{pair ? `Đã chọn ${pair[0].id} (${photoDay(pair[0])}) và ${pair[1].id} (${photoDay(pair[1])}). Ảnh chụp sớm hơn là ảnh "Trước".` : 'Chạm hai ảnh của vết này để so sánh. Chọn ảnh thứ ba sẽ thay ảnh chọn đầu tiên.'}</Muted>
          )}
          {groupImagesByDay(images, w.id).map((g) => (
            <View key={g.key} style={{ gap: 8 }}>
              <Text style={{ color: C.textSoft, fontWeight: '700', fontSize: T.small }}>
                {g.date ? `Chụp ${fmtDate(g.date)}` : 'Ngày chụp chưa rõ'} · {g.images.length} ảnh
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {g.images.map((im) => (
                  <HistoryPhotoTile
                    key={im.id}
                    image={im}
                    width={tileW}
                    selecting={selecting}
                    role={selecting ? 'checkbox' : 'button'}
                    pick={selecting ? roleOf(im.id) : null}
                    onPress={() => (selecting ? router.setParams({ chon: toggleSelection(selection, im.id).join(',') }) : openPhoto(im.id))}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {tab === 'dien-tich' && (
        <>
          <Segmented value={measureView} options={[{ value: 'bieu-do' as const, label: 'Biểu đồ' }, { value: 'danh-sach' as const, label: 'Kết quả đã lưu' }]} onChange={(v) => router.setParams({ xem: v })} />
          {measureView === 'bieu-do' ? (
            <Card>
              <SectionTitle icon="stats-chart-outline" right={images.length >= 2 ? <TextLink label="So sánh" onPress={() => router.push({ pathname: '/compare/[woundId]', params: { woundId: w.id } })} /> : null}>
                Tiến triển diện tích
              </SectionTitle>
              {/* Cùng biểu đồ đường và tham số với giai đoạn 1 (P2-02d, QĐ-P2-5): vạch ngày bắt đầu từng đợt chỉ ở phía bác sĩ. */}
              <AreaProgress code={w.code} woundId={w.id} images={images} evaluations={data.evaluations} today={localDay()} isDoctor={isDoctor} markers={isDoctor ? courseMarkers : []} accountName={(id) => account(id)?.name} photoStrip={!isDoctor} />
            </Card>
          ) : (
            <MeasurementList
              entries={measurementHistory({ woundId: w.id, images, evaluations: data.evaluations, isDoctor })}
              images={images}
              accountName={(id) => account(id)?.name}
              onOpen={(m) => router.push({ pathname: '/wound-history/[woundId]/ban-ghi/[recordId]', params: { woundId: w.id, recordId: m.recordId, loai: m.recordKind } })}
            />
          )}
        </>
      )}
    </Screen>
  );

  function timelineRow(entry: TimelineEntry) {
    const meta = KIND_META[entry.kind];
    const day = entry.dateKnown ? fmtDate(entry.at) : 'Ngày chụp chưa rõ';
    let title: string = meta.label;
    let sub = day;
    let extra: ReactNode = null;
    if (entry.kind === 'danh-gia') {
      const e = data.evaluations.find((x) => x.id === entry.id);
      if (e) {
        title = `Đánh giá · ${TREND[e.trend].label}`;
        sub = `${day} · ${account(e.doctorId)?.name ?? 'Bác sĩ'}${e.areaCm2 !== null ? ` · ${formatAreaDisplay(e.areaCm2)}` : ''}`;
        if (isDoctor) extra = <Chip label={e.visibleToPatient ? 'Bệnh nhân xem được' : 'Chỉ nội bộ'} tone={e.visibleToPatient ? 'blue' : 'gray'} />;
      }
    } else if (entry.kind === 'anh') {
      const im = images.find((x) => x.id === entry.id);
      if (im) {
        title = `Ảnh chụp ${im.id}`;
        sub = `${day} · ${im.areaCm2 === null ? 'chưa đo' : formatAreaDisplay(im.areaCm2)}`;
      }
    } else if (entry.kind === 'dot') {
      const pl = data.plans.find((x) => x.id === entry.id);
      if (pl) {
        title = `Đợt điều trị · phiên bản ${pl.version}`;
        sub = `${day} · ${PLAN_STATUS[pl.status].label.toLowerCase()}`;
      }
    } else {
      const s = woundSessions.find((x) => x.sessionId === entry.id);
      if (s) {
        title = `Buổi điều trị · ${s.durationMin} phút`;
        sub = `${fmtDateTime(s.start)} · ${SESSION_STATUS[s.status]} · ${SESSION_SOURCE[s.source]}`;
      }
    }
    return (
      <LinkRow
        icon={meta.icon}
        tone={meta.tone}
        title={title}
        sub={sub}
        testID={entry.kind === 'danh-gia' ? 'danh-gia-lich-su' : entry.kind === 'buoi' ? 'buoi-dieu-tri' : `lich-su-${entry.kind}`}
        accessibilityLabel={`${title}, ${sub}. Mở chi tiết`}
        onPress={() => openRecord(entry)}
        below={<View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}><SaveStateChip kind={entry.kind} state={entry.state} />{extra}</View>}
      />
    );
  }
}

/** Danh sách kết quả đo đã lưu. Mỗi nguồn ghi rõ, số tham khảo tách riêng và không bao giờ trình bày như số đo (QĐ-1). */
function MeasurementList({ entries, images, accountName, onOpen }: {
  entries: MeasurementEntry[];
  images: { id: string; areaCm2: number | null; measureMethod?: string; history: { at: string; by: string; toArea: number | null }[]; capture?: { manualReference?: { areaCm2: number | null; confirmedBy: string | null; confirmedAt: string | null } } }[];
  accountName: (id: string) => string | undefined;
  onOpen: (m: MeasurementEntry) => void;
}) {
  return (
    <Card>
      <SectionTitle icon="list-outline">{`Kết quả đo đã lưu (${entries.length})`}</SectionTitle>
      <Muted>Diện tích theo dõi là số bác sĩ đo. Số ghi trong đánh giá và ước lượng tự động hiện riêng, không thay số đo.</Muted>
      {entries.length === 0 && <Empty icon="resize-outline" text="Chưa có kết quả đo nào được lưu cho vết thương này." />}
      {entries.map((m, i) => {
        const day = m.dateKnown ? fmtDate(m.at) : 'Ngày chụp chưa rõ';
        const im = m.recordKind === 'anh' ? images.find((x) => x.id === m.recordId) : undefined;
        const src = m.kind === 'bac-si' && im ? measurementSource(im) : null;
        return (
          <View key={`${m.kind}-${m.recordId}`} testID={`ket-qua-do-${m.kind}`}>
            {i > 0 && <Divider />}
            <LinkRow
              icon={m.kind === 'tham-khao' ? 'sparkles-outline' : m.kind === 'danh-gia' ? 'clipboard-outline' : 'resize-outline'}
              tone={m.kind === 'tham-khao' ? 'violet' : 'teal'}
              title={m.kind === 'tham-khao' ? `${formatAreaDisplay(m.areaCm2)} (chưa kiểm chứng)` : formatAreaDisplay(m.areaCm2)}
              sub={`${day} · ${m.recordKind === 'anh' ? `ảnh ${m.recordId}` : 'lần đánh giá'}`}
              accessibilityLabel={`${m.kind === 'tham-khao' ? `Ước lượng ${m.refSource === 'ai' ? 'AI' : 'AR'} tham khảo` : m.kind === 'danh-gia' ? 'Diện tích ghi trong đánh giá' : 'Số đo bác sĩ'} ${formatAreaDisplay(m.areaCm2)}, ${day}. Mở chi tiết`}
              onPress={() => onOpen(m)}
              below={
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {m.kind === 'bac-si' && <StatusChip status={SOURCE.doctor} label={SOURCE.doctor.label} />}
                    {m.kind === 'danh-gia' && <Chip label="Ghi trong đánh giá" tone="violet" icon="clipboard-outline" />}
                    {m.kind === 'tham-khao' && <StatusChip status={SOURCE.ai} label={m.refSource === 'ai' ? 'Ước lượng AI (tham khảo)' : 'Ước lượng AR (tham khảo)'} />}
                  </View>
                  {m.kind === 'bac-si' && <Text style={{ fontSize: T.caption, color: C.textSoft }}>{`Phương pháp: ${m.method ?? 'chưa ghi'}${src ? ` · Nhập bởi ${accountName(src.by) ?? 'tài khoản không còn trong danh sách'}${src.at ? ` lúc ${fmtDateTime(src.at)}` : ''}` : ''}`}</Text>}
                  {m.replaced && m.replaced.length > 0 && (
                    <Text style={{ fontSize: T.caption, color: C.textSoft }}>{`Đã sửa ${m.replaced.length} lần, số trước đó vẫn lưu: ${m.replaced.map((h) => formatAreaDisplay(h.fromArea)).join(', ')}`}</Text>
                  )}
                </View>
              }
            />
          </View>
        );
      })}
    </Card>
  );
}
