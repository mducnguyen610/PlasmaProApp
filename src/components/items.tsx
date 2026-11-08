import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { patientSeverity, SEVERITY } from '@/lib/access';
import { Card, Chip, IconBadge, WoundPhoto, type IconName } from '@/components/ui';
import { fmtDate, LABEL_STATUS } from '@/lib/format';
import { formatAreaDisplay } from '@/lib/naming';
import { useLookups, useStore } from '@/lib/store';
import type { Patient, WoundImage } from '@/lib/types';
import { bar, C, radius } from '@/theme';

/** Một lịch hẹn: vạch màu, ngày (đỏ nếu hôm nay), tiêu đề đậm, mô tả. Dùng chung cho Trang chủ và Lịch trình. */
/** Ô ngày làm điểm neo: số ngày lớn, tháng nhỏ; nền đỏ nhạt nếu là hôm nay. */
export function DateTile({ date, today }: { date: string; today: string }) {
  const isToday = date === today;
  const [, m, d] = date.split('-');
  return (
    <View accessible accessibilityLabel={isToday ? 'Hôm nay' : `Ngày ${Number(d)} tháng ${Number(m)}`} style={{ width: 60, paddingVertical: 6, borderRadius: radius.m, alignItems: 'center', backgroundColor: isToday ? C.redSoft : C.primarySoft }}>
      <Text style={{ fontSize: 24, lineHeight: 28, fontWeight: '700', color: isToday ? C.red : C.primary }}>{Number(d)}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: isToday ? C.red : C.primary }}>{isToday ? 'Hôm nay' : `Th${Number(m)}`}</Text>
    </View>
  );
}

export function AppointmentRow({ date, title, body, today }: { date: string; title: string; body?: string; today: string }) {
  const isToday = date === today;
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 4, backgroundColor: isToday ? bar.red : bar.blue }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: isToday ? C.red : C.primary, fontWeight: '700' }}>{isToday ? 'Hôm nay' : fmtDate(date)}</Text>
        <Text style={{ color: C.text, fontWeight: '600' }}>{title}</Text>
        {body ? <Text style={{ color: C.textSoft, fontSize: 14, lineHeight: 21 }}>{body}</Text> : null}
      </View>
    </View>
  );
}

export function PatientCard({ patient }: { patient: Patient }) {
  const { device, woundsOf } = useLookups();
  const { data } = useStore();
  const dev = device(patient.deviceId);
  const wounds = woundsOf(patient.id);
  const unlabeled = data.images.filter((i) => i.patientId === patient.id && i.status === 'unlabeled').length;
  const severity = patientSeverity(data, patient.id);
  const active = wounds.some((w) => w.status === 'active');
  return (
    <Card onPress={() => router.push({ pathname: '/patients/[id]', params: { id: patient.id } })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconBadge icon="person-outline" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{patient.name}</Text>
          <Text style={{ color: C.textSoft, fontSize: 13 }}>Mã hồ sơ: {patient.code} · {patient.sex}, {patient.birthYear}</Text>
        </View>
        <Chip label={active ? 'Đang theo dõi' : 'Tạm dừng'} tone={active ? 'green' : 'amber'} />
      </View>
      {severity && <Chip label={'Mức độ cao nhất: ' + SEVERITY[severity].label} tone={SEVERITY[severity].tone} />}
      <View style={{ flexDirection: 'row', backgroundColor: C.surfaceMuted, borderRadius: 12, padding: 10, justifyContent: 'space-between' }}>
        <Text style={{ color: C.textSoft, fontSize: 13 }}>
          Thiết bị: <Text style={{ color: C.text, fontWeight: '700' }}>{dev?.code ?? 'Chưa gán'}</Text>
        </Text>
        <Text style={{ color: C.textSoft, fontSize: 13 }}>
          {wounds.length} vết thương{unlabeled ? ` · ` : ''}
          {unlabeled ? <Text style={{ color: C.amber, fontWeight: '700' }}>{unlabeled} ảnh chưa đo</Text> : null}
        </Text>
      </View>
    </Card>
  );
}

export function ImageTile({ image, width = 150 }: { image: WoundImage; width?: number }) {
  const st = LABEL_STATUS[image.status];
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
      <Text style={{ fontSize: 13, color: C.text, fontWeight: '600', marginTop: 6 }}>{image.id} · {image.capture?.sourceDateKnown === false ? 'Ngày chụp chưa rõ' : fmtDate(image.captureDate)}</Text>
      <Text style={{ fontSize: 13, color: C.textFaint }} numberOfLines={1}>{image.filename}</Text>
    </Pressable>
  );
}

export function TaskRow({ icon, tone, title, detail, onPress }: { icon: IconName; tone: 'amber' | 'red' | 'blue' | 'violet'; title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${detail}`} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: 48, opacity: pressed ? 0.7 : 1 })}>
      <IconBadge icon={icon} tone={tone} size={36} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600', color: C.text }}>{title}</Text>
        <Text style={{ color: C.textSoft, fontSize: 13 }} numberOfLines={2}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
    </Pressable>
  );
}
