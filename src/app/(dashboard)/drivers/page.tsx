import { createClient } from '@/lib/supabase/server';

export default async function DriversPage() {
  const supabase = await createClient();
  const { data: drivers } = await supabase
    .from('drivers')
    .select('*')
    .order('full_name');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Tai xe</h2>
      <div className="grid gap-3">
        {drivers?.map((d) => (
          <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">{d.full_name}</div>
                <div className="text-sm text-slate-500">{d.phone} — Bang {d.license_type}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                d.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {d.is_available ? 'San sang' : 'Khong kha dung'}
              </span>
            </div>
          </div>
        ))}
        {(!drivers || drivers.length === 0) && (
          <div className="text-center py-12 text-slate-400">Chua co tai xe nao</div>
        )}
      </div>
    </div>
  );
}
