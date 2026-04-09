# Booking Xe Esuhai V2 — Claude Code Instructions

## Tech Stack
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth (Magic Link email)
- **Email**: n8n Cloud webhooks (esuhai.app.n8n.cloud) > Office365 SMTP
- **Deploy**: Vercel (free tier)
- **Staff data**: Supabase (same instance, `staff` table from Ver01)

## Project Structure
```
src/
  app/
    (auth)/login/            — Login page (magic link)
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
    email.ts                 — n8n email service
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
