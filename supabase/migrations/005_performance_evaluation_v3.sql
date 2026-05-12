-- ============================================================
-- 005 — Performance Evaluation V3 (Block N)
--
-- Schema chung cho hệ thống Đánh giá 5 nguồn QCD theo doc V2.2 §6.2.
-- 9 nguồn chấm (sub-roles): self / 5 receiver_* / manager_ha / hard_kpi / peer_360.
-- Mỗi phiếu = 1 row performance_evaluations + 0..5 row performance_scores
-- (mỗi category A-E 1 row chứa Q-C-D + avg STORED).
--
-- Spec đầy đủ: docs/ROADMAP.md §7. Block N chỉ tạo schema + RLS — code
-- form (Ứng viên 2/3/4) làm ở Block O/P/Q sau.
--
-- Idempotent: chạy nhiều lần không lỗi.
-- Chạy: copy file này paste vào Supabase Dashboard > SQL Editor.
-- ============================================================

-- --- ENUMs (Postgres không có CREATE TYPE IF NOT EXISTS) ---

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evaluation_source') THEN
    CREATE TYPE public.evaluation_source AS ENUM (
      'self',                 -- Phiếu 1 — anh Khanh tự đánh giá
      'receiver_tgd',         -- Phiếu 2 — TGĐ Lê Long Sơn chấm
      'receiver_secretary',   -- Phiếu 2 — Thư ký TGĐ chấm
      'receiver_general',     -- Phiếu 2 — Phòng Tổng vụ chấm
      'receiver_hr',          -- Phiếu 2 — Phòng HCNS chấm
      'receiver_department',  -- Phiếu 2 — Trưởng phòng dùng xe chấm
      'manager_ha',           -- Phiếu 3 — Chị Thúy Hà (CQL cao nhất)
      'hard_kpi',             -- Phiếu 4 — Hệ thống tự xuất (Block C đã có API)
      'peer_360'              -- Phiếu 5 — 360° đồng nghiệp (Block O)
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evaluation_category') THEN
    CREATE TYPE public.evaluation_category AS ENUM ('A','B','C','D','E');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evaluation_period') THEN
    CREATE TYPE public.evaluation_period AS ENUM ('daily','weekly','monthly');
  END IF;
END $$;

-- --- performance_evaluations ---
-- 1 phiếu = 1 row. UNIQUE composite key đảm bảo 1 evaluator chỉ chấm 1
-- subject trong 1 period (weekly/monthly) đúng 1 lần. Re-submit dùng
-- ON CONFLICT update.

CREATE TABLE IF NOT EXISTS public.performance_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_email TEXT NOT NULL,
  evaluator_email TEXT NOT NULL,
  evaluator_role evaluation_source NOT NULL,
  period_type evaluation_period NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  token_jti TEXT,
  CONSTRAINT perf_eval_period_order CHECK (period_end >= period_start),
  CONSTRAINT perf_eval_unique_per_period UNIQUE
    (subject_email, evaluator_email, evaluator_role, period_start, period_type)
);

COMMENT ON TABLE public.performance_evaluations IS
  'V3 — 1 phiếu chấm hiệu quả (1 trong 9 nguồn) cho 1 subject trong 1 period. Block N schema; form thực tế ở Block O/P/Q.';
COMMENT ON COLUMN public.performance_evaluations.token_jti IS
  'JWT ID của HMAC token được dùng để submit (nếu submit qua public email-link). NULL nếu submit qua dashboard authed.';

-- --- performance_scores ---
-- 5 đầu mục A-E. Mỗi category 1 row (UNIQUE per evaluation). Q-C-D từng
-- thang 1-5. avg_score GENERATED STORED — Postgres tự tính khi insert/update.

CREATE TABLE IF NOT EXISTS public.performance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.performance_evaluations(id) ON DELETE CASCADE,
  category evaluation_category NOT NULL,
  q_score SMALLINT NOT NULL CHECK (q_score BETWEEN 1 AND 5),
  c_score SMALLINT NOT NULL CHECK (c_score BETWEEN 1 AND 5),
  d_score SMALLINT NOT NULL CHECK (d_score BETWEEN 1 AND 5),
  avg_score NUMERIC(3,2) GENERATED ALWAYS AS
    ((q_score + c_score + d_score)::NUMERIC / 3) STORED,
  CONSTRAINT perf_scores_unique_per_category UNIQUE (evaluation_id, category)
);

COMMENT ON TABLE public.performance_scores IS
  'Điểm Q-C-D × 5 đầu mục A-E cho 1 evaluation. Evaluator có thể chấm 1-5 row (không bắt buộc đủ 5). avg_score auto-computed.';

-- --- ot_sessions ---
-- Phiếu OT TGĐ ký (Block Q.6 sẽ dùng). Tách bảng riêng vì OT có timestamp
-- rời rạc + rate_type khác với QCD evaluations.

CREATE TABLE IF NOT EXISTS public.ot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_email TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_hours NUMERIC(4,2) NOT NULL CHECK (total_hours >= 0),
  rate_type TEXT NOT NULL CHECK (rate_type IN ('weekday_60k','sunday_80k')),
  description TEXT,
  approved_by_tgd BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ot_sessions IS
  'Phiếu OT — TGĐ ký từng phiên. rate_type: weekday_60k (60.000đ/h ngày thường) | sunday_80k (80.000đ/h Chủ nhật/lễ). Block Q.6 sẽ thêm form.';

-- --- Index hỗ trợ query dashboard ---

CREATE INDEX IF NOT EXISTS idx_perf_eval_subject_period
  ON public.performance_evaluations (subject_email, period_start, period_type);

CREATE INDEX IF NOT EXISTS idx_perf_scores_evaluation_id
  ON public.performance_scores (evaluation_id);

CREATE INDEX IF NOT EXISTS idx_ot_sessions_driver_date
  ON public.ot_sessions (driver_email, date);

-- --- RLS — đồng nhất pattern với 003_rls_hardening.sql ---
-- READ: chỉ Quản lý (anon/staff không thấy điểm chấm — sensitive HR data).
-- WRITE: chỉ Quản lý qua RLS (server actions vẫn dùng admin client → bypass RLS).
-- Form public (Block O peer_360) sẽ dùng admin client + HMAC token verify, không
-- phụ thuộc RLS này.

ALTER TABLE public.performance_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perf_eval_read_manager" ON public.performance_evaluations;
DROP POLICY IF EXISTS "perf_eval_write_manager" ON public.performance_evaluations;
DROP POLICY IF EXISTS "perf_scores_read_manager" ON public.performance_scores;
DROP POLICY IF EXISTS "perf_scores_write_manager" ON public.performance_scores;
DROP POLICY IF EXISTS "ot_sessions_read_manager" ON public.ot_sessions;
DROP POLICY IF EXISTS "ot_sessions_write_manager" ON public.ot_sessions;

CREATE POLICY "perf_eval_read_manager" ON public.performance_evaluations
  FOR SELECT TO authenticated
  USING (public.is_current_user_manager());

CREATE POLICY "perf_eval_write_manager" ON public.performance_evaluations
  FOR ALL TO authenticated
  USING (public.is_current_user_manager())
  WITH CHECK (public.is_current_user_manager());

CREATE POLICY "perf_scores_read_manager" ON public.performance_scores
  FOR SELECT TO authenticated
  USING (public.is_current_user_manager());

CREATE POLICY "perf_scores_write_manager" ON public.performance_scores
  FOR ALL TO authenticated
  USING (public.is_current_user_manager())
  WITH CHECK (public.is_current_user_manager());

CREATE POLICY "ot_sessions_read_manager" ON public.ot_sessions
  FOR SELECT TO authenticated
  USING (public.is_current_user_manager());

CREATE POLICY "ot_sessions_write_manager" ON public.ot_sessions
  FOR ALL TO authenticated
  USING (public.is_current_user_manager())
  WITH CHECK (public.is_current_user_manager());

-- --- VERIFY (chạy sau khi apply) ---
-- SELECT typname FROM pg_type WHERE typname IN ('evaluation_source','evaluation_category','evaluation_period');
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('performance_evaluations','performance_scores','ot_sessions');
-- SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'idx_perf%' OR indexname LIKE 'idx_ot%';
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename IN ('performance_evaluations','performance_scores','ot_sessions');
