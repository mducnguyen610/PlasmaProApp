// Chạy: node src/theme.status.test.ts
// Kiểm tra token design system: vai trò ngữ nghĩa đạt WCAG AA, biểu tượng có trong Ionicons, ngưỡng độ tin cậy AI.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { C, interaction, semantic, size, space } from './theme.ts';
import * as S from './theme.status.ts';
import { contrast } from './theme.contrast.test.ts';

const AA = 4.5;
for (const [role, v] of Object.entries(semantic)) {
  assert.ok(contrast(v.fg, v.bg) >= AA, `${role} fg/bg ${contrast(v.fg, v.bg).toFixed(2)}`);
  assert.ok(contrast(v.fg, C.card) >= AA, `${role} fg/card ${contrast(v.fg, C.card).toFixed(2)}`);
  if (v.solid) assert.ok(contrast(C.onPrimary, v.solid) >= AA, `${role} trắng/solid ${contrast(C.onPrimary, v.solid).toFixed(2)}`);
  // Vạch biểu đồ là thành phần đồ họa: SC 1.4.11 cần 3:1 với nền thẻ chỉ khi vạch mang thông tin một mình; ở đây luôn kèm nhãn số, nên chỉ ghi nhận.
}
// Nút bị khóa: chữ đọc được (V20: bản cũ chỉ 2,2:1).
assert.ok(contrast(interaction.disabled.fg, interaction.disabled.bg) >= AA, 'disabled');
assert.ok(size.touch >= 44 && size.input >= 44 && size.button >= 44, 'vùng chạm tối thiểu 44');
assert.deepEqual(Object.values(space), [...Object.values(space)].sort((a, b) => a - b), 'space tăng dần');

// Mọi biểu tượng có trong bộ Ionicons đang cài.
const glyphs = JSON.parse(readFileSync(new URL('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json', import.meta.url), 'utf8'));
const tables = { USB_LINK: S.USB_LINK, CLOUD_LINK: S.CLOUD_LINK, SEND_RESULT: S.SEND_RESULT, SESSION: S.SESSION, ADHERENCE_DAY: S.ADHERENCE_DAY, PLAN: S.PLAN, WOUND: S.WOUND, SEVERITY_ROLE: S.SEVERITY_ROLE, TREND_ROLE: S.TREND_ROLE, SOURCE: S.SOURCE, AI_CONFIDENCE: S.AI_CONFIDENCE, LABEL: S.LABEL };
for (const [name, table] of Object.entries(tables)) {
  for (const [k, v] of Object.entries(table as Record<string, S.StatusStyle>)) {
    assert.ok(v.role in semantic, `${name}.${k}: vai trò ${v.role}`);
    if (v.icon) assert.ok(v.icon in glyphs, `${name}.${k}: thiếu biểu tượng ${v.icon}`);
  }
}

// Quy tắc nghĩa màu (DESIGN_SYSTEM.md mục 6).
assert.equal(S.SESSION.running.role, 'info', 'đang chiếu không dùng success');
assert.equal(S.SESSION.stopped.role, 'warning', 'buổi gián đoạn là warning (V03)');
assert.notEqual(S.AI_CONFIDENCE.high.role, 'success', 'kết quả AI chưa xác nhận không dùng success');
assert.notEqual(S.CLOUD_LINK.online.label, 'Đang kết nối', 'kênh Wi-Fi không dùng chữ "kết nối" (V02)');
assert.equal(S.SEVERITY_ROLE.mild.role, 'neutral');

// Ngưỡng độ tin cậy.
assert.equal(S.aiConfidenceLevel(null), 'unknown');
assert.equal(S.aiConfidenceLevel(Number.NaN), 'unknown');
assert.equal(S.aiConfidenceLevel(0.9), 'high');
assert.equal(S.aiConfidenceLevel(0.8), 'high');
assert.equal(S.aiConfidenceLevel(0.6), 'medium');
assert.equal(S.aiConfidenceLevel(0.2), 'low');
assert.equal(S.aiConfidenceLevel(0.6, { high: 0.95, medium: 0.7 }), 'low');

console.log('theme.status: token và quy tắc màu trạng thái hợp lệ');
