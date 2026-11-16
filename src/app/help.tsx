import { router } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { Card, Disclosure, Header, LinkRow, Muted, Screen, SectionTitle } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { Role } from '@/lib/types';
import { C, T } from '@/theme';

type Topic = { id: string; icon: IconName; title: string; screen: string; lines: string[] };

/**
 * Stage 9A, trang "Hướng dẫn và giải thích" (mở từ tab Cá nhân). Chứa các câu giải thích chung (nhóm D trong bản rà soát phụ đề)
 * đã chuyển khỏi màn làm việc để màn gọn hơn. Câu chữ giữ nguyên văn như khi còn ở màn. Cảnh báo an toàn, thông tin quyết định lâm
 * sàng, trạng thái thiết bị và hướng dẫn thao tác quan trọng KHÔNG chuyển vào đây; chúng vẫn ở đúng màn của chúng.
 * Bệnh nhân dùng "Hướng dẫn sử dụng" (N01) như trước; trang này cho bác sĩ và quản trị.
 */
const TOPICS: Record<Exclude<Role, 'patient'>, Topic[]> = {
  doctor: [
    {
      id: 'chup-anh', icon: 'camera-outline', title: 'Chụp ảnh vết thương', screen: 'Chụp ảnh vết thương',
      lines: ['Mở bước chụp để dùng camera hoặc chọn ảnh từ thư viện, rồi kiểm tra trước khi lưu.'],
    },
    {
      id: 'danh-gia', icon: 'clipboard-outline', title: 'Đánh giá vết thương', screen: 'Đánh giá',
      lines: ['Ứng dụng chỉ lưu nhận định của bác sĩ; không tự suy luận tình trạng hay đề xuất liệu trình.'],
    },
    {
      id: 'anh-dien-tich', icon: 'images-outline', title: 'Ảnh vết thương và bộ dữ liệu nghiên cứu', screen: 'Ảnh vết thương',
      lines: ['Ảnh đã có diện tích và được xác nhận chia sẻ sẽ do quản trị kỹ thuật xuất thành bộ dữ liệu nghiên cứu.'],
    },
  ],
  admin: [
    {
      id: 'phan-cong', icon: 'people-outline', title: 'Phân công bác sĩ phụ trách', screen: 'Quản lý tài khoản, Phân công',
      lines: ['Đổi bác sĩ phụ trách cho từng hồ sơ. Hồ sơ chỉ đổi sau khi xác nhận.'],
    },
  ],
};

export default function Help() {
  const { me } = useStore();
  const role = me?.role;
  const topics = role === 'doctor' || role === 'admin' ? TOPICS[role] : [];
  return (
    <Screen header={<Header back title="Hướng dẫn và giải thích" />}>
      {role === 'patient' && (
        <Card>
          <LinkRow icon="help-circle-outline" tone="blue" title="Hướng dẫn sử dụng" sub="Năm bước: thiết bị, đợt điều trị, nạp liệu trình, báo triệu chứng, khẩn cấp"
            onPress={() => router.push({ pathname: '/onboarding', params: { review: '1' } })} />
        </Card>
      )}
      {topics.length > 0 && <SectionTitle caption="Các câu giải thích chung, chuyển từ màn làm việc sang đây để màn gọn hơn. Cảnh báo an toàn và thông tin lâm sàng vẫn ở đúng màn.">Theo màn hình</SectionTitle>}
      {topics.length > 0 && (
        <Card style={{ paddingVertical: 4 }}>
          {topics.map((t, i) => (
            <View key={t.id} testID={`huong-dan-${t.id}`} style={i > 0 ? { borderTopWidth: 1, borderTopColor: C.border } : undefined}>
              <Disclosure icon={t.icon} title={t.title} summary={`Màn ${t.screen}`}>
                <View style={{ gap: 6, paddingBottom: 10 }}>
                  {t.lines.map((l) => <Text key={l} style={{ color: C.textBody, fontSize: T.body, lineHeight: 23 }}>{l}</Text>)}
                </View>
              </Disclosure>
            </View>
          ))}
        </Card>
      )}
      <Muted>Câu hỏi về điều khoản và căn cứ pháp lý xem ở hai mục tương ứng trong tab Cá nhân.</Muted>
    </Screen>
  );
}
