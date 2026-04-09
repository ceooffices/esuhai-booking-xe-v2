import { createClient } from '@/lib/supabase/server';
import { VehiclesClient } from '@/components/vehicles/vehicles-client';

export default async function VehiclesPage() {
  const supabase = await createClient();

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .order('vehicle_type');

  const { data: inspections } = await supabase
    .from('vehicle_inspections')
    .select('*')
    .order('inspection_date', { ascending: false });

  const { data: maintenance } = await supabase
    .from('vehicle_maintenance')
    .select('*')
    .order('maintenance_date', { ascending: false });

  // Group inspections & maintenance by vehicle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inspectionMap: Record<string, any[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maintenanceMap: Record<string, any[]> = {};
  inspections?.forEach(i => {
    if (!inspectionMap[i.vehicle_id]) inspectionMap[i.vehicle_id] = [];
    inspectionMap[i.vehicle_id]!.push(i);
  });
  maintenance?.forEach(m => {
    if (!maintenanceMap[m.vehicle_id]) maintenanceMap[m.vehicle_id] = [];
    maintenanceMap[m.vehicle_id]!.push(m);
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Quản lý Phương tiện</h2>
      <VehiclesClient
        vehicles={vehicles || []}
        inspectionMap={inspectionMap}
        maintenanceMap={maintenanceMap}
      />
    </div>
  );
}
