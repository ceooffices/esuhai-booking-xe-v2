# RUNBOOKS — Booking Xe V2

> Sổ tay vận hành cho Phòng Tổng Hợp + admin hệ thống. Mỗi runbook = 1 quy trình
> hay phải làm, có bước rõ ràng, có rollback, có cách verify.
>
> **Cập nhật:** 2026-05-12 — Phòng Tổng Hợp
>
> **Liên kết:**
> - [ONBOARDING.md](ONBOARDING.md) — setup tài khoản
> - [ROADMAP.md](ROADMAP.md) — plan 6 tuần
> - [DEEP_AUDIT_REPORT.md](DEEP_AUDIT_REPORT.md) — context security

---

## Mục lục

| # | Runbook | Tần suất | Người làm |
|---|---|---|---|
| 1 | Cấp tài khoản + mật khẩu mới | Mỗi lần thêm nhân sự | Admin |
| 2 | Reset / đổi mật khẩu | Khi user quên / đến hạn | Admin / user |
| 3 | Gỡ quyền + thu hồi tài khoản | Khi nhân sự nghỉ / đổi vị trí | Admin |
| 4 | Restore data sau sự cố | Khi DB bị mất / sai | Admin + dev |
| 5 | KPI cứng paste vào Form 4 | Hằng tuần (T6 16:00) | Phòng Tổng vụ *(sau Block C)* |
| 6 | Verify Supabase rate limit | Sau setup + mỗi quý | Admin *(sau Block F.9)* |
| 7 | Cập nhật danh sách Manager | Mỗi tháng | Admin |

> §5 + §6 sẽ chi tiết hoá khi Block C (KPI API) và Block F.9 (rate limit
> verification) hoàn thành. Hiện tại §5/§6 là placeholder để track lineage.

---

## 1. Cấp tài khoản + mật khẩu mới

**Kịch bản:** Tuyển thêm 1 NV ban điều hành (vd anh/chị Nguyễn Văn A — email `nva@esuhai.com`) cần truy cập dashboard.

### 1.1 Pre-check (trước khi tạo)

- [ ] Đã có email công ty `@esuhai.com` của user
- [ ] Đã rõ user thuộc nhóm Quản lý hay chỉ Read-only
- [ ] Có cách liên lạc Zalo / điện thoại để gửi password ban đầu (KHÔNG gửi password qua email khác công ty)

### 1.2 Tạo user trên Supabase

1. Đăng nhập **Supabase Dashboard** (`https://supabase.com/dashboard`) — owner account
2. Chọn project `esuhai-booking-xe-v2`
3. **Authentication → Users → Add user → Create new user**
4. Form:
   - **Email:** `nva@esuhai.com` (lowercase)
   - **Password:** sinh password tạm — yêu cầu:
     - ≥ 12 ký tự
     - Mix `[a-z][A-Z][0-9][!@#$%]`
     - Ví dụ: `Esuhai@2026!Init` (hoặc dùng `openssl rand -base64 16`)
   - **Auto Confirm User:** ✓ (BẮT BUỘC — nếu không tick, user sẽ phải confirm email mới login được, trong khi Office365 SMTP có thể không gửi được email auth của Supabase)
5. Bấm **Create user** → hệ thống trả về user id (UUID), copy lưu lại

### 1.3 Cấp quyền (nếu user là Quản lý)

**Cách A — Env whitelist (nhanh, không cần SQL):**

1. Vercel → project `esuhai-booking-xe-v2` → **Settings → Environment Variables**
2. Tìm `ALLOWED_MANAGER_EMAILS` → **Edit**
3. Append: `,nva@esuhai.com` (lowercase, không space)
4. Save → **Deployments → ... → Redeploy** (env mới chỉ active sau deploy)

**Cách B — DB (persistent):**

```sql
-- Supabase Dashboard → SQL Editor → New query
INSERT INTO staff (name, email, department, is_manager)
VALUES ('Nguyễn Văn A', 'nva@esuhai.com', 'Phòng Tổng Hợp', TRUE)
ON CONFLICT (email) DO UPDATE
  SET is_manager = TRUE,
      name = EXCLUDED.name,
      department = EXCLUDED.department;
```

Khuyến nghị làm **cả 2** để DB phản ánh đúng + env có whitelist nhanh.

### 1.4 Báo user

Gửi Zalo / message nội bộ (KHÔNG email):

```
Anh/Chị [Tên],

Tài khoản hệ thống Quản lý Xe đã được cấp:
URL:      https://esuhai-booking-xe-v2.vercel.app/login
Email:    nva@esuhai.com
Mật khẩu: Esuhai@2026!Init

Vui lòng đăng nhập + đổi mật khẩu ngay theo hướng dẫn. Liên hệ
Phòng Tổng Hợp nếu gặp vấn đề.

Phòng Tổng Hợp
```

### 1.5 Verify

Yêu cầu user:

1. Mở `https://esuhai-booking-xe-v2.vercel.app/login`
2. Nhập email + password tạm → bấm **Đăng nhập**
3. Vào được `/dashboard`, thấy danh sách booking
4. Bấm **Duyệt** 1 booking đang chờ → KHÔNG báo lỗi quyền
5. Báo lại admin: thành công / lỗi gì

### 1.6 Rollback

Nếu phải hoãn cấp tài khoản (vd nhân sự chưa onboard):

```sql
-- Soft-disable bằng cách remove khỏi manager whitelist
UPDATE staff SET is_manager = FALSE WHERE email = 'nva@esuhai.com';
```

Hoặc xoá hẳn user theo §3.

---

## 2. Reset / đổi mật khẩu

### 2.1 Admin reset password (user quên password)

1. Supabase Dashboard → **Authentication → Users**
2. Tìm user theo email
3. Bấm dấu **"..."** ở cuối row → **Send password reset email**
   - **HOẶC** chọn **Update user** → tab **User Info** → field **New password** → nhập password tạm mới → **Update user**
4. Báo user qua Zalo: password mới + yêu cầu đổi ngay sau khi login

> **Lưu ý:** "Send password reset email" cần SMTP Supabase hoạt động. Office365
> account `booking.xe@esuhai.com` chưa cấu hình cho Supabase SMTP, nên hiện
> tại Supabase dùng Sendgrid mặc định — email có thể vào spam. Khuyến nghị
> dùng cách **Update user → New password** thay vì reset link.

### 2.2 User tự đổi mật khẩu

**Hiện tại app chưa có UI tự đổi mật khẩu** (Block U có thể bổ sung).

Workaround cho user:

- Liên hệ admin → admin làm theo §2.1

Khi UI có sau Block U, sẽ thêm flow:
1. User vào `/account/password`
2. Nhập password cũ + password mới (2 lần)
3. Supabase `auth.updateUser({ password })` → success → re-login

### 2.3 Policy đổi password định kỳ

- Khuyến nghị mọi Quản lý đổi password mỗi **3 tháng** một lần
- Khi rotate: admin update password mới qua Supabase Dashboard, báo user
- Track lần rotate cuối ở Google Sheet "Booking Xe — Audit log" (Phòng Tổng Hợp giữ)

---

## 3. Gỡ quyền + thu hồi tài khoản

**Kịch bản:** Nhân viên nghỉ việc / chuyển bộ phận / không còn cần quyền truy cập.

### 3.1 Quy trình chuẩn

**Bước 1 — Gỡ quyền Quản lý (giữ tài khoản):**

```
A. Vercel env:
   - ALLOWED_MANAGER_EMAILS → bỏ email khỏi list → Save → Redeploy

B. DB:
   UPDATE staff SET is_manager = FALSE
   WHERE LOWER(email) = LOWER('nv4@esuhai.com');
```

→ User vẫn login được, nhưng bấm Duyệt sẽ báo "Chỉ Quản lý mới...".

**Bước 2 — Khoá login (nếu nhân sự đã nghỉ hẳn):**

Trong Supabase Dashboard → Users → tìm user → "..." → chọn 1 trong 3:

| Option | Tác dụng | Khi nào dùng |
|---|---|---|
| **Ban user** | Soft-disable — login fail nhưng record giữ nguyên | Default — giữ 30 ngày trước khi xoá hẳn |
| **Delete user** | Xoá khỏi `auth.users` + cascade các bảng | Sau 30 ngày Ban + chắc chắn không cần khôi phục |
| **Logout user** | Invalidate session hiện tại, user vẫn login lại được | Tạm thời khoá session đang dùng |

### 3.2 Verify

Test bằng cách:

1. Mở browser ẩn danh / tab incognito mới
2. Vào `/login`, đăng nhập với email + password user
3. **Sau Ban:** Login fail với message "Email hoặc mật khẩu không đúng"
4. **Sau gỡ Quản lý nhưng chưa Ban:** Login OK, vào dashboard OK, bấm Duyệt → báo lỗi quyền

### 3.3 Audit

Mỗi lần gỡ quyền, log vào Google Sheet "Booking Xe — Audit log":

| Date | Email | Action | Lý do | Ai làm |
|---|---|---|---|---|
| 2026-05-12 | `nv4@esuhai.com` | Banned + manager off | Nghỉ việc | Hoàng Kha |

### 3.4 Rollback (lỡ tay xoá nhầm)

- **Ban:** Supabase → Users → tìm (vẫn còn trong list) → "..." → **Unban**
- **Delete:** không reverse — phải tạo lại từ đầu theo §1
- **Env whitelist:** add lại email + Redeploy
- **`is_manager` DB:** `UPDATE staff SET is_manager = TRUE WHERE email = ...`

---

## 4. Restore data sau sự cố

**Kịch bản:** DB bị xoá nhầm data / migration sai / user xoá nhầm booking.

### 4.1 Trước khi restore — ASSESS

1. Xác định **scope** thiệt hại:
   - Mất 1 booking? Mất 1 table? Mất toàn bộ DB?
   - Mất bao lâu rồi (giờ / ngày)?
2. Quyết định **strategy:**
   - **Surgical restore** (1 row / 1 table): query từ backup, restore qua INSERT
   - **Full restore** (toàn DB): rollback snapshot Supabase
3. **Báo team** trên Zalo nhóm Phòng Tổng Hợp + freeze hoạt động ghi mới trong khi điều tra

### 4.2 Supabase backup options (Free tier hiện tại)

| Mức | Backup | Retention | Khôi phục |
|---|---|---|---|
| **Free** | Daily snapshot tự động | 7 ngày | Self-service Dashboard |
| **Pro** | Daily + Point-in-Time Recovery | 7-28 ngày | Self-service + PITR |
| **Team+** | + Custom retention | Tuỳ chọn | + Logical backups |

Hiện tại **Free tier** — có daily snapshot 7 ngày. Verify ở **Dashboard → Database → Backups**.

> **Cần upgrade Pro tier?** Khi data đã được dùng production thực sự (sau cutover B), PM cân nhắc upgrade để có PITR. Cost ~$25/month. Document quyết định vào doc này khi quyết.

### 4.3 Surgical restore — 1 booking bị xoá nhầm

```sql
-- 1. Find data trong snapshot gần nhất qua Supabase Dashboard
--    → Database → Backups → restore vào staging instance riêng
-- 2. SSH/Connect vào staging
SELECT * FROM bookings WHERE id = 'uuid-xxx';

-- 3. Export ra CSV / JSON
COPY (SELECT * FROM bookings WHERE id = 'uuid-xxx')
  TO '/tmp/restore.csv' WITH CSV HEADER;

-- 4. Trên prod: INSERT lại
INSERT INTO bookings (...) VALUES (...);
```

Khuyến nghị: KHÔNG làm trực tiếp trên prod. Dùng script `scripts/restore-row.ts` (chưa có — Block J sẽ tạo) để wrap quy trình.

### 4.4 Full restore — rollback toàn DB

⚠️ **CHỈ DÙNG KHI** lỗi nghiêm trọng + đã thông báo team trước:

1. Supabase Dashboard → **Database → Backups**
2. Chọn snapshot ngày muốn restore → bấm **Restore**
3. Supabase sẽ tạo project mới (`-restored`) → review data
4. Nếu OK → **swap** project (Supabase support hỗ trợ, cần ticket)
5. Update DNS / env Vercel trỏ về project mới

**Downtime ước tính:** 30-60 phút khi restore + swap.

### 4.5 Verify sau restore

Sau khi restore, chạy script verify (sẽ tạo ở Block J):

```bash
npx tsx scripts/verify-backfill.ts
```

Hoặc thủ công: spot-check 10 booking random từ dashboard vs ground truth (Excel sheet team giữ).

### 4.6 Post-mortem

Sau mọi sự cố data:

1. Viết note `docs/INCIDENT-YYYY-MM-DD.md`:
   - Symptom
   - Root cause
   - Timeline khôi phục
   - Số row bị ảnh hưởng
   - Action item phòng tái diễn
2. Review trong họp tuần kế tiếp
3. Update RUNBOOKS này nếu có insight mới

### 4.7 RPO / RTO mục tiêu

| Tier | RPO (mất tối đa) | RTO (khôi phục trong) |
|---|---|---|
| Free hiện tại | 24 giờ (last daily snapshot) | 1-2 giờ |
| Pro (nếu upgrade) | 5 phút (PITR) | 30 phút |
| Team+ (nếu upgrade) | 5 phút | 30 phút + custom retention |

→ Document chính thức ở Block J.2.

---

## 5. KPI cứng paste vào Form 4 *(placeholder — chi tiết hoá khi Block C xong)*

**Mục đích:** Phòng Tổng vụ paste 5 metric KPI cứng (tính bởi app) vào Google Form 4 hằng tuần T6 16:00.

**Endpoint app sẽ cung cấp (Block C):**
```
GET /api/kpi/driver-monthly?driver_email=khanh@esuhai.com&month=2026-05
```

**Quy trình dự kiến:**
1. Admin vào `/kpi/driver-monthly` dashboard
2. Chọn driver `khanh@esuhai.com` + tháng hiện tại
3. Bấm **"Copy JSON"** hoặc **"Tải CSV"**
4. Mở Google Form 4 → paste vào ô tương ứng

→ Chi tiết bước-từng-bước viết khi Block C.5 hoàn thành.

---

## 6. Verify Supabase rate limit *(placeholder — chi tiết khi Block F.9 xong)*

**Mục đích:** Đảm bảo brute-force password không quá dễ.

**Cần verify (Block F.9):**

- [ ] Sign-in attempts/hour/IP cap (default 30)
- [ ] Email verification rate (default 4/hour)
- [ ] Token refresh rate (default 1800/hour)
- [ ] Document số liệu vào doc này khi Block F.9 hoàn thành

---

## 7. Cập nhật danh sách Manager (hàng tháng)

**Cadence:** mùng 1 hằng tháng — admin rà soát ai còn quyền.

### 7.1 Checklist

- [ ] Mở `docs/ONBOARDING.md` §7 — list hiện tại
- [ ] Cross-check Vercel env `ALLOWED_MANAGER_EMAILS`
- [ ] Cross-check DB:
  ```sql
  SELECT email, name, is_manager FROM staff WHERE is_manager = TRUE ORDER BY email;
  ```
- [ ] Đảm bảo 3 nguồn (doc + env + DB) khớp nhau
- [ ] Ai nghỉ việc trong tháng → chạy §3
- [ ] Ai mới tuyển → chạy §1

### 7.2 Update doc

Sau rà soát:

1. Cập nhật `docs/ONBOARDING.md` §7 với danh sách mới
2. Commit với message `docs: cập nhật danh sách Manager YYYY-MM`
3. Verify deploy preview → prod

---

*Phòng Tổng Hợp — Esuhai Group | Living document — update sau mỗi incident hoặc thay đổi quy trình*
