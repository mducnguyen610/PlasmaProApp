import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { Text } from '@/components/Text';
import { Button, Card, Header, HeaderButton, Muted, Screen } from '@/components/ui';
import { useLookups, useStore } from '@/lib/store';
import { C } from '@/theme';
import type { IconName } from '@/components/ui';

type Step = { icon: IconName; tone: string; soft: string; title: string; points: string[]; emergency?: boolean };

// Hướng dẫn lần đầu cho bệnh nhân (đề xuất 3 của bản đánh giá trải nghiệm), 4 màn:
// thiết bị là gì, mỗi ngày làm gì, báo triệu chứng ở đâu, gọi ai khi khẩn cấp.
// Nội dung y khoa trong các màn này là bản nháp cho demo, cần bác sĩ trong nhóm duyệt.
export default function Onboarding() {
  const { review } = useLocalSearchParams<{ review?: string }>();
  const { me, finishOnboarding } = useStore();
  const { patient, account, activePlan } = useLookups();
  const [i, setI] = useState(0);
  if (!me || me.role !== 'patient') return <Redirect href="/" />;
  const p = patient(me.patientId);
  const plan = p ? activePlan(p.id) : undefined;
  const doctor = account(p?.doctorId)?.name;
  const perDay = plan?.status === 'active' ? plan.sessionsPerDay : null;
  const gapH = plan?.status === 'active' && plan.minIntervalMin != null ? Math.round((plan.minIntervalMin / 60) * 10) / 10 : null;

  const steps: Step[] = [
    {
      icon: 'pulse', tone: C.primary, soft: C.primarySoft,
      title: 'Thiết bị Plasma Pro là gì',
      points: [
        'Thiết bị cầm tay phát plasma lạnh, dùng hỗ trợ điều trị vết thương theo liệu trình bác sĩ đặt.',
        'Sau mỗi lần dùng, thiết bị tự gửi số lần điều trị qua Wi-Fi về ứng dụng để bác sĩ theo dõi.',
        'Ứng dụng không tự chẩn đoán. Đánh giá vết thương do bác sĩ nhập.',
      ],
    },
    {
      icon: 'calendar', tone: C.green, soft: C.greenSoft,
      title: 'Mỗi ngày cần làm gì',
      points: [
        perDay != null
          ? `Điều trị đủ ${perDay} lần mỗi ngày${gapH != null ? `, hai lần cách nhau ít nhất ${String(gapH).replace('.', ',')} giờ` : ''}, theo liệu trình hiện tại.`
          : 'Điều trị đúng số lần bác sĩ dặn. Liệu trình của bạn chưa được bác sĩ xác nhận trong ứng dụng.',
        'Xem dòng "Hôm nay: còn ... lần" ở đầu Trang chủ để biết còn phải làm mấy lần.',
        'Để thiết bị ở nơi có Wi-Fi để số lần được cập nhật. Thiết bị tự ngắt nếu dùng quá số lần cho phép.',
      ],
    },
    {
      icon: 'medkit', tone: C.amber, soft: C.amberSoft,
      title: 'Báo triệu chứng ở đâu',
      points: [
        'Trên Trang chủ, chạm nút "Báo triệu chứng hoặc sự cố" để báo đau, rát, chảy dịch hoặc sốt.',
        'Thiết bị không bật được hoặc mất Wi-Fi: vào tab Thiết bị, chạm "Báo sự cố thiết bị".',
        `Báo cáo được gửi cho ${doctor ?? 'bác sĩ phụ trách'}. Bác sĩ chỉ xem được khi mở ứng dụng, nên không có thời gian trả lời cố định.`,
      ],
    },
    {
      icon: 'call', tone: C.red, soft: C.redSoft,
      title: 'Khi khẩn cấp',
      points: [
        'Nếu đau tăng nhiều, sốt, chảy máu hoặc mủ nhiều, hãy gọi 115 hoặc đến cơ sở y tế gần nhất.',
        'Không chờ phản hồi trong ứng dụng. Ứng dụng không thay thế cấp cứu và không được theo dõi liên tục.',
      ],
      emergency: true,
    },
  ];
  const step = steps[i];
  const last = i === steps.length - 1;
  const done = () => {
    finishOnboarding();
    if (review && router.canGoBack()) router.back();
    else router.replace('/patient');
  };

  return (
    <Screen
      header={
        <Header
          title="Hướng dẫn sử dụng"
          subtitle={`Bước ${i + 1}/${steps.length}`}
          right={!last ? <HeaderButton icon="play-skip-forward-outline" label="Bỏ qua" onPress={done} /> : undefined}
        />
      }>
      <View accessibilityRole="progressbar" accessibilityLabel={`Bước ${i + 1} trên ${steps.length}`} style={{ flexDirection: 'row', gap: 6 }}>
        {steps.map((_, k) => (
          <View key={k} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: k <= i ? C.primary : C.border }} />
        ))}
      </View>
      <Card hero style={{ padding: 24, gap: 16 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: step.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={step.icon} size={36} color={step.tone} />
        </View>
        <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '700', color: C.text }}>{step.title}</Text>
        {step.points.map((t) => (
          <View key={t} style={{ flexDirection: 'row', gap: 10 }}>
            <Ionicons name="checkmark-circle-outline" size={20} color={step.tone} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 17, lineHeight: 25, color: C.textBody }}>{t}</Text>
          </View>
        ))}
        {step.emergency && Platform.OS !== 'web' && (
          <Button label="Gọi 115" icon="call" variant="danger" onPress={() => Linking.openURL('tel:115').catch(() => {})} />
        )}
        {step.emergency && doctor ? <Muted>Bác sĩ phụ trách: {doctor}</Muted> : null}
      </Card>
      <Button label={last ? 'Bắt đầu sử dụng' : 'Tiếp'} icon={last ? 'checkmark' : 'arrow-forward'} onPress={last ? done : () => setI(i + 1)} />
      {i > 0 && <Button label="Quay lại" variant="ghost" onPress={() => setI(i - 1)} />}
      <Muted>Có thể xem lại hướng dẫn này trong Tài khoản.</Muted>
    </Screen>
  );
}
