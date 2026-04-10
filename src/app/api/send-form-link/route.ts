import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    // --- Security: Chỉ user đã đăng nhập mới được gửi ---
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emails, form_url, recipient_name } = await request.json();

    if (!emails?.length || !form_url) {
      return NextResponse.json({ error: 'Missing emails or form_url' }, { status: 400 });
    }

    // Lấy config dashboard URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://esuhai-booking-xe-v2.vercel.app';

    const subject = '🚗 Hệ thống Đăng ký Xe — Phòng Tổng Hợp Esuhai Group';

    // Build professional email matching Content Bible design language
    const greeting = recipient_name
      ? `Kính gửi anh/chị <strong>${recipient_name}</strong>,`
      : 'Kính gửi anh/chị,';

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- KHỐI AN TÂM — Header -->
    <div style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);border-radius:16px 16px 0 0;padding:32px 24px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">🚗</div>
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Hệ thống Đăng ký Xe</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Phòng Tổng Hợp — Esuhai Group</p>
    </div>

    <!-- KHỐI THỰC THI — Nội dung chính -->
    <div style="background:#ffffff;padding:28px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

      <p style="color:#334155;font-size:16px;line-height:1.7;margin:0 0 20px;">
        ${greeting}
      </p>

      <p style="color:#334155;font-size:16px;line-height:1.7;margin:0 0 24px;">
        Phòng Tổng Hợp xin giới thiệu <strong>Hệ thống Đăng ký Xe</strong> dành cho toàn bộ nhân viên Esuhai Group.
        Khi cần sử dụng xe công ty cho công tác, đón khách, hoặc các hoạt động chung,
        anh/chị vui lòng bấm nút bên dưới để gửi yêu cầu.
      </p>

      <!-- CTA chính -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${form_url}" style="display:inline-block;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#ffffff;padding:16px 40px;border-radius:12px;text-decoration:none;font-size:17px;font-weight:700;box-shadow:0 4px 14px rgba(37,99,235,0.4);">
          📝 Đăng ký sử dụng xe
        </a>
      </div>

      <!-- Hướng dẫn quy trình -->
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:24px 0;">
        <div style="color:#1e293b;font-size:14px;font-weight:700;margin-bottom:14px;">📋 Quy trình 4 bước:</div>

        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 12px 8px 0;vertical-align:top;">
              <div style="width:28px;height:28px;background:#dbeafe;color:#2563eb;border-radius:8px;text-align:center;line-height:28px;font-weight:700;font-size:13px;">1</div>
            </td>
            <td style="padding:8px 0;color:#475569;font-size:14px;line-height:1.5;">
              <strong>Gửi yêu cầu</strong> — Điền form đăng ký với thông tin chuyến xe
            </td>
          </tr>
          <tr>
            <td style="padding:8px 12px 8px 0;vertical-align:top;">
              <div style="width:28px;height:28px;background:#dbeafe;color:#2563eb;border-radius:8px;text-align:center;line-height:28px;font-weight:700;font-size:13px;">2</div>
            </td>
            <td style="padding:8px 0;color:#475569;font-size:14px;line-height:1.5;">
              <strong>Phê duyệt</strong> — Phòng Tổng Hợp xem xét và phê duyệt yêu cầu
            </td>
          </tr>
          <tr>
            <td style="padding:8px 12px 8px 0;vertical-align:top;">
              <div style="width:28px;height:28px;background:#dbeafe;color:#2563eb;border-radius:8px;text-align:center;line-height:28px;font-weight:700;font-size:13px;">3</div>
            </td>
            <td style="padding:8px 0;color:#475569;font-size:14px;line-height:1.5;">
              <strong>Phân công</strong> — Tài xế được phân bổ và xác nhận nhận ca
            </td>
          </tr>
          <tr>
            <td style="padding:8px 12px 8px 0;vertical-align:top;">
              <div style="width:28px;height:28px;background:#dcfce7;color:#16a34a;border-radius:8px;text-align:center;line-height:28px;font-weight:700;font-size:13px;">✓</div>
            </td>
            <td style="padding:8px 0;color:#475569;font-size:14px;line-height:1.5;">
              <strong>Hoàn tất</strong> — Anh/chị nhận email xác nhận kèm thông tin tài xế & SĐT liên lạc
            </td>
          </tr>
        </table>
      </div>

      <!-- Lưu ý -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin:16px 0;">
        <div style="color:#92400e;font-size:13px;line-height:1.6;">
          💡 <strong>Lưu ý:</strong> Vui lòng gửi yêu cầu trước <strong>ít nhất 1 ngày</strong> để Phòng Tổng Hợp kịp sắp xếp.
          Đối với xe thuê ngoài, yêu cầu cần qua 3 cấp phê duyệt.
        </div>
      </div>

      <!-- CTA phụ — Dashboard -->
      <div style="text-align:center;margin:20px 0 8px;">
        <a href="${appUrl}/dashboard" style="display:inline-block;background:#ffffff;color:#2563eb;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;border:2px solid #2563eb;">
          Xem bảng điều phối
        </a>
      </div>
    </div>

    <!-- KHỐI DỰ PHÒNG — Footer -->
    <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;">
      <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;text-align:center;">
        Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ Phòng Tổng Hợp.<br>
        Email này được gửi tự động từ Hệ thống Quản lý Xe — Esuhai Group.
      </p>
    </div>

    <div style="text-align:center;padding:24px 0 8px;color:#94a3b8;font-size:12px;line-height:1.5;">
      <div style="font-weight:600;letter-spacing:0.5px;">PHÒNG TỔNG HỢP — ESUHAI GROUP</div>
      <div style="margin-top:4px;font-style:italic;">Mỗi chuyến xe là một chuyến yêu thương</div>
    </div>
  </div>
</body>
</html>`;

    let sent = 0;
    for (const recipientEmail of emails) {
      const result = await sendEmail({ to: recipientEmail, subject, html });
      if (result.success) sent++;
    }

    return NextResponse.json({ success: true, sent, total: emails.length });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
