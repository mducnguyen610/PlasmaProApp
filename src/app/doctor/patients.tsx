import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PatientCard } from '@/components/items';
import { Text } from '@/components/Text';
import { useRankedPatients } from '@/components/useRankedPatients';
import { patientSeverity, SEVERITY } from '@/lib/access';
import { TODAY_LABEL, type TodayState } from '@/lib/attention';
import type { Severity } from '@/lib/types';
import { Button, Card, Choices, Disclosure, Empty, Header, HeaderButton, LinkRow, ListCard, Muted, Screen, SearchField, SectionTitle } from '@/components/ui';
import { useLookups, useStore } from '@/lib/store';
import { C, T } from '@/theme';

/** P1-01b: lọc theo trạng thái hôm nay đã tính sẵn trong attention.ts (không tính lại), và máy chưa đồng bộ (cùng điều kiện với ô ở B01). */
type TodayFilter = 'all' | Extract<TodayState, 'missed' | 'no_data' | 'due'> | 'offline';
const TODAY_FILTERS = ['missed', 'no_data', 'due'] as const;

// BS02 – Danh sách bệnh nhân: tìm theo tên/mã, thêm mới, mở hồ sơ.
export default function PatientList() {
  const { data, me } = useStore();
  const { device } = useLookups();
  const [level, setLevel] = useState<Severity | 'all' | 'reports' | 'drafts'>('all');
  const [today, setToday] = useState<TodayFilter>('all');
  const [q, setQ] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  // Mục "Bộ lọc" mặc định đóng như tab Ảnh (B12); mở sẵn khi đến từ ô ở B01 có lọc sẵn, để thấy ngay bộ lọc đang chọn.
  const [filterOpen, setFilterOpen] = useState(false);
  // UX-17: mở từ ô "Báo cáo mới" ở B01 thì lọc sẵn bệnh nhân có báo cáo chưa xử lý.
  // P1-01a: mở từ ô "Thiết bị chưa đồng bộ" (từ 2 máy) thì lọc sẵn bệnh nhân giữ máy chưa đồng bộ.
  // Mỗi lần chạm ô có mốc t riêng, nên chạm lại vẫn lọc lại dù tab đã mở từ trước.
  const { loc, t } = useLocalSearchParams<{ loc?: string; t?: string }>();
  const [seen, setSeen] = useState<string | undefined>(undefined);
  // P1-01d: mở từ ô "Đợt nháp chờ xác nhận" (nháp của từ 2 vết) thì lọc sẵn bệnh nhân có đợt nháp.
  if ((loc === 'bao-cao' || loc === 'chua-dong-bo' || loc === 'dot-nhap') && `${loc}:${t}` !== seen) {
    setSeen(`${loc}:${t}`);
    setLevel(loc === 'bao-cao' ? 'reports' : loc === 'dot-nhap' ? 'drafts' : 'all');
    setToday(loc === 'chua-dong-bo' ? 'offline' : 'all');
    setQ('');
    setShowArchived(false);
    setFilterOpen(true);
  }
  // Danh sách mặc định chỉ gồm hồ sơ đang theo dõi; hồ sơ đã lưu trữ xem ở chế độ riêng (nút cuối danh sách).
  const all = data.patients.filter((p) => p.doctorId === me?.id);
  const mine = all.filter((p) => !p.archivedAt);
  const archivedList = all.filter((p) => !!p.archivedAt).sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''));
  const archivedReports = data.reports.filter((r) => !r.handled && archivedList.some((p) => p.id === r.patientId)).length;
  const withReports = new Set(data.reports.filter((r) => !r.handled).map((r) => r.patientId));
  const reportCount = mine.filter((p) => withReports.has(p.id)).length;
  const withDrafts = new Set(data.plans.filter((x) => x.status === 'draft').map((x) => x.patientId));
  const draftCount = mine.filter((p) => withDrafts.has(p.id)).length;
  // Cùng thông tin và thứ tự với trang chủ (V09): trạng thái hôm nay và lý do cần chú ý.
  const ranked = useRankedPatients();
  const order = new Map(ranked.map((a, i) => [a.patientId, i]));
  const attentionOf = new Map(ranked.map((a) => [a.patientId, a]));
  const offline = new Set(mine.filter((p) => { const d = device(p.deviceId); return !!d && !d.online; }).map((p) => p.id));
  const matchesToday = (id: string, f: TodayFilter) => f === 'all' || (f === 'offline' ? offline.has(id) : attentionOf.get(id)?.state === f);
  const todayCount = (f: TodayFilter) => mine.filter((p) => matchesToday(p.id, f)).length;
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const list = mine
    .filter(p => level === 'all' || (level === 'reports' ? withReports.has(p.id) : level === 'drafts' ? withDrafts.has(p.id) : patientSeverity(data, p.id) === level))
    .filter((p) => matchesToday(p.id, today))
    .filter((p) => !q || norm(`${p.name} ${p.code}`).includes(norm(q)))
    .sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));
  // Bộ lọc thu gọn như tab Ảnh (B12): một mục "Bộ lọc" đóng, mở được, dòng tóm tắt nêu lựa chọn đang áp dụng.
  // Chỉ ẩn, hiện hai hàng lọc; giá trị lọc, kết quả và logic lọc không đổi. Ô tìm kiếm ở thanh đầu màn luôn hiện.
  const levelLabel = level === 'all' ? 'Tất cả hồ sơ' : level === 'reports' ? 'Có báo cáo' : level === 'drafts' ? 'Có đợt nháp' : SEVERITY[level].label;
  const todayLabel = today === 'all' ? 'Mọi trạng thái' : today === 'offline' ? 'Máy chưa đồng bộ' : TODAY_LABEL[today];
  const filterSummary = `${levelLabel} · Hôm nay: ${todayLabel}`;

  if (showArchived) {
    const found = archivedList.filter((p) => !q || norm(`${p.name} ${p.code}`).includes(norm(q)));
    return (
      <Screen header={<Header title="Hồ sơ đã lưu trữ" subtitle={`${archivedList.length} hồ sơ`} />}>
        <Button label="Về danh sách đang theo dõi" icon="arrow-back" variant="secondary" onPress={() => setShowArchived(false)} />
        <SearchField label="Tìm hồ sơ đã lưu trữ" value={q} onChangeText={setQ} placeholder="Tìm theo tên hoặc mã bệnh nhân…" />
        <Muted>Hồ sơ đã lưu trữ chỉ xem được, lịch sử lâm sàng giữ nguyên. Mở hồ sơ để khôi phục.</Muted>
        {found.length === 0 && <Empty icon="archive-outline" text={archivedList.length ? 'Không tìm thấy hồ sơ phù hợp.' : 'Chưa có hồ sơ nào được lưu trữ.'} />}
        <ListCard>
          {found.map((p) => <PatientCard key={p.id} patient={p} />)}
        </ListCard>
      </Screen>
    );
  }

  return (
    // Stage 9A: ô tìm kiếm nằm trong thanh nhận diện (luôn ở đầu màn), bộ lọc gom thành một khối có nhãn nhóm.
    <Screen header={<Header title="Bệnh nhân" subtitle={`${mine.length} hồ sơ đang theo dõi`} right={<HeaderButton icon="add" label="Thêm mới" onPress={() => router.push('/patients/new')} />}>
      <SearchField label="Tìm bệnh nhân" value={q} onChangeText={setQ} placeholder="Tìm theo tên hoặc mã bệnh nhân…" />
    </Header>}>
      <Card style={{ paddingVertical: 4 }}>
      <Disclosure title="Bộ lọc" icon="funnel-outline" summary={filterSummary} open={filterOpen} onToggle={setFilterOpen}>
      <View style={{ gap: 10, paddingBottom: 10 }}>
      <Text style={{ color: C.textSoft, fontSize: T.caption, fontWeight: '600' }}>Lọc theo hồ sơ</Text>
      <Choices<Severity | 'all' | 'reports' | 'drafts'> value={level} onChange={setLevel} options={[{ value: 'all', label: 'Tất cả' }, { value: 'reports', label: `Có báo cáo (${reportCount})` }, ...(draftCount > 0 || level === 'drafts' ? [{ value: 'drafts' as const, label: `Có đợt nháp (${draftCount})` }] : []), ...(['mild', 'moderate', 'severe'] as const).map(value => ({ value, label: SEVERITY[value].label }))]} />
      {/* P1-01b: hàng lọc thứ hai theo việc hôm nay. Kết hợp với hàng trên (cả hai cùng đúng). Thứ tự trong kết quả vẫn theo rankPatients. */}
      <Text style={{ color: C.textSoft, fontSize: T.caption, fontWeight: '600', marginTop: 4 }}>Hôm nay</Text>
      <Choices<TodayFilter>
        value={today}
        onChange={setToday}
        options={[
          { value: 'all', label: 'Mọi trạng thái', a11y: 'Hôm nay: mọi trạng thái' },
          ...TODAY_FILTERS.map((f) => ({ value: f, label: `${TODAY_LABEL[f]} (${todayCount(f)})`, a11y: `Hôm nay: ${TODAY_LABEL[f]}, ${todayCount(f)} bệnh nhân` })),
          // Chỉ hiện khi có máy chưa đồng bộ hoặc đang chọn.
          ...(offline.size > 0 || today === 'offline' ? [{ value: 'offline' as const, label: `Máy chưa đồng bộ (${offline.size})`, a11y: `Máy chưa đồng bộ, ${offline.size} bệnh nhân` }] : []),
        ]}
      />
      </View>
      </Disclosure>
      </Card>
      {list.length === 0 && <Empty icon="search" text="Không tìm thấy bệnh nhân phù hợp." />}
      {/* PP-10: cùng tiêu chí xếp với trang chủ (src/lib/attention.ts). Câu giải thích cách xếp dưới tiêu đề đã bỏ theo yêu cầu người dùng (21/11/2026). */}
      {list.length > 0 && <SectionTitle>{`Kết quả (${list.length})`}</SectionTitle>}
      <ListCard>
        {list.map((p) => <PatientCard key={p.id} patient={p} attention={attentionOf.get(p.id)} />)}
      </ListCard>
      {/* Lối vào hồ sơ đã lưu trữ: chỉ hiện khi có, để màn mặc định không đổi với bác sĩ chưa lưu trữ hồ sơ nào. */}
      {archivedList.length > 0 && (
        <ListCard>
          <LinkRow icon="archive-outline" tone="gray" title={`Hồ sơ đã lưu trữ (${archivedList.length})`}
            // Bệnh nhân của hồ sơ đã lưu trữ vẫn gửi được báo cáo từ ứng dụng; nêu số báo cáo chưa xử lý để không bị bỏ sót.
            sub={archivedReports ? `Chỉ xem · ${archivedReports} báo cáo chưa xử lý` : 'Chỉ xem, lịch sử giữ nguyên'}
            testID="loi-vao-luu-tru" onPress={() => { setQ(''); setShowArchived(true); }} />
        </ListCard>
      )}
    </Screen>
  );
}
