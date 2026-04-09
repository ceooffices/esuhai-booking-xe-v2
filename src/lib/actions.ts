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

  if (!driver) return { error: 'Tai xe khong ton tai' };
  if (!driver.email) return { error: `Tai xe ${driver.full_name} chua co email` };

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
