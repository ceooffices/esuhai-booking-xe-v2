-- ============================================================
-- Booking Xe V2 — Initial Database Schema
-- Run via Supabase Dashboard > SQL Editor
-- ============================================================

-- --- Enums ---
CREATE TYPE booking_status AS ENUM (
  'cho_duyet', 'cho_duyet_cap2', 'cho_duyet_cap3',
  'da_duyet', 'khong_duyet',
  'cho_tx_xac_nhan', 'tx_da_nhan', 'tx_tu_choi',
  'san_sang', 'da_hoan_thanh', 'da_huy'
);

CREATE TYPE user_role AS ENUM (
  'admin', 'manager', 'approver_l2', 'approver_l3', 'driver', 'staff'
);

CREATE TYPE passenger_type AS ENUM ('nhan_vien', 'khach');

CREATE TYPE cost_category AS ENUM (
  'sua_chua', 'thay_moi', 'cau_duong', 'do_xe',
  'xang_dau', 'kiem_dinh', 'thue_xe', 'khac'
);

-- --- Profiles (extends Supabase auth.users) ---
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- Vehicles ---
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number TEXT UNIQUE NOT NULL,
  vehicle_type TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  seat_count INTEGER NOT NULL DEFAULT 4,
  purchase_date DATE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  assigned_driver_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- Vehicle Inspections (kiem dinh) ---
CREATE TABLE vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  center_name TEXT NOT NULL,
  next_inspection_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- Vehicle Maintenance (bao duong, sua chua) ---
CREATE TABLE vehicle_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  maintenance_date DATE NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- Drivers ---
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  license_type TEXT NOT NULL DEFAULT 'B2',
  license_issued_date DATE,
  license_issued_place TEXT,
  vehicle_types_can_drive TEXT[] NOT NULL DEFAULT '{}',
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE vehicles
  ADD CONSTRAINT fk_assigned_driver FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id);

-- --- Bookings (core table) ---
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nguoi dat
  requester_name TEXT NOT NULL,
  requester_department TEXT NOT NULL,
  requester_email TEXT,
  -- Phan loai
  category TEXT NOT NULL DEFAULT 'Noi bo',
  purpose TEXT NOT NULL,
  -- Thoi gian
  trip_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  end_time TIME,
  -- Chi tiet
  itinerary TEXT,
  passenger_count INTEGER NOT NULL DEFAULT 1,
  staff_in_charge TEXT,
  flight_number TEXT,
  member_names TEXT,
  -- Xe ngoai / Chi dinh
  is_external_vehicle BOOLEAN NOT NULL DEFAULT false,
  is_designated_vehicle BOOLEAN NOT NULL DEFAULT false,
  -- Diem don/tra
  pickup_point TEXT,
  pickup_address TEXT,
  pickup_pax INTEGER,
  dropoff_point TEXT,
  dropoff_address TEXT,
  dropoff_pax INTEGER,
  transit_point TEXT,
  departure_point TEXT,
  total_distance_km NUMERIC(10,2),
  -- Phan cong
  vehicle_id UUID REFERENCES vehicles(id),
  driver_id UUID REFERENCES drivers(id),
  -- Duyet
  status booking_status NOT NULL DEFAULT 'cho_duyet',
  current_approval_level INTEGER NOT NULL DEFAULT 1,
  max_approval_levels INTEGER NOT NULL DEFAULT 1,
  -- Tracking duyet
  approved_by_l1 TEXT,
  approved_at_l1 TIMESTAMPTZ,
  approved_by_l2 TEXT,
  approved_at_l2 TIMESTAMPTZ,
  approved_by_l3 TEXT,
  approved_at_l3 TIMESTAMPTZ,
  -- Tu choi / Huy
  rejection_reason TEXT,
  rejected_by TEXT,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  -- TX xac nhan
  driver_confirmed_at TIMESTAMPTZ,
  driver_rejection_reason TEXT,
  -- Xe ngoai — bo sung sau duyet cap 3
  external_vehicle_cost NUMERIC(12,2),
  external_vehicle_info TEXT,
  -- Ghi chu
  notes TEXT,
  ops_notes TEXT,
  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- Booking Passengers (luoi nguoi di) ---
CREATE TABLE booking_passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  department TEXT,
  email TEXT,
  phone TEXT,
  passenger_type passenger_type NOT NULL DEFAULT 'nhan_vien'
);

-- --- Post-Trip (cap nhat sau chuyen di) ---
CREATE TABLE post_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  actual_departure TIMESTAMPTZ,
  actual_return TIMESTAMPTZ,
  departure_diff_minutes INTEGER,  -- auto-computed by trigger
  return_diff_minutes INTEGER,     -- auto-computed by trigger
  overnight_hours NUMERIC(5,2),
  total_km NUMERIC(10,2),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- Post-Trip Costs ---
CREATE TABLE post_trip_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_trip_id UUID NOT NULL REFERENCES post_trips(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  cost_category cost_category NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- Trip Evaluations (danh gia 5 sao) ---
CREATE TABLE trip_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  evaluator_email TEXT NOT NULL,
  evaluator_name TEXT NOT NULL,
  service_attitude INTEGER NOT NULL CHECK (service_attitude BETWEEN 1 AND 5),
  traffic_compliance INTEGER NOT NULL CHECK (traffic_compliance BETWEEN 1 AND 5),
  vehicle_quality INTEGER NOT NULL CHECK (vehicle_quality BETWEEN 1 AND 5),
  safe_driving INTEGER NOT NULL CHECK (safe_driving BETWEEN 1 AND 5),
  average_score NUMERIC(3,2) GENERATED ALWAYS AS (
    (service_attitude + traffic_compliance + vehicle_quality + safe_driving)::NUMERIC / 4
  ) STORED,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id, evaluator_email)
);

-- --- Email Log ---
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- System Config ---
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- Indexes ---
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_trip_date ON bookings(trip_date);
CREATE INDEX idx_bookings_driver ON bookings(driver_id);
CREATE INDEX idx_bookings_vehicle ON bookings(vehicle_id);
CREATE INDEX idx_bookings_department ON bookings(requester_department);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);
CREATE INDEX idx_post_trips_booking ON post_trips(booking_id);
CREATE INDEX idx_evaluations_booking ON trip_evaluations(booking_id);
CREATE INDEX idx_email_logs_booking ON email_logs(booking_id);

-- --- Auto-update updated_at ---
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-compute diff minutes on post_trips insert/update
CREATE OR REPLACE FUNCTION compute_post_trip_diffs()
RETURNS TRIGGER AS $$
DECLARE
  b RECORD;
BEGIN
  SELECT trip_date, pickup_time, end_time INTO b FROM bookings WHERE id = NEW.booking_id;
  IF NEW.actual_departure IS NOT NULL AND b.pickup_time IS NOT NULL THEN
    NEW.departure_diff_minutes := EXTRACT(EPOCH FROM (NEW.actual_departure - (b.trip_date + b.pickup_time))) / 60;
  END IF;
  IF NEW.actual_return IS NOT NULL AND b.end_time IS NOT NULL THEN
    NEW.return_diff_minutes := EXTRACT(EPOCH FROM (NEW.actual_return - (b.trip_date + b.end_time))) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_trips_compute_diffs
  BEFORE INSERT OR UPDATE ON post_trips
  FOR EACH ROW EXECUTE FUNCTION compute_post_trip_diffs();

-- --- Seed system config ---
INSERT INTO system_config (key, value, description) VALUES
  ('approval_levels_internal', '1', 'So cap duyet cho xe co huu'),
  ('approval_levels_external', '3', 'So cap duyet cho xe ngoai'),
  ('approver_l1_email', '', 'Email Truong ban tai xe'),
  ('approver_l2_email', '', 'Email nguoi kiem soat chi phi (Ms Ha)'),
  ('approver_l3_email', '', 'Email Admin'),
  ('manager_email', '', 'Email quan ly'),
  ('manager_name', 'Thuy Ha', 'Ten quan ly'),
  ('always_cc', 'hoangkha@esuhai.com', 'Luon CC email nay'),
  ('n8n_webhook_notify', 'https://esuhai.app.n8n.cloud/webhook/booking-xe-notify', 'n8n webhook'),
  ('n8n_webhook_driver', 'https://esuhai.app.n8n.cloud/webhook/booking-xe-driver', 'n8n webhook driver'),
  ('email_method', 'n8n', 'n8n hoac gmail'),
  ('sender_name', 'Phong Tong hop - Esuhai', 'Ten nguoi gui email'),
  ('sender_email', 'booking.xe@esuhai.com', 'Email nguoi gui');

-- --- RLS Policies ---
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_trip_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "profiles_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Bookings: authenticated users can read all, insert own, managers/admins can update
CREATE POLICY "bookings_read" ON bookings FOR SELECT USING (true);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (true);

-- Vehicles & Drivers: read all, admin/manager can write
CREATE POLICY "vehicles_read" ON vehicles FOR SELECT USING (true);
CREATE POLICY "vehicles_write" ON vehicles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "drivers_read" ON drivers FOR SELECT USING (true);
CREATE POLICY "drivers_write" ON drivers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Passengers, Post-trips, Costs, Evaluations: authenticated can read/write
CREATE POLICY "passengers_all" ON booking_passengers FOR ALL USING (true);
CREATE POLICY "post_trips_all" ON post_trips FOR ALL USING (true);
CREATE POLICY "post_trip_costs_all" ON post_trip_costs FOR ALL USING (true);
CREATE POLICY "evaluations_all" ON trip_evaluations FOR ALL USING (true);

-- Email logs: admin/manager can read
CREATE POLICY "email_logs_read" ON email_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "email_logs_insert" ON email_logs FOR INSERT WITH CHECK (true);

-- System config: all read, admin write
CREATE POLICY "config_read" ON system_config FOR SELECT USING (true);
CREATE POLICY "config_write" ON system_config FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
