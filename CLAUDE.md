# Booking Xe Esuhai V2 — Claude Code Instructions

> **Lưu ý:** Quy ước ngắn gọn cho LLM. Convention chi tiết + workflow Block →
> đọc `.cursorrules`. Onboarding cấp tài khoản → đọc `docs/ONBOARDING.md`.
> Runbook ops → đọc `docs/RUNBOOKS.md`.

## Tech Stack
- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind 4
- **Database:** Supabase PostgreSQL với Row Level Security (`is_current_user_manager()`)
- **Auth:** Supabase `signInWithPassword` — mật khẩu cấp tay qua Supabase Dashboard. KHÔNG dùng Magic Link / OTP (xem `docs/DEEP_AUDIT_REPORT.md` S-5 lý do đổi). Onboarding chi tiết: [docs/ONBOARDING.md](docs/ONBOARDING.md). Cấp/đổi mật khẩu: [docs/RUNBOOKS.md](docs/RUNBOOKS.md) §1–§2.
- **Authorization:** `requireManagerRole()` ở [src/lib/auth.ts](src/lib/auth.ts) — dual-source: env `ALLOWED_MANAGER_EMAILS` (whitelist Vercel) HOẶC `staff.is_manager = TRUE`. Gate cho mọi server action thay đổi state.
- **Email:** Nodemailer SMTP Office365 trực tiếp (`smtp.office365.com:587`, account `booking.xe@esuhai.com`). Không dùng n8n. Package `resend` còn trong dependencies nhưng chưa wire — xoá ở Block U.
- **Token public-page:** HMAC-SHA256 qua `WEBHOOK_SECRET` ở [src/lib/tokens.ts](src/lib/tokens.ts) — driver-response 14 ngày, /evaluate per-booking. Mở rộng cho approval cấp 2+3 ở Block M, eval V3 ở Block N.
- **Deploy:** Vercel (free tier). Cron Vercel via `vercel.json` (Block H).
- **CI:** GitHub Actions `.github/workflows/ci.yml` — lint + tsc + build trên mọi PR.
- **Staff data:** `staff` table (cùng Supabase instance, kế thừa từ V1).

## Project Structure
```
src/
  app/
    (auth)/login/                 — Login page (signInWithPassword)
    (dashboard)/                  — Protected dashboard layout
      dashboard/                  — Stats + filter + booking cards
      calendar/                   — Calendar tuần/tháng (X=ngày, Y=xe)
      drivers/                    — CRUD tài xế
      vehicles/                   — CRUD phương tiện + kiểm định + bảo dưỡng
      reports/                    — Báo cáo + analytics
      settings/                   — Cấu hình hệ thống
    driver-response/              — Public: tài xế xác nhận/từ chối (HMAC token)
    evaluate/                     — Public: đánh giá chuyến đi (HMAC token)
    email-preview/                — Dev-only: render email template
    api/
      auth/callback/              — Supabase OAuth callback
      bookings/                   — Booking CRUD
      driver-response/            — Tài xế action
      webhooks/google-form/       — V1 GAS webhook (fail-CLOSED)
      send-form-link/             — Gửi form đăng ký cho NV
  components/
    layout/                       — Shell, nav, sidebar
    booking/                      — Booking card, form, modal
    ui/                           — Reusable UI
  config/
    constants.ts                  — Status labels, colors, approval config
    content.ts                    — Toàn bộ copy tiếng Việt + subject prefix
  lib/
    supabase/                     — client / server / admin / middleware
    auth.ts                       — requireAuthUserEmail + requireManagerRole
    staff.ts                      — Lookup staff theo email/tên (multi-tier)
    tokens.ts                     — HMAC sign/verify
    actions.ts                    — Server actions: approve/reject/assign/cancel/...
    booking-emails.ts             — getBookingEmailData + notifyApprover + collectRecipients
    email.ts                      — Nodemailer SMTP wrapper
    email-templates.ts            — 11 email templates Outlook-safe
  types/
    database.ts                   — Tất cả TypeScript types
supabase/
  migrations/                     — SQL migration (001 → 003, idempotent)
docs/                             — ROADMAP, ONBOARDING, RUNBOOKS, audit reports, …
```

## Approval Workflow
```
Xe cơ hữu (internal):  Form → Cấp 1 (Trưởng ban TX) → Đã duyệt → TX xác nhận
Xe ngoài (external):   Form → Cấp 1 → Cấp 2 (Ms Hà) → Cấp 3 (Admin) → Đã duyệt → TX xác nhận
```

Email cấp 2+3 hiện gửi qua `notifyApprover()` (booking-emails.ts). Block M sẽ
thêm 2 button HMAC trong email để duyệt từ điện thoại không cần login.

## Environment Variables
Xem `.env.example`. Bắt buộc: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_*`, `WEBHOOK_SECRET`, `ALLOWED_MANAGER_EMAILS`.

## Deploy
```bash
npm run build          # Local build check
vercel                 # Deploy preview
vercel --prod          # Deploy production
```

CI tự chạy lint + tsc + build trên mọi PR (`.github/workflows/ci.yml`). Không merge khi CI fail.
