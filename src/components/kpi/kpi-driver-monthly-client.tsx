'use client';

import { useState } from 'react';
import { Copy, Download, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

interface TeamLead {
  email: string;
  name: string | null;
  team_size: number;
}

interface Metric {
  value: number | null;
  target: number;
  score: number | null;
  category: string;
  note?: string;
}

interface KpiReport {
  driver: { email: string; name: string | null };
  period: { month: string; from: string; to: string };
  team_size: number;
  metrics: {
    late_pickup_count: Metric;
    on_time_rate_pct: Metric;
    maintenance_on_time_pct: Metric;
    fleet_cost_vs_prev_month_pct: Metric;
    team_avg_kpi: Metric;
  };
  computed_at: string;
}

const METRIC_ROWS: { key: keyof KpiReport['metrics']; label: string; unit: string }[] = [
  { key: 'late_pickup_count', label: 'Số lần trễ giờ đón (> 5 phút)', unit: 'lần' },
  { key: 'on_time_rate_pct', label: 'Phần trăm lịch xe đúng giờ (±5 phút)', unit: '%' },
  { key: 'maintenance_on_time_pct', label: 'Phần trăm bảo dưỡng đúng hạn', unit: '%' },
  { key: 'fleet_cost_vs_prev_month_pct', label: 'Chi phí đội xe so tháng trước', unit: '%' },
  { key: 'team_avg_kpi', label: 'KPI trung bình của 7 tài xế', unit: '/10' },
];

function formatValue(value: number | null, unit: string): string {
  if (value === null) return '—';
  if (unit === 'lần') return String(value);
  return `${value} ${unit}`;
}

function formatScore(score: number | null): string {
  if (score === null) return '—';
  return `${score}/5`;
}

export function KpiDriverMonthlyClient({
  teamLeads,
  defaultMonth,
}: {
  teamLeads: TeamLead[];
  defaultMonth: string;
}) {
  const [driverEmail, setDriverEmail] = useState<string>(teamLeads[0]?.email || '');
  const [customEmail, setCustomEmail] = useState<string>('');
  const [month, setMonth] = useState<string>(defaultMonth);
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<KpiReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState<boolean>(false);

  async function handleFetch() {
    const email = (customEmail.trim() || driverEmail).trim();
    if (!email || !month) {
      setError('Cần chọn driver và tháng');
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);
    setCopyOk(false);
    try {
      const url = `/api/kpi/driver-monthly?driver_email=${encodeURIComponent(email)}&month=${encodeURIComponent(month)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setError((json as { error?: string }).error || `Lỗi ${res.status}`);
      } else {
        setReport(json as KpiReport);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi mạng');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyJson() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 2000);
    } catch {
      setError('Không copy được vào clipboard');
    }
  }

  function handleDownloadCsv() {
    if (!report) return;
    const rows: string[][] = [
      ['driver_email', 'driver_name', 'month', 'team_size', 'computed_at'],
      [
        report.driver.email,
        report.driver.name || '',
        report.period.month,
        String(report.team_size),
        report.computed_at,
      ],
      [],
      ['metric', 'category', 'value', 'unit', 'target', 'score', 'note'],
    ];
    METRIC_ROWS.forEach(({ key, label, unit }) => {
      const m = report.metrics[key];
      rows.push([
        label,
        m.category,
        m.value === null ? '' : String(m.value),
        unit,
        String(m.target),
        m.score === null ? '' : String(m.score),
        m.note || '',
      ]);
    });
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kpi-${report.driver.email}-${report.period.month}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-sm space-y-1 block">
            <span className="text-slate-600">Trưởng ban TX (team lead)</span>
            <select
              value={driverEmail}
              onChange={(e) => setDriverEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
            >
              {teamLeads.length === 0 && (
                <option value="">— Chưa có team_lead_email nào trong DB —</option>
              )}
              {teamLeads.map((t) => (
                <option key={t.email} value={t.email}>
                  {t.name ? `${t.name} (${t.email})` : t.email} — {t.team_size} TX
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1 block">
            <span className="text-slate-600">Hoặc nhập email khác</span>
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="khanh@esuhai.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
            />
          </label>
          <label className="text-sm space-y-1 block">
            <span className="text-slate-600">Tháng (YYYY-MM)</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleFetch}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Tính KPI
          </button>
          <button
            onClick={handleCopyJson}
            disabled={!report}
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg disabled:opacity-60"
          >
            <Copy size={16} />
            {copyOk ? 'Đã copy JSON' : 'Copy JSON'}
          </button>
          <button
            onClick={handleDownloadCsv}
            disabled={!report}
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg disabled:opacity-60"
          >
            <Download size={16} />
            Tải CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3 flex gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {report && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <div className="flex flex-wrap justify-between gap-3 text-sm">
              <div>
                <div className="text-slate-500">Trưởng ban TX</div>
                <div className="text-slate-900 font-medium">
                  {report.driver.name || '—'} <span className="text-slate-500">({report.driver.email})</span>
                </div>
              </div>
              <div>
                <div className="text-slate-500">Tháng</div>
                <div className="text-slate-900 font-medium">
                  {report.period.month}{' '}
                  <span className="text-slate-500">
                    ({report.period.from} → {report.period.to})
                  </span>
                </div>
              </div>
              <div>
                <div className="text-slate-500">Team size</div>
                <div className="text-slate-900 font-medium">{report.team_size} tài xế</div>
              </div>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Chỉ số</th>
                <th className="px-4 py-2">Đầu mục</th>
                <th className="px-4 py-2 text-right">Thực tế</th>
                <th className="px-4 py-2 text-right">Mục tiêu</th>
                <th className="px-4 py-2 text-right">Điểm /5</th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              {METRIC_ROWS.map(({ key, label, unit }) => {
                const m = report.metrics[key];
                return (
                  <tr key={key} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">
                      <div>{label}</div>
                      {m.note && (
                        <div className="text-xs text-amber-700 mt-1">Lưu ý: {m.note}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{m.category}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatValue(m.value, unit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                      {m.target} {unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatScore(m.score)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-3 text-xs text-slate-400 border-t border-slate-100">
            Tính lúc {new Date(report.computed_at).toLocaleString('vi-VN')}
          </div>
        </div>
      )}
    </div>
  );
}
