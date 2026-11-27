// Tái hiện lỗi logic vai trò bệnh nhân trên bản TRƯỚC KHI SỬA (master db152c4), cùng dữ liệu kịch bản với kiem-thu-benh-nhan-logic.cjs.
// Mỗi ca ghi điều quan sát được; "TÁI HIỆN" nghĩa là lỗi có thật trên bản này. Chạy trên bản sau sửa thì các ca phải ra "KHÔNG".
// Chạy: node scripts/kiem-thu-benh-nhan-truoc-sua.cjs <baseURL> <thư mục kết quả>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8721';
const OUT = process.argv[3] || '.';
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'plasmapro.demo.v2';
const results = [];
const rec = (id, name, reproduced, detail = '') => {
  results.push({ id, name, result: reproduced ? 'TÁI HIỆN' : 'KHÔNG', detail });
  console.log(reproduced ? 'TÁI HIỆN' : 'KHÔNG   ', id, name, detail ? `| ${detail}` : '');
};
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  const login = async (user) => {
    await p.goto(BASE + '/'); await p.waitForTimeout(800);
    await p.evaluate((k) => { for (const x of Object.keys(localStorage)) if (x !== k) localStorage.removeItem(x); }, KEY);
    await p.goto(BASE + '/'); await p.waitForTimeout(1000);
    await p.getByPlaceholder('Nhập tên đăng nhập').fill(user);
    await p.getByPlaceholder('Nhập mật khẩu').fill('Demo@123');
    await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1000);
    const cb = p.getByRole('checkbox');
    if (await cb.count()) { await cb.first().click(); await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1200); }
    const skip = p.getByText('Bỏ qua'); if (await skip.count()) { await skip.first().click(); await p.waitForTimeout(600); }
  };
  const go = async (url) => { await p.goto(BASE + url); await p.waitForTimeout(1500); };
  const body = async () => (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  const patch = (fn, arg) => p.evaluate(([k, src, a]) => { const d = JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(new Function('d', 'a', src)(d, a))); }, [KEY, fn, arg]);
  const safe = async (id, name, f) => { try { await f(); } catch (e) { rec(id, name + ' (không chạy được)', false, String(e.message || e).slice(0, 120)); } };

  await login('benhnhan');
  await go('/patient');
  await patch(`
    const T = a.today, add = (n) => new Date(new Date(T + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
    const base = d.plans.filter((x) => x.patientId === 'p-1' && x.woundId === 'w-1' && x.status === 'active' && x.confirmed).sort((x, y) => y.version - x.version)[0];
    const phases = [{ from: add(-3), to: add(10), pattern: 'daily', n: 1 }];
    d.plans = d.plans.map((x) => x.id === base.id ? { ...x, phases, startDate: add(-3), endDate: add(10), durationSec: 60, timeWindow: undefined } : x);
    const w = d.wounds.find((x) => x.id === 'w-1');
    d.wounds.push({ ...w, id: 'w-B', code: 'VT02', location: 'Mu bàn chân phải', startDate: add(-3) });
    const ack = new Date(Date.now() - 3600000).toISOString();
    d.plans.push({ ...base, id: 'pl-B1', woundId: 'w-B', protocolId: 'pr-B', version: 1, phases, startDate: add(-3), endDate: add(10), durationSec: 60, patientAckAt: ack, extensions: undefined, statusLog: undefined, timeWindow: undefined, effectiveFrom: undefined });
    d.plans.push({ ...base, id: 'pl-B2', woundId: 'w-B', protocolId: 'pr-B', version: 2, status: 'scheduled', phases, startDate: add(-3), endDate: add(10), durationSec: 60, patientAckAt: undefined, effectiveFrom: add(3), extensions: undefined, statusLog: undefined, timeWindow: undefined });
    const im = d.images.find((x) => x.woundId === 'w-1');
    d.images.push({ ...im, id: 'IMG-B-HIDDEN', woundId: 'w-B', sharedWithPatientAt: undefined, sharedWithPatientBy: undefined });
    return d;`, { today });

  await safe('R-01', 'N02', async () => {
    await go('/patient');
    const t = await body();
    const hero = t.slice(0, 600);
    rec('R-01', 'N02 có hai vết đang điều trị nhưng chỉ hiện một đợt (vết đầu tiên), không liệt kê VT02', /Đợt điều trị VT01/.test(hero) && !/VT02/.test(hero.slice(0, hero.indexOf('Lịch hẹn') > 0 ? hero.indexOf('Lịch hẹn') : 600)), hero.slice(0, 220));
  });
  await safe('R-02', 'Lỗi video', async () => {
    // Đọc đợt bệnh nhân thấy cho VT02 qua trang Đợt điều trị (N06) của VT02.
    await go('/wound-history/w-B/dot-dieu-tri');
    const t = await body();
    rec('R-02', 'Lỗi video N02: VT02 hiện phiên bản 2 đang chờ áp dụng thay cho phiên bản 1 đang chạy', /Phiên bản 2/.test(t), (/Phiên bản \d+[^·]*/.exec(t) || [''])[0]);
  });
  await safe('R-03', 'N03', async () => {
    await go('/schedule');
    const t = await body();
    rec('R-03', 'N03 tự lấy vết đầu tiên (VT01), không có lối chọn phiên hay lịch của VT02', /Đợt điều trị VT01/.test(t) && !/Đợt điều trị VT02/.test(t) && !/Phiên theo lịch/.test(t) && !/Xem lịch tháng của vết/.test(t), t.slice(0, 200));
  });
  await safe('R-04', 'T01', async () => {
    await go('/patient/device');
    await p.getByRole('button', { name: 'Nạp liệu trình vào máy', exact: true }).locator('visible=true').first().click(); await p.waitForTimeout(1500);
    rec('R-04', 'Nút nạp ở tab Thiết bị mở T01 không kèm vết nào', !/woundId=/.test(p.url()), p.url().replace(BASE, ''));
  });
  await safe('R-05', 'woundId trống', async () => {
    await go('/schedule');
    const before = (/(\d+)\/(\d+) đã xong/.exec(await body()) || [])[1];
    await patch(`d.sessions.push({ sessionId: 'legacy-noW', deviceId: 'd-1', start: new Date().toISOString(), durationMin: 1, energyWh: null, status: 'completed', source: 'device' }); return d;`, {});
    await go('/schedule');
    const after = (/(\d+)\/(\d+) đã xong/.exec(await body()) || [])[1];
    rec('R-05', 'Phiên không ghi vết được cộng vào tiến độ VT01 (quy tắc "!s.woundId ||")', before !== undefined && Number(after) === Number(before) + 1, `${before} → ${after}`);
  });
  await safe('R-06', 'Bỏ lỡ', async () => {
    await login('bacsi');
    await go('/plan-detail/' + encodeURIComponent('pr-B'));
    const t = await body();
    rec('R-06', 'Ngày đã qua không có bản ghi bị tính "bỏ lỡ" dù chưa đối soát với máy', /bỏ lỡ [1-9]/.test(t), (/Chưa thực hiện[^A-ZĐ]*/.exec(t) || [''])[0]);
  });
  await safe('R-07', 'Báo cáo', async () => {
    await login('bacsi2');
    await go('/patients/p-1');
    const t = await body();
    rec('R-07', 'Bác sĩ khác (không phụ trách) thấy báo cáo triệu chứng của bệnh nhân', !/chỉ bác sĩ phụ trách xem/.test(t) && /(Chưa xử lý|Đã xử lý|Đánh dấu đã xử lý|Không có báo cáo chưa xử lý|đau)/i.test(t), '');
  });
  await safe('R-08', 'Ảnh', async () => {
    await login('benhnhan');
    await go('/images/IMG-B-HIDDEN');
    const t = await body();
    rec('R-08', 'Bệnh nhân mở được ảnh bác sĩ chưa duyệt bằng đường dẫn trực tiếp', !/Không tìm thấy|Không có quyền/.test(t), t.slice(0, 120));
  });
  await safe('R-09', 'Đổi máy', async () => {
    await patch(`
      const now = new Date().toISOString();
      d.sessions.push({ sessionId: 'P-on-D1', deviceId: 'd-1', woundId: 'w-1', start: new Date(Date.now() - 2 * 3600000).toISOString(), durationMin: 2, energyWh: null, status: 'completed', source: 'device' });
      d.devices = d.devices.map((x) => x.id === 'd-1' ? { ...x, patientId: 'p-2' } : x.id === 'd-3' ? { ...x, patientId: 'p-1', lifecycle: 'in_use' } : x.id === 'd-2' ? { ...x, patientId: undefined } : x);
      d.patients = d.patients.map((x) => x.id === 'p-1' ? { ...x, deviceId: 'd-3' } : x.id === 'p-2' ? { ...x, deviceId: 'd-1' } : x);
      return d;`, {});
    await login('benhnhan2');
    await go('/patient/history');
    const tQ = await body();
    const part = tQ.slice(tQ.indexOf('Các buổi'), tQ.indexOf('Các buổi') + 700);
    rec('R-09', 'Q nhận lại máy D1 thấy buổi của P (2 phút, và buổi không ghi vết) trong lịch sử của mình', /2 phút/.test(part), part.slice(0, 260));
    await login('benhnhan');
    await go('/patient/history');
    const tP = await body();
    rec('R-10', 'P đổi sang TB-003 thì mất lịch sử buổi đã làm trên D1', /Chưa có buổi điều trị nào được ghi/.test(tP), tP.slice(tP.indexOf('Các buổi'), tP.indexOf('Các buổi') + 120));
  });

  fs.writeFileSync(path.join(OUT, 'ket-qua-truoc-sua.json'), JSON.stringify({ base: BASE, today, results }, null, 2));
  await b.close();
})().catch((e) => { console.error(e); process.exit(2); });
