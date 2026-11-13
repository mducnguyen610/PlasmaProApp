// Kiểm thử tình huống Đợt 12 (R-06 B11, R-08 thao tác lặp, R-09 Q02) trên bản web, Playwright.
// Chạy: node scripts/kiem-thu-dot-12.cjs <baseURL> <thư mục ảnh> [nhãn ảnh] [--chi-anh] [--dem=<baseURL bản trước>]
// Dữ liệu kiểm thử chèn vào bộ nhớ trình duyệt (không đổi dữ liệu mẫu trong mã):
// - IMG0098: ảnh chưa đo của BN001 có siêu dữ liệu lần chụp, kết quả AI và ước lượng AR 11,8 cm² (chưa kiểm chứng);
// - IMG0097: ảnh chưa đo của BN003 (vết thương chưa có lần đo nào);
// - VT02 của BN001 với đợt v3 đang áp dụng (UX-18).
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8501';
const OUT = process.argv[3] || '.';
const TAG = process.argv[4] || 'sau';
const ONLY_SHOTS = process.argv.includes('--chi-anh');
const COUNT_BEFORE = (process.argv.find((a) => a.startsWith('--dem=')) || '').slice(6);
const results = [];
const rec = (id, name, pass, detail = '') => { results.push({ id, name, pass, detail }); console.log(pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };

(async () => {
  const b = await chromium.launch();
  const newPage = async (w = 390) => {
    const ctx = await b.newContext({ viewport: { width: w, height: 844 }, locale: 'vi-VN' });
    const p = await ctx.newPage();
    p.dialogs = []; p.errors = []; p.dismissNext = false;
    p.on('dialog', (d) => { p.dialogs.push(`${d.type()}: ${d.message().replace(/\n+/g, ' | ')}`); if (p.dismissNext) { p.dismissNext = false; d.dismiss(); } else d.accept(); });
    p.on('pageerror', (e) => p.errors.push(e.message));
    return p;
  };
  const login = async (p, user) => {
    await p.evaluate(() => localStorage.removeItem('plasmapro.session.v1')).catch(() => {});
    await p.goto(BASE + '/'); await p.waitForTimeout(1000);
    await p.getByPlaceholder('Nhập tên đăng nhập').fill(user);
    await p.getByPlaceholder('Nhập mật khẩu').fill('Demo@123');
    await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1000);
    const cb = p.getByRole('checkbox');
    if (await cb.count()) { await cb.first().click(); await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1200); }
    const skip = p.getByText('Bỏ qua'); if (await skip.count()) { await skip.first().click(); await p.waitForTimeout(600); }
  };
  const go = async (p, url) => { await p.goto(p.base + url); await p.waitForTimeout(1600); };
  const has = async (p, t, exact = true) => (await p.getByText(t, { exact }).count()) > 0;
  const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2') || '{}'));
  const imgOf = async (p, id) => (await store(p)).images.find((x) => x.id === id);
  const pageHeight = (p) => p.evaluate(() => { let best = document.documentElement.scrollHeight; for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) best = Math.max(best, el.scrollHeight + (window.innerHeight - el.clientHeight)); } return Math.ceil(best); });
  const shot = async (p, file) => {
    const w = p.viewportSize().width;
    const H = await pageHeight(p);
    await p.setViewportSize({ width: w, height: Math.max(844, H) }); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, file) }); await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200);
    return H;
  };
  const overflow = (p) => p.evaluate(() => { const W = window.innerWidth; return [...document.querySelectorAll('div,span')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed'; }).length; });
  const fixtures = async (p) => {
    await p.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('plasmapro.demo.v2'));
      if (d.images.some((x) => x.id === 'IMG0098')) return;
      const base = d.images.find((x) => x.id === 'IMG0004');
      const now = new Date().toISOString();
      const quality = { profileId: 'demo', profileValidated: false, lighting: 'pass', sharpness: 'pass', reflection: 'warn', movement: 'pass', metrics: null, warnings: [] };
      const capture = {
        schemaVersion: '1.1', captureId: 'c-test', sessionId: 's-test', selectedFrameId: 'f-test', imageSource: 'live_camera', mode: 'ar_photo',
        shutter: { trigger: 'manual', stabilitySource: null, holdMs: null, sceneConfirmed: true },
        width: 1600, height: 1200, capturedAt: now, recordedAt: now, sourceDateKnown: true,
        roi: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 }, roiCoordinates: 'saved_image_normalized', previewGuideMapped: false,
        quality, capabilities: { platform: 'web', model: null, osVersion: null, cameraSupported: true, cameraPermission: 'granted', arAdapter: 'available', worldTracking: true, depth: false, depthConfidence: false, sceneMesh: false, measurementProfileAvailable: false, segmentationModelAvailable: false },
        visualReview: { framing: true, lighting: true, sharpness: true, reviewedAt: now },
        distance: { valueM: 0.25, source: 'ar_plane', status: 'estimated' },
        automaticMeasurement: { areaCm2: 11.8, status: 'estimated_unvalidated', method: 'ar_pinhole_color_mask', reasonCodes: [] },
        wound: { detector: 'color-mask', modelVersion: '0.1', confidence: 0.86, areaCm2: 11.8, box: { x: 0.3, y: 0.3, width: 0.4, height: 0.4 }, hull: [], areaFraction: 0.12 },
        manualReference: { areaCm2: null, method: null, confirmedBy: null, confirmedAt: null },
        geometry: null,
      };
      d.images.push({ ...base, id: 'IMG0098', filename: 'BN001_VT01_IMG0098_area__cm2.png', capture, history: [] });
      const w3 = d.wounds.find((x) => x.id === 'w-3');
      d.images.push({ ...base, id: 'IMG0097', woundId: w3.id, patientId: 'p-3', captureDate: base.captureDate, filename: 'BN003_VT01_IMG0097_area__cm2.png', history: [] });
      const w1 = d.wounds.find((x) => x.id === 'w-1');
      d.wounds.push({ ...w1, id: 'w-test2', code: 'VT02', location: 'Mu bàn chân phải' });
      const pl = d.plans.find((x) => x.id === 'pl-1');
      d.plans.push({ ...pl, id: 'pl-test2', woundId: 'w-test2', version: 3 });
      localStorage.setItem('plasmapro.demo.v2', JSON.stringify(d));
    });
    await p.reload(); await p.waitForTimeout(1500);
  };
  const doctor = async (w = 390, base = BASE) => { const p = await newPage(w); p.base = base; const save = BASE; await login(Object.assign(p), 'bacsi'); await fixtures(p); return p; };
  // login dùng BASE; với bản trước cần đăng nhập ở base khác.
  const doctorAt = async (base) => { const p = await newPage(390); p.base = base; await p.goto(base + '/'); await p.waitForTimeout(1000);
    await p.getByPlaceholder('Nhập tên đăng nhập').fill('bacsi'); await p.getByPlaceholder('Nhập mật khẩu').fill('Demo@123');
    await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1000);
    const cb = p.getByRole('checkbox'); if (await cb.count()) { await cb.first().click(); await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1200); }
    const skip = p.getByText('Bỏ qua'); if (await skip.count()) { await skip.first().click(); await p.waitForTimeout(600); }
    await fixtures(p); return p; };

  // ===== Ảnh trước/sau ở 4 khổ, chiều cao B11 =====
  const heights = {};
  for (const w of (process.env.BO_ANH ? [] : [320, 360, 390, 768])) {
    const p = await doctor(w);
    for (const [key, url] of [['b11-chua-do', '/images/IMG0098'], ['b11-da-do', '/images/IMG0003'], ['b01', '/doctor'], ['b05', '/wounds/w-1'], ['b09', '/capture'], ['b04', '/patients/p-1']]) {
      await go(p, url);
      const H = await shot(p, `${key}-${TAG}-${w}.png`);
      if (key.startsWith('b11')) heights[`${key}-${w}`] = H;
      if (!ONLY_SHOTS) rec(`D12-tran-${key}-${w}`, `${key} không tràn ngang ở ${w} px`, (await overflow(p)) === 0);
    }
    await login(p, 'quantri'); await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('plasmapro.demo.v2')); d.accounts.find((a) => a.id === 'u-qt').researchAccess = false; localStorage.setItem('plasmapro.demo.v2', JSON.stringify(d)); });
    await go(p, '/admin/dataset'); await shot(p, `q02-${TAG}-${w}.png`);
    await p.context().close();
  }
  console.log('CHIEU_CAO', JSON.stringify(heights));
  if (ONLY_SHOTS) { await b.close(); return; }

  // ===== 1, 2, 12: xem ảnh, số đo, nguồn; AI tách khỏi số bác sĩ =====
  {
    const p = await doctor();
    await go(p, '/images/IMG0003');
    await p.getByLabel('Phóng to ảnh vết thương').click(); await p.waitForTimeout(400);
    const zoomed = await has(p, 'Chụm hai ngón để phóng to');
    await p.getByLabel('Đóng').last().click(); await p.waitForTimeout(300);
    rec('D12-01', 'Mở B11: thấy ảnh, chạm để phóng to và đóng lại', zoomed && !(await has(p, 'Chụm hai ngón để phóng to')));
    const area1 = await p.getByText('Diện tích bác sĩ đã đo', { exact: true }).count();
    rec('D12-02', 'Ảnh đã đo: số bác sĩ đo hiện một lần kèm chip "Bác sĩ nhập" và phương pháp; không còn dòng trùng "Số đo tham chiếu bác sĩ"',
      area1 === 1 && await has(p, 'Bác sĩ nhập') && await has(p, 'Phương pháp đo') && !(await has(p, 'Số đo tham chiếu bác sĩ')) && !(await has(p, 'Nhập diện tích', true)), `số dòng diện tích ${area1}`);
    await go(p, '/images/IMG0098');
    const field = p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true });
    const autoOpen = (await field.count()) === 1 && (await field.inputValue()) === '';
    const fb = await field.boundingBox(); const ai = await p.getByText('Diện tích ước lượng (tham khảo)').boundingBox(); const mb = await p.getByRole('textbox', { name: /^Phương pháp đo/ }).boundingBox();
    rec('D12-03', 'Ảnh chưa đo: biểu mẫu mở sẵn, ô diện tích trống (QĐ-1); gợi ý AI nằm ngay dưới ô nhập, trên ô phương pháp',
      autoOpen && !!fb && !!ai && !!mb && fb.y < ai.y && ai.y < mb.y, `ô trống ${autoOpen}, y ô ${fb?.y | 0}, AI ${ai?.y | 0}, phương pháp ${mb?.y | 0}`);
    rec('D12-04', 'AI có chip nguồn, "chưa kiểm chứng", "không tự điền vào ô"; không có dòng trùng "Diện tích ước lượng AR"; không có nút "Dùng số này"',
      await has(p, 'Gợi ý của AI') && await has(p, '11,8 cm² (chưa kiểm chứng)') && await has(p, /không tự điền vào ô/, false) && !(await has(p, 'Diện tích ước lượng AR')) && !(await has(p, 'Dùng số này', false)));
    await p.waitForTimeout(2500);
    rec('D12-05', 'Chờ thêm: số AR không bị chép vào ô', (await field.inputValue()) === '');
    await p.context().close();
  }

  // ===== 3, 4, 5, 9, 10, 11, 12: sửa, điều hướng trong màn, rời màn, lưu, lưu lỗi, bấm liên tục =====
  {
    const p = await doctor();
    await go(p, '/images/IMG0098');
    await p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true }).fill('9,5');
    // Không ghi phương pháp: bị chặn theo quy tắc cũ, dữ liệu đang nhập giữ nguyên.
    const methodBox = p.getByRole('textbox', { name: /^Phương pháp đo/ });
    const prefilled = await methodBox.inputValue();
    await methodBox.fill('');
    let nd = p.dialogs.length;
    await p.getByRole('button', { name: 'Lưu diện tích' }).click(); await p.waitForTimeout(400);
    const blocked = p.dialogs.slice(nd).join(' ').includes('Thiếu phương pháp đo');
    rec('D12-06', 'Lưu thiếu phương pháp (ảnh có lần chụp): bị chặn như cũ, không ghi gì, số 9,5 vẫn trong ô', blocked && (await imgOf(p, 'IMG0098')).areaCm2 === null && (await p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true }).inputValue()) === '9,5', `điền sẵn trước đó: "${prefilled}"`);
    await methodBox.fill('Thước giấy kẻ ô');
    // Điều hướng giữa các phần: mở, đóng các mục thu gọn, gõ lý do chụp lại.
    await p.getByRole('button', { name: /^Thông tin lần chụp và chi tiết kỹ thuật/ }).click(); await p.waitForTimeout(200);
    const techOpen = await has(p, 'Nguồn ảnh') && await has(p, 'Tên tệp hiện tại');
    await p.getByRole('button', { name: /^Yêu cầu chụp lại, loại ảnh/ }).click(); await p.waitForTimeout(200);
    await p.getByRole('textbox', { name: 'Yêu cầu chụp lại', exact: true }).fill('Ảnh hơi mờ');
    await p.getByRole('button', { name: /^Yêu cầu chụp lại, loại ảnh/ }).click(); await p.waitForTimeout(200);
    await p.getByRole('button', { name: /^Yêu cầu chụp lại, loại ảnh/ }).click(); await p.waitForTimeout(200);
    await p.getByRole('button', { name: /^Thông tin lần chụp và chi tiết kỹ thuật/ }).click(); await p.waitForTimeout(200);
    rec('D12-07', 'Mở, đóng các mục thu gọn: số 9,5, phương pháp và lý do chụp lại đang gõ vẫn giữ',
      techOpen && (await p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true }).inputValue()) === '9,5' && (await p.getByRole('textbox', { name: /^Phương pháp đo/ }).inputValue()) === 'Thước giấy kẻ ô' && (await p.getByRole('textbox', { name: 'Yêu cầu chụp lại', exact: true }).inputValue()) === 'Ảnh hơi mờ');
    // Bấm Lưu liên tục 3 lần.
    nd = p.dialogs.length;
    const btn = p.getByRole('button', { name: 'Lưu diện tích' });
    await btn.click({ clickCount: 1 }); await btn.click({ timeout: 500 }).catch(() => {}); await btn.click({ timeout: 500 }).catch(() => {}); await p.waitForTimeout(600);
    const im = await imgOf(p, 'IMG0098');
    rec('D12-08', 'Lưu thành công: 9,5 cm², phương pháp đúng, 1 dòng lịch sử, có thông báo "Đã lưu diện tích"; bấm liên tục không lưu trùng',
      im.areaCm2 === 9.5 && im.measureMethod === 'Thước giấy kẻ ô' && im.history.length === 1 && await has(p, 'Đã lưu diện tích 9,5 cm² cho ảnh IMG0098.'), `lịch sử ${im.history.length}`);
    rec('D12-09', 'AI và bác sĩ vẫn tách: manualReference 9,5 có người xác nhận; automaticMeasurement 11,8 "estimated_unvalidated" giữ nguyên',
      im.capture.manualReference.areaCm2 === 9.5 && !!im.capture.manualReference.confirmedBy && im.capture.automaticMeasurement.areaCm2 === 11.8 && im.capture.automaticMeasurement.status === 'estimated_unvalidated');
    rec('D12-10', 'Sau lưu có "Ảnh chưa đo tiếp theo (n)" và nêu rõ ảnh, bệnh nhân, vết thương kế tiếp', await has(p, /^Ảnh chưa đo tiếp theo(, bệnh nhân khác)? \(\d+\)$/, false) && await has(p, /^Tiếp theo: IMG\d+ · .+ · BN\d+ · VT\d+/, false));
    // Sửa annotation: "Sửa số đo" điền đúng số đã lưu; "Sửa tên đầy đủ" ở mục kỹ thuật.
    await p.getByRole('button', { name: 'Sửa số đo' }).click(); await p.waitForTimeout(300);
    const pre = await p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true }).inputValue();
    await p.getByRole('button', { name: /^Thông tin lần chụp và chi tiết kỹ thuật/ }).click(); await p.waitForTimeout(200);
    await p.getByRole('button', { name: 'Sửa tên đầy đủ' }).click(); await p.waitForTimeout(300);
    const full = await p.getByRole('textbox', { name: 'Tên tệp đầy đủ', exact: true }).inputValue();
    await p.getByRole('button', { name: 'Quay về nhập diện tích' }).click(); await p.waitForTimeout(200);
    await p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true }).fill('9');
    // P0 SV-03: thay số đã có thì nút là "Lưu số mới".
    await p.getByRole('button', { name: 'Lưu số mới' }).click(); await p.waitForTimeout(500);
    const im2 = await imgOf(p, 'IMG0098');
    rec('D12-11', 'Sửa số: ô điền 9,5 của chính ảnh; "Sửa tên đầy đủ" mở từ mục kỹ thuật với tên hiện tại; lưu 9 thêm đúng 1 dòng lịch sử',
      pre === '9,5' && full === im.filename && im2.areaCm2 === 9 && im2.history.length === 2, `ô "${pre}", tên "${full}"`);
    // Loại ảnh: có hộp xác nhận, hủy thì không loại.
    if (!(await p.getByRole('textbox', { name: 'Loại khỏi bộ dữ liệu huấn luyện', exact: true }).count())) { await p.getByRole('button', { name: /^Yêu cầu chụp lại, loại ảnh/ }).click(); await p.waitForTimeout(200); }
    await p.getByRole('textbox', { name: 'Loại khỏi bộ dữ liệu huấn luyện', exact: true }).fill('Ảnh chứa hai vết thương');
    nd = p.dialogs.length; p.dismissNext = true;
    await p.getByRole('button', { name: 'Loại khỏi bộ dữ liệu' }).click(); await p.waitForTimeout(300);
    const askedEx = p.dialogs.slice(nd).join(' ');
    const notEx = (await imgOf(p, 'IMG0098')).status !== 'excluded';
    await p.getByRole('button', { name: 'Loại khỏi bộ dữ liệu' }).click(); await p.waitForTimeout(400);
    const ex = await imgOf(p, 'IMG0098');
    rec('D12-12', '"Loại khỏi bộ dữ liệu" có hộp xác nhận nêu mã ảnh và lý do; hủy thì không loại; đồng ý thì loại đúng 1 lần',
      askedEx.includes('Loại ảnh khỏi bộ dữ liệu') && askedEx.includes('IMG0098') && askedEx.includes('Ảnh chứa hai vết thương') && notEx && ex.status === 'excluded' && ex.excludeReason === 'Ảnh chứa hai vết thương', askedEx.slice(0, 120));
    // Rời màn khi đang sửa: không tự lưu.
    await go(p, '/images/IMG0004');
    await p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true }).fill('7,7');
    await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(800);
    const im4 = await imgOf(p, 'IMG0004');
    await go(p, '/images/IMG0004');
    const after = await p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true }).inputValue();
    rec('D12-13', 'Rời màn khi đang gõ: không tự lưu (ảnh vẫn chưa đo); mở lại thì ô trống, không mang số cũ', im4.areaCm2 === null && im4.status === 'unlabeled' && after === '', `mở lại: "${after}"`);
    rec('D12-14', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // ===== 6, 7, 8: đo nhiều ảnh liên tiếp từ B01, ảnh của bệnh nhân khác, không có dữ liệu trước =====
  const flowAfter = async (base) => {
    const p = await doctorAt(base); let steps = 0; const vals = {};
    await go(p, '/doctor');
    await p.getByRole('button', { name: /Ảnh chưa đo/ }).first().click(); steps++; await p.waitForTimeout(1200);
    const onB12 = await has(p, /^Chưa đo \(\d+\)$/, false);
    await p.getByRole('button', { name: /^Ảnh IMG\d{4}, chưa đo/ }).first().click(); steps++; await p.waitForTimeout(1200);
    const seen = [];
    for (let i = 0; i < 3; i++) {
      const id = (await p.url()).split('/images/')[1]?.split('?')[0];
      const fieldVal = await p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true }).inputValue();
      const methodVal = await p.getByRole('textbox', { name: /^Phương pháp đo/ }).inputValue();
      const hint = await p.getByText(/^Điền sẵn theo lần đo trước/).textContent().catch(() => '');
      const header = await p.getByText(/^BN\d{3} · VT\d{2}/).first().textContent();
      seen.push({ id, fieldVal, methodVal, hint, header });
      const v = `${5 + i},${i + 1}`; vals[id] = 5 + i + (i + 1) / 10;
      await p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true }).fill(v); steps++;
      if (!methodVal) { await p.getByRole('textbox', { name: /^Phương pháp đo/ }).fill('Thước giấy kẻ ô'); steps++; }
      await p.getByRole('button', { name: 'Lưu diện tích' }).click(); steps++; await p.waitForTimeout(600);
      if (i < 2) { await p.getByRole('button', { name: /^Ảnh chưa đo tiếp theo/ }).click(); steps++; await p.waitForTimeout(1200); }
    }
    const d = await store(p);
    const ok = Object.entries(vals).every(([id, v]) => Math.abs(d.images.find((x) => x.id === id).areaCm2 - v) < 1e-9);
    const left = await has(p, 'Không còn ảnh chưa đo.') || await has(p, /^Ảnh chưa đo tiếp theo/, false);
    await p.context().close();
    return { steps, onB12, seen, ok, left };
  };
  {
    const r = await flowAfter(BASE);
    rec('D12-15', 'B01 "Ảnh chưa đo" mở B12 lọc "Chưa đo"', r.onB12);
    rec('D12-16', 'Đo 3 ảnh liên tiếp bằng "Ảnh chưa đo tiếp theo": mỗi ảnh lưu đúng số của nó', r.ok, JSON.stringify(r.seen.map((s) => s.id)));
    rec('D12-17', 'Mỗi ảnh mới mở với ô diện tích trống, không mang số của ảnh trước', r.seen.every((s) => s.fieldVal === ''));
    const other = r.seen.filter((s, i) => i > 0 && s.header.slice(0, 5) !== r.seen[i - 1].header.slice(0, 5));
    const hintsOk = r.seen.every((s) => !s.hint || s.hint.includes(`(${s.id === 'IMG0006' ? 'IMG0005' : 'IMG000'}`));
    rec('D12-18', 'Sang ảnh của bệnh nhân khác: tiêu đề đổi mã bệnh nhân; phương pháp điền sẵn (nếu có) chỉ lấy từ lần đo trước của cùng vết thương và ghi nguồn',
      other.length >= 1 && hintsOk, JSON.stringify(r.seen.map((s) => [s.id, s.header.slice(0, 10), s.methodVal, (s.hint || '').slice(0, 40)])));
    const noPrev = r.seen.find((s) => s.id === 'IMG0097');
    rec('D12-19', 'Không có dữ liệu trước (BN003 chưa có lần đo): phương pháp trống, không có dòng "Điền sẵn"', !!noPrev && noPrev.methodVal === '' && !noPrev.hint, JSON.stringify(noPrev));
    rec('D12-20', 'Ảnh cuối: thông báo còn lại đúng', r.left);
    console.log('BUOC_SAU', r.steps);
    if (COUNT_BEFORE) {
      // Bản trước: B01 → ảnh đầu → "Nhập diện tích" → gõ → (phương pháp) → Lưu → quay lại B01 → lặp.
      const p = await doctorAt(COUNT_BEFORE); let steps = 0;
      for (let i = 0; i < 3; i++) {
        await go(p, '/doctor');
        await p.getByRole('button', { name: /Ảnh chưa đo/ }).first().click(); steps++; await p.waitForTimeout(1200);
        await p.getByRole('button', { name: 'Nhập diện tích bác sĩ đã đo' }).click(); steps++; await p.waitForTimeout(300);
        await p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true }).fill(`${5 + i},${i + 1}`); steps++;
        if (!(await p.getByRole('textbox', { name: /^Phương pháp đo/ }).inputValue())) { await p.getByRole('textbox', { name: /^Phương pháp đo/ }).fill('Thước giấy kẻ ô'); steps++; }
        await p.getByRole('button', { name: 'Lưu', exact: true }).click(); steps++; await p.waitForTimeout(600);
        if (i < 2) { await p.locator('[aria-label="Quay lại"]:visible').first().click(); steps++; await p.waitForTimeout(900); }
      }
      const labeled = (await store(p)).images.filter((x) => ['IMG0004', 'IMG0006', 'IMG0097', 'IMG0098'].includes(x.id) && x.areaCm2 !== null).length;
      console.log('BUOC_TRUOC', steps, 'anh_da_do', labeled);
      await p.context().close();
    }
  }

  // ===== Thao tác lặp: UX-17 B02, UX-18, UX-23, UX-27, UX-29, UX-22 =====
  {
    const p = await doctor();
    await go(p, '/doctor/patients');
    await p.getByRole('radio', { name: 'Nặng' }).click().catch(() => {}); await p.waitForTimeout(200);
    await go(p, '/doctor');
    await p.getByRole('button', { name: /Báo cáo mới/ }).first().click(); await p.waitForTimeout(1200);
    // Tab B01 vẫn nằm trong DOM: chỉ lấy dòng thực sự nhìn thấy (điểm giữa không bị lớp khác che).
    const listed = await p.getByText(/^BN00\d · /).evaluateAll((els) => els.filter((e) => { const r = e.getBoundingClientRect(); if (!r.width) return false; const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return hit === e || e.contains(hit); }).map((e) => e.textContent));
    rec('D12-21', 'B01 "Báo cáo mới" mở B02 đã chọn "Có báo cáo", chỉ còn bệnh nhân có báo cáo chưa xử lý', p.url().includes('/doctor/patients') && await has(p, /^Có báo cáo \(1\)$/, false) && listed.length === 1 && listed[0].startsWith('BN002'), `thấy: ${listed.join(", ")}`);
    // B12: đang chọn "Đã đo", chạm lại ô ở B01 thì về "Chưa đo".
    await go(p, '/doctor/dataset');
    await p.getByText(/^Đã đo \(\d+\)$/).click(); await p.waitForTimeout(300);
    await p.getByRole('button', { name: 'Trang chủ' }).or(p.getByRole('tab', { name: 'Trang chủ' })).first().click().catch(() => {}); await p.waitForTimeout(800);
    await p.getByRole('button', { name: /Ảnh chưa đo/ }).first().click(); await p.waitForTimeout(1000);
    const tiles = (await p.getByRole('button', { name: /^Ảnh IMG\d{4},/ }).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).map((l) => l.slice(4, 11));
    rec('D12-22', 'Đang ở nhóm "Đã đo", chạm lại ô "Ảnh chưa đo" ở B01: B12 về nhóm "Chưa đo"', tiles.length > 0 && tiles.every((t) => ['IMG0004', 'IMG0006', 'IMG0097', 'IMG0098'].includes(t)), tiles.join(','));
    // UX-18: B04 và B05 VT02 cùng số buổi.
    await go(p, '/patients/p-1');
    const b04 = (await p.getByRole('button', { name: /VT02 ·.*\d+\/\d+ buổi đã làm/ }).first().textContent().catch(() => '')).match(/(\d+)\/(\d+)/)?.[0];
    await go(p, '/wounds/w-test2');
    const b05 = (await p.getByText(/Đã xong \d+\/\d+ buổi/).first().textContent().catch(() => '')).match(/(\d+)\/(\d+)/)?.[0];
    rec('D12-23', 'UX-18: đợt của VT02 (BN001 có 2 vết): tiến độ ở B04 bằng ở B05', !!b04 && b04 === b05, `B04 ${b04}, B05 ${b05}`);
    // UX-29
    await go(p, '/wounds/w-1');
    // Giai đoạn 1 giao diện theo tác vụ: "Ghi đánh giá" và "Chụp ảnh" ở vùng nút cố định cuối màn (cùng hàng); "Đợt điều trị" là lối vào trong "Việc với vết thương".
    const ev = p.getByRole('button', { name: 'Ghi đánh giá', exact: true }); const pl = p.getByRole('button', { name: /^Đợt điều trị, / });
    const gb = await p.getByRole('button', { name: 'Chụp ảnh', exact: true }).boundingBox(); const eb = await ev.boundingBox();
    await ev.click(); await p.waitForTimeout(1000); const onEval = p.url().includes('/evaluate/w-1');
    await go(p, '/wounds/w-1'); await pl.click(); await p.waitForTimeout(1000); const onPlan = p.url().includes('/plan/p-1');
    const vh = p.viewportSize().height;
    rec('D12-24', 'UX-29: B05 "Ghi đánh giá" cạnh "Chụp ảnh" trong vùng nút cố định (thấy ngay), "Đợt điều trị" là lối vào riêng; mở đúng màn', !!gb && !!eb && Math.abs(eb.y - gb.y) < 4 && gb.y + gb.height <= vh && onEval && onPlan, `y chụp ${gb?.y | 0}, y đánh giá ${eb?.y | 0}, cao cửa sổ ${vh}`);
    // UX-27
    await go(p, '/patients/p-1');
    await p.getByRole('button', { name: 'Thêm vết thương' }).first().click(); await p.waitForTimeout(200);
    rec('D12-25', 'UX-27: ô nhập trong "Thêm vết thương" có nhãn "Vị trí vết thương"', (await p.getByRole('textbox', { name: 'Vị trí vết thương', exact: true }).count()) === 1 && (await p.getByRole('textbox', { name: 'Thêm vết thương', exact: true }).count()) === 0);
    // UX-23
    await go(p, '/capture');
    const before = await p.getByRole('radio').count();
    await p.getByRole('textbox', { name: 'Tìm bệnh nhân', exact: true }).fill('bn002'); await p.waitForTimeout(200);
    const radios = await p.getByRole('radio').count();
    await p.getByRole('radio', { name: /BN002/ }).click(); await p.waitForTimeout(300);
    const woundShown = await has(p, /^VT01 · /, false);
    await p.getByRole('textbox', { name: 'Tìm bệnh nhân', exact: true }).fill('khong co'); await p.waitForTimeout(200);
    rec('D12-26', 'UX-23: B09 có ô tìm; gõ "bn002" còn 1 dòng; chọn thì hiện vết thương; không khớp thì có câu báo', before === 3 && radios === 1 && woundShown && await has(p, 'Không tìm thấy bệnh nhân phù hợp.'), `${before} → ${radios}`);
    rec('D12-27', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    // UX-22
    await login(p, 'quantri'); await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('plasmapro.demo.v2')); d.accounts.find((a) => a.id === 'u-qt').researchAccess = false; localStorage.setItem('plasmapro.demo.v2', JSON.stringify(d)); });
    await go(p, '/admin/dataset');
    const r1 = await has(p, 'Tài khoản chưa được cấp quyền xuất dữ liệu nghiên cứu.');
    await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('plasmapro.demo.v2')); d.accounts.find((a) => a.id === 'u-qt').researchAccess = true; d.images.forEach((i) => { i.researchReady = false; }); localStorage.setItem('plasmapro.demo.v2', JSON.stringify(d)); });
    await go(p, '/admin/dataset');
    const r2 = await has(p, 'Không có ảnh nào khớp bộ lọc.');
    rec('D12-28', 'UX-22: Q02 nêu đúng lý do khóa nút: chưa có quyền / không có ảnh', r1 && r2, `quyền ${r1}, ảnh ${r2}`);
    await p.context().close();
  }

  await b.close();
  const ok = results.filter((r) => r.pass).length;
  console.log(`\n${ok}/${results.length} đạt`);
  process.exit(ok === results.length ? 0 : 1);
})();
