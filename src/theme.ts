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
  cardBorder: '#BFCAC8', // viền thẻ phụ (thẻ không bóng): 1,53:1 trên nền bg, 1,68:1 trên trắng; border cũ chỉ 1,14:1 nên thẻ hòa vào nền
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

// ---------------------------------------------------------------------------
// Design system (DESIGN_SYSTEM.md). Các token dưới đây chỉ THÊM, không đổi giá trị nào ở trên,
// nên chưa màn nào đổi giao diện. Màn chuyển dần sang dùng token theo bảng "Lộ trình áp dụng" trong DESIGN_SYSTEM.md.
// ---------------------------------------------------------------------------

/** Tên tông mà Chip, IconBadge, Notice, NumberTile nhận (src/components/ui.tsx). */
export type Tone = 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'teal' | 'gray';

/**
 * Năm vai trò ngữ nghĩa. Mỗi vai trò chỉ một nghĩa; không dùng màu trạng thái để trang trí.
 * - success: hoàn thành, đạt, máy đã nhận.
 * - warning: cần chú ý nhưng chưa nguy hiểm (bỏ lỡ, gián đoạn, ngoại tuyến, chưa đo, độ tin cậy thấp).
 * - danger: lỗi, NAK, dừng chiếu, mức Nặng, hành động xóa.
 * - info: thông tin trung tính có nhấn (lịch hẹn, gợi ý của AI).
 * - neutral: không hoạt động, bị khóa, ô số liệu không mang trạng thái.
 */
export type Semantic = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** fg: chữ và biểu tượng; bg: nền nhạt; solid: nền đậm cho chữ trắng (chỉ success, danger, info); bar: vạch biểu đồ, viền 3:1. */
export const semantic: Record<Semantic, { fg: string; bg: string; solid: string | null; bar: string; tone: Tone }> = {
  success: { fg: C.green, bg: C.greenSoft, solid: C.green, bar: bar.green, tone: 'green' },
  warning: { fg: C.amber, bg: C.amberSoft, solid: null, bar: bar.amber, tone: 'amber' },
  danger: { fg: C.red, bg: C.redSoft, solid: C.red, bar: bar.red, tone: 'red' },
  info: { fg: C.teal, bg: C.tealSoft, solid: C.teal, bar: bar.teal, tone: 'teal' },
  neutral: { fg: C.textSoft, bg: C.neutralSoft, solid: null, bar: bar.gray, tone: 'gray' },
};

/** Thang khoảng cách 4 pt. Lề màn = 16; đệm thẻ = 16; giữa thẻ = 12; giữa hai mục = 24. */
export const space = { xxs: 2, xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

/** Bán kính bổ sung cho radius ở trên: pill cho chip và nút. */
export const radiusExtra = { pill: 999, button: 24, input: radius.m } as const;

/**
 * Bậc chữ đích (pt trước hệ số ROLE_SCALE). size/line/weight. Các bậc trùng T giữ nguyên giá trị T;
 * sectionTitle 20 và cardTitle 17 là bậc mới, áp dụng khi chuyển màn (V23 trong báo cáo audit).
 */
export const typeScale = {
  display: { size: 40, line: 48, weight: '700' },
  screenTitle: { size: T.screenTitle, line: 28, weight: '700' },
  sectionTitle: { size: 20, line: 26, weight: '700' },
  cardTitle: { size: 17, line: 24, weight: '700' },
  stat: { size: 28, line: 34, weight: '700' },
  body: { size: T.body, line: 24, weight: '400' },
  bodyStrong: { size: T.body, line: 24, weight: '500' },
  label: { size: T.label, line: 20, weight: '500' },
  small: { size: T.small, line: 21, weight: '400' },
  caption: { size: T.caption, line: 18, weight: '600' },
} as const;
export type TypeStep = keyof typeof typeScale;

/** Kích thước tối thiểu. touch theo Apple HIG 44 pt; Material 3 khuyến nghị 48 dp, dùng cho nút chính và ô nhập. */
export const size = {
  touch: 44,
  input: 48,
  button: 52,
  buttonDanger: 56,
  icon: { s: 16, m: 20, l: 24 },
  avatar: 40,
  tabBar: 62,
  maxContent: 560,
} as const;

/** Bậc nổi. 0: thẻ phẳng (viền cardBorder); 1: thẻ hero; 2: nút chính; 3: thanh tiêu đề, thanh tab. */
export const elevation = {
  0: { shadowOpacity: 0, elevation: 0 },
  1: shadow,
  2: { shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 4, height: 8 }, elevation: 5 },
  3: { shadowColor: C.grey, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 1.1, height: 1.1 }, elevation: 4 },
} as const;

/** Trạng thái tương tác dùng chung. disabled không dùng opacity: nền neutral + chữ textSoft (6,58:1) và luôn kèm lý do. */
export const interaction = {
  pressedOpacity: 0.8,
  focusRing: { color: C.primary, width: 2, offset: 2 },
  disabled: { bg: C.neutralSoft, fg: C.textSoft, border: C.border },
  selected: { bg: C.primary, fg: C.onPrimary },
  inputBorder: { rest: C.cardBorder, focus: C.primary, error: C.red },
} as const;
