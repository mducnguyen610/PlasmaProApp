import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { ClinicalContext } from '@/components/ClinicalContext';
import { NoAccess, useCanView } from '@/components/Guard';
import { KIND_META, SaveStateChip, SESSION_SOURCE, SESSION_STATUS, photoDay } from '@/components/history';
import { Card, Chip, Header, InfoRow, Muted, Notice, Screen, SectionTitle, StatusChip, TextLink, WoundPhoto } from '@/components/ui';
import { assessmentSummary } from '@/lib/assessment';
import { sessionsForWound } from '@/lib/course';
import { fmtDate, fmtDateTime, PLAN_STATUS, TREND } from '@/lib/format';
import { measurementSource } from '@/lib/measurementSource';
import { formatAreaDisplay } from '@/lib/naming';
import { useLookups, useStore } from '@/lib/store';
import { buildTimeline, findRecord } from '@/lib/woundHistory';
import { C, T } from '@/theme';
import { SOURCE, TREND_ROLE } from '@/theme.status';

// Giai đoạn 4 giao diện theo tác vụ: chi tiết một bản ghi trong Lịch sử vết thương, màn riêng, chỉ đọc.
// Đường dẫn mang woundId (vết), recordId (mã bản ghi) và loai (đánh giá, ảnh, đợt, buổi). Bản ghi phải nằm trong dòng thời gian
// của đúng vết và đúng vai trò (cùng bộ lọc với màn Lịch sử), nếu không thì báo "Không tìm thấy": không bao giờ hiện bản ghi của vết khác.
export default function HistoryRecord() {
  const { woundId, recordId, loai } = useLocalSearchParams<{ woundId: string; recordId: string; loai?: string }>();
  const { data, me } = useStore();
  const { wound, patient, imagesOf, account, sessionsOf } = useLookups();
  const w = wound(woundId);
  const p = patient(w?.patientId);
  const canView = useCanView(p);
  if (!w || !p) return <NoAccess notFound />;
  if (!canView) return <NoAccess />;

  const isDoctor = me?.role === 'doctor';
  const images = imagesOf(w.id);
  const dev = data.devices.find((x) => x.id === p.deviceId);
  const sessions = isDoctor && dev ? sessionsForWound(sessionsOf(dev.id), w.id) : [];
  const firstWound = data.wounds.find((x) => x.patientId === w.patientId)?.id;
  const timeline = buildTimeline({ wound: w, firstWoundId: firstWound, images, evaluations: data.evaluations, plans: data.plans, sessions, isDoctor });
  const entry = findRecord(timeline, loai, recordId);
  if (!entry) return <NoAccess notFound />;

  const meta = KIND_META[entry.kind];
  const openPhoto = (id: string) => router.push({ pathname: '/wound-history/[woundId]/anh/[imageId]', params: { woundId: w.id, imageId: id } });
  const day = entry.dateKnown ? fmtDate(entry.at) : 'ngày chụp chưa rõ';
  const head = <Header back title={`${meta.label} ${day}`} subtitle={`Vết thương ${w.code}`} />;
  const stateRow = <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}><SaveStateChip kind={entry.kind} state={entry.state} /></View>;

  if (entry.kind === 'danh-gia') {
    const e = data.evaluations.find((x) => x.id === entry.id)!;
    // Ảnh gắn với lần đánh giá chỉ hiện khi thuộc đúng vết.
    const linked = e.imageId ? images.find((i) => i.id === e.imageId) : undefined;
    return (
      <Screen header={head}>
        <ClinicalContext patient={p} wound={w} />
        <Card hero>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontWeight: '700', color: C.text, flex: 1 }}>{fmtDate(e.date)} · {account(e.doctorId)?.name ?? 'Bác sĩ'}</Text>
            <StatusChip status={TREND_ROLE[e.trend]} label={TREND[e.trend].label} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <SaveStateChip kind="danh-gia" state={entry.state} />
            {isDoctor && <Chip label={e.visibleToPatient ? 'Bệnh nhân xem được' : 'Chỉ nội bộ'} tone={e.visibleToPatient ? 'blue' : 'gray'} />}
          </View>
          {/* Cùng các trường với thẻ đánh giá ở giai đoạn 1 và chế độ "Xem đầy đủ" ở B05. */}
          <InfoRow label="Diện tích ghi trong đánh giá" value={formatAreaDisplay(e.areaCm2)} />
          {isDoctor && e.assessment ? <Text style={{ color: C.text }}>{assessmentSummary(e.assessment)}</Text> : null}
          {e.characteristics ? <Muted>Đặc điểm: {e.characteristics}</Muted> : null}
          {e.symptoms ? <Muted>Triệu chứng: {e.symptoms} (nguồn: {e.symptomSource || 'chưa ghi'})</Muted> : null}
          {e.instructions ? <Text style={{ color: C.text }}>Hướng dẫn: {e.instructions}</Text> : null}
          {e.nextReview ? <Muted>Tái đánh giá: {fmtDate(e.nextReview)}</Muted> : null}
        </Card>
        {linked && (
          <Card>
            <SectionTitle icon="image-outline">Ảnh dùng cho lần đánh giá</SectionTitle>
            <Pressable onPress={() => openPhoto(linked.id)} accessibilityRole="button" accessibilityLabel={`Xem ảnh ${linked.id}, ${photoDay(linked)}`}>
              <WoundPhoto image={linked} fit="contain" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14 }} />
            </Pressable>
            <Muted>{`${linked.id} · ${photoDay(linked)}`}</Muted>
          </Card>
        )}
      </Screen>
    );
  }

  if (entry.kind === 'anh') {
    const im = images.find((x) => x.id === entry.id)!;
    const src = measurementSource(im);
    const ar = im.capture?.automaticMeasurement;
    const ai = im.capture?.wound;
    const arArea = ar && ar.status === 'estimated_unvalidated' ? ar.areaCm2 : null;
    const replaced = im.history.filter((h) => h.fromArea !== null).reverse();
    return (
      <Screen header={head}>
        <ClinicalContext patient={p} wound={w} />
        <Card hero>
          <Pressable onPress={() => openPhoto(im.id)} accessibilityRole="button" accessibilityLabel={`Xem ảnh ${im.id} ở chế độ xem riêng`}>
            <WoundPhoto image={im} fit="contain" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14 }} />
          </Pressable>
          {stateRow}
          <InfoRow label="Mã ảnh" value={im.id} mono />
          <InfoRow label="Ngày chụp" value={photoDay(im)} />
          <InfoRow label="Ngày tải lên" value={fmtDate(im.uploadDate)} />
          <TextLink label="Xem ảnh toàn màn" onPress={() => openPhoto(im.id)} />
        </Card>
        <Card>
          <SectionTitle icon="resize-outline">Số đo đã lưu</SectionTitle>
          {im.areaCm2 === null ? <Muted>Ảnh này chưa có số đo của bác sĩ.</Muted> : (
            <>
              <InfoRow label="Diện tích" value={formatAreaDisplay(im.areaCm2)} />
              <View style={{ flexDirection: 'row' }}><StatusChip status={SOURCE.doctor} label={SOURCE.doctor.label} /></View>
              <InfoRow label="Phương pháp" value={im.measureMethod?.trim() || 'chưa ghi'} />
              <Muted>{src ? `Nhập bởi ${account(src.by)?.name ?? 'tài khoản không còn trong danh sách'}${src.at ? ` lúc ${fmtDateTime(src.at)}` : ''}` : 'Chưa có thông tin người nhập'}</Muted>
            </>
          )}
          {replaced.length > 0 && (
            <View style={{ gap: 4 }}>
              <Text style={{ fontWeight: '600', color: C.text, fontSize: T.small }}>Các lần sửa số đo (số cũ vẫn lưu)</Text>
              {replaced.map((h, i) => <Muted key={i}>{`${fmtDateTime(h.at)} · ${account(h.by)?.name ?? 'Dữ liệu mô phỏng'}: ${formatAreaDisplay(h.fromArea)} → ${formatAreaDisplay(h.toArea)}`}</Muted>)}
            </View>
          )}
          {/* Số tự động chỉ để tham khảo, hiện riêng, không thay số đo (QĐ-1). Chỉ bác sĩ, như B11. */}
          {isDoctor && (arArea !== null || typeof ai?.areaCm2 === 'number') && (
            <View style={{ gap: 6, backgroundColor: C.violetSoft, borderRadius: 12, padding: 12 }}>
              <View style={{ flexDirection: 'row' }}><StatusChip status={SOURCE.ai} label={SOURCE.ai.label} /></View>
              {arArea !== null && <InfoRow label="Ước lượng AR (tham khảo)" value={`${formatAreaDisplay(arArea)} (chưa kiểm chứng)`} />}
              {arArea === null && typeof ai?.areaCm2 === 'number' && <InfoRow label="Ước lượng AI (tham khảo)" value={`${formatAreaDisplay(ai.areaCm2)} (chưa kiểm chứng)`} />}
              <Muted>Số tự động chỉ để tham khảo, không phải kết quả đo.</Muted>
            </View>
          )}
          {im.status === 'excluded' && im.excludeReason ? <Muted>{`Lý do loại: ${im.excludeReason}`}</Muted> : null}
          {isDoctor && <TextLink label="Mở chi tiết ảnh để đo hoặc sửa số đo" onPress={() => router.push({ pathname: '/images/[id]', params: { id: im.id } })} />}
        </Card>
      </Screen>
    );
  }

  if (entry.kind === 'dot') {
    const pl = data.plans.find((x) => x.id === entry.id)!;
    return (
      <Screen header={head}>
        <ClinicalContext patient={p} wound={w} />
        <Card hero>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Chip label={PLAN_STATUS[pl.status].label} tone={PLAN_STATUS[pl.status].tone} />
            <SaveStateChip kind="dot" state={entry.state} />
          </View>
          <InfoRow label="Phiên bản" value={String(pl.version)} />
          <InfoRow label="Thời gian" value={`${fmtDate(pl.startDate)} đến ${fmtDate(pl.endDate)}`} />
          {pl.editedAt ? <InfoRow label="Lưu lúc" value={fmtDateTime(pl.editedAt)} /> : null}
          {pl.editedBy ? <InfoRow label="Người lưu" value={account(pl.editedBy)?.name ?? 'tài khoản không còn trong danh sách'} /> : null}
          {pl.reason ? <Muted>{`Lý do thay đổi: ${pl.reason}`}</Muted> : null}
          {pl.notes ? <Muted>{`Ghi chú: ${pl.notes}`}</Muted> : null}
          {entry.state === 'nhap' && <Notice icon="create-outline" tone="gray">Bản nháp chưa áp dụng cho bệnh nhân và chưa gửi xuống thiết bị.</Notice>}
          <Muted>Liều, lịch và các giai đoạn xem ở màn Đợt điều trị.</Muted>
          <TextLink label="Mở Đợt điều trị" onPress={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id, woundId: w.id } })} />
        </Card>
      </Screen>
    );
  }

  const s = sessions.find((x) => x.sessionId === entry.id)!;
  return (
    <Screen header={head}>
      <ClinicalContext patient={p} wound={w} />
      <Card hero>
        {stateRow}
        <InfoRow label="Bắt đầu" value={fmtDateTime(s.start)} />
        <InfoRow label="Thời lượng" value={`${s.durationMin} phút`} />
        <InfoRow label="Kết quả" value={SESSION_STATUS[s.status]} />
        <InfoRow label="Nguồn" value={SESSION_SOURCE[s.source]} />
        {s.energyWh !== null ? <InfoRow label="Năng lượng" value={`${String(s.energyWh).replace('.', ',')} Wh`} /> : null}
        <InfoRow label="Mã phiên" value={s.sessionId} mono />
        {dev && <TextLink label={`Mở thiết bị ${dev.code}`} onPress={() => router.push({ pathname: '/devices/[id]', params: { id: dev.id } })} />}
      </Card>
    </Screen>
  );
}
