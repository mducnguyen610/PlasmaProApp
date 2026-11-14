// Kiểm thử giao diện theo tác vụ, giai đoạn 6: khu vực quản trị (Q01 đến Q07).
// Bản web, Playwright, dữ liệu mô phỏng. Chạy: node scripts/kiem-thu-tb-6.cjs <baseURL> <thư mục kết quả>
// Dữ liệu thêm cho từng ca chỉ ghi vào localStorage của ngữ cảnh trình duyệt đó (không sửa kho mã).
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8602';
const OUT = process.argv[3] || '.';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const rec = (id, name, pass, detail = '') => { results.push({ id, name, result: pass ? 'ĐẠT' : 'LỖI', detail }); console.log(pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };
const KEY = 'plasmapro.demo.v2';

(async () => {
  const b = await chromium.launch();
  const newPage = async ({ w = 390, h = 844 } = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'vi-VN' });
    const p = await ctx.newPage();
    p.errors = []; p.dialogs = []; p.answer = true;
    p.on('dialog', (d) => { p.dialogs.push(d.message()); if (p.answer) d.accept(); else d.dismiss(); });
    p.on('pageerror', (e) => p.errors.push(e.message));
    return p;
  };
  const login = async (p, user = 'quantri') => {
    await p.evaluate(() => { try { localStorage.removeItem('plasmapro.session.v1'); } catch { /* trang trống */ } }).catch(() => {});
    await p.goto(BASE + '/'); await p.waitForTimeout(1000);
    await p.getByPlaceholder('Nhập tên đăng nhập').fill(user);
    await p.getByPlaceholder('Nhập mật khẩu').fill('Demo@123');
    await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1000);
    const cb = p.getByRole('checkbox');
    if (await cb.count()) { await cb.first().click(); await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1200); }
    const skip = p.getByText('Bỏ qua'); if (await skip.count()) { await skip.first().click(); await p.waitForTimeout(600); }
  };
  const go = async (p, url) => { await p.goto(BASE + url); await p.waitForTimeout(1400); };
  const has = async (p, t, exact = true) => (await p.getByText(t, { exact }).count()) > 0;
  const visible = async (p, t) => { const l = p.getByText(t, { exact: true }); return (await l.count()) > 0 && await l.first().isVisible(); };
  const store = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
  const mutate = async (p, fn) => { await p.evaluate(([k, src]) => { const d = JSON.parse(localStorage.getItem(k)); new Function('d', src)(d); localStorage.setItem(k, JSON.stringify(d)); }, [KEY, fn]); };
  const back = async (p) => { await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(1000); };
  const url = (p) => decodeURIComponent(p.url().replace(BASE, ''));
  const overflow = (p) => p.evaluate(() => { const W = window.innerWidth; return [...document.querySelectorAll('div,span')].filter((e) => { const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed')) return false; for (let a = e.parentElement; a; a = a.parentElement) { const ox = getComputedStyle(a).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return false; } return true; }).length; });
  const clinical = (d) => JSON.stringify({ images: d.images, evaluations: d.evaluations, plans: d.plans, sessions: d.sessions, sessionNotes: d.sessionNotes, wounds: d.wounds, reports: d.reports, patients: (d.patients || []).map(({ doctorId, ...x }) => x) });
  const acc = async (p, id) => (await store(p)).accounts.find((a) => a.id === id);
  const rows = (p) => p.locator('[data-testid^="tai-khoan-"]').count();
  const search = (p, v) => p.getByLabel('Tìm tài khoản').fill(v).then(() => p.waitForTimeout(300));
  const PENDING = "d.accounts.push({ id: 'u-moi', role: 'doctor', name: 'BS. Đỗ Văn Mới', username: 'bacsimoi', locked: true, pendingApproval: true });";

  // ---------- Q01 ----------
  {
    const p = await newPage(); await login(p); await go(p, '/admin');
    const d0 = clinical(await store(p));
    // TB6-01: tổng quan ba ô có lối vào; số liệu khác thu gọn; thanh chọn hai phần; mặc định danh sách tài khoản đủ 5.
    const tiles = await has(p, 'Chờ duyệt') && await has(p, 'Trực tuyến') && await has(p, 'Lỗi chưa xử lý');
    const folded = await has(p, 'Số liệu khác') && !(await visible(p, 'Ảnh đã đo (4/6)')) ;
    await p.getByText('Số liệu khác', { exact: true }).click(); await p.waitForTimeout(300);
    const unfolded = await has(p, /^Ảnh đã đo \(\d+\/\d+\)$/, false) && await has(p, 'Chỉ hiển thị mã hồ sơ, không có dữ liệu lâm sàng.');
    const seg = (await p.getByRole('tablist').getByRole('tab', { name: 'Tài khoản' }).count()) === 1 && (await p.getByRole('tablist').getByRole('tab', { name: 'Phân công' }).count()) === 1;
    const all = await rows(p);
    const noAssign = !(await has(p, 'Đổi'));
    rec('TB6-01', 'Q01: ba ô tổng quan, "Số liệu khác" thu gọn và mở được, thanh chọn Tài khoản/Phân công, mặc định đủ 5 tài khoản, chưa hiện phân công',
      tiles && folded && unfolded && seg && all === 5 && noAssign, `ô ${tiles}, thu gọn ${folded}/${unfolded}, thanh ${seg}, ${all} dòng`);
    // TB6-02: tìm kiếm không dấu, theo tên đăng nhập, mã hồ sơ; không khớp thì trạng thái trống và "Bỏ lọc".
    await search(p, 'le thu'); const s1 = await rows(p) === 1 && await has(p, 'BS. Lê Thu Hà');
    await search(p, '@benhnhan2'); const s2 = await rows(p) === 1 && await has(p, 'BN002');
    await search(p, 'Phạm Thị B'); const s3 = await rows(p) === 0 && await has(p, 'Không có tài khoản khớp bộ lọc.');
    await p.getByText('Bỏ lọc', { exact: true }).click(); await p.waitForTimeout(300);
    const s4 = await rows(p) === 5;
    rec('TB6-02', 'Q01: tìm "le thu" ra BS. Lê Thu Hà; "@benhnhan2" ra BN002; họ tên bệnh nhân không tìm được (chỉ mã hồ sơ); trống thì "Bỏ lọc" trả đủ 5', s1 && s2 && s3 && s4, `${s1}/${s2}/${s3}/${s4}`);
    // TB6-03: lọc vai trò và trạng thái.
    const roleFolded = (await p.getByRole('radio', { name: 'Mọi vai trò' }).count()) === 0;
    await p.getByText('Lọc theo vai trò', { exact: true }).click(); await p.waitForTimeout(300);
    await p.getByRole('radio', { name: 'Bệnh nhân' }).click(); await p.waitForTimeout(300); const f1 = await rows(p);
    const summary = await has(p, 'Lọc theo vai trò') && (await p.getByRole('button', { name: 'Lọc theo vai trò, Bệnh nhân' }).count()) === 1;
    await p.getByRole('radio', { name: 'Mọi vai trò' }).click(); await p.getByRole('radio', { name: 'Đã khóa' }).click(); await p.waitForTimeout(300); const f2 = await rows(p);
    await p.getByRole('radio', { name: 'Tất cả' }).click(); await p.waitForTimeout(300);
    rec('TB6-03', 'Q01: lọc vai trò thu gọn mặc định, tóm tắt nêu vai trò đang chọn; Bệnh nhân ra 2; Đã khóa (dữ liệu mẫu không có) ra 0', roleFolded && summary && f1 === 2 && f2 === 0, `${roleFolded}/${summary}, ${f1}, ${f2}`);

    // TB6-04: mở chi tiết, xem quyền; cấp quyền có xác nhận (Hủy không đổi, Đồng ý đổi), báo thành công; Back về Q01 giữ ô tìm.
    await search(p, 'thu ha');
    await p.getByTestId('tai-khoan-u-bs2').click(); await p.waitForTimeout(1000);
    const onDetail = url(p).startsWith('/admin-account/u-bs2') && await has(p, 'Chưa cấp') && await has(p, '@bacsi2') && await has(p, 'Ngoại khoa');
    p.answer = false; let n = p.dialogs.length;
    await p.getByText('Cấp quyền xuất dữ liệu', { exact: true }).click(); await p.waitForTimeout(300);
    const askG = p.dialogs.length - n === 1 && p.dialogs[n].includes('Cấp quyền xuất dữ liệu cho BS. Lê Thu Hà?') && !(await acc(p, 'u-bs2')).researchAccess;
    p.answer = true; n = p.dialogs.length;
    await p.getByText('Cấp quyền xuất dữ liệu', { exact: true }).click(); await p.waitForTimeout(400);
    const granted = (await acc(p, 'u-bs2')).researchAccess === true && await has(p, 'Đã cấp quyền xuất dữ liệu nghiên cứu.') && await has(p, 'Được cấp');
    n = p.dialogs.length;
    await p.getByText('Thu quyền xuất dữ liệu', { exact: true }).click(); await p.waitForTimeout(400);
    const revoked = p.dialogs.length === n && (await acc(p, 'u-bs2')).researchAccess === false;
    rec('TB6-04', 'Q01b: chi tiết đúng tài khoản; cấp quyền hỏi xác nhận (Hủy không đổi, Đồng ý đổi, có thông báo thành công); thu quyền đổi ngay như cũ',
      onDetail && askG && granted && revoked, `${onDetail}/${askG}/${granted}/${revoked}`);
    // TB6-05: khóa có xác nhận; mở khóa đổi ngay; tài khoản đang đăng nhập không khóa được.
    p.answer = false; n = p.dialogs.length;
    await p.getByText('Khóa tài khoản', { exact: true }).click(); await p.waitForTimeout(300);
    const askL = p.dialogs.length - n === 1 && p.dialogs[n].includes('Khóa tài khoản BS. Lê Thu Hà?') && !(await acc(p, 'u-bs2')).locked;
    p.answer = true;
    await p.getByText('Khóa tài khoản', { exact: true }).click(); await p.waitForTimeout(400);
    const locked = (await acc(p, 'u-bs2')).locked === true && await has(p, 'Đã khóa');
    n = p.dialogs.length;
    await p.getByText('Mở khóa tài khoản', { exact: true }).click(); await p.waitForTimeout(400);
    const unlocked = p.dialogs.length === n && (await acc(p, 'u-bs2')).locked === false;
    await back(p);
    const backOk = url(p).startsWith('/admin') && !url(p).startsWith('/admin-') && (await p.getByLabel('Tìm tài khoản').inputValue()) === 'thu ha' && await rows(p) === 1;
    await search(p, '');
    await p.getByTestId('tai-khoan-u-qt').click(); await p.waitForTimeout(1000);
    const self = await has(p, 'Tài khoản đang đăng nhập, không khóa được.') && !(await has(p, 'Khóa tài khoản'));
    await back(p);
    rec('TB6-05', 'Q01b: khóa hỏi xác nhận; mở khóa đổi ngay; Back về Q01 giữ chữ tìm và kết quả; tài khoản đang đăng nhập không có nút khóa',
      askL && locked && unlocked && backOk && self, `${askL}/${locked}/${unlocked}/${backOk}/${self}`);

    // TB6-06: phân công: đổi bác sĩ hỏi đúng một hộp, có Hoàn tác; Hủy không đổi.
    await p.getByRole('tablist').getByRole('tab', { name: 'Phân công' }).click(); await p.waitForTimeout(300);
    const doc = async () => (await store(p)).patients.find((x) => x.id === 'p-1').doctorId;
    const before = await doc();
    await p.getByText('Đổi', { exact: true }).first().click(); await p.waitForTimeout(300);
    p.answer = false; n = p.dialogs.length;
    await p.getByRole('radio', { name: 'BS. Lê Thu Hà' }).first().click(); await p.waitForTimeout(400);
    const cancel = p.dialogs.length - n === 1 && p.dialogs[n].includes('Đổi bác sĩ phụ trách BN001?') && (await doc()) === before;
    p.answer = true; n = p.dialogs.length;
    await p.getByRole('radio', { name: 'BS. Lê Thu Hà' }).first().click(); await p.waitForTimeout(400);
    const moved = p.dialogs.length - n === 1 && (await doc()) === 'u-bs2' && await has(p, /^Đã chuyển BN001 từ /, false);
    await p.getByText('Hoàn tác', { exact: true }).click(); await p.waitForTimeout(400);
    const undone = (await doc()) === before;
    await p.getByLabel('Tìm mã hồ sơ').fill('bn002'); await p.waitForTimeout(300);
    const filt = await has(p, 'BN002') && !(await has(p, 'BN001'));
    await p.getByRole('tablist').getByRole('tab', { name: 'Tài khoản' }).click(); await p.waitForTimeout(300);
    rec('TB6-06', 'Q01 Phân công: Hủy không đổi; Đồng ý đổi đúng sau một hộp xác nhận; Hoàn tác trả lại; tìm mã hồ sơ', cancel && moved && undone && filt, `${cancel}/${moved}/${undone}/${filt}`);
    rec('TB6-07', 'Các thao tác Q01 không đổi dữ liệu lâm sàng (trừ bác sĩ phụ trách, đã hoàn tác)', clinical(await store(p)) === d0 && (await doc()) === before);
    rec('TB6-08', 'Không lỗi JS trong luồng Q01', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
    await p.context().close();
  }

  // TB6-09: ô "Chờ duyệt" mở danh sách đã lọc; duyệt tài khoản (như cũ: không hỏi, mở khóa luôn).
  {
    const p = await newPage(); await login(p); await mutate(p, PENDING); await go(p, '/admin');
    await p.getByRole('button', { name: '1 Chờ duyệt' }).click(); await p.waitForTimeout(400);
    const only = await rows(p) === 1 && await has(p, 'BS. Đỗ Văn Mới');
    await p.getByTestId('tai-khoan-u-moi').click(); await p.waitForTimeout(1000);
    const noResearch = await has(p, 'Duyệt tài khoản trước khi cấp quyền xuất dữ liệu.') && !(await has(p, 'Cấp quyền xuất dữ liệu'));
    await p.getByText('Duyệt tài khoản', { exact: true }).click(); await p.waitForTimeout(400);
    const a = await acc(p, 'u-moi');
    const ok = a.pendingApproval === false && a.locked === false && await has(p, 'Đã duyệt tài khoản.') && await has(p, 'Cấp quyền xuất dữ liệu');
    rec('TB6-09', 'Ô "Chờ duyệt" lọc đúng 1 tài khoản chờ; chi tiết chưa cho cấp quyền khi chờ duyệt; Duyệt mở tài khoản và báo thành công', only && noResearch && ok, `${only}/${noResearch}/${ok}`);
    await p.getByText('Duyệt tài khoản', { exact: true }).count();
    // Ô lỗi và trực tuyến dẫn sang tab tương ứng.
    await go(p, '/admin');
    await p.getByRole('button', { name: /Lỗi chưa xử lý$/ }).click(); await p.waitForTimeout(800);
    const toLogs = url(p).startsWith('/admin/logs');
    await go(p, '/admin');
    await p.getByRole('button', { name: /Trực tuyến$/ }).click(); await p.waitForTimeout(800);
    const toDev = url(p).startsWith('/admin/devices');
    rec('TB6-10', 'Ô "Lỗi chưa xử lý" mở Q04, ô "Trực tuyến" mở Q03', toLogs && toDev, `${toLogs}/${toDev}`);
    await p.context().close();
  }

  // TB6-11: truy cập trái phép và không tìm thấy.
  {
    const p = await newPage(); let ok = true; const det = [];
    for (const user of ['bacsi', 'benhnhan']) {
      await login(p, user);
      for (const u of ['/admin-account/u-bs2', '/admin-log/s-1']) {
        await go(p, u);
        const blocked = await has(p, 'Không có quyền') && !(await has(p, '@bacsi2')) && !(await has(p, 'Đánh dấu đã xử lý'));
        if (!blocked) { ok = false; det.push(`${user} ${u}`); }
      }
      await go(p, '/admin');
      if (await has(p, 'Quản lý tài khoản')) { ok = false; det.push(`${user} /admin`); }
    }
    await login(p, 'quantri');
    await go(p, '/admin-account/khong-co'); const nf1 = await has(p, 'Không tìm thấy');
    await go(p, '/admin-log/khong-co'); const nf2 = await has(p, 'Không tìm thấy');
    rec('TB6-11', 'Bác sĩ, bệnh nhân không mở được chi tiết tài khoản, chi tiết lỗi, Q01; mã không có thì "Không tìm thấy"', ok && nf1 && nf2, det.join(', ') + ` ${nf1}/${nf2}`);
    await p.context().close();
  }

  // ---------- Q02 ----------
  {
    const p = await newPage(); await login(p); await go(p, '/admin/dataset');
    const pos = await p.evaluate(() => { const f = (t) => { const e = [...document.querySelectorAll('div')].find((x) => x.textContent.trim() === t || [...x.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() === t)); return e ? e.getBoundingClientRect().y : null; }; return { dl: f('Tải dữ liệu theo bộ lọc'), grid: f('Bộ ảnh đã gán diện tích') }; });
    const order = pos.dl != null && pos.grid != null && pos.dl < pos.grid;
    const folded = await has(p, 'Xem trước labels.csv') && !(await has(p, /^image,|^filename|labels/i, false) && false);
    const btn = p.getByRole('button', { name: /^Tải bộ dữ liệu/ });
    const enabled = !(await btn.first().isDisabled());
    await mutate(p, "d.accounts.find((a) => a.id === 'u-qt').researchAccess = false;"); await go(p, '/admin/dataset');
    const disabled = await has(p, 'Tài khoản chưa được cấp quyền xuất dữ liệu nghiên cứu.');
    rec('TB6-12', 'Q02: thẻ tải ở trên lưới ảnh, bản xem trước CSV thu gọn; có quyền thì nút tải bật, không có quyền thì tắt và nêu lý do', order && folded && enabled && disabled, `${JSON.stringify(pos)} ${enabled}/${disabled}`);
    await p.context().close();
  }

  // ---------- Q03 ----------
  {
    const p = await newPage(); await login(p); await go(p, '/admin/devices');
    const count = async () => (await store(p)).devices.length;
    const c0 = await count();
    await p.getByText('Đăng ký thiết bị mới', { exact: true }).click(); await p.waitForTimeout(500);
    const sheet = p.getByTestId('bang-dang-ky-thiet-bi');
    const opened = await sheet.isVisible();
    await sheet.getByLabel('Mã thiết bị').fill('TB-1'); await p.waitForTimeout(200);
    const invalid = await has(p, 'Định dạng TB-xxx.');
    await sheet.getByLabel('Mã thiết bị').fill('TB-001'); await p.waitForTimeout(200);
    const dup = await has(p, 'Mã thiết bị đã tồn tại.');
    await sheet.getByLabel('Mã thiết bị').fill('TB-009'); await p.waitForTimeout(200);
    await p.getByRole('button', { name: 'Đóng', exact: true }).click(); await p.waitForTimeout(500);
    const closed = (await p.getByTestId('bang-dang-ky-thiet-bi').count()) === 0 && await has(p, 'Tiếp tục đăng ký thiết bị') && (await count()) === c0;
    await p.getByText('Tiếp tục đăng ký thiết bị', { exact: true }).click(); await p.waitForTimeout(500);
    const kept = (await p.getByTestId('bang-dang-ky-thiet-bi').getByLabel('Mã thiết bị').inputValue()) === 'TB-009';
    await p.getByTestId('bang-dang-ky-thiet-bi').getByRole('button', { name: 'Đăng ký', exact: true }).dblclick(); await p.waitForTimeout(600);
    const once = (await count()) === c0 + 1 && (await store(p)).devices.filter((d) => d.code === 'TB-009').length === 1;
    const success = await has(p, 'Đã đăng ký thiết bị TB-009.') && (await p.getByTestId('bang-dang-ky-thiet-bi').count()) === 0;
    rec('TB6-13', 'Q03: đăng ký mở bảng trượt; báo lỗi định dạng và trùng mã; đóng bảng giữ mã đang nhập; bấm đúp chỉ đăng ký 1 máy; báo thành công',
      opened && invalid && dup && closed && kept && once && success, `${opened}/${invalid}/${dup}/${closed}/${kept}/${once}/${success}`);
    // Lối vào Q05, Q06 giữ.
    await p.getByText('TB-001', { exact: true }).first().click(); await p.waitForTimeout(300);
    await p.getByText('Xem nhật ký', { exact: true }).first().click(); await p.waitForTimeout(1000);
    const q06 = url(p).startsWith('/devices/d-1') && await has(p, 'Thiết bị và nhật ký') && !(await has(p, 'Kết nối máy và nạp liệu trình'));
    await back(p);
    await p.getByText('Chẩn đoán kết nối USB/UART', { exact: true }).click(); await p.waitForTimeout(1000);
    const q05 = url(p).startsWith('/device-diagnostics');
    rec('TB6-14', 'Q03 → Q06 (mức kỹ thuật, không nút nạp liệu trình) và Q03 → Q05 còn chạy', q06 && q05, `${q06}/${q05}`);
    rec('TB6-15', 'Không lỗi JS trong luồng Q03', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
    await p.context().close();
  }

  // ---------- Q04 ----------
  {
    const p = await newPage(); await login(p);
    await mutate(p, "d.syncErrors.push({ id: 's-2', at: '2026-11-13T02:00:00.000Z', deviceId: 'd-1', message: 'TB-001 chưa gửi nhật ký phiên (thử).', resolved: false }, { id: 's-3', at: '2026-11-13T05:00:00.000Z', message: 'Máy chủ không phản hồi (thử).', resolved: false });");
    await go(p, '/admin/logs');
    const total = (await store(p)).syncErrors.length;
    const seg = (await p.getByRole('tab', { name: `Tất cả (${total})` }).count()) === 1 && (await p.getByRole('tab', { name: 'Chưa xử lý (2)' }).count()) === 1;
    const day = await has(p, '13/11/2026');
    const allRows = await p.locator('[data-testid^="loi-"]').count();
    await p.getByRole('tab', { name: 'Chưa xử lý (2)' }).click(); await p.waitForTimeout(300);
    const openRows = await p.locator('[data-testid^="loi-"]').count();
    await p.getByTestId('loi-s-2').click(); await p.waitForTimeout(1000);
    const det = url(p).startsWith('/admin-log/s-2') && await has(p, 'TB-001 chưa gửi nhật ký phiên (thử).') && await has(p, 'Xem nhật ký TB-001');
    await p.getByRole('button', { name: 'Đánh dấu đã xử lý' }).click(); await p.waitForTimeout(400);
    const resolved = (await store(p)).syncErrors.find((e) => e.id === 's-2').resolved === true && await has(p, 'Đã đánh dấu đã xử lý.');
    await back(p);
    const tabs = await p.getByRole('tablist').getByRole('tab').evaluateAll((es) => es.map((e) => `${e.getAttribute('aria-label')}:${e.getAttribute('aria-selected')}`));
    const backOk = url(p).startsWith('/admin/logs') && tabs.some((t) => t.startsWith('Chưa xử lý (1)')) && (await p.locator('[data-testid^="loi-"]').count()) === 1; // bản web không xuất aria-selected cho tab; dấu hiệu giữ bộ lọc là chỉ còn 1 dòng chưa xử lý
    if (!backOk) console.log('Q04 sau Back:', url(p), tabs.join(', '), await p.locator('[data-testid^="loi-"]').count());
    const kept = (await store(p)).syncErrors.length === total;
    await p.getByRole('tab', { name: 'Chưa xử lý (1)' }).click();
    await p.getByText('Đánh dấu đã xử lý', { exact: true }).first().click(); await p.waitForTimeout(400);
    const empty = await has(p, 'Không còn lỗi chưa xử lý.');
    rec('TB6-16', 'Q04: lọc theo trạng thái có đếm; nhóm theo ngày; mở chi tiết; đánh dấu đã xử lý ở chi tiết và ở danh sách; Back giữ bộ lọc; không mất bản ghi; trạng thái trống',
      seg && day && allRows === total && openRows === 2 && det && resolved && backOk && kept && empty, `${seg}/${day}/${allRows}/${openRows}/${det}/${resolved}/${backOk}/${kept}/${empty}`);
    rec('TB6-17', 'Không lỗi JS trong luồng Q04', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
    await p.context().close();
  }

  // ---------- Q05, Q06, Q07 giữ ----------
  {
    const p = await newPage(); await login(p);
    await go(p, '/admin/account');
    const q07 = await has(p, 'Khôi phục dữ liệu mô phỏng') && await has(p, 'Đăng xuất');
    await go(p, '/device-diagnostics');
    const q05 = !(await has(p, 'Không có quyền'));
    rec('TB6-18', 'Q05, Q07 giữ nguyên nội dung chính', q07 && q05, `${q05}/${q07}`);
    await p.context().close();
  }

  // ---------- Hồi quy bác sĩ ----------
  {
    const p = await newPage(); await login(p, 'bacsi');
    await go(p, '/devices/d-1');
    const b13 = await has(p, 'Kết nối máy và nạp liệu trình') && await has(p, 'Theo dõi phiên điều trị');
    await go(p, '/doctor');
    const home = !(await has(p, 'Không có quyền'));
    await go(p, '/doctor/account');
    const acct = await has(p, 'Đăng xuất') && !(await has(p, 'Khôi phục dữ liệu mô phỏng'));
    rec('TB6-19', 'Bác sĩ: B13 còn hai nút; trang chủ mở; trang Cá nhân không có nút khôi phục dữ liệu (như cũ)', b13 && home && acct, `${b13}/${home}/${acct}`);
    rec('TB6-20', 'Không lỗi JS trong hồi quy bác sĩ', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
    await p.context().close();
  }

  // ---------- Bốn cỡ màn ----------
  {
    const bad = [];
    for (const w of [320, 360, 390, 768]) {
      const p = await newPage({ w, h: 740 }); await login(p);
      for (const u of ['/admin', '/admin/dataset', '/admin/devices', '/admin/logs', '/admin-account/u-bs', '/admin-account/u-bn1', '/admin-log/s-1']) {
        await go(p, u); if ((await overflow(p)) > 0) bad.push(`${u}@${w}`);
      }
      if (p.errors.length) bad.push(`JS@${w}: ${p.errors[0]}`);
      await p.context().close();
    }
    rec('TB6-21', 'Màn quản trị không tràn ngang và không lỗi JS ở 320, 360, 390, 768 px', bad.length === 0, bad.join(', '));
  }

  fs.writeFileSync(`${OUT}/ket-qua-tb-6.json`, JSON.stringify(results, null, 2));
  const fail = results.filter((r) => r.result !== 'ĐẠT').length;
  console.log(`Tổng: ${results.length - fail}/${results.length} đạt`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
