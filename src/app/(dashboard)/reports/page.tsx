import { createClient } from '@/lib/supabase/server';

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, trip_date, requester_department, driver_id, vehicle_id, passenger_count, is_external_vehicle')
    .order('trip_date', { ascending: false });

  const { data: postTrips } = await supabase
    .from('post_trips')
    .select('booking_id, total_km, overnight_hours, departure_diff_minutes, return_diff_minutes');

  const { data: costs } = await supabase
    .from('post_trip_costs')
    .select('booking_id, cost_category, amount');

  const { data: evaluations } = await supabase
    .from('trip_evaluations')
    .select('booking_id, average_score');

  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, full_name');

  const list = bookings || [];
  const completed = list.filter(b => b.status === 'da_hoan_thanh');
  const cancelled = list.filter(b => b.status === 'da_huy');
  const rejected = list.filter(b => b.status === 'khong_duyet');

  // Thống kê theo phòng ban
  const deptStats: Record<string, number> = {};
  list.filter(b => !['khong_duyet', 'da_huy'].includes(b.status)).forEach(b => {
    deptStats[b.requester_department] = (deptStats[b.requester_department] || 0) + 1;
  });
  const deptSorted = Object.entries(deptStats).sort((a, b) => b[1] - a[1]);

  // Thống kê theo tài xế
  const driverStats: Record<string, number> = {};
  completed.forEach(b => {
    if (b.driver_id) driverStats[b.driver_id] = (driverStats[b.driver_id] || 0) + 1;
  });
  const driverMap = Object.fromEntries((drivers || []).map(d => [d.id, d.full_name]));

  // Tổng KM
  const totalKm = (postTrips || []).reduce((sum, pt) => sum + (pt.total_km || 0), 0);

  // Tổng chi phí
  const totalCost = (costs || []).reduce((sum, c) => sum + (c.amount || 0), 0);
  const costByCategory: Record<string, number> = {};
  (costs || []).forEach(c => {
    costByCategory[c.cost_category] = (costByCategory[c.cost_category] || 0) + (c.amount || 0);
  });

  // Đánh giá trung bình
  const avgScores = evaluations || [];
  const avgScore = avgScores.length > 0
    ? (avgScores.reduce((s, e) => s + (e.average_score || 0), 0) / avgScores.length).toFixed(1)
    : '—';

  // Tổng giờ làm đêm
  const totalOvernight = (postTrips || []).reduce((sum, pt) => sum + (pt.overnight_hours || 0), 0);

  const COST_LABELS: Record<string, string> = {
    sua_chua: 'Sửa chữa', thay_moi: 'Thay mới', cau_duong: 'Cầu đường',
    do_xe: 'Đỗ xe', xang_dau: 'Xăng dầu', kiem_dinh: 'Kiểm định',
    thue_xe: 'Thuê xe', khac: 'Khác',
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Báo cáo</h2>

      {/* Tổng quan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tổng yêu cầu', value: list.length, color: 'bg-blue-50 text-blue-700' },
          { label: 'Hoàn thành', value: completed.length, color: 'bg-green-50 text-green-700' },
          { label: 'Đã huỷ', value: cancelled.length, color: 'bg-gray-50 text-gray-600' },
          { label: 'Không duyệt', value: rejected.length, color: 'bg-red-50 text-red-700' },
          { label: 'Tổng KM', value: totalKm.toLocaleString() + ' km', color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Tổng chi phí', value: totalCost.toLocaleString() + ' đ', color: 'bg-amber-50 text-amber-700' },
          { label: 'Đánh giá TB', value: avgScore + '/5', color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Giờ làm đêm', value: totalOvernight.toFixed(1) + ' giờ', color: 'bg-purple-50 text-purple-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Theo phòng ban */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Sử dụng xe theo phòng ban</h3>
          <div className="space-y-2">
            {deptSorted.map(([dept, count]) => (
              <div key={dept} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{dept}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / (deptSorted[0]?.[1] || 1)) * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium text-slate-800 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
            {deptSorted.length === 0 && <p className="text-sm text-slate-400">Chưa có dữ liệu</p>}
          </div>
        </div>

        {/* Theo tài xế */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Chuyến hoàn thành theo tài xế</h3>
          <div className="space-y-2">
            {Object.entries(driverStats).sort((a, b) => b[1] - a[1]).map(([dId, count]) => (
              <div key={dId} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{driverMap[dId] || dId}</span>
                <span className="text-sm font-medium text-slate-800">{count} chuyến</span>
              </div>
            ))}
            {Object.keys(driverStats).length === 0 && <p className="text-sm text-slate-400">Chưa có dữ liệu</p>}
          </div>
        </div>

        {/* Chi phí theo loại */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Chi phí theo loại</h3>
          <div className="space-y-2">
            {Object.entries(costByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{COST_LABELS[cat] || cat}</span>
                <span className="text-sm font-medium text-slate-800">{amount.toLocaleString()} đ</span>
              </div>
            ))}
            {Object.keys(costByCategory).length === 0 && <p className="text-sm text-slate-400">Chưa có chi phí phát sinh</p>}
          </div>
        </div>

        {/* Xe ngoài vs cơ hữu */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Xe cơ hữu vs Xe ngoài</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Xe cơ hữu</span>
              <span className="text-sm font-medium text-slate-800">{list.filter(b => !b.is_external_vehicle).length} yêu cầu</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Xe ngoài</span>
              <span className="text-sm font-medium text-orange-700">{list.filter(b => b.is_external_vehicle).length} yêu cầu</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
