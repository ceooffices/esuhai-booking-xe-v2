import { requireManagerRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { KpiDriverMonthlyClient } from '@/components/kpi/kpi-driver-monthly-client';

export const dynamic = 'force-dynamic';

interface TeamLead {
  email: string;
  name: string | null;
  team_size: number;
}

export default async function KpiDriverMonthlyPage() {
  await requireManagerRole();

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from('drivers')
    .select('team_lead_email, full_name')
    .not('team_lead_email', 'is', null);

  type Row = { team_lead_email: string | null; full_name: string | null };
  const teamMap = new Map<string, { name: string | null; size: number }>();
  ((rows as Row[]) || []).forEach((r) => {
    if (!r.team_lead_email) return;
    const key = r.team_lead_email.toLowerCase();
    const cur = teamMap.get(key) || { name: null, size: 0 };
    cur.size += 1;
    teamMap.set(key, cur);
  });

  const { data: staffRows } = await admin
    .from('staff')
    .select('email, name')
    .in('email', Array.from(teamMap.keys()));
  ((staffRows as { email: string; name: string | null }[]) || []).forEach((s) => {
    const key = s.email.toLowerCase();
    const cur = teamMap.get(key);
    if (cur) cur.name = s.name;
  });

  const teamLeads: TeamLead[] = Array.from(teamMap.entries())
    .map(([email, v]) => ({ email, name: v.name, team_size: v.size }))
    .sort((a, b) => a.email.localeCompare(b.email));

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">KPI cứng theo tháng</h2>
      <p className="text-sm text-slate-500">
        Báo cáo 5 chỉ số tự động phục vụ Phiếu 4 — Phòng Tổng vụ paste vào Google
        Sheet hằng tuần (xem RUNBOOKS §5).
      </p>
      <KpiDriverMonthlyClient teamLeads={teamLeads} defaultMonth={defaultMonth} />
    </div>
  );
}
