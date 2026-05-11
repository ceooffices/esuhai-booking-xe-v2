// ============================================================
// /api/approval-response — POST endpoint cho 2 button HMAC trong email
// "Chờ duyệt cấp N". Approver cấp 2/3 bấm Duyệt / Không duyệt từ điện
// thoại không cần login dashboard.
//
// Pattern: copy từ src/app/api/driver-response/route.ts (token HMAC
// verify + atomic guard + graceful idempotency khi booking đã ở status
// khác).
//
// State machine copy nguyên từ src/lib/actions.ts approveBooking (line
// 109-192) + rejectBooking (line 195-241) — KHÔNG tự bịa.
// ============================================================

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import {
  buildNewBookingEmail,
  buildRejectAllEmail,
} from '@/lib/email-templates';
import { verifyApprovalToken, type ApprovalLevel } from '@/lib/tokens';
import { lookupStaffByEmail } from '@/lib/staff';
import {
  collectRecipients,
  getBookingEmailData,
  getEmailConfig,
  logEmail,
  notifyApprover,
} from '@/lib/booking-emails';
import type { BookingStatus } from '@/types/database';

const EXPECTED_STATUS: Record<ApprovalLevel, BookingStatus> = {
  1: 'cho_duyet',
  2: 'cho_duyet_cap2',
  3: 'cho_duyet_cap3',
};

export async function POST(request: Request) {
  let body: { action?: string; token?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 });
  }

  const { action, token, reason } = body;

  if (!action || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ error: 'Thiếu token xác minh' }, { status: 400 });
  }

  // Verify HMAC token — KHÔNG tin booking_id từ client (lấy từ payload đã ký)
  const tokenResult = verifyApprovalToken(token);
  if (!tokenResult.valid || !tokenResult.payload) {
    return NextResponse.json(
      { error: 'Đường dẫn không hợp lệ. Vui lòng dùng đúng link từ email gốc.' },
      { status: 403 }
    );
  }
  if (tokenResult.expired) {
    return NextResponse.json(
      {
        error:
          'Đường dẫn đã hết hiệu lực sau 7 ngày. Vui lòng đăng nhập dashboard để duyệt yêu cầu này.',
      },
      { status: 403 }
    );
  }

  const { bookingId, level, approverEmail } = tokenResult.payload;

  const supabase = createAdminClient();

  const { data: booking, error: fetchErr } = await supabase
    .from('bookings')
    .select('id, status, current_approval_level, max_approval_levels')
    .eq('id', bookingId)
    .single();

  if (fetchErr || !booking) {
    return NextResponse.json({ error: 'Không tìm thấy yêu cầu' }, { status: 404 });
  }

  // Idempotent: nếu booking đã chuyển status khác (vd ai đó duyệt qua
  // dashboard trước, hoặc approver bấm link 2 lần) → trả 200 graceful
  // thay vì 4xx để approver thấy "đã xử lý" trên page response.
  if (booking.status !== EXPECTED_STATUS[level] || booking.current_approval_level !== level) {
    return NextResponse.json({
      success: true,
      alreadyProcessed: true,
      message: 'Yêu cầu này đã được xử lý bởi người khác hoặc bằng kênh khác.',
    });
  }

  if (action === 'approve') {
    return await handleApprove(supabase, bookingId, level, approverEmail, booking.max_approval_levels);
  }

  if (!reason || !reason.trim()) {
    return NextResponse.json({ error: 'Vui lòng nhập lý do không duyệt' }, { status: 400 });
  }
  return await handleReject(supabase, bookingId, level, approverEmail, reason.trim());
}

// ============================================================
// APPROVE — copy state machine từ actions.ts approveBooking line 109-192
// Khác biệt: approverEmail lấy từ token (không phải session), KHÔNG gọi
// requireManagerRole vì route public.
// ============================================================
async function handleApprove(
  supabase: ReturnType<typeof createAdminClient>,
  bookingId: string,
  level: ApprovalLevel,
  approverEmail: string,
  maxLevels: number
) {
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
  // còn ở giá trị mong đợi. Pattern y hệt actions.ts:156-163 — nếu 2
  // approver bấm Duyệt cùng lúc (1 qua email-link, 1 qua dashboard),
  // chỉ 1 thắng, người còn lại update 0 rows → idempotent message.
  const { data: updated, error: updateErr } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId)
    .eq('status', EXPECTED_STATUS[level])
    .eq('current_approval_level', level)
    .select('id')
    .maybeSingle();

  if (updateErr) {
    console.error('[approval-response/approve] update error:', updateErr);
    return NextResponse.json({ error: 'Không cập nhật được. Vui lòng thử lại.' }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({
      success: true,
      alreadyProcessed: true,
      message: 'Yêu cầu vừa được duyệt bởi người khác. Vui lòng tải lại để xem trạng thái mới.',
    });
  }

  const config = await getEmailConfig(supabase);

  if (updateData.status === 'da_duyet') {
    // Cấp cuối → notify Quản lý phân bổ tài xế (giống actions.ts:172-184)
    const emailData = await getBookingEmailData(supabase, bookingId);
    if (emailData && config.manager_email) {
      const managerInfo = await lookupStaffByEmail(config.manager_email);
      const tpl = buildNewBookingEmail({
        ...emailData,
        managerName: managerInfo?.name || config.manager_name || '',
        managerGender: managerInfo?.gender || undefined,
      });
      const result = await sendEmail({
        to: config.manager_email,
        cc: config.always_cc,
        subject: tpl.subject,
        html: tpl.html,
      });
      await logEmail(
        supabase,
        bookingId,
        'approved_notify_manager',
        config.manager_email,
        tpl.subject,
        result.success,
        result.error
      );
    }
  } else {
    // Còn cấp tiếp → notify cấp N+1 qua notifyApprover (đã wire token
    // approval mới ở Block M — xem booking-emails.ts).
    const nextLevel = (updateData.current_approval_level as number) as ApprovalLevel;
    await notifyApprover(supabase, bookingId, nextLevel, maxLevels, config);
  }

  return NextResponse.json({
    success: true,
    newStatus: updateData.status,
    nextLevel: level < maxLevels ? level + 1 : null,
    isFinalApproval: level >= maxLevels,
  });
}

// ============================================================
// REJECT — copy state machine từ actions.ts rejectBooking line 195-241
// LƯU Ý: KHÔNG "rớt về cấp N-1" — bất kỳ cấp nào reject đều → khong_duyet
// (verified với PM). Gửi email broadcast cho toàn bộ thành viên.
// ============================================================
async function handleReject(
  supabase: ReturnType<typeof createAdminClient>,
  bookingId: string,
  level: ApprovalLevel,
  approverEmail: string,
  reason: string
) {
  // Atomic guard: copy từ actions.ts:210-220 — chỉ reject khi booking
  // đang ở giai đoạn duyệt. Sau khi đã da_duyet/cho_tx_xac_nhan/etc,
  // dùng cancelBooking thay vì reject.
  // Thêm guard .eq('current_approval_level', level) để token cấp 2 KHÔNG
  // reject được khi booking đã chuyển sang cấp 3.
  const { data: updated, error } = await supabase
    .from('bookings')
    .update({
      status: 'khong_duyet' as BookingStatus,
      rejection_reason: reason,
      rejected_by: approverEmail,
    })
    .eq('id', bookingId)
    .eq('status', EXPECTED_STATUS[level])
    .eq('current_approval_level', level)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[approval-response/reject] update error:', error);
    return NextResponse.json({ error: 'Không cập nhật được. Vui lòng thử lại.' }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({
      success: true,
      alreadyProcessed: true,
      message: 'Yêu cầu vừa được xử lý bởi người khác. Vui lòng tải lại để xem trạng thái mới.',
    });
  }

  // Gửi email broadcast cho TOÀN BỘ thành viên (copy actions.ts:228-238)
  const emailData = await getBookingEmailData(supabase, bookingId);
  if (emailData) {
    const config = await getEmailConfig(supabase);
    const recipients = await collectRecipients(emailData, config);

    for (const r of recipients) {
      const tpl = buildRejectAllEmail({
        ...emailData,
        rejectionReason: reason,
        recipientName: r.name,
      });
      const result = await sendEmail({
        to: r.email,
        cc: config.always_cc,
        subject: tpl.subject,
        html: tpl.html,
      });
      await logEmail(supabase, bookingId, 'reject_all', r.email, tpl.subject, result.success, result.error);
    }
  }

  return NextResponse.json({ success: true, newStatus: 'khong_duyet' });
}
