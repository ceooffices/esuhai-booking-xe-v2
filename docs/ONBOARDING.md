# ONBOARDING — Mời thành viên ban điều hành sử dụng hệ thống

> Hướng dẫn cấp quyền truy cập + sử dụng dashboard Quản lý Xe cho thành viên
> Phòng Tổng Hợp / Ban Điều Phối.
>
> **Cấp / reset / thu hồi mật khẩu** — xem [docs/RUNBOOKS.md](RUNBOOKS.md) §1–§3.
> **Restore data sau sự cố** — xem [docs/RUNBOOKS.md](RUNBOOKS.md) §4.

---

## 1. Tổng quan kiến trúc auth

Hệ thống dùng **Email + Mật khẩu** (Supabase `signInWithPassword`):

```
1. User vào /login
2. Nhập email công ty + mật khẩu (do Phòng Tổng Hợp cấp)
3. Supabase verify → set session cookie
4. Middleware kiểm cookie ở mọi route (dashboard)/*
5. Server action thay đổi state → requireManagerRole() kiểm Quản lý
```

**Vì sao password thay vì Magic Link?** Xem `docs/DEEP_AUDIT_REPORT.md` §1.1
S-5. Tóm tắt: SMTP outbound qua Office365 không phù hợp gửi link auth nhanh
(rate limit + latency), Quản lý dùng trên điện thoại hay quên kiểm email →
password cố định ổn hơn. Cấp mật khẩu thủ công qua Supabase Dashboard giúp
kiểm soát danh sách user chặt chẽ.

**Lưu ý bảo mật:**
- Mật khẩu nên ≥ 12 ký tự, mix chữ + số + ký tự đặc biệt
- Đổi mật khẩu mặc định ngay lần login đầu (RUNBOOKS §2)
- Mất mật khẩu → liên hệ admin reset, KHÔNG có "Forgot password" tự phục vụ
- Không share tài khoản — 1 người 1 email

---

## 2. Quyền hạn (role check)

Mỗi user đăng nhập sẽ thuộc 1 trong 2 nhóm:

| Nhóm | Quyền | Cơ chế |
|------|-------|--------|
| **Quản lý** (ban điều hành) | Duyệt, phân công, huỷ, sửa config, CRUD xe/tài xế | Email có trong env `ALLOWED_MANAGER_EMAILS` HOẶC `staff.is_manager = TRUE` |
| **Còn lại** | Đăng nhập được dashboard nhưng các action thay đổi state sẽ trả lỗi quyền | Mặc định nếu không thoả 2 điều trên |

Check ở [src/lib/auth.ts](../src/lib/auth.ts) function `requireManagerRole()`.
Dual-source cho phép cấp quyền nhanh qua env (không cần SQL).

---

## 3. ⚙️ Setup ban đầu (chỉ làm 1 lần)

### 3.1 Supabase Auth — disable signup tự do

1. Vào **Supabase Dashboard → Authentication → Providers**
2. Tab **Email** → bật ✓ (mặc định đã bật)
3. Tab **Email → Email Settings**:
   - **Allow new users to sign up** → **OFF** (chỉ admin tạo user mới)
   - **Confirm email** → **OFF** (admin set password trực tiếp, không cần user confirm qua link)
4. Tab **Email → Auth Providers → Email**:
   - **Enable Email provider** → ✓
   - **Confirm email** → OFF (như trên)
   - **Secure email change** → ✓ (giữ mặc định)
   - **Secure password change** → ✓ (giữ mặc định)
5. Tab **URL Configuration**:
   - **Site URL:** `https://esuhai-booking-xe-v2.vercel.app`
   - **Redirect URLs** (whitelist) — vẫn cần khai báo phòng dùng password reset link sau này:
     - `https://esuhai-booking-xe-v2.vercel.app/api/auth/callback`
     - `http://localhost:3000/api/auth/callback` (dev)

### 3.2 Supabase Auth — Rate Limit (bảo vệ brute-force)

Vì dùng password, phải verify rate limit chặt:

1. **Authentication → Rate Limits** (Supabase Pro tier mới có UI, Free tier dùng default)
2. Mặc định Supabase giới hạn **30 sign-in/hour/IP** — đủ cho dùng nội bộ
3. Nếu cần thắt chặt hơn → mở ticket Supabase support hoặc lên Pro tier
4. Document số liệu vào RUNBOOKS §6

### 3.3 Vercel — set env `ALLOWED_MANAGER_EMAILS`

Vào **Vercel project → Settings → Environment Variables → Add new**:

```
Name:  ALLOWED_MANAGER_EMAILS
Value: hoangkha@esuhai.com,thuyha@esuhai.com,chintm@esuhai.com
Apply to: ✓ Production  ✓ Preview  ✓ Development
```

**Quy tắc value:**
- Lowercase toàn bộ
- Cách nhau bằng dấu phẩy
- **Không** có khoảng trắng giữa các email
- Email có trong env = Quản lý dù `staff.is_manager` thế nào

Sau khi save → **Settings → Deployments → bấm "..." trên deploy mới nhất → Redeploy** (hoặc đợi commit kế tiếp tự deploy).

### 3.4 Set các env còn lại

| Env | Mục đích |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Endpoint Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (browser dùng được) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role (chỉ server, bypass RLS) — KHÔNG để client thấy |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP Office365 cho `booking.xe@esuhai.com` |
| `WEBHOOK_SECRET` | HMAC sign cho token public + webhook V1 — đặt random ≥ 32 ký tự |
| `NEXT_PUBLIC_APP_URL` | URL public của app (build email link đúng) |
| `NEXT_PUBLIC_TIMEZONE` | `Asia/Ho_Chi_Minh` |

---

## 4. 👤 Mời thành viên mới (mỗi lần thêm 1 người)

Giả sử cần mời `nv4@esuhai.com`:

### 4.1 Tạo tài khoản trên Supabase + cấp password

1. **Supabase Dashboard → Authentication → Users → Add user → Create new user**
2. Điền form:
   - **Email:** `nv4@esuhai.com`
   - **Password:** đặt 1 mật khẩu tạm ≥ 12 ký tự (vd `Esuhai@2026!Demo`)
   - **Auto Confirm User:** ✓ (bắt buộc, để user login luôn không cần verify email)
3. **Create user**

Chi tiết thao tác (kèm screenshot tham chiếu) — RUNBOOKS §1.

### 4.2 Cấp quyền Quản lý

Có 2 cách (chọn 1):

**Cách A — Vercel env (nhanh, không cần SQL):**

1. Vercel → env `ALLOWED_MANAGER_EMAILS` → bấm **Edit**
2. Append email vào danh sách: `...,nv4@esuhai.com`
3. Save → trigger **Redeploy**

**Cách B — Supabase SQL (persistent trong DB):**

```sql
-- Chạy trong Supabase Dashboard → SQL Editor
UPDATE staff
SET is_manager = TRUE
WHERE LOWER(email) = LOWER('nv4@esuhai.com');

-- Nếu staff chưa có row cho user này → insert
INSERT INTO staff (name, email, department, is_manager)
VALUES ('Nguyễn Văn A', 'nv4@esuhai.com', 'Phòng Tổng Hợp', TRUE)
ON CONFLICT (email) DO UPDATE SET is_manager = TRUE;
```

Khuyến nghị: dùng **cả 2** — env cho whitelist nhanh, SQL để DB cũng phản ánh
đúng trạng thái (giúp future RLS policy work tốt hơn).

### 4.3 Báo user lần đăng nhập đầu

Gửi message Zalo / email nội bộ (KHÔNG gửi qua email khác công ty):

```
Anh/Chị [Tên],

Tài khoản hệ thống Quản lý Xe đã được cấp:
- URL:      https://esuhai-booking-xe-v2.vercel.app/login
- Email:    nv4@esuhai.com
- Mật khẩu: Esuhai@2026!Demo

Vui lòng đăng nhập + ĐỔI MẬT KHẨU NGAY (RUNBOOKS §2.2) trước khi
sử dụng. Mật khẩu mới cần ≥ 12 ký tự, mix chữ-số-ký tự đặc biệt.

Test sau khi đăng nhập:
1. Vào /dashboard — phải thấy danh sách booking
2. Bấm "Duyệt" 1 booking đang chờ — nếu KHÔNG báo lỗi quyền là OK

Phòng Tổng Hợp
```

---

## 5. ❌ Gỡ quyền + thu hồi tài khoản

Khi nhân viên nghỉ việc / đổi vị trí — quy trình chuẩn ở RUNBOOKS §3.
Tóm tắt:

1. **Vercel env:** xoá email khỏi `ALLOWED_MANAGER_EMAILS` → Redeploy
2. **DB:**
   ```sql
   UPDATE staff SET is_manager = FALSE
   WHERE LOWER(email) = LOWER('nv4@esuhai.com');
   ```
3. **Khoá login:** Supabase → Authentication → Users → tìm user → "..." → **Delete user** (xoá hẳn) HOẶC **Ban user** (soft-disable, giữ history)

Khuyến nghị **Ban** trong 30 ngày trước khi Delete — để giữ audit log nếu cần
truy vết.

---

## 6. 🔍 Troubleshooting

### "Email hoặc mật khẩu không đúng"
- Verify email lowercase
- Reset password theo RUNBOOKS §2.1 (admin reset)
- User có thể vừa được ban → check Supabase Users panel

### Đăng nhập OK nhưng bấm Duyệt → "Chỉ Quản lý mới thực hiện được thao tác này"
- Email user chưa có trong env `ALLOWED_MANAGER_EMAILS` HOẶC chưa `is_manager=TRUE`
- Verify env value trên Vercel → Redeploy nếu vừa edit (env mới chỉ active sau deploy)
- Verify SQL:
  ```sql
  SELECT email, is_manager FROM staff WHERE LOWER(email) = LOWER('user@esuhai.com');
  ```
- Verify trên code: console.log trong [src/lib/auth.ts](../src/lib/auth.ts) `requireManagerRole()` xem `source` trả về `staff_table` hay `env_whitelist`

### "Tài khoản chưa được xác nhận. Vui lòng liên hệ Phòng Tổng Hợp."
- Khi tạo user, **Auto Confirm User** chưa tick → Supabase đợi user click email confirm
- Fix: Supabase Dashboard → Users → tìm user → "..." → **Send magic link** HOẶC **Confirm email** manual

### Session hết hạn quá nhanh
- Default Supabase session 1 giờ + refresh token 7 ngày
- Nếu user kêu phải login lại quá thường → check `Authentication → Settings → JWT expiry`
- Tăng `JWT expiry limit` lên 3600s là OK; không khuyến nghị tăng quá 1 ngày

### Login OK trên web nhưng email link (driver-response / evaluate) không vào được
- 2 flow độc lập — driver-response không cần login, dùng HMAC token riêng
- Nếu lỗi → kiểm `WEBHOOK_SECRET` env trên Vercel có set không, có khớp giữa build và runtime không

---

## 7. Danh sách Quản lý hiện tại (cập nhật 2026-05-12)

```
ALLOWED_MANAGER_EMAILS=hoangkha@esuhai.com,thuyha@esuhai.com,chintm@esuhai.com
```

| Email | Họ tên | Vai trò |
|-------|--------|---------|
| `hoangkha@esuhai.com` | Anh Hoàng Kha | PM dự án, always_cc + ban điều hành |
| `thuyha@esuhai.com` | Chị Thúy Hà | Manager (duyệt cấp 2 xe ngoài) |
| `chintm@esuhai.com` | Anh/Chị Chính | Ban điều hành (duyệt cấp 3) |

> **Cập nhật danh sách này** mỗi khi thêm/gỡ thành viên + sync với env Vercel.
> Tối thiểu rà soát 1 lần / tháng (theo cadence ở `docs/ROADMAP.md` §5).

---

## 8. Tự đổi mật khẩu (user)

Hiện tại app **chưa có UI tự đổi mật khẩu** (Block U có thể bổ sung).
Tạm thời: user liên hệ Phòng Tổng Hợp → admin đổi qua Supabase Dashboard (RUNBOOKS §2.2).

Khi cần, user có thể tự đổi qua Supabase auth API trực tiếp — nhưng cách an
toàn hơn là gặp admin.

---

*Phòng Tổng Hợp — Esuhai Group*
