// Kiểm thử tình huống Đợt 8 (ngăn thao tác sai) trên bản web, Playwright.
// Chạy: node scripts/kiem-thu-dot-8.cjs <baseURL> <thư mục ảnh>. Dựng web trước: npx expo export -p web, phục vụ dist với SPA fallback.
// Hộp xác nhận trên web là window.confirm: kịch bản chọn chấp nhận hoặc hủy theo từng bước (p.answer).
const { chromium } = require('playwright');
const { ganNgayCoLich } = require('./ngay-co-lich.cjs');
const BASE = process.argv[2] || 'http://localhost:8099';
const OUT = process.argv[3] || '.';
const results = [];
const rec = (id, name, pass, detail = '') => { results.push({ id, name, pass, detail }); console.log(pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };

(async () => {
  const b = await chromium.launch();
  const newPage = async (w = 390) => {
    const ctx = await b.newContext({ viewport: { width: w, height: 844 }, locale: 'vi-VN' });
    await ganNgayCoLich(ctx); // Stage 8: không phụ thuộc thứ trong tuần (xem scripts/ngay-co-lich.cjs)
    const p = await ctx.newPage();
    p.dialogs = []; p.answer = true; p.errors = [];
    p.on('dialog', (d) => { p.dialogs.push(`${d.type()}: ${d.message().split('\n')[0]}`); if (d.type() === 'alert' || p.answer) d.accept(); else d.dismiss(); });
    p.on('pageerror', (e) => p.errors.push(e.message));
    return p;
  };
  const login = async (p, user) => {
    await p.goto(BASE + '/'); await p.waitForTimeout(1000);
    await p.getByPlaceholder('Nhập tên đăng nhập').fill(user);
    await p.getByPlaceholder('Nhập mật khẩu').fill('Demo@123');
    await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1000);
    const cb = p.getByRole('checkbox');
    if (await cb.count()) { await cb.first().click(); await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1200); }
    const skip = p.getByText('Bỏ qua'); if (await skip.count()) { await skip.first().click(); await p.waitForTimeout(600); }
  };
  const relogin = async (p, user) => {
    await p.evaluate(() => localStorage.removeItem('plasmapro.session.v1'));
    await login(p, user);
  };
  const go = async (p, url) => { await p.goto(BASE + url); await p.waitForTimeout(1600); };
  const has = async (p, text, exact = true) => (await p.getByText(text, { exact }).count()) > 0;
  const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2') || '{}'));
  const checked = (p, name) => p.getByRole('checkbox', { name }).first().getAttribute('aria-checked');
  const CONFIRM = /Tôi xác nhận liều và lịch này/;
  const CLEARED = 'Dấu xác nhận đã được bỏ vì lịch hoặc liều vừa thay đổi. Kiểm tra lại tóm tắt ở trên rồi tích lại.';
  // Ảnh cả trang: nới chiều cao khung nhìn bằng chiều cao vùng cuộn dài nhất (cùng cách với chup-typo.cjs của Đợt 6).
  const shot = async (p, path) => {
    const w = p.viewportSize().width;
    const H = await p.evaluate(() => { let best = document.documentElement.scrollHeight; for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) best = Math.max(best, el.scrollHeight + (window.innerHeight - el.clientHeight)); } return Math.ceil(best); });
    await p.setViewportSize({ width: w, height: Math.max(844, H) }); await p.waitForTimeout(300);
    await p.screenshot({ path }); await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200);
  };
  const tab = (p, name) => p.getByRole('tab', { name }).click().then(() => p.waitForTimeout(300));

  // ===== UX-02: B06 dấu xác nhận liều =====
  {
    const p = await newPage();
    await login(p, 'bacsi'); await go(p, '/plan/p-1');
    const v0 = (await store(p)).plans.filter((x) => x.patientId === 'p-1').length;
    await tab(p, '3. Xác nhận');
    await p.getByRole('checkbox', { name: CONFIRM }).click(); await p.waitForTimeout(200);
    const on1 = await checked(p, CONFIRM);
    // Nhấn nhầm: quay lại bước Liều, đổi mức năng lượng, rồi về bước Xác nhận.
    await tab(p, '2. Liều');
    await p.getByRole('radio', { name: '5', exact: true }).first().click(); await p.waitForTimeout(200);
    await tab(p, '3. Xác nhận');
    const off1 = await checked(p, CONFIRM);
    const note1 = await has(p, CLEARED);
    rec('D8-02a', 'Đổi mức năng lượng sau khi tích: dấu xác nhận về trống và có câu giải thích', on1 === 'true' && off1 === 'false' && note1, `trước ${on1}, sau ${off1}, câu ${note1}`);
    // Dữ liệu không đầy đủ: đợt "Đang áp dụng" chưa tích thì không lưu.
    await p.getByLabel('Lý do thay đổi').fill('Kiểm thử Đợt 8');
    await p.getByText(/^Lưu phiên bản \d+( cho VT\d+)?$/).click(); await p.waitForTimeout(400);
    const blocked = await has(p, 'Đợt "Đang áp dụng" cần bác sĩ xác nhận.');
    const v1 = (await store(p)).plans.filter((x) => x.patientId === 'p-1').length;
    rec('D8-02b', 'Chưa tích lại: lưu bị chặn bởi quy tắc cũ, không tạo phiên bản', blocked && v1 === v0, `lỗi ${blocked}, phiên bản ${v0}→${v1}`);
    // Đổi thời gian ở ô nhập cũng bỏ dấu xác nhận.
    await p.getByRole('checkbox', { name: CONFIRM }).click(); await p.waitForTimeout(150);
    await tab(p, '2. Liều');
    await p.getByLabel('Thời gian mỗi lần điều trị (giây)').fill('200'); await p.waitForTimeout(150);
    await tab(p, '3. Xác nhận');
    rec('D8-02c', 'Sửa ô thời gian: dấu xác nhận về trống', (await checked(p, CONFIRM)) === 'false');
    // Đổi lịch (ngày giai đoạn) cũng bỏ dấu xác nhận.
    await p.getByRole('checkbox', { name: CONFIRM }).click(); await p.waitForTimeout(150);
    await tab(p, '1. Lịch');
    const d0 = p.getByPlaceholder('dd/mm/yyyy').nth(1); const old = await d0.inputValue();
    await d0.fill(''); await d0.fill(old); await p.waitForTimeout(150);
    await tab(p, '3. Xác nhận');
    rec('D8-02d', 'Sửa ngày ở bước Lịch: dấu xác nhận về trống', (await checked(p, CONFIRM)) === 'false');
    // Quay lại bước trước mà không đổi gì: dấu xác nhận giữ nguyên (không bắt tích lại vô ích).
    await p.getByRole('checkbox', { name: CONFIRM }).click(); await p.waitForTimeout(150);
    await tab(p, '2. Liều'); await tab(p, '3. Xác nhận');
    rec('D8-02e', 'Chỉ chuyển bước, không đổi giá trị: dấu xác nhận giữ nguyên', (await checked(p, CONFIRM)) === 'true');
    // Thao tác đúng: lưu được, rồi dấu xác nhận về trống.
    await p.getByText(/^Lưu phiên bản \d+( cho VT\d+)?$/).click(); await p.waitForTimeout(600);
    const s2 = await store(p); const v2 = s2.plans.filter((x) => x.patientId === 'p-1').length;
    const top = s2.plans.filter((x) => x.patientId === 'p-1').sort((a, c) => c.version - a.version)[0];
    const off2 = await checked(p, CONFIRM);
    rec('D8-02f', 'Lưu đúng: tạo đúng 1 phiên bản mới (mức 5, 200 giây, đã xác nhận), sau đó dấu xác nhận về trống', v2 === v0 + 1 && top.doseLevel === 5 && top.durationSec === 200 && top.confirmed === true && off2 === 'false', `phiên bản ${v0}→${v2}, mức ${top.doseLevel}, ${top.durationSec}s, dấu ${off2}`);
    // Nhấn Lưu liên tục: không tạo thêm phiên bản (lý do đã xóa, dấu xác nhận đã bỏ).
    for (let i = 0; i < 3; i++) await p.getByText(/^Lưu phiên bản \d+( cho VT\d+)?$/).click();
    await p.waitForTimeout(500);
    const v3 = (await store(p)).plans.filter((x) => x.patientId === 'p-1').length;
    rec('D8-02g', 'Nhấn Lưu 3 lần ngay sau khi lưu: không tạo phiên bản trùng', v3 === v2, `phiên bản ${v2}→${v3}`);
    for (const w of [320, 360, 390, 768]) {
      await p.setViewportSize({ width: w, height: 844 });
      await p.getByRole('checkbox', { name: CONFIRM }).click(); await p.waitForTimeout(100);
      await tab(p, '2. Liều'); await p.getByRole('radio', { name: '4', exact: true }).first().click(); await tab(p, '3. Xác nhận');
      await shot(p, `${OUT}/b06c-bo-xac-nhan-${w}.png`);
    }
    rec('D8-02z', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 120));
    await p.context().close();
  }

  // ===== UX-03: T01 hướng dẫn sau ACK, T02 chặn rời màn khi đang điều trị =====
  {
    const p = await newPage();
    await login(p, 'benhnhan'); await go(p, '/patient');
    await p.getByText('Nạp liệu trình vào máy').first().click(); await p.waitForTimeout(1200);
    await p.getByText('Kết nối', { exact: true }).click(); await p.waitForTimeout(1500);
    await p.getByText('Nạp liệu trình vào máy').last().click(); await p.waitForTimeout(2500);
    const acked = await has(p, /^Máy đã nhận liệu trình\./, false);
    const guide = await has(p, 'Bước tiếp theo') && await has(p, 'Buổi điều trị chỉ được ghi lại khi màn theo dõi đang mở.');
    rec('D8-03a', 'T01 sau khi máy nhận: có "Bước tiếp theo" và câu phiên chỉ ghi khi màn theo dõi mở', acked && guide, `ACK ${acked}`);
    for (const w of [320, 360, 390, 768]) { await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200); await shot(p, `${OUT}/t01c-buoc-tiep-theo-${w}.png`); }
    // Câu hướng dẫn nằm ngay trên nút Theo dõi ở 320 px (cùng màn đầu).
    await p.setViewportSize({ width: 320, height: 844 });
    const boxG = await p.getByText('Bước tiếp theo').boundingBox(); const boxB = await p.getByText('Theo dõi phiên điều trị').last().boundingBox();
    rec('D8-03b', 'Ở 320 px, câu hướng dẫn đứng ngay trước nút Theo dõi', !!boxG && !!boxB && boxG.y < boxB.y, `y ${boxG?.y} < ${boxB?.y}`);
    await p.setViewportSize({ width: 390, height: 844 });
    await p.getByText('Theo dõi phiên điều trị').last().click(); await p.waitForTimeout(1200);
    // Chưa điều trị: quay lại không hỏi.
    const n0 = p.dialogs.length;
    await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(800);
    const leftIdle = !(await has(p, 'Theo dõi phiên điều trị')) || (await p.getByText('Bắt đầu điều trị').count()) === 0;
    rec('D8-03c', 'Phiên chưa chạy: quay lại không hiện hộp xác nhận', p.dialogs.length === n0 && leftIdle, p.dialogs.slice(n0).join(' | '));
    await p.getByText('Theo dõi phiên điều trị').last().click(); await p.waitForTimeout(1200);
    await p.getByText('Bắt đầu điều trị').click(); await p.waitForTimeout(2500);
    const running = await has(p, 'Đang điều trị, còn lại');
    await p.screenshot({ path: `${OUT}/t02-dang-dieu-tri-390.png` });
    // Nhấn nhầm quay lại, rồi chọn ở lại.
    // Stage 7 (PR 57) đổi hộp thoại window.confirm thành khung hỏi trong chân màn (data-testid="leave-ask"); Stage 8 cập nhật ca này theo giao diện đã duyệt.
    const askBox = () => p.locator('[data-testid="leave-ask"]:visible');
    const stay = async () => { await p.getByText('Ở lại màn theo dõi', { exact: true }).last().click(); await p.waitForTimeout(300); };
    p.answer = false; const n1 = p.dialogs.length;
    await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(800);
    const asked = (await askBox().count()) > 0 && (await askBox().getByText('Rời màn theo dõi?').count()) > 0 && p.dialogs.length === n1;
    await stay();
    const stayed = await has(p, 'Đang điều trị, còn lại') && (await askBox().count()) === 0;
    const stopVisible = await p.getByText('Dừng điều trị').isVisible();
    rec('D8-03d', 'Đang điều trị, bấm quay lại, chọn ở lại: vẫn ở T02, đồng hồ chạy, nút Dừng còn hiện', running && asked && stayed && stopVisible, `chạy ${running}, hỏi ${asked}, ở lại ${stayed}, Dừng ${stopVisible}`);
    // Nhấn quay lại liên tục 3 lần, đều chọn ở lại: mỗi lần một hộp, không vòng lặp, vẫn ở T02.
    const n2 = p.dialogs.length; let asks = 0;
    for (let i = 0; i < 3; i++) { await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(400); asks += (await askBox().count()) > 0 ? 1 : 0; await stay(); }
    rec('D8-03e', 'Bấm quay lại 3 lần, chọn ở lại: mỗi lần hiện câu hỏi trong chân màn (3 lần), không hộp thoại, vẫn ở T02', asks === 3 && p.dialogs.length === n2 && await has(p, 'Đang điều trị, còn lại'), `${asks} lần hỏi, ${p.dialogs.length - n2} hộp thoại`);
    // Nút Dừng điều trị không bị chặn hay hỏi lại.
    const n3 = p.dialogs.length;
    await p.getByText('Dừng điều trị').click(); await p.waitForTimeout(1500);
    const stopped = await has(p, 'Đã dừng');
    rec('D8-03f', 'Nút Dừng điều trị hoạt động ngay, không có hộp xác nhận', stopped && p.dialogs.length === n3, p.dialogs.slice(n3).join(' | '));
    // Sau khi dừng: rời màn không hỏi.
    const n4 = p.dialogs.length;
    await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(800);
    rec('D8-03g', 'Phiên đã dừng: quay lại không hỏi', p.dialogs.length === n4, p.dialogs.slice(n4).join(' | '));
    // Chạy lại, rồi chọn "Vẫn rời màn": rời đúng một lần, không hỏi lần hai.
    await p.getByText('Theo dõi phiên điều trị').last().click(); await p.waitForTimeout(1200);
    await p.getByText('Bắt đầu điều trị').click(); await p.waitForTimeout(2000);
    p.answer = true; const n5 = p.dialogs.length;
    await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(600);
    const askedOnce = (await askBox().count()) > 0;
    await p.getByText('Vẫn rời màn', { exact: true }).last().click(); await p.waitForTimeout(1200);
    const leftRun = (await p.locator('[data-testid="screen-footer"]:visible').getByText('Dừng điều trị').count()) === 0;
    rec('D8-03h', 'Đang điều trị, chọn "Vẫn rời màn": rời màn sau một lần hỏi trong chân màn, không hộp thoại', askedOnce && leftRun && p.dialogs.length === n5, p.dialogs.slice(n5).join(' | '));
    rec('D8-03z', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 120));
    await p.context().close();
  }

  // ===== UX-04, UX-05: Q01 =====
  {
    const p = await newPage();
    await login(p, 'quantri'); await go(p, '/admin');
    // Stage 6 (PR 56) đưa phân công vào thẻ "Phân công" của Q01; Stage 8 cập nhật đường vào, giữ nguyên các kiểm tra.
    const toAssign = async () => { await p.getByRole('tablist').getByRole('tab', { name: 'Phân công' }).click(); await p.waitForTimeout(300); };
    await toAssign();
    const doc = async () => (await store(p)).patients.find((x) => x.id === 'p-1').doctorId;
    const d0 = await doc();
    // Mở rồi đóng bảng chọn liên tục: không đổi dữ liệu.
    const btn = p.getByText('Đổi', { exact: true }).first();
    await btn.click(); await p.waitForTimeout(150); await p.getByText('Đóng', { exact: true }).first().click(); await p.waitForTimeout(150); await btn.click(); await p.waitForTimeout(300);
    rec('D8-04a', 'Mở, đóng bảng chọn nhiều lần: không đổi bác sĩ', (await doc()) === d0);
    for (const w of [320, 360, 390, 768]) { await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200); await shot(p, `${OUT}/q01-chon-bac-si-${w}.png`); }
    await p.setViewportSize({ width: 390, height: 844 });
    // Chọn bác sĩ khác rồi Hủy.
    p.answer = false; const n0 = p.dialogs.length;
    await p.getByRole('radio', { name: 'BS. Lê Thu Hà' }).first().click(); await p.waitForTimeout(400);
    const asked = p.dialogs.slice(n0).some((d) => d.includes('Đổi bác sĩ phụ trách BN001?'));
    rec('D8-04b', 'Chọn bác sĩ khác rồi hủy: có hộp xác nhận, không đổi dữ liệu', asked && (await doc()) === d0, p.dialogs.slice(n0).join(' | '));
    // Xác nhận.
    p.answer = true;
    await p.getByRole('radio', { name: 'BS. Lê Thu Hà' }).first().click(); await p.waitForTimeout(500);
    const d1 = await doc();
    const fb = await has(p, /Đã chuyển BN001 từ BS\. Trần Minh An sang BS\. Lê Thu Hà\./, false);
    rec('D8-04c', 'Xác nhận: đổi đúng bác sĩ, có thông báo kết quả', d1 !== d0 && fb, `${d0}→${d1}, thông báo ${fb}`);
    for (const w of [320, 360, 390, 768]) { await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200); await shot(p, `${OUT}/q01-da-doi-${w}.png`); }
    await p.setViewportSize({ width: 390, height: 844 });
    const n1 = p.dialogs.length;
    await p.getByText('Hoàn tác').first().click(); await p.waitForTimeout(400);
    rec('D8-04d', 'Hoàn tác: trả về bác sĩ cũ, không hỏi lại, thông báo biến mất', (await doc()) === d0 && p.dialogs.length === n1 && !(await has(p, /Đã chuyển BN001/, false)));
    // Bác sĩ cũ mất hồ sơ khỏi danh sách khi đổi thật (kiểm tra hậu quả, rồi trả lại).
    await p.getByText('Đổi', { exact: true }).first().click(); await p.waitForTimeout(200);
    await p.getByRole('radio', { name: 'BS. Lê Thu Hà' }).first().click(); await p.waitForTimeout(400);
    await relogin(p, 'bacsi'); await go(p, '/doctor/patients');
    const gone = !(await has(p, /BN001/, false));
    await relogin(p, 'quantri'); await go(p, '/admin'); await toAssign();
    await p.getByText('Đổi', { exact: true }).first().click(); await p.waitForTimeout(200);
    await p.getByRole('radio', { name: 'BS. Trần Minh An' }).first().click(); await p.waitForTimeout(400);
    rec('D8-04e', 'Hậu quả nêu trong hộp là đúng: sau khi đổi, bác sĩ cũ không còn thấy BN001; đổi lại được', gone && (await doc()) === d0, `mất khỏi danh sách ${gone}`);
    // UX-05: khóa tài khoản. Stage 6 chuyển công tắc sang trang chi tiết tài khoản (Q01b) dạng nút. Người dùng chốt 14/11/2026
    // (commit 3779119): khóa, mở khóa, cấp và thu quyền đều hỏi xác nhận, nên D8-05c, D8-05f nay kiểm "có hỏi" thay cho "không hỏi".
    const acc = async (id) => (await store(p)).accounts.find((a) => a.username === id);
    await go(p, '/admin-account/u-bs2');
    const act = async (label, answer) => { p.answer = answer; const n = p.dialogs.length; await p.getByText(label, { exact: true }).first().click(); await p.waitForTimeout(400); return p.dialogs.length - n; };
    const a1 = await act('Khóa tài khoản', false);
    rec('D8-05a', 'Khóa tài khoản rồi hủy: có hộp xác nhận, tài khoản vẫn mở', a1 === 1 && !(await acc('bacsi2')).locked, p.dialogs.slice(-1).join(' | '));
    await act('Khóa tài khoản', true);
    rec('D8-05b', 'Khóa tài khoản, xác nhận: đã khóa', !!(await acc('bacsi2')).locked);
    const a3 = await act('Mở khóa tài khoản', true);
    rec('D8-05c', 'Mở khóa: hỏi xác nhận một lần (theo quyết định 14/11/2026), đồng ý thì mở', !(await acc('bacsi2')).locked && a3 === 1);
    const r0 = !!(await acc('bacsi2')).researchAccess;
    const a4 = await act('Cấp quyền xuất dữ liệu', false);
    rec('D8-05d', 'Cấp quyền xuất dữ liệu rồi hủy: có hộp xác nhận, không cấp', !r0 && a4 === 1 && !(await acc('bacsi2')).researchAccess, `trước ${r0}`);
    await act('Cấp quyền xuất dữ liệu', true);
    rec('D8-05e', 'Cấp quyền, xác nhận: đã cấp', !!(await acc('bacsi2')).researchAccess);
    const a6 = await act('Thu quyền xuất dữ liệu', true);
    rec('D8-05f', 'Thu quyền: hỏi xác nhận một lần (theo quyết định 14/11/2026), đồng ý thì thu', !(await acc('bacsi2')).researchAccess && a6 === 1);
    rec('D8-05z', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 120));
    await p.context().close();
  }

  // ===== UX-07: B04 giao máy =====
  {
    const p = await newPage();
    await login(p, 'quantri'); await go(p, '/admin/devices');
    await p.getByText('Đăng ký thiết bị mới').click(); await p.waitForTimeout(300);
    await p.getByLabel('Mã thiết bị').fill('TB-009'); await p.getByText('Đăng ký', { exact: true }).click(); await p.waitForTimeout(400);
    await relogin(p, 'bacsi'); await go(p, '/patients/p-3');
    const devOf = async () => (await store(p)).devices.find((d) => d.code === 'TB-009')?.patientId ?? null;
    await p.getByText('Giao máy', { exact: true }).click(); await p.waitForTimeout(300);
    p.answer = false; const n0 = p.dialogs.length;
    await p.getByText('Giao TB-009').click(); await p.waitForTimeout(400);
    const asked = p.dialogs.slice(n0).some((d) => d.includes('Giao TB-009 cho Trần Văn M?'));
    rec('D8-07a', 'Giao máy rồi hủy: có hộp nêu mã máy và tên bệnh nhân, không giao', asked && (await devOf()) === null, p.dialogs.slice(n0).join(' | '));
    p.answer = true;
    await p.getByText('Giao TB-009').click(); await p.waitForTimeout(500);
    const given = (await devOf()) === 'p-3' && await has(p, 'Thu hồi TB-009');
    rec('D8-07b', 'Giao máy, xác nhận: máy gắn đúng hồ sơ, nút đổi thành "Thu hồi"', given);
    rec('D8-07c', 'Nhấn giao lần nữa không được: nút "Giao TB-009" không còn', (await p.getByText('Giao TB-009').count()) === 0);
    rec('D8-07z', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 120));
    await p.context().close();
  }

  await b.close();
  const pass = results.filter((r) => r.pass).length;
  console.log(JSON.stringify({ pass, total: results.length, results }));
})();
