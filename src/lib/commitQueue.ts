/**
 * Stage 9B (S8-B06): xếp hàng các lần ghi bền (commit) của kho dữ liệu.
 *
 * Trước đây commit() tính bản mới từ dữ liệu hiện có rồi mới chờ ghi AsyncStorage. Hai commit chồng nhau cùng tính
 * từ một bản cũ, lần ghi sau đè mất thay đổi của lần trước. Ở đây:
 * - Các commit chạy lần lượt theo đúng thứ tự gọi; mỗi commit tính từ bản mới nhất lúc tới lượt.
 * - Ghi lỗi: commit đó bị từ chối (ném lỗi cho nơi gọi), dữ liệu trong bộ nhớ giữ nguyên; hàng đợi vẫn chạy tiếp các commit sau.
 * - Trong lúc chờ ghi, nếu dữ liệu bị đổi bởi đường khác (update đồng bộ, ghi ảnh mới), commit được tính lại trên bản mới nhất
 *   rồi ghi lại, để không xóa thay đổi kia. Tính lại mà lỗi thì giữ bản mới nhất, ghi lại bản đó và từ chối commit.
 * Không có giao dịch: AsyncStorage chỉ đảm bảo từng lần setItem, không đảm bảo nhóm nhiều lần ghi.
 */
export type CommitDeps<T> = {
  /** Bản dữ liệu mới nhất trong bộ nhớ (dataRef.current). */
  read: () => T;
  /** Ghi bền một bản đầy đủ; lỗi thì ném. */
  write: (next: T) => Promise<void>;
  /** Đưa bản đã ghi vào bộ nhớ và màn hình. */
  apply: (next: T) => void;
  /** Bọc lỗi ghi (PersistError ở store). */
  wrapWriteError?: (e: unknown) => Error;
};

export function createCommitQueue<T>(deps: CommitDeps<T>) {
  let tail: Promise<unknown> = Promise.resolve();
  const wrap = (e: unknown) => (deps.wrapWriteError ? deps.wrapWriteError(e) : e instanceof Error ? e : new Error(String(e)));

  const run = async (fn: (d: T) => T): Promise<T> => {
    const base = deps.read();
    const next = fn(base); // lỗi kiểm tra (quyền, dữ liệu) ném ra trước khi ghi
    try {
      await deps.write(next);
    } catch (e) {
      throw wrap(e);
    }
    const latest = deps.read();
    if (latest === base) {
      deps.apply(next);
      return next;
    }
    // Dữ liệu đổi trong lúc ghi: tính lại trên bản mới nhất để giữ cả hai thay đổi.
    let rebased: T;
    try {
      rebased = fn(latest);
    } catch (e) {
      // Không áp được lên bản mới: bộ nhớ giữ bản mới nhất, ghi lại bản đó để bộ nhớ máy khớp với màn hình.
      try {
        await deps.write(latest);
      } catch (w) {
        throw wrap(w);
      }
      throw e;
    }
    try {
      await deps.write(rebased);
    } catch (e) {
      // Bộ nhớ máy đang chứa `next` (thiếu thay đổi đồng bộ); màn hình chưa đổi. Báo lỗi ghi, không coi là đã lưu.
      throw wrap(e);
    }
    deps.apply(rebased);
    return rebased;
  };

  return (fn: (d: T) => T): Promise<T> => {
    const job = tail.then(() => run(fn));
    // Hàng đợi không dừng vì một commit lỗi; lỗi vẫn trả về đúng nơi gọi qua `job`.
    tail = job.catch(() => undefined);
    return job;
  };
}
