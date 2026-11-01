// Ngôn ngữ thiết kế lấy theo Best Flutter UI Templates / Fitness App (fitness_app_theme.dart):
// nền xám nhạt, thẻ trắng bo 8/8/8/68, xanh "nearlyDarkBlue", thẻ gradient, font Google Sans Flex từ gói do người dùng cung cấp.
export const C = {
  primary: '#2633C5', // nearlyDarkBlue
  primaryDark: '#1E1466',
  primarySoft: '#E8EBFB',
  accent: '#00B6F0', // nearlyBlue
  periwinkle: '#87A0E5',
  bg: '#F2F3F8', // background
  card: '#FFFFFF',
  text: '#17262A', // darkerText
  textBody: '#253840', // darkText
  textSoft: '#4A6572', // lightText
  textFaint: '#5F707D', // tối hơn #8A9AA6 để đạt 4,5:1 trên nền trắng và nền xám
  grey: '#3A5160',
  border: '#E6E8F0',
  green: '#187B4E',
  greenSoft: '#E3F5EC',
  amber: '#A5590F',
  amberSoft: '#FDEFE0',
  red: '#CD203A',
  redSoft: '#FDE7EB',
  violet: '#5052D6',
  violetSoft: '#ECECFC',
  teal: '#0B768D',
  tealSoft: '#E0F4FA',
  /** Chữ và biểu tượng đặt trên nền màu đậm (primary, gradient, red). */
  onPrimary: '#FFFFFF',
  /** Chữ phụ trên nền primary hoặc gradient đậm. */
  onPrimarySoft: '#E4E8FF',
  /** Chữ phụ trên nền tối (khung camera). */
  onDarkSoft: '#D9E5EC',
  /** Nền nhạt cho ô nhập, khối mã, thanh tiến độ (gộp #F6F8FC, #F8F9FC, #EEF2F9, #F1F4FA). */
  surfaceMuted: '#F6F8FC',
  /** Nền của Chip tông xám. */
  neutralSoft: '#EDEFF4',
  /** Lớp phủ tối trên ảnh và camera. */
  scrim: 'rgba(0,0,0,0.7)',
  /** Nền tạm khi ảnh vết thương chưa tải xong. */
  photoPlaceholder: '#E9DCD3',
} as const;

/** Màu vạch, thanh biểu đồ, viền đồ họa (không dùng cho chữ; WCAG SC 1.4.11 yêu cầu 3:1 cho thành phần đồ họa). */
export const bar = {
  blue: '#87A0E5',
  green: '#5CC99A',
  amber: '#F1B440',
  red: '#F56E98',
  violet: '#8A98E8',
  teal: '#4FC3E0',
  gray: '#B8C2CC',
} as const;

/**
 * Bộ gradient của thẻ "Meals today" và nút giữa thanh tab.
 * Mọi điểm dừng đều đạt tối thiểu 4,5:1 với chữ trắng (WCAG 2.2 SC 1.4.3),
 * vì thẻ có chữ cỡ 11 đến 16, chưa đủ điều kiện "chữ lớn".
 */
export const G = {
  coral: ['#C8443F', '#C94A2C'],
  indigo: ['#5468D4', '#5C5EDD'],
  pink: ['#D6336C', '#C2185B'],
  night: ['#5F62C2', '#1E1466'],
  fab: ['#2633C5', '#4A62D8'],
} as const;
export type GradientName = keyof typeof G;

export const gradient = G.fab;

export const radius = { s: 8, m: 12, l: 16 } as const;

/** Thẻ bất đối xứng của mẫu: ba góc 8, góc trên phải lớn. */
export const cardShape = (topRight = 32) => ({
  borderTopLeftRadius: 8,
  borderBottomLeftRadius: 8,
  borderBottomRightRadius: 8,
  borderTopRightRadius: topRight,
});

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
