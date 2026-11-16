/* global __dirname */
// Chạy: node src/lib/architecture.test.cjs
// Stage 9C (gói B, C): kiểm tĩnh quy tắc phụ thuộc giữa các tầng trên mã nguồn thật (đọc câu import).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.resolve(__dirname, '..');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(p);
  }
})(SRC);
const rel = (p) => path.relative(SRC, p).split(path.sep).join('/');
/** Các import chạy được (bỏ import type). */
function imports(file) {
  const code = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const m of code.matchAll(/^import\s+(type\s+)?[^'"]*?from\s+['"]([^'"]+)['"]/gm)) if (!m[1]) out.push(m[2]);
  for (const m of code.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push(m[1]);
  return out;
}
const resolve = (file, spec) => (spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? rel(path.resolve(path.dirname(file), spec)) : spec);

const violations = [];
const ui = (r) => r.startsWith('app/') || r.startsWith('components/');
// Màn chẩn đoán hex của quản trị viên: ngoại lệ có chủ đích (đọc khung thô, đổi đường truyền).
const DIAG = 'app/device-diagnostics.tsx';
// Tầng giao thức, mã hóa khung, đường truyền: giao diện không được gọi.
const DEVICE_INTERNAL = /^lib\/device\/(protocol|codec|codec-text|codec-binary|checksum|bytes|wire|spec|spec-check|sender|transport|simulated|usb-android|usb-android-core|trace)$/;

for (const f of files) {
  const r = rel(f);
  for (const spec of imports(f)) {
    const t = resolve(f, spec).replace(/\.(ts|tsx)$/, '');
    if (spec === '@react-native-async-storage/async-storage' && r !== 'lib/store.tsx' && r !== 'lib/persistence.ts') violations.push(`${r}: dùng AsyncStorage ngoài tầng lưu trữ`);
    if (ui(r) && r !== DIAG && DEVICE_INTERNAL.test(t)) violations.push(`${r}: giao diện gọi tầng giao thức hoặc đường truyền (${t})`);
    if (r.startsWith('lib/') && (t.startsWith('app/') || t.startsWith('components/'))) violations.push(`${r}: tầng nghiệp vụ phụ thuộc giao diện (${t})`);
    if (r.startsWith('lib/device/') && t === 'lib/store') violations.push(`${r}: tầng thiết bị phụ thuộc store`);
    if (r === 'lib/persistence.ts' && t.startsWith('lib/')) violations.push(`${r}: tầng hạ tầng phụ thuộc nghiệp vụ (${t})`);
    // usb-android.ts là bộ chuyển đổi thiết bị (Device Adapter), được dùng Platform của React Native; lõi usb-android-core thì không.
    if (/^lib\/device\/(protocol|codec|codec-text|codec-binary|checksum|sender|transport|simulated|usb-android-core)$/.test(r.replace(/\.ts$/, '')) && /^react(-native)?$/.test(spec)) violations.push(`${r}: tầng giao thức phụ thuộc React`);
  }
}
// Đường truyền thật không import bộ giả lập.
for (const f of ['lib/device/usb-android.ts', 'lib/device/usb-android-core.ts']) {
  for (const spec of imports(path.join(SRC, f))) if (/simulated/.test(spec)) violations.push(`${f}: đường truyền thật import bộ giả lập`);
}
assert.deepEqual(violations, [], 'vi phạm ranh giới:\n' + violations.join('\n'));
console.log(`architecture.test: đạt (${files.length} tệp)`);
