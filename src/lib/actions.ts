'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { buildDriverAssignEmail, buildCancellationEmail, buildRejectAllEmail } from '@/lib/email-templates';
import type { BookingStatus } from '@/types/database';

async function requireAuthUserEmail() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) throw new Error('Unauthorized');
  return user.email;
}

// Helper: lấy booking data cho email template
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

// Helper: lấy config email
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

// Helper: thu thập TOÀN BỘ thành viên tham gia quy trình
function collectRecipients(
  emailData: Awaited<ReturnType<typeof getBookingEmailData>>,
  config: Record<string, string>
): { email: string; name: string }[] {
  if (!emailData) return [];
  const recipients: { email: string; name: string }[] = [];
  const seen = new Set<string>();

  function add(email: string | undefined | null, name: string) {
    if (!email || seen.has(email)) return;
    seen.add(email);
    recipients.push({ email, name });
  }

  // Người yêu cầu
  add(emailData.requesterEmail, `anh/chị ${emailData.requesterName}`);
  // Tài xế (nếu đã phân công)
  add(emailData.driverEmail, `anh ${emailData.driverName}`);
  // Quản lý
  add(config.manager_email, 'chị');

  return recipients;
}

// --- Approve Booking (handles multi-level) ---
export async function approveBooking(bookingId: string, clientApproverEmail?: string) {
  let approverEmail = clientApproverEmail || '';
  try {
    approverEmail = await requireAuthUserEmail();
  } catch (e) {
    return { error: 'Unauthorized' };
  }
  
  const supabase = createAdminClient();

  const { data: booking, error } = await supabase
    .from('bookings').select('*').eq('id', bookingId).single();

  if (error || !booking) return { error: 'Không tìm thấy yêu cầu' };

  const level = booking.current_approval_level;
  const maxLevels = booking.max_approval_levels;

  const expectedStatus: Record<number, BookingStatus> = {
    1: 'cho_duyet', 2: 'cho_duyet_cap2', 3: 'cho_duyet_cap3',
  };
  if (booking.status !== expectedStatus[level]) {
    return { error: 'Yêu cầu không ở trạng thái chờ duyệt' };
  }

  let updateData: Record<string, unknown>;

  if (level >= maxLevels) {
    updateData = {
      status: 'da_duyet' as BookingStatus,
      [`approved_by_l${level}`]: approverEmail,
      [`approved_at_l${level}`]: new Date().toISOString(),
    };
  } else {
    const nextLevel = level + 1;
    updateData = {
      status: `cho_duyet_cap${nextLevel}` as BookingStatus,
      current_approval_level: nextLevel,
      [`approved_by_l${level}`]: approverEmail,
      [`approved_at_l${level}`]: new Date().toISOString(),
    };
  }

  const { error: updateErr } = await supabase
    .from('bookings').update(updateData).eq('id', bookingId);

  if (updateErr) return { error: updateErr.message };

  return { success: true, newStatus: updateData.status };
}

// --- Reject Booking ---
export async function rejectBooking(bookingId: string, clientRejectedBy: string, reason: string) {
  let rejectedBy = clientRejectedBy;
  try {
    rejectedBy = await requireAuthUserEmail();
  } catch (e) {
    return { error: 'Unauthorized' };
  }

  const supabase = createAdminClient();
  if (!reason.trim()) return { error: 'Vui lòng nhập lý do' };

  const { error } = await supabase.from('bookings').update({
    status: 'khong_duyet' as BookingStatus,
    rejection_reason: reason,
    rejected_by: rejectedBy,
  }).eq('id', bookingId);

  if (error) return { error: error.message };

  // Gửi email thông báo không duyệt cho TOÀN BỘ thành viên
  const emailData = await getBookingEmailData(supabase, bookingId);
  if (emailData) {
    const config = await getEmailConfig(supabase);
    const recipients = collectRecipients(emailData, config);

    for (const r of recipients) {
      const tpl = buildRejectAllEmail({ ...emailData, rejectionReason: reason, recipientName: r.name });
      const result = await sendEmail({ to: r.email, cc: config.always_cc, subject: tpl.subject, html: tpl.html });
      await logEmail(supabase, bookingId, 'reject_all', r.email, tpl.subject, result.success, result.error);
    }
  }

  return { success: true };
}

// --- Assign Driver + Vehicle ---
export async function assignDriverVehicle(bookingId: string, driverId: string, vehicleId: string) {
  try {
    await requireAuthUserEmail();
  } catch (e) {
    return { error: 'Unauthorized' };
  }
  const supabase = createAdminClient();

  const { data: driver } = await supabase
    .from('drivers').select('full_name, phone, email').eq('id', driverId).single();

  if (!driver) return { error: 'Tài xế không tồn tại' };
  if (!driver.email) return { error: `Tài xế ${driver.full_name} chưa có email` };

  const { error } = await supabase.from('bookings').update({
    driver_id: driverId,
    vehicle_id: vehicleId,
    status: 'cho_tx_xac_nhan' as BookingStatus,
  }).eq('id', bookingId);

  if (error) return { error: error.message };

  // Gửi email phân công cho tài xế
  const emailData = await getBookingEmailData(supabase, bookingId);
  if (emailData) {
    const config = await getEmailConfig(supabase);
    const tpl = buildDriverAssignEmail(emailData as Parameters<typeof buildDriverAssignEmail>[0]);
    const result = await sendEmail({
      to: driver.email,
      cc: config.always_cc,
      subject: tpl.subject,
      html: tpl.html,
    });
    await logEmail(supabase, bookingId, 'driver_assign', driver.email, tpl.subject, result.success, result.error);
  }

  return { success: true, driverName: driver.full_name };
}

// --- Cancel Booking (bắt buộc lý do + thông báo toàn bộ) ---
export async function cancelBooking(bookingId: string, clientCancelledBy: string, reason: string) {
  let cancelledBy = clientCancelledBy;
  try {
    cancelledBy = await requireAuthUserEmail();
  } catch (e) {
    return { error: 'Unauthorized' };
  }

  const supabase = createAdminClient();

  if (!reason.trim()) return { error: 'Vui lòng nhập lý do huỷ chuyến' };

  // Lấy data trước khi update (cần driver/vehicle info)
  const emailData = await getBookingEmailData(supabase, bookingId);

  const { error } = await supabase.from('bookings').update({
    status: 'da_huy' as BookingStatus,
    cancelled_by: cancelledBy,
    cancellation_reason: reason,
  }).eq('id', bookingId);

  if (error) return { error: error.message };

  // Gửi email huỷ chuyến cho TOÀN BỘ thành viên
  if (emailData) {
    const config = await getEmailConfig(supabase);
    const recipients = collectRecipients(emailData, config);

    for (const r of recipients) {
      const tpl = buildCancellationEmail({
        ...emailData,
        cancelledBy,
        cancellationReason: reason,
        recipientName: r.name,
      });
      const result = await sendEmail({ to: r.email, cc: config.always_cc, subject: tpl.subject, html: tpl.html });
      await logEmail(supabase, bookingId, 'cancellation', r.email, tpl.subject, result.success, result.error);
    }
  }

  return { success: true };
}

// --- Complete Trip ---
export async function completeTrip(bookingId: string) {
  try {
    await requireAuthUserEmail();
  } catch (e) {
    return { error: 'Unauthorized' };
  }
  const supabase = createAdminClient();

  const { error } = await supabase.from('bookings').update({
    status: 'da_hoan_thanh' as BookingStatus,
  }).eq('id', bookingId);

  if (error) return { error: error.message };
  return { success: true };
}

// --- Save Driver (create or update) ---
export async function saveDriver(id: string | null, data: {
  full_name: string; phone: string; email: string;
  license_type: string; license_issued_place: string;
  vehicle_types_can_drive: string[]; is_available: boolean;
}) {
  try {
    await requireAuthUserEmail();
  } catch (e) {
    return { error: 'Unauthorized' };
  }
  const supabase = createAdminClient();
  const payload = {
    full_name: data.full_name, phone: data.phone,
    email: data.email || null, license_type: data.license_type,
    license_issued_place: data.license_issued_place || null,
    vehicle_types_can_drive: data.vehicle_types_can_drive,
    is_available: data.is_available,
  };

  if (id) {
    const { error } = await supabase.from('drivers').update(payload).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('drivers').insert(payload);
    if (error) return { error: error.message };
  }
  return { success: true };
}

// --- Save Vehicle (create or update) ---
export async function saveVehicle(id: string | null, data: {
  plate_number: string; vehicle_type: string; brand: string;
  seat_count: number; purchase_date: string; is_available: boolean;
}) {
  try {
    await requireAuthUserEmail();
  } catch (e) {
    return { error: 'Unauthorized' };
  }
  const supabase = createAdminClient();
  const payload = {
    plate_number: data.plate_number, vehicle_type: data.vehicle_type,
    brand: data.brand, seat_count: data.seat_count,
    purchase_date: data.purchase_date || null, is_available: data.is_available,
  };

  if (id) {
    const { error } = await supabase.from('vehicles').update(payload).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('vehicles').insert(payload);
    if (error) return { error: error.message };
  }
  return { success: true };
}

// --- Save Post-Trip ---
export async function savePostTrip(bookingId: string, data: {
  actual_departure: string; actual_return: string;
  total_km: number; overnight_hours: number;
}, userId: string) {
  try {
    await requireAuthUserEmail();
  } catch (e) {
    return { error: 'Unauthorized' };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from('post_trips').upsert({
    booking_id: bookingId,
    actual_departure: data.actual_departure || null,
    actual_return: data.actual_return || null,
    total_km: data.total_km || null,
    overnight_hours: data.overnight_hours || null,
    updated_by: userId,
  }, { onConflict: 'booking_id' });
  if (error) return { error: error.message };
  return { success: true };
}

// --- Save Post-Trip Cost ---
export async function savePostTripCost(postTripId: string, bookingId: string, data: {
  cost_category: string; description: string; amount: number;
}) {
  try {
    await requireAuthUserEmail();
  } catch (e) {
    return { error: 'Unauthorized' };
  }
  const supabase = createAdminClient();

  // Tự tìm post_trip_id nếu không truyền
  let ptId = postTripId;
  if (!ptId && bookingId) {
    const { data: pt } = await supabase.from('post_trips').select('id').eq('booking_id', bookingId).single();
    ptId = pt?.id || '';
  }
  if (!ptId) return { error: 'Chưa có bản ghi cập nhật sau chuyến đi' };

  const { error } = await supabase.from('post_trip_costs').insert({
    post_trip_id: ptId, booking_id: bookingId,
    cost_category: data.cost_category,
    description: data.description || null, amount: data.amount,
  });
  if (error) return { error: error.message };
  return { success: true };
}

// --- Submit Evaluation ---
export async function submitEvaluation(bookingId: string, data: {
  evaluator_email: string; evaluator_name: string;
  service_attitude: number; traffic_compliance: number;
  vehicle_quality: number; safe_driving: number;
  feedback: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('trip_evaluations').insert({
    booking_id: bookingId,
    evaluator_email: data.evaluator_email, evaluator_name: data.evaluator_name,
    service_attitude: data.service_attitude, traffic_compliance: data.traffic_compliance,
    vehicle_quality: data.vehicle_quality, safe_driving: data.safe_driving,
    feedback: data.feedback || null,
  });
  if (error) return { error: error.message };
  return { success: true };
}

// --- Update System Config ---
export async function updateConfig(key: string, value: string) {
  try {
    await requireAuthUserEmail();
  } catch (e) {
    return { error: 'Unauthorized' };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from('system_config')
    .update({ value, updated_at: new Date().toISOString() }).eq('key', key);
  if (error) return { error: error.message };
  return { success: true };
}
