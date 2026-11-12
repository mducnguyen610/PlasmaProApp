// Bộ thành phần giao diện theo Best Flutter UI Templates (Fitness App):
// thanh tiêu đề trắng bo góc dưới trái 32, thẻ trắng bo 8/8/8/(32|68), TitleView, nút gradient.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useSegments } from 'expo-router';
import { Children, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Switch, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { MONO, Text, TextInput } from '@/components/Text';
import { DEMO_ASSETS } from '@/lib/seed';
import { useStore } from '@/lib/store';
import type { Role, WoundImage } from '@/lib/types';
import { bar, C, cardShape, elevation, G, radius, interaction, radiusExtra, semantic, type Semantic, shadow, size, type GradientName, T, type Tone, typeScale, space } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Header({
  title, subtitle, back, right, children,
}: { title: string; subtitle?: string; back?: boolean; right?: ReactNode; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { me } = useStore();
  return (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <View style={s.headerRow}>
        {back && (
          <Pressable hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={s.roundBtn} accessibilityRole="button" accessibilityLabel="Quay lại">
            <Ionicons name="chevron-back" size={22} color={C.grey} />
          </Pressable>
        )}
        {/* Vai trò hiện bằng ô tròn có biểu tượng làm điểm neo bên trái (rủi ro R9 máy dùng chung); trình đọc màn hình đọc tên vai trò.
            Màn có nút quay lại dùng biểu tượng nhỏ trước dòng phụ để không chật. Tiêu đề và dòng phụ chỉ còn hai dòng. */}
        {me && !back ? <RoleAvatar role={me.role} /> : null}
        <View style={{ flex: 1, paddingHorizontal: back ? 4 : 10 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
          {/* Biểu tượng vai trò không đứng một mình (V21): màn không có dòng phụ thì ghi tên vai trò cạnh biểu tượng. */}
          {(me && back) || subtitle ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              {me && back ? <View accessible accessibilityLabel={`Vai trò: ${ROLE_BADGE[me.role].label}`}><Ionicons name={ROLE_BADGE[me.role].icon} size={14} color={C.textSoft} /></View> : null}
              <Text style={[s.headerSub, { marginTop: 0, flexShrink: 1 }]} numberOfLines={2}>{subtitle || (me ? ROLE_BADGE[me.role].label : '')}</Text>
            </View>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

const ROLE_BADGE: Record<Role, { label: string; icon: IconName }> = {
  patient: { label: 'Bệnh nhân', icon: 'person' },
  doctor: { label: 'Bác sĩ', icon: 'medkit' },
  admin: { label: 'Quản trị viên', icon: 'construct' },
};

/** Ô tròn vai trò ở đầu thanh tiêu đề. */
export function RoleAvatar({ role }: { role: Role }) {
  const b = ROLE_BADGE[role];
  return (
    <View accessible accessibilityLabel={`Vai trò: ${b.label}`} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={b.icon} size={22} color={C.primary} />
    </View>
  );
}

/** Nhãn vai trò: biểu tượng và chữ, nền xám nhạt chung cho cả ba vai trò (không dùng màu riêng theo vai trò). */
export function RoleBadge({ role }: { role: Role }) {
  const b = ROLE_BADGE[role];
  return (
    <View accessible accessibilityLabel={`Vai trò: ${b.label}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: C.neutralSoft }}>
      <Ionicons name={b.icon} size={12} color={C.textSoft} />
      <Text style={{ fontSize: T.caption, fontWeight: '600', color: C.textSoft }}>{b.label}</Text>
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
      {/* Nội dung không rộng quá size.maxContent (cộng lề 2 x 20) để dòng chữ và nút không giãn hết khổ máy tính bảng (A08). */}
      <ScrollView contentContainerStyle={[padded && { paddingHorizontal: 20, paddingTop: 18, gap: space.l }, { paddingBottom: bottom, width: '100%', maxWidth: size.maxContent + 40, alignSelf: 'center' }]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

/**
 * Thẻ. Thứ bậc (rà soát thiết kế 12/11/2026): chỉ thẻ chính của màn (`hero`) có bóng; thẻ phụ phẳng, viền mảnh,
 * để thẻ quan trọng nhất nổi lên thay vì mọi khối trông ngang nhau.
 */
export function Card({ children, style, onPress, hero, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; hero?: boolean; accessibilityLabel?: string }) {
  const shape = [cardShape(), hero ? shadow : s.cardFlat];
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
        <Text style={{ color: C.onPrimary, fontWeight: '700', fontSize: T.body, letterSpacing: 0.2 }} numberOfLines={2}>{title}</Text>
        <View style={{ flex: 1 }}>
          {lines.map((l, i) => (
            <Text key={i} style={{ color: C.onPrimary, fontSize: T.min, lineHeight: 17 }}>{l}</Text>
          ))}
        </View>
        {value !== undefined && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
            <Text style={{ color: C.onPrimary, fontWeight: '500', fontSize: T.stat, letterSpacing: 0.2 }}>{value}</Text>
            {unit ? <Text style={{ color: C.onPrimary, fontSize: T.min, marginBottom: 4 }}>{unit}</Text> : null}
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
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button" accessibilityLabel={action} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44, paddingHorizontal: 4 }}>
          <Text style={{ color: C.primary, fontSize: T.label, fontWeight: '600' }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

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

/** Chip trạng thái theo bảng trong src/theme.status.ts: tông lấy từ vai trò ngữ nghĩa, luôn kèm biểu tượng và chữ. */
export function StatusChip({ status, label }: { status: { role: Semantic; icon: string }; label: string }) {
  return <Chip label={label} tone={semantic[status.role].tone} icon={(status.icon || undefined) as IconName | undefined} />;
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
  label, onPress, icon, variant = 'primary', disabled, loading, style, reason,
}: {
  /** dangerSolid: hành động dừng hoặc nguy hiểm cần thấy ngay (Dừng chiếu ở T02), nền đỏ đặc, cao size.buttonDanger. */
  label: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'secondary' | 'danger' | 'dangerSolid' | 'ghost';
  disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>;
  /** Lý do nút đang khóa, hiện ngay dưới nút (V20). Chỉ hiện khi disabled. */
  reason?: string;
}) {
  const off = !!disabled && !loading;
  const fg = off ? interaction.disabled.fg : { primary: C.onPrimary, secondary: C.primary, danger: C.red, dangerSolid: C.onPrimary, ghost: C.primary }[variant];
  const inner = (
    <>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[s.btnText, { color: fg }]}>{label}</Text>
    </>
  );
  const btn = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={off ? reason : undefined}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [{ opacity: pressed && !off ? interaction.pressedOpacity : 1 }, variant === 'primary' && !off && s.btnShadow, !reason && style]}>
      {/* Nút khóa: nền neutral, chữ textSoft (6,58:1), không bóng; bản cũ giảm độ mờ còn 2,2:1. */}
      {off ? (
        <View style={[s.btn, { backgroundColor: variant === 'ghost' ? 'transparent' : interaction.disabled.bg }, variant === 'dangerSolid' && { minHeight: size.buttonDanger }]}>
          {inner}
        </View>
      ) : variant === 'primary' ? (
        <LinearGradient colors={G.fab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={[s.btn, { backgroundColor: variant === 'secondary' ? C.onPrimary : variant === 'danger' ? C.redSoft : variant === 'dangerSolid' ? semantic.danger.solid! : 'transparent' }, variant === 'secondary' && { borderWidth: 1.5, borderColor: C.primarySoft }, variant === 'dangerSolid' && { minHeight: size.buttonDanger }]}>
          {inner}
        </View>
      )}
    </Pressable>
  );
  if (!reason) return btn;
  return (
    <View style={[{ gap: 6 }, style]}>
      {btn}
      {off ? <Text style={s.hint}>{reason}</Text> : null}
    </View>
  );
}

/**
 * Trên web, trình duyệt vẽ vòng focus mặc định (outline: auto) đè lên viền ô nhập; outline-width không tắt được kiểu auto.
 * Kiểu RN chưa khai báo 'none' nên ép kiểu; chỉ áp trên web, trạng thái focus vẫn hiện bằng viền 2 px primary (A07).
 */
const NO_OUTLINE = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as unknown as TextStyle;

/**
 * Ô tìm kiếm có biểu tượng kính lúp. Cùng viền và trạng thái focus với Field (interaction.inputBorder), không có nhãn hiển thị
 * nên bắt buộc truyền accessibilityLabel qua label (A07, audit lần 2).
 */
export function SearchField({ label, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingVertical: 0 }, focused && { borderColor: interaction.inputBorder.focus, borderWidth: 2, paddingHorizontal: 13 }]}>
      <Ionicons name="search" size={size.icon.s} color={C.textSoft} />
      <TextInput accessibilityLabel={label} placeholderTextColor={C.textFaint} autoCorrect={false} {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={{ flex: 1, minHeight: size.input - 2, fontSize: T.body, color: C.text, ...NO_OUTLINE }} />
    </View>
  );
}

/** optional: ghi "(không bắt buộc)" sau nhãn (V13). Viền theo interaction.inputBorder: nghỉ, đang nhập, lỗi. */
export function Field({ label, hint, error, optional, ...props }: TextInputProps & { label: string; hint?: string; error?: string | null; optional?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}{optional ? <Text style={{ color: C.textSoft, fontWeight: '400' }}> (không bắt buộc)</Text> : null}</Text>
      <TextInput accessibilityLabel={optional ? `${label}, không bắt buộc` : label} placeholderTextColor={C.textFaint} {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={[s.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, focused && { borderColor: interaction.inputBorder.focus, borderWidth: 2, paddingHorizontal: 13, paddingVertical: 11 }, error ? { borderColor: interaction.inputBorder.error } : null, props.style]} />
      {error ? <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Choices<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; a11y?: string }[]; onChange: (v: T) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityLabel={o.a11y ?? o.label} accessibilityState={{ checked: on, selected: on }} style={[s.choice, on && { backgroundColor: C.primary, borderColor: C.primary }]}>
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
      <View style={{ gap: space.xxs, paddingVertical: 4 }}>
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
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
      {items.map((it) => (
        <View key={it.label} accessible accessibilityLabel={`${it.label}: ${it.value}`} style={{ flexGrow: 1, flexBasis: '45%', padding: 10, borderRadius: radius.m, backgroundColor: it.tone === 'amber' ? C.amberSoft : it.tone === 'red' ? C.redSoft : it.tone === 'green' ? C.greenSoft : C.surfaceMuted }}>
          <Text style={{ fontSize: typeScale.stat.size, lineHeight: typeScale.stat.line, fontWeight: '700', color: it.tone === 'amber' ? C.amber : it.tone === 'red' ? C.red : C.text }}>{it.value}</Text>
          <Text style={{ fontSize: T.small, color: C.textSoft }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function Stat({ value, label, tone = 'blue', unit }: { value: string | number; label: string; tone?: Tone; unit?: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}${unit ? ' ' + unit : ''}`} style={{ flex: 1, flexDirection: 'row', gap: space.s }}>
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
    <View style={{ alignItems: 'center', padding: 20, gap: space.s }}>
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
      style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: 6, paddingHorizontal: muted ? 12 : 8, marginHorizontal: muted ? 0 : -8, borderRadius: radius.m, backgroundColor: pressed ? C.neutralSoft : muted ? C.surfaceMuted : 'transparent' })}>
      <View style={{ flex: 1, gap: space.xxs }}>
        <Text style={{ color: C.text, fontWeight: detail ? '600' : '400' }}>{label}</Text>
        {detail ? <Text style={{ color: C.textSoft, fontSize: T.small, lineHeight: 21 }}>{detail}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden />
    </Pressable>
  );
}

/**
 * Mục thu gọn: một dòng tiêu đề (biểu tượng, tên, tóm tắt ngắn bên phải), chạm để mở nội dung.
 * Dùng cho thông tin xem khi cần (liều, giải thích, công tắc quản trị), giữ màn hình ít chữ.
 */
export function Disclosure({ title, summary, icon, children, initiallyOpen = false, summaryTone, right, below }: { title: string; summary?: string; icon?: IconName; children: ReactNode; initiallyOpen?: boolean; summaryTone?: string; right?: ReactNode; below?: ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={{ gap: 10 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={summary ? `${title}, ${summary}` : title}
        style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {icon ? <Ionicons name={icon} size={22} color={C.primary} /> : null}
        <View style={{ flex: 1, gap: space.xxs }}>
          <Text style={{ color: C.text, fontWeight: '700' }}>{title}</Text>
          {summary ? <Text style={{ color: summaryTone ?? C.textSoft, fontSize: T.small }} numberOfLines={2}>{summary}</Text> : null}
          {/* below: chip trạng thái nằm dưới tiêu đề khi đặt bên phải sẽ ép tiêu đề xuống dòng (A09). */}
          {below ? <View style={{ flexDirection: 'row', marginTop: 2 }}>{below}</View> : null}
        </View>
        {right}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={C.textSoft} />
      </Pressable>
      {open ? children : null}
    </View>
  );
}

/** Đường kẻ mảnh tách các phần trong cùng một thẻ, thay cho việc tách thành nhiều thẻ. */
/**
 * Liên kết dạng chữ (Sửa đợt, So sánh, Xem đầy đủ...): có vai trò nút cho trình đọc màn hình
 * và vùng chạm cao tối thiểu 44 pt (Apple HIG 44 pt) dù chữ chỉ cao khoảng 20 pt.
 */
export function TextLink({ label, onPress, tone = C.primary, accessibilityLabel }: { label: string; onPress: () => void; tone?: string; accessibilityLabel?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => ({ minHeight: 44, minWidth: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ color: tone, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

/**
 * Thanh các bước của một luồng (T01, B06): bước đã qua có dấu tích, bước hiện tại tô màu chính. step đếm từ 1.
 * onStep: cho phép chạm để chuyển bước (B06), mỗi bước thành một tab có vùng chạm 44.
 */
export function StepRow({ steps, step, onStep }: { steps: string[]; step: number; onStep?: (step: number) => void }) {
  return (
    <View accessibilityRole={onStep ? 'tablist' : 'progressbar'} accessibilityLabel={`Bước ${step} trên ${steps.length}: ${steps[step - 1]}`} style={{ flexDirection: 'row', gap: 6 }}>
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        const inner = (
          <>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: done || current ? C.primary : C.border }} />
            <Text style={{ fontSize: T.caption, color: current ? C.text : C.textSoft, fontWeight: current ? '700' : '400' }}>{done ? `✓ ${label}` : `${n}. ${label}`}</Text>
          </>
        );
        return onStep ? (
          <Pressable key={label} onPress={() => onStep(n)} accessibilityRole="tab" accessibilityLabel={`${n}. ${label}`} accessibilityState={{ selected: current }} style={{ flex: 1, gap: space.xs, minHeight: size.touch, justifyContent: 'center' }}>
            {inner}
          </Pressable>
        ) : (
          <View key={label} style={{ flex: 1, gap: space.xs }}>{inner}</View>
        );
      })}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />;
}

/** Một thẻ chứa cả danh sách: các mục cùng loại xếp thành dòng, tách bằng đường kẻ (kiểu inset grouped). */
export function ListCard({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return (
    <Card style={{ gap: 0, paddingVertical: 4 }}>
      {items.map((c, i) => (
        <View key={i}>
          {i > 0 && <View style={{ height: 1, backgroundColor: C.border }} />}
          {c}
        </View>
      ))}
    </Card>
  );
}

/** Ô số lớn làm điểm neo (đếm việc, tổng quan). Bấm được nếu có onPress. */
export function NumberTile({ value, label, tone = 'blue', icon, onPress }: { value: string | number; label: string; tone?: Tone; icon?: IconName; onPress?: () => void }) {
  const [bg, fg] = TONES[tone];
  const isCode = typeof value === 'string' && /^[A-Za-z]{1,4}-\d+$/.test(value);
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${value} ${label}`}
      style={({ pressed }) => ({ flexGrow: 1, flexBasis: '30%', minHeight: 88, padding: 12, gap: space.xxs, borderRadius: radius.m, backgroundColor: bg, opacity: pressed ? 0.8 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
        {/* Giá trị là mã thiết bị (dạng TB-001) thì dùng cỡ nhỏ hơn và không bẻ dòng: mã bị bẻ giữa chừng khó đọc (A09). */}
        <Text numberOfLines={isCode ? 1 : undefined} style={{ fontSize: isCode ? T.screenTitle : typeScale.stat.size, lineHeight: typeScale.stat.line, fontWeight: '700', color: fg, flexShrink: 1 }}>{value}</Text>
      </View>
      <Text style={{ fontSize: T.small, color: C.text, fontWeight: '600' }}>{label}</Text>
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
    ...elevation[3], zIndex: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.text, fontSize: T.screenTitle, fontWeight: '700', letterSpacing: 0.2 },
  headerSub: { color: C.textSoft, fontSize: T.small, marginTop: 2 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: C.primarySoft, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, borderRadius: 22 },
  headerBtnText: { color: C.primary, fontWeight: '500', fontSize: T.small },
  card: { backgroundColor: C.card, padding: 16, gap: 10 },
  cardFlat: { borderWidth: 1, borderColor: C.cardBorder },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginTop: 4 },
  sectionTitle: { color: C.text, fontSize: typeScale.sectionTitle.size, lineHeight: typeScale.sectionTitle.line, fontWeight: '700', letterSpacing: 0.2, flexShrink: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  chipText: { fontSize: T.caption, fontWeight: '600' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 24 },
  btnShadow: { ...elevation[2], borderRadius: radiusExtra.button },
  btnText: { fontSize: T.body, fontWeight: '500', letterSpacing: 0.3 },
  label: { color: C.grey, fontSize: T.label, fontWeight: '500' },
  // outlineStyle none: tắt vòng focus mặc định của trình duyệt; trạng thái focus do viền 2 px màu primary đảm nhận (A07).
  input: { backgroundColor: C.surfaceMuted, borderWidth: 1, borderColor: interaction.inputBorder.rest, borderRadius: radiusExtra.input, minHeight: size.input, paddingHorizontal: 14, paddingVertical: 12, fontSize: T.body, color: C.text, ...NO_OUTLINE },
  hint: { color: C.textFaint, fontSize: T.caption },
  error: { color: C.red, fontSize: T.caption, fontWeight: '500' },
  choice: { paddingHorizontal: 14, paddingVertical: 8, minHeight: 44, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  seg: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 24, padding: 4, gap: space.xs, ...shadow },
  segItem: { flex: 1, paddingVertical: 9, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  segItemOn: { backgroundColor: C.primary },
  segText: { color: C.grey, fontSize: T.label, fontWeight: '500', textAlign: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.m, paddingVertical: 4 },
  infoLabel: { color: C.textSoft, fontSize: T.label },
  infoValue: { color: C.text, fontSize: T.label, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
});
