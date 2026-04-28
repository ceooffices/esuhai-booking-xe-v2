-- ============================================================
-- 003 — RLS Hardening (Mức A: defense in depth)
--
-- Mục tiêu: chặn user authed thường (không phải Quản lý) sửa booking,
-- giả mạo evaluation, spam log... bằng cách query trực tiếp PostgREST
-- với anon key. Server actions vẫn dùng admin client (bypass RLS) →
-- không ảnh hưởng app code hiện tại.
--
-- Mức A:
--   READ: vẫn open cho mọi authenticated user (dashboard cần xem data)
--   WRITE: chỉ Quản lý (staff.is_manager = true)
--   trip_evaluations INSERT: chỉ tự đánh giá cho mình
--                            (evaluator_email khớp auth.jwt email)
--
-- Chạy: copy toàn bộ file này paste vào Supabase Dashboard > SQL Editor
-- ============================================================

-- --- Helper function: check current user là Quản lý ---
-- SECURITY DEFINER để bỏ qua RLS khi đọc bảng staff (tránh recursion).
-- STABLE để PostgreSQL cache trong cùng query.
CREATE OR REPLACE FUNCTION public.is_current_user_manager()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT is_manager FROM public.staff
       WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
       LIMIT 1),
    FALSE
  );
$$;

COMMENT ON FUNCTION public.is_current_user_manager() IS
  'Trả TRUE nếu user đang authenticated tương ứng với staff.is_manager=true. Dùng cho RLS WRITE policies.';

-- ============================================================
-- BOOKINGS — read all, insert/update chỉ Quản lý
-- ============================================================

DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete" ON public.bookings;

CREATE POLICY "bookings_insert_manager" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_manager());

CREATE POLICY "bookings_update_manager" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.is_current_user_manager());

CREATE POLICY "bookings_delete_manager" ON public.bookings
  FOR DELETE TO authenticated
  USING (public.is_current_user_manager());

-- (giữ nguyên bookings_read USING (true) — dashboard cần đọc tất cả)

-- ============================================================
-- BOOKING_PASSENGERS — read all, write chỉ Quản lý
-- ============================================================

DROP POLICY IF EXISTS "passengers_all" ON public.booking_passengers;

CREATE POLICY "passengers_read" ON public.booking_passengers
  FOR SELECT USING (true);

CREATE POLICY "passengers_write" ON public.booking_passengers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_manager());

CREATE POLICY "passengers_update" ON public.booking_passengers
  FOR UPDATE TO authenticated
  USING (public.is_current_user_manager());

CREATE POLICY "passengers_delete" ON public.booking_passengers
  FOR DELETE TO authenticated
  USING (public.is_current_user_manager());

-- ============================================================
-- POST_TRIPS + POST_TRIP_COSTS — read all, write chỉ Quản lý
-- ============================================================

DROP POLICY IF EXISTS "post_trips_all" ON public.post_trips;
DROP POLICY IF EXISTS "post_trip_costs_all" ON public.post_trip_costs;

CREATE POLICY "post_trips_read" ON public.post_trips
  FOR SELECT USING (true);

CREATE POLICY "post_trips_write" ON public.post_trips
  FOR ALL TO authenticated
  USING (public.is_current_user_manager())
  WITH CHECK (public.is_current_user_manager());

CREATE POLICY "post_trip_costs_read" ON public.post_trip_costs
  FOR SELECT USING (true);

CREATE POLICY "post_trip_costs_write" ON public.post_trip_costs
  FOR ALL TO authenticated
  USING (public.is_current_user_manager())
  WITH CHECK (public.is_current_user_manager());

-- ============================================================
-- TRIP_EVALUATIONS — read all, INSERT phải là chính mình
-- ============================================================

DROP POLICY IF EXISTS "evaluations_all" ON public.trip_evaluations;

CREATE POLICY "evaluations_read" ON public.trip_evaluations
  FOR SELECT USING (true);

-- INSERT: evaluator_email PHẢI khớp email user đang login (không spoof
-- được người khác đánh giá hộ). UNIQUE(booking_id, evaluator_email)
-- vẫn enforce ở DB level để tránh đánh giá 2 lần.
-- LƯU Ý: route /evaluate là public + dùng admin client + HMAC token,
-- nên policy này KHÔNG ảnh hưởng flow chính. Nó là tuyến phòng thủ
-- thứ 2 chặn bất kỳ ai cố INSERT trực tiếp với anon key.
CREATE POLICY "evaluations_insert_self" ON public.trip_evaluations
  FOR INSERT TO authenticated
  WITH CHECK (LOWER(evaluator_email) = LOWER(auth.jwt() ->> 'email'));

CREATE POLICY "evaluations_update_manager" ON public.trip_evaluations
  FOR UPDATE TO authenticated
  USING (public.is_current_user_manager());

CREATE POLICY "evaluations_delete_manager" ON public.trip_evaluations
  FOR DELETE TO authenticated
  USING (public.is_current_user_manager());

-- ============================================================
-- EMAIL_LOGS — đã có read=Quản lý, insert=any → bind insert vào Quản lý
-- (server actions luôn dùng admin client nên không bị block)
-- ============================================================

DROP POLICY IF EXISTS "email_logs_insert" ON public.email_logs;

CREATE POLICY "email_logs_insert_manager" ON public.email_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_manager());

-- (giữ nguyên email_logs_read USING admin/manager check)

-- ============================================================
-- SYSTEM_CONFIG — config_write hiện check role='admin' từ profiles.
-- Đổi sang check is_current_user_manager() vì project KHÔNG dùng
-- profiles table (manager check qua staff.is_manager).
-- ============================================================

DROP POLICY IF EXISTS "config_write" ON public.system_config;

CREATE POLICY "config_write_manager" ON public.system_config
  FOR ALL TO authenticated
  USING (public.is_current_user_manager())
  WITH CHECK (public.is_current_user_manager());

-- ============================================================
-- VEHICLES + DRIVERS — đang check profiles.role IN admin/manager.
-- Đổi sang is_current_user_manager() (consistent + đúng nguồn truth).
-- ============================================================

DROP POLICY IF EXISTS "vehicles_write" ON public.vehicles;
DROP POLICY IF EXISTS "drivers_write" ON public.drivers;

CREATE POLICY "vehicles_write_manager" ON public.vehicles
  FOR ALL TO authenticated
  USING (public.is_current_user_manager())
  WITH CHECK (public.is_current_user_manager());

CREATE POLICY "drivers_write_manager" ON public.drivers
  FOR ALL TO authenticated
  USING (public.is_current_user_manager())
  WITH CHECK (public.is_current_user_manager());

-- ============================================================
-- VERIFY — chạy sau khi apply để xác nhận policies đúng
-- ============================================================
--
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('bookings', 'booking_passengers', 'post_trips',
--                     'post_trip_costs', 'trip_evaluations', 'email_logs',
--                     'system_config', 'vehicles', 'drivers')
-- ORDER BY tablename, cmd, policyname;
--
-- SELECT public.is_current_user_manager(); -- nên trả TRUE/FALSE đúng theo
--                                          -- email user đang chạy SQL
