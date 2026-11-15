/**
 * Stage 9C (gói B, D): tầng hạ tầng lưu trữ. Chỉ tệp này và store.tsx biết khóa lưu và kho khóa-giá trị cụ thể (AsyncStorage).
 *
 * - Mọi lần ghi dữ liệu đi qua một hàng duy nhất, theo đúng thứ tự gọi. Ghi nền (hiệu ứng React) và ghi của commit
 *   không còn chạy chồng nhau, nên bản ghi cũ không thể ghi đè bản mới hơn.
 * - Đọc lúc khởi động: dữ liệu không đọc được (JSON hỏng) thì giữ nguyên bản gốc ở một khóa sao lưu trước khi ứng dụng
 *   dùng dữ liệu mẫu, để lần ghi sau không xóa mất dữ liệu cũ. Không đổi cấu trúc dữ liệu.
 */
export const STORAGE_KEY = 'plasmapro.demo.v2';
export const SESSION_KEY = 'plasmapro.session.v1';
export const UNREADABLE_PREFIX = 'plasmapro.demo.v2.khong-doc-duoc.';

/** Phần nhỏ nhất của AsyncStorage mà ứng dụng dùng; kiểm thử thay bằng kho giả. */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export type LoadResult<T> =
  | { kind: 'empty'; session: string | null }
  | { kind: 'loaded'; data: T; session: string | null }
  /** Có dữ liệu nhưng không đọc được; bản gốc đã chép sang `backupKey` (null nếu chép cũng lỗi). */
  | { kind: 'unreadable'; backupKey: string | null; session: string | null }
  /** Kho không đọc được (lỗi đọc). */
  | { kind: 'failed'; error: unknown };

export function createPersistence<T>(kv: KeyValueStore, now: () => number = Date.now) {
  let tail: Promise<unknown> = Promise.resolve();
  /** Xếp một thao tác ghi sau mọi thao tác trước; lỗi của thao tác trước không chặn thao tác sau. */
  const enqueue = <R>(op: () => Promise<R>): Promise<R> => {
    const run = tail.then(op, op);
    tail = run.catch(() => undefined);
    return run;
  };

  return {
    async load(): Promise<LoadResult<T>> {
      let raw: string | null;
      let session: string | null;
      try {
        [raw, session] = await Promise.all([kv.getItem(STORAGE_KEY), kv.getItem(SESSION_KEY)]);
      } catch (error) {
        return { kind: 'failed', error };
      }
      if (!raw) return { kind: 'empty', session };
      try {
        return { kind: 'loaded', data: JSON.parse(raw) as T, session };
      } catch {
        const backupKey = UNREADABLE_PREFIX + now();
        try {
          await enqueue(() => kv.setItem(backupKey, raw!));
          return { kind: 'unreadable', backupKey, session };
        } catch {
          return { kind: 'unreadable', backupKey: null, session };
        }
      }
    },
    /** Ghi bền toàn bộ dữ liệu; lỗi thì ném (nơi gọi quyết định báo lỗi). */
    saveData(data: T): Promise<void> {
      const text = JSON.stringify(data);
      return enqueue(() => kv.setItem(STORAGE_KEY, text));
    },
    saveSession(id: string): Promise<void> {
      return enqueue(() => kv.setItem(SESSION_KEY, id));
    },
    clearSession(): Promise<void> {
      return enqueue(() => kv.removeItem(SESSION_KEY));
    },
  };
}

export type Persistence<T> = ReturnType<typeof createPersistence<T>>;
