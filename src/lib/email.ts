// ============================================================
// Email Service — Send via n8n webhook
// n8n relay htmlBody trực tiếp qua SMTP (Office365)
// ============================================================

interface EmailPayload {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  senderName?: string;
  senderEmail?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = process.env.N8N_WEBHOOK_NOTIFY;

  if (!webhookUrl) {
    console.error('N8N_WEBHOOK_NOTIFY not configured');
    return { success: false, error: 'Webhook not configured' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: payload.to,
        cc: payload.cc || '',
        bcc: payload.bcc || '',
        subject: payload.subject,
        body: payload.subject,
        htmlBody: payload.html,   // n8n đọc field này: $json.body.htmlBody
        senderName: payload.senderName || 'Phòng Tổng hợp - Esuhai',
        senderEmail: payload.senderEmail || 'booking.xe@esuhai.com',
        type: 'booking_notification',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `n8n error: ${res.status} ${text}` };
    }

    console.log(`[email] n8n OK → ${payload.to}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
