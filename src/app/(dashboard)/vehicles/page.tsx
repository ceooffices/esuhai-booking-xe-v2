import { createClient } from '@/lib/supabase/server';

export default async function VehiclesPage() {
  const supabase = await createClient();
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .order('vehicle_type');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Phuong tien</h2>
      <div className="grid gap-3">
        {vehicles?.map((v) => (
          <div key={v.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">{v.vehicle_type}</div>
                <div className="text-sm text-slate-500">{v.plate_number} — {v.brand} — {v.seat_count} cho</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                v.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {v.is_available ? 'Kha dung' : 'Khong kha dung'}
              </span>
            </div>
          </div>
        ))}
        {(!vehicles || vehicles.length === 0) && (
          <div className="text-center py-12 text-slate-400">Chua co phuong tien nao</div>
        )}
      </div>
    </div>
  );
}
