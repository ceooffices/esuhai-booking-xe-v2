// ============================================================
// Email Service — Send via n8n webhook (same as Ver01)
// Fallback to Supabase Edge Function if n8n fails
// ============================================================

interface EmailPayload {
  to: string;
  cc?: string;
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
        subject: payload.subject,
        html: payload.html,
        senderName: payload.senderName || 'Phong Tong hop - Esuhai',
        senderEmail: payload.senderEmail || 'booking.xe@esuhai.com',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `n8n error: ${res.status} ${text}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
