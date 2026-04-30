# ONBOARDING — Mời thành viên ban hành chánh sử dụng hệ thống

> Hướng dẫn cấp quyền truy cập + sử dụng dashboard Quản lý Xe cho thành viên Phòng Tổng Hợp / Ban Điều Phối.

---

## 1. Tổng quan kiến trúc auth

Hệ thống dùng **Magic Link** (Supabase OTP):

```
1. User vào /login
2. Nhập email công ty → bấm "Gửi link đăng nhập"
3. Supabase gửi email kèm link 1-lần đến hộp thư
4. User bấm link → tự đăng nhập → vào /dashboard
5. Session cookie tồn tại ~1 tiếng (tự refresh khi còn active)
```

**Không có password** — không cần nhớ, không cần "forgot password".

---

## 2. Quyền hạn (role check)

Mỗi user đăng nhập sẽ thuộc 1 trong 2 nhóm:

| Nhóm | Quyền | Cơ chế |
|------|-------|--------|
| **Quản lý** (ban điều hành) | Duyệt, phân công, huỷ, sửa config, CRUD xe/tài xế | Email có trong env `ALLOWED_MANAGER_EMAILS` HOẶC `staff.is_manager = TRUE` |
| **Còn lại** | Chỉ xem (read-only) các trang nhưng các nút đổi state sẽ trả lỗi | Mặc định nếu không thoả 2 điều trên |

---

## 3. ⚙️ Setup ban đầu (chỉ làm 1 lần)

### 3.1 Supabase Auth — disable signup tự do

1. Vào **Supabase Dashboard → Authentication → Providers**
2. Tab **Email** → đảm bảo bật ✓
3. Tab **Settings**:
   - **Allow new users to sign up** → **OFF** (chỉ admin invite mới được vào)
   - **Confirm email** → có thể OFF (magic link tự confirm)
4. Tab **URL Configuration**:
   - **Site URL**: `https://esuhai-booking-xe-v2.vercel.app`
   - **Redirect URLs** (whitelist): thêm cả 2 dòng:
     - `https://esuhai-booking-xe-v2.vercel.app/api/auth/callback`
     - `http://localhost:3000/api/auth/callback` (dev)

### 3.2 Vercel — set env `ALLOWED_MANAGER_EMAILS`

Vào **Vercel project → Settings → Environment Variables → Add new**:

```
Name:  ALLOWED_MANAGER_EMAILS
Value: hoangkha@esuhai.com,thuyha@esuhai.com,chintm@esuhai.com
Apply to: ✓ Production  ✓ Preview  ✓ Development
```

**Lưu ý:** lowercase, cách nhau bằng dấu phẩy, **không có khoảng trắng** giữa các email.

Sau khi save → **Settings → Deployments → bấm "..." trên deploy mới nhất → Redeploy** (hoặc đợi commit kế tiếp tự deploy).

### 3.3 (Tuỳ chọn) Customize email template

Supabase mặc định gửi link bằng template tiếng Anh khá khô. Có thể tuỳ chỉnh:

1. **Authentication → Email Templates → Magic Link**
2. Đổi subject + body sang tiếng Việt phù hợp brand Esuhai. Ví dụ:
   - **Subject:** `Đăng nhập Hệ thống Quản lý Xe — Esuhai`
   - **Body:** thay `{{ .ConfirmationURL }}` button thành "Mở hệ thống Quản lý Xe"

---

## 4. 👤 Mời thành viên mới (mỗi lần thêm 1 người)

Giả sử cần mời `nv4@esuhai.com`:

### 4.1 Tạo tài khoản trên Supabase

1. **Authentication → Users → Add user → Send invitation**
2. Nhập email `nv4@esuhai.com` → **Send invitation**
3. Supabase gửi email xác nhận. User KHÔNG cần làm gì với email này — chỉ là để Supabase ghi nhận account tồn tại.

> **Hoặc** dùng **Add user → Create new user**:
> - Email: `nv4@esuhai.com`
> - Password: để trống (vì dùng magic link không cần)
> - Auto Confirm User: ✓

### 4.2 Cấp quyền Quản lý

Có 2 cách (chọn 1):

**Cách A — Vercel env (nhanh, không cần SQL):**

1. Vercel → env `ALLOWED_MANAGER_EMAILS` → bấm **Edit**
2. Append email vào danh sách: `...,nv4@esuhai.com`
3. Save → trigger **Redeploy**

**Cách B — Supabase SQL (chậm hơn nhưng persistent trong DB):**

```sql
-- Chạy trong Supabase Dashboard → SQL Editor
UPDATE staff
SET is_manager = TRUE
WHERE LOWER(email) = LOWER('nv4@esuhai.com');

-- Nếu staff chưa có row cho user này → insert (cần thêm các field bắt buộc)
INSERT INTO staff (name, email, department, is_manager)
VALUES ('Nguyễn Văn A', 'nv4@esuhai.com', 'Phòng Tổng Hợp', TRUE)
ON CONFLICT (email) DO UPDATE SET is_manager = TRUE;
```

### 4.3 Báo user thử login

1. Báo user vào `https://esuhai-booking-xe-v2.vercel.app/login`
2. Nhập email → bấm **Gửi link đăng nhập**
3. Mở email → bấm link → tự đăng nhập
4. Thử bấm Duyệt/Phân công 1 booking test → nếu KHÔNG báo lỗi quyền là OK ✅

---

## 5. ❌ Gỡ quyền

Nếu cần thu hồi quyền (vd nhân viên nghỉ việc):

1. **Vercel env:** xoá email khỏi `ALLOWED_MANAGER_EMAILS` → Redeploy
2. **DB (nếu dùng cách B):**
   ```sql
   UPDATE staff SET is_manager = FALSE
   WHERE LOWER(email) = LOWER('nv4@esuhai.com');
   ```
3. **Disable login hoàn toàn:** Supabase → Authentication → Users → tìm user → bấm "..." → **Delete user**

---

## 6. 🔍 Troubleshooting

### "Email này chưa được cấp quyền truy cập hệ thống"
- User chưa có account trên Supabase auth.users → làm bước 4.1.

### "Đã gửi link đăng nhập" nhưng không thấy email
- Check spam/junk folder
- Verify Site URL + Redirect URLs ở Supabase đã đúng (bước 3.1)
- Verify SMTP của Supabase project đã bật (Settings → Auth → SMTP — có thể Supabase tự dùng Sendgrid mặc định)

### Login OK nhưng bấm Duyệt → "Chỉ Quản lý mới thực hiện được thao tác này"
- Email user chưa có trong env `ALLOWED_MANAGER_EMAILS` (cách A) HOẶC chưa `is_manager=TRUE` (cách B).
- Verify env value trên Vercel → Redeploy nếu vừa edit.
- Verify SQL: `SELECT email, is_manager FROM staff WHERE LOWER(email) = LOWER('user@esuhai.com');`

### Link trong email click ra `localhost:3000` thay vì prod URL
- Supabase **Site URL** chưa set đúng → fix bước 3.1.

---

## 7. Danh sách Quản lý hiện tại (2026-04-30)

```
ALLOWED_MANAGER_EMAILS=hoangkha@esuhai.com,thuyha@esuhai.com,chintm@esuhai.com
```

| Email | Họ tên | Vai trò |
|-------|--------|---------|
| `hoangkha@esuhai.com` | Anh Hoàng | always_cc + ban điều hành |
| `thuyha@esuhai.com` | Chị Thúy Hà | Manager (duyệt cấp 2) |
| `chintm@esuhai.com` | Anh/Chị Chính | Ban điều hành |

> Cập nhật danh sách này mỗi khi thêm/gỡ thành viên + sync với env Vercel.

---

*Phòng Tổng Hợp — Esuhai Group*
