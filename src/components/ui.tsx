// Bộ thành phần giao diện theo Best Flutter UI Templates (Fitness App):
// thanh tiêu đề trắng bo góc dưới trái 32, thẻ trắng bo 8/8/8/(32|68), TitleView, nút gradient.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useSegments } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { MONO, Text, TextInput } from '@/components/Text';
import { DEMO_ASSETS } from '@/lib/seed';
import type { WoundImage } from '@/lib/types';
import { bar, C, cardShape, G, radius, shadow, type GradientName, T } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Header({
  title, subtitle, back, right, children,
}: { title: string; subtitle?: string; back?: boolean; right?: ReactNode; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <View style={s.headerRow}>
        {back && (
          <Pressable hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={s.roundBtn} accessibilityRole="button" accessibilityLabel="Quay lại">
            <Ionicons name="chevron-back" size={22} color={C.grey} />
          </Pressable>
        )}
        <View style={{ flex: 1, paddingHorizontal: back ? 4 : 8 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={s.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export function HeaderButton({ icon, label, onPress }: { icon: IconName; label?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.headerBtn} hitSlop={4} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={18} color={C.primary} />
      {label ? <Text style={s.headerBtnText}>{label}</Text> : null}
    </Pressable>
  );
}

/** Chiều cao thanh tab (không kể vùng an toàn) và phần nút giữa nhô lên trên thanh. Dùng chung với RoleTabs. */
export const TAB_BAR_HEIGHT = 62;
export const FAB_RISE = 30;

/** Vai trò có thanh tab nổi ở đáy (RoleTabs); màn hình trong các nhóm này cần chừa chỗ cho thanh tab. */
const TAB_GROUPS = ['patient', 'doctor', 'admin'];

export function Screen({ children, header, padded = true }: { children: ReactNode; header?: ReactNode; padded?: boolean }) {
  const insets = useSafeAreaInsets();
  const segments = useSegments() as string[];
  const hasTabBar = TAB_GROUPS.includes(segments[0] ?? '');
  // Thanh tab cao TAB_BAR_HEIGHT + vùng an toàn, nút giữa nhô thêm FAB_RISE: chừa đủ để mục cuối không nằm dưới nút.
  // Kéo hết trang: mục cuối dừng ngay trên thanh tab (và trên phần nút giữa nhô lên, kể cả viền 4, nếu vai trò có nút giữa), chỉ chừa 8.
  // Quản trị không có nút giữa nên không cộng FAB_RISE. Màn không có thanh tab chỉ chừa vùng an toàn và 16.
  const hasFab = segments[0] === 'patient' || segments[0] === 'doctor';
  const bottom = hasTabBar ? TAB_BAR_HEIGHT + (hasFab ? FAB_RISE + 4 : 0) + insets.bottom + 8 : insets.bottom + 16;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, width: '100%', maxWidth: 1080, alignSelf: 'center' }}>
      {header}
      <ScrollView contentContainerStyle={[padded && { paddingHorizontal: 20, paddingTop: 18, gap: 16 }, { paddingBottom: bottom }]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; hero?: boolean; accessibilityLabel?: string }) {
  const shape = cardShape();
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={({ pressed }) => [s.card, shape, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, shape, style]}>{children}</View>;
}

/** Thẻ màu kiểu "Meals today": gradient, góc trên phải 54, chữ trắng. */
export function GradientCard({
  colors, title, lines, value, unit, icon, onPress, width = 150,
}: { colors: GradientName; title: string; lines: string[]; value?: string | number; unit?: string; icon: IconName; onPress?: () => void; width?: number }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, ...lines, value !== undefined ? `${value}${unit ? ' ' + unit : ''}` : ''].filter(Boolean).join(', ')}
      style={({ pressed }) => [{ width, paddingTop: 30, opacity: pressed ? 0.85 : 1 }]}>
      <LinearGradient
        colors={G[colors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[cardShape(), { flexGrow: 1, padding: 14, paddingTop: 48, minHeight: 196, gap: 6, shadowColor: G[colors][1], shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 1, height: 4 }, elevation: 4 }]}>
        <Text style={{ color: C.onPrimary, fontWeight: '700', fontSize: 16, letterSpacing: 0.2 }} numberOfLines={2}>{title}</Text>
        <View style={{ flex: 1 }}>
          {lines.map((l, i) => (
            <Text key={i} style={{ color: C.onPrimary, fontSize: 12, lineHeight: 17 }}>{l}</Text>
          ))}
        </View>
        {value !== undefined && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
            <Text style={{ color: C.onPrimary, fontWeight: '500', fontSize: 24, letterSpacing: 0.2 }}>{value}</Text>
            {unit ? <Text style={{ color: C.onPrimary, fontSize: 12, marginBottom: 4 }}>{unit}</Text> : null}
          </View>
        )}
      </LinearGradient>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ position: 'absolute', top: 0, left: 8, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(250,250,250,0.25)' }} />
      <View style={{ position: 'absolute', top: 6, left: 16, width: 54, height: 54, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={30} color={C.onPrimary} />
      </View>
    </Pressable>
  );
}

/** Vòng tiến độ như MediterraneanDietView (viền xanh và cung gradient). */
export function Ring({ value, max, label, sub, size = 108, color = C.primary }: { value: number; max: number; label: string; sub: string; size?: number; color?: string }) {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`${label} ${sub}`} accessibilityValue={{ min: 0, max: Math.max(max, 0), now: Math.min(value, max) }} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.primarySoft} strokeWidth={4} fill={C.card} />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={8} strokeLinecap="round" fill="none" strokeDasharray={`${circ * pct} ${circ}`} />
        </Svg>
      </View>
      <Text maxFontSizeMultiplier={1.3} style={{ fontWeight: '500', fontSize: T.stat, color: C.primary, letterSpacing: 0 }}>{label}</Text>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: T.caption, color: C.textSoft, fontWeight: '700' }}>{sub}</Text>
    </View>
  );
}

/** TitleView của mẫu: tiêu đề xám, bên phải chữ xanh kèm mũi tên. */
export function SectionTitle({ children, right, action, onAction }: { icon?: IconName; children: ReactNode; right?: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle} accessibilityRole="header">{children}</Text>
      <View style={{ flex: 1 }} />
      {right}
      {action && (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button" accessibilityLabel={action} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 4 }}>
          <Text style={{ color: C.primary, fontSize: T.label }}>{action}</Text>
          <Ionicons name="arrow-forward" size={16} color={C.primary} />
        </Pressable>
      )}
    </View>
  );
}

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'teal' | 'gray';
const TONES: Record<Tone, [string, string]> = {
  blue: [C.primarySoft, C.primary],
  green: [C.greenSoft, C.green],
  amber: [C.amberSoft, C.amber],
  red: [C.redSoft, C.red],
  violet: [C.violetSoft, C.violet],
  teal: [C.tealSoft, C.teal],
  gray: [C.neutralSoft, C.textSoft],
};
export const TONE_BAR: Record<Tone, string> = bar;

export function Chip({ label, tone = 'blue', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const [bg, fg] = TONES[tone];
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={12} color={fg} />}
      <Text style={[s.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function SimBadge() {
  return <Chip label="Dữ liệu mô phỏng" tone="amber" icon="flask-outline" />;
}

export function IconBadge({ icon, tone = 'blue', size = 40 }: { icon: IconName; tone?: Tone; size?: number }) {
  const [bg, fg] = TONES[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={size * 0.5} color={fg} />
    </View>
  );
}

export function Button({
  label, onPress, icon, variant = 'primary', disabled, loading, style,
}: {
  label: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const fg = { primary: C.onPrimary, secondary: C.primary, danger: C.red, ghost: C.primary }[variant];
  const inner = (
    <>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[s.btnText, { color: fg }]}>{label}</Text>
    </>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [{ opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }, variant === 'primary' && s.btnShadow, style]}>
      {variant === 'primary' ? (
        <LinearGradient colors={G.fab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={[s.btn, { backgroundColor: variant === 'secondary' ? C.onPrimary : variant === 'danger' ? C.redSoft : 'transparent' }, variant === 'secondary' && { borderWidth: 1.5, borderColor: C.primarySoft }]}>
          {inner}
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, error, ...props }: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={C.textFaint} {...props} style={[s.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, error ? { borderColor: C.red } : null, props.style]} />
      {error ? <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Choices<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityLabel={o.label} accessibilityState={{ checked: on, selected: on }} style={[s.choice, on && { backgroundColor: C.primary, borderColor: C.primary }]}>
            <Text style={{ color: on ? C.onPrimary : C.grey, fontWeight: '500', fontSize: T.label }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={s.seg} accessibilityRole="tablist">
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityLabel={o.label} accessibilityState={{ selected: value === o.value }} style={[s.segItem, value === o.value && s.segItemOn]}>
          <Text style={[s.segText, value === o.value && { color: C.onPrimary, fontWeight: '700' }]} numberOfLines={2}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Dòng nhãn và giá trị. Giá trị dài (trên 24 ký tự, hoặc nhãn cộng giá trị trên 38) tự xếp nhãn ở trên, giá trị ở dưới cỡ thân bài,
 * để màn 390 px không bị dồn hai cột chữ nhỏ (đề xuất 6).
 */
export function InfoRow({ label, value, mono, stack }: { label: string; value: ReactNode; mono?: boolean; stack?: boolean }) {
  const isText = typeof value === 'string' || typeof value === 'number';
  const stacked = stack ?? (isText && (String(value).length > 24 || label.length + String(value).length > 38));
  if (stacked) {
    return (
      <View style={{ gap: 2, paddingVertical: 4 }}>
        <Text style={s.infoLabel}>{label}</Text>
        {isText ? <Text style={[{ color: C.text, fontSize: T.body, fontWeight: '500' }, mono && { fontFamily: MONO, fontSize: T.caption }]} selectable>{value}</Text> : value}
      </View>
    );
  }
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      {isText ? (
        <Text style={[s.infoValue, mono && { fontFamily: MONO, fontSize: T.caption }]} selectable>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

/** Lưới số liệu ngắn 2 cột thay cho nhiều dòng nhãn và giá trị (đề xuất 6). */
export function StatGrid({ items }: { items: { label: string; value: string | number; tone?: 'amber' | 'red' | 'green' }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((it) => (
        <View key={it.label} accessible accessibilityLabel={`${it.label}: ${it.value}`} style={{ flexGrow: 1, flexBasis: '45%', padding: 10, borderRadius: radius.m, backgroundColor: it.tone === 'amber' ? C.amberSoft : it.tone === 'red' ? C.redSoft : it.tone === 'green' ? C.greenSoft : C.surfaceMuted }}>
          <Text style={{ fontSize: T.stat, fontWeight: '700', color: it.tone === 'amber' ? C.amber : it.tone === 'red' ? C.red : C.text }}>{it.value}</Text>
          <Text style={{ fontSize: T.small, color: C.textSoft }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function Stat({ value, label, tone = 'blue', unit }: { value: string | number; label: string; tone?: Tone; unit?: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}${unit ? ' ' + unit : ''}`} style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
      <View style={{ width: 2, borderRadius: 4, backgroundColor: TONE_BAR[tone], opacity: 0.8 }} />
      <View style={{ paddingVertical: 2, flex: 1, minWidth: 0 }}>
        <Text style={{ color: C.textSoft, fontWeight: '500', fontSize: T.small }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: T.cardTitle }}>{value}</Text>
          {unit ? <Text style={{ color: C.textSoft, fontSize: T.caption, marginBottom: 3 }}>{unit}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export function Empty({ icon = 'file-tray-outline', text }: { icon?: IconName; text: string }) {
  return (
    <View style={{ alignItems: 'center', padding: 20, gap: 8 }}>
      <Ionicons name={icon} size={30} color={C.textFaint} />
      <Text style={{ color: C.textSoft, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

export function WoundPhoto({ image, style }: { image: WoundImage; style?: StyleProp<ViewStyle> }) {
  const source = image.uri ? { uri: image.uri } : DEMO_ASSETS[image.demoAsset ?? 1];
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: C.photoPlaceholder }, style]}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
    </View>
  );
}

/** Khung lưu ý có biểu tượng (cảnh báo đồng bộ, dữ liệu chưa đủ). Không dùng màu làm tín hiệu duy nhất (WCAG 1.4.1). */
export function Notice({ children, tone = 'amber', icon = 'alert-circle-outline' }: { children: ReactNode; tone?: Tone; icon?: IconName }) {
  const [bg, fg] = TONES[tone];
  return (
    <View accessible accessibilityRole="alert" style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: radius.m, backgroundColor: bg }}>
      <Ionicons name={icon} size={22} color={fg} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, color: C.text, fontSize: T.small, lineHeight: 21 }}>{children}</Text>
    </View>
  );
}

/**
 * Dòng bật/tắt: cả dòng bấm được, cao tối thiểu 48 (theo mẫu ô tích của Trang chủ bệnh nhân),
 * nhãn bên trái, mô tả tùy chọn, công tắc bên phải. Công tắc trần chỉ khoảng 40 × 24.
 */
export function SwitchRow({ label, detail, value, onChange, disabled, muted }: { label: string; detail?: ReactNode; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; muted?: boolean }) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, paddingHorizontal: muted ? 12 : 8, marginHorizontal: muted ? 0 : -8, borderRadius: radius.m, backgroundColor: pressed ? C.neutralSoft : muted ? C.surfaceMuted : 'transparent' })}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: C.text, fontWeight: detail ? '600' : '400' }}>{label}</Text>
        {detail ? <Text style={{ color: C.textSoft, fontSize: T.small, lineHeight: 21 }}>{detail}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden />
    </Pressable>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[{ color: C.textSoft, fontSize: T.small, lineHeight: 21 }, style]}>{children}</Text>;
}

export function H({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return <Text style={{ color: C.text, fontSize: size, fontWeight: '700' }}>{children}</Text>;
}

export const s = StyleSheet.create({
  header: {
    backgroundColor: C.card, paddingHorizontal: 16, paddingBottom: 14, borderBottomLeftRadius: radius.sheet, borderBottomRightRadius: radius.sheet,
    shadowColor: C.grey, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 1.1, height: 1.1 }, elevation: 4, zIndex: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.text, fontSize: 22, fontWeight: '700', letterSpacing: 1.2 },
  headerSub: { color: C.textSoft, fontSize: T.small, marginTop: 2 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primarySoft, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, borderRadius: 22 },
  headerBtnText: { color: C.primary, fontWeight: '500', fontSize: T.small },
  card: { backgroundColor: C.card, padding: 16, gap: 10, ...shadow },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginTop: 4 },
  sectionTitle: { color: C.text, fontSize: T.cardTitle, fontWeight: '700', letterSpacing: 0.2, flexShrink: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  chipText: { fontSize: T.caption, fontWeight: '600' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 24 },
  btnShadow: { shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 4, height: 8 }, elevation: 5, borderRadius: 24 },
  btnText: { fontSize: T.body, fontWeight: '500', letterSpacing: 0.3 },
  label: { color: C.grey, fontSize: T.label, fontWeight: '500' },
  input: { backgroundColor: C.surfaceMuted, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: T.body, color: C.text },
  hint: { color: C.textFaint, fontSize: T.caption },
  error: { color: C.red, fontSize: T.caption, fontWeight: '500' },
  choice: { paddingHorizontal: 14, paddingVertical: 8, minHeight: 44, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  seg: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 24, padding: 4, gap: 4, ...shadow },
  segItem: { flex: 1, paddingVertical: 9, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  segItemOn: { backgroundColor: C.primary },
  segText: { color: C.grey, fontSize: T.label, fontWeight: '500', textAlign: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 },
  infoLabel: { color: C.textSoft, fontSize: T.label },
  infoValue: { color: C.text, fontSize: T.label, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
});
