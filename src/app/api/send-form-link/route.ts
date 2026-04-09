import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { emails, form_url } = await request.json();

    if (!emails?.length || !form_url) {
      return NextResponse.json({ error: 'Missing emails or form_url' }, { status: 400 });
    }

    const subject = '[Đăng ký sử dụng xe] Phòng Tổng Hợp — Esuhai Group';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
        <div style="background: #2563eb; color: white; padding: 24px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">Đăng ký sử dụng xe</h1>
          <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">Phòng Tổng Hợp — Esuhai Group</p>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
            Kính gửi anh/chị,
          </p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
            Khi có nhu cầu sử dụng xe công ty, vui lòng bấm nút bên dưới để điền form đăng ký.
            Phòng Tổng Hợp sẽ xem xét và phản hồi trong thời gian sớm nhất.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${form_url}" style="display: inline-block; background: #2563eb; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: bold;">
              Đăng ký sử dụng xe
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 14px; text-align: center; margin: 24px 0 0;">
            Mỗi chuyến xe là một chuyến yêu thương
          </p>
        </div>
        <div style="text-align: center; padding: 16px; color: #94a3b8; font-size: 12px;">
          PHÒNG TỔNG HỢP — ESUHAI GROUP
        </div>
      </div>
    `;

    let sent = 0;
    for (const email of emails) {
      const result = await sendEmail({ to: email, subject, html });
      if (result.success) sent++;
    }

    return NextResponse.json({ success: true, sent, total: emails.length });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
