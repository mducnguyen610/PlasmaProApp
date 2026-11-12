import { Card, Header, H, Muted, Screen } from '@/components/ui';
import { TERMS_VERSION } from '@/lib/access';

export default function Terms() {
  return <Screen header={<Header back title="Điều khoản" subtitle="Điều khoản sử dụng và quyền riêng tư, bản demo" />}>
    <Card><H>1. Phạm vi sử dụng</H><Muted>Đây là ứng dụng trình diễn. Tài khoản, lịch trình, thiết bị và dữ liệu được lưu trên máy đang dùng; chưa kết nối hệ thống điều trị thật. Chỉ dùng dữ liệu và mật khẩu thử nghiệm.</Muted></Card>
    <Card><H>2. Tài khoản và vai trò</H><Muted>Bệnh nhân theo dõi hồ sơ của mình. Bác sĩ được phân công quản lý hồ sơ, chụp ảnh, nhập diện tích đã đo và đánh giá mức Nhẹ, Trung bình hoặc Nặng. Tài khoản bác sĩ và kỹ thuật mới cần quản trị duyệt.</Muted></Card>
    <Card><H>3. Thông tin được lưu</H><Muted>Ứng dụng lưu thông tin đăng ký, hồ sơ, ảnh vết thương, diện tích, đánh giá và lịch sử thiết bị để thể hiện luồng theo dõi. Khi đồng ý, ứng dụng ghi phiên bản điều khoản và thời điểm chấp thuận.</Muted></Card>
    <Card><H>4. Đồng ý nghiên cứu riêng biệt</H><Muted>Bạn có thể đồng ý hoặc rút đồng ý sử dụng ảnh cho nghiên cứu tại Tài khoản. Không đồng ý vẫn dùng được chức năng theo dõi. Rút đồng ý sẽ ngừng hiển thị và xuất ảnh ở kho dữ liệu; không tự thu hồi tệp đã được tải trước đó.</Muted></Card>
    <Card><H>5. Bộ dữ liệu kỹ thuật</H><Muted>Chỉ ảnh do bác sĩ thu thập và gán diện tích, được kiểm tra không chứa mặt, giấy tờ hay thông tin nhận dạng mới được đưa vào kho. Bản xuất dùng mã nghiên cứu, bỏ thông tin liên hệ và metadata ảnh. Mã hóa định danh không bảo đảm ảnh hoàn toàn không thể nhận diện; bác sĩ cần xem kỹ nội dung trước khi xác nhận.</Muted></Card>
    <Card><H>6. Giới hạn của demo</H><Muted>Đăng nhập và phân quyền hiện mô phỏng trên thiết bị. Chức năng xác thực, bảo vệ dữ liệu và phân quyền phía máy chủ cần được triển khai trước khi dùng dữ liệu thật. Ứng dụng hiển thị đánh giá do bác sĩ nhập, không tự chẩn đoán.</Muted><Muted>Phiên bản: {TERMS_VERSION}</Muted></Card>
  </Screen>;
}

