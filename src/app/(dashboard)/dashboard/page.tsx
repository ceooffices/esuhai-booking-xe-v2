import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from '@/components/booking/dashboard-client';
import type { BookingStatus } from '@/types/database';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch bookings with driver/vehicle joins
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      driver:drivers(full_name, phone),
      vehicle:vehicles(plate_number, vehicle_type)
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  // Fetch drivers and vehicles for assignment
  const [{ data: drivers }, { data: vehicles }] = await Promise.all([
    supabase.from('drivers').select('id, full_name, phone, is_available').order('full_name'),
    supabase.from('vehicles').select('id, plate_number, vehicle_type, seat_count, is_available').order('vehicle_type'),
  ]);

  const today = new Date().toISOString().split('T')[0];
  const list = bookings || [];

  const stats = {
    pending: list.filter(b => ['cho_duyet', 'cho_duyet_cap2', 'cho_duyet_cap3'].includes(b.status)).length,
    approved: list.filter(b => b.status === 'da_duyet').length,
    waiting: list.filter(b => ['cho_tx_xac_nhan', 'tx_da_nhan'].includes(b.status)).length,
    rejected: list.filter(b => b.status === 'tx_tu_choi').length,
    today: list.filter(b => b.trip_date === today).length,
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Quan ly Booking</h2>
      <DashboardClient
        bookings={list}
        drivers={drivers || []}
        vehicles={vehicles || []}
        userEmail={user?.email || ''}
        stats={stats}
      />
    </div>
  );
}
