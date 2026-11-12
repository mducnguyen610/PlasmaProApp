import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { Text } from '@/components/Text';
import { Button, Card, Header, HeaderButton, Muted, Screen } from '@/components/ui';
import { phaseLabel, phasesOf } from '@/lib/course';
import { useLookups, useStore } from '@/lib/store';
import { C } from '@/theme';
import type { IconName } from '@/components/ui';

type Step = { icon: IconName; tone: string; soft: string; title: string; points: string[]; emergency?: boolean };

// Hướng dẫn lần đầu cho bệnh nhân (đề xuất 3 của bản đánh giá trải nghiệm), 5 màn (thêm màn nạp liệu trình bằng USB, V19):
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
  const active = plan?.status === 'active' && plan.confirmed ? plan : undefined;
  const phases = active ? phasesOf(active) : [];

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
      title: 'Đợt điều trị gồm những gì',
      points: [
        active
          ? `Đợt điều trị theo lịch bác sĩ đặt: ${phases.map((ph) => phaseLabel(ph).toLowerCase()).join(', sau đó ')}. Có những ngày nghỉ theo lịch, không phải ngày nào cũng chiếu.`
          : 'Điều trị theo lịch bác sĩ dặn. Đợt điều trị của bạn chưa được bác sĩ xác nhận trong ứng dụng.',
        'Đầu Trang chủ cho biết hôm nay có buổi chiếu hay nghỉ, và buổi tiếp theo vào ngày nào.',
        'Thiết bị đã khóa mức năng lượng và thời gian theo y lệnh. Thiết bị không phát vào ngày nghỉ hoặc khi đã đủ số lần.',
        'Đợt kết thúc khi bác sĩ xác nhận vết thương đã liền, sau đó bạn chỉ cần tái khám theo lịch kiểm tra.',
      ],
    },
    {
      // V19: việc chính của bệnh nhân tại nhà, cùng ba bước với thanh bước ở màn Nạp liệu trình.
      icon: 'git-commit', tone: C.teal, soft: C.tealSoft,
      title: 'Nạp liệu trình bằng cáp USB',
      points: [
        'Ngày có buổi chiếu, Trang chủ có nút "Nạp liệu trình vào máy".',
        '1. Kết nối máy: cắm cáp USB từ điện thoại vào thiết bị, chạm Kết nối.',
        '2. Nạp liệu trình: kiểm tra mức, chế độ, thời gian rồi chạm "Nạp liệu trình vào máy". Chờ dòng "Máy đã nhận cấu hình".',
        '3. Chiếu: chạm "Theo dõi phiên điều trị" và giữ màn hình mở tới khi xong buổi để buổi được ghi vào nhật ký.',
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
          title="Hướng dẫn"
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
