# DEEP AUDIT REPORT — Booking Xe Esuhai V2

> **Ngày audit:** 2026-04-28 — **Auditor:** Claude (Opus 4.7) — **Scope:** Toàn bộ codebase + uncommitted changes — **Branch:** `master` @ `09bb03d`
>
> **Phương pháp:** Static analysis (Read + Grep + Glob). KHÔNG chạy build, KHÔNG khởi động dev server, KHÔNG trigger SMTP/webhook/API. Email system audit cũng chỉ static — không gửi mail test.

---

## 0. TÓM TẮT ĐIỀU HÀNH (Executive Summary)

Codebase đang ở mức **~85% hoàn thiện về tính năng** nhưng có **nhiều lỗ hổng nghiêm trọng về phân quyền, integrity và đồng bộ giữa spec/doc/code** mà nếu không xử lý sẽ làm hệ thống vận hành sai logic hoặc bị lạm dụng.

### 🔴 4 vấn đề CRITICAL (P0) cần xử lý NGAY hôm nay
1. **`/evaluate` cho phép spoof danh tính + spam đánh giá vô tận** — server action `submitEvaluation` không gọi `requireAuthUserEmail()` và nhận `evaluator_email`/`evaluator_name` từ URL params không xác thực. Bất kỳ ai cũng có thể giả mạo người đánh giá và chấm điểm cho mọi `bookingId`. [`src/lib/actions.ts:410-426`](src/lib/actions.ts#L410), [`src/app/evaluate/page.tsx:32-37`](src/app/evaluate/page.tsx#L32)
2. **`requireAuthUserEmail()` chỉ kiểm tra "có session" chứ không kiểm role** — bất kỳ user đăng nhập nào (kể cả nhân viên thường) đều có thể `approveBooking`, `rejectBooking`, `cancelBooking`, `assignDriverVehicle`, `saveDriver`, `saveVehicle`, `updateConfig`. Toàn quyền admin. [`src/lib/actions.ts:9-14`](src/lib/actions.ts#L9)
3. **Driver token = `driver_id` (UUID không bí mật, không hết hạn, dùng chung)** — ai forward email phân công 1 lần là cầm token vĩnh viễn của tài xế đó cho MỌI booking sau này. [`src/app/api/driver-response/route.ts:88`](src/app/api/driver-response/route.ts#L88), [`src/lib/actions.ts:50-51`](src/lib/actions.ts#L50)
4. **Webhook fail-OPEN khi `WEBHOOK_SECRET` chưa set** — `if (!expectedSecret) return true` (`backward compatible`) → bất kỳ ai biết URL có thể tạo booking ẩn danh + spam email duyệt. [`src/app/api/webhooks/google-form/route.ts:10`](src/app/api/webhooks/google-form/route.ts#L10)

### 🟠 4 vấn đề HIGH (P1)
5. **RLS Supabase quá lỏng** — hầu hết policy là `USING (true)` hoặc `WITH CHECK (true)`. Mọi user đăng nhập đọc/sửa được TẤT CẢ booking, passenger, post-trip, evaluation, email_log — đặc biệt `bookings_update USING (true)` cho phép sửa trực tiếp DB. [`supabase/migrations/001_initial_schema.sql:294-340`](supabase/migrations/001_initial_schema.sql#L294)
6. **Multi-level approval (xe ngoài 3 cấp) BỊ HỎNG NGẦM** — code chuyển trạng thái `cho_duyet → cho_duyet_cap2 → cho_duyet_cap3 → da_duyet` nhưng KHÔNG gửi email cho `approver_l2_email` / `approver_l3_email`. Họ phải tự "đoán" rằng có booking đang đợi mình. Cấu hình `approver_lN_email` trong Settings UI là **dead config**. [`src/lib/actions.ts:99-162`](src/lib/actions.ts#L99)
7. **3 trên 10 email templates được build nhưng KHÔNG BAO GIỜ GỬI**: `buildConfirmStaffEmail` (NV phụ trách), `buildConfirmManagerEmail` (Hoàn tất → quản lý), `buildRejectBookerEmail` (Không duyệt → người đăng ký). Chỉ render được trong `/email-preview`. NV phụ trách chuyến KHÔNG NHẬN email "lịch đã xác nhận". [`src/lib/email-templates.ts:708,743,802`](src/lib/email-templates.ts#L708) vs [`src/lib/actions.ts`](src/lib/actions.ts) (chỉ gọi 4 build* functions)
8. **Login dùng password thay vì Magic Link** — CLAUDE.md, README và CONTENT_BIBLE đều khẳng định "Supabase Auth (Magic Link email)" nhưng [`src/app/(auth)/login/page.tsx:22`](src/app/(auth)/login/page.tsx#L22) gọi `signInWithPassword`. Không có password reset flow, không rate limit, không 2FA → tài khoản nội bộ dễ bị brute-force.

### 🟡 Spec ↔ Code không đồng bộ (cần thống nhất)
- **CONTENT_BIBLE §IV nói 4 bước** (`Tiếp nhận / Duyệt & Phân bổ / Tài xế xác nhận / Sẵn sàng phục vụ`); **email-templates.ts hard-code 5 bước** ([`src/lib/email-templates.ts:169`](src/lib/email-templates.ts#L169) — `Tiếp nhận / Phân bổ / Xác nhận / Phục vụ / Hoàn thành`). Process bar email khác dashboard.
- **Migration seed** ghi `email_method='n8n'` + 2 URL n8n webhook ([`supabase/migrations/001_initial_schema.sql:287-289`](supabase/migrations/001_initial_schema.sql#L287)) trong khi V2 đã rip n8n. Settings UI hiển thị các config dead này như cấu hình thật.
- **README.md là boilerplate `create-next-app`** — không có dòng nào về dự án này.

### 🟢 Cái đã làm rất tốt
- Tách RSC ↔ CSR sạch, không có service-role key bị reachable từ `'use client'`.
- Email template HTML cho Outlook (VML buttons + MSO conditionals) — chỉn chu, đúng best practice.
- Tiếng Việt nhất quán theo CONTENT_BIBLE (sau commit 200aed8 + 09bb03d). Có hệ thống `vnGreeting()` xử lý tên tiếng Việt + giới tính rất chuẩn.
- Server actions consistently re-derive `approverEmail` từ session, không tin client param.
- Mọi `email_logs` đều có status + error_message — observability tốt.
- Webhook có scaffold verify secret (chỉ thiếu fail-closed default).

---

## 1. SECURITY AUDIT

### 1.1 Authentication & Authorization

| # | Severity | Vấn đề | Vị trí | Tác động | Fix đề xuất |
|---|---------|--------|--------|----------|-------------|
| S-1 | **P0** | `submitEvaluation` không check auth, lấy email/name từ URL | [`src/lib/actions.ts:410`](src/lib/actions.ts#L410), [`src/app/evaluate/page.tsx:32`](src/app/evaluate/page.tsx#L32) | Spoof identity, spam đánh giá vô hạn cho mọi booking | (a) Thêm `await requireAuthUserEmail()` ở đầu nếu yêu cầu nội bộ; HOẶC (b) ký URL bằng HMAC `${WEBHOOK_SECRET}:${bookingId}:${expires}` rồi verify server-side, KHÔNG tin email/name từ client. |
| S-2 | **P0** | `requireAuthUserEmail()` chỉ check tồn tại session, không check role/department | [`src/lib/actions.ts:9-14`](src/lib/actions.ts#L9) | Bất kỳ user đăng nhập nào đều có thể duyệt/huỷ/sửa toàn bộ system | Tạo helper `requireRole(['admin','manager'])`: query `staff` (qua `createAdminClient`) bằng `user.email`, check `is_manager` hoặc `role` field, throw nếu không match. Apply cho mọi action `approve*`, `reject*`, `cancel*`, `assign*`, `save*`, `updateConfig`. |
| S-3 | **P0** | Driver verification token = `driver_id` (UUID, không bí mật, không expire) | [`src/app/api/driver-response/route.ts:88`](src/app/api/driver-response/route.ts#L88), [`src/lib/actions.ts:50-51`](src/lib/actions.ts#L50) | Forward 1 email = compromise vĩnh viễn. Anyone với token confirm/reject mọi booking trong tương lai. | Per-booking signed token: `token = HMAC(WEBHOOK_SECRET, bookingId + driverId + exp)`. URL: `/driver-response?id=...&token=<base64url>`. Verify HMAC + check `exp > now()` + check matches assigned driver. Token tự hết hạn theo `pickup_time + 24h`. |
| S-4 | **P0** | Webhook fail-open khi missing secret | [`src/app/api/webhooks/google-form/route.ts:10`](src/app/api/webhooks/google-form/route.ts#L10) | Anonymous booking creation, spam | `if (!expectedSecret) { console.error('WEBHOOK_SECRET not set'); return false; }`. Nếu cần dev bypass, dùng `if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_INSECURE_WEBHOOK === 'true')`. |
| S-5 | P1 | Login dùng password, không phải Magic Link như doc | [`src/app/(auth)/login/page.tsx:22`](src/app/(auth)/login/page.tsx#L22) | Tài khoản dễ brute-force, trái CLAUDE.md/README/BIBLE | Quyết định: (a) đổi sang `signInWithOtp({ email })` + redirect callback; HOẶC (b) cập nhật doc nếu thực tế chọn password (nhưng cần thêm Supabase rate limit + CAPTCHA). |
| S-6 | P1 | Server actions nhận `clientApproverEmail`/`clientCancelledBy`/`clientRejectedBy` rồi mới override bằng session | [`src/lib/actions.ts:100,165,241`](src/lib/actions.ts#L100) | Code smell — gợi ý cho reader rằng client có thể override identity. Nguy hiểm nếu sau này có người xoá `try{}` block. | Bỏ hẳn parameter, luôn `const email = await requireAuthUserEmail()`. |
| S-7 | P2 | `next` query param trong auth callback chưa whitelist | [`src/app/api/auth/callback/route.ts:7,13`](src/app/api/auth/callback/route.ts#L7) | Open-redirect-lite (chỉ same-origin nên risk thấp, nhưng lộ pattern) | Validate `if (!next.startsWith('/') || next.startsWith('//')) next = '/dashboard'`. |

### 1.2 RLS (Row Level Security) — đặc biệt nghiêm trọng

[`supabase/migrations/001_initial_schema.sql:294-340`](supabase/migrations/001_initial_schema.sql#L294):

```sql
-- Hiện tại (QUÁ LỎNG):
CREATE POLICY "bookings_read"   ON bookings FOR SELECT USING (true);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (true);
CREATE POLICY "passengers_all"     ON booking_passengers FOR ALL USING (true);
CREATE POLICY "post_trips_all"     ON post_trips         FOR ALL USING (true);
CREATE POLICY "post_trip_costs_all" ON post_trip_costs    FOR ALL USING (true);
CREATE POLICY "evaluations_all"    ON trip_evaluations    FOR ALL USING (true);
CREATE POLICY "email_logs_insert"  ON email_logs          FOR INSERT WITH CHECK (true);
```

**Tác động:** Bất kỳ user nào có anon key (tức là client browser sau khi login) có thể:
- `UPDATE` trực tiếp bất kỳ booking nào (đổi status, đổi tài xế, sửa lý do từ chối) bypass workflow.
- `INSERT` evaluation giả mạo cho mọi booking (parallel với P0 evaluate route).
- `INSERT` post_trip_costs giả → phá báo cáo chi phí.
- `INSERT` email_logs giả → giả mạo audit log "đã gửi email cho X".
- `READ` toàn bộ PII: requester email, member_names, phone tài xế, lộ trình.

**Lý do hiện tại "có vẻ" hoạt động:** Code app chủ yếu dùng `createAdminClient()` (bypass RLS) trong server actions, nên client browser hiếm khi gọi PostgREST trực tiếp. **NHƯNG** các route GET như [`src/app/api/bookings/route.ts`](src/app/api/bookings/route.ts) dùng anon client và chỉ "an toàn" nhờ `bookings_read USING (true)` — tức là bất kỳ user authenticated nào (kể cả không phải admin) hit endpoint đó cũng có toàn bộ data.

**Fix khuyến nghị (migration mới):**
```sql
-- 003_rls_hardening.sql
-- Helper function: check role via staff table
CREATE OR REPLACE FUNCTION is_admin_or_manager() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM staff
    WHERE email = auth.jwt() ->> 'email'
      AND (is_manager = true OR title ILIKE '%admin%')
  )
$$;

-- bookings: read all (cần cho dashboard); write chỉ admin/manager
DROP POLICY IF EXISTS "bookings_insert" ON bookings;
DROP POLICY IF EXISTS "bookings_update" ON bookings;
CREATE POLICY "bookings_insert" ON bookings FOR INSERT
  WITH CHECK (is_admin_or_manager() OR auth.jwt() ->> 'email' = requester_email);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE
  USING (is_admin_or_manager());

-- evaluations: chỉ insert với evaluator_email = chính mình
DROP POLICY IF EXISTS "evaluations_all" ON trip_evaluations;
CREATE POLICY "evaluations_select" ON trip_evaluations FOR SELECT USING (true);
CREATE POLICY "evaluations_insert" ON trip_evaluations FOR INSERT
  WITH CHECK (evaluator_email = auth.jwt() ->> 'email');

-- post_trips, post_trip_costs, email_logs, passengers: chỉ admin/manager write
-- (chi tiết tương tự — viết policy cụ thể cho từng table)
```

**Lưu ý:** Vì server actions dùng service-role bypass RLS, RLS hardening là tuyến phòng thủ thứ 2 (defense in depth) — không phá vỡ logic hiện tại nhưng vá được cả lỗ hổng client-direct-access.

### 1.3 XSS / Input sanitization

| # | Severity | Vấn đề | Vị trí | Note |
|---|---------|--------|--------|------|
| X-1 | P3 | Email templates: `esc()` xử lý 4 ký tự `& < > "` — thiếu `'` | [`src/lib/email-templates.ts:106-109`](src/lib/email-templates.ts#L106) | Hiếm khi dùng `'` trong attribute trừ `aria-label` style — risk thấp nhưng nên thêm `.replace(/'/g, '&#39;')`. |
| X-2 | OK | Mọi user-input vào HTML email đều qua `esc()` — đã thấy ở `requesterName`, `purpose`, `cancellationReason`, `rejectionReason` | [`src/lib/email-templates.ts`](src/lib/email-templates.ts) | Tốt. |
| X-3 | P3 | `parseStops(itinerary)` dùng `encodeURIComponent` cho Google Maps URL — OK | [`src/lib/email-templates.ts:350`](src/lib/email-templates.ts#L350) | OK. |

### 1.4 SQL Injection

✅ Toàn bộ DB query đi qua Supabase JS client (`.eq`, `.update`, `.insert` parameterized). Không có raw SQL trong app code. Không có template string concatenation vào query. **No SQL injection surface.**

### 1.5 Secrets handling

| # | Severity | Vấn đề | Vị trí | Note |
|---|---------|--------|--------|------|
| K-1 | P3 | `.env.example` hard-code real Supabase URL | [`.env.example:2`](.env.example#L2) | URL Supabase là public (anon key cần nó), không phải secret — chấp nhận được. |
| K-2 | OK | `SUPABASE_SERVICE_ROLE_KEY` chỉ ref ở `lib/supabase/admin.ts`, `scripts/seed.ts`, `.env.example` | (Grep verified) | Không leak ra `'use client'`. |
| K-3 | P2 | Không thấy `.env.local` trong `.gitignore` (cần verify) | — | `git status` không list `.env.local` là đã track hay không track? Cần `git check-ignore .env.local` để chắc. |
| K-4 | P2 | SMTP error log raw qua `console.error` (`String(err)` có thể chứa credential trong stack trace của nodemailer error) | [`src/lib/email.ts:54-55`](src/lib/email.ts#L54) | Sanitize trước khi log: chỉ log `err.code`/`err.responseCode`, không log toàn bộ object. |

---

## 2. DATA INTEGRITY AUDIT

### 2.1 Schema (migrations 001 + 002)

#### Strengths
- Enum `booking_status` đầy đủ 11 trạng thái.
- Generated column `average_score` của `trip_evaluations` — `STORED` + `CHECK (1..5)` chuẩn.
- Trigger `compute_post_trip_diffs` tự tính `departure_diff_minutes` / `return_diff_minutes` — tránh phụ thuộc app code.
- `idx_bookings_*` đầy đủ cho 6 cột truy vấn nhiều.
- `UNIQUE(booking_id, evaluator_email)` chặn 1 người đánh giá 2 lần cùng booking.
- `ON DELETE CASCADE` cho passengers, post_trips, post_trip_costs, evaluations.

#### Issues

| # | Severity | Vấn đề | Vị trí | Tác động & Fix |
|---|---------|--------|--------|----------------|
| D-1 | P1 | Bảng `staff` được query qua `createAdminClient` ([`dashboard/page.tsx:24`](src/app/(dashboard)/dashboard/page.tsx#L24)) nhưng **không có trong migration 001**. Migration 002 chỉ `ALTER TABLE staff ADD gender` — giả định `staff` đã tồn tại từ Ver01. Project chỉ chạy được nếu DB có sẵn `staff`. | [`supabase/migrations/`](supabase/migrations/) | Add migration `000_staff_table.sql` với schema đầy đủ (`id, name, department, email UNIQUE, title, is_manager BOOLEAN, gender, created_at`). Documentation rõ "shared with V1". |
| D-2 | P2 | `bookings.staff_in_charge` là TEXT, không FK đến `staff.email` hoặc `staff.id` | [`migrations/001:108`](supabase/migrations/001_initial_schema.sql#L108) | Khi rename/đổi email staff → orphan reference. Fix: thêm `staff_in_charge_email TEXT REFERENCES staff(email)` (nếu staff.email là UNIQUE — cần D-1 trước). |
| D-3 | P2 | `bookings.requester_email` không validate format ở DB level | [`migrations/001:97`](supabase/migrations/001_initial_schema.sql#L97) | Email rác → gửi email fail. Fix: `CHECK (requester_email IS NULL OR requester_email ~* '^[^@]+@[^@]+\.[^@]+$')`. |
| D-4 | P2 | `vehicles.assigned_driver_id` FK không có `ON DELETE` clause → mặc định `NO ACTION` | [`migrations/001:88-89`](supabase/migrations/001_initial_schema.sql#L88) | Xoá driver bị block khi xe còn ref. Fix: `ON DELETE SET NULL`. |
| D-5 | P3 | `drivers.profile_id` FK đến `profiles(id)` nhưng không UNIQUE → 1 profile có thể link 2 driver | [`migrations/001:75-76`](supabase/migrations/001_initial_schema.sql#L75) | Fix: `UNIQUE` hoặc xác nhận intent (1-many?). |
| D-6 | P3 | `system_config` seed có `max_approval_levels` mặc định = 1 trong code (`actions.ts:130`) nhưng `bookings.max_approval_levels` default = 1 ở DB — OK, nhưng spec xe ngoài là 3 — fix logic ở webhook ([`webhooks/google-form/route.ts:60`](src/app/api/webhooks/google-form/route.ts#L60)) đã làm đúng (`isExternal ? 3 : 1`). Tuy nhiên `actions.ts approveBooking` không check edge case `max_approval_levels === 0`. | — | Add `CHECK (max_approval_levels >= 1)` ở DB. |
| D-7 | P3 | `purchase_date`, `inspection_date`, `expiry_date` đều là DATE không TIMESTAMPTZ — OK với business logic (chỉ cần ngày), nhưng cần lưu ý timezone khi sort/filter | [`migrations/001:44,55,67`](supabase/migrations/001_initial_schema.sql#L44) | Acceptable. |
| D-8 | P2 | `system_config` seed hard-code 2 URL n8n webhook (`n8n_webhook_notify`, `n8n_webhook_driver`) + `email_method='n8n'` trong V2 đã bỏ n8n | [`migrations/001:287-289`](supabase/migrations/001_initial_schema.sql#L287) | Add migration `003_remove_n8n_config.sql` xoá 3 row. Đồng thời remove khỏi `settings-client.tsx:24-26,36`. |

### 2.2 Idempotency

| # | Severity | Vấn đề | Vị trí | Fix |
|---|---------|--------|--------|-----|
| I-1 | P2 | Webhook chỉ idempotent khi `body.v1_row` truyền vào. Booking từ dashboard (`source === 'dashboard'`) hoặc Google Form mới (chưa có row v1) → không có dedupe key | [`src/app/api/webhooks/google-form/route.ts:30-41`](src/app/api/webhooks/google-form/route.ts#L30) | Add column `idempotency_key TEXT UNIQUE` lên bookings, bắt client truyền (UUID) trong header `Idempotency-Key`. |
| I-2 | P2 | `assignDriverVehicle` có thể được gọi 2 lần liên tiếp → gửi 2 email phân công cho tài xế (đầu tiên thành `cho_tx_xac_nhan`, lần 2 đè status nhưng vẫn gửi email) | [`src/lib/actions.ts:201-238`](src/lib/actions.ts#L201) | Trước khi `update`, check `if (booking.status === 'cho_tx_xac_nhan' && booking.driver_id === driverId) return { error: 'Đã phân công rồi' }`. |
| I-3 | P3 | `submitEvaluation` đã có `UNIQUE(booking_id, evaluator_email)` — handle duplicate ở DB level, nhưng app trả về `error.message` raw → leak constraint name | [`src/lib/actions.ts:424`](src/lib/actions.ts#L424) | Catch `error.code === '23505'` → trả `{ error: 'Bạn đã đánh giá chuyến này rồi' }`. |

### 2.3 Race conditions

| # | Severity | Vấn đề | Vị trí | Note |
|---|---------|--------|--------|------|
| R-1 | P1 | `approveBooking` không atomic giữa fetch + update — nếu 2 approver cùng bấm duyệt cùng lúc, cả 2 đều thấy `status === expectedStatus[level]` rồi cùng update → có thể tăng `current_approval_level` 2 lần (skip cấp) | [`src/lib/actions.ts:110-144`](src/lib/actions.ts#L110) | Update với guard: `.update(...).eq('id', id).eq('status', expectedStatus[level])` — nếu trả 0 row, refetch và báo "đã có người duyệt". |
| R-2 | P2 | `assignDriverVehicle` cùng lỗ hổng — 2 user assign 2 driver khác nhau cho cùng booking → email 2 driver, 1 driver thực hiện sai | [`src/lib/actions.ts:215-219`](src/lib/actions.ts#L215) | Same fix: `.update(...).eq('id', id).eq('status', 'da_duyet')`. |

---

## 3. BUSINESS LOGIC AUDIT (vs Flow Book Xe + CONTENT_BIBLE + BACKLOG)

### 3.1 Approval workflow — XE NGOÀI (3 cấp) BỊ HỎNG NGẦM

**Spec (CLAUDE.md):**
```
Xe ngoài: Form → Cấp 1 (Trưởng ban TX) → Cấp 2 (Ms Hà) → Cấp 3 (Admin) → Đã duyệt → TX xác nhận
```

**Settings UI** ([`settings-client.tsx:18-20`](src/components/settings/settings-client.tsx#L18)) cho phép cấu hình:
- `approver_l1_email` — Email duyệt cấp 1
- `approver_l2_email` — Email duyệt cấp 2
- `approver_l3_email` — Email duyệt cấp 3

**Code thực tế** ([`actions.ts:99-162 approveBooking`](src/lib/actions.ts#L99)):
- Cấp 1 → 2: chuyển status, **KHÔNG GỬI EMAIL** cho approver_l2_email
- Cấp 2 → 3: chuyển status, **KHÔNG GỬI EMAIL** cho approver_l3_email
- Cấp 3 → da_duyet: gửi email cho `manager_email` (`buildNewBookingEmail` — gọi là "Yêu cầu mới" 🤔)

**Tác động:** Approver cấp 2 & 3 phải tự kiểm dashboard mỗi sáng để biết có booking đợi mình. Toàn bộ flow xe ngoài chậm và dễ quên. `approver_l2_email`/`approver_l3_email` config là dead UI.

**Fix:** Trong `approveBooking`, sau khi update sang trạng thái mới (`cho_duyet_cap2` / `cho_duyet_cap3`), gửi email `[Chờ duyệt cấp 2]` / `[Chờ duyệt cấp 3]` cho approver tương ứng — cần (a) thêm template `buildApprovalRequestEmail(level, data)` mới, (b) đọc config `approver_l${nextLevel}_email`, (c) gửi + log.

**Subject prefix đã có sẵn trong** [`content.ts:27-28`](src/config/content.ts#L27): `'[Chờ duyệt cấp 2]'`, `'[Chờ duyệt cấp 3]'` — nhưng chưa có template tương ứng.

### 3.2 Process bar: 4 bước hay 5 bước?

| Source | Số bước | Tên bước |
|--------|---------|----------|
| **CONTENT_BIBLE §IV** | 4 | Tiếp nhận yêu cầu / Duyệt & Phân bổ / Tài xế xác nhận / Sẵn sàng phục vụ |
| **`content.ts:35-40` (dashboard)** | 4 | TIẾP NHẬN YÊU CẦU / DUYỆT & PHÂN BỔ / TÀI XẾ XÁC NHẬN / SẴN SÀNG PHỤC VỤ |
| **`email-templates.ts:169` (email)** | **5** | Tiếp nhận / Phân bổ / Xác nhận / Phục vụ / **Hoàn thành** |
| **commit c4d80d2** | 5 | "process bar 5 bước theo Flow Book Xe.pdf" |

**Inconsistency:** Email hiện 5 bước (đúng theo Flow Book Xe.pdf gần nhất), Dashboard hiện 4 bước (đúng theo CONTENT_BIBLE), CONTENT_BIBLE chưa update.

**Fix:** Quyết định 1 con số. Nếu giữ 5 (theo PDF mới):
1. Update `content.ts:35-40` thêm step 5 "HOÀN THÀNH".
2. Update CONTENT_BIBLE.md §IV.
3. Update dashboard step UI (cần verify trong dashboard-client/page).

Nếu giữ 4: revert email-templates.ts:169 về 4 step.

### 3.3 Email templates — 3 cái dead

| Template | Defined | Used in production? | Dùng cho |
|----------|---------|---------------------|----------|
| `buildFormInviteEmail` | ✅ | ✅ `send-form-link/route.ts:22` | Gửi form |
| `buildNewBookingEmail` | ✅ | ✅ `actions.ts:154` (chỉ khi đạt da_duyet cuối cùng) | Cấp 1 (chứ thực ra là "đã duyệt") |
| `buildDriverAssignEmail` | ✅ | ✅ `actions.ts:227` | Phân công TX |
| `buildConfirmBookerEmail` | ✅ | ✅ `driver-response:117,124` | TX confirm → người đăng ký + manager |
| `buildConfirmStaffEmail` | ✅ | ❌ **CHỈ /email-preview** | NV phụ trách (đáng lẽ nhận khi TX confirm) |
| `buildConfirmManagerEmail` | ✅ | ❌ **CHỈ /email-preview** | Quản lý "Hoàn tất" |
| `buildDriverRejectEmail` | ✅ | ✅ `driver-response:153` | TX từ chối → manager |
| `buildRejectBookerEmail` | ✅ | ❌ **CHỈ /email-preview** | Không duyệt → người đăng ký (bị thay bởi `buildRejectAllEmail`) |
| `buildCancellationEmail` | ✅ | ✅ `actions.ts:270` | Huỷ → toàn bộ |
| `buildRejectAllEmail` | ✅ | ✅ `actions.ts:191` | Không duyệt → toàn bộ |

**Tác động:** NV phụ trách chuyến xe (`staff_in_charge`) không bao giờ nhận email "lịch xe đã xác nhận" mặc dù CONTENT_BIBLE §V Mẫu 4 quy định rõ và template đã sẵn sàng.

**Fix:** Trong [`driver-response/route.ts:113-127`](src/app/api/driver-response/route.ts#L113) (action='confirm'), sau khi gửi cho requester + manager, lookup `staff_in_charge` email từ `staff` table và gửi `buildConfirmStaffEmail`. Tương tự gửi `buildConfirmManagerEmail` cho `manager_email`.

### 3.4 `collectRecipients` thiếu NV phụ trách

[`src/lib/actions.ts:75-97`](src/lib/actions.ts#L75) chỉ collect: `requesterEmail`, `driverEmail`, `manager_email`. **Thiếu** `staff_in_charge` (NV phụ trách chuyến).

**Tác động:** Khi huỷ chuyến hoặc không duyệt, NV phụ trách không nhận email → đến giờ đi mới biết. Đặc biệt nguy hiểm cho chuyến đón sân bay.

**Fix:** Lookup email của `staff_in_charge` trong staff table và add vào recipients (cần JOIN khi load `getBookingEmailData`).

### 3.5 Conflict detection (calendar-client uncommitted)

[`src/components/booking/calendar-client.tsx:115-121`](src/components/booking/calendar-client.tsx#L115):
```ts
const conflicts = useMemo(() => {
  const set = new Set<string>();
  Object.entries(bookingMap).forEach(([key, bks]) => {
    if (bks.length >= 2) set.add(key);   // ← chỉ đếm số lượng
  });
  return set;
}, [bookingMap]);
```

**Bug:** 1 xe có 2 chuyến cùng ngày 08:00–10:00 và 14:00–16:00 → bị flag "Trùng lịch" (false positive).

**Fix có sẵn:** [`fc/resource-timeline.tsx:74-83`](src/components/booking/fc/resource-timeline.tsx#L74) đã implement đúng `hasTimeOverlap()`. Port function này vào calendar-client.tsx.

### 3.6 Nội dung tiếng Việt — đã rất chuẩn (commit 200aed8 + 09bb03d)

✅ Đã bỏ "QL"/"TX"/"YC" theo commit. Vẫn còn 2 chỗ sót "QL":
- [`src/components/booking/send-form-modal.tsx:133`](src/components/booking/send-form-modal.tsx#L133)
- [`src/components/booking/create-booking-modal.tsx:183`](src/components/booking/create-booking-modal.tsx#L183)

**Fix:** đổi "QL" → "Quản lý".

CONTENT_BIBLE §I cấm emoji trong mọi UI nhưng:
- Calendar client dùng 🚗 ([`calendar-client.tsx:244,482`](src/components/booking/calendar-client.tsx#L244)) — vi phạm
- 🚕 trong fc/resource-timeline ([`fc/resource-timeline.tsx:103,109,194`](src/components/booking/fc/resource-timeline.tsx#L103))

**Quyết định:** Hoặc xoá emoji theo bible, hoặc relax bible cho UI nội bộ (tham khảo CEO).

---

## 4. API CONTRACTS AUDIT

> Đây là kết luận từ subagent — đã verify lại thủ công, đồng tình hoàn toàn.

### 4.1 Critical (P0/P1) — đã liệt kê ở §1.1

### 4.2 Major (P2)

- **Không có Zod / schema validation ở bất kỳ route/action nào.** Toàn bộ `await request.json()` và mọi server-action `data: {...}` đi thẳng vào Supabase. Tác động: type-confusion, oversized payload, lỗi DB lộ tên cột. Fix: thêm `zod` + `safeParse` per handler.
- **Raw Supabase error message trả client**: [`bookings/route.ts:27`](src/app/api/bookings/route.ts#L27), [`driver-response/route.ts:108,146`](src/app/api/driver-response/route.ts#L108), nhiều action `return { error: error.message }`. Lộ tên table/column/RLS hint. Fix: log server, trả `{ error: 'Lỗi hệ thống', traceId: '...' }`.
- **Không rate limit ở route nào.** [`send-form-link/route.ts`](src/app/api/send-form-link/route.ts) loop `sendEmail` qua array `emails` không cap → 1 user authed có thể spam SMTP đến hết quota Office365. Fix: cap `emails.length ≤ 20`, add `@vercel/edge-rate-limit` hoặc Upstash.
- **`/api/bookings` GET không gọi `getUser()` rõ ràng** [`bookings/route.ts:5-31`](src/app/api/bookings/route.ts#L5) — chỉ dựa vào RLS `bookings_read USING (true)` (vốn cho phép mọi authenticated user). Cộng hưởng với P1 RLS. Fix: explicit `const { data: { user } } = await supabase.auth.getUser(); if (!user) return 401;`.
- **Webhook idempotency yếu** (đã nêu D-8 / I-1).
- **`driver-response` trả 200 + "Already processed"** khi state mismatch [`driver-response/route.ts:92-97`](src/app/api/driver-response/route.ts#L92) — phá retry logic. Fix: 409 Conflict.

### 4.3 Minor (P3)

- `auth/callback`: validate `next` whitelist (S-7).
- `bookings/route.ts:24` hard-code `.limit(100)` — add pagination `?limit&offset`.
- CSRF: server actions có built-in origin check của Next.js, nhưng bare API routes không. Add `headers.get('origin')` check trên POST routes.
- `driver-response/route.ts:163`: bare `catch {}` swallow JSON parse error, không log. Fix: `catch (e) { console.error(e); ... }`.
- `middleware.ts:33` `publicPaths` dùng `startsWith` — `/login-fake`, `/driver-response-foo` cũng match. Fix: exact match hoặc trailing-slash check.

---

## 5. FRONTEND AUDIT

> Tổng hợp từ subagent + verify thủ công. **18 finding chính.**

### 5.1 Critical (P0/P1)

- **`fc/calendar-view.tsx` & `fc/resource-timeline.tsx` reference type `BookingRow` chưa định nghĩa** ([`resource-timeline.tsx:74,90,107`](src/components/booking/fc/resource-timeline.tsx#L74), [`calendar-view.tsx:108`](src/components/booking/fc/calendar-view.tsx#L108)). Interface đặt là `ScheduleBooking`. Build sẽ FAIL ngay khi 1 file nào đó import 2 file này. Hiện chưa có ai import → vẫn build được. **(P0 nếu integrate, P1 nếu giữ dead code)**. Fix: rename `BookingRow` → `ScheduleBooking` hoặc add `type BookingRow = ScheduleBooking`.

- **Conflict detection sai (calendar-client.tsx)** — đã nêu §3.5. **(P1)**

- **N+1 sequential write trong `savePostTripAction`** [`dashboard-client.tsx:96-104`](src/components/booking/dashboard-client.tsx#L96): `for (const c of costs) await savePostTripCost(...)`. 5 cost = 5 RTT. Errors swallow bởi `try/catch { /* ignore */ }`. Fix: bulk action `savePostTripCosts(bookingId, costs[])`. **(P1)**

- **Không có `error.tsx` boundary nào.** Bất kỳ throw nào trong server action / render → fallback default. Fix: tối thiểu add `src/app/error.tsx` + `src/app/(dashboard)/error.tsx`. **(P1)**

- **Tailwind class typo: `justify-content-center`** [`calendar-client.tsx:243`](src/components/booking/calendar-client.tsx#L243) — đó là CSS, không phải Tailwind. Lớp đúng: `justify-center`. → emoji 🚗 không center trong tile 40px. **(P1)**

- **`bg-inherit` trên sticky `<td>` không pull row stripe** [`calendar-client.tsx:241`](src/components/booking/calendar-client.tsx#L241), [`resource-timeline.tsx:191`](src/components/booking/fc/resource-timeline.tsx#L191). Sticky cell "detach" khi row hover. Fix: apply `bg-white`/`bg-slate-50` trực tiếp + `group-hover:bg-blue-50/40`. **(P1)**

- **Login dùng password trái doc** — đã nêu S-5. **(P1)**

### 5.2 Major (P2)

- `as any` trong [`calendar/page.tsx:32`](src/app/(dashboard)/calendar/page.tsx#L32) — define `RawBookingRow` type.
- Toàn bộ `staffList` (mọi email staff) ship về client mỗi lần render dashboard ([`dashboard/page.tsx:24,29`](src/app/(dashboard)/dashboard/page.tsx#L24)). Privacy concern: bất kỳ user authed nào view-source là harvest được hết email. Fix: `/api/staff/search?q=` endpoint với auth check.
- `<select>` không có `<label htmlFor>`: [`booking-detail-modal.tsx:142,152`](src/components/booking/booking-detail-modal.tsx#L142), [`create-booking-modal.tsx:204`](src/components/booking/create-booking-modal.tsx#L204), [`drivers-client.tsx:172`](src/components/drivers/drivers-client.tsx#L172). A11y broken.
- **Modal a11y incomplete**: thiếu `role="dialog"`, `aria-modal`, Escape-to-close, focus trap, body scroll lock cho `BookingDetailModal`, `CreateBookingModal`, `SendFormModal`, modal trong `calendar-client.tsx:427`. CHỈ `fc/resource-timeline.tsx:295-301` làm đúng. Fix: enrich `ModalOverlay` ([`animations.tsx:52`](src/components/ui/animations.tsx#L52)).
- **Toast `setTimeout` không tracked** — race khi double-toast: [`dashboard-client.tsx:80`](src/components/booking/dashboard-client.tsx#L80), `drivers-client.tsx:83`, `vehicles-client.tsx:94`, `settings-client.tsx:58`. Fix: `useRef` cho timer + clear on re-toast/unmount.
- `vehicles-client.tsx:56-60` hydration workaround `setTimeout(0)` cho `now` — dấu hiệu mismatch cũ. Fix: compute server-side hoặc lazy `new Date()` trong `isExpiringSoon`.

### 5.3 Minor (P3)

- `STATUS_COLORS` import nhưng không dùng [`calendar-client.tsx:10`](src/components/booking/calendar-client.tsx#L10).
- Avatar initial logic `name.charAt(name.lastIndexOf(' ') + 1)` fail với tên 1 từ → trả `''`. 4 chỗ.
- "QL" còn sót 2 chỗ (đã nêu §3.6).
- Date render raw ISO `YYYY-MM-DD` thay vì `dd/MM/yyyy` — vi phạm CONTENT_BIBLE §X.
- `flex-shrink-0` ↔ `shrink-0` mixed.
- Không dùng `next/image` (chưa có ảnh, OK).

### 5.4 Dead code

- `src/components/booking/fc/calendar-view.tsx` — không file nào import.
- `src/components/booking/fc/resource-timeline.tsx` — không file nào import. CHỨA 2 pattern tốt (time-overlap conflict, modal a11y) đáng port sang `calendar-client.tsx`.
- `SwipeAction` ([`animations.tsx:159`](src/components/ui/animations.tsx#L159)).
- `BookingCardSkeleton`, `StatCardSkeleton` — verify import.
- `notes` field trong `BookingDetail` interface ([`booking-detail-modal.tsx:35`](src/components/booking/booking-detail-modal.tsx#L35)) không render.
- `resend` package trong `package.json:26` — KHÔNG file nào import. **Bỏ khỏi deps để giảm 1 dep + 1 attack surface.**

---

## 6. EMAIL SYSTEM AUDIT (static review only — no SMTP test)

### 6.1 Architecture review

- **Transport**: Nodemailer SMTP Office365, `secure: port === 465` → port 587 ⇒ STARTTLS. **OK**.
- **Connection pooling**: KHÔNG. Mỗi `sendEmail` gọi `createTransport()` mới ([`email.ts:38`](src/lib/email.ts#L38)). Trong serverless Vercel acceptable (function thường idle); nhưng khi `cancelBooking` loop 3-5 recipients → 3-5 transport. Fix: cache module-level transport (sẽ tự reuse trong cùng warm instance).
- **Error handling**: try/catch trả `{ success, error }`. KHÔNG retry. KHÔNG dead-letter queue. Một lần fail → mất luôn (chỉ log vào `email_logs.status='failed'`). **(P2)**: thêm retry với exp backoff (max 3 lần) hoặc Vercel Queue (beta).
- **Logging**: `console.log('[email] SMTP OK')` + `console.error('[email] SMTP error:', err)`. `String(err)` có thể chứa SMTP password trong stack trace của nodemailer (S-1.5 K-4).
- **Rate limit**: KHÔNG. (Đã nêu §4.2)

### 6.2 Templates inventory

| # | Template | Trigger thực tế | Recipient | OK? |
|---|----------|-----------------|-----------|-----|
| 0 | `buildFormInviteEmail` | Settings → Gửi form | NV được mời | ✅ |
| 1 | `buildNewBookingEmail` | `approveBooking` khi đạt `da_duyet` cuối | manager | ⚠️ tên gọi sai context |
| 2 | `buildDriverAssignEmail` | `assignDriverVehicle` | driver assigned | ✅ |
| 3 | `buildConfirmBookerEmail` | `/api/driver-response` confirm | requester + manager | ✅ |
| 4 | `buildConfirmStaffEmail` | ❌ **KHÔNG GỌI** | (NV phụ trách) | 🔴 **dead** |
| 5 | `buildConfirmManagerEmail` | ❌ **KHÔNG GỌI** | (manager) | 🔴 **dead** |
| 6 | `buildDriverRejectEmail` | `/api/driver-response` reject | manager | ✅ |
| 7 | `buildRejectBookerEmail` | ❌ **KHÔNG GỌI** | (replaced bởi `buildRejectAllEmail`) | 🔴 **dead** |
| 8 | `buildCancellationEmail` | `cancelBooking` | requester+driver+manager (thiếu NV phụ trách) | ⚠️ thiếu recipient |
| 9 | `buildRejectAllEmail` | `rejectBooking` | requester+driver+manager (thiếu NV phụ trách) | ⚠️ thiếu recipient |

### 6.3 Issues

| # | Severity | Vấn đề | Vị trí | Fix |
|---|---------|--------|--------|-----|
| E-1 | P1 | 3 templates không bao giờ gửi (đã nêu §3.3) | actions.ts, driver-response | Wire vào `driver-response` confirm (template 4+5). Quyết định template 7. |
| E-2 | P1 | `collectRecipients` thiếu NV phụ trách (§3.4) | [`actions.ts:75`](src/lib/actions.ts#L75) | Lookup email từ staff table. |
| E-3 | P1 | Multi-level approval không gửi email cho approver_l2/l3 (§3.1) | [`actions.ts:99`](src/lib/actions.ts#L99) | Add template + send. |
| E-4 | P2 | Process bar 5 vs 4 bước (§3.2) | [`email-templates.ts:169`](src/lib/email-templates.ts#L169) | Thống nhất. |
| E-5 | P2 | Không retry khi SMTP fail | [`email.ts:53`](src/lib/email.ts#L53) | `p-retry` 3 lần exp backoff. |
| E-6 | P2 | Không pool/cache transport | [`email.ts:18-34`](src/lib/email.ts#L18) | Module-level singleton. |
| E-7 | P2 | `sendEmail` fire trong server action chặn user (đợi hết email mới refresh) | actions.ts cancelBooking, rejectBooking | Move sang `after()` (Next 15 server actions) hoặc Vercel Queue. |
| E-8 | P2 | Không có unsubscribe link / list-unsubscribe header | email-templates.ts baseWrapper | Thêm `List-Unsubscribe` header (mặc dù B2B, nên có). |
| E-9 | P3 | `String(err)` log có thể leak password | [`email.ts:54-55`](src/lib/email.ts#L54) | `console.error('[email] SMTP error:', { code: err.code, response: err.response })`. |
| E-10 | P3 | `esc()` thiếu escape `'` (§1.3 X-1) | [`email-templates.ts:108`](src/lib/email-templates.ts#L108) | Add `.replace(/'/g, '&#39;')`. |
| E-11 | P3 | Footer email cố định "PHÒNG TỔNG HỢP — ESUHAI GROUP" — đúng, nhưng `EMAIL_CONFIG.senderName` lại là "Phòng Tổng Hợp - Esuhai" (hyphen, không em-dash). Inconsistent. | [`constants.ts:65`](src/config/constants.ts#L65) vs [`email-templates.ts:103`](src/lib/email-templates.ts#L103) | Quyết định 1 cách viết. |

### 6.4 Strengths

- Outlook-safe: VML buttons + MSO conditionals + table-based layout.
- `vnGreeting()` xử lý tên VN + giới tính rất tinh tế (handle "Thị" rule đúng).
- Mọi user-input đều `esc()` trước khi nhúng.
- Có `processBar()` shared component.
- `categoryBadge` phân biệt Đối tác/Nội bộ.
- Calendar inline + button → user thêm Google Calendar 1 click.
- Gửi xong log đầy đủ vào `email_logs` với status + error.

---

## 7. DEPLOY / INFRA AUDIT

| # | Severity | Vấn đề | Vị trí | Fix |
|---|---------|--------|--------|-----|
| V-1 | P2 | **Không có `vercel.json` hoặc `vercel.ts`** | repo root | Khuyến nghị tạo `vercel.ts` (chuẩn 2026) — set: `framework: 'nextjs'`, `crons: []`, `headers: [cache-control cho /static]`, function `maxDuration: 30` cho `/api/send-form-link` (gửi nhiều email). |
| V-2 | P2 | **`next.config.ts` rỗng stub** | [`next.config.ts`](next.config.ts) | Add minimum: `experimental: { serverActions: { bodySizeLimit: '2mb' } }`, `images: { remotePatterns: [...] }` nếu sau này render image, security headers (CSP, X-Frame-Options). |
| V-3 | P2 | **README.md là default `create-next-app`** — không có docs project | [`README.md`](README.md) | Viết lại: setup, env vars, deploy steps, link đến CLAUDE.md/CONTENT_BIBLE/BACKLOG. |
| V-4 | P3 | `package.json` có `resend` dep nhưng KHÔNG file nào import | [`package.json:26`](package.json#L26) | `npm uninstall resend`. |
| V-5 | P3 | Node version chưa pin (`engines` field thiếu) | [`package.json`](package.json) | Add `"engines": { "node": ">=20.0.0" }`. Vercel default Node 24 nhưng lock cho local dev. |
| V-6 | P2 | Không có CI/CD config (`.github/workflows/*` chưa thấy) | repo | Add tối thiểu `lint + build` trên PR. Vercel tự deploy preview/prod nhưng không catch type error sớm. |
| V-7 | P3 | `tsconfig.json` `target: "ES2017"` — outdated | [`tsconfig.json:3`](tsconfig.json#L3) | Bump `ES2022` (Node 18+ support tất cả). |
| V-8 | P3 | `AGENTS.md` cảnh báo Next.js mới có breaking changes — agents nên đọc `node_modules/next/dist/docs/` | [`AGENTS.md`](AGENTS.md) | Đảm bảo CI có lint check; manual review cho các file dùng new patterns (Cache Components, Routing Middleware). |
| V-9 | P2 | SMTP credential lưu plaintext trong env vars Vercel | (Vercel dashboard) | Cân nhắc Office365 OAuth thay vì password — SMTP basic auth bị Microsoft khuyến cáo deprecated. |
| V-10 | P3 | Không có Sentry / error monitoring | — | Add `@sentry/nextjs` hoặc Vercel built-in observability. |

### 7.1 Suggested `vercel.ts`

```ts
// vercel.ts (tạo mới)
import { type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  buildCommand: 'next build',
  functions: {
    'src/app/api/send-form-link/route.ts': { maxDuration: 60 },
    'src/app/api/webhooks/google-form/route.ts': { maxDuration: 30 },
  },
  // crons: [], // sau này khi có job nhắc lịch sáng (BACKLOG)
};
```

---

## 8. UNCOMMITTED CHANGES — KẾT LUẬN

3 changes đang pending trên working tree:

### 8.1 `package.json` + `package-lock.json` (+75 lines, +6 deps)
✅ Add 6 `@fullcalendar/*` packages — bắt buộc cho calendar-client.tsx mới (month/list view dùng FullCalendar).

**Đánh giá:** Hợp lý, không thừa. Tổng bundle size tăng ~150KB gzipped (FullCalendar không nhỏ). Trade-off chấp nhận được để có month/list view nhanh.

### 8.2 `src/components/booking/calendar-client.tsx` (+549 lines, full rewrite)
- View toggle (Resource / Month / List) — UX tốt hơn hẳn.
- Resource view custom HTML table (X=ngày, Y=xe).
- Month/List view dùng FullCalendar.
- Modal chi tiết bottom-sheet mobile-friendly.

**Issues phải fix trước khi commit:**
1. **`justify-content-center` Tailwind typo** (line 243) → `justify-center`.
2. **Conflict detection chỉ count ≥2** (lines 115-121) → port `hasTimeOverlap` từ `fc/resource-timeline.tsx:74`.
3. **`STATUS_COLORS` import unused** (line 10) → remove.
4. **`bg-inherit` sticky cell** (line 241) — đổi sang conditional bg.
5. **Modal a11y missing** (line 427) — add role="dialog", aria-modal, Escape, focus trap.
6. **Avatar initial 1-từ-name** (line 472) → handle edge case.
7. **🚗 emoji** (line 244, 482) — vi phạm CONTENT_BIBLE (xem §3.6).

### 8.3 `src/components/booking/fc/` (mới — 2 files chưa track)
- `calendar-view.tsx` (4.9 KB) — wrapper FullCalendar
- `resource-timeline.tsx` (19.2 KB) — table view giống calendar-client nhưng group by **driver** chứ không phải vehicle

**Vấn đề:**
1. **Type `BookingRow` không định nghĩa** → won't compile if imported.
2. **Status keys dùng tiếng Việt full** (`'Chờ duyệt'`) thay vì DB enum (`'cho_duyet'`). Schema không khớp.
3. **Field names khác** (`phongBan`, `taiXe`, `xeNgoai`) — gợi ý code này từ project khác (V1 sheet-based?).
4. KHÔNG file nào import 2 file này → dead code.

**Khuyến nghị:** **KHÔNG commit nguyên file.** Thay vào đó, **port các pattern tốt** sang `calendar-client.tsx`:
- ✅ `hasTimeOverlap()` function
- ✅ Modal a11y (`role="dialog"`, `aria-modal`, Escape handler)
- ✅ Sticky cell bg fix
- ✅ Touch target 44px+
- ✅ Group-by-driver view (nếu cần — feature mới)

Sau đó **xoá folder `fc/`** hoặc rename `_archive/` ra ngoài source tree.

### 8.4 Action plan trước khi commit

```bash
# 1. Fix calendar-client.tsx
#    - justify-content-center → justify-center (line 243)
#    - hasTimeOverlap() port (lines 115-121)
#    - bỏ STATUS_COLORS import (line 10)
#    - bg-inherit fix (line 241)
#    - modal a11y (line 427)

# 2. Quyết định fc/
#    Option A: rm -rf src/components/booking/fc/  (recommend)
#    Option B: rename → port pattern → delete

# 3. Commit
git add package.json package-lock.json src/components/booking/calendar-client.tsx
git commit -m "feat: calendar 3-view (resource/month/list) + FullCalendar"

# 4. Sau đó push + verify build trên Vercel preview
```

---

## 9. STRENGTHS — ghi nhận cái làm tốt

| Mảng | Cái tốt |
|------|---------|
| **Architecture** | Clean RSC/CSR split. Server actions consistent pattern. Service-role không leak ra client (Grep verified). |
| **Database** | Enum đầy đủ, generated column `average_score`, trigger `compute_post_trip_diffs`, indexes phủ 6 cột query nhiều, CASCADE đúng. |
| **TypeScript** | Strict mode, paths alias `@/*`, types/database.ts đầy đủ và sát schema. |
| **i18n** | Tiếng Việt nhất quán (sau commit 200aed8 + 09bb03d). `vnGreeting()` xử lý tên VN cực kỳ tinh tế. |
| **Email design** | Outlook-safe HTML (VML + MSO conditionals), table layout, `processBar`, `categoryBadge`, Google Calendar inline link, escape user input. |
| **UX** | Stagger animation, skeleton loading 6 trang, mobile-first (44px touch, sticky bottom-nav), Suspense wrap `useSearchParams`. |
| **Observability** | `email_logs` log status + error_message — debug được khi fail. |
| **Spec docs** | CONTENT_BIBLE.md cực kỳ chi tiết — hiếm thấy ở project nội bộ. BACKLOG.md cập nhật. |
| **Workflow** | Approval state machine 11 trạng thái rõ ràng. `current_approval_level` track multi-level đúng (chỉ thiếu notify — đã nêu). |

---

## 10. ACTION PLAN — gợi ý ưu tiên

### 🔴 Hôm nay (1-2 giờ) — P0 critical
1. **Fix `submitEvaluation`** — add HMAC token verify hoặc auth check. (S-1)
2. **Replace driver-response token** — HMAC theo booking + expiry. (S-3)
3. **Webhook fail-closed** — `if (!secret) return false`. (S-4)
4. **Fix calendar-client.tsx 5 bug** trước khi commit (§8.2).
5. **Xoá `fc/` folder** hoặc move ra `_archive/`. (§8.3)

### 🟠 Tuần này (8-16 giờ) — P1 high
6. **Role-based authz** — implement `requireRole()` helper, apply mọi action. (S-2)
7. **Wire 3 dead templates** — `buildConfirmStaffEmail`, `buildConfirmManagerEmail`. (E-1)
8. **Multi-level approval emails** — gửi cho approver_l2/l3 khi chuyển cấp. (E-3)
9. **Add `staff_in_charge` vào `collectRecipients`**. (E-2)
10. **RLS hardening migration** — policy chặt theo role. (§1.2)
11. **Add `error.tsx` boundaries** — root + dashboard.
12. **Login decision** — magic-link hoặc cập nhật doc + add rate limit.
13. **Race condition guards** — `.update().eq('status', expected)`. (R-1, R-2)

### 🟡 Tháng này (16-40 giờ) — P2 / cleanup
14. **Zod validation** layer cho mọi route + action.
15. **Rate limiting** — `@vercel/edge-rate-limit` cho auth + send-form-link.
16. **Email retry** — `p-retry` 3 lần exp backoff.
17. **Atomic state transitions** — wrap critical updates in PostgreSQL function/RPC.
18. **Modal a11y fix** — enrich `ModalOverlay`.
19. **Idempotency key** — column UNIQUE + header.
20. **Cleanup**: bỏ `resend` dep, xoá n8n config, viết README, tạo `vercel.ts`, add CI.
21. **Process bar 4 vs 5 bước** — quyết định + sync.

### 🟢 Roadmap (BACKLOG hiện hữu)
- Export Excel/PDF, chart visualization, Gantt lịch trình, time-driven cron jobs (cần `vercel.ts crons`).

---

## 11. PHỤ LỤC — Files referenced in audit

### Source files audited (49)
- `src/app/(auth)/login/page.tsx`
- `src/app/(dashboard)/{dashboard,calendar,drivers,vehicles,reports,settings}/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/api/{auth/callback,bookings,driver-response,send-form-link,webhooks/google-form}/route.ts`
- `src/app/{driver-response,evaluate,email-preview}/page.tsx`
- `src/app/{layout,page}.tsx`
- `src/components/booking/{booking-card,booking-detail-modal,calendar-client,create-booking-modal,dashboard-client,send-form-modal,status-badge}.tsx`
- `src/components/booking/fc/{calendar-view,resource-timeline}.tsx` *(uncommitted)*
- `src/components/{drivers,vehicles,reports,settings}/{drivers,vehicles,reports,settings}-client.tsx`
- `src/components/{layout/dashboard-shell,ui/animations}.tsx`
- `src/components/email/*` (folder không tồn tại — chỉ có `lib/email-templates.ts`)
- `src/config/{constants,content}.ts`
- `src/lib/{actions,email,email-templates}.ts`
- `src/lib/supabase/{admin,client,middleware,server}.ts`
- `src/types/database.ts`

### Config & docs (12)
- `package.json`, `package-lock.json` *(uncommitted)*, `tsconfig.json`, `next.config.ts`
- `.env.example`, `middleware.ts`
- `CLAUDE.md`, `README.md`, `AGENTS.md`
- `docs/{BACKLOG,CONTENT_BIBLE}.md`
- `supabase/migrations/{001_initial_schema,002_add_gender_to_staff}.sql`

### Files NOT audited (out of scope this round)
- `src/components/email/` (chưa thấy folder; có thể chỉ là `email-templates.ts`)
- `scripts/{fill-gender,seed}.ts` (utility scripts, low risk — chỉ dev-time)
- `src/components/ui/animations.tsx` partial (đã grep-verify dead exports)
- `node_modules/`, `.next/`, build artifacts

### Files mentioned but missing
- `Flow Book Xe.pdf` — referenced in commit `c4d80d2` and email-templates.ts:167 nhưng không có trong `docs/` hay repo. **Cần upload vào `docs/` để future audits/devs reference được.**

---

*Audit completed by Claude (Opus 4.7, 1M context) on 2026-04-28. All findings are based on static code analysis of the working tree (committed + uncommitted) and require human verification before remediation. P0 issues should be addressed before next production deploy.*
