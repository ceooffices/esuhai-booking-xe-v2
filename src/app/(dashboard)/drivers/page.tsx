import { createClient } from '@/lib/supabase/server';
import { DriversClient } from '@/components/drivers/drivers-client';

export default async function DriversPage() {
  const supabase = await createClient();

  const { data: drivers } = await supabase
    .from('drivers')
    .select('*')
    .order('full_name');

  // Đếm số chuyến đã phục vụ cho mỗi tài xế
  const { data: bookings } = await supabase
    .from('bookings')
    .select('driver_id, status')
    .not('driver_id', 'is', null);

  const tripCounts: Record<string, { total: number; completed: number }> = {};
  bookings?.forEach(b => {
    if (!b.driver_id) return;
    if (!tripCounts[b.driver_id]) tripCounts[b.driver_id] = { total: 0, completed: 0 };
    tripCounts[b.driver_id].total++;
    if (b.status === 'da_hoan_thanh') tripCounts[b.driver_id].completed++;
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Quản lý Tài xế</h2>
      <DriversClient drivers={drivers || []} tripCounts={tripCounts} />
    </div>
  );
}
