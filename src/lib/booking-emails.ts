// ============================================================
// Booking email helpers — server-only.
// Tổng hợp logic dùng chung cho actions.ts, driver-response, webhook:
//   - getBookingEmailData: lấy data + sinh URL có HMAC token
//   - getEmailConfig: đọc system_config (manager + 3 cấp approver + cc)
//   - logEmail: ghi audit vào email_logs
//   - notifyApprover: gửi "Chờ duyệt cấp N" cho approver tương ứng
//   - collectRecipients: thu thập (requester + driver + manager) cho
//                        cancellation/rejection broadcast
// ============================================================

import 'server-only';

import type { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { buildApprovalRequestEmail } from '@/lib/email-templates';
import { signDriverToken } from '@/lib/tokens';
import { lookupStaffByEmail, lookupStaffByName } from '@/lib/staff';

type AdminClient = ReturnType<typeof createAdminClient>;

export async function getBookingEmailData(supabase: AdminClient, bookingId: string) {
  const { data: b } = await supabase.from('bookings').select(`
    *, driver:drivers(full_name, phone, email), vehicle:vehicles(plate_number, vehicle_type)
  `).eq('id', bookingId).single();
  if (!b) return null;

  const driver = Array.isArray(b.driver) ? b.driver[0] : b.driver;
  const vehicle = Array.isArray(b.vehicle) ? b.vehicle[0] : b.vehicle;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://esuhai-booking-xe-v2.vercel.app';

  // Token HMAC ký (bookingId + driverId + expiresEpoch=now+14d)
  const driverToken = b.driver_id ? signDriverToken(b.id, b.driver_id) : '';

  // Fallback: nếu booking không có requester_email (form submit thiếu,
  // hoặc Google Form không có field email) → lookup theo requester_name
  // trong staff table. Đảm bảo người đăng ký luôn nhận được email
  // confirm/cancel/reject về booking của mình.
  let requesterEmail = (b.requester_email as string | null) || null;
  if (!requesterEmail && b.requester_name) {
    const found = await lookupStaffByName(b.requester_name as string);
    if (found?.email) {
      requesterEmail = found.email;
      console.warn(`[booking-emails] Booking ${b.id} thiếu requester_email — fallback lookup theo tên "${b.requester_name}" → ${requesterEmail}`);
    }
  }

  return {
    bookingId: b.id as string,
    purpose: b.purpose as string,
    category: b.category as string,
    tripDate: b.trip_date as string,
    pickupTime: b.pickup_time as string,
    endTime: b.end_time as string | undefined,
    itinerary: b.itinerary as string | undefined,
    passengerCount: b.passenger_count as number,
    requesterName: b.requester_name as string,
    requesterDepartment: b.requester_department as string,
    requesterEmail,
    staffInCharge: b.staff_in_charge as string | undefined,
    flightNumber: b.flight_number as string | undefined,
    memberNames: b.member_names as string | undefined,
    driverName: driver?.full_name as string | undefined,
    driverPhone: driver?.phone as string | undefined,
    driverEmail: driver?.email as string | undefined,
    vehicleType: vehicle?.vehicle_type as string | undefined,
    plateNumber: vehicle?.plate_number as string | undefined,
    rejectionReason: b.rejection_reason as string | undefined,
    driverRejectionReason: b.driver_rejection_reason as string | undefined,
    dashboardUrl: `${appUrl}/dashboard`,
    confirmUrl: `${appUrl}/driver-response?action=confirm&id=${b.id}&token=${driverToken}`,
    rejectUrl: `${appUrl}/driver-response?action=reject&id=${b.id}&token=${driverToken}`,
  };
}

export type BookingEmailContext = NonNullable<Awaited<ReturnType<typeof getBookingEmailData>>>;

export async function getEmailConfig(supabase: AdminClient): Promise<Record<string, string>> {
  const { data } = await supabase.from('system_config').select('key, value')
    .in('key', [
      'manager_email', 'manager_name', 'always_cc',
      'approver_l1_email', 'approver_l2_email', 'approver_l3_email',
    ]);
  const config: Record<string, string> = {};
  data?.forEach((c: { key: string; value: string }) => { config[c.key] = c.value; });
  return config;
}

export async function logEmail(
  supabase: AdminClient,
  bookingId: string,
  templateName: string,
  to: string,
  subject: string,
  success: boolean,
  error?: string
): Promise<void> {
  await supabase.from('email_logs').insert({
    booking_id: bookingId,
    template_name: templateName,
    recipient_email: to,
    subject,
    status: success ? 'sent' : 'failed',
    error_message: error || null,
  });
}

// Gửi email "Chờ duyệt cấp N" cho approver_lN_email cấu hình trong
// system_config. Nếu chưa cấu hình → log warning + skip (không throw).
// Tự lookup tên/giới tính approver từ staff table để xưng hô đúng.
export async function notifyApprover(
  supabase: AdminClient,
  bookingId: string,
  level: 1 | 2 | 3,
  totalLevels: number,
  config: Record<string, string>
): Promise<void> {
  const approverEmail = config[`approver_l${level}_email`];
  if (!approverEmail) {
    console.warn(`[approval] Chưa cấu hình approver_l${level}_email — bỏ qua gửi email cho cấp ${level}, booking ${bookingId}`);
    return;
  }
  const emailData = await getBookingEmailData(supabase, bookingId);
  if (!emailData) return;

  const approverInfo = await lookupStaffByEmail(approverEmail);
  const tpl = buildApprovalRequestEmail({
    ...emailData,
    approverLevel: level,
    approverName: approverInfo?.name || '',
    approverGender: approverInfo?.gender || undefined,
    totalLevels,
  });
  const result = await sendEmail({
    to: approverEmail,
    cc: config.always_cc,
    subject: tpl.subject,
    html: tpl.html,
  });
  await logEmail(supabase, bookingId, `approval_request_l${level}`, approverEmail, tpl.subject, result.success, result.error);
}

// Thu thập danh sách email cần thông báo khi huỷ chuyến / không duyệt:
// requester + driver + manager + NV phụ trách. Dedupe theo email
// (cùng template content cho tất cả nên dedupe đúng — không như confirm
// flow vốn có 3 template khác content).
//
// LƯU Ý: async vì cần lookup staff_in_charge email theo tên từ staff
// table (Google Form chỉ ghi tên text).
export async function collectRecipients(
  emailData: BookingEmailContext | null,
  config: Record<string, string>
): Promise<{ email: string; name: string }[]> {
  if (!emailData) return [];
  const recipients: { email: string; name: string }[] = [];
  const seen = new Set<string>();

  function add(email: string | undefined | null, name: string) {
    if (!email) return;
    const lc = email.toLowerCase();
    if (seen.has(lc)) return;
    seen.add(lc);
    recipients.push({ email, name });
  }

  // 1. Người đăng ký (đã hydrate trong getBookingEmailData nếu DB null)
  add(emailData.requesterEmail, `anh/chị ${emailData.requesterName}`);

  // 2. Tài xế (nếu đã phân công)
  add(emailData.driverEmail, `anh ${emailData.driverName}`);

  // 3. NV phụ trách (lookup theo tên trong staff table — quan trọng cho
  //    chuyến đón sân bay: NV phụ trách cần biết để không ra sân bay
  //    đón vô ích khi chuyến đã huỷ).
  if (emailData.staffInCharge) {
    const staff = await lookupStaffByName(emailData.staffInCharge);
    if (staff?.email) {
      const greeting = staff.gender === 'female' ? 'chị' : staff.gender === 'male' ? 'anh' : 'anh/chị';
      add(staff.email, `${greeting} ${emailData.staffInCharge}`);
    } else {
      console.warn(`[booking-emails] collectRecipients: không tìm được email cho NV phụ trách "${emailData.staffInCharge}" — bỏ qua thông báo cho NV này.`);
    }
  }

  // 4. Quản lý
  add(config.manager_email, 'chị');

  return recipients;
}
