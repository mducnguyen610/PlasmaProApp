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
// Đợt 5 (PP-13): câu chữ viết lại theo bảng đã duyệt C01 đến C18 (DOT5_BANG_CAU_CHU.md), dùng "điều trị" thay "chiếu".
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
        'Plasma Pro là máy cầm tay phát plasma lạnh. Máy hỗ trợ điều trị vết thương theo liệu trình bác sĩ đặt.',
        'Sau mỗi lần dùng, máy tự gửi số lần điều trị qua Wi-Fi. Bác sĩ xem số này để theo dõi.',
        'Ứng dụng không tự chẩn đoán. Chỉ bác sĩ đánh giá vết thương.',
      ],
    },
    {
      icon: 'calendar', tone: C.green, soft: C.greenSoft,
      title: 'Đợt điều trị gồm những gì',
      points: [
        active
          ? `Bạn điều trị theo lịch bác sĩ đặt: ${phases.map((ph) => phaseLabel(ph).toLowerCase()).join(', sau đó ')}. Lịch có ngày nghỉ, nên không phải ngày nào cũng điều trị.`
          : 'Bạn điều trị theo lịch bác sĩ dặn. Bác sĩ chưa xác nhận đợt điều trị của bạn trong ứng dụng.',
        'Xem đầu Trang chủ để biết hôm nay điều trị hay nghỉ. Ở đó cũng ghi ngày điều trị tiếp theo.',
        'Máy đã khóa sẵn mức năng lượng và thời gian theo chỉ định của bác sĩ. Máy không phát vào ngày nghỉ hoặc khi đã đủ số lần.',
        'Đợt kết thúc khi bác sĩ xác nhận vết thương đã liền. Sau đó, bạn chỉ cần tái khám theo lịch kiểm tra.',
      ],
    },
    {
      // V19: việc chính của bệnh nhân tại nhà, cùng ba bước với thanh bước ở màn Nạp liệu trình.
      icon: 'git-commit', tone: C.teal, soft: C.tealSoft,
      title: 'Nạp liệu trình bằng cáp USB',
      points: [
        'Vào ngày có buổi điều trị, chạm nút "Nạp liệu trình vào máy" trên Trang chủ.',
        '1. Kết nối máy: cắm cáp USB từ điện thoại vào máy. Chạm "Kết nối".',
        '2. Nạp liệu trình: xem lại mức năng lượng, chế độ và thời gian. Chạm "Nạp liệu trình vào máy". Chờ dòng "Máy đã nhận liệu trình".',
        '3. Điều trị: chạm "Theo dõi phiên điều trị". Giữ màn hình mở tới khi xong buổi. Như vậy buổi điều trị mới được ghi vào nhật ký.',
      ],
    },
    {
      icon: 'medkit', tone: C.amber, soft: C.amberSoft,
      title: 'Báo triệu chứng ở đâu',
      points: [
        'Khi bị đau, rát, chảy dịch hoặc sốt, chạm "Báo triệu chứng hoặc sự cố" trên Trang chủ.',
        'Khi máy không bật được hoặc mất Wi-Fi, vào tab Thiết bị và chạm "Báo sự cố thiết bị".',
        `Báo cáo được gửi cho ${doctor ?? 'bác sĩ phụ trách'}. Bác sĩ chỉ thấy báo cáo khi mở ứng dụng. Vì vậy không có giờ trả lời cố định.`,
      ],
    },
    {
      icon: 'call', tone: C.red, soft: C.redSoft,
      title: 'Khi khẩn cấp',
      points: [
        'Hãy gọi 115 hoặc đến cơ sở y tế gần nhất nếu bạn đau tăng nhiều, sốt, chảy máu hoặc mủ nhiều.',
        'Đừng chờ trả lời trong ứng dụng. Ứng dụng không thay thế cấp cứu. Không có ai theo dõi ứng dụng liên tục.',
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
      // Giai đoạn 5 giao diện theo tác vụ: Tiếp / Quay lại ở vùng nút cố định, không phải cuộn khi trang dài (màn hẹp, cỡ chữ lớn).
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {i > 0 && <Button style={{ flex: 1 }} label="Quay lại" variant="ghost" onPress={() => setI(i - 1)} />}
          <Button style={{ flex: i > 0 ? 2 : 1 }} label={last ? 'Bắt đầu sử dụng' : 'Tiếp'} icon={last ? 'checkmark' : 'arrow-forward'} onPress={last ? done : () => setI(i + 1)} />
        </View>
      }
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
      <Muted>Bạn có thể xem lại hướng dẫn này trong Tài khoản.</Muted>
    </Screen>
  );
}
