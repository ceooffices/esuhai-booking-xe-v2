// ============================================================
// Email Service V2 — Gửi trực tiếp qua SMTP (Office365)
// Độc lập hoàn toàn — không dùng n8n
// ============================================================

import nodemailer from 'nodemailer';

interface EmailPayload {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  senderName?: string;
  senderEmail?: string;
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP chưa cấu hình. Cần: SMTP_HOST, SMTP_USER, SMTP_PASS');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = createTransport();
    const senderName = payload.senderName || 'Phòng Tổng hợp - Esuhai';
    const senderEmail = payload.senderEmail || process.env.SMTP_USER || 'booking.xe@esuhai.com';

    await transport.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: payload.to,
      cc: payload.cc || undefined,
      bcc: payload.bcc || undefined,
      subject: payload.subject,
      html: payload.html,
    });

    console.log(`[email] SMTP OK → ${payload.to}`);
    return { success: true };
  } catch (err) {
    console.error(`[email] SMTP error:`, err);
    return { success: false, error: String(err) };
  }
}
