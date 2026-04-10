import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { buildFormInviteEmail } from '@/lib/email-templates';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emails, form_url, recipient_name } = await request.json();

    if (!emails?.length || !form_url) {
      return NextResponse.json({ error: 'Missing emails or form_url' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://esuhai-booking-xe-v2.vercel.app';

    const tpl = buildFormInviteEmail({
      recipientName: recipient_name || '',
      formUrl: form_url,
      dashboardUrl: `${appUrl}/dashboard`,
    });

    let sent = 0;
    for (const recipientEmail of emails) {
      const result = await sendEmail({ to: recipientEmail, subject: tpl.subject, html: tpl.html });
      if (result.success) sent++;
    }

    return NextResponse.json({ success: true, sent, total: emails.length });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
