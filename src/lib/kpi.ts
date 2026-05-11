import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

// ============================================================
// KPI cứng API — compute logic (Block C)
//
// Spec: docs/ROADMAP.md §6 + docs/NHAT_TRINH_SWABB_PHAM_HONG_KHANH_TB_TAI_XE_V2.2.md §7.2 Phiếu 4
//
// Sign convention: post_trips.departure_diff_minutes = actual - expected.
//   Dương → đến muộn (trễ); Âm → đến sớm.
//
// 5 metric:
//   1. late_pickup_count       — đếm trễ > 5 phút
//   2. on_time_rate_pct        — % chuyến đúng giờ (window ±5 phút)
//   3. maintenance_on_time_pct — % xe trong team có đăng kiểm còn hạn (proxy)
//   4. fleet_cost_vs_prev_month_pct — chênh chi phí so tháng trước
//   5. team_avg_kpi            — NULL (chờ Block O)
//
// Score 1-5 per metric: dùng cho Phòng Tổng vụ paste vào Form 4 Google Sheet.
// Quy đổi 1-5 → B1% áp dụng ở Dashboard tháng V3, không phải tại API này.
// ============================================================

export type MetricCategory = 'A' | 'B' | 'C' | 'D' | 'E';
export type MetricScore = 1 | 2 | 3 | 4 | 5;

export interface Metric {
  value: number | null;
  target: number;
  score: MetricScore | null;
  category: MetricCategory;
  note?: string;
}

export interface KpiPeriod {
  month: string; // YYYY-MM
  from: string;  // YYYY-MM-DD
  to: string;    // YYYY-MM-DD (cuối tháng)
}

export interface KpiDriver {
  email: string;
  name: string | null;
}

export interface KpiReport {
  driver: KpiDriver;
  period: KpiPeriod;
  team_size: number;
  metrics: {
    late_pickup_count: Metric;
    on_time_rate_pct: Metric;
    maintenance_on_time_pct: Metric;
    fleet_cost_vs_prev_month_pct: Metric;
    team_avg_kpi: Metric;
  };
  computed_at: string;
}

// ---------- Period helpers ----------

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidMonth(month: string): boolean {
  return MONTH_RE.test(month);
}

export function buildPeriod(month: string): KpiPeriod {
  // month format guaranteed valid before call
  const [yStr, mStr] = month.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const firstDay = `${month}-01`;
  // last day of month: 0th day of next month
  const last = new Date(Date.UTC(y, m, 0));
  const lastDay = `${month}-${String(last.getUTCDate()).padStart(2, '0')}`;
  return { month, from: firstDay, to: lastDay };
}

function prevMonth(month: string): string {
  const [yStr, mStr] = month.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

// ---------- Score mapping helpers ----------

// Lower-better thresholds. Returns score 1..5.
// thresholds = [t5, t4, t3, t2]  (value <= t5 → 5; <= t4 → 4; ...; else 1)
function scoreLowerBetter(value: number, thresholds: [number, number, number, number]): MetricScore {
  if (value <= thresholds[0]) return 5;
  if (value <= thresholds[1]) return 4;
  if (value <= thresholds[2]) return 3;
  if (value <= thresholds[3]) return 2;
  return 1;
}

// Higher-better thresholds. thresholds = [t5, t4, t3, t2] (value >= ...)
function scoreHigherBetter(value: number, thresholds: [number, number, number, number]): MetricScore {
  if (value >= thresholds[0]) return 5;
  if (value >= thresholds[1]) return 4;
  if (value >= thresholds[2]) return 3;
  if (value >= thresholds[3]) return 2;
  return 1;
}

// ---------- Compute ----------

type TeamDriver = { id: string; email: string | null };
type TripRow = { driver_id: string; departure_diff_minutes: number | null; vehicle_id: string | null };

export async function computeDriverMonthlyKpi(opts: {
  driverEmail: string;
  month: string;
}): Promise<KpiReport> {
  const driverEmail = opts.driverEmail.trim().toLowerCase();
  const period = buildPeriod(opts.month);

  const driverName = await fetchDriverName(driverEmail);
  const team = await fetchTeam(driverEmail);
  const teamDriverIds = team.map((d) => d.id);

  if (teamDriverIds.length === 0) {
    const reason = `Team trống — chưa có driver nào set team_lead_email='${driverEmail}'`;
    return {
      driver: { email: driverEmail, name: driverName },
      period,
      team_size: 0,
      metrics: {
        late_pickup_count: emptyMetric(0, 'A', reason),
        on_time_rate_pct: emptyMetric(95, 'D', reason),
        maintenance_on_time_pct: emptyMetric(95, 'D', reason),
        fleet_cost_vs_prev_month_pct: emptyMetric(0, 'D', reason),
        team_avg_kpi: emptyMetric(8, 'E', 'Chờ module evaluate 7 tài xế (Block O mở rộng)'),
      },
      computed_at: new Date().toISOString(),
    };
  }

  const tripsThisMonth = await fetchTripsForMonth(teamDriverIds, period.from, period.to);

  // 1. late_pickup_count: trễ > 5 phút trong tháng
  const lateCount = tripsThisMonth.filter(
    (t) => t.departure_diff_minutes !== null && t.departure_diff_minutes > 5
  ).length;
  const lateMetric: Metric = {
    value: lateCount,
    target: 0,
    score: scoreLatePickup(lateCount),
    category: 'A',
  };

  // 2. on_time_rate_pct
  const withDiff = tripsThisMonth.filter((t) => t.departure_diff_minutes !== null);
  let onTimeMetric: Metric;
  if (withDiff.length === 0) {
    onTimeMetric = {
      value: null,
      target: 95,
      score: null,
      category: 'D',
      note: 'Chưa có post_trip nào của team trong tháng — không tính được tỷ lệ đúng giờ',
    };
  } else {
    const onTime = withDiff.filter((t) => {
      const d = t.departure_diff_minutes;
      return d !== null && d >= -5 && d <= 5;
    }).length;
    const pct = round1((onTime / withDiff.length) * 100);
    onTimeMetric = {
      value: pct,
      target: 95,
      score: scoreHigherBetter(pct, [95, 85, 70, 50]),
      category: 'D',
    };
  }

  // 3. maintenance_on_time_pct — proxy: vehicles team dùng trong tháng có
  //    inspection.expiry_date >= today.
  //    Note: schema chưa có cột "next_maintenance_date" (xem ROADMAP §6).
  //    Đang dùng vehicle_inspections.expiry_date làm proxy — chờ PM xác định
  //    định nghĩa chuẩn (Block U hoặc spec lại).
  const usedVehicleIds = Array.from(
    new Set(tripsThisMonth.map((t) => t.vehicle_id).filter((v): v is string => Boolean(v)))
  );
  let maintMetric: Metric;
  if (usedVehicleIds.length === 0) {
    maintMetric = {
      value: null,
      target: 95,
      score: null,
      category: 'D',
      note: 'Không có chuyến xe nào của team trong tháng — không xác định được fleet',
    };
  } else {
    const okCount = await countVehiclesWithValidInspection(usedVehicleIds);
    const pct = round1((okCount / usedVehicleIds.length) * 100);
    maintMetric = {
      value: pct,
      target: 95,
      score: scoreHigherBetter(pct, [95, 85, 70, 50]),
      category: 'D',
      note: 'Proxy: vehicle_inspections.expiry_date >= today. Chờ định nghĩa chuẩn "next_maintenance_date" (PM review).',
    };
  }

  // 4. fleet_cost_vs_prev_month_pct
  const costThis = await sumTeamCosts(teamDriverIds, period.from, period.to);
  const prevPeriod = buildPeriod(prevMonth(period.month));
  const costPrev = await sumTeamCosts(teamDriverIds, prevPeriod.from, prevPeriod.to);
  let costMetric: Metric;
  if (costPrev === 0) {
    costMetric = {
      value: null,
      target: 0,
      score: null,
      category: 'D',
      note: `Không có chi phí tháng trước (${prevPeriod.month}) để so sánh`,
    };
  } else {
    const pct = round1(((costThis - costPrev) / costPrev) * 100);
    costMetric = {
      value: pct,
      target: 0,
      score: scoreLowerBetter(pct, [0, 5, 10, 20]),
      category: 'D',
    };
  }

  // 5. team_avg_kpi — NULL chờ Block O
  const teamAvgKpi: Metric = {
    value: null,
    target: 8,
    score: null,
    category: 'E',
    note: 'Chờ module evaluate 7 tài xế (Block O mở rộng)',
  };

  return {
    driver: { email: driverEmail, name: driverName },
    period,
    team_size: teamDriverIds.length,
    metrics: {
      late_pickup_count: lateMetric,
      on_time_rate_pct: onTimeMetric,
      maintenance_on_time_pct: maintMetric,
      fleet_cost_vs_prev_month_pct: costMetric,
      team_avg_kpi: teamAvgKpi,
    },
    computed_at: new Date().toISOString(),
  };
}

// ---------- DB helpers ----------

async function fetchDriverName(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('drivers')
    .select('full_name')
    .ilike('email', email)
    .maybeSingle();
  if (data?.full_name) return data.full_name as string;

  const { data: s } = await admin
    .from('staff')
    .select('name')
    .ilike('email', email)
    .maybeSingle();
  return ((s as { name?: string | null } | null)?.name) ?? null;
}

async function fetchTeam(teamLeadEmail: string): Promise<TeamDriver[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('drivers')
    .select('id, email')
    .ilike('team_lead_email', teamLeadEmail);
  if (error) {
    console.error('[kpi] fetchTeam error', error.message);
    return [];
  }
  return (data as TeamDriver[]) || [];
}

async function fetchTripsForMonth(
  driverIds: string[],
  fromDate: string,
  toDate: string
): Promise<TripRow[]> {
  if (driverIds.length === 0) return [];
  const admin = createAdminClient();

  const { data: bookings, error: bErr } = await admin
    .from('bookings')
    .select('id, driver_id, vehicle_id')
    .in('driver_id', driverIds)
    .gte('trip_date', fromDate)
    .lte('trip_date', toDate);
  if (bErr) {
    console.error('[kpi] fetchTripsForMonth bookings error', bErr.message);
    return [];
  }
  type Booking = { id: string; driver_id: string; vehicle_id: string | null };
  const rows = (bookings as Booking[]) || [];
  if (rows.length === 0) return [];

  const ids = rows.map((b) => b.id);
  const { data: posts, error: pErr } = await admin
    .from('post_trips')
    .select('booking_id, departure_diff_minutes')
    .in('booking_id', ids);
  if (pErr) {
    console.error('[kpi] fetchTripsForMonth post_trips error', pErr.message);
  }
  const diffByBooking = new Map<string, number | null>();
  ((posts as { booking_id: string; departure_diff_minutes: number | null }[]) || []).forEach((p) => {
    diffByBooking.set(p.booking_id, p.departure_diff_minutes);
  });

  return rows.map((b) => ({
    driver_id: b.driver_id,
    vehicle_id: b.vehicle_id,
    departure_diff_minutes: diffByBooking.has(b.id) ? diffByBooking.get(b.id) ?? null : null,
  }));
}

async function countVehiclesWithValidInspection(vehicleIds: string[]): Promise<number> {
  if (vehicleIds.length === 0) return 0;
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await admin
    .from('vehicle_inspections')
    .select('vehicle_id, expiry_date')
    .in('vehicle_id', vehicleIds)
    .gte('expiry_date', today);
  if (error) {
    console.error('[kpi] countVehiclesWithValidInspection error', error.message);
    return 0;
  }
  const rows = (data as { vehicle_id: string }[]) || [];
  return new Set(rows.map((r) => r.vehicle_id)).size;
}

async function sumTeamCosts(driverIds: string[], fromDate: string, toDate: string): Promise<number> {
  if (driverIds.length === 0) return 0;
  const admin = createAdminClient();
  const { data: bookings } = await admin
    .from('bookings')
    .select('id')
    .in('driver_id', driverIds)
    .gte('trip_date', fromDate)
    .lte('trip_date', toDate);
  const ids = ((bookings as { id: string }[]) || []).map((b) => b.id);
  if (ids.length === 0) return 0;
  const { data: costs, error } = await admin
    .from('post_trip_costs')
    .select('amount')
    .in('booking_id', ids);
  if (error) {
    console.error('[kpi] sumTeamCosts error', error.message);
    return 0;
  }
  return ((costs as { amount: number | string | null }[]) || []).reduce(
    (sum, c) => sum + Number(c.amount ?? 0),
    0
  );
}

// ---------- Misc ----------

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function scoreLatePickup(count: number): MetricScore {
  // 0→5, 1→4, 2→3, 3→2, ≥4→1
  if (count <= 0) return 5;
  if (count >= 4) return 1;
  return (5 - count) as MetricScore;
}

function emptyMetric(target: number, category: MetricCategory, note: string): Metric {
  return { value: null, target, score: null, category, note };
}
