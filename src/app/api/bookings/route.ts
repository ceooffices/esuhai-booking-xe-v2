import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/bookings?status=cho_duyet&date=2026-04-09
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const date = searchParams.get('date');

  const supabase = await createClient();

  let query = supabase
    .from('bookings')
    .select(`
      *,
      vehicle:vehicles(plate_number, vehicle_type),
      driver:drivers(full_name, phone)
    `)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (date) query = query.eq('trip_date', date);

  const { data, error } = await query.limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
