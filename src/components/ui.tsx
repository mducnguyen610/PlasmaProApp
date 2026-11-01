// Bộ thành phần giao diện theo Best Flutter UI Templates (Fitness App):
// thanh tiêu đề trắng bo góc dưới trái 32, thẻ trắng bo 8/8/8/(32|68), TitleView, nút gradient.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Text, TextInput } from '@/components/Text';
import { DEMO_ASSETS } from '@/lib/seed';
import type { WoundImage } from '@/lib/types';
import { C, cardShape, G, shadow, type GradientName } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Header({
  title, subtitle, back, right, children,
}: { title: string; subtitle?: string; back?: boolean; right?: ReactNode; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <View style={s.headerRow}>
        {back && (
          <Pressable hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={s.roundBtn} accessibilityLabel="Quay lại">
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
    <Pressable onPress={onPress} style={s.headerBtn} accessibilityLabel={label}>
      <Ionicons name={icon} size={18} color={C.primary} />
      {label ? <Text style={s.headerBtnText}>{label}</Text> : null}
    </Pressable>
  );
}

export function Screen({ children, header, padded = true }: { children: ReactNode; header?: ReactNode; padded?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, width: '100%', maxWidth: 1080, alignSelf: 'center' }}>
      {header}
      <ScrollView contentContainerStyle={[padded && { paddingHorizontal: 20, paddingTop: 18, gap: 16 }, { paddingBottom: 110 }]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

export function Card({ children, style, onPress, hero }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; hero?: boolean }) {
  const shape = cardShape(hero ? 68 : 32);
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.card, shape, style, pressed && { opacity: 0.85 }]}>
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
    <Pressable onPress={onPress} style={({ pressed }) => [{ width, paddingTop: 30, opacity: pressed ? 0.85 : 1 }]}>
      <LinearGradient
        colors={G[colors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[cardShape(54), { padding: 14, paddingTop: 48, height: 196, gap: 6, shadowColor: G[colors][1], shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 1, height: 4 }, elevation: 4 }]}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.2 }} numberOfLines={2}>{title}</Text>
        <View style={{ flex: 1 }}>
          {lines.map((l, i) => (
            <Text key={i} style={{ color: '#fff', fontSize: 11, lineHeight: 16 }} numberOfLines={2}>{l}</Text>
          ))}
        </View>
        {value !== undefined && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
            <Text style={{ color: '#fff', fontWeight: '500', fontSize: 24, letterSpacing: 0.2 }}>{value}</Text>
            {unit ? <Text style={{ color: '#fff', fontSize: 10, marginBottom: 4 }}>{unit}</Text> : null}
          </View>
        )}
      </LinearGradient>
      <View style={{ position: 'absolute', top: 0, left: 8, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(250,250,250,0.25)' }} />
      <View style={{ position: 'absolute', top: 6, left: 16, width: 54, height: 54, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={30} color="#fff" />
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
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.primarySoft} strokeWidth={4} fill="#fff" />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={8} strokeLinecap="round" fill="none" strokeDasharray={`${circ * pct} ${circ}`} />
        </Svg>
      </View>
      <Text style={{ fontWeight: '500', fontSize: 24, color: C.primary, letterSpacing: 0 }}>{label}</Text>
      <Text style={{ fontSize: 12, color: C.textSoft, fontWeight: '700' }}>{sub}</Text>
    </View>
  );
}

/** TitleView của mẫu: tiêu đề xám, bên phải chữ xanh kèm mũi tên. */
export function SectionTitle({ children, right, action, onAction }: { icon?: IconName; children: ReactNode; right?: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{children}</Text>
      <View style={{ flex: 1 }} />
      {right}
      {action && (
        <Pressable onPress={onAction} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: C.primary, fontSize: 15 }}>{action}</Text>
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
  gray: ['#EDEFF4', C.textSoft],
};
export const TONE_BAR: Record<Tone, string> = { blue: '#87A0E5', green: '#5CC99A', amber: '#F1B440', red: '#F56E98', violet: '#8A98E8', teal: '#4FC3E0', gray: '#B8C2CC' };

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
  const fg = { primary: '#fff', secondary: C.primary, danger: C.red, ghost: C.primary }[variant];
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
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [{ opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }, variant === 'primary' && s.btnShadow, style]}>
      {variant === 'primary' ? (
        <LinearGradient colors={G.fab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={[s.btn, { backgroundColor: variant === 'secondary' ? '#fff' : variant === 'danger' ? C.redSoft : 'transparent' }, variant === 'secondary' && { borderWidth: 1.5, borderColor: C.primarySoft }]}>
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
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Choices<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.choice, on && { backgroundColor: C.primary, borderColor: C.primary }]}>
            <Text style={{ color: on ? '#fff' : C.grey, fontWeight: '500', fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={s.seg}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segItem, value === o.value && s.segItemOn]}>
          <Text style={[s.segText, value === o.value && { color: '#fff', fontWeight: '700' }]} numberOfLines={1}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function InfoRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={[s.infoValue, mono && { fontFamily: 'Menlo', fontSize: 12 }]} selectable>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

/** Chỉ số kiểu "Eaten / Burned": vạch màu dọc, nhãn xám nhạt, số đậm. */
export function Stat({ value, label, tone = 'blue', unit }: { value: string | number; label: string; tone?: Tone; unit?: string }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
      <View style={{ width: 2, borderRadius: 4, backgroundColor: TONE_BAR[tone], opacity: 0.8 }} />
      <View style={{ paddingVertical: 2 }}>
        <Text style={{ color: C.textSoft, fontWeight: '500', fontSize: 13 }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 18 }}>{value}</Text>
          {unit ? <Text style={{ color: C.textSoft, fontSize: 11, marginBottom: 3 }}>{unit}</Text> : null}
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
    <View style={[{ overflow: 'hidden', backgroundColor: '#E9DCD3' }, style]}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
    </View>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[{ color: C.textSoft, fontSize: 13, lineHeight: 19 }, style]}>{children}</Text>;
}

export function H({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return <Text style={{ color: C.text, fontSize: size, fontWeight: '700' }}>{children}</Text>;
}

export const s = StyleSheet.create({
  header: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 14, borderBottomLeftRadius: 32,
    shadowColor: C.grey, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 1.1, height: 1.1 }, elevation: 4, zIndex: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  roundBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.text, fontSize: 22, fontWeight: '700', letterSpacing: 1.2 },
  headerSub: { color: C.textSoft, fontSize: 13, marginTop: 2 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primarySoft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 19 },
  headerBtnText: { color: C.primary, fontWeight: '500', fontSize: 13 },
  card: { backgroundColor: C.card, padding: 16, gap: 10, ...shadow },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginTop: 4 },
  sectionTitle: { color: C.textSoft, fontSize: 18, fontWeight: '500', letterSpacing: 0.5 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  chipText: { fontSize: 12, fontWeight: '500' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 24 },
  btnShadow: { shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 4, height: 8 }, elevation: 5, borderRadius: 24 },
  btnText: { fontSize: 15, fontWeight: '500', letterSpacing: 0.3 },
  label: { color: C.grey, fontSize: 13, fontWeight: '500' },
  input: { backgroundColor: '#F8F9FC', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text },
  hint: { color: C.textFaint, fontSize: 12 },
  error: { color: C.red, fontSize: 12, fontWeight: '500' },
  choice: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  seg: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 24, padding: 4, gap: 4, ...shadow },
  segItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 20 },
  segItemOn: { backgroundColor: C.primary },
  segText: { color: C.grey, fontSize: 13, fontWeight: '500' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 3 },
  infoLabel: { color: C.textSoft, fontSize: 13 },
  infoValue: { color: C.text, fontSize: 13, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
});
