# Booking Xe Esuhai V2 — Claude Code Instructions

## Tech Stack
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth — **Magic Link** (`signInWithOtp`, không password). Onboarding chi tiết: [docs/ONBOARDING.md](docs/ONBOARDING.md)
- **Authorization**: `requireManagerRole()` — check `staff.is_manager=TRUE` HOẶC email trong env `ALLOWED_MANAGER_EMAILS` (whitelist Vercel)
- **Email**: Nodemailer SMTP trực tiếp (Office365) — độc lập, không dùng n8n
- **Deploy**: Vercel (free tier)
- **Staff data**: Supabase (same instance, `staff` table from Ver01)

## Project Structure
```
src/
  app/
    (auth)/login/            — Login page (Magic Link, signInWithOtp)
    (dashboard)/             — Protected dashboard layout
      dashboard/             — Main overview
      calendar/              — Calendar view (X=ngay, Y=xe)
      drivers/               — Driver management
      vehicles/              — Vehicle management
      reports/               — Reports & analytics
      settings/              — System config
    driver-response/         — Public: driver confirm/reject
    api/
      auth/callback/         — Supabase auth callback
      bookings/              — Booking CRUD API
      driver-response/       — Driver action API
      webhooks/google-form/  — Google Form webhook receiver
  components/
    layout/                  — Shell, nav, sidebar
    booking/                 — Booking cards, forms, modals
    ui/                      — Reusable UI components
  config/
    constants.ts             — Status labels, colors, approval config
    content.ts               — All Vietnamese copy
  lib/
    supabase/                — Client, server, admin, middleware
    auth.ts                  — requireAuthUserEmail + requireManagerRole
    staff.ts                 — Lookup staff theo email/tên (multi-tier)
    tokens.ts                — HMAC sign/verify (driver-response, /evaluate)
    booking-emails.ts        — getBookingEmailData, getEmailConfig, notifyApprover, collectRecipients
    email.ts                 — Nodemailer SMTP wrapper
    email-templates.ts       — 11 email templates (V2.2 + approval request)
  types/
    database.ts              — All TypeScript types
supabase/
  migrations/                — SQL migration files
```

## Approval Workflow
```
Xe co huu (internal):  Form > Cap 1 (Truong ban TX) > Da duyet > TX xac nhan
Xe ngoai (external):   Form > Cap 1 > Cap 2 (Ms Ha) > Cap 3 (Admin) > Da duyet > TX xac nhan
```

## Environment Variables
See `.env.example` for required variables.

## Deploy
```bash
npm run build          # Local build check
vercel                 # Deploy to preview
vercel --prod          # Deploy to production
```
