import { Platform } from 'react-native';

import { readImageBytes } from './export';
import { fmtDate, fmtDateTime, PLAN_STATUS, TREND, WOUND_STATUS } from './format';
import { formatAreaDisplay } from './naming';
import type { AppData } from './types';
import { localDay } from './course';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    out += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : B64[c & 63];
  }
  return out;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', heic: 'image/heic', webp: 'image/webp' };

/** Báo cáo theo dõi một bệnh nhân: ảnh, diện tích bác sĩ nhập, nhận xét, liệu trình (đặc tả mục 8). */
export async function buildReportHtml(data: AppData, patientId: string, authorName: string): Promise<string> {
  const p = data.patients.find((x) => x.id === patientId)!;
  const doctor = data.accounts.find((a) => a.id === p.doctorId);
  const plan = data.plans.filter((x) => x.patientId === p.id).sort((a, b) => b.version - a.version)[0];
  const device = data.devices.find((d) => d.id === p.deviceId);
  const wounds = data.wounds.filter((w) => w.patientId === p.id);

  const sections: string[] = [];
  for (const w of wounds) {
    const imgs = data.images.filter((i) => i.woundId === w.id && i.status !== 'excluded').sort((a, b) => a.captureDate.localeCompare(b.captureDate));
    const tiles: string[] = [];
    for (const im of imgs) {
      let src = '';
      try {
        src = `data:${MIME[im.ext] ?? 'image/jpeg'};base64,${bytesToBase64(await readImageBytes(im))}`;
      } catch {
        src = '';
      }
      tiles.push(`<figure>${src ? `<img src="${src}"/>` : '<div class="noimg">Không đọc được ảnh</div>'}
        <figcaption><b>${esc(im.id)}</b> · ${im.capture?.sourceDateKnown === false ? 'Ngày chụp chưa xác định' : fmtDate(im.captureDate)}<br/>${esc(formatAreaDisplay(im.areaCm2))}${im.source === 'demo' ? '<br/><i>ảnh mô phỏng</i>' : ''}</figcaption></figure>`);
    }
    const rows = imgs
      .filter((i) => i.areaCm2 !== null)
      .map((i) => `<tr><td>${i.capture?.sourceDateKnown === false ? 'Chưa xác định' : fmtDate(i.captureDate)}</td><td>${esc(i.id)}</td><td>${esc(formatAreaDisplay(i.areaCm2))}</td><td>${esc(i.measureMethod ?? '—')}</td></tr>`)
      .join('');
    const evals = data.evaluations
      .filter((e) => e.woundId === w.id)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => `<li><b>${fmtDate(e.date)}</b> · ${esc(TREND[e.trend].label)} · ${esc(formatAreaDisplay(e.areaCm2))}<br/>
        ${e.characteristics ? `Đặc điểm: ${esc(e.characteristics)}<br/>` : ''}${e.symptoms ? `Triệu chứng: ${esc(e.symptoms)} (nguồn: ${esc(e.symptomSource)})<br/>` : ''}
        ${e.instructions ? `Hướng dẫn: ${esc(e.instructions)}` : ''}</li>`)
      .join('');
    sections.push(`<h2>${esc(w.code)} · ${esc(w.location)}</h2>
      <p class="muted">Theo dõi từ ${fmtDate(w.startDate)} · ${esc(WOUND_STATUS[w.status].label)} · ${imgs.length} ảnh</p>
      <h3>Diện tích bác sĩ đã nhập</h3>
      ${rows ? `<table><tr><th>Ngày chụp</th><th>Mã ảnh</th><th>Diện tích</th><th>Phương pháp đo</th></tr>${rows}</table>` : '<p class="muted">Chưa có số đo.</p>'}
      <h3>Ảnh theo thời gian</h3><div class="grid">${tiles.join('') || '<p class="muted">Chưa có ảnh.</p>'}</div>
      <h3>Đánh giá của bác sĩ</h3>${evals ? `<ul>${evals}</ul>` : '<p class="muted">Chưa có đánh giá.</p>'}`);
  }

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"/><style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#14213D;font-size:11pt;margin:24px}
    h1{color:#1E5EDB;margin:0 0 4px} h2{border-bottom:2px solid #1E5EDB;padding-bottom:4px;margin-top:22px}
    h3{font-size:11pt;margin:14px 0 6px} .muted{color:#5B6785}
    table{border-collapse:collapse;width:100%} td,th{border:1px solid #E3E8F2;padding:5px 8px;text-align:left} th{background:#E7EFFE}
    .grid{display:flex;flex-wrap:wrap;gap:10px} figure{margin:0;width:150px;page-break-inside:avoid}
    figure img{width:150px;height:112px;object-fit:cover;border-radius:8px} figcaption{font-size:9pt}
    .noimg{width:150px;height:112px;background:#eee} .warn{background:#FDF1DC;color:#B45309;padding:8px;border-radius:6px;font-size:9pt}
  </style></head><body>
    <h1>Báo cáo theo dõi vết thương</h1>
    <p class="muted">Plasma Pro · Lập lúc ${fmtDateTime(new Date().toISOString())} bởi ${esc(authorName)}</p>
    <p class="warn">Tài liệu chứa dữ liệu sức khỏe (dữ liệu cá nhân nhạy cảm). Chỉ chia sẻ cho người có thẩm quyền. Bản demo: dữ liệu mô phỏng.</p>
    <table>
      <tr><th>Bệnh nhân</th><td>${esc(p.name)} (${esc(p.code)})</td><th>Năm sinh</th><td>${p.birthYear}</td></tr>
      <tr><th>Bác sĩ phụ trách</th><td>${esc(doctor?.name ?? '—')}</td><th>Thiết bị</th><td>${esc(device?.code ?? 'Chưa gán')}</td></tr>
      <tr><th>Liệu trình</th><td colspan="3">${plan ? `v${plan.version} · ${esc(PLAN_STATUS[plan.status].label)} · ${fmtDate(plan.startDate)} – ${fmtDate(plan.endDate)} · ${esc(plan.reviewSchedule || '')}` : 'Chưa thiết lập'}</td></tr>
    </table>
    ${sections.join('')}
    <p class="muted" style="margin-top:24px">Số đo diện tích do bác sĩ đo bên ngoài ứng dụng và nhập vào; ứng dụng không tự đo hay tự đánh giá.</p>
  </body></html>`;
}

export async function shareReport(html: string, patientCode: string): Promise<string> {
  const Print = await import('expo-print');
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return 'Hộp thoại in của trình duyệt';
  }
  const { uri } = await Print.printToFileAsync({ html });
  const { File, Directory, Paths } = await import('expo-file-system');
  const dir = new Directory(Paths.document, 'reports');
  if (!dir.exists) dir.create();
  const dest = new File(dir, `bao_cao_${patientCode}_${localDay()}.pdf`);
  if (dest.exists) dest.delete();
  await new File(uri).copy(dest);
  const Sharing = await import('expo-sharing');
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(dest.uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
  return dest.uri;
}
