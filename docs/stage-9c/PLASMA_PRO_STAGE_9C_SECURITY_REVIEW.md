# Plasma Pro Stage 9C: Rà soát bảo mật (gói E)

Phạm vi: đọc mã, không sửa. Ứng dụng là bản demo một máy, chưa có backend. **Mọi kiểm quyền hiện chỉ chạy phía ứng dụng và không phải bảo mật thật**: người có quyền truy cập thiết bị hoặc trình duyệt có thể sửa dữ liệu trong bộ nhớ, đổi vai trò, bỏ qua mọi kiểm tra.

## 1. Phát hiện

| Mã | Vị trí | Phát hiện | Mức (khi lên sản phẩm thật) | Trạng thái |
|---|---|---|---|---|
| SEC-01 | Toàn bộ | Không có backend, không có phân quyền phía máy chủ. Vai trò đọc từ bộ nhớ của máy | Nghiêm trọng | DEFERRED, cần backend |
| SEC-02 | `src/lib/auth.ts` dòng 12 đến 13 | Băm mật khẩu bằng SHA-256 của `salt:password`, không dùng hàm dẫn xuất khóa (KDF) chậm như Argon2id, scrypt, PBKDF2 | Cao | DEFERRED; chú thích trong mã đã ghi "Production must use server authentication, a password KDF" |
| SEC-03 | `src/lib/auth.ts` dòng 4 | Mật khẩu tài khoản mẫu `DEMO_PASSWORD` nằm trong mã nguồn | Cao nếu còn trong bản thật | Chấp nhận cho demo; phải gỡ trước khi phát hành |
| SEC-04 | `src/lib/store.tsx` `SESSION_KEY` | Phiên đăng nhập chỉ là mã tài khoản lưu trong bộ nhớ, không hết hạn, không ký | Cao | DEFERRED, cần token do máy chủ cấp |
| SEC-05 | `src/lib/store.tsx` | Dữ liệu bệnh nhân, ảnh vết thương lưu dạng văn bản thường (AsyncStorage, localStorage trên web), không mã hóa | Cao (dữ liệu sức khỏe) | DEFERRED |
| SEC-06 | `src/lib/access.ts`, `requireDoctor`, `requireAdmin` | Kiểm quyền phía ứng dụng nhất quán (9B thêm `canAddReport`, `canHandleReport`, `canResolveSyncError`) | Thông tin | Giữ; là lớp trải nghiệm, không thay phân quyền máy chủ |
| SEC-07 | `src/app/device-diagnostics.tsx` | Màn chẩn đoán hex chỉ quản trị viên thấy, kiểm phía ứng dụng | Trung bình | Giữ; cần khóa ở bản phát hành |
| SEC-08 | Mã nguồn | Không có `console.log` ngoài kiểm thử; không thấy khóa API hay bí mật trong mã | Thông tin | Không cần xử lý |

## 2. Đề xuất cho giai đoạn có backend (chỉ đề xuất, phạm vi đề tài)

1. Xác thực ở máy chủ, mật khẩu băm bằng Argon2id theo OWASP Password Storage Cheat Sheet.
2. Phiên bằng token ngắn hạn, làm mới, thu hồi được; lưu token bằng `expo-secure-store` (Keychain, Keystore).
3. Phân quyền ở máy chủ cho từng thao tác (bác sĩ chỉ thấy bệnh nhân của mình, bệnh nhân chỉ thấy hồ sơ mình).
4. Mã hóa dữ liệu khi lưu trên máy và TLS khi truyền.
5. Ghi nhật ký kiểm toán ở máy chủ cho thao tác lâm sàng.

## 3. Không khẳng định

Rà soát này không phải kiểm thử xâm nhập, không xác nhận tuân thủ pháp lý về dữ liệu sức khỏe, không xác minh backend (chưa có).

## Tài liệu tham khảo

- OWASP Foundation, Password Storage Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP Foundation, Mobile Application Security Verification Standard (MASVS), https://mas.owasp.org/MASVS/
- Expo, SecureStore documentation, https://docs.expo.dev/versions/latest/sdk/securestore/
