import { createClient } from '@/lib/supabase/server';
import { STATUS_LABELS, STATUS_COLORS } from '@/config/constants';
import type { BookingStatus } from '@/types/database';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch stats
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, trip_date, requester_name, requester_department, purpose, pickup_time, driver_id, vehicle_id')
    .order('created_at', { ascending: false })
    .limit(50);

  const today = new Date().toISOString().split('T')[0];

  const stats = {
    cho_duyet: 0,
    da_duyet: 0,
    cho_tx_xac_nhan: 0,
    tx_tu_choi: 0,
    da_hoan_thanh: 0,
    da_huy: 0,
    today: 0,
  };

  bookings?.forEach((b) => {
    if (b.status in stats) stats[b.status as keyof typeof stats]++;
    if (b.trip_date === today) stats.today++;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Tong quan</h2>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Cho duyet', value: stats.cho_duyet, color: 'bg-yellow-50 text-yellow-700' },
          { label: 'Cho TX xac nhan', value: stats.cho_tx_xac_nhan, color: 'bg-blue-50 text-blue-700' },
          { label: 'TX tu choi', value: stats.tx_tu_choi, color: 'bg-rose-50 text-rose-700' },
          { label: 'Hom nay', value: stats.today, color: 'bg-emerald-50 text-emerald-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent bookings */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Yeu cau gan day</h3>
        <div className="space-y-2">
          {bookings?.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-start justify-between"
            >
              <div>
                <div className="font-medium text-slate-900">{b.purpose}</div>
                <div className="text-sm text-slate-500 mt-1">
                  {b.requester_name} — {b.requester_department}
                </div>
                <div className="text-sm text-slate-500">
                  {b.trip_date} {b.pickup_time}
                </div>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  STATUS_COLORS[b.status as BookingStatus] || 'bg-gray-100 text-gray-600'
                }`}
              >
                {STATUS_LABELS[b.status as BookingStatus] || b.status}
              </span>
            </div>
          ))}

          {(!bookings || bookings.length === 0) && (
            <div className="text-center py-12 text-slate-400">
              Chua co yeu cau nao
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
