# Database Schema — Booking Xe V2 + Đánh giá V3

> Tổng hợp từ `supabase/migrations/001..005`. Cập nhật theo Block N (2026-05-12).
> Mỗi lần thêm migration mới (006+), Quản lý update file này trong cùng PR.

## 1. Tổng quan

| Cụm | Bảng | Migration | Mục đích |
|---|---|---|---|
| **Auth + Staff** | `staff` (legacy), `profiles` | (V1 import) + `001` | Lookup user + role manager |
| **Booking V2** | `vehicles`, `vehicle_inspections`, `vehicle_maintenance`, `drivers`, `bookings`, `booking_passengers` | `001`, `004` | Đặt xe + phân công + meta xe/tài xế |
| **Post-trip** | `post_trips`, `post_trip_costs`, `trip_evaluations` | `001` | Sau chuyến: km, chi phí, đánh giá 5 sao chuyến |
| **System** | `email_logs`, `system_config` | `001` | Audit email + cấu hình runtime |
| **Đánh giá V3** | `performance_evaluations`, `performance_scores`, `ot_sessions` | `005` | 5 nguồn QCD × 5 đầu mục theo doc V2.2 §6.2 |

## 2. Enums

| Tên | Giá trị | Migration |
|---|---|---|
| `booking_status` | `cho_duyet`, `cho_duyet_cap2`, `cho_duyet_cap3`, `da_duyet`, `khong_duyet`, `cho_tx_xac_nhan`, `tx_da_nhan`, `tx_tu_choi`, `san_sang`, `da_hoan_thanh`, `da_huy` | 001 |
| `user_role` | `admin`, `manager`, `approver_l2`, `approver_l3`, `driver`, `staff` | 001 |
| `passenger_type` | `nhan_vien`, `khach` | 001 |
| `cost_category` | `sua_chua`, `thay_moi`, `cau_duong`, `do_xe`, `xang_dau`, `kiem_dinh`, `thue_xe`, `khac` | 001 |
| `evaluation_source` | `self`, `receiver_tgd`, `receiver_secretary`, `receiver_general`, `receiver_hr`, `receiver_department`, `manager_ha`, `hard_kpi`, `peer_360` | 005 |
| `evaluation_category` | `A`, `B`, `C`, `D`, `E` | 005 |
| `evaluation_period` | `daily`, `weekly`, `monthly` | 005 |

## 3. Bảng

### `staff` (legacy — V1 import, không có CREATE TABLE trong migration repo)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT | Tên đầy đủ |
| `email` | TEXT UNIQUE | Lookup chính |
| `department` | TEXT | |
| `gender` | TEXT CHECK in ('male','female') | Migration 002 thêm; dùng cho xưng hô email |
| `is_manager` | BOOLEAN | TRUE = Quản lý. Đối sánh với env `ALLOWED_MANAGER_EMAILS` |

Mục đích: nguồn truth cho `requireManagerRole()` (xem `src/lib/auth.ts`) + lookup `vnGreeting()` trong email.

### `profiles` — `001`

Mở rộng `auth.users`. Dùng cho UI hiển thị role label + department. KHÔNG dùng cho authorization (manager check qua `staff.is_manager`).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | UUID PK REFERENCES auth.users | |
| `email` | TEXT UNIQUE | |
| `full_name` | TEXT | |
| `department` | TEXT NULL | |
| `phone` | TEXT NULL | |
| `role` | `user_role` | Default 'staff' |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |

### `vehicles` — `001`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | UUID PK | |
| `plate_number` | TEXT UNIQUE | |
| `vehicle_type` | TEXT | "Toyota 4 chỗ" |
| `brand` | TEXT | |
| `seat_count` | INTEGER | |
| `purchase_date` | DATE NULL | |
| `is_available` | BOOLEAN | FALSE = đang hư/garage |
| `assigned_driver_id` | UUID FK drivers | |

### `vehicle_inspections` — `001`

Đăng kiểm xe.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | UUID PK | |
| `vehicle_id` | UUID FK vehicles ON DELETE CASCADE | |
| `inspection_date` | DATE | |
| `expiry_date` | DATE | Block C dùng làm proxy cho `maintenance_on_time_pct` |
| `center_name` | TEXT | |
| `next_inspection_date` | DATE NULL | |

### `vehicle_maintenance` — `001`

Bảo dưỡng/sửa chữa định kỳ.

| Cột | Kiểu |
|---|---|
| `id` | UUID PK |
| `vehicle_id` | UUID FK vehicles ON DELETE CASCADE |
| `maintenance_date` | DATE |
| `from_date` | DATE |
| `to_date` | DATE |
| `location` | TEXT |
| `items` | JSONB |

### `drivers` — `001` + `004`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | UUID PK | |
| `profile_id` | UUID FK profiles NULL | |
| `full_name` | TEXT | |
| `phone` | TEXT | |
| `email` | TEXT NULL | |
| `license_type` | TEXT | Default 'B2' |
| `license_issued_date` | DATE NULL | |
| `license_issued_place` | TEXT NULL | |
| `vehicle_types_can_drive` | TEXT[] | Checklist xe có thể lái |
| `is_available` | BOOLEAN | |
| `team_lead_email` | TEXT NULL | **Migration 004** — gom team cho KPI cứng (Block C). NULL = không thuộc team nào |

Indexes: `idx_drivers_team_lead_email ON (LOWER(team_lead_email)) WHERE team_lead_email IS NOT NULL`.

### `bookings` — `001`

Bảng core. ~40 cột — xem `001_initial_schema.sql` cho danh sách đầy đủ. Các cột quan trọng:

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `status` | `booking_status` | State machine, default 'cho_duyet' |
| `current_approval_level` | INTEGER | 1/2/3 |
| `max_approval_levels` | INTEGER | 1 (cơ hữu) hoặc 3 (xe ngoài) |
| `approved_by_l1/l2/l3` | TEXT | Email người duyệt |
| `approved_at_l1/l2/l3` | TIMESTAMPTZ | |
| `driver_confirmed_at`, `driver_rejection_reason` | | Phản hồi TX |
| `external_vehicle_cost`, `external_vehicle_info` | | Xe ngoài bổ sung sau cấp 3 |

Indexes: `idx_bookings_status`, `idx_bookings_trip_date`, `idx_bookings_driver`, `idx_bookings_vehicle`, `idx_bookings_department`, `idx_bookings_created`.

Trigger: `bookings_updated_at` BEFORE UPDATE → `update_updated_at()`.

### `booking_passengers` — `001`

| Cột | Kiểu |
|---|---|
| `booking_id` | UUID FK bookings ON DELETE CASCADE |
| `full_name`, `department`, `email`, `phone` | TEXT |
| `passenger_type` | `passenger_type` |

### `post_trips` — `001`

Cập nhật sau chuyến. UNIQUE(booking_id) → 1-1 với bookings.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `booking_id` | UUID UNIQUE FK bookings ON DELETE CASCADE | |
| `actual_departure` | TIMESTAMPTZ NULL | |
| `actual_return` | TIMESTAMPTZ NULL | |
| `departure_diff_minutes` | INTEGER NULL | **Trigger auto-compute**. Dương = đến muộn (trễ); âm = sớm |
| `return_diff_minutes` | INTEGER NULL | Tương tự |
| `overnight_hours` | NUMERIC(5,2) NULL | |
| `total_km` | NUMERIC(10,2) NULL | |
| `completed_at` | TIMESTAMPTZ | |

Trigger: `post_trips_compute_diffs` BEFORE INSERT OR UPDATE → `compute_post_trip_diffs()` (đọc `bookings.pickup_time` + `bookings.end_time` để tính diff).

Indexes: `idx_post_trips_booking`.

### `post_trip_costs` — `001`

| Cột | Kiểu |
|---|---|
| `post_trip_id` | UUID FK post_trips ON DELETE CASCADE |
| `booking_id` | UUID FK bookings ON DELETE CASCADE |
| `cost_category` | `cost_category` |
| `description` | TEXT NULL |
| `amount` | NUMERIC(12,2) |

### `trip_evaluations` — `001`

Đánh giá 5 sao SAU chuyến (khác với V3 — đánh giá đầu mục QCD theo tháng).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `booking_id` | UUID FK bookings ON DELETE CASCADE | |
| `evaluator_email` | TEXT | |
| `evaluator_name` | TEXT | |
| `service_attitude` | INTEGER 1-5 | |
| `traffic_compliance` | INTEGER 1-5 | |
| `vehicle_quality` | INTEGER 1-5 | |
| `safe_driving` | INTEGER 1-5 | |
| `average_score` | NUMERIC(3,2) GENERATED STORED | Auto từ 4 cột trên |
| `feedback` | TEXT NULL | |

UNIQUE(booking_id, evaluator_email) — 1 người chỉ đánh giá 1 lần / chuyến.

### `email_logs` — `001`

| Cột | Kiểu |
|---|---|
| `booking_id` | UUID FK bookings ON DELETE SET NULL |
| `template_name` | TEXT |
| `recipient_email` | TEXT |
| `subject` | TEXT |
| `status` | TEXT default 'sent' |
| `error_message` | TEXT NULL |

Index: `idx_email_logs_booking`.

### `system_config` — `001`

Key-value config runtime. Seed có sẵn `approver_l1_email`, `manager_email`, `email_method`, `sender_*`, v.v.

| Cột | Kiểu |
|---|---|
| `key` | TEXT PK |
| `value` | TEXT |
| `description` | TEXT NULL |

---

### V3 — `performance_evaluations` — `005`

1 phiếu = 1 row. Atomic UNIQUE composite key đảm bảo 1 evaluator chấm 1 subject trong 1 period đúng 1 lần.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | UUID PK | |
| `subject_email` | TEXT | Người được chấm (vd anh Khanh) |
| `evaluator_email` | TEXT | Người chấm |
| `evaluator_role` | `evaluation_source` | 1 trong 9 nguồn |
| `period_type` | `evaluation_period` | `daily`/`weekly`/`monthly` |
| `period_start` | DATE | Anchor — không phải `period_end`, tránh edge case submit cuối kỳ vs đầu kỳ kế |
| `period_end` | DATE | CHECK `>= period_start` |
| `is_anonymous` | BOOLEAN default FALSE | Cho phiếu 360° |
| `notes` | TEXT NULL | |
| `submitted_at` | TIMESTAMPTZ default NOW() | |
| `token_jti` | TEXT NULL | JWT ID nếu submit qua HMAC link (Block O/P/Q) |

**UNIQUE composite:** `(subject_email, evaluator_email, evaluator_role, period_start, period_type)`. Helper `getOrCreateEvaluation()` dùng UPSERT trên key này.

Indexes: `idx_perf_eval_subject_period ON (subject_email, period_start, period_type)`.

### V3 — `performance_scores` — `005`

Điểm Q-C-D × 5 đầu mục A-E. Tối đa 5 row / evaluation (1 row / category).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | UUID PK | |
| `evaluation_id` | UUID FK performance_evaluations ON DELETE CASCADE | |
| `category` | `evaluation_category` | A/B/C/D/E |
| `q_score` | SMALLINT 1-5 | Quality |
| `c_score` | SMALLINT 1-5 | Cost |
| `d_score` | SMALLINT 1-5 | Delivery |
| `avg_score` | NUMERIC(3,2) GENERATED STORED | `(q+c+d)/3` |

**UNIQUE:** `(evaluation_id, category)` — re-submit cùng category dùng UPSERT.

Indexes: `idx_perf_scores_evaluation_id ON (evaluation_id)`.

### V3 — `ot_sessions` — `005`

Phiếu OT TGĐ ký (Block Q.6 sẽ làm form).

| Cột | Kiểu |
|---|---|
| `driver_email` | TEXT |
| `date` | DATE |
| `start_time` | TIME |
| `end_time` | TIME |
| `total_hours` | NUMERIC(4,2) ≥ 0 |
| `rate_type` | TEXT CHECK in ('weekday_60k','sunday_80k') |
| `description` | TEXT NULL |
| `approved_by_tgd` | BOOLEAN default FALSE |
| `approved_at` | TIMESTAMPTZ NULL |

Indexes: `idx_ot_sessions_driver_date ON (driver_email, date)`.

## 4. FK Relationships (chính)

```
auth.users ──(id)── profiles
                    │
drivers ─(profile_id)
vehicles ─(assigned_driver_id)── drivers
vehicle_inspections ─(vehicle_id)── vehicles
vehicle_maintenance ─(vehicle_id)── vehicles
bookings ─(driver_id)── drivers
bookings ─(vehicle_id)── vehicles
booking_passengers ─(booking_id)── bookings
post_trips ─(booking_id UNIQUE)── bookings
post_trip_costs ─(post_trip_id)── post_trips
                  └─(booking_id)── bookings
trip_evaluations ─(booking_id)── bookings
email_logs ─(booking_id)── bookings (SET NULL)
performance_scores ─(evaluation_id)── performance_evaluations
```

`staff` và `ot_sessions` link mềm qua email (không phải FK cứng) — vì `staff` là legacy V1, và `ot_sessions` có thể chứa driver chưa có row trong `drivers`.

## 5. RLS — `is_current_user_manager()`

Helper function `public.is_current_user_manager()` định nghĩa trong `003_rls_hardening.sql` — SECURITY DEFINER STABLE, đọc `staff.is_manager` theo `auth.jwt() ->> 'email'`.

| Bảng | READ | WRITE | Migration |
|---|---|---|---|
| `profiles` | All | Own (UPDATE) | 001 |
| `bookings` | All | Manager | 001 + 003 |
| `booking_passengers` | All | Manager | 001 + 003 |
| `vehicles`, `drivers` | All | Manager | 001 + 003 |
| `post_trips`, `post_trip_costs` | All | Manager | 001 + 003 |
| `trip_evaluations` | All | INSERT=self by email (Manager update/delete) | 001 + 003 |
| `email_logs` | Manager | Manager (INSERT) | 001 + 003 |
| `system_config` | All | Manager | 001 + 003 |
| `performance_evaluations` | Manager | Manager | 005 |
| `performance_scores` | Manager | Manager | 005 |
| `ot_sessions` | Manager | Manager | 005 |

Server actions luôn dùng `createAdminClient()` (service-role) → bypass RLS. Public form (driver-response, evaluate, approval-response, perf-eval/*) cũng dùng admin client + verify HMAC token thay vì dựa RLS.

## 6. Triggers

| Trigger | Bảng | Function |
|---|---|---|
| `bookings_updated_at` | bookings | `update_updated_at()` — set `updated_at = NOW()` BEFORE UPDATE |
| `post_trips_compute_diffs` | post_trips | `compute_post_trip_diffs()` — tự tính `departure_diff_minutes`, `return_diff_minutes` từ booking BEFORE INSERT/UPDATE |

## 7. Migration history

| File | Tóm tắt |
|---|---|
| `001_initial_schema.sql` | Toàn bộ bảng V2 + enums + indexes + RLS baseline + triggers + system_config seed |
| `002_add_gender_to_staff.sql` | `staff.gender` cho xưng hô email |
| `003_rls_hardening.sql` | `is_current_user_manager()` + RLS WRITE chỉ Manager (defense in depth) |
| `004_driver_team.sql` | `drivers.team_lead_email` cho KPI cứng (Block C) — **chưa merge master, nằm trên PR `feat/C-kpi-api`** |
| `005_performance_evaluation_v3.sql` | 3 ENUM + `performance_evaluations`, `performance_scores`, `ot_sessions` + RLS Manager (Block N) |

## 8. Quy ước đặt tên

- Bảng: `snake_case` số nhiều (`bookings`, `performance_evaluations`).
- Cột: `snake_case` (`requester_email`, `approved_by_l2`).
- Enum: `snake_case` số ít (`booking_status`, `evaluation_source`).
- Index: `idx_<table>_<columns>` (`idx_perf_eval_subject_period`).
- Policy: `<table>_<action>_<role>` (`bookings_update_manager`).
- Constraint: `<table>_<purpose>` (`perf_eval_unique_per_period`).
- Migration file: `<NNN>_<short_desc>.sql` với NNN tăng dần.
