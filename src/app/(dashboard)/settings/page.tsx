import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from '@/components/settings/settings-client';

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: configs } = await supabase
    .from('system_config')
    .select('*')
    .order('key');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Cấu hình hệ thống</h2>
      <SettingsClient configs={configs || []} />
    </div>
  );
}
