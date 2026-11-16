import { View } from 'react-native';
import { Text } from '@/components/Text';
import { Card, Divider, Header, Notice, Screen } from '@/components/ui';
import { TERMS_VERSION } from '@/lib/access';
import { C, T } from '@/theme';

/**
 * C04 Điều khoản. Stage 9A (bố cục riêng): đọc như một văn bản liền, không còn sáu thẻ rời. Phiên bản đặt đầu trang,
 * điều 1 (đây là bản trình diễn) đặt thành dòng lưu ý vì người dùng cần biết trước khi đọc tiếp. Nội dung các điều giữ nguyên.
 */
const SECTIONS: { title: string; body: string }[] = [
  { title: '1. Phạm vi sử dụng', body: 'Đây là ứng dụng trình diễn. Tài khoản, lịch trình, thiết bị và dữ liệu được lưu trên máy đang dùng; chưa kết nối hệ thống điều trị thật. Chỉ dùng dữ liệu và mật khẩu thử nghiệm.' },
  { title: '2. Tài khoản và vai trò', body: 'Bệnh nhân theo dõi hồ sơ của mình. Bác sĩ được phân công quản lý hồ sơ, chụp ảnh, nhập diện tích đã đo và đánh giá mức Nhẹ, Trung bình hoặc Nặng. Tài khoản bác sĩ và kỹ thuật mới cần quản trị duyệt.' },
  { title: '3. Thông tin được lưu', body: 'Ứng dụng lưu thông tin đăng ký, hồ sơ, ảnh vết thương, diện tích, đánh giá và lịch sử thiết bị để thể hiện luồng theo dõi. Khi đồng ý, ứng dụng ghi phiên bản điều khoản và thời điểm chấp thuận.' },
  { title: '4. Đồng ý nghiên cứu riêng biệt', body: 'Bạn có thể đồng ý hoặc rút đồng ý sử dụng ảnh cho nghiên cứu tại Tài khoản. Không đồng ý vẫn dùng được chức năng theo dõi. Rút đồng ý sẽ ngừng hiển thị và xuất ảnh ở kho dữ liệu; không tự thu hồi tệp đã được tải trước đó.' },
  { title: '5. Bộ dữ liệu kỹ thuật', body: 'Chỉ ảnh do bác sĩ thu thập và gán diện tích, được kiểm tra không chứa mặt, giấy tờ hay thông tin nhận dạng mới được đưa vào kho. Bản xuất dùng mã nghiên cứu, bỏ thông tin liên hệ và metadata ảnh. Mã hóa định danh không bảo đảm ảnh hoàn toàn không thể nhận diện; bác sĩ cần xem kỹ nội dung trước khi xác nhận.' },
  { title: '6. Giới hạn của demo', body: 'Đăng nhập và phân quyền hiện mô phỏng trên thiết bị. Chức năng xác thực, bảo vệ dữ liệu và phân quyền phía máy chủ cần được triển khai trước khi dùng dữ liệu thật. Ứng dụng hiển thị đánh giá do bác sĩ nhập, không tự chẩn đoán.' },
];

export default function Terms() {
  return <Screen header={<Header back title="Điều khoản" subtitle={`Phiên bản ${TERMS_VERSION}`} />}>
    <Notice tone="blue" icon="information-circle-outline">Bản trình diễn: dữ liệu chỉ lưu trên máy này và chưa kết nối hệ thống điều trị thật. Chi tiết ở điều 1 và điều 6.</Notice>
    <Card style={{ gap: 14 }}>
      <Text accessibilityRole="header" style={{ fontSize: T.titleM, fontWeight: '700', color: C.text }}>Điều khoản sử dụng và quyền riêng tư</Text>
      {SECTIONS.map((s, i) => (
        <View key={s.title} style={{ gap: 6 }}>
          {i > 0 && <Divider />}
          <Text accessibilityRole="header" style={{ fontSize: T.body, fontWeight: '700', color: C.text }}>{s.title}</Text>
          <Text style={{ color: C.textBody, lineHeight: 24 }}>{s.body}</Text>
        </View>
      ))}
      <Divider />
      <Text style={{ color: C.textSoft, fontSize: T.small }}>Phiên bản: {TERMS_VERSION}</Text>
    </Card>
  </Screen>;
}
