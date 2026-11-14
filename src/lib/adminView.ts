// Hàm thuần cho khu vực quản trị (Stage 6): lọc, tìm, nhóm theo ngày. Chỉ đọc dữ liệu, không đổi quyền hay dữ liệu.
import type { Account, AppData, Role, SyncError } from './types';

/** Ngày theo giờ Việt Nam (UTC+7), cùng mốc với localDay trong course.ts; viết lại ở đây để tệp chạy được bằng node khi kiểm thử. */
const vnDay = (iso: string) => new Date(new Date(iso).getTime() + 420 * 60000).toISOString().slice(0, 10);

export const ROLE_LABEL: Record<Role, string> = { doctor: 'Bác sĩ', patient: 'Bệnh nhân', admin: 'Quản trị' };

export type AccountStatus = 'pending' | 'locked' | 'active';
export const ACCOUNT_STATUS: Record<AccountStatus, { label: string; tone: 'amber' | 'red' | 'green' }> = {
  pending: { label: 'Chờ duyệt', tone: 'amber' },
  locked: { label: 'Đã khóa', tone: 'red' },
  active: { label: 'Hoạt động', tone: 'green' },
};

/** Cùng thứ tự ưu tiên với Q01 cũ: chờ duyệt, rồi đã khóa, rồi hoạt động. */
export function accountStatus(a: Account): AccountStatus {
  return a.pendingApproval ? 'pending' : a.locked ? 'locked' : 'active';
}

/** Tên hiển thị như Q01 cũ: bệnh nhân hiện mã hồ sơ, không hiện họ tên. */
export function accountDisplayName(data: AppData, a: Account): string {
  return a.role === 'patient' ? data.patients.find((p) => p.id === a.patientId)?.code ?? a.name : a.name;
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

/** Tìm theo tên hiển thị hoặc tên đăng nhập, không phân biệt dấu và hoa thường; lọc theo trạng thái và vai trò. Giữ thứ tự dữ liệu. */
export function filterAccounts(data: AppData, query: string, status: AccountStatus | 'all', role: Role | 'all'): Account[] {
  const q = fold(query.replace(/^@/, ''));
  return data.accounts.filter((a) =>
    (status === 'all' || accountStatus(a) === status) &&
    (role === 'all' || a.role === role) &&
    (!q || fold(accountDisplayName(data, a)).includes(q) || fold(a.username).includes(q)));
}

/** Nhật ký lỗi: mới nhất trước (như Q04 cũ), nhóm theo ngày giờ Việt Nam. Không bỏ bản ghi nào. */
export function groupErrorsByDay(list: SyncError[], status: 'open' | 'resolved' | 'all'): { day: string; items: SyncError[] }[] {
  const shown = [...list].filter((e) => status === 'all' || (status === 'open' ? !e.resolved : e.resolved)).sort((a, b) => b.at.localeCompare(a.at));
  const groups: { day: string; items: SyncError[] }[] = [];
  for (const e of shown) {
    const day = vnDay(e.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e); else groups.push({ day, items: [e] });
  }
  return groups;
}

/**
 * Mô tả quyền theo vai trò, chỉ để đọc. Viết theo các kiểm tra quyền đang có trong src/lib/store.tsx và src/lib/access.ts;
 * vai trò gắn cố định với tài khoản, ứng dụng không có thao tác đổi vai trò.
 */
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  doctor: [
    'Xem và quản lý hồ sơ bệnh nhân mình phụ trách: vết thương, ảnh, đo, đánh giá, đợt điều trị.',
    'Giao và thu hồi thiết bị cho bệnh nhân mình phụ trách.',
    'Xuất dữ liệu nghiên cứu khi được quản trị cấp quyền.',
  ],
  patient: [
    'Xem hồ sơ và đợt điều trị của chính mình.',
    'Nạp liệu trình vào thiết bị được giao, báo triệu chứng, chọn đồng ý nghiên cứu.',
  ],
  admin: [
    'Duyệt và khóa tài khoản, cấp quyền xuất dữ liệu, đổi bác sĩ phụ trách.',
    'Đăng ký thiết bị, xem lỗi đồng bộ, chẩn đoán USB/UART.',
    'Không mở hồ sơ lâm sàng; chỉ thấy mã hồ sơ.',
  ],
};
