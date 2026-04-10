import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { buildConfirmBookerEmail, buildDriverRejectEmail } from '@/lib/email-templates';

// Helper: lấy booking data cho email
async function getBookingEmailData(supabase: ReturnType<typeof createAdminClient>, bookingId: string) {
  const { data: b } = await supabase.from('bookings').select(`
    *, driver:drivers(full_name, phone, email), vehicle:vehicles(plate_number, vehicle_type)
  `).eq('id', bookingId).single();
  if (!b) return null;

  const driver = Array.isArray(b.driver) ? b.driver[0] : b.driver;
  const vehicle = Array.isArray(b.vehicle) ? b.vehicle[0] : b.vehicle;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://esuhai-booking-xe-v2.vercel.app';

  return {
    bookingId: b.id,
    purpose: b.purpose,
    category: b.category,
    tripDate: b.trip_date,
    pickupTime: b.pickup_time,
    endTime: b.end_time,
    itinerary: b.itinerary,
    passengerCount: b.passenger_count,
    requesterName: b.requester_name,
    requesterDepartment: b.requester_department,
    requesterEmail: b.requester_email,
    staffInCharge: b.staff_in_charge,
    flightNumber: b.flight_number,
    memberNames: b.member_names,
    driverName: driver?.full_name,
    driverPhone: driver?.phone,
    driverEmail: driver?.email,
    vehicleType: vehicle?.vehicle_type,
    plateNumber: vehicle?.plate_number,
    rejectionReason: b.rejection_reason,
    driverRejectionReason: b.driver_rejection_reason,
    dashboardUrl: `${appUrl}/dashboard`,
    confirmUrl: `${appUrl}/driver-response?action=confirm&id=${b.id}`,
    rejectUrl: `${appUrl}/driver-response?action=reject&id=${b.id}`,
  };
}

// Helper: lấy email config
async function getEmailConfig(supabase: ReturnType<typeof createAdminClient>) {
  const { data } = await supabase.from('system_config').select('key, value')
    .in('key', ['manager_email', 'always_cc']);
  const config: Record<string, string> = {};
  data?.forEach(c => { config[c.key] = c.value; });
  return config;
}

// Helper: log email
async function logEmail(supabase: ReturnType<typeof createAdminClient>, bookingId: string, templateName: string, to: string, subject: string, success: boolean, error?: string) {
  await supabase.from('email_logs').insert({
    booking_id: bookingId, template_name: templateName,
    recipient_email: to, subject,
    status: success ? 'sent' : 'failed',
    error_message: error || null,
  });
}

export async function POST(request: Request) {
  try {
    const { action, booking_id, reason, token } = await request.json();

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

    // --- Security: Verify token matches the driver assigned to this booking ---
    // Token = driver_id (included in the email link). Only the assigned driver knows their own link.
    // This prevents random users from confirming/rejecting on behalf of the driver.
    if (!token || token !== booking.driver_id) {
      return NextResponse.json({ error: 'Invalid or missing verification token' }, { status: 403 });
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

      // Gửi email xác nhận chuyến xe cho người đăng ký + CC quản lý
      const emailData = await getBookingEmailData(supabase, booking_id);
      if (emailData) {
        const config = await getEmailConfig(supabase);

        // Email cho người đăng ký (Xe đã sẵn sàng)
        if (emailData.requesterEmail) {
          const tpl = buildConfirmBookerEmail(emailData);
          const result = await sendEmail({ to: emailData.requesterEmail, cc: config.always_cc, subject: tpl.subject, html: tpl.html });
          await logEmail(supabase, booking_id, 'confirm_booker', emailData.requesterEmail, tpl.subject, result.success, result.error);
        }

        // Email cho quản lý (same template)
        if (config.manager_email && config.manager_email !== emailData.requesterEmail) {
          const tpl = buildConfirmBookerEmail(emailData);
          const result = await sendEmail({ to: config.manager_email, cc: config.always_cc, subject: tpl.subject, html: tpl.html });
          await logEmail(supabase, booking_id, 'confirm_manager', config.manager_email, tpl.subject, result.success, result.error);
        }
      }

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

      // Gửi email từ chối cho quản lý để phân bổ lại
      const emailData = await getBookingEmailData(supabase, booking_id);
      if (emailData) {
        const config = await getEmailConfig(supabase);
        if (config.manager_email) {
          const tpl = buildDriverRejectEmail({ ...emailData, rejectionReason: reason });
          const result = await sendEmail({ to: config.manager_email, cc: config.always_cc, subject: tpl.subject, html: tpl.html });
          await logEmail(supabase, booking_id, 'driver_reject_notify', config.manager_email, tpl.subject, result.success, result.error);
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
