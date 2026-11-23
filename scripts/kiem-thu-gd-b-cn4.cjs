// Giai đoạn B, CN4 (thiết bị): kiểm thử bản web với dữ liệu mô phỏng, Playwright.
// Gồm: danh mục máy của quản trị (AU-25), quản trị không thao tác máy (XN-09), giao máy cần phác đồ hoạt động và không giữ hai máy
// (AU-26), thu hồi rồi bác sĩ đánh dấu khử khuẩn về Sẵn sàng (XN-09), nhật ký máy (AU-27), trạng thái Lỗi tự động và cảnh báo (AU-28),
// bác sĩ không kết nối, không điều khiển (D6), phân quyền ở tầng store, dữ liệu còn sau tải lại.
// Thiết bị giả lập trên web; không thay cho thử trên máy thật. Chạy: node scripts/kiem-thu-gd-b-cn4.cjs <baseURL> <thư mục kết quả>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8710';
const OUT = process.argv[3] || '.';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const rec = (id, name, pass, detail = '') => {
  results.push({ id, name, result: pass ? 'ĐẠT' : 'LỖI', detail });
  console.log(pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : '');
};

(async () => {
  const b = await chromium.launch();
  const newPage = async (w = 390, h = 844) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'vi-VN' });
    const p = await ctx.newPage();
    p.dialogs = []; p.errors = []; p.accept = true;
    p.on('dialog', (d) => { p.dialogs.push(`${d.type()}: ${d.message().replace(/\n+/g, ' | ')}`); if (p.accept && d.type() === 'confirm') d.accept(); else d.dismiss(); });
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
  const go = async (p, url) => { await p.goto(BASE + url); await p.waitForTimeout(1500); };
  const has = async (p, t, exact = true) => (await p.locator(`text=${exact ? `"${t}"` : t}`).locator('visible=true').count()) > 0;
  const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2') || '{}'));
  const btn = (p, name) => p.getByRole('button', { name, exact: true }).locator('visible=true').last();
  const callStore = async (p, fn, ...args) => {
    const res = await p.evaluate(async ({ fn, args }) => {
      let v = null;
      for (const el of document.querySelectorAll('*')) {
        const k = Object.keys(el).find((x) => x.startsWith('__reactFiber'));
        if (!k) continue;
        let f = el[k];
        while (f) { const val = f.memoizedProps && f.memoizedProps.value; if (val && typeof val.assignDevice === 'function') { v = val; break; } f = f.return; }
        if (v) break;
      }
      if (!v) return { noStore: true };
      try { const r = await v[fn](...args); return { ok: true, r: r && typeof r === 'object' ? JSON.parse(JSON.stringify(r)) : r }; } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
    }, { fn, args });
    if (res.noStore) throw new Error(`Không tìm thấy store khi gọi ${fn}`);
    await p.waitForTimeout(300);
    return res;
  };

  const dev = (d, id) => d.devices.find((x) => x.id === id);
  const ev = (d, id, kind) => (d.deviceEvents ?? []).filter((e) => e.deviceId === id && e.kind === kind);
  // Mục "Thiết bị và tài khoản" mở sẵn khi hồ sơ chưa giữ máy; chỉ bấm khi mục còn đóng để không đóng nhầm.
  const openGive = async (p) => {
    if (!(await has(p, 'Giao máy'))) { await p.getByText('Thiết bị và tài khoản', { exact: true }).first().click(); await p.waitForTimeout(300); }
    await p.getByText('Giao máy', { exact: true }).locator('visible=true').first().click(); await p.waitForTimeout(400);
  };
  const relog = async (p, user) => { await callStore(p, 'logout'); await login(p, user); };

  const p = await newPage();
  // Quản trị: danh mục máy (D1, AU-25)
  await login(p, 'quantri');
  await go(p, '/admin/devices');
  await btn(p, 'Đăng ký thiết bị mới').click(); await p.waitForTimeout(500);
  await p.getByLabel('Mã thiết bị').locator('visible=true').fill('TB-010');
  await p.getByLabel('Số sê-ri').locator('visible=true').fill('HFP-0001');
  await p.waitForTimeout(300);
  const dupSerial = await has(p, 'Số sê-ri đã có ở máy khác.');
  await p.getByLabel('Số sê-ri').locator('visible=true').fill('HFP-0010');
  await btn(p, 'Đăng ký').click(); await p.waitForTimeout(800);
  let d = await store(p);
  const d10 = d.devices.find((x) => x.code === 'TB-010');
  rec('CN4-01', 'Quản trị thêm máy có mã, sê-ri, dòng máy; báo trùng sê-ri; máy mới Sẵn sàng; nhật ký thêm', dupSerial && !!d10 && d10.serial === 'HFP-0010' && d10.model === 'Plasma Pro HFP' && d10.lifecycle === 'ready' && ev(d, d10.id, 'register').length === 1, d10 ? `${d10.code} ${d10.serial}` : 'không thấy máy');
  const r1 = await callStore(p, 'updateDevice', d10.id, { code: 'TB-010', serial: 'HFP-0010A', model: 'Plasma Pro HFP' });
  d = await store(p);
  rec('CN4-02', 'Quản trị sửa sê-ri; nhật ký sửa ghi cũ và mới', r1.ok && dev(d, d10.id).serial === 'HFP-0010A' && /HFP-0010 → HFP-0010A/.test(ev(d, d10.id, 'edit')[0]?.detail ?? ''));
  const r2 = await callStore(p, 'setLifecycle', 'd-3', 'ready');
  const r3 = await callStore(p, 'markCareDone', 'd-1', 'clean');
  rec('CN4-03', 'Quản trị không thao tác với máy: store từ chối khử khuẩn, chăm sóc (XN-09)', !r2.ok && !r3.ok, `${r2.error} | ${r3.error}`);
  await go(p, '/devices/d-3');
  rec('CN4-04', 'Màn máy của quản trị không còn nút vòng đời (chỉ xem)', !(await has(p, 'Kiểm tra xong')) && !(await has(p, 'Đã khử khuẩn')) && await p.getByTestId('quan-ly-may').count() === 0);

  // Bác sĩ: danh sách, trạng thái (D1)
  await relog(p, 'bacsi');
  await go(p, '/devices');
  const listOk = await has(p, 'Đang giao cho bệnh nhân') && await has(p, 'Bảo trì, chờ khử khuẩn') && await has(p, 'Sẵn sàng') && await p.getByTestId('may-TB-010').count() === 1;
  rec('CN4-05', 'Bác sĩ xem danh sách máy và trạng thái (Sẵn sàng, Đang giao, Bảo trì)', listOk);
  // D2: chưa có phác đồ hoạt động thì không giao
  await go(p, '/patients/p-3');
  await openGive(p);
  const noPlanText = await has(p, 'Bệnh nhân chưa có phác đồ đang hoạt động. Lập và xác nhận phác đồ trước khi giao máy.');
  const r4 = await callStore(p, 'assignDevice', d10.id, 'p-3');
  d = await store(p);
  rec('CN4-06', 'Bệnh nhân chưa có phác đồ hoạt động: giao diện báo, store từ chối, máy vẫn rảnh (D2)', noPlanText && !r4.ok && /phác đồ đang hoạt động/.test(r4.error) && !dev(d, d10.id).patientId, r4.error);
  // D8: bệnh nhân đang giữ máy thì không giao máy thứ hai, không tự gỡ máy cũ
  const r5 = await callStore(p, 'assignDevice', d10.id, 'p-1');
  d = await store(p);
  rec('CN4-07', 'Bệnh nhân đang giữ TB-001: từ chối giao máy thứ hai, TB-001 vẫn gắn bệnh nhân (D8, AU-26)', !r5.ok && /đang giữ máy TB-001/.test(r5.error) && dev(d, 'd-1').patientId === 'p-1' && d.patients.find((x) => x.id === 'p-1').deviceId === 'd-1', r5.error);
  // D3: thu hồi trên hồ sơ
  await go(p, '/patients/p-1');
  await openGive(p);
  await btn(p, 'Thu hồi TB-001').click(); await p.waitForTimeout(800);
  d = await store(p);
  rec('CN4-08', 'Thu hồi: máy chờ khử khuẩn, gỡ khỏi hồ sơ, bỏ đầu phát, nhật ký thu hồi (D3)', dev(d, 'd-1').lifecycle === 'returned' && !dev(d, 'd-1').patientId && !d.patients.find((x) => x.id === 'p-1').deviceId && !dev(d, 'd-1').tip && ev(d, 'd-1', 'return').length === 1);
  const r6 = await callStore(p, 'assignDevice', 'd-1', 'p-1');
  rec('CN4-09', 'Máy chưa khử khuẩn: không giao lại được', !r6.ok && /chưa khử khuẩn/.test(r6.error), r6.error);
  // XN-09: bác sĩ đánh dấu Đã khử khuẩn, máy Sẵn sàng; máy cũ "disinfected" cũng vậy
  await go(p, '/devices/d-1');
  await btn(p, 'Đã khử khuẩn').click(); await p.waitForTimeout(800);
  await go(p, '/devices/d-3');
  await btn(p, 'Đã khử khuẩn').click(); await p.waitForTimeout(800);
  d = await store(p);
  rec('CN4-10', 'Bác sĩ đánh dấu Đã khử khuẩn, máy về Sẵn sàng (cả máy cũ ở bước "disinfected"); nhật ký khử khuẩn (XN-09)', dev(d, 'd-1').lifecycle === 'ready' && dev(d, 'd-3').lifecycle === 'ready' && ev(d, 'd-1', 'disinfect').length === 1 && ev(d, 'd-3', 'disinfect').length === 1);
  // D2: giao lại, lưu người giao và thời điểm
  await go(p, '/patients/p-1');
  await openGive(p);
  await btn(p, 'Giao TB-001').click(); await p.waitForTimeout(800);
  d = await store(p);
  const a1 = dev(d, 'd-1');
  rec('CN4-11', 'Giao máy Sẵn sàng cho bệnh nhân có phác đồ hoạt động; lưu người giao, thời điểm, đầu phát mới (D2)', a1.patientId === 'p-1' && a1.lifecycle === 'in_use' && a1.assignedBy === 'u-bs1' && !!a1.assignedAt && !!a1.tip && ev(d, 'd-1', 'assign').length === 1);
  const r7 = await callStore(p, 'markCareDone', 'd-1', 'clean');
  rec('CN4-12', 'Bác sĩ phụ trách ghi chăm sóc máy (XN-09), có nhật ký', r7.ok && ev(await store(p), 'd-1', 'care').length === 1, r7.error ?? '');

  // Bệnh nhân: kết nối (nhật ký), phiên lỗi làm máy chuyển Lỗi (D4, D5, D9)
  await relog(p, 'benhnhan');
  await go(p, '/connect-device');
  await btn(p, 'Kết nối').click().catch(() => {}); await p.waitForTimeout(2500);
  d = await store(p);
  const connected = ev(d, 'd-1', 'connect').length;
  await btn(p, 'Ngắt kết nối').click().catch(() => {}); await p.waitForTimeout(1200);
  d = await store(p);
  rec('CN4-13', 'Kết nối, ngắt kết nối từ màn bệnh nhân được ghi vào nhật ký máy, mỗi lần một dòng (D4)', connected === 1 && ev(d, 'd-1', 'disconnect').length === 1, `connect ${connected}, disconnect ${ev(d, 'd-1', 'disconnect').length}`);
  const startedAt = new Date(Date.now() - 60000).toISOString();
  const r8 = await callStore(p, 'recordDeviceSession', { patientId: 'p-1', woundId: 'w-1', startedAt, durationSec: 30, outcome: 'error' });
  const r8b = await callStore(p, 'recordDeviceSession', { patientId: 'p-1', woundId: 'w-1', startedAt, durationSec: 30, outcome: 'error' });
  d = await store(p);
  const f = dev(d, 'd-1').fault;
  rec('CN4-14', 'Máy báo lỗi trong phiên: tự chuyển Lỗi, lưu mô tả, thời điểm, bệnh nhân, không tự đặt mã lỗi; bản gửi lại không ghi lần hai (D5, D9)', r8.ok && r8b.ok && !!f && f.code === undefined && /trạng thái lỗi/.test(f.message) && f.patientId === 'p-1' && !!f.at && ev(d, 'd-1', 'error').length === 1);
  await go(p, '/devices/d-1');
  rec('CN4-15', 'Màn máy của bệnh nhân không có thẻ quản lý máy của bác sĩ', await p.getByTestId('quan-ly-may').count() === 0 && await p.getByTestId('lich-su-may').count() === 0);

  // Bác sĩ thấy cảnh báo và xử lý lỗi
  await relog(p, 'bacsi');
  await go(p, '/doctor');
  const tile = await has(p, 'Thiết bị báo lỗi');
  await go(p, '/patients/p-1');
  const chip = await has(p, 'TB-001 báo lỗi');
  await go(p, '/devices');
  const first = await p.locator('[data-testid^="may-"]').first().getAttribute('data-testid').catch(() => '');
  rec('CN4-16', 'Cảnh báo lỗi: ô việc ở trang chủ, chip ở hồ sơ, máy lỗi đứng đầu danh sách (D9)', tile && chip && /TB-001/.test(first ?? ''), `tile ${tile} chip ${chip} first ${first}`);
  await go(p, '/devices/d-1');
  const faultShown = await has(p, 'Máy báo lỗi lúc', false) && !(await has(p, 'STA-4', false)) && await has(p, 'Ứng dụng không gửi lệnh khắc phục xuống máy.', false);
  const noControl = !(await has(p, 'Kết nối')) && !(await has(p, 'Nạp liệu trình vào máy')) && !(await has(p, 'Bật nguồn')) && !(await has(p, 'Tắt nguồn'));
  const r9 = await callStore(p, 'clearDeviceFault', 'd-1', '  ');
  await p.getByLabel('Ghi chú xử lý lỗi').locator('visible=true').fill('Đã kiểm tra cáp, máy chạy lại');
  await btn(p, 'Ghi đã xử lý lỗi').click(); await p.waitForTimeout(800);
  d = await store(p);
  rec('CN4-17', 'Màn máy của bác sĩ: hiện lỗi, không có nút kết nối hay điều khiển (D6); ghi xử lý bắt buộc ghi chú', faultShown && noControl && !r9.ok && !dev(d, 'd-1').fault && /Đã kiểm tra cáp/.test(ev(d, 'd-1', 'fault_clear')[0]?.detail ?? ''));
  await p.reload(); await p.waitForTimeout(1500);
  const hist = p.getByTestId('lich-su-may');
  const htext = (await hist.textContent()) ?? '';
  const kinds = ['Giao cho bệnh nhân', 'Thu hồi', 'Đã khử khuẩn, sẵn sàng', 'Kết nối', 'Ngắt kết nối', 'Máy báo lỗi', 'Đã xử lý lỗi', 'Phiên điều trị'];
  const missing = kinds.filter((k) => !htext.includes(k));
  rec('CN4-18', 'Lịch sử máy gộp giao, thu hồi, khử khuẩn, kết nối, ngắt, lỗi, xử lý, phiên; còn sau tải lại (D4)', missing.length === 0, missing.join(', '));

  // Bác sĩ khác: xem được, không thao tác
  await relog(p, 'bacsi2');
  await go(p, '/devices/d-1');
  const viewOk = await p.getByTestId('lich-su-may').count() === 1;
  const r10 = await callStore(p, 'setLifecycle', 'd-1', 'returned');
  const r11 = await callStore(p, 'markCareDone', 'd-1', 'clean');
  rec('CN4-19', 'Bác sĩ khác: xem máy, store từ chối thu hồi và chăm sóc máy của bệnh nhân không phụ trách', viewOk && !r10.ok && !r11.ok, `${r10.error} | ${r11.error}`);
  // Hồ sơ còn giữ máy thì không lưu trữ (H12) vẫn giữ
  await relog(p, 'bacsi');
  const r12 = await callStore(p, 'setPatientArchived', 'p-1', true);
  rec('CN4-20', 'Hồ sơ còn giữ máy không lưu trữ được (H12)', !r12.ok, r12.error ?? '');
  rec('CN4-21', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | '));

  await b.close();
  fs.writeFileSync(path.join(OUT, 'ket-qua.json'), JSON.stringify(results, null, 2));
  const pass = results.filter((r) => r.result === 'ĐẠT').length;
  console.log(`Tổng: ${results.length}, đạt ${pass}, lỗi ${results.length - pass}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
