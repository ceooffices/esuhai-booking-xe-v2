# Booking Xe Esuhai V2

> Hệ thống quản lý booking xe nội bộ Esuhai Group — kế thừa V1 (Google Sheet + GAS), tái thiết kế trên Next.js + Supabase + email Office365 trực tiếp.

**Status:** Production (~85% feature complete). Đang cutover V1 → V2 + xây module Đánh giá V3 theo doc V2.2 SWABB. Plan 6 tuần: [docs/ROADMAP.md](docs/ROADMAP.md).

---

## Tổng quan

| Lớp | Tech | Note |
|---|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind 4 | SSR + RSC + Client Component khi cần interaction |
| Database | Supabase PostgreSQL + RLS hardening (`is_current_user_manager()`) | Migration `001-003` ở `supabase/migrations/` |
| Auth | Supabase `signInWithPassword` (Email + Password) | Magic Link đã bị thay — lý do ở [docs/DEEP_AUDIT_REPORT.md](docs/DEEP_AUDIT_REPORT.md) §1.1 S-5 |
| Authz | `requireManagerRole()` dual-source (env whitelist + `staff.is_manager`) | Gate cho mọi server action thay đổi state |
| Email | Nodemailer SMTP Office365 trực tiếp + 11 template Outlook-safe | Account `booking.xe@esuhai.com` |
| Token public-page | HMAC-SHA256 qua `WEBHOOK_SECRET` | driver-response 14d, /evaluate per-booking |
| Deploy | Vercel free tier + GitHub Actions CI (lint + tsc + build) | Cron via `vercel.json` (Block H) |

---

## Cấu trúc thư mục

```
src/
  app/
    (auth)/login/                — Login page
    (dashboard)/                 — Protected dashboard
      dashboard/calendar/drivers/vehicles/reports/settings/
    driver-response/             — Public: tài xế xác nhận/từ chối
    evaluate/                    — Public: đánh giá chuyến đi
    email-preview/               — Dev: render email template
    api/
      auth/callback/             — Supabase OAuth callback
      bookings/                  — Booking CRUD
      driver-response/           — Tài xế action
      webhooks/google-form/      — V1 GAS webhook (fail-CLOSED)
      send-form-link/            — Gửi form đăng ký
  components/                    — UI (booking, layout, ui shared)
  config/                        — constants.ts + content.ts (copy tiếng Việt)
  lib/
    supabase/                    — client / server / admin / middleware
    auth.ts                      — requireAuthUserEmail + requireManagerRole
    tokens.ts                    — HMAC sign/verify
    actions.ts                   — Server actions
    booking-emails.ts            — getEmailData + notifyApprover + collectRecipients
    email.ts + email-templates.ts
supabase/migrations/             — SQL idempotent
scripts/                         — V1 backfill, seed
docs/                            — ROADMAP, ONBOARDING, RUNBOOKS, audit reports
```

Chi tiết kiến trúc auth: [docs/ONBOARDING.md](docs/ONBOARDING.md). Workflow ops: [docs/RUNBOOKS.md](docs/RUNBOOKS.md).

---

## Approval Workflow

```
Xe cơ hữu (internal):
  Form → Cấp 1 (Trưởng ban TX) → Đã duyệt → TX xác nhận → Hoàn thành

Xe ngoài (external):
  Form → Cấp 1 → Cấp 2 (Ms Hà) → Cấp 3 (Admin) → Đã duyệt → TX xác nhận → Hoàn thành
```

11 trạng thái booking (`booking_status` enum) + 11 email template theo flow. Block M sẽ thêm 2 button HMAC trong email để duyệt cấp 2+3 từ điện thoại không cần login.

---

## Setup local

### 1. Yêu cầu
- Node.js 20+ (Next.js 16 đòi 20.18.1+)
- npm (lock file dùng npm, không pnpm/yarn)
- Tài khoản Supabase project (xin PM cấp `.env.local`)

### 2. Cài

```bash
npm install
cp .env.example .env.local
# Điền các giá trị thật theo hướng dẫn PM
```

Env bắt buộc (xem `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_HOST=smtp.office365.com`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`
- `WEBHOOK_SECRET` (random ≥ 32 ký tự)
- `NEXT_PUBLIC_APP_URL` (`http://localhost:3000` cho dev)
- `ALLOWED_MANAGER_EMAILS` (lowercase, comma-separated)

### 3. Chạy

```bash
npm run dev        # http://localhost:3000
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript check
npm run build      # Production build (cũng là smoke test)
```

### 4. Login lần đầu

App không có signup tự phục vụ. Phải có admin cấp tài khoản theo [docs/RUNBOOKS.md](docs/RUNBOOKS.md) §1.

---

## Deploy

CI/CD qua Vercel + GitHub Actions:

```bash
git push origin feat/<block-id>-<short-desc>    # Tự tạo Preview deploy
vercel --prod                                     # Manual prod deploy (rare)
```

Mọi PR trigger:
1. **GitHub Actions** (`.github/workflows/ci.yml`): lint + tsc + build
2. **Vercel Preview**: deploy preview URL trong PR comment
3. **QC** (Claude CLI tool, riêng): review code theo `docs/QC_CHECKLIST.md`
4. **Merge** chỉ khi tất cả pass + PM approve

KHÔNG `git push --force` lên master / shared branch.

---

## Tài liệu

Đọc theo thứ tự khi onboard:

| File | Mục đích |
|---|---|
| [.cursorrules](.cursorrules) | Cursor (LLM) rules — workflow 1 Block = 1 PR, security baseline, conventions |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Plan 6 tuần (12/05 → 22/06/2026), 21 Block A-U, DoD từng Block |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | Mời thành viên mới, cấp quyền, troubleshooting auth |
| [docs/RUNBOOKS.md](docs/RUNBOOKS.md) | Vận hành: cấp password, reset, gỡ quyền, restore data |
| [docs/BACKLOG.md](docs/BACKLOG.md) | Tính năng đã làm vs còn lại |
| [docs/CONTENT_BIBLE.md](docs/CONTENT_BIBLE.md) | Quy tắc viết tiếng Việt (cấm "TX/QL/YC", cấm emoji UI) |
| [docs/DEEP_AUDIT_REPORT.md](docs/DEEP_AUDIT_REPORT.md) | Security + integrity audit 2026-04-28 |
| [docs/LIVE_AUDIT_REPORT.md](docs/LIVE_AUDIT_REPORT.md) | Runtime audit thực tế |
| [docs/V1_TO_V2_BACKFILL.md](docs/V1_TO_V2_BACKFILL.md) | Quy trình cutover V1→V2 + stub `sendEmail()` V1 |
| [docs/NHAT_TRINH_SWABB_PHAM_HONG_KHANH_TB_TAI_XE_V2.2.md](docs/NHAT_TRINH_SWABB_PHAM_HONG_KHANH_TB_TAI_XE_V2.2.md) | Spec đánh giá V3 (5 nguồn QCD, Phương án A — TGĐ duyệt) |
| [docs/QC_CHECKLIST.md](docs/QC_CHECKLIST.md) | Checklist QC review code trước merge |
| [docs/CURSOR_BLOCK_PROMPT_TEMPLATE.md](docs/CURSOR_BLOCK_PROMPT_TEMPLATE.md) | Template PM dùng để giao Block cho Cursor |
| [CLAUDE.md](CLAUDE.md) | Quy ước ngắn cho LLM (Claude / Cursor) |
| [AGENTS.md](AGENTS.md) | Lưu ý Next.js 16 có breaking changes |

---

## Roles

| Vai | Người | Trách nhiệm |
|---|---|---|
| **PM** | Anh Hoàng Kha (`thientin@esuhai.com`) | Scope, ưu tiên, accept Block |
| **DEV** | Cursor (LLM) | Implement Block, viết code + migration + test, viết Report |
| **QC** | Claude CLI (riêng) | Review code trước merge theo `docs/QC_CHECKLIST.md` |

Chi tiết workflow ở [.cursorrules](.cursorrules) §1-§2.

---

## License

Internal use — Esuhai Group. Không công khai code.

---

*Phòng Tổng Hợp — Esuhai Group*
