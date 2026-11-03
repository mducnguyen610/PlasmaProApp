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
import { C } from '@/theme';

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
          {unlabeled ? <Text style={{ color: C.amber, fontWeight: '700' }}>{unlabeled} ảnh chờ nhãn</Text> : null}
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
      accessibilityLabel={`Ảnh ${image.id}, ${image.areaCm2 !== null ? formatAreaDisplay(image.areaCm2) : 'chờ nhãn'}${image.retakeRequested ? ', cần chụp lại' : ''}`}
      style={{ width }}>
      <WoundPhoto image={image} style={{ width, height: width * 0.75, borderRadius: 8, borderTopRightRadius: 32 }} />
      <View style={{ position: 'absolute', top: 6, left: 6 }}>
        <Chip label={image.areaCm2 !== null ? formatAreaDisplay(image.areaCm2) : 'Chờ nhãn'} tone={st.tone} />
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
