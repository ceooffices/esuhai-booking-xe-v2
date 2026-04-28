import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import {
  buildConfirmBookerEmail,
  buildConfirmStaffEmail,
  buildConfirmManagerEmail,
  buildDriverRejectEmail,
} from '@/lib/email-templates';

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
    .in('key', ['manager_email', 'manager_name', 'always_cc']);
  const config: Record<string, string> = {};
  data?.forEach(c => { config[c.key] = c.value; });
  return config;
}

// Helper: lookup staff by email/name → trả về name, gender, is_manager
type StaffInfo = { name: string; email: string | null; gender: 'male' | 'female' | null; is_manager: boolean };

async function lookupStaffByEmail(supabase: ReturnType<typeof createAdminClient>, email: string | null | undefined): Promise<StaffInfo | null> {
  if (!email) return null;
  const { data } = await supabase.from('staff')
    .select('name, email, gender, is_manager')
    .eq('email', email)
    .maybeSingle();
  return (data as StaffInfo | null) || null;
}

async function lookupStaffByName(supabase: ReturnType<typeof createAdminClient>, name: string | null | undefined): Promise<StaffInfo | null> {
  if (!name) return null;
  const { data } = await supabase.from('staff')
    .select('name, email, gender, is_manager')
    .eq('name', name)
    .maybeSingle();
  return (data as StaffInfo | null) || null;
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

      // Gửi email xác nhận sau khi tài xế nhận ca:
      //   1. QUẢN LÝ        → buildConfirmManagerEmail  ("Hoàn tất")
      //   2. NGƯỜI ĐĂNG KÝ  → buildConfirmBookerEmail   ("Xe đã sẵn sàng")
      //   3. NV PHỤ TRÁCH   → buildConfirmStaffEmail    ("Lịch xe đã xác nhận")
      // Dedupe: nếu cùng email, chỉ gửi 1 lần (theo template ưu tiên: manager > booker > staff).
      const emailData = await getBookingEmailData(supabase, booking_id);
      if (emailData) {
        const config = await getEmailConfig(supabase);
        const sentToEmails = new Set<string>();

        async function sendOnce(to: string | null | undefined, templateName: string, build: () => { subject: string; html: string }) {
          if (!to || sentToEmails.has(to)) return;
          sentToEmails.add(to);
          const tpl = build();
          const result = await sendEmail({ to, cc: config.always_cc, subject: tpl.subject, html: tpl.html });
          await logEmail(supabase, booking_id, templateName, to, tpl.subject, result.success, result.error);
        }

        // 1. QUẢN LÝ — luôn nhận thông báo "Hoàn tất" (fix bug chị Hà)
        const managerInfo = await lookupStaffByEmail(supabase, config.manager_email);
        await sendOnce(config.manager_email, 'confirm_manager', () => buildConfirmManagerEmail({
          ...emailData,
          managerName: managerInfo?.name || config.manager_name || '',
          managerGender: managerInfo?.gender || undefined,
        }));

        // 2. NGƯỜI ĐĂNG KÝ — chỉ gửi khi khác manager
        const requesterInfo = await lookupStaffByEmail(supabase, emailData.requesterEmail);
        await sendOnce(emailData.requesterEmail, 'confirm_booker', () => buildConfirmBookerEmail({
          ...emailData,
          requesterGender: requesterInfo?.gender || undefined,
        }));

        // 3. NV PHỤ TRÁCH — lookup theo tên trong staff table
        const staffInfo = await lookupStaffByName(supabase, emailData.staffInCharge);
        await sendOnce(staffInfo?.email, 'confirm_staff', () => buildConfirmStaffEmail({
          ...emailData,
          staffInChargeGender: staffInfo?.gender || undefined,
        }));
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
