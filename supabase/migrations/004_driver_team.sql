-- ============================================================
-- 004 — Driver team membership (Block C — KPI cứng API)
--
-- Mục tiêu: cho phép đánh dấu tài xế thuộc đội nào (team) bằng email
-- của Trưởng ban TX. Endpoint /api/kpi/driver-monthly?driver_email=khanh@esuhai.com
-- sẽ resolve danh sách driver thuộc team Khanh để tính 5 metric KPI cứng
-- (xem docs/ROADMAP.md §6).
--
-- Idempotent: chạy nhiều lần không lỗi.
-- Chạy: copy file này paste vào Supabase Dashboard > SQL Editor.
--
-- Sau khi apply:
--   UPDATE drivers SET team_lead_email = 'khanh@esuhai.com'
--    WHERE id IN ('<uuid_1>', '<uuid_2>', ...);
-- (Quản lý tự xác định danh sách 7 TX thuộc team Khanh)
-- ============================================================

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS team_lead_email TEXT;

COMMENT ON COLUMN public.drivers.team_lead_email IS
  'Email Trưởng ban TX phụ trách. Dùng để gom team cho KPI cứng (Block C). NULL = không thuộc team nào.';

CREATE INDEX IF NOT EXISTS idx_drivers_team_lead_email
  ON public.drivers (LOWER(team_lead_email))
  WHERE team_lead_email IS NOT NULL;

-- --- VERIFY ---
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='drivers' AND column_name='team_lead_email';
--
-- SELECT indexname FROM pg_indexes
--  WHERE schemaname='public' AND tablename='drivers' AND indexname='idx_drivers_team_lead_email';
