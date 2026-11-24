import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DoctorPatientCard } from '@/components/items';
import { Text } from '@/components/Text';
import { Button, Card, Choices, Disclosure, Empty, Header, HeaderButton, LinkRow, ListCard, Muted, Screen, SearchField, SectionTitle } from '@/components/ui';
import { useStore } from '@/lib/store';
import { matchesNameOrCode, paginate } from '@/lib/patientIdentity';
import { CARE_STATUS, patientCareStatus, woundUpdatedAt, type CareStatus } from '@/lib/woundStatus';
import { C, T } from '@/theme';

type PlanFilter = 'all' | 'has' | 'none';

/**
 * BS02 Danh sách bệnh nhân theo logic chốt 25/11/2026 (TONG-HOP-LOGIC-BAC-SI.md mục 3.1; M1, M2, M6, M7, M8, H5, H9):
 * tìm theo một phần tên (bỏ dấu, không phân biệt hoa thường) hoặc một phần mã, 20 hồ sơ mỗi trang; bộ lọc thu gọn gồm 4 trạng thái H7
 * và Có hoặc Chưa có phác đồ hoạt động. Mặc định chỉ hồ sơ mình phụ trách; hồ sơ của bác sĩ khác chỉ hiện khi tìm, chỉ xem.
 */
export default function PatientList() {
  const { data, me } = useStore();
  const [care, setCare] = useState<CareStatus | 'all'>('all');
  const [planF, setPlanF] = useState<PlanFilter>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [showArchived, setShowArchived] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const all = data.patients.filter((p) => p.doctorId === me?.id);
  const mine = all.filter((p) => !p.archivedAt);
  const archivedList = all.filter((p) => !!p.archivedAt).sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''));
  const archivedReports = data.reports.filter((r) => !r.handled && archivedList.some((p) => p.id === r.patientId)).length;
  const woundsOf = (id: string) => data.wounds.filter((w) => w.patientId === id);
  const careOf = (id: string) => patientCareStatus(woundsOf(id), data.plans);
  const hasActive = (id: string) => data.plans.some((p) => p.patientId === id && (p.status === 'active' || p.status === 'paused'));
  const updatedOf = (id: string) => woundsOf(id).map((w) => woundUpdatedAt(w, data.images, data.plans, data.sessions)).sort().pop() ?? '';
  const searching = q.trim() !== '';
  const pool = searching ? data.patients.filter((p) => !p.archivedAt && !!p.doctorId) : mine;
  const filtered = pool
    .filter((p) => care === 'all' || careOf(p.id) === care)
    .filter((p) => planF === 'all' || (planF === 'has') === hasActive(p.id))
    .filter((p) => matchesNameOrCode(p, q))
    // Hồ sơ của mình trước, rồi hồ sơ mới cập nhật trước.
    .sort((a, b) => Number(b.doctorId === me?.id) - Number(a.doctorId === me?.id) || updatedOf(b.id).localeCompare(updatedOf(a.id)) || a.code.localeCompare(b.code));
  const paged = paginate(filtered, page);
  const list = paged.items;
  const count = (f: (id: string) => boolean) => mine.filter((p) => f(p.id)).length;
  const filterSummary = `${care === 'all' ? 'Mọi trạng thái' : CARE_STATUS[care].label} · ${planF === 'all' ? 'Mọi phác đồ' : planF === 'has' ? 'Có phác đồ hoạt động' : 'Chưa có phác đồ hoạt động'}`;

  if (showArchived) {
    const found = archivedList.filter((p) => matchesNameOrCode(p, q));
    return (
      <Screen header={<Header title="Hồ sơ đã lưu trữ" subtitle={`${archivedList.length} hồ sơ`} />}>
        <Button label="Về danh sách đang theo dõi" icon="arrow-back" variant="secondary" onPress={() => setShowArchived(false)} />
        <SearchField label="Tìm hồ sơ đã lưu trữ theo tên hoặc mã" value={q} onChangeText={setQ} placeholder="Tìm theo tên hoặc mã bệnh nhân" />
        <Muted>Hồ sơ đã lưu trữ chỉ xem được, lịch sử lâm sàng giữ nguyên. Mở hồ sơ để khôi phục.</Muted>
        {found.length === 0 && <Empty icon="archive-outline" text={archivedList.length ? 'Không tìm thấy hồ sơ phù hợp.' : 'Chưa có hồ sơ nào được lưu trữ.'} />}
        <ListCard>
          {found.map((p) => <DoctorPatientCard key={p.id} patient={p} />)}
        </ListCard>
      </Screen>
    );
  }

  return (
    <Screen header={<Header home="/doctor" title="Bệnh nhân" subtitle={`${mine.length} hồ sơ đang phụ trách`} right={<HeaderButton icon="add" label="Thêm bệnh nhân" onPress={() => router.push('/patients/new')} />}>
      <SearchField label="Tìm bệnh nhân theo tên hoặc mã" value={q} onChangeText={(v) => { setQ(v); setPage(1); }} placeholder="Tìm theo tên hoặc mã, ví dụ Lan hoặc BN001" />
    </Header>}>
      <Card style={{ paddingVertical: 4 }}>
      <Disclosure title="Bộ lọc" icon="funnel-outline" summary={filterSummary} open={filterOpen} onToggle={setFilterOpen}>
      <View style={{ gap: 10, paddingBottom: 10 }}>
      <Text style={{ color: C.textSoft, fontSize: T.caption, fontWeight: '600' }}>Trạng thái</Text>
      <Choices<CareStatus | 'all'> value={care} onChange={(v) => { setCare(v); setPage(1); }} options={[{ value: 'all', label: 'Tất cả' },
        ...(['not_treated', 'treating', 'revisit', 'ended'] as const).map((v) => ({ value: v, label: `${CARE_STATUS[v].label} (${count((id) => careOf(id) === v)})` }))]} />
      <Text style={{ color: C.textSoft, fontSize: T.caption, fontWeight: '600', marginTop: 4 }}>Phác đồ</Text>
      <Choices<PlanFilter> value={planF} onChange={(v) => { setPlanF(v); setPage(1); }} options={[{ value: 'all', label: 'Tất cả' },
        { value: 'has', label: `Có phác đồ hoạt động (${count(hasActive)})` }, { value: 'none', label: `Chưa có phác đồ hoạt động (${count((id) => !hasActive(id))})` }]} />
      </View>
      </Disclosure>
      </Card>
      {list.length === 0 && <Empty icon="search" text={searching ? 'Không tìm thấy bệnh nhân phù hợp.' : 'Chưa có bệnh nhân nào phù hợp bộ lọc.'} />}
      {list.length > 0 && <SectionTitle>{`Kết quả (${paged.total})`}</SectionTitle>}
      <ListCard>
        {list.map((p) => <DoctorPatientCard key={p.id} patient={p} readOnly={p.doctorId !== me?.id} />)}
      </ListCard>
      {paged.pages > 1 && (
        <View testID="phan-trang" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}><Button label="Trang trước" variant="secondary" icon="chevron-back" disabled={paged.page <= 1} onPress={() => setPage(paged.page - 1)} /></View>
          <Text style={{ color: C.textSoft }}>{`Trang ${paged.page}/${paged.pages}`}</Text>
          <View style={{ flex: 1 }}><Button label="Trang sau" variant="secondary" icon="chevron-forward" disabled={paged.page >= paged.pages} onPress={() => setPage(paged.page + 1)} /></View>
        </View>
      )}
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
