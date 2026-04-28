import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import {
  buildConfirmBookerEmail,
  buildConfirmStaffEmail,
  buildConfirmManagerEmail,
  buildDriverRejectEmail,
} from '@/lib/email-templates';
import { verifyDriverToken } from '@/lib/tokens';
import { lookupStaffByEmail, lookupStaffByName } from '@/lib/staff';
import { getBookingEmailData, getEmailConfig, logEmail } from '@/lib/booking-emails';

// Backward-compat window cho token cũ (driver_id raw UUID).
// Sau ngày này sẽ chỉ chấp nhận token HMAC mới — remove block legacy bên dưới.
// Set = ngày deploy P0 + 14 ngày.
const LEGACY_TOKEN_DEADLINE = new Date('2026-05-13T00:00:00Z');

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

    // --- Security: Verify driver token ---
    // Format mới (P0 fix 2026-04-28): HMAC ký bookingId+driverId+expiresEpoch
    // (TTL 14 ngày). Format cũ: raw driver_id UUID — vẫn accept tới
    // LEGACY_TOKEN_DEADLINE để email phân công đã gửi không bị gián đoạn.
    if (!token || !booking.driver_id) {
      return NextResponse.json({ error: 'Token xác minh không hợp lệ' }, { status: 403 });
    }
    const tokenCheck = verifyDriverToken(token, booking.id, booking.driver_id);
    if (tokenCheck.valid && tokenCheck.expired) {
      return NextResponse.json({
        error: 'Đường dẫn đã hết hiệu lực sau 14 ngày. Vui lòng liên hệ Phòng Tổng Hợp để được phân công lại.',
      }, { status: 403 });
    }
    if (!tokenCheck.valid) {
      // Fallback: token cũ = raw driver_id (chỉ tới deadline)
      const isLegacy = token === booking.driver_id;
      const stillInWindow = new Date() < LEGACY_TOKEN_DEADLINE;
      if (!isLegacy || !stillInWindow) {
        return NextResponse.json({ error: 'Token xác minh không hợp lệ' }, { status: 403 });
      }
      console.warn(`[driver-response] LEGACY token cho booking ${booking.id}. Hard cutover sau ${LEGACY_TOKEN_DEADLINE.toISOString()}.`);
    }

    if (booking.status !== 'cho_tx_xac_nhan') {
      return NextResponse.json({
        success: true,
        message: 'Already processed',
      });
    }

    if (action === 'confirm') {
      // Atomic guard: chỉ confirm khi status vẫn là cho_tx_xac_nhan.
      // Nếu tài xế double-click hoặc race với reject, chỉ thao tác đầu
      // tiên thắng — thao tác sau no-op (không ghi đè timestamp).
      const { data: updated, error } = await supabase
        .from('bookings')
        .update({
          status: 'tx_da_nhan',
          driver_confirmed_at: new Date().toISOString(),
        })
        .eq('id', booking_id)
        .eq('status', 'cho_tx_xac_nhan')
        .select('id')
        .maybeSingle();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!updated) {
        // Race lost — booking đã chuyển trạng thái khác. Trả 200 để
        // tài xế thấy "đã xử lý" thay vì lỗi.
        return NextResponse.json({ success: true, message: 'Already processed' });
      }

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
        const managerInfo = await lookupStaffByEmail(config.manager_email);
        await sendOnce(config.manager_email, 'confirm_manager', () => buildConfirmManagerEmail({
          ...emailData,
          managerName: managerInfo?.name || config.manager_name || '',
          managerGender: managerInfo?.gender || undefined,
        }));

        // 2. NGƯỜI ĐĂNG KÝ — chỉ gửi khi khác manager
        const requesterInfo = await lookupStaffByEmail(emailData.requesterEmail);
        await sendOnce(emailData.requesterEmail, 'confirm_booker', () => buildConfirmBookerEmail({
          ...emailData,
          requesterGender: requesterInfo?.gender || undefined,
        }));

        // 3. NV PHỤ TRÁCH — lookup theo tên trong staff table
        const staffInfo = await lookupStaffByName(emailData.staffInCharge);
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

      // Atomic guard: tương tự confirm, chỉ reject khi vẫn cho_tx_xac_nhan.
      const { data: updated, error } = await supabase
        .from('bookings')
        .update({
          status: 'tx_tu_choi',
          driver_rejection_reason: reason,
        })
        .eq('id', booking_id)
        .eq('status', 'cho_tx_xac_nhan')
        .select('id')
        .maybeSingle();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!updated) {
        return NextResponse.json({ success: true, message: 'Already processed' });
      }

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
