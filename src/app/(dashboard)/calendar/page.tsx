import { createClient } from '@/lib/supabase/server';
import { CalendarClient } from '@/components/booking/calendar-client';

export default async function CalendarPage() {
  const supabase = await createClient();

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, plate_number, vehicle_type, seat_count, is_available')
    .eq('is_available', true)
    .order('vehicle_type');

  const today = new Date();
  const fourWeeksLater = new Date(today);
  fourWeeksLater.setDate(fourWeeksLater.getDate() + 28);

  const { data: rawBookings } = await supabase
    .from('bookings')
    .select(`
      id, purpose, trip_date, pickup_time, end_time,
      requester_name, requester_department, passenger_count,
      status, vehicle_id,
      driver:drivers(full_name, phone),
      vehicle:vehicles(plate_number, vehicle_type)
    `)
    .in('status', ['da_duyet', 'cho_tx_xac_nhan', 'tx_da_nhan', 'san_sang'])
    .gte('trip_date', today.toISOString().split('T')[0])
    .lte('trip_date', fourWeeksLater.toISOString().split('T')[0])
    .order('trip_date');

  // Normalize join results (array → single object)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookings = (rawBookings || []).map((b: any) => ({
    id: b.id as string,
    purpose: b.purpose as string,
    trip_date: b.trip_date as string,
    pickup_time: b.pickup_time as string,
    end_time: b.end_time as string | null,
    requester_name: b.requester_name as string,
    requester_department: b.requester_department as string,
    passenger_count: b.passenger_count as number,
    status: b.status,
    vehicle_id: b.vehicle_id as string | null,
    driver: Array.isArray(b.driver) ? b.driver[0] || null : b.driver || null,
    vehicle: Array.isArray(b.vehicle) ? b.vehicle[0] || null : b.vehicle || null,
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Lịch xe</h2>
      <CalendarClient
        vehicles={vehicles || []}
        bookings={bookings}
      />
    </div>
  );
}
