// Chỉ dùng để dựng bản web kiểm thử cho scripts/kiem-thu-dot-9.cjs. KHÔNG commit kết quả.
// Bản web không có phiên AR; tệp này chèn tạm vào B10 hai dòng đọc window.__TEST_AR__ (dữ liệu AR giả do kịch bản đặt).
// Dùng: node scripts/tiem-ar-kiem-thu.cjs        (chèn)
//       node scripts/tiem-ar-kiem-thu.cjs --go   (gỡ, trả tệp về như cũ)
const fs = require('fs'); const path = require('path');
const F = path.join(__dirname, '..', 'src', 'app', 'guided-capture.tsx');
const L1 = '  const TE = (globalThis as any).__TEST_AR__; if (TE && photo?.ar) return TE.est; // TIEM-AR-KIEM-THU\n';
const L2 = '    const TA = (globalThis as any).__TEST_AR__; if (TA) value = { ...value, ar: TA.ar }; // TIEM-AR-KIEM-THU\n';
const A1 = 'function estimateFor(photo: Photo | null, found: RecognitionResult | null) {\n';
const A2 = '  const selectPhoto = (value: Photo) => {\n';
let s = fs.readFileSync(F, 'utf8');
if (process.argv.includes('--go')) { s = s.split(L1).join('').split(L2).join(''); }
else {
  if (s.includes('TIEM-AR-KIEM-THU')) { console.log('Đã chèn từ trước.'); process.exit(0); }
  if (!s.includes(A1) || !s.includes(A2)) { console.error('Không tìm thấy điểm chèn.'); process.exit(1); }
  s = s.replace(A1, A1 + L1).replace(A2, A2 + L2);
}
fs.writeFileSync(F, s); console.log('OK');
