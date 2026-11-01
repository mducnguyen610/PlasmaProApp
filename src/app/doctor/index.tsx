import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { DateBadge } from '@/components/DateBadge';
import { ImageTile, PatientCard } from '@/components/items';
import { Text } from '@/components/Text';
import { Card, GradientCard, Header, Ring, Screen, SectionTitle, SimBadge, Stat, TONE_BAR } from '@/components/ui';
import { useLookups, useStore } from '@/lib/store';
import { bar, C } from '@/theme';

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ fontSize: 14, fontWeight: '500', color: C.text }}>{label}</Text>
      <View style={{ height: 4, width: 70, borderRadius: 4, backgroundColor: `${color}33` }}>
        <View style={{ height: 4, width: max ? (70 * Math.min(value, max)) / max : 0, borderRadius: 4, backgroundColor: color }} />
      </View>
      <Text style={{ fontSize: 12, color: C.textSoft }}>{value} mục</Text>
    </View>
  );
}

// BS01 – Trang chủ bác sĩ, bố cục theo "My Diary" của Best Flutter UI Templates.
export default function DoctorHome() {
  const { data, me } = useStore();
  const { patient, device } = useLookups();
  const mine = data.patients.filter((p) => p.doctorId === me?.id);
  const ids = new Set(mine.map((p) => p.id));
  const myImages = data.images.filter((i) => ids.has(i.patientId));
  const unlabeled = myImages.filter((i) => i.status === 'unlabeled');
  const labeled = myImages.filter((i) => i.status === 'labeled');
  const retakes = myImages.filter((i) => i.retakeRequested);
  const reports = data.reports.filter((r) => ids.has(r.patientId) && !r.handled);
  const drafts = data.plans.filter((p) => ids.has(p.patientId) && p.status === 'draft');
  const offline = mine.map((p) => device(p.deviceId)).filter((d) => d && !d.online);
  const usable = myImages.filter((i) => i.status !== 'excluded').length;
  const pct = usable ? Math.round((labeled.length / usable) * 100) : 0;
  const recent = [...myImages].sort((a, b) => b.uploadDate.localeCompare(a.uploadDate) || b.id.localeCompare(a.id)).slice(0, 6);

  return (
    <Screen header={<Header title="Trang chủ" subtitle={`Xin chào, ${me?.name ?? ''}`} right={<DateBadge />} />}>
      <SimBadge />
      <SectionTitle action="Chi tiết" onAction={() => router.navigate('/doctor/dataset')}>Tổng quan</SectionTitle>
      <Card hero style={{ padding: 0, gap: 0 }}>
        <View style={{ flexDirection: 'row', padding: 20, paddingBottom: 12, gap: 12, alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 14 }}>
            <Stat label="Bệnh nhân theo dõi" value={mine.length} unit="người" tone="blue" />
            <Stat label="Ảnh đã có diện tích" value={labeled.length} unit="ảnh" tone="red" />
          </View>
          <Ring value={labeled.length} max={usable} label={`${pct}%`} sub="đã gán nhãn" />
        </View>
        <View style={{ height: 2, backgroundColor: C.bg, marginHorizontal: 20, borderRadius: 4 }} />
        <View style={{ flexDirection: 'row', padding: 20, paddingTop: 12, gap: 8 }}>
          <MiniBar label="Chờ nhãn" value={unlabeled.length} max={usable} color={TONE_BAR.blue} />
          <MiniBar label="Báo cáo" value={reports.length} max={Math.max(3, reports.length)} color={bar.red} />
          <MiniBar label="Chụp lại" value={retakes.length} max={Math.max(3, retakes.length)} color={bar.amber} />
        </View>
      </Card>

      <SectionTitle action="Xử lý" onAction={() => router.navigate('/doctor/dataset')}>Việc cần làm</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 14, paddingHorizontal: 20, paddingBottom: 16 }}>
        <GradientCard
          colors="coral"
          icon="pricetag"
          title="Ghi diện tích"
          lines={unlabeled.slice(0, 3).map((i) => `${patient(i.patientId)?.code} · ${i.id}`)}
          value={unlabeled.length}
          unit="ảnh"
          onPress={() => (unlabeled[0] ? router.push({ pathname: '/images/[id]', params: { id: unlabeled[0].id } }) : router.navigate('/doctor/dataset'))}
        />
        <GradientCard
          colors="pink"
          icon="medkit"
          title="Triệu chứng, sự cố"
          lines={reports.slice(0, 3).map((r) => `${patient(r.patientId)?.code}: ${r.content}`)}
          value={reports.length}
          unit="báo cáo"
          onPress={() => reports[0] && router.push({ pathname: '/patients/[id]', params: { id: reports[0].patientId } })}
        />
        <GradientCard
          colors="indigo"
          icon="flash"
          title="Liệu trình nháp"
          lines={drafts.slice(0, 3).map((p) => `${patient(p.patientId)?.code} · v${p.version}`)}
          value={drafts.length}
          unit="chờ xác nhận"
          onPress={() => drafts[0] && router.push({ pathname: '/plan/[patientId]', params: { patientId: drafts[0].patientId } })}
        />
        <GradientCard
          colors="night"
          icon="hardware-chip"
          title="Thiết bị offline"
          lines={offline.slice(0, 3).map((d) => `${d!.code} chưa đồng bộ`)}
          value={offline.length}
          unit="thiết bị"
          onPress={() => offline[0] && router.push({ pathname: '/devices/[id]', params: { id: offline[0]!.id } })}
        />
      </ScrollView>

      <SectionTitle action="Dữ liệu" onAction={() => router.navigate('/doctor/dataset')}>Ảnh mới</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: 6 }}>
        {recent.map((im) => (
          <ImageTile key={im.id} image={im} />
        ))}
      </ScrollView>

      <SectionTitle action="Danh sách" onAction={() => router.navigate('/doctor/patients')}>Bệnh nhân</SectionTitle>
      {mine.map((p) => (
        <PatientCard key={p.id} patient={p} />
      ))}
    </Screen>
  );
}
