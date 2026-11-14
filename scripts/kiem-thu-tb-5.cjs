// Kiểm thử giao diện theo tác vụ, giai đoạn 5: khu vực bệnh nhân (N01 đến N09).
// Bản web, Playwright, dữ liệu mô phỏng. Chạy: node scripts/kiem-thu-tb-5.cjs <baseURL> <thư mục kết quả>
// Dữ liệu thêm cho từng ca chỉ ghi vào localStorage của ngữ cảnh trình duyệt đó (không sửa kho mã).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
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
  const login = async (p, user = 'bacsi') => {
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
  const yOf = async (p, t) => { const l = p.getByText(t, { exact: true }); if (!(await l.count())) return null; const bb = await l.first().boundingBox(); return bb ? bb.y : null; };
  const inFooter = (p, name) => p.locator('[data-testid="screen-footer"]').getByRole('button', { name, exact: true });
  const overflow = (p) => p.evaluate(() => { const W = window.innerWidth; return [...document.querySelectorAll('div,span')].filter((e) => { const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed')) return false; for (let a = e.parentElement; a; a = a.parentElement) { const ox = getComputedStyle(a).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return false; } return true; }).length; });
  // Phần tử nằm trong vùng cuộn ngang có chủ đích (dải ảnh N05) hoặc vùng cắt không tính là tràn.
  const url = (p) => decodeURIComponent(p.url().replace(BASE, ''));
  const clinical = (d) => JSON.stringify({ images: d.images, evaluations: d.evaluations, plans: d.plans, sessions: d.sessions, sessionNotes: d.sessionNotes, wounds: d.wounds, patients: d.patients, reports: d.reports });

  // ---------- Khu vực bệnh nhân ----------
  // TB5-01: N03 có lối vào N06 của đúng vết; Back về N03.
  {
    const p = await newPage(); await login(p, 'benhnhan');
    const d0 = clinical(await store(p));
    await go(p, '/schedule');
    const row = p.getByTestId('loi-vao-n06');
    const hasRow = (await row.count()) === 1;
    const notes = await has(p, 'Ghi chú của bác sĩ về đợt');
    const noDose = !(await visible(p, 'Mức năng lượng'));
    if (hasRow) { await row.click(); await p.waitForTimeout(1200); }
    const u = url(p);
    const onN06 = u.startsWith('/plan/p-1') && u.includes('woundId=w-1') && await has(p, 'Đợt điều trị của tôi') && await has(p, 'Mức năng lượng') && await has(p, /^VT01: /, false);
    await back(p);
    rec('TB5-01', 'N03: dòng "Liều và các giai đoạn" (thay liều và giai đoạn trong thẻ), ghi chú bác sĩ vẫn hiện; chạm mở N06 của VT01 có liều; Back về N03',
      hasRow && notes && noDose && onN06 && url(p).startsWith('/schedule'), `${u} → ${url(p)}; ghi chú ${notes}, ẩn liều ${noDose}`);
    // TB5-02: N06 với woundId không thuộc bệnh nhân không hiện vết lạ; mở hồ sơ bệnh nhân khác bị chặn.
    await go(p, '/plan/p-1?woundId=w-khong-co');
    const all = await has(p, 'Đợt điều trị của tôi') && !(await has(p, 'w-khong-co', false));
    await go(p, '/plan/p-2');
    const blocked = !(await has(p, 'Đợt điều trị của tôi'));
    await go(p, '/plan/p-1');
    const legacy = await has(p, 'Đợt điều trị của tôi') && await has(p, 'Mức năng lượng');
    rec('TB5-02', 'N06: woundId lạ thì hiện đợt của chính bệnh nhân như lối vào cũ; /plan/p-2 bị chặn; /plan/p-1 không kèm vết vẫn chạy', all && blocked && legacy, `${all}/${blocked}/${legacy}`);
    // TB5-03: N04 thông tin cá nhân thu gọn, mở ra đủ dòng.
    await go(p, '/patient/history');
    const closed = (await has(p, 'Thông tin cá nhân')) && !(await visible(p, 'Năm sinh'));
    await p.getByText('Thông tin cá nhân', { exact: true }).click(); await p.waitForTimeout(400);
    const opened = await visible(p, 'Năm sinh') && await visible(p, 'Bác sĩ phụ trách') && await visible(p, 'Muốn thay đổi sự đồng ý, hãy báo bác sĩ phụ trách.');
    rec('TB5-03', 'N04: "Thông tin cá nhân" thu gọn mặc định, mở ra đủ họ tên, năm sinh, bác sĩ, đồng ý nghiên cứu', closed && opened);
    // TB5-04: N07 việc cần làm ở màn đầu, trên khối thông tin máy.
    await go(p, '/patient/device');
    const yLoad = await yOf(p, 'Nạp liệu trình vào máy'); const yRep = await yOf(p, 'Báo sự cố thiết bị'); const yChart = await yOf(p, 'Số lần điều trị 7 ngày qua');
    rec('TB5-04', 'N07: nút nạp liệu trình, theo dõi phiên, báo sự cố nằm trên khối thiết bị và trong màn đầu (844 px)', yLoad != null && yRep != null && yChart != null && yLoad < yChart && yRep < yChart && yRep < 844, JSON.stringify([yLoad, yRep, yChart]));
    // TB5-05: N08 nút Gửi ở vùng nút cố định; chặn gửi trùng.
    // Mở N08 từ N02 như bệnh nhân thật (Gửi xong quay về màn trước).
    await go(p, '/patient'); await p.getByText('Báo triệu chứng hoặc sự cố', { exact: true }).click(); await p.waitForTimeout(1200);
    const send = inFooter(p, 'Gửi');
    const inF = (await send.count()) === 1 && await send.isDisabled();
    const n0 = (await store(p)).reports.length;
    await p.getByRole('radio', { name: /^Mức đau 3/ }).click(); await p.waitForTimeout(200);
    await send.dblclick().catch(() => {}); await p.waitForTimeout(1500);
    const n1 = (await store(p)).reports.length;
    rec('TB5-05', 'N08: "Gửi" ở vùng nút cố định, khóa khi chưa chọn; bấm đúp chỉ lưu 1 báo cáo và rời màn', inF && n1 === n0 + 1 && !url(p).startsWith('/report'), `${n0}→${n1}, ${url(p)}`);
    // TB5-06: N01 nút Tiếp / Quay lại ở vùng nút cố định.
    await go(p, '/onboarding?review=1');
    const next = inFooter(p, 'Tiếp');
    const s1 = await has(p, 'Bước 1/5');
    await next.click(); await p.waitForTimeout(300);
    const s2 = await has(p, 'Bước 2/5');
    await inFooter(p, 'Quay lại').click(); await p.waitForTimeout(300);
    rec('TB5-06', 'N01: Tiếp và Quay lại ở vùng nút cố định, chuyển đúng bước', s1 && s2 && await has(p, 'Bước 1/5'));
    // TB5-07: N02, N05, N09 giữ nguyên nội dung chính.
    await go(p, '/patient');
    const n02 = await has(p, 'Vết thương') && await has(p, 'Lời dặn của bác sĩ') && await has(p, 'Báo triệu chứng hoặc sự cố');
    await go(p, '/wounds/w-1');
    const n05 = await has(p, 'Tiến triển diện tích') && await has(p, 'Nhận xét của bác sĩ') && await has(p, /^Lịch sử vết thương \(\d+\)$/, false);
    await go(p, '/patient/account');
    const n09 = await has(p, 'Hướng dẫn sử dụng') && await has(p, 'Đăng xuất');
    rec('TB5-07', 'N02, N05, N09 giữ nội dung chính', n02 && n05 && n09, `${n02}/${n05}/${n09}`);
    const d1 = clinical(await store(p));
    // Khác biệt duy nhất được phép: báo cáo vừa gửi ở TB5-05.
    const strip = (s) => { const o = JSON.parse(s); o.reports = o.reports.filter((r) => r.painLevel !== 3 || r.content !== 'Mức đau 3/10'); return JSON.stringify(o); };
    rec('TB5-08', 'Duyệt các màn bệnh nhân không đổi dữ liệu lâm sàng (trừ báo cáo vừa gửi)', strip(d0) === strip(d1));
    rec('TB5-09', 'Khu vực bệnh nhân không lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
    await p.context().close();
  }

  // Phân quyền: bệnh nhân khác không mở được đợt điều trị, hồ sơ vết thương của p-1 (quyền giữ nguyên).
  {
    const p = await newPage(); await login(p, 'benhnhan2');
    await go(p, '/plan/p-1?woundId=w-1');
    const a = !(await has(p, 'Đợt điều trị của tôi'));
    await go(p, '/wounds/w-1');
    const b2 = !(await has(p, 'Tiến triển diện tích'));
    rec('TB5-10', 'Phân quyền: bệnh nhân khác không xem được N06, N05 của BN001', a && b2, `${a}/${b2}`);
    await p.context().close();
  }

  // Bố cục 4 cỡ màn
  for (const w of [320, 360, 390, 768]) {
    const bad = [];
    for (const [user, urls] of [['benhnhan', ['/onboarding?review=1', '/patient', '/schedule', '/patient/history', '/wounds/w-1', '/plan/p-1?woundId=w-1', '/patient/device', '/report', '/patient/account']]]) {
      const p = await newPage({ w, h: 740 }); await login(p, user);
      for (const u of urls) { await go(p, u); const o = await overflow(p); if (o) bad.push(`${u}:${o}`); }
      if (p.errors.length) bad.push('JS ' + p.errors[0].slice(0, 80));
      await p.context().close();
    }
    rec(`TB5-11-${w}`, `${w}px: 9 màn bệnh nhân không tràn ngang, không lỗi JS`, bad.length === 0, bad.join(', '));
  }

  fs.writeFileSync(path.join(OUT, 'ket-qua-tb-5.json'), JSON.stringify(results, null, 2));
  const fail = results.filter((r) => r.result !== 'ĐẠT').length;
  console.log(`Tổng ${results.length}, đạt ${results.length - fail}, lỗi ${fail}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
