import { router } from 'expo-router';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { NoAccess } from '@/components/Guard';
import { Text } from '@/components/Text';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Image } from 'expo-image';

import { Button, Card, Chip, Choices, Header, ListCard, Muted, PatientAvatar, Screen, SearchField, SectionTitle, Segmented, WoundPhoto } from '@/components/ui';
import { confirm } from '@/lib/dialog';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { activeFilterCount } from '@/lib/pendingCapture';
import { useLookups, useStore } from '@/lib/store';
import { C, T } from '@/theme';

// Nút giữa thanh tab của bác sĩ: chọn bệnh nhân, vết thương rồi chụp/tải ảnh, sau đó mở ngay màn đổi tên (BS05).
export default function Capture() {
  const { data, me, pendingCapture: held, discardPendingCapture } = useStore();
  // Hai lối vào tách bạch: chụp cho hồ sơ có sẵn (luồng cũ, mặc định, giữ nguyên) và chụp cho bệnh nhân mới (tạo hồ sơ sau khi chụp).
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  // Bộ lọc thu gọn được: chỉ ẩn hoặc hiện ô lọc, không đổi giá trị lọc hay kết quả. Mặc định mở (ô tìm kiếm là cách chọn chính
  // khi có nhiều hồ sơ); trạng thái giữ trong phiên màn này, không ghi bộ nhớ máy.
  const [filterOpen, setFilterOpen] = useState(true);
  const { woundsOf, imagesOf } = useLookups();
  const patients = data.patients.filter((p) => p.doctorId === me?.id && !p.archivedAt);
  // Không chọn sẵn bệnh nhân khi có từ 2 hồ sơ trở lên, để tránh chụp nhầm vào hồ sơ đứng đầu danh sách.
  const [pid, setPid] = useState(patients.length === 1 ? patients[0].id : '');
  const wounds = pid ? woundsOf(pid).filter((w) => w.status !== 'closed') : [];
  const [wid, setWid] = useState('');
  // P0 ID-03: như với bệnh nhân, chỉ chọn sẵn khi có đúng một vết đang theo dõi; từ 2 vết thì bác sĩ phải chọn.
  const woundId = wounds.some((w) => w.id === wid) ? wid : wounds.length === 1 ? wounds[0].id : '';
  const last = woundId ? imagesOf(woundId).at(-1) : undefined;
  // UX-23 (Đợt 12): tìm theo tên hoặc mã như B02, danh sách một cột thay cho hàng chip.
  const [q, setQ] = useState('');
  const norm = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const found = patients.filter((x) => !q || norm(`${x.name} ${x.code}`).includes(norm(q)));

  if (me?.role !== 'doctor') return <NoAccess />;

  const go = () => router.push({ pathname: '/guided-capture', params: { woundId } });
  const goNew = () => router.push({ pathname: '/guided-capture', params: { moi: '1' } });
  const nFilters = activeFilterCount({ q });
  const dropHeld = () => confirm('Bỏ ảnh chờ tạo hồ sơ?', 'Ảnh này chưa thuộc hồ sơ nào và sẽ bị xóa. Chưa có hồ sơ nào được tạo.', () => { void discardPendingCapture().catch(() => {}); }, 'Bỏ ảnh', 'Ở lại');
  // Ảnh chờ (nếu có): luôn hiện ở đầu màn, ở cả hai lối vào, để không bị quên hay bị bỏ mà không biết.
  const heldCard = held ? (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 80, height: 60, borderRadius: 8, overflow: 'hidden', backgroundColor: C.text }}>
          <Image source={{ uri: held.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel="Ảnh chờ tạo hồ sơ" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row' }}><Chip label="Ảnh chờ tạo hồ sơ" tone="amber" icon="time-outline" /></View>
          <Text style={{ color: C.textSoft, fontSize: T.small }}>{held.capture.capturedAt ? `Chụp ${fmtDateTime(held.capture.capturedAt)}` : `Ảnh thư viện · ${fmtDate(held.captureDate)}`}{held.form.name.trim() ? ` · ${held.form.name.trim()}` : ''}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Bỏ ảnh" variant="secondary" onPress={dropHeld} style={{ flexShrink: 0 }} />
        <Button label="Tiếp tục tạo hồ sơ" icon="person-add-outline" onPress={() => router.push('/capture-new-patient')} style={{ flex: 1 }} />
      </View>
    </Card>
  ) : null;
  const modeSwitch = (
    <Segmented<'existing' | 'new'> value={mode} onChange={setMode} options={[{ value: 'existing', label: 'Chọn bệnh nhân hiện có' }, { value: 'new', label: 'Chụp cho bệnh nhân mới' }]} />
  );

  if (mode === 'new') {
    return (
      <Screen header={<Header back title="Chụp ảnh vết thương" subtitle="Chụp trước, tạo hồ sơ sau" />}
        footer={<Button label="Chụp cho bệnh nhân mới" icon="camera" disabled={!!held} onPress={goNew} reason="Đang có ảnh chờ tạo hồ sơ. Tiếp tục hoặc bỏ ảnh đó trước." />}>
        {modeSwitch}
        {heldCard}
        <SectionTitle>Các bước</SectionTitle>
        <Card style={{ gap: 8 }}>
          <Text style={{ color: C.text }}>1. Chụp, kiểm tra ảnh và nhập số đo như khi chụp cho hồ sơ có sẵn.</Text>
          <Text style={{ color: C.text }}>2. Nhập thông tin bệnh nhân và vị trí vết thương; ảnh vừa chụp hiện ở đầu biểu mẫu.</Text>
          <Text style={{ color: C.text }}>3. Lưu: hồ sơ, vết thương VT01 và ảnh được tạo cùng lúc, rồi mở vết thương.</Text>
        </Card>
        <Muted>Ảnh chưa thuộc hồ sơ nào cho tới khi lưu hồ sơ. Nếu thoát giữa chừng, ảnh chờ hiện lại ở màn này.</Muted>
      </Screen>
    );
  }

  const chosen = patients.find((x) => x.id === pid);
  const chosenWound = wounds.find((w) => w.id === woundId);
  // Stage 9A (bố cục riêng B09): ba bước đánh số theo đúng thứ tự thao tác (bệnh nhân, vết thương, chụp); lựa chọn đã chọn hiện ở
  // cuối dòng tiêu đề mỗi bước; nút "Chụp có hướng dẫn" ở chân màn nên luôn thấy cùng lý do khi còn khóa. Câu giải thích bước chụp
  // (camera hoặc thư viện) chuyển vào trang Hướng dẫn. Quy tắc không chọn sẵn khi có từ 2 hồ sơ hoặc 2 vết giữ nguyên.
  const picked = (t?: string) => (t ? <Text style={{ color: C.primary, fontWeight: '700', fontSize: T.small }}>{t}</Text> : null);
  return (
    <Screen header={<Header back title="Chụp ảnh vết thương" subtitle="Ảnh vào đúng hồ sơ, rồi ghi diện tích" />}
      footer={<Button label="Chụp có hướng dẫn" icon="camera" disabled={!woundId} onPress={go} reason={pid ? 'Chọn vết thương trước.' : 'Chọn bệnh nhân và vết thương trước.'} />}>
      {modeSwitch}
      {heldCard}
      <SectionTitle right={picked(chosen?.code)}>1. Bệnh nhân</SectionTitle>
      {patients.length > 1 && (
        <Animated.View layout={LinearTransition.duration(180)} style={{ gap: 8 }}>
          <Pressable onPress={() => setFilterOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: filterOpen }} aria-expanded={filterOpen}
            accessibilityLabel={`${filterOpen ? 'Đóng bộ lọc' : 'Mở bộ lọc'}${nFilters ? `, ${nFilters} bộ lọc đang dùng` : ''}`}
            style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name={filterOpen ? 'chevron-up' : 'options-outline'} size={20} color={C.primary} />
            <Text style={{ color: C.primary, fontWeight: '600' }}>{filterOpen ? 'Đóng bộ lọc' : 'Mở bộ lọc'}</Text>
            {nFilters ? <Chip label={`${nFilters} đang dùng`} tone="blue" /> : null}
            <View style={{ flex: 1 }} />
            {!filterOpen && nFilters ? <Text style={{ color: C.textSoft, fontSize: T.small }} numberOfLines={1}>{`${found.length}/${patients.length} hồ sơ`}</Text> : null}
          </Pressable>
          {filterOpen
            ? <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)}><SearchField label="Tìm bệnh nhân" value={q} onChangeText={setQ} placeholder="Tìm theo tên hoặc mã bệnh nhân…" /></Animated.View>
            : nFilters ? <Text style={{ color: C.textSoft, fontSize: T.small }} numberOfLines={2}>{`Đang lọc: tên hoặc mã có "${q.trim()}"`}</Text> : null}
        </Animated.View>
      )}
      {patients.length > 0 && found.length === 0 && <Muted>Không tìm thấy bệnh nhân phù hợp.</Muted>}
      <View accessibilityRole="radiogroup">
        <ListCard>
          {found.map((x) => {
            const on = x.id === pid;
            return (
              <Pressable key={x.id} accessibilityRole="radio" accessibilityState={{ checked: on, selected: on }} accessibilityLabel={`${x.code} · ${x.name}`}
                onPress={() => { setPid(x.id); setWid(''); }}
                style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? C.primary : C.textSoft} />
                <PatientAvatar name={x.name} size={32} muted={!on} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: '700', color: C.text }}>{x.name}</Text>
                  <Text style={{ color: C.textSoft, fontSize: T.small }}>{x.code}</Text>
                </View>
              </Pressable>
            );
          })}
        </ListCard>
      </View>
      {patients.length === 0 && <Muted>Chưa có bệnh nhân được phân công. Thêm bệnh nhân ở tab Bệnh nhân.</Muted>}
      <SectionTitle right={picked(chosenWound?.code)}>2. Vết thương</SectionTitle>
      {!pid ? (
        <Muted>Chọn bệnh nhân trước.</Muted>
      ) : wounds.length ? (
        <Choices value={woundId} onChange={setWid} options={wounds.map((w) => ({ value: w.id, label: `${w.code} · ${w.location}` }))} />
      ) : (
        <Muted>Bệnh nhân chưa có vết thương đang theo dõi; thêm trong hồ sơ bệnh nhân.</Muted>
      )}
      {woundId ? <SectionTitle>3. Chụp</SectionTitle> : null}
      {last && (
        <Card hero>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <WoundPhoto image={last} style={{ width: 96, height: 72, borderRadius: 8 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: C.textSoft, fontWeight: '500' }}>Ảnh gần nhất</Text>
              <Text style={{ color: C.text, fontWeight: '700', fontSize: T.body }}>{last.id}</Text>
              <Text style={{ color: C.textSoft, fontSize: T.caption }}>{last.capture?.sourceDateKnown === false ? 'Thêm' : 'Chụp'} {fmtDate(last.captureDate)} · giữ góc và khoảng cách tương tự</Text>
            </View>
          </View>
        </Card>
      )}
      {woundId && !last ? <Muted>Vết thương này chưa có ảnh; đây sẽ là ảnh đầu tiên.</Muted> : null}
    </Screen>
  );
}
