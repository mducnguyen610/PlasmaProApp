/**
 * P1-05a: thứ tự HIỂN THỊ danh sách "Kiểm tra trước khi chụp" ở B10: chưa đạt (ok = false), chưa biết (null), đạt (true);
 * giữ thứ tự gốc trong cùng nhóm. Trả mảng mới, không đổi mảng gốc của assessCapture (capture/ar.ts không sửa), không đổi `ready`.
 */
export function orderChecks<T extends { ok: boolean | null }>(checks: readonly T[]): T[] {
  const rank = (c: T) => (c.ok === false ? 0 : c.ok === null ? 1 : 2);
  return checks.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).map((x) => x.c);
}
