# BACKLOG — Booking Xe V2

> **Cập nhật:** 2026-05-12 | ~20+ commits | ~9,500 dòng code | ~85% feature complete
>
> **Trạng thái cuối kỳ:** 13/15 audit finding (DEEP_AUDIT) đã FIXED. Chi tiết bảng dưới + đối chiếu trong [ROADMAP.md §10](ROADMAP.md#10-phụ-lục--trạng-thái-audit-đối-chiếu-cuối-kỳ).
>
> **Source:** [DEEP_AUDIT_REPORT.md](DEEP_AUDIT_REPORT.md) + [LIVE_AUDIT_REPORT.md](LIVE_AUDIT_REPORT.md) + commit history.

---

## Đã hoàn thành (~95% spec booking)

### Core features

- [x] Dashboard: stats, filter, booking cards, chi tiết, duyệt/phân công/hoàn thành/huỷ
- [x] Duyệt đa cấp: 1 cấp (xe cơ hữu) / 3 cấp (xe ngoài) — email cấp 2/3 đã wired (P1-6 fixed)
- [x] Không duyệt + Huỷ chuyến: bắt buộc lý do + email toàn bộ thành viên
- [x] Phân công Tài xế & Xe + email tài xế (CTA xác nhận/từ chối qua HMAC token 14 ngày)
- [x] Tài xế xác nhận / từ chối qua link email
- [x] Cập nhật sau chuyến đi: giờ thực tế + chi phí phát sinh (8 loại)
- [x] Đánh giá chuyến đi: 5 sao, 4 tiêu chí, góp ý (`/evaluate`) — HMAC token bảo vệ (P0-1 fixed)
- [x] Calendar tuần/tháng + conflict detection (highlight đỏ) — `hasTimeOverlap()` thực (P2-12 fixed)
- [x] Quản lý Tài xế: CRUD + bằng lái + loại xe + khả năng đáp ứng
- [x] Quản lý Phương tiện: CRUD + kiểm định + bảo dưỡng + disable
- [x] Báo cáo: filter tuần/tháng/quý/năm, 8 thống kê, phân tích theo BP/TX/chi phí
- [x] Cấu hình hệ thống: UI quản lý config
- [x] Gửi form đăng ký cho nhân viên (tiện ích nhỏ gọn)
- [x] GAS webhook V1→V2 (sync booking realtime) — fail-CLOSED khi thiếu secret (P0-4 fixed)
- [x] Email templates V2: cấu trúc 3 khối + Add to Calendar + quy định chờ xe
- [x] Framer Motion: stagger, modal slide-up, count-up, toast animation
- [x] Skeleton loading cho 6 trang
- [x] Mobile-optimized: SF Pro font, 44px touch, safe area, active feedback

### Security & integrity (audit P0/P1 đã fix — chi tiết §10 ROADMAP)

- [x] **P0-1** `/evaluate` HMAC — `src/lib/tokens.ts` + `actions.ts:499` (không còn spoof identity)
- [x] **P0-2** `requireManagerRole()` — `src/lib/auth.ts:50` dual-source (env whitelist + `staff.is_manager`)
- [x] **P0-3** Driver token HMAC + expiry — `tokens.ts:91`, legacy fallback đến 13/05/2026
- [x] **P0-4** Webhook fail-CLOSED khi thiếu `WEBHOOK_SECRET` — `webhooks/google-form:9`
- [x] **P1-6** Multi-level email L2/L3 — `booking-emails.ts:82` đã gửi đúng cấp
- [x] **P1-7** Dead email templates đã được wire — 11/11 template active
- [x] **P1-8** `collectRecipients()` thêm NV phụ trách chuyến — `booking-emails.ts:175`
- [x] **P1-10** Race guard atomic — `.update().eq('status', expected)` trên approve/assign
- [x] **P2-12** `hasTimeOverlap()` calendar thực — `calendar-client.tsx:113`
- [x] **P2-13** Dead `fc/` folder — đã xoá
- [x] **S-5 / S-8** Login dùng `signInWithPassword` (không Magic Link) — `src/app/(auth)/login/page.tsx`; doc đã sync ở Block A (PR này)
- [x] CI/CD GitHub Actions (lint + tsc + build) — commit `18c5f17`
- [x] Migration `003_rls_hardening.sql` — file đã có (chưa apply prod — Block B.2)

---

## Còn lại (~5% feature + ops)

### Cutover V1 → V2 (Block B — Tuần 1)

- [ ] Snapshot Supabase prod trước cutover
- [ ] **Apply migration `003_rls_hardening.sql` qua SQL Editor** (P1-5 — file có, chưa apply)
- [ ] Verify `is_current_user_manager()` trả TRUE đúng email
- [ ] Export V1 sheet → backfill V2 (`scripts/import-v1-bulk.ts --apply`)
- [ ] `scripts/verify-backfill.ts` pass all check
- [ ] Stub `sendEmail()` V1 GAS (theo `docs/V1_TO_V2_BACKFILL.md` §A)
- [ ] Rename V1 sheet thành `[ARCHIVE 2026-05] Booking Xe V1`, protect
- [ ] Chị Hà confirm V2 khớp 100% operation trong 48h

### Module Đánh giá V3 (Block C, N, O, P, Q, R, S — Tuần 1-5)

- [ ] **C.** KPI cứng API cho doc V2.2 Phiếu 4 (5 metric tự động)
- [ ] **N.** Schema V3 chung (`005_performance_evaluation_v3.sql`)
- [ ] **O.** Ứng viên 4: Phiếu 360° tháng (email-link)
- [ ] **P.** Ứng viên 3: Phiếu CQL Hà + Thư ký tuần (email-link)
- [ ] **Q.** Ứng viên 2: Phiếu TGĐ ngày (email-link — phức tạp nhất)
- [ ] **R.** Dashboard B1 cuối tháng tổng hợp 5 nguồn
- [ ] **S.** Anti-fraud cảnh báo (self vs others gap)

### Approval cấp 2+3 email-link (Block M — Tuần 1)

- [ ] **M.** Ứng viên 1: Chị Hà / Admin duyệt cấp 2+3 từ điện thoại không cần login dashboard

### Stability hardening (Block F — Tuần 2)

- [ ] **F.1-F.2** `error.tsx` + `not-found.tsx` (P1-11 — chưa làm)
- [ ] **F.3** Sentry integration `@sentry/nextjs` free tier
- [ ] **F.4** Email retry `p-retry` 3 lần exp backoff
- [ ] **F.5** Move `sendEmail` ra `after()` cho cancelBooking/rejectBooking
- [ ] **F.6** Sanitize SMTP error log (K-4 audit)
- [ ] **F.7** `/api/bookings` explicit `auth.getUser()` check
- [ ] **F.8** Rate limit `/api/send-form-link` (cap 20 emails)
- [ ] **F.9** Verify Supabase login rate limit (P1-9 — chưa verify)
- [ ] **F.10** Smoke test mobile thật (`/driver-response` + `/approval-response`)
- [ ] **F.11** Zod validation 4 API
- [ ] **F.12** Webhook idempotency (`idempotency_key TEXT UNIQUE`) — P2-15

### Time-driven jobs (Block H — Tuần 3)

- [ ] `vercel.json` + 4 cron entries
- [ ] `/api/cron/morning-reminder` (07:00 T2-T7)
- [ ] `/api/cron/auto-complete` (00:30 hằng ngày)
- [ ] `/api/cron/weekly-kpi-report` (T6 16:00)
- [ ] `/api/cron/peer-360-monthly` (mùng 1 + mùng 3)
- [ ] `/api/cron/weekly-eval` (T6 16:00 + CN 18:00)
- [ ] `CRON_SECRET` Vercel header bảo vệ

### Email log + Performance (Block I, L — Tuần 4-5)

- [ ] `/email-logs` admin dashboard + retry button
- [ ] Lighthouse mobile + desktop 6 trang chính ≥ 80 mobile, 90 desktop
- [ ] Vercel Analytics free tier
- [ ] `docs/PERFORMANCE.md`

### Backup + smoke test (Block J, K — Tuần 5)

- [ ] Document RPO/RTO vào `docs/RUNBOOKS.md` §4 (placeholder hiện tại)
- [ ] `scripts/export-snapshot.ts` — dump JSON tuần
- [ ] `scripts/smoke-test.ts` — chạy local + CI E2E

### BACKLOG polish (Block U — Tuần 6, chọn lọc)

- [ ] Export báo cáo Excel/PDF
- [ ] Chart visualization (pie/line chart)
- [ ] Gantt-style lịch trình theo ngày
- [ ] Form thêm kiểm định xe trực tiếp dashboard
- [ ] Form thêm bảo dưỡng/sửa chữa xe
- [ ] Gán xe cố định cho tài xế (1 xe 1 TX)
- [ ] Process bar 4 vs 5 bước — sync 3 nơi (CONTENT_BIBLE conflict)
- [ ] Modal a11y polish — `role="dialog"`, focus trap
- [ ] Remove `resend` dep nếu thực sự không dùng (P2-14)
- [ ] CSP report-only header
- [ ] UI tự đổi mật khẩu (`/account/password`) — RUNBOOKS §2.2

---

## Audit finding chưa fix (track riêng)

| # | Finding | Severity | Status | Block xử lý |
|---|---|---|---|---|
| P1-5 | RLS hardening apply prod | ⚠️ | File có, chưa apply | **B.2** |
| P1-9 | Login rate limit verify | ⚠️ | Default OK, chưa verify số | **F.9** + `RUNBOOKS §6` |
| P1-11 | `error.tsx` boundary | ❌ | Chưa làm | **F.1** |
| P2-14 | `resend` dep dư thừa | ⚠️ | Verify có dùng không | **U** sau |
| P2-15 | Webhook idempotency | ⚠️ | Basic check, chưa key UNIQUE | **F.12** |

---

## Kế hoạch tổng

Xem [docs/ROADMAP.md §3](ROADMAP.md#3-plan-6-tuần-1205--22062026) cho plan 6 tuần chi tiết (21 Block A-U).

---

*Phòng Tổng Hợp — Esuhai Group | Update sau mỗi Block xong*
