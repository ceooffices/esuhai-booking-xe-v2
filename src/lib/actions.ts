'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import type { BookingStatus } from '@/types/database';

// --- Approve Booking (handles multi-level) ---
export async function approveBooking(bookingId: string, approverEmail: string) {
  const supabase = createAdminClient();

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (error || !booking) return { error: 'Booking not found' };

  const level = booking.current_approval_level;
  const maxLevels = booking.max_approval_levels;

  // Validate current status allows approval
  const expectedStatus: Record<number, BookingStatus> = {
    1: 'cho_duyet',
    2: 'cho_duyet_cap2',
    3: 'cho_duyet_cap3',
  };
  if (booking.status !== expectedStatus[level]) {
    return { error: 'Booking khong o trang thai cho duyet' };
  }

  let updateData: Record<string, unknown>;

  if (level >= maxLevels) {
    // Final approval
    updateData = {
      status: 'da_duyet' as BookingStatus,
      [`approved_by_l${level}`]: approverEmail,
      [`approved_at_l${level}`]: new Date().toISOString(),
    };
  } else {
    // Move to next level
    const nextLevel = level + 1;
    const nextStatus = `cho_duyet_cap${nextLevel}` as BookingStatus;
    updateData = {
      status: nextStatus,
      current_approval_level: nextLevel,
      [`approved_by_l${level}`]: approverEmail,
      [`approved_at_l${level}`]: new Date().toISOString(),
    };
  }

  const { error: updateErr } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId);

  if (updateErr) return { error: updateErr.message };

  // TODO: Send email notification to next approver or to manager for assignment

  return { success: true, newStatus: updateData.status };
}

// --- Reject Booking ---
export async function rejectBooking(bookingId: string, rejectedBy: string, reason: string) {
  const supabase = createAdminClient();

  if (!reason.trim()) return { error: 'Vui long nhap ly do' };

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'khong_duyet' as BookingStatus,
      rejection_reason: reason,
      rejected_by: rejectedBy,
    })
    .eq('id', bookingId);

  if (error) return { error: error.message };

  // TODO: Send rejection email to requester

  return { success: true };
}

// --- Assign Driver + Vehicle ---
export async function assignDriverVehicle(
  bookingId: string,
  driverId: string,
  vehicleId: string
) {
  const supabase = createAdminClient();

  // Get driver info for email
  const { data: driver } = await supabase
    .from('drivers')
    .select('full_name, phone, email')
    .eq('id', driverId)
    .single();

  if (!driver) return { error: 'Tài xế không tồn tại' };
  if (!driver.email) return { error: `Tài xế ${driver.full_name} chưa có email` };

  const { error } = await supabase
    .from('bookings')
    .update({
      driver_id: driverId,
      vehicle_id: vehicleId,
      status: 'cho_tx_xac_nhan' as BookingStatus,
    })
    .eq('id', bookingId);

  if (error) return { error: error.message };

  // TODO: Send assignment email to driver with confirm/reject links

  return { success: true, driverName: driver.full_name };
}

// --- Cancel Booking ---
export async function cancelBooking(bookingId: string, cancelledBy: string, reason: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'da_huy' as BookingStatus,
      cancelled_by: cancelledBy,
      cancellation_reason: reason,
    })
    .eq('id', bookingId);

  if (error) return { error: error.message };

  return { success: true };
}

// --- Complete Trip ---
export async function completeTrip(bookingId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'da_hoan_thanh' as BookingStatus,
    })
    .eq('id', bookingId);

  if (error) return { error: error.message };

  return { success: true };
}

// --- Save Driver (create or update) ---
export async function saveDriver(id: string | null, data: {
  full_name: string; phone: string; email: string;
  license_type: string; license_issued_place: string;
  vehicle_types_can_drive: string[]; is_available: boolean;
}) {
  const supabase = createAdminClient();
  const payload = {
    full_name: data.full_name,
    phone: data.phone,
    email: data.email || null,
    license_type: data.license_type,
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
  const supabase = createAdminClient();
  const payload = {
    plate_number: data.plate_number,
    vehicle_type: data.vehicle_type,
    brand: data.brand,
    seat_count: data.seat_count,
    purchase_date: data.purchase_date || null,
    is_available: data.is_available,
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
  const supabase = createAdminClient();
  const { error } = await supabase.from('post_trip_costs').insert({
    post_trip_id: postTripId,
    booking_id: bookingId,
    cost_category: data.cost_category,
    description: data.description || null,
    amount: data.amount,
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
    evaluator_email: data.evaluator_email,
    evaluator_name: data.evaluator_name,
    service_attitude: data.service_attitude,
    traffic_compliance: data.traffic_compliance,
    vehicle_quality: data.vehicle_quality,
    safe_driving: data.safe_driving,
    feedback: data.feedback || null,
  });
  if (error) return { error: error.message };
  return { success: true };
}

// --- Update System Config ---
export async function updateConfig(key: string, value: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('system_config')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);
  if (error) return { error: error.message };
  return { success: true };
}
