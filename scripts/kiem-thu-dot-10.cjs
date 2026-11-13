// Kiểm thử tình huống Đợt 10 (R-02 ở B06, R-05 ở B07) trên bản web, Playwright.
// Chạy: node scripts/kiem-thu-dot-10.cjs <baseURL> <thư mục ảnh> [nhãn ảnh]. Dựng web trước: npx expo export -p web, phục vụ với SPA fallback.
// Thêm "--chi-anh" để chỉ chụp ảnh (dùng cho bản trước khi sửa).
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8301';
const OUT = process.argv[3] || '.';
const TAG = process.argv[4] || 'sau';
const ONLY_SHOTS = process.argv.includes('--chi-anh');
const results = [];
const rec = (id, name, pass, detail = '') => { results.push({ id, name, pass, detail }); console.log(pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };

(async () => {
  const b = await chromium.launch();
  const newPage = async (w = 390) => {
    const ctx = await b.newContext({ viewport: { width: w, height: 844 }, locale: 'vi-VN' });
    const p = await ctx.newPage();
    p.dialogs = []; p.errors = [];
    p.on('dialog', (d) => { p.dialogs.push(`${d.type()}: ${d.message().split('\n')[0]}`); d.accept(); });
    p.on('pageerror', (e) => p.errors.push(e.message));
    return p;
  };
  const login = async (p, user = 'bacsi') => {
    await p.goto(BASE + '/'); await p.waitForTimeout(1000);
    await p.getByPlaceholder('Nhập tên đăng nhập').fill(user);
    await p.getByPlaceholder('Nhập mật khẩu').fill('Demo@123');
    await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1000);
    const cb = p.getByRole('checkbox');
    if (await cb.count()) { await cb.first().click(); await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1200); }
    const skip = p.getByText('Bỏ qua'); if (await skip.count()) { await skip.first().click(); await p.waitForTimeout(600); }
  };
  const go = async (p, url) => { await p.goto(BASE + url); await p.waitForTimeout(1600); };
  const has = async (p, t, exact = true) => (await p.getByText(t, { exact }).count()) > 0;
  const vis = async (p, t, exact = true) => p.getByText(t, { exact }).first().isVisible().catch(() => false);
  const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2') || '{}'));
  const tab = (p, name) => p.getByRole('tab', { name }).click().then(() => p.waitForTimeout(300));
  const shot = async (p, file) => {
    const w = p.viewportSize().width;
    const H = await p.evaluate(() => { let best = document.documentElement.scrollHeight; for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) best = Math.max(best, el.scrollHeight + (window.innerHeight - el.clientHeight)); } return Math.ceil(best); });
    await p.setViewportSize({ width: w, height: Math.max(844, H) }); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, file) }); await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200);
  };
  // Chọn đáp án cho các câu bắt buộc của nhóm 1 (giá trị bất kỳ hợp lệ trong danh mục hiện có).
  const fillRequired = async (p) => {
    if (!(await vis(p, 'Loét do bệnh tĩnh mạch'))) { await p.getByText('Phân loại vết thương', { exact: true }).click(); await p.waitForTimeout(200); }
    for (const name of ['Loét do bệnh tĩnh mạch', 'Không', 'Không có dấu hiệu']) { await p.getByRole('radio', { name, exact: true }).first().click(); await p.waitForTimeout(150); }
  };
  const plansW1 = async (p) => ((await store(p)).plans || []).filter((x) => x.patientId === 'p-1');
  const SAVE06 = /^Lưu phiên bản \d+( cho VT\d+)?$/;

  // Ảnh trước/sau ở 4 khổ: B06 bước 3 sau khi đổi mức 4 → 5, B06 bước 2, B07 đầu và cuối màn.
  for (const w of [320, 360, 390, 768]) {
    const p = await newPage(w); await login(p);
    await go(p, '/plan/p-1'); await tab(p, '2. Liều');
    await shot(p, `b06b-${TAG}-${w}.png`);
    await p.getByRole('radio', { name: '5', exact: true }).first().click(); await p.waitForTimeout(200);
    await tab(p, '3. Xác nhận'); await shot(p, `b06c-${TAG}-${w}.png`);
    await go(p, '/evaluate/w-2'); await shot(p, `b07-${TAG}-${w}.png`);
    await p.context().close();
  }
  if (ONLY_SHOTS) { await b.close(); return; }

  // ===== B06 =====
  {
    const p = await newPage(); await login(p); await go(p, '/plan/p-1');
    const v0 = (await plansW1(p)).length;
    await tab(p, '3. Xác nhận');
    rec('D10-06a', 'Bước 3 có bảng "Đang áp dụng (v2) | Phiên bản mới", nút "Lưu phiên bản 3", báo không có thay đổi',
      await has(p, 'Đang áp dụng (v2)') && await has(p, 'Phiên bản mới') && await has(p, /^Lưu phiên bản 3( cho VT\d+)?$/) && await has(p, 'Không có thay đổi lịch hoặc liều so với phiên bản đang so sánh.'));
    await p.getByText('Sửa liều', { exact: true }).click(); await p.waitForTimeout(300);
    const atDose = await vis(p, 'Liều khóa trên máy');
    await p.getByRole('radio', { name: '5', exact: true }).first().click(); await p.waitForTimeout(200);
    await tab(p, '3. Xác nhận');
    rec('D10-06b', '"Sửa liều" về đúng bước Liều; đổi mức 4 → 5 thì dòng Mức được tô và đếm 1 thay đổi',
      atDose && (await p.getByLabel('Mức năng lượng: hiện tại 4, mới 5, đã thay đổi').count()) > 0 && await has(p, '1 thay đổi được tô vàng.'));
    await p.getByText('Sửa lịch', { exact: true }).click(); await p.waitForTimeout(300);
    const atSched = await vis(p, 'Lịch theo giai đoạn');
    await tab(p, '3. Xác nhận');
    rec('D10-06c', '"Sửa lịch" về bước Lịch; quay lại bước 3 vẫn giữ mức 5 đã đổi', atSched && (await p.getByLabel('Mức năng lượng: hiện tại 4, mới 5, đã thay đổi').count()) > 0);
    // Trạng thái và câu hậu quả sát nút Lưu.
    const nb = await p.getByText(/^Đang áp dụng: cần mức năng lượng/).boundingBox(); const bb = await p.getByText(SAVE06).boundingBox();
    rec('D10-06h', 'Câu hậu quả của trạng thái nằm ngay trên nút Lưu', !!nb && !!bb && bb.y > nb.y && bb.y - (nb.y + nb.height) < 60, `khoảng ${bb && nb ? Math.round(bb.y - nb.y - nb.height) : '?'} px`);
    // Thiếu dữ liệu: xóa thời gian, lưu trạng thái Đang áp dụng.
    await tab(p, '2. Liều'); await p.getByLabel('Thời gian mỗi lần điều trị (giây)').fill(''); await tab(p, '3. Xác nhận');
    rec('D10-06j', 'Bảng hiện "—" cho thời gian bị xóa, không tự điền', (await p.getByLabel(/^Thời gian mỗi lần: hiện tại 3 phút, mới —/).count()) > 0);
    await p.getByLabel('Lý do thay đổi').fill('Kiểm thử Đợt 10');
    await p.getByRole('checkbox', { name: /Tôi xác nhận liều và lịch này/ }).click();
    await p.getByText(SAVE06).click(); await p.waitForTimeout(400);
    rec('D10-06d', 'Thiếu thời gian: lưu bị chặn theo quy tắc cũ, về bước Liều, không tạo phiên bản',
      await has(p, 'Đợt "Đang áp dụng" cần mức năng lượng và thời gian điều trị để khóa trên thiết bị.') && await vis(p, 'Liều khóa trên máy') && (await plansW1(p)).length === v0);
    await p.getByLabel('Thời gian mỗi lần điều trị (giây)').fill('200');
    rec('D10-06i', 'Công cụ gợi ý thời gian thu gọn mặc định, mở được', !(await vis(p, 'Hệ số (giây cho mỗi cm²)')) && await (async () => { await p.getByText('Công cụ gợi ý thời gian', { exact: true }).click(); await p.waitForTimeout(200); return vis(p, 'Hệ số (giây cho mỗi cm²)'); })());
    await tab(p, '3. Xác nhận');
    const keptReason = (await p.getByLabel('Lý do thay đổi').inputValue()) === 'Kiểm thử Đợt 10';
    rec('D10-06k', 'Quay lại sửa: lý do đã nhập còn nguyên; dấu xác nhận bị bỏ vì liều đổi (Đợt 8)', keptReason && (await p.getByRole('checkbox', { name: /Tôi xác nhận liều/ }).getAttribute('aria-checked')) === 'false');
    await p.getByRole('checkbox', { name: /Tôi xác nhận liều và lịch này/ }).click();
    const nd = p.dialogs.length;
    await p.getByText(SAVE06).click(); await p.waitForTimeout(600);
    const after = await plansW1(p); const top = after.sort((a, b) => b.version - a.version)[0];
    rec('D10-06e', 'Lưu hợp lệ: đúng 1 phiên bản 3, mức 5, 200 giây, đúng bệnh nhân và vết thương, có thông báo đã lưu',
      after.length === v0 + 1 && top.version === 3 && top.doseLevel === 5 && top.durationSec === 200 && top.patientId === 'p-1' && top.woundId === 'w-1' && p.dialogs.slice(nd).some((d) => d.includes('Đã lưu phiên bản mới')),
      `phiên bản ${v0}→${after.length}, v${top.version}, mức ${top.doseLevel}`);
    for (let i = 0; i < 3; i++) await p.getByText(SAVE06).click();
    await p.waitForTimeout(400);
    rec('D10-06f', 'Nhấn Lưu 3 lần ngay sau đó: không tạo phiên bản trùng; nút thành "Lưu phiên bản 4"', (await plansW1(p)).length === v0 + 1 && await has(p, /^Lưu phiên bản 4( cho VT\d+)?$/));
    // Rời màn giữa chừng.
    await tab(p, '2. Liều'); await p.getByRole('radio', { name: '3', exact: true }).first().click(); await tab(p, '3. Xác nhận');
    await p.getByLabel('Lý do thay đổi').fill('Rời giữa chừng');
    await go(p, '/patients/p-1'); await go(p, '/plan/p-1');
    rec('D10-06g', 'Rời màn khi đang kiểm tra: không lưu gì; mở lại thấy theo phiên bản đã lưu', (await plansW1(p)).length === v0 + 1);
    rec('D10-06z', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // ===== B07 =====
  {
    const p = await newPage(); await login(p);
    const evs = async () => ((await store(p)).evaluations || []);
    const n0 = (await evs()).length;
    await go(p, '/evaluate/w-1');
    rec('D10-07a', 'Đầu màn có ảnh tham chiếu, ngày chụp và "Diện tích bác sĩ đo"', await has(p, /^Ảnh tham chiếu IMG\d+$/, false) && await has(p, /^Chụp \d{2}\/\d{2}\/\d{4}$/, false) && await has(p, 'Diện tích bác sĩ đo'));
    rec('D10-07i', 'B07 không hiện số ước lượng AI/AR như số bác sĩ', !(await has(p, /ước lượng/i, false)));
    const swOn = await p.locator('input[role=switch]').first().isChecked();
    await p.getByText('Diễn biến và hướng dẫn', { exact: true }).click(); await p.waitForTimeout(200);
    const oldSwitchGone = !(await has(p, 'Công bố cho bệnh nhân xem')) && (await p.getByRole('switch', { name: 'Bệnh nhân sẽ xem đánh giá này' }).count()) === 1;
    await p.getByText('Diễn biến và hướng dẫn', { exact: true }).click(); await p.waitForTimeout(200);
    rec('D10-07b', 'Thẻ "Bệnh nhân sẽ xem" bật sẵn (mặc định cũ) ngay trên nút "Lưu và công bố cho bệnh nhân"; công tắc cũ trong nhóm 3 đã chuyển ra',
      swOn && oldSwitchGone && await has(p, 'Lưu và công bố cho bệnh nhân') && await has(p, 'Lời dặn trên trang chủ bệnh nhân: chưa có lời dặn.'), `bật ${swOn}, công tắc cũ đã chuyển ${oldSwitchGone}`);
    // Thiếu trường bắt buộc: nhập hướng dẫn trước, lưu.
    await p.getByText('Diễn biến và hướng dẫn', { exact: true }).click(); await p.waitForTimeout(200);
    await p.getByLabel('Hướng dẫn tiếp theo').fill('Thay băng mỗi ngày');
    rec('D10-07c', 'Xem trước lấy đúng lời dặn vừa nhập', await has(p, 'Lời dặn trên trang chủ bệnh nhân: “Thay băng mỗi ngày”'));
    await p.getByText('Lưu và công bố cho bệnh nhân').click(); await p.waitForTimeout(500);
    const errShown = (await p.getByRole('alert').count()) > 0;
    rec('D10-07d', 'Thiếu trường bắt buộc: báo lỗi theo quy tắc cũ, không lưu; hướng dẫn đã nhập còn nguyên', errShown && (await evs()).length === n0 && (await p.getByLabel('Hướng dẫn tiếp theo').inputValue()) === 'Thay băng mỗi ngày');
    // Điền bắt buộc.
    await fillRequired(p);
    const pick = async (name) => { await p.getByRole('radio', { name, exact: true }).first().click(); await p.waitForTimeout(150); };
    if (!(await vis(p, 'Mức độ vết thương'))) await p.getByText('Mức độ và triệu chứng', { exact: true }).click();
    await pick('Nhẹ');
    // Đóng, mở nhóm 3: dữ liệu giữ nguyên.
    await p.getByText('Diễn biến và hướng dẫn', { exact: true }).click(); await p.waitForTimeout(150);
    await p.getByText('Diễn biến và hướng dẫn', { exact: true }).click(); await p.waitForTimeout(150);
    rec('D10-07e', 'Đóng mở nhóm: hướng dẫn vẫn còn', (await p.getByLabel('Hướng dẫn tiếp theo').inputValue()) === 'Thay băng mỗi ngày');
    await p.getByRole('switch', { name: 'Bệnh nhân sẽ xem đánh giá này' }).click(); await p.waitForTimeout(150);
    rec('D10-07f', 'Tắt công bố: thẻ ghi "Chỉ bác sĩ thấy", nút đổi thành "Lưu đánh giá (chỉ bác sĩ)"', await has(p, 'Chỉ bác sĩ thấy đánh giá này.') && await has(p, 'Lưu đánh giá (chỉ bác sĩ)'));
    const nd = p.dialogs.length;
    const btn = p.getByText('Lưu đánh giá (chỉ bác sĩ)');
    await Promise.all([btn.click(), btn.click({ timeout: 300 }).catch(() => {}), btn.click({ timeout: 300 }).catch(() => {})]);
    await p.waitForTimeout(1000);
    const list = (await evs()).filter((e) => e.woundId === 'w-1');
    const last = (await evs())[(await evs()).length - 1];
    rec('D10-07g', 'Lưu hợp lệ (bấm 3 lần): đúng 1 đánh giá, đúng vết thương w-1, không công bố, có thông báo đã lưu',
      (await evs()).length === n0 + 1 && last.woundId === 'w-1' && last.visibleToPatient === false && last.instructions === 'Thay băng mỗi ngày' && p.dialogs.slice(nd).some((d) => d.includes('Đã lưu đánh giá')),
      `đánh giá ${n0}→${(await evs()).length}, w ${last.woundId}, công bố ${last.visibleToPatient}; ${list.length} của w-1`);
    rec('D10-07z', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
  // B07 với báo cáo triệu chứng chưa xử lý (p-2, w-2).
  {
    const p = await newPage(); await login(p);
    const run = async (mark) => {
      await go(p, '/evaluate/w-2');
      await p.getByText('Mức độ và triệu chứng', { exact: true }).click(); await p.waitForTimeout(200);
      const pre = (await p.locator('textarea').evaluateAll((els) => els.map((e) => e.value).join('|'))).includes('Rát nhẹ quanh vết thương');
      await fillRequired(p);
      if (!(await vis(p, 'Mức độ vết thương'))) await p.getByText('Mức độ và triệu chứng', { exact: true }).click();
      await p.getByRole('radio', { name: 'Nhẹ', exact: true }).first().click();
      await p.getByText('Lưu và công bố cho bệnh nhân').click(); await p.waitForTimeout(800);
      const card = await has(p, 'Đã lưu đánh giá. Bệnh nhân xem được đánh giá này.') && await has(p, 'Đánh dấu 1 báo cáo đã xử lý');
      const handledBefore = ((await store(p)).reports || []).find((r) => r.id === 'r-1')?.handled;
      if (mark) await p.getByText('Đánh dấu 1 báo cáo đã xử lý').click(); else await p.getByText('Để sau, quay lại hồ sơ').click();
      await p.waitForTimeout(600);
      return { pre, card, handledBefore, handledAfter: ((await store(p)).reports || []).find((r) => r.id === 'r-1')?.handled };
    };
    const r1 = await run(false);
    rec('D10-07h', 'Báo cáo đã điền vào Triệu chứng: sau khi lưu hỏi đánh dấu, chưa tự đánh dấu; chọn "Để sau" thì vẫn chưa xử lý',
      r1.pre && r1.card && r1.handledBefore === false && r1.handledAfter === false, JSON.stringify(r1));
    const r2 = await run(true);
    rec('D10-07j', 'Chọn "Đánh dấu 1 báo cáo đã xử lý": báo cáo r-1 thành đã xử lý', r2.card && r2.handledAfter === true, JSON.stringify(r2));
    rec('D10-07y', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  await b.close();
  const ok = results.filter((r) => r.pass).length;
  console.log(`\n${ok}/${results.length} đạt`);
  process.exit(ok === results.length ? 0 : 1);
})();
