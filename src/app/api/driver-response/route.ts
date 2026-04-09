import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { action, booking_id, reason } = await request.json();

    if (!action || !booking_id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify booking exists and is in correct state
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, status, driver_id')
      .eq('id', booking_id)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'cho_tx_xac_nhan') {
      return NextResponse.json({
        success: true,
        message: 'Already processed',
      });
    }

    if (action === 'confirm') {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'tx_da_nhan',
          driver_confirmed_at: new Date().toISOString(),
        })
        .eq('id', booking_id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // TODO: Send confirmation emails to booker, staff, manager

      return NextResponse.json({ success: true });
    }

    if (action === 'reject') {
      if (!reason?.trim()) {
        return NextResponse.json({ error: 'Reason required' }, { status: 400 });
      }

      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'tx_tu_choi',
          driver_rejection_reason: reason,
        })
        .eq('id', booking_id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // TODO: Send rejection email to manager

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
