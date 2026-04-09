import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Google Form submit → GAS onFormSubmit → POST webhook → Supabase
// Cũng dùng cho form tạo yêu cầu trên dashboard ver02
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const isExternal = body.is_external_vehicle === true;

    // Chống duplicate: nếu có v1_row + trip_date, check đã tồn tại chưa
    if (body.v1_row && body.trip_date) {
      const { data: existing } = await supabase
        .from('bookings')
        .select('id')
        .eq('notes', `v1_row:${body.v1_row}`)
        .eq('trip_date', body.trip_date)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ success: true, booking_id: existing.id, duplicate: true });
      }
    }

    const { data, error } = await supabase.from('bookings').insert({
      requester_name: body.requester_name,
      requester_department: body.requester_department,
      requester_email: body.requester_email || null,
      category: body.category || 'Nội bộ',
      purpose: body.purpose,
      trip_date: body.trip_date,
      pickup_time: body.pickup_time,
      end_time: body.end_time || null,
      itinerary: body.itinerary || null,
      passenger_count: body.passenger_count || 1,
      staff_in_charge: body.staff_in_charge || null,
      flight_number: body.flight_number || null,
      member_names: body.member_names || null,
      is_external_vehicle: isExternal,
      is_designated_vehicle: body.is_designated_vehicle || false,
      status: 'cho_duyet',
      max_approval_levels: isExternal ? 3 : 1,
      current_approval_level: 1,
      notes: body.v1_row ? `v1_row:${body.v1_row}` : (body.source === 'dashboard' ? 'Tạo từ dashboard' : null),
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, booking_id: data.id });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
