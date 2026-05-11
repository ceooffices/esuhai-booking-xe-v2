# ROADMAP — Booking Xe V2 + Đánh giá V3

> **Mục đích:** Định vị vị trí hiện tại + lộ trình 6 tuần để hoàn thiện app khớp với spec booking + tài liệu Nhật trình SWABB V2.2 (đánh giá năm nguồn QCD).
>
> **Cập nhật:** 2026-05-12 — Phòng Tổng Hợp
>
> **Sources:** [BACKLOG.md](BACKLOG.md), [DEEP_AUDIT_REPORT.md](DEEP_AUDIT_REPORT.md), [LIVE_AUDIT_REPORT.md](LIVE_AUDIT_REPORT.md), [V1_TO_V2_BACKFILL.md](V1_TO_V2_BACKFILL.md), [NHAT_TRINH_SWABB_PHAM_HONG_KHANH_TB_TAI_XE_V2.2.md](NHAT_TRINH_SWABB_PHAM_HONG_KHANH_TB_TAI_XE_V2.2.md)

---

## 1. Vị trí hiện tại

**Tổng thể:** ~85% — feature gần đủ, security đã vá P0/P1, còn thiếu lớp ops + cutover V1→V2 + module đánh giá V3.

### Đã xong
- Dashboard, calendar 3-view, drivers/vehicles CRUD, reports, settings, form-invite, post-trip, evaluation per trip (~95% spec booking)
- Duyệt đa cấp xe cơ hữu (1 cấp) + xe ngoài (3 cấp), email cho L2/L3
- Flow tài xế: email phân công → CTA xác nhận/từ chối → token HMAC 14d
- 11 email template Outlook-safe + `vnGreeting()` + log đầy đủ
- Webhook GAS V1→V2 sync booking mới + fail-closed khi thiếu secret
- Backfill scripts đầy đủ (idempotent UPSERT)
- 13/15 finding audit đã FIXED (xem mục §10)
- CI/CD GitHub Actions (lint + tsc + build) — commit `18c5f17`

### Còn thiếu (đầy đủ chi tiết trong §3 plan)
- 🔴 Cutover V1→V2 thực tế (script sẵn, chưa chạy `--apply` prod)
- 🔴 Apply migration `003_rls_hardening.sql` lên Supabase prod
- 🔴 Doc drift auth: CLAUDE.md + ONBOARDING.md vẫn ghi "Magic Link" trong khi code đã password
- 🟠 `error.tsx`/`not-found.tsx` boundary
- 🟠 Email retry / Sentry / rate limit / Zod validation
- 🟠 Time-driven jobs (nhắc lịch sáng, auto-complete)
- 🟠 KPI cứng API cho doc V2.2 (Phiếu 4)
- 🟠 4 email-link forms cho V3 (approval cấp 2+3, 360°, CQL Hà, TGĐ ngày)
- 🟡 BACKLOG polish (export Excel, gán xe cố định, modal a11y…)

---

## 2. Mục tiêu cuối (Definition of Done — toàn dự án)

| Tiêu chí | Đo bằng |
|---|---|
| Booking V2 là master duy nhất | V1 sheet `[ARCHIVE]`, chị Hà confirm 7 ngày liên tiếp data khớp |
| Hệ thống tự vận hành 24/7 | Cron nhắc lịch sáng + auto-complete chạy đều, Sentry không spam alert |
| Doc V2.2 đánh giá V3 áp dụng được | Mỗi tháng có dashboard B1 cho a Khanh từ 5 nguồn |
| Email-link pattern hoạt động 4 use case | TGĐ tick từ email ≥ 70% ngày, chị Hà duyệt cấp 2 từ email ≥ 80% lần |
| Vận hành an toàn | RLS hardening apply, all P0/P1 fix, Sentry zero unknown error 1 tuần |

---

## 3. Plan 6 tuần (12/05 → 22/06/2026)

Mỗi Block có DoD rõ. Tick checkbox khi xong. Trễ thì dời sang tuần sau, không bỏ.

### Tuần 1 (12–18/05) — Booking foundation + KPI cứng + Approval email-link

**Deadline cứng:** 15/05 (T6) — doc V2.2 áp dụng. KPI API + approval email-link phải có.

#### Block A — Sync doc & runbook (0.5 ngày)

- [ ] A.1 Sửa `CLAUDE.md`: Auth Magic Link → Password (signInWithPassword)
- [ ] A.2 Viết lại `docs/ONBOARDING.md` §1/§3/§4 theo password flow
- [ ] A.3 Tạo `docs/RUNBOOKS.md` với 4 runbook: cấp password, reset password, gỡ quyền, restore data
- [ ] A.4 Viết lại `README.md` (bỏ boilerplate Next.js)
- [ ] A.5 Cập nhật `BACKLOG.md` — tick P0/P1 đã fix
- [x] A.6 `git add docs/NHAT_TRINH_SWABB_PHAM_HONG_KHANH_TB_TAI_XE_V2.2.md` — **Done in commit `b3a021b` (2026-05-12)**

**DoD:** Onboard 1 user test theo doc mới → vào được dashboard + bấm Duyệt được.

#### Block B — Cutover V1→V2 (2 ngày)

- [ ] B.1 Snapshot Supabase prod (Dashboard → Backups hoặc `pg_dump`)
- [ ] B.2 Apply `supabase/migrations/003_rls_hardening.sql` qua SQL Editor
- [ ] B.3 Verify `SELECT public.is_current_user_manager()` trả TRUE khi login bằng email manager
- [ ] B.4 Export V1 sheet → `v1-export.csv` đặt root project
- [ ] B.5 `npx tsx scripts/import-v1-bulk.ts v1-export.csv` (DRY-RUN) — đọc summary, fix CSV nếu cần
- [ ] B.6 `npx tsx scripts/import-v1-bulk.ts v1-export.csv --apply`
- [ ] B.7 `npx tsx scripts/verify-backfill.ts` — pass tất cả check
- [ ] B.8 Spot-check `/dashboard` 5 booking random so với V1 sheet
- [ ] B.9 Stub `sendEmail()` V1 GAS (theo `docs/V1_TO_V2_BACKFILL.md` §A)
- [ ] B.10 Rename V1 sheet → `[ARCHIVE 2026-05] Booking Xe V1`, protect (chỉ owner edit)
- [ ] B.11 Báo team: "Từ giờ chỉ thao tác trên V2 dashboard"

**DoD:** Chị Hà confirm V2 dashboard khớp 100% operation thực tế trong 48h.

#### Block C — KPI cứng API cho doc V2.2 Phiếu 4 (1.5 ngày)

- [ ] C.1 Migration `004_driver_team.sql`: thêm `drivers.team_lead_email TEXT` (đánh dấu tài xế thuộc đội Khanh)
- [ ] C.2 Endpoint `GET /api/kpi/driver-monthly?driver_email=&month=` — auth `requireManagerRole`
- [ ] C.3 Tính 5 metric tự động (xem §6 phụ lục)
- [ ] C.4 Trang `/kpi/driver-monthly` (admin only) — chọn driver + tháng → bảng + nút "Copy JSON" / "Tải CSV"
- [ ] C.5 Document trong `docs/RUNBOOKS.md`: cách Phòng Tổng vụ paste KPI vào Form 4 Google Sheet hằng tuần

**DoD:** Gọi API trả đúng 5 metric với booking thật của a Khanh tháng 4/2026.

#### Block M — Ứng viên 1: Approval cấp 2+3 xe ngoài email-link (1 ngày)

- [ ] M.1 Mở rộng `src/lib/tokens.ts`: `signApprovalToken(bookingId, level, approverEmail, exp)` + verify
- [ ] M.2 Email template `buildApprovalRequestEmail` (đã có sẵn) — thêm 2 button [Duyệt cấp N] / [Không duyệt cấp N] với HMAC URL
- [ ] M.3 Page mới `/approval-response/page.tsx` (public): query params action/booking_id/level/token → render screen "Anh đang duyệt cấp 2 booking X — xác nhận?" → POST API
- [ ] M.4 API mới `POST /api/approval-response/route.ts`: verify token + check level + atomic update (`.eq('status', expectedStatus).eq('current_approval_level', level)`)
- [ ] M.5 `src/lib/supabase/middleware.ts` — thêm `/approval-response` và `/api/approval-response` vào `publicPaths`
- [ ] M.6 Test E2E: tạo booking xe ngoài → đợi email cấp 2 → bấm link → trang web → confirm → status đổi

**DoD:** Chị Hà bấm Duyệt cấp 2 từ điện thoại không cần login dashboard.

#### Block D — Hỗ trợ Phòng Tổng vụ tạo Google Form (0.5 ngày)

> Scope giảm: chỉ cần 5 Form còn lại (1 tự, 2A TGĐ ngày, 2B Thư ký, 2C Tổng vụ, 2D HCNS, 2E TP dùng xe). Forms 3 (CQL Hà), 5 (360°), 2A nếu Ứng viên 2-4 hoàn thành sẽ retire.

- [ ] D.1 Viết guide "tạo Google Form chuẩn QCD" gửi Phòng Tổng vụ
- [ ] D.2 Hỗ trợ test 1 Form mẫu

#### Block E — Họp bàn giao 6 bên (T2 12/05, 90 phút)

- [ ] E.1 Tham dự cùng Phòng Tổng Hợp (theo doc §9.1)
- [ ] E.2 Chuẩn bị slide tóm tắt nếu được yêu cầu

---

### Tuần 2 (19–25/05) — Ứng viên 4 (360°) + Stability hardening

#### Block N — Schema V3 chung (0.5 ngày)

- [ ] N.1 Migration `005_performance_evaluation_v3.sql` (xem §7 phụ lục)
- [ ] N.2 Mở rộng `src/lib/tokens.ts`: `signEvalToken(role, evaluatorEmail, periodType, periodStart)` + verify
- [ ] N.3 Helper `src/lib/performance.ts`: `getOrCreateEvaluation()`, `submitScores()`, atomic per role/period
- [ ] N.4 Document schema vào `docs/SCHEMA.md`

**DoD:** Migration apply prod thành công, 3 form Ứng viên 2-4 đều dùng được schema này.

#### Block O — Ứng viên 4: Phiếu 360° tháng (1.5 ngày)

- [ ] O.1 Email template `build360EvalEmail(subjectName, evaluatorRole, periodMonth, token)`
- [ ] O.2 Page `/perf-eval/peer-360/page.tsx`: form 5 đầu mục A-E × QCD (15 slider) + 1 textarea + checkbox ẩn danh
- [ ] O.3 API `POST /api/perf-eval/peer-360/route.ts`: verify token + insert evaluation + scores
- [ ] O.4 Middleware: thêm route vào publicPaths
- [ ] O.5 Cron mùng 1 hằng tháng: gửi email cho 10+ recipients (7 TX + Thư ký + Bảo vệ trưởng + 3 phòng ban)
- [ ] O.6 Cron mùng 3: gửi nhắc lần 2 cho ai chưa submit
- [ ] O.7 Trang `/performance/[subject]/peer-360` admin xem tổng hợp tháng

**DoD:** Mùng 1/06 cron tự gửi, ít nhất 7/10 recipient submit trong 3 ngày.

#### Block F — Stability hardening (3 ngày)

- [ ] F.1 `src/app/error.tsx` + `src/app/(dashboard)/error.tsx` — fallback UI tiếng Việt
- [ ] F.2 `src/app/not-found.tsx`
- [ ] F.3 Sentry integration `@sentry/nextjs` free tier — DSN qua env
- [ ] F.4 Email retry `p-retry` 3 lần exp backoff
- [ ] F.5 Move `sendEmail` ra `after()` cho cancelBooking/rejectBooking để response nhanh
- [ ] F.6 Sanitize SMTP error log (chỉ `err.code` + `err.responseCode`)
- [ ] F.7 `/api/bookings` explicit `auth.getUser()` check (không chỉ dựa RLS)
- [ ] F.8 Rate limit `/api/send-form-link` — cap `emails.length ≤ 20`
- [ ] F.9 Verify Supabase login rate limit (Dashboard → Auth → Rate Limits) — document vào RUNBOOKS
- [ ] F.10 Smoke test mobile thật — `/driver-response` + `/approval-response` trên iPhone/Android không có session
- [ ] F.11 Zod validation 4 API: `/api/bookings`, `/api/driver-response`, `/api/approval-response`, `/api/webhooks/google-form`
- [ ] F.12 Webhook idempotency: thêm column `idempotency_key TEXT UNIQUE` + header support

**DoD:** Throw test thấy trên Sentry; SMTP fail giả → retry succeed; payload sai → 400 với error tiếng Việt rõ.

---

### Tuần 3 (26/05–1/06) — Ứng viên 3 (CQL Hà tuần) + Cron jobs

#### Block P — Ứng viên 3: Phiếu CQL Hà + Thư ký tuần (2 ngày)

- [ ] P.1 Email template `buildWeeklyEvalEmail(role, subjectName, weekNumber, token)` — chung cho CQL Hà & Thư ký
- [ ] P.2 Page `/perf-eval/weekly/[role]/page.tsx`: 5 đầu mục × QCD (CQL Hà toàn bộ A-E; Thư ký chỉ A+B) + ghi chú tuần
- [ ] P.3 API `POST /api/perf-eval/weekly/route.ts`: verify token + role check + insert
- [ ] P.4 Cron T6 16:00 hằng tuần: gửi email cho chị Hà + Thư ký TGĐ
- [ ] P.5 Cron CN 18:00: nhắc lần 2 nếu chưa submit
- [ ] P.6 Trang `/performance/[subject]/weekly` admin xem
- [ ] P.7 Sau test thực tế 2 tuần: retire Google Form 3 + 2B

**DoD:** Chị Hà submit liên tiếp 2 tuần qua email-link, dữ liệu vào DB đúng schema.

#### Block H — Time-driven jobs (2 ngày)

- [ ] H.1 Tạo `vercel.json` với 4 cron entries
- [ ] H.2 `/api/cron/morning-reminder` (07:00 T2-T7): query bookings hôm nay `status IN ('cho_tx_xac_nhan', 'tx_da_nhan')` → gửi nhắc tài xế
- [ ] H.3 `/api/cron/auto-complete` (00:30 mỗi ngày): bookings `trip_date < today AND status = 'tx_da_nhan'` → auto `da_hoan_thanh`
- [ ] H.4 `/api/cron/weekly-kpi-report` (T6 16:00): gửi email báo cáo KPI tuần cho Phòng Tổng vụ (auto fill Form 4)
- [ ] H.5 `/api/cron/peer-360-monthly` (mùng 1 + mùng 3) — gọi Block O
- [ ] H.6 `/api/cron/weekly-eval` (T6 16:00 + CN 18:00) — gọi Block P
- [ ] H.7 Bảo vệ tất cả cron route bằng `CRON_SECRET` Vercel header

**DoD:** Sáng 07:00 nhận được email nhắc; chuyến hôm qua chưa hoàn tất auto chuyển `da_hoan_thanh`.

---

### Tuần 4 (2–8/06) — Ứng viên 2 (TGĐ ngày — phức tạp nhất)

#### Block Q — Ứng viên 2: Phiếu TGĐ ngày email-link (3 ngày)

- [ ] Q.1 Quyết định UX: (a) email có 5 hàng "Q: 1★ 2★ 3★ 4★ 5★" mỗi sao = 1 URL riêng → bấm vào page xác nhận; HOẶC (b) email chỉ có link "Mở phiếu chấm hôm nay" → page native picker
- [ ] Q.2 Email template `buildDailyTgdEvalEmail(tripCount, date, token)`
- [ ] Q.3 Token V3 daily: `signEvalToken('receiver_tgd', 'tgd@esuhai.com', 'daily', date)`
- [ ] Q.4 Page `/perf-eval/tgd-daily/page.tsx`: form 3 chiều QCD cho A+B+C + OT hôm nay (giờ + 60K/80K)
- [ ] Q.5 API `POST /api/perf-eval/tgd-daily/route.ts`: insert evaluation + scores + OT session nếu có
- [ ] Q.6 Bảng `ot_sessions` schema (nếu chưa có) — track OT theo phiên, có chữ ký TGĐ
- [ ] Q.7 Cron 20:00 hằng ngày T2-CN: gửi email cho TGĐ với tóm tắt ngày
- [ ] Q.8 Test với TGĐ thật 1 tuần — đo tỷ lệ tick

**DoD:** TGĐ tick ≥ 5/7 ngày liên tiếp 1 tuần, dữ liệu đúng schema.

#### Block I — Email log dashboard (1 ngày)

- [ ] I.1 Trang `/email-logs` admin only — list bảng `email_logs` với filter status, search, pagination
- [ ] I.2 Nút "Retry" cho status='failed'

---

### Tuần 5 (9–14/06) — Dashboard tổng hợp V3 + Polish

#### Block R — Dashboard B1 cuối tháng (2 ngày)

- [ ] R.1 Trang `/performance/[subject]` (admin only) — chọn tháng → bảng 5 đầu mục × 5 nguồn × trọng số → điểm tổng → B1
- [ ] R.2 Bảng quy đổi điểm → B1% theo doc §6.6
- [ ] R.3 Xuất PDF dashboard (cho phê duyệt 4 cấp)
- [ ] R.4 4-cấp duyệt B1 — tái dùng pattern approval booking (Khanh → Tổng vụ → Hà → HCNS → TGĐ)

**DoD:** Cuối tháng 5 (mùng 5/06) chạy được dashboard tổng hợp B1 cho a Khanh từ data thực.

#### Block S — Anti-fraud cảnh báo (1 ngày)

- [ ] S.1 View SQL hoặc query: tính `self_avg - others_avg` mỗi tháng
- [ ] S.2 Nếu > 0.5đ trong 2 tháng liên tiếp → cảnh báo trang admin
- [ ] S.3 Nếu > 0.5đ trong 3 tháng → email tự động cho TGĐ + Phòng HCNS

#### Block J — Backup runbook (0.5 ngày)
- [ ] J.1 Xác định Supabase tier hiện tại (Free/Pro), backup frequency, retention
- [ ] J.2 Document RPO/RTO vào `docs/RUNBOOKS.md`
- [ ] J.3 Script `scripts/export-snapshot.ts` — dump JSON tuần

#### Block K — Smoke test E2E (1 ngày)
- [ ] K.1 `scripts/smoke-test.ts` — chạy được local + trong CI
- [ ] K.2 Steps: webhook → approve cấp 1 → cấp 2 email-link → cấp 3 → assign → driver confirm → post-trip → evaluate

#### Block L — Performance baseline (0.5 ngày)
- [ ] L.1 Lighthouse mobile + desktop cho 6 trang chính
- [ ] L.2 Document vào `docs/PERFORMANCE.md` — target ≥ 80 mobile, ≥ 90 desktop
- [ ] L.3 Bật Vercel Analytics free tier

---

### Tuần 6 (15–22/06) — Rà soát V2.2 + BACKLOG polish

#### Block T — Họp rà soát 4 tuần V2.2 (15/06, theo doc §9.5)

- [ ] T.1 Chuẩn bị báo cáo data: số form đã submit / kế hoạch, tỷ lệ tick TGĐ, anti-fraud có alert nào
- [ ] T.2 Tham dự họp 60 phút với 6 bên
- [ ] T.3 Ghi nhận feedback vào `docs/V2.2_FEEDBACK.md`
- [ ] T.4 Quyết định retire Google Form nào, giữ Google Form nào

#### Block U — BACKLOG polish (chọn lọc theo ưu tiên)

- [ ] U.1 Export báo cáo Excel (1 ngày)
- [ ] U.2 Gán xe cố định cho tài xế 1-1 (1 ngày)
- [ ] U.3 Form thêm kiểm định + bảo dưỡng trực tiếp `/vehicles` (1 ngày)
- [ ] U.4 Process bar 4 vs 5 bước — sync 3 nơi (1 giờ)
- [ ] U.5 Modal a11y polish — role="dialog", focus trap (0.5 ngày)
- [ ] U.6 Chart visualization /reports (1 ngày, optional)
- [ ] U.7 CSP report-only header (1 ngày + 1 tuần observe)

---

## 4. Ước lượng tổng

| Mốc | Hoàn thành | Trạng thái sản phẩm |
|---|:---:|---|
| Hết tuần 1 (18/05) | Block A+B+C+M+D | **Booking V2 live thật; V3 áp dụng được qua KPI API + Google Form + approval email-link** |
| Hết tuần 2 (25/05) | + Block N+O+F | **Booking V2 production-grade; 360° via app** |
| Hết tuần 3 (1/06) | + Block P+H | **Tự vận hành 24/7; CQL Hà tuần via app** |
| Hết tuần 4 (8/06) | + Block Q+I | **Phiếu TGĐ ngày via email-link; email log dashboard** |
| Hết tuần 5 (14/06) | + Block R+S+J+K+L | **Dashboard B1 cuối tháng + anti-fraud + backup runbook** |
| Hết tuần 6 (22/06) | + Block T+U | **Sản phẩm hoàn chỉnh feature theo BACKLOG + spec V2.2** |

---

## 5. Long-term ops (sau tuần 6)

| Cadence | Việc |
|---|---|
| Hàng tuần | Check Sentry events, review email_logs failed, KPI tuần T6 16:00 |
| Hàng tháng | Update danh sách manager (RUNBOOKS §7), prune email_logs > 90 ngày, dashboard B1 mùng 5 |
| Hàng quý | Lighthouse audit, bundle size, deps update, rà soát V2.2 chính thức (10/2026 nâng B1) |
| Hàng năm | Backup test (thử restore vào staging), security audit P0/P1 |

---

## 6. Phụ lục — KPI cứng API spec (Block C)

### Endpoint
```
GET /api/kpi/driver-monthly?driver_email=khanh@esuhai.com&month=2026-05
Auth: requireManagerRole()
```

### Response schema
```json
{
  "driver": { "email": "...", "name": "Phạm Hồng Khanh" },
  "period": { "month": "2026-05", "from": "2026-05-01", "to": "2026-05-31" },
  "metrics": {
    "late_pickup_count": { "value": 2, "target": 0, "score": 4, "category": "A" },
    "on_time_rate_pct": { "value": 96.5, "target": 95, "score": 5, "category": "D" },
    "maintenance_on_time_pct": { "value": 100, "target": 95, "score": 5, "category": "D" },
    "fleet_cost_vs_prev_month_pct": { "value": -3.2, "target": 0, "score": 5, "category": "D" },
    "team_avg_kpi": { "value": null, "target": 8, "score": null, "category": "E", "note": "Chờ module evaluate 7 tài xế (Block O mở rộng)" }
  },
  "computed_at": "2026-05-12T..."
}
```

### Mapping logic
- `late_pickup_count`: `COUNT(post_trips WHERE departure_diff_minutes > 5 AND driver IN team)` — score: 5 nếu 0, giảm 1 mỗi 1 lần trễ. **Sign convention:** `departure_diff_minutes = actual_departure - expected_pickup_time` (xem trigger `compute_post_trip_diffs` trong `migrations/001_initial_schema.sql`). Dương → đến muộn (trễ); Âm → đến sớm.
- `on_time_rate_pct`: `COUNT(post_trips WHERE departure_diff_minutes BETWEEN -5 AND 5) / total × 100` — score theo bảng QCD doc §6.6. Window ±5 phút quanh giờ dự kiến = đúng giờ.
- `maintenance_on_time_pct`: `COUNT(vehicles WHERE next_maintenance_date >= today) / total × 100`
- `fleet_cost_vs_prev_month_pct`: `(SUM_this - SUM_prev) / SUM_prev × 100` từ `post_trip_costs`
- `team_avg_kpi`: NULL cho đến khi mở rộng evaluate cho 7 tài xế

### Metric ngoài tầm app (Phòng Tổng vụ điền tay vào Form 4)
- Số sự cố giao thông (A) — police/internal report
- Số kiểm xe đầu ngày bỏ sót (A) — sổ bàn giao
- Số việc hỗ trợ gia đình TGĐ kịp thời (B) — log Zalo
- Phản hồi điện thoại OT trong 1 phút (C) — call log
- Số buổi đào tạo trong tháng (E) — lịch HCNS
- Phần trăm tài xế nắm kiến thức (E) — bài kiểm tra

---

## 7. Phụ lục — Schema V3 chung (Block N)

Migration `supabase/migrations/005_performance_evaluation_v3.sql`:

```sql
-- 9 nguồn chấm theo doc §6.2
CREATE TYPE evaluation_source AS ENUM (
  'self',
  'receiver_tgd',
  'receiver_secretary',
  'receiver_general',
  'receiver_hr',
  'receiver_department',
  'manager_ha',
  'hard_kpi',
  'peer_360'
);

CREATE TYPE evaluation_category AS ENUM ('A','B','C','D','E');
CREATE TYPE evaluation_period AS ENUM ('daily','weekly','monthly');

CREATE TABLE performance_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_email TEXT NOT NULL,
  evaluator_email TEXT NOT NULL,
  evaluator_role evaluation_source NOT NULL,
  period_type evaluation_period NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  token_jti TEXT,
  UNIQUE(subject_email, evaluator_email, evaluator_role, period_start, period_type)
);

CREATE TABLE performance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID REFERENCES performance_evaluations(id) ON DELETE CASCADE,
  category evaluation_category NOT NULL,
  q_score SMALLINT CHECK (q_score BETWEEN 1 AND 5),
  c_score SMALLINT CHECK (c_score BETWEEN 1 AND 5),
  d_score SMALLINT CHECK (d_score BETWEEN 1 AND 5),
  avg_score NUMERIC(3,2) GENERATED ALWAYS AS
    ((q_score + c_score + d_score)::NUMERIC / 3) STORED,
  UNIQUE(evaluation_id, category)
);

CREATE TABLE ot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_email TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_hours NUMERIC(4,2) NOT NULL,
  rate_type TEXT CHECK (rate_type IN ('weekday_60k','sunday_80k')),
  description TEXT,
  approved_by_tgd BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho query dashboard
CREATE INDEX idx_perf_eval_subject_period ON performance_evaluations(subject_email, period_start, period_type);
CREATE INDEX idx_ot_sessions_driver_date ON ot_sessions(driver_email, date);

-- RLS: read all manager, write chỉ qua admin client (server actions)
ALTER TABLE performance_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perf_eval_read_manager" ON performance_evaluations FOR SELECT
  TO authenticated USING (public.is_current_user_manager());
CREATE POLICY "perf_scores_read_manager" ON performance_scores FOR SELECT
  TO authenticated USING (public.is_current_user_manager());
CREATE POLICY "ot_sessions_read_manager" ON ot_sessions FOR SELECT
  TO authenticated USING (public.is_current_user_manager());
```

---

## 8. Phụ lục — Email-link pattern (template cho 4 ứng viên)

Pattern chung cho tất cả email-link forms:

```
1. Email gửi đi với HMAC URL: /<route>?token=<jwt>&...params
2. Page public (trong middleware publicPaths) render preview + form
3. POST API verify token + insert/update atomic
4. Response page: thông báo thành công + link (optional) mở dashboard
```

### Token format (mở rộng src/lib/tokens.ts)
```typescript
export function signEvalToken(
  role: EvaluationSource,
  evaluatorEmail: string,
  periodType: EvaluationPeriod,
  periodStart: string,
  expiresInDays: number
): string {
  // HMAC-SHA256(WEBHOOK_SECRET, role + evaluatorEmail + periodType + periodStart + exp)
}

export function verifyEvalToken(token: string): EvalTokenPayload | null {
  // Return payload nếu valid, null nếu invalid/expired
}
```

### Cấu trúc URL chuẩn
```
/perf-eval/peer-360?evaluator=tx2@esuhai.com&period=2026-05&token=...
/perf-eval/weekly/manager-ha?evaluator=ha@esuhai.com&week=2026-W20&token=...
/perf-eval/tgd-daily?evaluator=tgd@esuhai.com&date=2026-05-12&token=...
/approval-response?action=approve&level=2&booking_id=...&token=...
```

---

## 9. Phụ lục — Files thay đổi dự kiến

### Mới
```
docs/RUNBOOKS.md
docs/SCHEMA.md
docs/PERFORMANCE.md
docs/V2.2_FEEDBACK.md
vercel.json
src/app/error.tsx
src/app/not-found.tsx
src/app/(dashboard)/error.tsx
src/app/approval-response/page.tsx
src/app/api/approval-response/route.ts
src/app/api/kpi/driver-monthly/route.ts
src/app/(dashboard)/kpi/driver-monthly/page.tsx
src/app/perf-eval/peer-360/page.tsx
src/app/perf-eval/weekly/[role]/page.tsx
src/app/perf-eval/tgd-daily/page.tsx
src/app/api/perf-eval/peer-360/route.ts
src/app/api/perf-eval/weekly/route.ts
src/app/api/perf-eval/tgd-daily/route.ts
src/app/(dashboard)/performance/[subject]/page.tsx
src/app/(dashboard)/performance/[subject]/peer-360/page.tsx
src/app/(dashboard)/email-logs/page.tsx
src/app/api/cron/morning-reminder/route.ts
src/app/api/cron/auto-complete/route.ts
src/app/api/cron/weekly-kpi-report/route.ts
src/app/api/cron/peer-360-monthly/route.ts
src/app/api/cron/weekly-eval/route.ts
src/app/api/cron/tgd-daily-eval/route.ts
src/lib/performance.ts
supabase/migrations/004_driver_team.sql
supabase/migrations/005_performance_evaluation_v3.sql
scripts/export-snapshot.ts
scripts/smoke-test.ts
.github/workflows/ci.yml (đã có từ commit 18c5f17)
```

### Sửa
```
CLAUDE.md (auth password)
README.md (bỏ boilerplate)
docs/ONBOARDING.md (password flow)
docs/BACKLOG.md (tick P0/P1 fixed)
src/lib/tokens.ts (mở rộng signApprovalToken + signEvalToken)
src/lib/email.ts (retry p-retry)
src/lib/email-templates.ts (buildApprovalRequestEmail mở rộng + 4 template mới)
src/lib/supabase/middleware.ts (publicPaths thêm /perf-eval/* /approval-response)
src/app/api/bookings/route.ts (explicit auth.getUser + Zod)
src/app/api/send-form-link/route.ts (rate limit)
src/app/api/webhooks/google-form/route.ts (Zod + idempotency_key)
src/app/api/driver-response/route.ts (Zod)
src/lib/actions.ts (after() cho sendEmail)
```

---

## 10. Phụ lục — Trạng thái audit (đối chiếu cuối kỳ)

Từ [DEEP_AUDIT_REPORT.md](DEEP_AUDIT_REPORT.md) — 13/15 finding đã FIXED:

| # | Finding | Status | Ghi chú |
|---|---|:---:|---|
| P0-1 | `/evaluate` HMAC | ✅ | `tokens.ts` + `actions.ts:499` |
| P0-2 | `requireManagerRole` | ✅ | `auth.ts:50` dual-source |
| P0-3 | Driver token HMAC + expiry | ✅ | `tokens.ts:91`, legacy fallback 13/05/2026 |
| P0-4 | Webhook fail-closed | ✅ | `webhooks/google-form:9` |
| P1-5 | RLS hardening migration | ⚠️ | File có, **chưa apply prod** (Block B.2) |
| P1-6 | Multi-level email L2/L3 | ✅ | `booking-emails.ts:82` |
| P1-7 | Dead email templates | ✅ | wired đầy đủ |
| P1-8 | `collectRecipients` NV phụ trách | ✅ | `booking-emails.ts:175` |
| P1-9 | Login rate limit | ⚠️ | Supabase server-side default, chưa verify (Block F.9) |
| P1-10 | Race guard | ✅ | atomic `.eq` |
| P1-11 | `error.tsx` boundary | ❌ | **Block F.1** |
| P2-12 | `hasTimeOverlap` calendar | ✅ | `calendar-client.tsx:113` |
| P2-13 | Dead `fc/` folder | ✅ | đã xoá |
| P2-14 | `resend` dep | ⚠️ | Vẫn còn — verify có dùng không, nếu không thì remove (Block U sau) |
| P2-15 | Webhook idempotency | ⚠️ | Basic `v1_row` check, chưa key UNIQUE (Block F.12) |

---

## 11. Cách dùng tracking doc này

- ✅ Mỗi Block xong → tick checkbox + commit message reference `[Block X.N]`
- ⚠️ Trễ → dời sang tuần sau, không bỏ; document lý do
- ❌ Bỏ → cần lý do rõ + alternative
- 📝 Update doc này mỗi T6 cuối tuần với progress thực tế
- 🔄 Rà soát toàn diện 15/06 (theo doc V2.2 §9.5)

---

*Phòng Tổng Hợp — Esuhai Group | Tracking living document*
