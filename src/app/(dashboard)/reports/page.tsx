import { createClient } from '@/lib/supabase/server';
import { ReportsClient } from '@/components/reports/reports-client';

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, trip_date, requester_department, driver_id, vehicle_id, passenger_count, is_external_vehicle, created_at')
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

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Báo cáo</h2>
      <ReportsClient
        bookings={bookings || []}
        postTrips={postTrips || []}
        costs={costs || []}
        evaluations={evaluations || []}
        drivers={drivers || []}
      />
    </div>
  );
}
