import type { WoundAssessment } from './types.ts';

/** Hàm kiểm tra gốc (assessmentError của assessment.ts) được truyền vào để không chép quy tắc. */
export type AssessmentRule = (a: Partial<WoundAssessment>) => string | null;

/**
 * P1-03a: liệt kê MỌI mục còn thiếu hoặc sai của B07 trong một lượt bấm Lưu.
 * Không tự đặt quy tắc mới: phần phân loại gọi lại assessmentError (assessment.ts, không sửa) nhiều lần,
 * mỗi lần tạm coi mục vừa báo là đã điền để lấy mục kế tiếp; mức độ và ngày tái đánh giá giữ đúng câu kiểm tra của màn.
 */
export type EvalField = 'woundType' | 'pressureStage' | 'exudate' | 'infection' | 'severity' | 'nextReview';
export interface EvalProblem { key?: EvalField; label: string; msg: string }

/** Câu lỗi của assessmentError ứng với trường nào. Unit test bảo đảm mọi câu trả về đều có ở đây. */
export const ASSESSMENT_FIELD: Record<string, EvalField> = {
  'Hãy chọn loại vết thương.': 'woundType',
  'Loét do tì đè cần chọn giai đoạn.': 'pressureStage',
  'Hãy chọn mức dịch tiết.': 'exudate',
  'Hãy chọn dấu hiệu nhiễm trùng.': 'infection',
};
export const FIELD_LABEL: Record<EvalField, string> = {
  woundType: 'Loại vết thương', pressureStage: 'Giai đoạn', exudate: 'Dịch tiết', infection: 'Dấu hiệu nhiễm trùng', severity: 'Mức độ', nextReview: 'Ngày tái đánh giá',
};
// Giá trị tạm chỉ dùng để dò lỗi kế tiếp, không bao giờ ghi vào biểu mẫu. Loại tạm khác "Loét do tì đè" để không sinh lỗi giai đoạn giả.
const PROBE = '__tam__';

/** Mọi lỗi phân loại theo đúng thứ tự assessmentError báo. */
export function assessmentProblems(rule: AssessmentRule, a: Partial<WoundAssessment>): EvalProblem[] {
  const probe: Partial<WoundAssessment> = { ...a };
  const out: EvalProblem[] = [];
  for (let i = 0; i < 10; i++) {
    const msg = rule(probe);
    if (!msg) break;
    const key = ASSESSMENT_FIELD[msg];
    if (!key) { out.push({ label: msg, msg }); break; } // câu lạ: báo nguyên câu, không đoán trường
    out.push({ key, label: FIELD_LABEL[key], msg });
    (probe as Record<string, string>)[key] = PROBE;
  }
  return out;
}

/** Câu kiểm tra ngày tái đánh giá, giữ nguyên câu chữ đã có ở B07. */
export function nextReviewError(v: string): string | null {
  if (!v) return null;
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return 'Ngày tái đánh giá theo dạng dd/mm/yyyy.';
  const [d, m, y] = v.split('/').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return 'Ngày tái đánh giá không tồn tại.';
  return null;
}

export function evaluationProblems(rule: AssessmentRule, a: Partial<WoundAssessment>, severity: string, nextReview: string): EvalProblem[] {
  const out = assessmentProblems(rule, a);
  if (!severity) out.push({ key: 'severity', label: FIELD_LABEL.severity, msg: 'Hãy chọn mức Nhẹ, Trung bình hoặc Nặng.' });
  const nr = nextReviewError(nextReview);
  if (nr) out.push({ key: 'nextReview', label: FIELD_LABEL.nextReview, msg: nr });
  return out;
}
