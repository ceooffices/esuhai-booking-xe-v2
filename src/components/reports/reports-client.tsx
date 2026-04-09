'use client';

import { useState, useMemo } from 'react';
import { FadeIn, PageTransition } from '@/components/ui/animations';

interface Booking {
  id: string; status: string; trip_date: string;
  requester_department: string; driver_id: string | null;
  vehicle_id: string | null; passenger_count: number;
  is_external_vehicle: boolean; created_at: string;
}

interface PostTrip { booking_id: string; total_km: number | null; overnight_hours: number | null; }
interface Cost { booking_id: string; cost_category: string; amount: number | null; }
interface Evaluation { booking_id: string; average_score: number | null; }
interface Driver { id: string; full_name: string; }

type Period = 'week' | 'month' | 'quarter' | 'year' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Tuần này', month: 'Tháng này', quarter: 'Quý này', year: 'Năm nay', all: 'Tất cả',
};

const COST_LABELS: Record<string, string> = {
  sua_chua: 'Sửa chữa', thay_moi: 'Thay mới', cau_duong: 'Cầu đường',
  do_xe: 'Đỗ xe', xang_dau: 'Xăng dầu', kiem_dinh: 'Kiểm định',
  thue_xe: 'Thuê xe', khac: 'Khác',
};

function getStartDate(period: Period): Date {
  const now = new Date();
  switch (period) {
    case 'week': { const d = new Date(now); d.setDate(d.getDate() - d.getDay() + 1); d.setHours(0, 0, 0, 0); return d; }
    case 'month': return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarter': { const q = Math.floor(now.getMonth() / 3) * 3; return new Date(now.getFullYear(), q, 1); }
    case 'year': return new Date(now.getFullYear(), 0, 1);
    case 'all': return new Date(2020, 0, 1);
  }
}

interface Props {
  bookings: Booking[]; postTrips: PostTrip[]; costs: Cost[];
  evaluations: Evaluation[]; drivers: Driver[];
}

export function ReportsClient({ bookings, postTrips, costs, evaluations, drivers }: Props) {
  const [period, setPeriod] = useState<Period>('month');

  const filtered = useMemo(() => {
    const start = getStartDate(period).toISOString().split('T')[0];
    return bookings.filter(b => b.trip_date >= start);
  }, [bookings, period]);

  const filteredIds = new Set(filtered.map(b => b.id));

  const completed = filtered.filter(b => b.status === 'da_hoan_thanh');
  const cancelled = filtered.filter(b => b.status === 'da_huy');
  const rejected = filtered.filter(b => b.status === 'khong_duyet');
  const active = filtered.filter(b => !['da_hoan_thanh', 'da_huy', 'khong_duyet'].includes(b.status));

  // Thống kê phòng ban
  const deptStats: Record<string, number> = {};
  filtered.filter(b => !['khong_duyet', 'da_huy'].includes(b.status)).forEach(b => {
    deptStats[b.requester_department] = (deptStats[b.requester_department] || 0) + 1;
  });
  const deptSorted = Object.entries(deptStats).sort((a, b) => b[1] - a[1]);
  const maxDept = deptSorted[0]?.[1] || 1;

  // Thống kê tài xế
  const driverStats: Record<string, number> = {};
  completed.forEach(b => { if (b.driver_id) driverStats[b.driver_id] = (driverStats[b.driver_id] || 0) + 1; });
  const driverMap = Object.fromEntries(drivers.map(d => [d.id, d.full_name]));

  // KM, chi phí, đánh giá, giờ đêm
  const fPostTrips = postTrips.filter(pt => filteredIds.has(pt.booking_id));
  const fCosts = costs.filter(c => filteredIds.has(c.booking_id));
  const fEvals = evaluations.filter(e => filteredIds.has(e.booking_id));

  const totalKm = fPostTrips.reduce((s, pt) => s + (pt.total_km || 0), 0);
  const totalCost = fCosts.reduce((s, c) => s + (c.amount || 0), 0);
  const totalOvernight = fPostTrips.reduce((s, pt) => s + (pt.overnight_hours || 0), 0);
  const avgScore = fEvals.length > 0
    ? (fEvals.reduce((s, e) => s + (e.average_score || 0), 0) / fEvals.length).toFixed(1)
    : '—';

  const costByCategory: Record<string, number> = {};
  fCosts.forEach(c => { costByCategory[c.cost_category] = (costByCategory[c.cost_category] || 0) + (c.amount || 0); });

  return (
    <PageTransition className="space-y-5">
      {/* Filter period */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition min-h-0 ${
              period === p ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Tổng quan */}
      <FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Tổng yêu cầu', value: filtered.length, color: 'bg-blue-50 text-blue-700' },
            { label: 'Hoàn thành', value: completed.length, color: 'bg-green-50 text-green-700' },
            { label: 'Đang xử lý', value: active.length, color: 'bg-amber-50 text-amber-700' },
            { label: 'Đã huỷ', value: cancelled.length, color: 'bg-gray-50 text-gray-600' },
            { label: 'Không duyệt', value: rejected.length, color: 'bg-red-50 text-red-700' },
            { label: 'Tổng KM', value: totalKm.toLocaleString() + ' km', color: 'bg-indigo-50 text-indigo-700' },
            { label: 'Tổng chi phí', value: totalCost.toLocaleString() + ' đ', color: 'bg-amber-50 text-amber-700' },
            { label: 'Đánh giá TB', value: avgScore + '/5', color: 'bg-emerald-50 text-emerald-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </FadeIn>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Phòng ban */}
        <FadeIn delay={0.1}>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-base font-bold text-slate-800 mb-4">Sử dụng xe theo phòng ban</h3>
            <div className="space-y-3">
              {deptSorted.map(([dept, count]) => (
                <div key={dept}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{dept}</span>
                    <span className="text-sm font-bold text-slate-800">{count} chuyến</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(count / maxDept) * 100}%` }} />
                  </div>
                </div>
              ))}
              {deptSorted.length === 0 && <p className="text-sm text-slate-400">Chưa có dữ liệu</p>}
            </div>
          </div>
        </FadeIn>

        {/* Tài xế */}
        <FadeIn delay={0.15}>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-base font-bold text-slate-800 mb-4">Chuyến hoàn thành theo tài xế</h3>
            <div className="space-y-3">
              {Object.entries(driverStats).sort((a, b) => b[1] - a[1]).map(([dId, count]) => (
                <div key={dId} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm font-medium text-slate-700">{driverMap[dId] || dId}</span>
                  <span className="text-sm font-bold text-emerald-700">{count} chuyến</span>
                </div>
              ))}
              {Object.keys(driverStats).length === 0 && <p className="text-sm text-slate-400">Chưa có dữ liệu</p>}
            </div>
          </div>
        </FadeIn>

        {/* Chi phí */}
        <FadeIn delay={0.2}>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-base font-bold text-slate-800 mb-4">Chi phí theo loại</h3>
            <div className="space-y-3">
              {Object.entries(costByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                <div key={cat} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm font-medium text-slate-700">{COST_LABELS[cat] || cat}</span>
                  <span className="text-sm font-bold text-slate-800">{amount.toLocaleString()} đ</span>
                </div>
              ))}
              {Object.keys(costByCategory).length === 0 && <p className="text-sm text-slate-400">Chưa có chi phí</p>}
            </div>
          </div>
        </FadeIn>

        {/* Xe cơ hữu vs ngoài + giờ đêm */}
        <FadeIn delay={0.25}>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-base font-bold text-slate-800 mb-4">Tổng hợp</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Xe cơ hữu</span>
                <span className="text-sm font-bold text-slate-800">{filtered.filter(b => !b.is_external_vehicle).length} yêu cầu</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Xe ngoài</span>
                <span className="text-sm font-bold text-orange-700">{filtered.filter(b => b.is_external_vehicle).length} yêu cầu</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Tổng giờ làm đêm</span>
                <span className="text-sm font-bold text-purple-700">{totalOvernight.toFixed(1)} giờ</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-slate-700">Tổng số người di chuyển</span>
                <span className="text-sm font-bold text-slate-800">{filtered.reduce((s, b) => s + b.passenger_count, 0)} người</span>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
