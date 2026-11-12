import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { patientSeverity, SEVERITY } from '@/lib/access';
import { latestAreaIncrease } from '@/lib/areaChange';
import { Chip, IconBadge, StatusChip, WoundPhoto, type IconName } from '@/components/ui';
import { fmtDate, fmtDateTime, LABEL_STATUS } from '@/lib/format';
import { formatAreaDisplay } from '@/lib/naming';
import { useLookups, useStore } from '@/lib/store';
import type { Patient, WoundImage } from '@/lib/types';
import { bar, C, radius, T, space } from '@/theme';
import { SEVERITY_ROLE, SOURCE } from '@/theme.status';
import { TODAY_LABEL, type Attention, type TodayState } from '@/lib/attention';

/** Một lịch hẹn: vạch màu, ngày (đỏ nếu hôm nay), tiêu đề đậm, mô tả. Dùng chung cho Trang chủ và Lịch trình. */
/** Ô ngày làm điểm neo: số ngày lớn, tháng nhỏ; nền đỏ nhạt nếu là hôm nay. */
export function DateTile({ date, today }: { date: string; today: string }) {
  const isToday = date === today;
  const [, m, d] = date.split('-');
  return (
    <View accessible accessibilityLabel={isToday ? 'Hôm nay' : `Ngày ${Number(d)} tháng ${Number(m)}`} style={{ width: 60, paddingVertical: 6, borderRadius: radius.m, alignItems: 'center', backgroundColor: isToday ? C.redSoft : C.primarySoft }}>
      <Text style={{ fontSize: T.stat, lineHeight: 28, fontWeight: '700', color: isToday ? C.red : C.primary }}>{Number(d)}</Text>
      <Text style={{ fontSize: T.caption, fontWeight: '600', color: isToday ? C.red : C.primary }}>{isToday ? 'Hôm nay' : `Th${Number(m)}`}</Text>
    </View>
  );
}

export function AppointmentRow({ date, title, body, today }: { date: string; title: string; body?: string; today: string }) {
  const isToday = date === today;
  return (
    <View style={{ flexDirection: 'row', gap: space.m, alignItems: 'center' }}>
      <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 4, backgroundColor: isToday ? bar.red : bar.blue }} />
      <View style={{ flex: 1, gap: space.xxs }}>
        <Text style={{ color: isToday ? C.red : C.primary, fontWeight: '700' }}>{isToday ? 'Hôm nay' : fmtDate(date)}</Text>
        <Text style={{ color: C.text, fontWeight: '600' }}>{title}</Text>
        {body ? <Text style={{ color: C.textSoft, fontSize: T.small, lineHeight: 21 }}>{body}</Text> : null}
      </View>
    </View>
  );
}

// Theo DESIGN_SYSTEM.md mục 6.2: đã chiếu success, bỏ lỡ warning, đến hạn hôm nay info, còn lại neutral.
const TODAY_TONE: Record<TodayState, 'green' | 'amber' | 'gray' | 'teal'> = { treated: 'green', missed: 'amber', due: 'teal', no_data: 'gray', rest: 'gray', no_plan: 'gray' };

export function PatientCard({ patient, attention }: { patient: Patient; attention?: Attention }) {
  const { device, woundsOf } = useLookups();
  const { data } = useStore();
  const dev = device(patient.deviceId);
  const wounds = woundsOf(patient.id);
  const unlabeled = data.images.filter((i) => i.patientId === patient.id && i.status === 'unlabeled').length;
  const severity = patientSeverity(data, patient.id);
  const active = wounds.some((w) => w.status === 'active');
  // PP-06: vết thương đang điều trị có số đo bác sĩ nhập lần sau lớn hơn lần trước. Chỉ nêu hai con số, không kết luận lâm sàng.
  const increases = wounds.filter((w) => w.status === 'active')
    .map((w) => ({ w, inc: latestAreaIncrease(data.images.filter((i) => i.woundId === w.id)) }))
    .filter((x): x is { w: typeof x.w; inc: NonNullable<typeof x.inc> } => !!x.inc);
  const incText = increases.map(({ w, inc }) => `${w.code}: số đo ${fmtDate(inc.latestDate).slice(0, 5)} lớn hơn lần trước (${formatAreaDisplay(inc.previous)} → ${formatAreaDisplay(inc.latest)})`);
  // PP-10: ngày đánh giá gần nhất của bác sĩ trên mọi vết thương của bệnh nhân (dữ liệu đánh giá, khác số đo).
  const woundIds = new Set(wounds.map((w) => w.id));
  const lastEval = data.evaluations.filter((e) => woundIds.has(e.woundId)).map((e) => e.date).sort().pop();
  // Một dòng trong ListCard (không còn thẻ riêng cho mỗi bệnh nhân). Bản rút gọn (08/11/2026): một dòng tên, một dòng mã; mức độ là điểm neo bên phải; chỉ hiện việc cần làm khi có.
  return (
    <Pressable onPress={() => router.push({ pathname: '/patients/[id]', params: { id: patient.id } })} accessibilityRole="button" style={({ pressed }) => ({ paddingVertical: 12, gap: space.s, opacity: pressed ? 0.7 : 1 })} accessibilityLabel={`${patient.name}, ${patient.code}${severity ? `, mức độ ${SEVERITY[severity].label}` : ''}${unlabeled ? `, ${unlabeled} ảnh chưa đo` : ''}${incText.length ? `, ${incText.join('; ')}` : ''}${lastEval ? `, đánh giá lần cuối ${fmtDate(lastEval)}` : ''}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        <IconBadge icon="person-outline" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: T.body, fontWeight: '700', color: C.text }}>{patient.name}</Text>
          <Text style={{ color: C.textSoft, fontSize: T.caption }}>{patient.code} · {dev?.code ?? 'chưa gán thiết bị'}</Text>
        </View>
        {severity ? <StatusChip status={SEVERITY_ROLE[severity]} label={SEVERITY[severity].label} /> : null}
        <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
      </View>
      {attention && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingLeft: 52 }}>
          <Chip label={TODAY_LABEL[attention.state]} tone={TODAY_TONE[attention.state]} />
          {/* FR10: "chưa có dữ liệu" luôn kèm lần đồng bộ cuối, để bác sĩ phân biệt máy chưa gửi với người bệnh không chiếu. */}
          {attention.state === 'no_data' && <Text style={{ color: C.textSoft, fontSize: T.caption }}>{dev?.lastSync ? `đồng bộ lần cuối ${fmtDateTime(dev.lastSync)}` : 'chưa từng đồng bộ'}</Text>}
          {attention.reasons[0] ? <Text style={{ color: C.textSoft, fontSize: T.caption, flexShrink: 1 }}>{attention.reasons[0]}</Text> : null}
        </View>
      )}
      {/* Việc phụ thành một dòng chữ thay vì thêm chip (V08): mỗi dòng tối đa hai chip, mức độ và trạng thái hôm nay. */}
      {(unlabeled > 0 || !active) && (
        <Text style={{ color: C.textSoft, fontSize: T.caption, paddingLeft: 52 }}>
          {[unlabeled > 0 ? `${unlabeled} ảnh chưa đo` : null, !active ? 'không có vết thương đang điều trị' : null].filter(Boolean).join(', ').replace(/^./, (c) => c.toUpperCase())}
        </Text>
      )}
      {incText.map((t) => (
        <View key={t} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingLeft: 52 }}>
          <Ionicons name="trending-up" size={16} color={C.amber} />
          <Text style={{ color: C.amber, fontSize: T.caption, fontWeight: '600', flexShrink: 1 }}>{t}</Text>
        </View>
      ))}
      {lastEval ? <Text style={{ color: C.textSoft, fontSize: T.caption, paddingLeft: 52 }}>Đánh giá lần cuối: {fmtDate(lastEval)}</Text> : null}
    </Pressable>
  );
}

/** showOwner: thêm dòng mã bệnh nhân, mã vết thương (B12 gom ảnh của nhiều bệnh nhân). Tên tệp chỉ xem ở B11 (A17). */
export function ImageTile({ image, width = 150, showOwner }: { image: WoundImage; width?: number; showOwner?: boolean }) {
  const st = LABEL_STATUS[image.status];
  const { patient, wound } = useLookups();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/images/[id]', params: { id: image.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Ảnh ${image.id}, ${image.areaCm2 !== null ? formatAreaDisplay(image.areaCm2) : 'chưa đo diện tích'}${image.retakeRequested ? ', cần chụp lại' : ''}`}
      style={{ width }}>
      <WoundPhoto image={image} style={{ width, height: width * 0.75, borderRadius: radius.m }} />
      <View style={{ position: 'absolute', top: 6, left: 6 }}>
        <Chip label={image.areaCm2 !== null ? formatAreaDisplay(image.areaCm2) : 'Chưa đo'} tone={st.tone} />
      </View>
      {image.retakeRequested && (
        <View style={{ position: 'absolute', top: 6, right: 6 }}>
          <Chip label="Chụp lại" tone="red" icon="refresh" />
        </View>
      )}
      <Text style={{ fontSize: T.caption, color: C.text, fontWeight: '600', marginTop: 6 }}>{image.id} · {image.capture?.sourceDateKnown === false ? 'Ngày chụp chưa rõ' : fmtDate(image.captureDate)}</Text>
      {showOwner ? <Text style={{ fontSize: T.caption, color: C.textSoft }} numberOfLines={1}>{patient(image.patientId)?.code ?? '—'} · {wound(image.woundId)?.code ?? '—'}</Text> : null}
      {/* PP-01: ảnh có diện tích thì ghi nguồn số đo ngay dưới ảnh. */}
      {image.areaCm2 !== null ? <View style={{ flexDirection: 'row', marginTop: 4 }}><StatusChip status={SOURCE.doctor} label={SOURCE.doctor.label} /></View> : null}
    </Pressable>
  );
}

export function TaskRow({ icon, tone, title, detail, onPress }: { icon: IconName; tone: 'amber' | 'red' | 'blue' | 'violet'; title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${detail}`} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: 8, minHeight: 48, opacity: pressed ? 0.7 : 1 })}>
      <IconBadge icon={icon} tone={tone} size={36} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600', color: C.text }}>{title}</Text>
        <Text style={{ color: C.textSoft, fontSize: T.caption }} numberOfLines={2}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
    </Pressable>
  );
}
