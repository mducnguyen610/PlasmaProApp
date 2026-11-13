import { router } from 'expo-router';

import { DateBadge } from '@/components/DateBadge';
import { View } from 'react-native';
import { PatientCard, TaskRow } from '@/components/items';
import { Card, Disclosure, Header, ListCard, Muted, NumberTile, Screen, SectionTitle, SimBadge, TextLink, type IconName } from '@/components/ui';
import { useRankedPatients } from '@/components/useRankedPatients';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { formatAreaDisplay } from '@/lib/naming';
import { useLookups, useStore } from '@/lib/store';

// Mốc riêng cho mỗi lần chạm ô, để màn đích lọc lại kể cả khi tab đã mở sẵn (UX-17).
let tapCount = 0;
const tapStamp = () => String(++tapCount);

type Task = { key: string; icon: IconName; tone: 'amber' | 'red' | 'blue' | 'violet'; count: number; label: string; onPress: () => void };

// BS01 – Trang chủ bác sĩ: danh sách việc cần làm rồi danh sách bệnh nhân; số liệu tổng hợp chuyển sang quản trị kỹ thuật.
export default function DoctorHome() {
  const { data, me } = useStore();
  const { device, patient, wound } = useLookups();
  const mine = data.patients.filter((p) => p.doctorId === me?.id);
  // Xếp người bệnh theo mức cần chú ý (FR10); cách tính ở src/lib/attention.ts, dùng chung với B02 (V09).
  const ranked = useRankedPatients();
  const ids = new Set(mine.map((p) => p.id));
  const myImages = data.images.filter((i) => ids.has(i.patientId));
  const unlabeled = myImages.filter((i) => i.status === 'unlabeled');
  const retakes = myImages.filter((i) => i.retakeRequested);
  const reports = data.reports.filter((r) => ids.has(r.patientId) && !r.handled);
  const drafts = data.plans.filter((p) => ids.has(p.patientId) && p.status === 'draft');
  const offline = mine.map((p) => device(p.deviceId)).filter((d) => d && !d.online);
  // Chỉ hiện việc đang có; số liệu tổng hợp (tỉ lệ gán nhãn, thống kê) nằm ở màn hình quản trị kỹ thuật.
  const candidates: (Task | false)[] = [
    reports.length > 0 && { key: 'reports', icon: 'medkit-outline', tone: 'red', count: reports.length, label: 'Báo cáo mới', onPress: () => router.navigate({ pathname: '/doctor/patients', params: { loc: 'bao-cao', t: tapStamp() } }) },
    unlabeled.length > 0 && { key: 'unlabeled', icon: 'pricetag-outline', tone: 'amber', count: unlabeled.length, label: 'Ảnh chưa đo', onPress: () => router.navigate({ pathname: '/doctor/dataset', params: { loc: 'chua-do', t: tapStamp() } }) },
    // P1-01a: từ 2 mục thì mở danh sách đã lọc (trước đây luôn mở mục đầu, các mục sau không mở được từ ô). Một mục: mở thẳng như cũ.
    retakes.length > 0 && { key: 'retakes', icon: 'camera-outline', tone: 'amber', count: retakes.length, label: 'Ảnh cần chụp lại', onPress: () => retakes.length > 1
      ? router.navigate({ pathname: '/doctor/dataset', params: { loc: 'chup-lai', t: tapStamp() } })
      : router.push({ pathname: '/images/[id]', params: { id: retakes[0].id } }) },
    // P1-01d: nháp của từ 2 vết khác nhau thì mở B02 lọc "Có đợt nháp"; nháp của một vết thì mở thẳng B06 đúng vết như P0.
    drafts.length > 0 && { key: 'drafts', icon: 'flash-outline', tone: 'amber', count: drafts.length, label: 'Đợt nháp chờ xác nhận', onPress: () => new Set(drafts.map((d) => `${d.patientId}:${d.woundId ?? ''}`)).size > 1
      ? router.navigate({ pathname: '/doctor/patients', params: { loc: 'dot-nhap', t: tapStamp() } })
      : router.push({ pathname: '/plan/[patientId]', params: { patientId: drafts[0].patientId, ...(drafts[0].woundId ? { woundId: drafts[0].woundId } : {}) } }) },
    offline.length > 0 && { key: 'offline', icon: 'cloud-offline-outline', tone: 'blue', count: offline.length, label: 'Thiết bị chưa đồng bộ', onPress: () => offline.length > 1
      ? router.navigate({ pathname: '/doctor/patients', params: { loc: 'chua-dong-bo', t: tapStamp() } })
      : router.push({ pathname: '/devices/[id]', params: { id: offline[0]!.id } }) },
  ];
  const tasks = candidates.filter((t): t is Task => !!t);
  // P1-01c (QĐ-P1-2 A): chỉ hiện bệnh nhân có việc chờ theo kết quả xếp hạng sẵn có (score > 0), giữ nguyên thứ tự rankPatients.
  // Không đổi điểm, không đổi thứ tự, không thêm tiêu chí; người còn lại xem ở B02.
  const waiting = ranked.filter((a) => a.score > 0);
  const rest = ranked.length - waiting.length;
  // P1-01e: 5 việc gần nhất chính bác sĩ đã làm, chỉ đọc từ dữ liệu có sẵn: lần ghi số đo (history, có giờ) và đánh giá (chỉ có ngày).
  // Sắp theo ngày giảm dần; cùng ngày thì số đo có giờ đứng trước đánh giá chỉ có ngày.
  type Recent = { key: string; day: string; at: string; title: string; detail: string; onPress: () => void };
  const recentMeasures: Recent[] = myImages.flatMap((im) => {
    const h = [...im.history].reverse().find((x) => x.by === me?.id);
    if (!h) return [];
    const pt = patient(im.patientId), w = wound(im.woundId);
    return [{ key: `m-${im.id}`, day: h.at.slice(0, 10), at: h.at, title: `Số đo ${im.id}: ${formatAreaDisplay(h.toArea)}`,
      detail: `${pt?.name ?? ''} · ${pt?.code ?? ''} · ${w?.code ?? ''} · ${fmtDateTime(h.at)}`,
      onPress: () => router.push({ pathname: '/images/[id]', params: { id: im.id } }) }];
  });
  const recentEvals: Recent[] = data.evaluations.filter((e) => e.doctorId === me?.id).flatMap((e) => {
    const w = wound(e.woundId); const pt = patient(w?.patientId);
    if (!w || !pt || !ids.has(pt.id)) return [];
    return [{ key: `e-${e.id}`, day: e.date.slice(0, 10), at: '', title: `Đánh giá ${w.code}`, detail: `${pt.name} · ${pt.code} · ${fmtDate(e.date)}`,
      onPress: () => router.push({ pathname: '/wounds/[id]', params: { id: w.id } }) }];
  });
  const recent = [...recentMeasures, ...recentEvals]
    .sort((a, b) => b.day.localeCompare(a.day) || b.at.localeCompare(a.at))
    .slice(0, 5);

  return (
    <Screen header={<Header title="Trang chủ" subtitle={`Xin chào, ${me?.name ?? ''}`} right={<DateBadge />} />}>
      <SectionTitle>Việc cần làm</SectionTitle>
      {/* Ô số lớn làm điểm neo. UX-17 (Đợt 12): "Báo cáo mới" mở B02 lọc "Có báo cáo", "Ảnh chưa đo" mở B12 lọc "Chưa đo"; các ô khác mở việc đầu tiên như cũ. */}
      {tasks.length === 0 ? <Card><Muted>Không có việc nào đang chờ.</Muted></Card> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {tasks.map((t) => <NumberTile key={t.key} value={t.count} label={t.label} icon={t.icon} tone={t.tone} onPress={t.onPress} />)}
        </View>
      )}

      <SectionTitle action="Danh sách" onAction={() => router.navigate('/doctor/patients')}>{`Bệnh nhân cần xem (${waiting.length})`}</SectionTitle>
      {/* PP-10: nêu tiêu chí xếp, theo đúng thứ tự trọng số trong src/lib/attention.ts (không đổi cách xếp). */}
      <Muted>Xếp theo mức cần xử lý: báo cáo chưa xử lý, mức độ bác sĩ đánh giá, buổi bỏ lỡ trong 7 ngày, chưa có dữ liệu hôm nay.</Muted>
      {waiting.length === 0 ? <Card><Muted>Không có bệnh nhân nào có việc chờ theo các tiêu chí trên.</Muted></Card> : (
        <ListCard>
          {waiting.map((a) => {
            const p = mine.find((x) => x.id === a.patientId);
            return p ? <PatientCard key={p.id} patient={p} attention={a} /> : null;
          })}
        </ListCard>
      )}
      {/* Không nói "ổn định": chỉ là không có việc chờ theo tiêu chí xếp. */}
      {rest > 0 && <TextLink label={`Còn ${rest} bệnh nhân không có việc chờ theo tiêu chí trên · Xem danh sách`} onPress={() => router.navigate('/doctor/patients')} />}

      {recent.length > 0 && (
        <Disclosure icon="time-outline" title="Vừa xử lý" summary={`${recent.length} việc gần nhất của bạn`}>
          {recent.map((r) => <TaskRow key={r.key} icon={r.key.startsWith('m-') ? 'resize-outline' : 'clipboard-outline'} tone="blue" title={r.title} detail={r.detail} onPress={r.onPress} />)}
        </Disclosure>
      )}
      <SimBadge />
    </Screen>
  );
}
