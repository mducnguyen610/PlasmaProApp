// Ngôn ngữ thiết kế lấy theo Best Flutter UI Templates / Fitness App (fitness_app_theme.dart):
// nền xám nhạt, thẻ trắng bo 8/8/8/68, xanh "nearlyDarkBlue", thẻ gradient, font Google Sans Flex từ gói do người dùng cung cấp.
export const C = {
  primary: '#0B6B6F', // xanh mòng két (bảng màu thử nghiệm demo/bang-mau-teal)
  primaryDark: '#06454A',
  primarySoft: '#DFF1EF',
  accent: '#14A3A0',
  periwinkle: '#7CC3BD',
  bg: '#F3F5F4', // nền xám ấm, bớt ánh tím
  card: '#FFFFFF',
  text: '#15232A', // darkerText
  textBody: '#253840', // darkText
  textSoft: '#3F5764', // tối hơn #4A6572 (lightText) để đạt tối thiểu 6,4:1 trên mọi nền sáng của ứng dụng, kể cả primarySoft
  textFaint: '#52626E', // tối hơn #5F707D: bản cũ chỉ đạt 4,32:1 trên primarySoft; nay tối thiểu 5,3:1 trên mọi nền sáng
  grey: '#3A5157',
  border: '#E1E7E6',
  green: '#2E7031', // xanh lá ngả vàng để khác hẳn màu chính,
  greenSoft: '#E8F4E5',
  amber: '#A5590F',
  amberSoft: '#FDEFE0',
  red: '#CD203A',
  redSoft: '#FDE7EB',
  violet: '#5A4FC4',
  violetSoft: '#ECECFC',
  teal: '#1E5FA8', // vai trò 'thông tin' chuyển sang xanh dương vì màu chính đã là mòng két,
  tealSoft: '#E4EEF9',
  /** Chữ và biểu tượng đặt trên nền màu đậm (primary, gradient, red). */
  onPrimary: '#FFFFFF',
  /** Chữ phụ trên nền primary hoặc gradient đậm. */
  onPrimarySoft: '#DDF3F1',
  /** Chữ phụ trên nền tối (khung camera). */
  onDarkSoft: '#D9E5EC',
  /** Nền nhạt cho ô nhập, khối mã, thanh tiến độ (gộp #F6F8FC, #F8F9FC, #EEF2F9, #F1F4FA). */
  surfaceMuted: '#F5F8F7',
  /** Nền của Chip tông xám. */
  neutralSoft: '#ECEFEE',
  /** Lớp phủ tối trên ảnh và camera. */
  scrim: 'rgba(0,0,0,0.7)',
  /** Nền tạm khi ảnh vết thương chưa tải xong. */
  photoPlaceholder: '#E9DCD3',
} as const;

/** Màu vạch, thanh biểu đồ, viền đồ họa (không dùng cho chữ; WCAG SC 1.4.11 yêu cầu 3:1 cho thành phần đồ họa). */
export const bar = {
  blue: '#5FB3AD',
  green: '#7DBE6E',
  amber: '#F1B440',
  red: '#F56E98',
  violet: '#8A98E8',
  teal: '#6FA3DB',
  gray: '#B8C2CC',
} as const;

/**
 * Bộ gradient của thẻ "Meals today" và nút giữa thanh tab.
 * Mọi điểm dừng đều đạt tối thiểu 4,5:1 với chữ trắng (WCAG 2.2 SC 1.4.3),
 * vì thẻ có chữ cỡ 11 đến 16, chưa đủ điều kiện "chữ lớn".
 */
export const G = {
  coral: ['#C8443F', '#C94A2C'],
  indigo: ['#1E5FA8', '#2B5DB0'],
  pink: ['#D6336C', '#C2185B'],
  night: ['#127C7E', '#06454A'],
  fab: ['#0B6B6F', '#137A75'],
} as const;
export type GradientName = keyof typeof G;

export const gradient = G.fab;

/**
 * Bán kính bo góc dùng chung. Thẻ và ảnh bo đều bốn góc (trước đây thẻ bo 8/8/8 và góc trên phải 32, 54 hoặc 68,
 * nhìn trên iPhone thành các thẻ cạnh nhau không đều).
 * s: chip nhỏ, ô tích; m: khối trong thẻ, ô nhập, ảnh; card: mọi thẻ; sheet: thanh tiêu đề và thanh tab.
 */
export const radius = { s: 8, m: 12, card: 16, sheet: 24 } as const;

/** Hình dạng thẻ: bo đều bốn góc theo radius.card. */
export const cardShape = () => ({ borderRadius: radius.card });

export const shadow = {
  shadowColor: '#3A5160',
  shadowOpacity: 0.2,
  shadowRadius: 10,
  shadowOffset: { width: 1.1, height: 1.1 },
  elevation: 3,
} as const;

export const F = {
  regular: 'GoogleSansFlex-Regular',
  medium: 'GoogleSansFlex-Medium',
  bold: 'GoogleSansFlex-Bold',
} as const;

/**
 * Thang cỡ chữ dùng chung (đề xuất 1 của bản góp ý cỡ chữ, 03/11/2026).
 * Tham chiếu: Apple HIG chữ thân bài mặc định 17 pt; Material 3 "body large" 16 sp.
 * Không chữ nào nhỏ hơn T.min (Text tự chặn dưới).
 */
export const T = {
  min: 12,
  caption: 13,
  small: 14,
  label: 15,
  body: 16,
  cardTitle: 18,
  screenTitle: 22,
  stat: 24,
  display: 32,
} as const;

/** Hệ số cỡ chữ theo vai trò: bệnh nhân thân bài 17 (đề xuất 2). Bác sĩ và kỹ thuật giữ 16. */
export const ROLE_SCALE = { patient: 17 / 16, doctor: 1, admin: 1 } as const;
