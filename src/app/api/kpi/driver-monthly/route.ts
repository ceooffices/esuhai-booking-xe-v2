import { NextResponse } from 'next/server';

import { requireManagerRole } from '@/lib/auth';
import { computeDriverMonthlyKpi, isValidMonth } from '@/lib/kpi';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  try {
    await requireManagerRole();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    const status = msg.toLowerCase().includes('quản lý') ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }

  const url = new URL(request.url);
  const driverEmail = (url.searchParams.get('driver_email') || '').trim();
  const month = (url.searchParams.get('month') || '').trim();

  if (!driverEmail || !EMAIL_RE.test(driverEmail)) {
    return NextResponse.json(
      { error: 'Tham số driver_email không hợp lệ (cần email).' },
      { status: 400 }
    );
  }
  if (!month || !isValidMonth(month)) {
    return NextResponse.json(
      { error: 'Tham số month không hợp lệ (định dạng YYYY-MM).' },
      { status: 400 }
    );
  }

  try {
    const report = await computeDriverMonthlyKpi({ driverEmail, month });
    return NextResponse.json(report, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[kpi/driver-monthly] error', err);
    return NextResponse.json({ error: 'Lỗi hệ thống khi tính KPI' }, { status: 500 });
  }
}
