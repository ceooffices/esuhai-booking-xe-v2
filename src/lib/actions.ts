'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import {
  buildCancellationEmail,
  buildDriverAssignEmail,
  buildNewBookingEmail,
  buildRejectAllEmail,
} from '@/lib/email-templates';
import { verifyEvalToken } from '@/lib/tokens';
import { requireManagerRole } from '@/lib/auth';
import { lookupStaffByEmail } from '@/lib/staff';
import {
  collectRecipients,
  getBookingEmailData,
  getEmailConfig,
  logEmail,
  notifyApprover,
} from '@/lib/booking-emails';
import type { BookingStatus } from '@/types/database';

// --- Approve Booking (handles multi-level) ---
export async function approveBooking(bookingId: string) {
  let approverEmail: string;
  try {
    const role = await requireManagerRole();
    approverEmail = role.email;
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Không có quyền' };
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

  // Atomic guard: chỉ update khi status + current_approval_level VẪN
  // còn ở giá trị mong đợi. Nếu 2 approver bấm Duyệt cùng lúc, người
  // sau update 0 rows → biết có race và trả lỗi rõ ràng.
  const { data: updated, error: updateErr } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId)
    .eq('status', expectedStatus[level])
    .eq('current_approval_level', level)
    .select('id')
    .maybeSingle();

  if (updateErr) return { error: updateErr.message };
  if (!updated) {
    return { error: 'Yêu cầu vừa được duyệt bởi người khác. Vui lòng tải lại trang.' };
  }

  const config = await getEmailConfig(supabase);

  if (updateData.status === 'da_duyet') {
    // Đã duyệt cấp cuối → gửi email cho Quản lý để phân bổ tài xế
    const emailData = await getBookingEmailData(supabase, bookingId);
    if (emailData && config.manager_email) {
      const managerInfo = await lookupStaffByEmail(config.manager_email);
      const tpl = buildNewBookingEmail({
        ...emailData,
        managerName: managerInfo?.name || config.manager_name || '',
        managerGender: managerInfo?.gender || undefined,
      });
      const result = await sendEmail({ to: config.manager_email, cc: config.always_cc, subject: tpl.subject, html: tpl.html });
      await logEmail(supabase, bookingId, 'approved_notify_manager', config.manager_email, tpl.subject, result.success, result.error);
    }
  } else {
    // Còn cấp duyệt phía sau → gửi email "Chờ duyệt cấp N" cho approver tương ứng
    const nextLevel = (updateData.current_approval_level as number) as 1 | 2 | 3;
    await notifyApprover(supabase, bookingId, nextLevel, maxLevels, config);
  }

  return { success: true, newStatus: updateData.status };
}

// --- Reject Booking ---
export async function rejectBooking(bookingId: string, reason: string) {
  let rejectedBy: string;
  try {
    const role = await requireManagerRole();
    rejectedBy = role.email;
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Không có quyền' };
  }

  const supabase = createAdminClient();
  if (!reason.trim()) return { error: 'Vui lòng nhập lý do' };

  // Atomic guard: chỉ "không duyệt" khi booking đang trong giai đoạn duyệt.
  // Sau khi đã da_duyet/cho_tx_xac_nhan/etc, dùng cancelBooking thay vì
  // reject (tránh status data bị bóp méo).
  const { data: updated, error } = await supabase
    .from('bookings')
    .update({
      status: 'khong_duyet' as BookingStatus,
      rejection_reason: reason,
      rejected_by: rejectedBy,
    })
    .eq('id', bookingId)
    .in('status', ['cho_duyet', 'cho_duyet_cap2', 'cho_duyet_cap3'])
    .select('id')
    .maybeSingle();

  if (error) return { error: error.message };
  if (!updated) {
    return { error: 'Yêu cầu không còn ở trạng thái chờ duyệt — không thể "không duyệt". Nếu cần huỷ, dùng chức năng Huỷ chuyến.' };
  }

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
    await requireManagerRole();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Không có quyền' };
  }
  const supabase = createAdminClient();

  const { data: driver } = await supabase
    .from('drivers').select('full_name, phone, email').eq('id', driverId).single();

  if (!driver) return { error: 'Tài xế không tồn tại' };
  if (!driver.email) return { error: `Tài xế ${driver.full_name} chưa có email` };

  // Atomic guard: chỉ phân công khi status đang ở 'da_duyet' (vừa duyệt
  // xong) hoặc 'tx_tu_choi' (tài xế trước từ chối, cần phân bổ lại).
  // Tránh 2 người cùng phân công 2 tài xế khác nhau cho 1 booking.
  const { data: updated, error } = await supabase
    .from('bookings')
    .update({
      driver_id: driverId,
      vehicle_id: vehicleId,
      status: 'cho_tx_xac_nhan' as BookingStatus,
    })
    .eq('id', bookingId)
    .in('status', ['da_duyet', 'tx_tu_choi'])
    .select('id')
    .maybeSingle();

  if (error) return { error: error.message };
  if (!updated) {
    return { error: 'Yêu cầu không ở trạng thái có thể phân công. Có thể đã được phân công bởi người khác. Tải lại trang để xem trạng thái mới nhất.' };
  }

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
export async function cancelBooking(bookingId: string, reason: string) {
  let cancelledBy: string;
  try {
    const role = await requireManagerRole();
    cancelledBy = role.email;
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Không có quyền' };
  }

  const supabase = createAdminClient();

  if (!reason.trim()) return { error: 'Vui lòng nhập lý do huỷ chuyến' };

  // Lấy data trước khi update (cần driver/vehicle info)
  const emailData = await getBookingEmailData(supabase, bookingId);

  // Atomic guard: chỉ huỷ booking chưa kết thúc. Chặn huỷ booking đã
  // hoàn thành (lịch sử) hoặc đã huỷ (huỷ 2 lần → spam email cho mọi
  // người 2 lần).
  const { data: updated, error } = await supabase
    .from('bookings')
    .update({
      status: 'da_huy' as BookingStatus,
      cancelled_by: cancelledBy,
      cancellation_reason: reason,
    })
    .eq('id', bookingId)
    .not('status', 'in', '(da_huy,da_hoan_thanh)')
    .select('id')
    .maybeSingle();

  if (error) return { error: error.message };
  if (!updated) {
    return { error: 'Yêu cầu đã hoàn thành hoặc đã huỷ trước đó — không thể huỷ lại.' };
  }

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
    await requireManagerRole();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Không có quyền' };
  }
  const supabase = createAdminClient();

  // Atomic guard: chỉ complete khi booking đang ở trạng thái có thể
  // thực hiện chuyến (tài xế đã nhận / sẵn sàng). Tránh complete sớm
  // khi chưa duyệt hoặc complete lại lần 2.
  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ status: 'da_hoan_thanh' as BookingStatus })
    .eq('id', bookingId)
    .in('status', ['tx_da_nhan', 'san_sang'])
    .select('id')
    .maybeSingle();

  if (error) return { error: error.message };
  if (!updated) {
    return { error: 'Yêu cầu chưa sẵn sàng để hoàn thành (cần tài xế xác nhận trước) hoặc đã hoàn thành rồi.' };
  }
  return { success: true };
}

// --- Save Driver (create or update) ---
export async function saveDriver(id: string | null, data: {
  full_name: string; phone: string; email: string;
  license_type: string; license_issued_place: string;
  vehicle_types_can_drive: string[]; is_available: boolean;
}) {
  try {
    await requireManagerRole();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Không có quyền' };
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
    await requireManagerRole();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Không có quyền' };
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
    await requireManagerRole();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Không có quyền' };
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
    await requireManagerRole();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Không có quyền' };
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
// /evaluate là route public (xem middleware.ts) → KHÔNG check session.
// Thay vào đó yêu cầu HMAC token ký bằng WEBHOOK_SECRET, ràng buộc với
// (bookingId, evaluator_email). Token được sinh bằng signEvalToken()
// và nhúng vào URL email mời đánh giá.
export async function submitEvaluation(bookingId: string, data: {
  evaluator_email: string; evaluator_name: string;
  service_attitude: number; traffic_compliance: number;
  vehicle_quality: number; safe_driving: number;
  feedback: string;
  token: string;
}) {
  if (!data.token || !verifyEvalToken(data.token, bookingId, data.evaluator_email)) {
    return { error: 'Đường dẫn đánh giá không hợp lệ hoặc đã hết hiệu lực' };
  }
  // Kiểm tra điểm trong khoảng 1-5 (defense in depth — DB cũng có CHECK)
  for (const k of ['service_attitude', 'traffic_compliance', 'vehicle_quality', 'safe_driving'] as const) {
    const v = data[k];
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      return { error: 'Điểm đánh giá phải là số nguyên từ 1 đến 5' };
    }
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from('trip_evaluations').insert({
    booking_id: bookingId,
    evaluator_email: data.evaluator_email, evaluator_name: data.evaluator_name,
    service_attitude: data.service_attitude, traffic_compliance: data.traffic_compliance,
    vehicle_quality: data.vehicle_quality, safe_driving: data.safe_driving,
    feedback: data.feedback || null,
  });
  if (error) {
    // 23505 = unique violation (booking_id, evaluator_email) — đã đánh giá rồi
    if ((error as { code?: string }).code === '23505') {
      return { error: 'Bạn đã đánh giá chuyến đi này rồi' };
    }
    return { error: 'Không lưu được đánh giá. Vui lòng thử lại.' };
  }
  return { success: true };
}

// --- Update System Config ---
export async function updateConfig(key: string, value: string) {
  try {
    await requireManagerRole();
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Không có quyền' };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from('system_config')
    .update({ value, updated_at: new Date().toISOString() }).eq('key', key);
  if (error) return { error: error.message };
  return { success: true };
}
