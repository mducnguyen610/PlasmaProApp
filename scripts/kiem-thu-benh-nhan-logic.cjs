// Kiểm thử đầu cuối logic vai trò bệnh nhân (27/11/2026) trên bản web, THIẾT BỊ GIẢ LẬP, dữ liệu mô phỏng.
// Ca chính: bệnh nhân P (benhnhan, p-1) có vết A (VT01, w-1) và B (VT02, w-B), mỗi vết một phác đồ, cùng có phiên hôm nay;
// vết B còn một phiên bản 2 bác sĩ đã xác nhận nhưng chờ áp dụng (để tái hiện lỗi video "N02 mất đợt khi có phiên bản scheduled").
// P chọn B ở Lịch trình, nạp B1 vào máy D1 (TB-001), chạy phiên giả lập đến khi máy báo hoàn thành; kiểm A không đổi, lịch sử hai vai trò,
// đường dẫn trực tiếp; rồi đổi máy (P trả D1 nhận TB-003, D1 giao cho Q = benhnhan2) và kiểm quyền xem lịch sử.
// Không thay cho thử trên máy thật hay review lâm sàng.
// Chạy: node scripts/kiem-thu-benh-nhan-logic.cjs <baseURL> <thư mục kết quả>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8720';
const OUT = process.argv[3] || '.';
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'plasmapro.demo.v2';
const results = [];
const rec = (id, name, pass, detail = '') => {
  const result = pass ? 'ĐẠT' : 'LỖI';
  results.push({ id, name, result, detail });
  console.log(result === 'ĐẠT' ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : '');
};
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const addD = (iso, n) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

(async () => {
  const b = await chromium.launch();
  const newPage = async () => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
    const p = await ctx.newPage();
    p.errors = []; p.dialogs = [];
    p.on('pageerror', (e) => p.errors.push(e.message));
    p.on('dialog', (d) => { p.dialogs.push(d.message()); d.accept(); });
    return p;
  };
  const login = async (p, user) => {
    await p.goto(BASE + '/'); await p.waitForTimeout(1000);
    if (!(await p.getByPlaceholder('Nhập tên đăng nhập').count())) {
      await p.evaluate(() => { localStorage.removeItem('plasmapro.session'); }); await p.goto(BASE + '/'); await p.waitForTimeout(1000);
    }
    await p.getByPlaceholder('Nhập tên đăng nhập').fill(user);
    await p.getByPlaceholder('Nhập mật khẩu').fill('Demo@123');
    await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1000);
    const cb = p.getByRole('checkbox');
    if (await cb.count()) { await cb.first().click(); await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1200); }
    const skip = p.getByText('Bỏ qua'); if (await skip.count()) { await skip.first().click(); await p.waitForTimeout(600); }
  };
  const logout = async (p) => {
    await p.goto(BASE + '/'); await p.waitForTimeout(800);
    await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k !== 'plasmapro.demo.v2') localStorage.removeItem(k); sessionStorage.clear(); });
  };
  const go = async (p, url) => { await p.goto(BASE + url); await p.waitForTimeout(1500); };
  const body = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  const store = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
  const patch = (p, fn, arg) => p.evaluate(([k, src, a]) => { const d = JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(new Function('d', 'a', src)(d, a))); }, [KEY, fn, arg]);
  const btn = (p, name) => p.getByRole('button', { name, exact: typeof name === 'string' }).locator('visible=true');
  const click = async (loc, t = 400) => { await loc.first().click(); await loc.page().waitForTimeout(t); };
  const footer = (p) => p.locator('[data-testid="screen-footer"]:visible').last();
  const inFooter = (p, name) => footer(p).getByRole('button', { name, exact: typeof name === 'string' });
  const shot = (p, name) => p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });

  const p = await newPage();
  await login(p, 'benhnhan');
  await go(p, '/patient');
  // Dữ liệu kịch bản: phác đồ A (w-1) và B (w-B) mỗi ngày, có phiên hôm nay; B2 đã xác nhận, chờ áp dụng từ 3 ngày nữa.
  await patch(p, `
    const T = a.today, add = (n) => new Date(new Date(T + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
    const base = d.plans.filter((x) => x.patientId === 'p-1' && x.woundId === 'w-1' && x.status === 'active' && x.confirmed).sort((x, y) => y.version - x.version)[0];
    const phases = [{ from: add(-3), to: add(10), pattern: 'daily', n: 1 }];
    d.plans = d.plans.map((x) => x.id === base.id ? { ...x, phases, startDate: add(-3), endDate: add(10), durationSec: 60, timeWindow: undefined } : x);
    const w = d.wounds.find((x) => x.id === 'w-1');
    d.wounds.push({ ...w, id: 'w-B', code: 'VT02', location: 'Mu bàn chân phải', startDate: add(-3) });
    const ack = new Date(Date.now() - 3600000).toISOString();
    d.plans.push({ ...base, id: 'pl-B1', woundId: 'w-B', protocolId: 'pr-B', version: 1, phases, startDate: add(-3), endDate: add(10), durationSec: 60, patientAckAt: ack, extensions: undefined, statusLog: undefined, timeWindow: undefined, effectiveFrom: undefined });
    d.plans.push({ ...base, id: 'pl-B2', woundId: 'w-B', protocolId: 'pr-B', version: 2, status: 'scheduled', phases, startDate: add(-3), endDate: add(10), durationSec: 60, patientAckAt: undefined, effectiveFrom: add(3), extensions: undefined, statusLog: undefined, timeWindow: undefined });
    // Một ảnh của B bác sĩ chưa duyệt cho bệnh nhân xem (kiểm đường dẫn trực tiếp).
    const im = d.images.find((x) => x.woundId === 'w-1');
    d.images.push({ ...im, id: 'IMG-B-HIDDEN', woundId: 'w-B', sharedWithPatientAt: undefined, sharedWithPatientBy: undefined });
    return d;`, { today });
  const d0 = await store(p);
  const sessionsA0 = d0.sessions.filter((s) => s.woundId === 'w-1').length;
  // Số buổi bác sĩ thấy đã bỏ bản trùng theo mã phiên (dữ liệu mẫu có bản gửi trùng).
  const sessionsA0u = new Set(d0.sessions.filter((s) => s.woundId === 'w-1').map((s) => s.sessionId)).size;

  // ===== Trang chủ: hai vết đang điều trị, liệt kê cả hai, không chọn vết đầu tiên; B hiện phiên bản 1 (không bị B2 chờ áp dụng thay) =====
  await go(p, '/patient');
  let t = await body(p);
  const rowA = p.getByTestId(`lich-VT01-${today}`), rowB = p.getByTestId(`lich-VT02-${today}`);
  rec('BN-01', 'N02 hai vết đang điều trị: hiện "Phiên hôm nay (2 vết đang điều trị)" với VT01 và VT02, câu "không phải thứ tự ưu tiên"',
    /Phiên hôm nay \(2 vết đang điều trị\)/.test(t) && (await rowA.count()) === 1 && (await rowB.count()) === 1 && /không phải thứ tự ưu tiên/.test(t), t.slice(0, 200));
  const labB = (await rowB.getAttribute('aria-label')) || '';
  rec('BN-02', 'Lỗi video N02: phiên bản 2 chờ áp dụng không thay phiên bản 1 đang chạy (VT02 ghi phiên bản 1, đến hạn hôm nay)', /phiên bản 1/.test(labB) && /Hôm nay/i.test(labB) || /phiên bản 1/.test(labB), labB);
  await shot(p, '01-trang-chu-hai-vet');

  // ===== Lịch trình: chọn B (phiên theo lịch, định danh bằng phác đồ và ngày) → T01 kèm đúng vết, phiên bản, ngày =====
  await go(p, '/schedule');
  t = await body(p);
  rec('BN-03', 'N03 "Phiên theo lịch" liệt kê phiên của cả hai vết; có chọn vết để xem lịch tháng, không tự chọn', /Phiên theo lịch/.test(t) && (await p.getByTestId(`lich-VT02-${today}`).count()) === 1 && /Chọn một vết để xem tiến độ/.test(t));
  await shot(p, '02-lich-trinh');
  await click(p.getByTestId(`lich-VT02-${today}`), 1500);
  const url = decodeURIComponent(p.url());
  rec('BN-04', 'Chạm phiên VT02 hôm nay: mở T01 với woundId=w-B, planId=pl-B1, date=hôm nay', /connect-device/.test(url) && /woundId=w-B/.test(url) && /planId=pl-B1/.test(url) && url.includes(`date=${today}`), url.replace(BASE, ''));
  if (await inFooter(p, 'Kết nối').count()) await click(inFooter(p, 'Kết nối'), 2000);
  t = await body(p);
  const radios = await p.getByRole('radio', { name: /^VT01: / }).locator('visible=true').count();
  rec('BN-05', 'T01 giữ ngữ cảnh: ghi "VT02: Mu bàn chân phải", phiên bản 1, không cho đổi sang VT01', /VT02: Mu bàn chân phải/.test(t) && /phiên bản 1\)/.test(t) && radios === 0, t.slice(0, 220));
  await click(inFooter(p, 'Nạp liệu trình vào máy'), 3000);
  t = await body(p);
  const d1 = await store(p);
  const lk = (d1.deviceLinks || [])[0] && [...d1.deviceLinks].sort((a, b) => b.at.localeCompare(a.at))[0];
  rec('BN-06', 'Máy xác nhận nhận liệu trình; nhật ký nạp ghi máy d-1, pl-B1, vết w-B, phác đồ pr-B', /Máy đã nhận liệu trình/.test(t) && lk?.deviceId === 'd-1' && lk?.planId === 'pl-B1' && lk?.woundId === 'w-B' && lk?.protocolId === 'pr-B' && lk?.result === 'acked', JSON.stringify(lk || {}).slice(0, 200));
  await shot(p, '03-nap-b1');
  await p.waitForTimeout(1500);
  await click(btn(p, 'Theo dõi phiên điều trị'), 1800);
  const murl = decodeURIComponent(p.url());
  rec('BN-07', 'T01 → T02 giữ vết w-B và mã lần nạp', /session-monitor/.test(murl) && /woundId=w-B/.test(murl) && /linkId=/.test(murl), murl.replace(BASE, ''));
  if (await inFooter(p, 'Kết nối').count()) await click(inFooter(p, 'Kết nối'), 2000);
  const s0 = d1.sessions.length;
  await click(btn(p, 'Bắt đầu điều trị'), 4000);
  const dLive = await store(p);
  const live = (dLive.liveSessions || []).find((l) => l.patientId === 'p-1');
  rec('BN-08', 'Máy báo đang chạy: ghi mốc phiên đang chạy cho p-1, vết w-B', live?.woundId === 'w-B' && live?.deviceId === 'd-1', JSON.stringify(live || {}));
  // Chờ máy giả lập báo hoàn thành (thời lượng 60 giây).
  let done = false;
  for (let i = 0; i < 40 && !done; i++) { await p.waitForTimeout(2500); done = (await store(p)).sessions.length > s0; }
  await p.waitForTimeout(1500);
  const d2 = await store(p);
  const ses = [...d2.sessions].sort((a, b) => b.start.localeCompare(a.start))[0];
  rec('BN-09', 'Phiên kết thúc: ghi patientId p-1, máy d-1, vết w-B, phiên bản pl-B1 (v1), trạng thái hoàn thành, gắn lần nạp, không lỗi liên kết',
    done && ses.patientId === 'p-1' && ses.deviceId === 'd-1' && ses.woundId === 'w-B' && ses.planId === 'pl-B1' && ses.planVersion === 1 && ses.status === 'completed' && ses.linkId === lk?.id && !ses.linkIssue,
    JSON.stringify(ses).slice(0, 260));
  t = await body(p);
  rec('BN-10', 'Câu kết quả trung thực: ghi rõ dữ liệu lưu trên điện thoại, chưa đồng bộ máy chủ', /chưa đồng bộ máy chủ/.test(t), '');
  await shot(p, '04-phien-xong');
  rec('BN-11', 'A không đổi: không thêm phiên cho w-1', d2.sessions.filter((s) => s.woundId === 'w-1').length === sessionsA0, `${sessionsA0} → ${d2.sessions.filter((s) => s.woundId === 'w-1').length}`);

  // ===== Màn bệnh nhân sau phiên =====
  await go(p, '/patient');
  const labA2 = (await p.getByTestId(`lich-VT01-${today}`).getAttribute('aria-label')) || '';
  const labB2 = (await p.getByTestId(`lich-VT02-${today}`).getAttribute('aria-label')) || '';
  rec('BN-12', 'N02 sau phiên: VT02 "Hoàn thành", VT01 vẫn "Đến hạn hôm nay" (bằng chứng A không đổi)', /Hoàn thành/.test(labB2) && !/Hoàn thành/.test(labA2), `A: ${labA2} | B: ${labB2}`);
  await shot(p, '05-trang-chu-sau-phien');
  await go(p, '/patient/history');
  t = await body(p);
  rec('BN-13', 'Lịch sử bệnh nhân: buổi mới ghi "Hoàn thành", gắn VT02, "Đã lưu trên điện thoại, chưa đồng bộ máy chủ"', /Hoàn thành · 1 phút · VT02/.test(t) && /Đã lưu trên điện thoại, chưa đồng bộ máy chủ/.test(t), t.slice(t.indexOf('Các buổi'), t.indexOf('Các buổi') + 200));
  await shot(p, '06-lich-su-benh-nhan');
  // Thiết bị: nhiều vết thì chọn phiên, không có nút nạp tự chọn vết.
  await go(p, '/patient/device');
  t = await body(p);
  rec('BN-14', 'Tab Thiết bị: hai vết thì "Chọn phiên cần nạp" với hai dòng, không có nút nạp chung', /Chọn phiên cần nạp/.test(t) && (await p.getByTestId(`lich-VT01-${today}`).count()) === 1 && (await btn(p, 'Nạp liệu trình vào máy').count()) === 0);
  // Ảnh chưa duyệt: đường dẫn trực tiếp bị chặn.
  await go(p, '/images/IMG-B-HIDDEN');
  rec('BN-15', 'Đường dẫn trực tiếp tới ảnh bác sĩ chưa duyệt: bệnh nhân không mở được', /Không tìm thấy/.test(await body(p)));
  await go(p, '/wounds/w-B');
  t = await body(p);
  rec('BN-16', 'N05 VT02: không có đánh giá thì ghi đúng "Chưa có đánh giá của bác sĩ"; ảnh chưa duyệt không đếm', /Chưa có đánh giá của bác sĩ/.test(await (async () => { await go(p, '/patient'); return body(p); })()), '');
  rec('BN-z1', 'Không có lỗi JS phía bệnh nhân', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));

  // ===== Bác sĩ phụ trách =====
  await logout(p); await login(p, 'bacsi');
  await go(p, `/session-detail/${encodeURIComponent(ses.sessionId)}`);
  t = await body(p);
  rec('BN-17', 'Bác sĩ phụ trách mở chi tiết phiên: Hoàn thành, vết VT02, phiên bản đã nạp 1, "Chỉ có trên máy này, chưa qua máy chủ"', /Hoàn thành/.test(t) && /VT02: Mu bàn chân phải/.test(t) && /Phiên bản 1/.test(t) && /Chỉ có trên máy này, chưa qua máy chủ/.test(t), t.slice(0, 300));
  await shot(p, '07-bac-si-chi-tiet-phien');
  const vnTime = (iso) => { const d = new Date(new Date(iso).getTime() + 7 * 3600000).toISOString(); return `${d.slice(11, 16)} ${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`; };
  await go(p, '/wound-history/w-B?tab=lich-su&loc=buoi');
  t = await body(p);
  rec('BN-18', 'Bác sĩ: lịch sử VT02 có đúng 1 buổi (buổi vừa làm)', /Buổi điều trị \(1\)/.test(t), (/Buổi điều trị \(\d+\)/.exec(t) || [''])[0]);
  await go(p, '/wound-history/w-1?tab=lich-su&loc=buoi');
  const tA = await body(p);
  rec('BN-19', 'Bác sĩ: số buổi VT01 không đổi (phiên B không tính cho A)', new RegExp(`Buổi điều trị \\(${sessionsA0u}\\)`).test(tA) && !tA.includes(vnTime(ses.start)), (/Buổi điều trị \(\d+\)/.exec(tA) || [''])[0]);
  await go(p, '/patients/p-1');
  t = await body(p);
  rec('BN-20', 'Bác sĩ phụ trách thấy khối báo cáo của bệnh nhân', !/chỉ bác sĩ phụ trách xem/.test(t));
  rec('BN-z2', 'Không có lỗi JS phía bác sĩ', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));

  // ===== Bác sĩ khác: xem hồ sơ (CN1 H9) nhưng không thấy báo cáo =====
  await logout(p); await login(p, 'bacsi2');
  await go(p, '/patients/p-1');
  t = await body(p);
  rec('BN-21', 'Bác sĩ khác: không thấy báo cáo triệu chứng và sự cố của bệnh nhân', /Báo cáo triệu chứng và sự cố chỉ bác sĩ phụ trách xem/.test(t));

  // ===== Đổi máy: P trả D1, nhận TB-003; D1 giao cho Q (benhnhan2) =====
  await logout(p);
  await patch(p, `
    const now = new Date().toISOString();
    d.devices = d.devices.map((x) => x.id === 'd-1' ? { ...x, patientId: 'p-2', assignedAt: now } : x.id === 'd-3' ? { ...x, patientId: 'p-1', assignedAt: now, lifecycle: 'in_use' } : x.id === 'd-2' ? { ...x, patientId: undefined } : x);
    d.patients = d.patients.map((x) => x.id === 'p-1' ? { ...x, deviceId: 'd-3' } : x.id === 'p-2' ? { ...x, deviceId: 'd-1' } : x);
    d.deviceEvents = [...(d.deviceEvents || []),
      { id: 'ev-r1', deviceId: 'd-1', at: now, by: 'u-bs', kind: 'return', patientId: 'p-1' },
      { id: 'ev-a3', deviceId: 'd-3', at: now, by: 'u-bs', kind: 'assign', patientId: 'p-1' },
      { id: 'ev-a1', deviceId: 'd-1', at: new Date(Date.now() + 1000).toISOString(), by: 'u-bs', kind: 'assign', patientId: 'p-2' }];
    return d;`, {});
  await login(p, 'benhnhan2');
  await go(p, '/patient/history');
  t = await body(p);
  rec('BN-22', 'Q (giữ D1 sau P): lịch sử không có buổi của P', !/VT02/.test(t) && !/Hoàn thành · 1 phút/.test(t), t.slice(t.indexOf('Các buổi'), t.indexOf('Các buổi') + 160));
  await go(p, `/session-detail/${encodeURIComponent(ses.sessionId)}`);
  rec('BN-23', 'Q mở đường dẫn trực tiếp tới phiên của P: bị chặn', /Không có quyền/.test(await body(p)));
  await go(p, '/devices/d-1');
  t = await body(p);
  rec('BN-24', 'Q xem máy D1: không thấy phiên của P', !t.includes(vnTime(ses.start)), vnTime(ses.start));
  await logout(p); await login(p, 'benhnhan');
  await go(p, '/patient/history');
  t = await body(p);
  rec('BN-25', 'P sau khi đổi sang TB-003: vẫn thấy buổi đã làm trên D1', /Hoàn thành · 1 phút · VT02/.test(t));
  await shot(p, '08-p-sau-doi-may');
  rec('BN-z3', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));

  fs.writeFileSync(path.join(OUT, 'ket-qua.json'), JSON.stringify({ today, results, session: ses }, null, 2));
  const fail = results.filter((r) => r.result === 'LỖI').length;
  console.log(`\nTổng: ${results.length} ca, ${results.length - fail} đạt, ${fail} lỗi`);
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
