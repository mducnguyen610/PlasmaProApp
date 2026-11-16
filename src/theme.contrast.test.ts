// Chạy: node src/theme.contrast.test.ts
// Kiểm tra tỉ lệ tương phản của các cặp màu chữ/nền trong theme theo công thức WCAG 2.2
// (relative luminance, SC 1.4.3 Contrast (Minimum): chữ thường cần tối thiểu 4,5:1).
import assert from 'node:assert/strict';
import { C, G } from './theme.ts';

function lum(hex: string): number {
  const h = hex.replace('#', '');
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5;
const pairs: [string, string, string][] = [
  ['text/bg', C.text, C.bg],
  ['textBody/card', C.textBody, C.card],
  ['textSoft/card', C.textSoft, C.card],
  ['textSoft/bg', C.textSoft, C.bg],
  ['textSoft/surfaceMuted', C.textSoft, C.surfaceMuted],
  ['textFaint/card', C.textFaint, C.card],
  ['textFaint/bg', C.textFaint, C.bg],
  ['textFaint/surfaceMuted', C.textFaint, C.surfaceMuted],
  ['primary/primarySoft', C.primary, C.primarySoft],
  ['textSoft/primarySoft', C.textSoft, C.primarySoft],
  ['textFaint/primarySoft', C.textFaint, C.primarySoft],
  ['textFaint/neutralSoft', C.textFaint, C.neutralSoft],
  ['text/amberSoft (khung lưu ý)', C.text, C.amberSoft],
  ['green/greenSoft', C.green, C.greenSoft],
  ['amber/amberSoft', C.amber, C.amberSoft],
  ['red/redSoft', C.red, C.redSoft],
  ['violet/violetSoft', C.violet, C.violetSoft],
  ['teal/tealSoft', C.teal, C.tealSoft],
  ['textSoft/neutralSoft', C.textSoft, C.neutralSoft],
  ['green/card', C.green, C.card],
  ['amber/card', C.amber, C.card],
  ['red/card', C.red, C.card],
  ['onPrimary/red', C.onPrimary, C.red],
  ['onPrimary/primary', C.onPrimary, C.primary],
  // Stage 9A: thanh nhận diện, thanh bên, bảng điều khiển T02 (nền navy) và mòng két chọn lọc.
  ['onPrimary/navy', C.onPrimary, C.navy],
  ['onPrimarySoft/navy', C.onPrimarySoft, C.navy],
  ['brandMint/navy', C.brandMint, C.navy],
  ['onNavyWarn/navy', C.onNavyWarn, C.navy],
  ['onNavyDanger/navy', C.onNavyDanger, C.navy],
  ['accent/card', C.accent, C.card],
  ['text/surfaceMuted', C.text, C.surfaceMuted],
  ['textBody/surfaceMuted', C.textBody, C.surfaceMuted],
  ['primary/bg', C.primary, C.bg],
  ['primary/card', C.primary, C.card],
];
for (const [name, fg, bg] of pairs) {
  const r = contrast(fg, bg);
  assert.ok(r >= AA, `${name}: ${r.toFixed(2)}:1 < ${AA}:1`);
}
// Chữ trắng trên mọi điểm dừng của gradient.
for (const [name, stops] of Object.entries(G)) {
  for (const stop of stops) {
    const r = contrast(C.onPrimary, stop);
    assert.ok(r >= AA, `gradient ${name} ${stop}: ${r.toFixed(2)}:1 < ${AA}:1`);
  }
}
console.log('theme: mọi cặp màu chữ/nền đạt WCAG AA (4,5:1)');
