'use client';

import { useState, useTransition } from 'react';
import { Save } from 'lucide-react';
import { updateConfig } from '@/lib/actions';
import { useRouter } from 'next/navigation';

interface Config {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

const CONFIG_LABELS: Record<string, string> = {
  approval_levels_internal: 'Số cấp duyệt — Xe cơ hữu',
  approval_levels_external: 'Số cấp duyệt — Xe ngoài',
  approver_l1_email: 'Email duyệt cấp 1 (Trưởng ban tài xế)',
  approver_l2_email: 'Email duyệt cấp 2 (Kiểm soát chi phí)',
  approver_l3_email: 'Email duyệt cấp 3 (Admin)',
  manager_email: 'Email quản lý',
  manager_name: 'Tên quản lý',
  always_cc: 'Luôn CC email này',
  n8n_webhook_notify: 'Webhook thông báo (n8n)',
  n8n_webhook_driver: 'Webhook tài xế (n8n)',
  email_method: 'Phương thức gửi email',
  sender_name: 'Tên người gửi email',
  sender_email: 'Email người gửi',
  google_form_url: 'URL Google Form đăng ký xe',
};

const CONFIG_GROUPS = [
  { title: 'Google Form', keys: ['google_form_url'] },
  { title: 'Cấp duyệt', keys: ['approval_levels_internal', 'approval_levels_external', 'approver_l1_email', 'approver_l2_email', 'approver_l3_email'] },
  { title: 'Quản lý', keys: ['manager_email', 'manager_name', 'always_cc'] },
  { title: 'Email', keys: ['email_method', 'sender_name', 'sender_email', 'n8n_webhook_notify', 'n8n_webhook_driver'] },
];

export function SettingsClient({ configs }: { configs: Config[] }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(configs.map(c => [c.key, c.value]))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function handleSave(key: string) {
    setSaving(key);
    const result = await updateConfig(key, values[key] || '');
    setSaving(null);
    if (result.error) {
      setToast('Lỗi: ' + result.error);
    } else {
      setToast('Đã lưu cấu hình');
      startTransition(() => router.refresh());
    }
    setTimeout(() => setToast(null), 3000);
  }

  const configMap = Object.fromEntries(configs.map(c => [c.key, c]));

  return (
    <div className="space-y-6">
      {CONFIG_GROUPS.map(group => (
        <div key={group.title} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="font-semibold text-slate-700">{group.title}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {group.keys.map(key => {
              const config = configMap[key];
              if (!config) return null;
              const originalValue = config.value;
              const hasChanged = values[key] !== originalValue;

              return (
                <div key={key} className="px-5 py-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {CONFIG_LABELS[key] || key}
                  </label>
                  {config.description && (
                    <p className="text-xs text-slate-400 mb-1">{config.description}</p>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={values[key] || ''}
                      onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    {hasChanged && (
                      <button
                        onClick={() => handleSave(key)}
                        disabled={saving === key}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1"
                      >
                        <Save size={14} />
                        {saving === key ? '...' : 'Lưu'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}
