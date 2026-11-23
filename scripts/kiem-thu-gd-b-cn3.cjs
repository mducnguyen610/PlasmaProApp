// Giai đoạn B, CN3 (phác đồ): kiểm thử bản web với dữ liệu mô phỏng, Playwright.
// Gồm: điều kiện ảnh trong ngày và ảnh căn cứ (AU-06), phác đồ mới chỉ khi không còn phác đồ mở (P2, P7), tạm dừng và tiếp tục
// có lý do, không đổi trạng thái vết (AU-08), xóa phác đồ chưa có phiên có nhật ký (AU-09), lịch sử phiên chỉ xem (P10),
// phân quyền ở tầng store, dữ liệu còn sau tải lại. Nội dung phác đồ (lịch, liều) giữ như cũ (XN-01..05).
// Không thay cho thử trên máy thật hay thử với bác sĩ. Chạy: node scripts/kiem-thu-gd-b-cn3.cjs <baseURL> <thư mục kết quả>
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
        while (f) { const val = f.memoizedProps && f.memoizedProps.value; if (val && typeof val.saveImageLabel === 'function') { v = val; break; } f = f.return; }
        if (v) break;
      }
      if (!v) return { noStore: true };
      try { const r = await v[fn](...args); return { ok: true, r: r && typeof r === 'object' ? JSON.parse(JSON.stringify(r)) : r }; } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
    }, { fn, args });
    if (res.noStore) throw new Error(`Không tìm thấy store khi gọi ${fn}`);
    await p.waitForTimeout(300);
    return res;
  };

  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const basePlan = { patientId: 'p-3', woundId: 'w-3', status: 'draft', phases: [{ from: today(), to: today(), pattern: 'daily', n: 1 }], sessionsPerDay: 1, minIntervalMin: null, targetEnergyWh: null,
    doseLevel: null, treatmentMode: null, durationSec: null, secondsPerCm2: null, areaAtStart: null, reviewAtDay: 28, startDate: today(), endDate: today(), reviewSchedule: '', notes: '', reason: 'Lập đợt mới', confirmed: false };

  {
    const p = await newPage(); await login(p, 'bacsi');
    // AU-06: vết chưa có ảnh hợp lệ hôm nay thì chặn
    await go(p, '/plan/p-3?woundId=w-3');
    const blocked = await has(p, 'Chụp ảnh vết thương') && await p.getByTestId('dieu-kien-phac-do').count() === 1 && await has(p, 'Chưa đủ điều kiện', false);
    const r0 = await callStore(p, 'savePlan', basePlan);
    rec('CN3-01', 'Vết chưa có ảnh trong ngày, Đạt: màn kiểm tra điều kiện chặn, store từ chối (P1, AU-06)', blocked && !r0.ok, r0.error);
    // Ảnh hôm nay, chưa đánh giá chất lượng: vẫn chưa đủ
    const a = await callStore(p, 'addImage', { woundId: 'w-3', uri: PNG, ext: 'png', captureDate: today(), source: 'doctor' });
    const r1 = await callStore(p, 'savePlan', { ...basePlan, basisImageId: a.r.id });
    await callStore(p, 'saveImageLabel', a.r.id, { quality: 'pass' });
    const b2 = await callStore(p, 'addImage', { woundId: 'w-3', uri: PNG, ext: 'png', captureDate: today(), source: 'doctor' });
    await callStore(p, 'saveImageLabel', b2.r.id, { quality: 'pass' });
    const old = await callStore(p, 'addImage', { woundId: 'w-3', uri: PNG, ext: 'png', captureDate: '2026-01-01', source: 'doctor' });
    await callStore(p, 'saveImageLabel', old.r.id, { quality: 'pass' });
    rec('CN3-02', 'Ảnh chưa đánh giá Đạt không làm ảnh căn cứ', !r1.ok, r1.error);
    await go(p, '/plan/p-3?woundId=w-3');
    const radios = await p.getByRole('radio', { name: /^Ảnh căn cứ/ }).count();
    const proposed = await p.getByRole('radio', { name: `Ảnh căn cứ ${b2.r.id}, đề xuất` }).count();
    rec('CN3-03', 'Đủ điều kiện: liệt kê 2 ảnh hợp lệ hôm nay (không gồm ảnh ngày cũ), đề xuất ảnh mới nhất; mở biểu mẫu (P3)', radios === 2 && proposed === 1 && await has(p, 'Lập phác đồ mới', false), `${radios} ảnh`);
    const bad = await callStore(p, 'savePlan', { ...basePlan, basisImageId: old.r.id });
    const ok = await callStore(p, 'savePlan', { ...basePlan, basisImageId: a.r.id });
    let d = await store(p);
    const created = d.plans.find((x) => x.woundId === 'w-3');
    rec('CN3-04', 'Lưu phác đồ mới: lưu ảnh đề xuất và ảnh bác sĩ chọn; ảnh ngày cũ bị từ chối', !bad.ok && ok.ok && created?.suggestedBasisImageId === b2.r.id && created?.basisImageId === a.r.id && !!created.protocolId, bad.error);
    // P2, P7: phiên bản tiếp theo cùng phác đồ (không cần ảnh mới)
    const v2 = await callStore(p, 'savePlan', { ...basePlan, reason: 'Sửa ghi chú', notes: 'x' });
    d = await store(p);
    const w3 = d.plans.filter((x) => x.woundId === 'w-3');
    rec('CN3-05', 'Còn phác đồ mở thì lưu thành phiên bản mới cùng mã phác đồ, giữ ảnh căn cứ (P2, P6)', v2.ok && w3.length === 2 && w3[0].protocolId === w3[1].protocolId && w3.every((x) => x.basisImageId === a.r.id));
    const noReason = await callStore(p, 'savePlan', { ...basePlan, reason: '  ' });
    rec('CN3-06', 'Lưu phiên bản không có lý do bị từ chối (P6)', !noReason.ok, noReason.error);
    // AU-09: xóa phác đồ chưa có phiên
    await go(p, '/plan/p-3?woundId=w-3');
    const manage = p.getByTestId('quan-ly-phac-do');
    await manage.getByText('Xóa phác đồ', { exact: true }).first().click(); await p.waitForTimeout(300);
    const delBtnLocked = await btn(p, 'Xóa phác đồ').isDisabled();
    await p.getByLabel('Lý do xóa').fill('Lập nhầm vết thương');
    await btn(p, 'Xóa phác đồ').click(); await p.waitForTimeout(1200);
    d = await store(p);
    const log = (d.auditLog ?? []).find((x) => x.action === 'plan_delete' && x.targetId === created.protocolId);
    rec('CN3-07', 'Xóa phác đồ chưa có phiên: bắt buộc lý do, hỏi xác nhận, xóa mọi phiên bản, nhật ký có mã, người, thời điểm, lý do (P9)',
      delBtnLocked && !d.plans.some((x) => x.woundId === 'w-3') && !!log && log.by === 'u-bs1' && log.detail.includes('Lập nhầm vết thương') && p.dialogs.some((x) => x.includes('Không hoàn tác')));
    // Có phiên thì không xóa
    const pr1 = d.plans.find((x) => x.woundId === 'w-1').protocolId;
    const del1 = await callStore(p, 'deletePlan', pr1, 'thử');
    await go(p, '/plan/p-1?woundId=w-1');
    await p.getByTestId('quan-ly-phac-do').getByText('Xóa phác đồ', { exact: true }).first().click(); await p.waitForTimeout(300);
    rec('CN3-08', 'Phác đồ đã có phiên: không xóa được, giao diện nêu lý do, store từ chối', !del1.ok && await has(p, 'Chỉ kết thúc được, không xóa.', false), del1.error);
    // AU-08: tạm dừng, tiếp tục có lý do
    const wBefore = d.wounds.find((x) => x.id === 'w-1').status;
    const latest1 = d.plans.filter((x) => x.woundId === 'w-1').sort((a2, b3) => b3.version - a2.version)[0];
    const pauseLocked = await btn(p, 'Tạm dừng phác đồ').isDisabled();
    await p.getByLabel('Lý do tạm dừng').fill('Da quanh vết kích ứng');
    await btn(p, 'Tạm dừng phác đồ').click(); await p.waitForTimeout(1200);
    d = await store(p);
    let pl = d.plans.find((x) => x.id === latest1.id);
    rec('CN3-09', 'Tạm dừng: bắt buộc lý do; phác đồ Tạm dừng, có người, thời điểm, lý do; trạng thái vết không đổi (P8, AU-08)',
      latest1.status === 'active' && pauseLocked && pl.status === 'paused' && pl.statusLog?.[0]?.reason === 'Da quanh vết kích ứng' && pl.statusLog[0].by === 'u-bs1' && d.wounds.find((x) => x.id === 'w-1').status === wBefore);
    await p.reload(); await p.waitForTimeout(1500);
    await p.getByLabel('Lý do tiếp tục').fill('Hết kích ứng');
    await btn(p, 'Tiếp tục phác đồ').click(); await p.waitForTimeout(1200);
    d = await store(p); pl = d.plans.find((x) => x.id === latest1.id);
    rec('CN3-10', 'Tiếp tục có lý do; nhật ký giữ cả hai lần; còn sau tải lại', pl.status === 'active' && pl.statusLog.length === 2 && pl.statusLog[1].action === 'resume');
    const noR = await callStore(p, 'setPlanPaused', latest1.id, true, '');
    rec('CN3-11', 'Store từ chối tạm dừng không có lý do', !noR.ok, noR.error);
    // P10: lịch sử phiên chỉ xem
    const nSes = d.sessions.filter((s) => s.woundId === 'w-1').length;
    rec('CN3-12', 'Lịch sử phiên theo vết: đếm đúng, có thực tế, dự kiến, phiên bản (P10)', await has(p, `Lịch sử phiên (${nSes})`) && await has(p, 'Dự kiến') && await has(p, 'Thực tế'), `${nSes} phiên`);
    // Màn vết thương: không còn nút tạm dừng đổi trạng thái vết
    await go(p, '/wounds/w-1');
    rec('CN3-13', 'Màn vết thương: bỏ "Tạm dừng đợt" đổi trạng thái vết; lối sang quản lý phác đồ', !(await has(p, 'Tạm dừng đợt')) && await has(p, 'Tạm dừng hoặc quản lý phác đồ'));
    rec('CN3-14', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | '));
    await p.context().close();
  }
  {
    const p = await newPage(); await login(p, 'bacsi2');
    await go(p, '/plan/p-1?woundId=w-1');
    const d = await store(p);
    const latest1 = d.plans.filter((x) => x.woundId === 'w-1').sort((a2, b3) => b3.version - a2.version)[0];
    const r1 = await callStore(p, 'setPlanPaused', latest1.id, true, 'thử');
    const r2 = await callStore(p, 'deletePlan', latest1.protocolId, 'thử');
    rec('CN3-15', 'Bác sĩ khác: xem lịch sử phiên, không có thẻ quản lý; store từ chối tạm dừng và xóa', await p.getByTestId('lich-su-phien').count() === 1 && await p.getByTestId('quan-ly-phac-do').count() === 0 && !r1.ok && !r2.ok);
    await p.context().close();
  }

  await b.close();
  fs.writeFileSync(path.join(OUT, 'ket-qua.json'), JSON.stringify(results, null, 2));
  const pass = results.filter((r) => r.result === 'ĐẠT').length;
  console.log(`Tổng: ${results.length}, đạt ${pass}, lỗi ${results.length - pass}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
