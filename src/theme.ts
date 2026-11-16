// Stage 9A, hướng thị giác "Clinical Precision" (PLASMA_PRO_STAGE_9A_VISUAL_DIRECTION.md):
// navy và xanh y tế là bản sắc chính, mòng két chỉ dùng có chọn lọc cho chỉ báo lâm sàng phụ.
// Mọi màu chữ đã kiểm theo WCAG 2.2 SC 1.4.3 (src/theme.contrast.test.ts). Giá trị gợi ý trong đặc tả Stage 9A
// được làm tối thêm khi chưa đạt 4,5:1 trên nền nhạt tương ứng (ghi ở mục 2 DESIGN_SYSTEM Stage 9A).
export const C = {
  /** Xanh y tế dùng cho hành động và trạng thái chọn (đặc tả #2878B8, làm tối để chữ trắng và nền nhạt đạt 5,3:1 trở lên). */
  primary: '#1F67A3',
  /** Navy sâu: thanh nhận diện, tiêu đề, nút giữa thanh tab. */
  primaryDark: '#17324D',
  navy: '#17324D',
  primarySoft: '#EAF3FA',
  /** Mòng két y tế: chỉ báo lâm sàng phụ (nguồn số đo, tiến độ đợt), không làm màu chủ đạo. */
  accent: '#087F7B',
  accentSoft: '#E3F3F2',
  /** Điểm nhấn thương hiệu trên nền navy (dấu Plasma Pro, vạch mục đang chọn ở thanh bên): 7,7:1 trên navy. */
  brandMint: '#8FD3CF',
  /** Nền nút primary khi đang nhấn trên nền navy. */
  primaryPressed: '#2E6DA6',
  /** Viền nút "danger" nền nhạt. */
  redBorder: '#F0C4C9',
  /** Nền mục đang chọn và nút trên nền navy (trắng 12%). */
  onNavyTint: 'rgba(255,255,255,0.12)',
  /** Cảnh báo và lỗi đặt trên nền navy (bảng điều khiển T02): 8,4:1 và 6,5:1 trên navy. */
  onNavyWarn: '#F5C77E',
  onNavyDanger: '#FF9AA5',
  /** Viền và trạng thái nhấn rất nhẹ trên nền navy. */
  onNavyHairline: 'rgba(255,255,255,0.07)',
  periwinkle: '#2878B8',
  bg: '#F5F8FB',
  card: '#FFFFFF',
  text: '#17324D',
  textBody: '#243447',
  textSoft: '#526173',
  textFaint: '#5B6B7E',
  grey: '#3B4A5C',
  border: '#E2E8F0',
  /** Viền khung nội dung và ô nhập (3:1 không bắt buộc cho viền trang trí; ô nhập dùng inputBorder). */
  cardBorder: '#D6DEE8',
  green: '#1F7A50',
  greenSoft: '#E6F4EC',
  amber: '#9A5A12',
  amberSoft: '#FBF0E2',
  red: '#B8323F',
  redSoft: '#FBE9EB',
  violet: '#5A4FC4',
  violetSoft: '#EFEEFC',
  /** Vai trò "thông tin" (đặc tả Information #2878B8, làm tối để đạt 4,6:1 trên tealSoft). */
  teal: '#2470AD',
  tealSoft: '#E8F1F9',
  /** Chữ và biểu tượng đặt trên nền màu đậm (primary, navy, red). */
  onPrimary: '#FFFFFF',
  /** Chữ phụ trên nền navy hoặc primary. */
  onPrimarySoft: '#C9D8E8',
  /** Chữ phụ trên nền tối (khung camera). */
  onDarkSoft: '#D9E5EC',
  /** Nền nhạt cho ô số liệu, khối mã, thanh tiến độ. */
  surfaceMuted: '#F1F5F9',
  /** Nền của Chip tông xám và rãnh thanh chọn. */
  neutralSoft: '#EDF1F5',
  /** Đường kẻ trong nhóm dòng. */
  divider: '#E8EDF3',
  /** Lớp phủ tối trên ảnh và camera. */
  scrim: 'rgba(0,0,0,0.7)',
  /** Lớp phủ sau bảng trượt và hộp thoại (navy 45%). */
  scrimSheet: 'rgba(23, 50, 77, 0.45)',
  /** Nền tạm khi ảnh vết thương chưa tải xong. */
  photoPlaceholder: '#E9DCD3',
} as const;

/** Màu vạch, thanh biểu đồ, viền đồ họa (không dùng cho chữ; WCAG SC 1.4.11 yêu cầu 3:1 cho thành phần đồ họa). */
export const bar = {
  blue: '#2878B8',
  green: '#25845A',
  amber: '#C77B27',
  red: '#C83D4D',
  violet: '#8A80E0',
  teal: '#087F7B',
  gray: '#A9B6C5',
} as const;

/**
 * Stage 9A bỏ gradient trang trí (đặc tả 2.4). Giữ khóa G để mã cũ biên dịch được; mỗi cặp là hai điểm dừng cùng màu,
 * nên LinearGradient còn lại vẽ thành nền đặc. Chữ trắng đạt tối thiểu 4,5:1 trên mọi điểm dừng.
 */
export const G = {
  coral: ['#B8323F', '#B8323F'],
  indigo: ['#1F67A3', '#1F67A3'],
  pink: ['#B8323F', '#B8323F'],
  night: ['#17324D', '#17324D'],
  fab: ['#17324D', '#17324D'],
} as const;
export type GradientName = keyof typeof G;

export const gradient = G.fab;

/**
 * Bán kính bo góc dùng chung. Thẻ và ảnh bo đều bốn góc (trước đây thẻ bo 8/8/8 và góc trên phải 32, 54 hoặc 68,
 * nhìn trên iPhone thành các thẻ cạnh nhau không đều).
 * s: chip nhỏ, ô tích; m: khối trong thẻ, ô nhập, ảnh; card: mọi thẻ; sheet: thanh tiêu đề và thanh tab.
 */
export const radius = { s: 6, m: 10, card: 12, sheet: 16 } as const;

/** Hình dạng thẻ: bo đều bốn góc theo radius.card. */
export const cardShape = () => ({ borderRadius: radius.card });

/** Bóng rất nhẹ, chỉ cho khối chính của màn (Card hero). Stage 9A: viền mảnh là cách tách lớp chính, bóng là ngoại lệ. */
export const shadow = {
  shadowColor: '#17324D',
  shadowOpacity: 0.07,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
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
  cardTitle: 16,
  screenTitle: 24,
  stat: 24,
  display: 30,
  /** Stage 9A: tiêu đề khối định danh, tiêu đề màn chi tiết (20) và tiêu đề nhóm (18). */
  titleL: 20,
  titleM: 18,
  /** Stage 9A: số đo lâm sàng chính (diện tích gần nhất) và đồng hồ phiên ở bảng điều khiển T02. */
  clinical: 34,
  timerLarge: 56,
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
export const radiusExtra = { pill: 999, button: 10, input: radius.m } as const;

/**
 * Bậc chữ đích (pt trước hệ số ROLE_SCALE). size/line/weight. Các bậc trùng T giữ nguyên giá trị T;
 * sectionTitle 20 là bậc mới (V23); cardTitle và statCompact khớp T để chỉ còn một thang (A11).
 */
export const typeScale = {
  display: { size: 40, line: 48, weight: '700' },
  // PP-17: đồng hồ đếm ngược T02 giữ cỡ 44 đang hiển thị (display 40 sẽ làm nhỏ đồng hồ). Không khai báo line:
  // đồng hồ chưa đặt lineHeight, thêm vào sẽ đổi chiều cao khối.
  timer: { size: 44, weight: '700' },
  screenTitle: { size: T.screenTitle, line: 30, weight: '700' },
  sectionTitle: { size: 18, line: 24, weight: '700' },
  /** Nhãn nhóm nhỏ phía trên khối (eyebrow), chữ thường để giữ dấu tiếng Việt dễ đọc. */
  eyebrow: { size: T.caption, line: 18, weight: '600' },
  /** Giá trị lâm sàng chính (diện tích, buổi đã xong): đậm hơn nhãn rõ rệt. */
  clinical: { size: 30, line: 36, weight: '700' },
  // cardTitle theo T.cardTitle (18) đang dùng ở mọi thẻ; statCompact cho số trong vòng tiến độ và StatGrid (A11, audit lần 2).
  cardTitle: { size: T.cardTitle, line: 22, weight: '700' },
  stat: { size: 28, line: 34, weight: '700' },
  statCompact: { size: T.stat, line: 30, weight: '700' },
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
  button: 48,
  buttonDanger: 56,
  icon: { s: 16, m: 20, l: 24 },
  avatar: 40,
  tabBar: 62,
  maxContent: 600,
  /** Thanh điều hướng bên trái ở màn rộng (từ 1024 px). */
  sidebar: 232,
} as const;

/** Bậc nổi (Stage 9A). 0: khối phẳng (viền); 1: khối chính của màn; 2: menu, nút nổi; 3: hộp thoại, bảng trượt. */
export const elevation = {
  0: { shadowOpacity: 0, elevation: 0 },
  1: shadow,
  2: { shadowColor: C.navy, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  3: { shadowColor: C.navy, shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
} as const;

/** Trạng thái tương tác dùng chung. disabled không dùng opacity: nền neutral + chữ textSoft (6,58:1) và luôn kèm lý do. */
export const interaction = {
  pressedOpacity: 0.8,
  focusRing: { color: C.primary, width: 2, offset: 2 },
  disabled: { bg: C.neutralSoft, fg: C.textSoft, border: C.border },
  selected: { bg: C.primary, fg: C.onPrimary },
  inputBorder: { rest: '#B4C1D0', focus: C.primary, error: C.red },
} as const;

/** Bố cục (Stage 9A). Lề ngang theo bề rộng: điện thoại 16, máy tính bảng 24, máy tính 32. */
export const layout = {
  gutter: { phone: 16, tablet: 24, desktop: 32 },
  /** Khoảng giữa các nhóm nội dung lớn trong một màn. */
  section: 24,
  /** Khoảng giữa các khối trong một nhóm. */
  block: 12,
  breakpoint: { tablet: 768, desktop: 1024 },
  /** Bề rộng nội dung tối đa ở màn rộng có thanh bên. */
  maxContentWide: 760,
} as const;

/** Chữ số đều bề rộng cho số liệu lâm sàng, giờ, mã (cột số thẳng hàng). */
export const numeric = { fontVariant: ['tabular-nums'] as ('tabular-nums')[] };
