import { createCommitQueue } from './commitQueue';

/**
 * Stage 9C (gói D): đường ghi của store, tách khỏi React để kiểm thử được.
 * Thứ tự cho mỗi lần commit: tính bản mới từ bản mới nhất → kiểm quan hệ (check) → ghi bền (save) → đưa lên màn (apply).
 * Bất kỳ bước nào lỗi thì bộ nhớ máy và màn hình giữ bản cũ. Các commit xếp hàng (commitQueue), ghi bền tuần tự (persistence).
 */
export interface WritePathDeps<T> {
  read: () => T;
  save: (next: T) => Promise<void>;
  apply: (next: T) => void;
  /** Trả lỗi khi bản mới làm phát sinh lỗi quan hệ; null là được ghi. */
  check?: (base: T, next: T) => Error | null;
  /** Lý do tạm không được ghi (kho chưa đọc được); null là bình thường. */
  blocked?: () => string | null;
  onPersisted?: (next: T) => void;
  wrapWriteError?: (e: unknown) => Error;
}

export function createWritePath<T>(deps: WritePathDeps<T>) {
  const queue = createCommitQueue<T>({
    read: deps.read,
    write: async (next) => {
      const why = deps.blocked?.();
      if (why) throw new Error(why);
      await deps.save(next);
      deps.onPersisted?.(next);
    },
    apply: deps.apply,
    wrapWriteError: deps.wrapWriteError,
  });
  return (fn: (d: T) => T): Promise<T> =>
    queue((d) => {
      const next = fn(d);
      const err = deps.check?.(d, next);
      if (err) throw err;
      return next;
    });
}
