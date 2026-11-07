import { Platform, StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps, type TextStyle } from 'react-native';

import { createContext, useContext } from 'react';

import { C, F, T } from '@/theme';

/** Font đơn cách: Menlo chỉ có trên iOS; Android dùng họ 'monospace' của hệ thống. */
export const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** Chọn tệp GoogleSansFlex theo độ đậm, vì font tùy chỉnh trên iOS cần tên riêng cho từng độ đậm. */
function withGoogleSansFlex(style: TextProps['style'], base: TextStyle): TextStyle {
  const flat = StyleSheet.flatten([base, style]) ?? {};
  if (flat.fontFamily && !flat.fontFamily.startsWith('GoogleSansFlex')) return flat;
  const w = String(flat.fontWeight ?? '400');
  const family = w === 'bold' || Number(w) >= 700 ? F.bold : Number(w) >= 500 ? F.medium : F.regular;
  const { fontWeight: _drop, ...rest } = flat;
  return { ...rest, fontFamily: family };
}

/** Hệ số cỡ chữ theo vai trò người đang đăng nhập (ROLE_SCALE trong theme.ts). */
export const FontScaleContext = createContext(1);

/** Nhân hệ số vai trò và chặn dưới T.min; lineHeight được nhân theo để dòng không chồng nhau. */
function scaled(style: TextStyle, k: number): TextStyle {
  const size = style.fontSize ?? T.body;
  const out = Math.max(T.min, Math.round(size * k * 2) / 2);
  const ratio = out / size;
  return { ...style, fontSize: out, ...(style.lineHeight ? { lineHeight: Math.round(style.lineHeight * ratio) } : {}) };
}

export function Text({ style, ...props }: TextProps) {
  const k = useContext(FontScaleContext);
  return <RNText {...props} style={scaled(withGoogleSansFlex(style, { color: C.textBody }), k)} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  const k = useContext(FontScaleContext);
  return <RNTextInput {...props} style={scaled(withGoogleSansFlex(style, {}), k)} />;
}
