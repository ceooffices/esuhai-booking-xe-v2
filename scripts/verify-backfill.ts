// ============================================================
// Verify backfill kết quả — check linkage + status distribution
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const env = readFileSync(envPath, 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  VERIFY BACKFILL');
  console.log('═══════════════════════════════════════════════════════════\n');

  const { data: all, count } = await supabase
    .from('bookings')
    .select('id, status, driver_id, vehicle_id, is_external_vehicle, requester_name, trip_date, notes', { count: 'exact' })
    .order('trip_date', { ascending: true });

  if (!all) {
    console.log('Không lấy được data');
    return;
  }

  console.log(`📦 Tổng bookings: ${count}\n`);

  // Phân loại theo nguồn
  const v1Backfill = all.filter(b => b.notes?.includes('[v1 ts='));
  const webhookOnly = all.filter(b => b.notes?.startsWith('v1_row:') && !b.notes?.includes('[v1 ts='));
  const dashboardOnly = all.filter(b => b.notes?.startsWith('Tạo từ dashboard'));
  const noTag = all.filter(b => !b.notes || (!b.notes.includes('[v1 ts=') && !b.notes.startsWith('v1_row:') && !b.notes.startsWith('Tạo từ dashboard')));

  console.log('🏷️  Phân loại theo nguồn:');
  console.log(`   • Đã sync V1 sheet (notes có [v1 ts=]): ${v1Backfill.length}`);
  console.log(`     ├─ INSERT mới (notes start với [v1 ts=]):     ${v1Backfill.filter(b => b.notes?.startsWith('[v1 ts=')).length}`);
  console.log(`     └─ UPDATE existing (notes start với v1_row):  ${v1Backfill.filter(b => b.notes?.startsWith('v1_row:')).length}`);
  console.log(`   • Chỉ webhook, chưa sync V1 sheet: ${webhookOnly.length}`);
  console.log(`   • Tạo từ dashboard: ${dashboardOnly.length}`);
  console.log(`   • Khác/seed: ${noTag.length}\n`);

  // Status distribution
  const byStatus: Record<string, number> = {};
  all.forEach(b => { byStatus[b.status] = (byStatus[b.status] || 0) + 1; });
  console.log('📊 Phân bố status (toàn bộ):');
  Object.entries(byStatus).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
    console.log(`   • ${s.padEnd(20)} : ${c}`);
  });

  // Linkage of internal bookings
  const internal = all.filter(b => !b.is_external_vehicle);
  const internalWithDriver = internal.filter(b => b.driver_id);
  const internalWithVehicle = internal.filter(b => b.vehicle_id);
  console.log(`\n🔗 Linkage (xe cơ hữu — internal):`);
  console.log(`   • Tổng: ${internal.length}`);
  console.log(`   • Có driver_id link:  ${internalWithDriver.length}/${internal.length} (${Math.round(internalWithDriver.length / internal.length * 100)}%)`);
  console.log(`   • Có vehicle_id link: ${internalWithVehicle.length}/${internal.length} (${Math.round(internalWithVehicle.length / internal.length * 100)}%)`);

  const external = all.filter(b => b.is_external_vehicle);
  console.log(`\n🚕 Xe ngoài (external — không cần driver/vehicle link):`);
  console.log(`   • Tổng: ${external.length}`);

  // Booking missing linkage
  const internalNoDriver = internal.filter(b => !b.driver_id);
  const internalNoVehicle = internal.filter(b => !b.vehicle_id);
  if (internalNoDriver.length > 0) {
    console.log(`\n⚠️  ${internalNoDriver.length} booking nội bộ KHÔNG có driver_id (cần update tay):`);
    internalNoDriver.slice(0, 10).forEach(b => {
      console.log(`     • ${b.requester_name?.slice(0, 25).padEnd(25)} ${b.trip_date} status=${b.status}`);
    });
    if (internalNoDriver.length > 10) console.log(`     ... và ${internalNoDriver.length - 10} khác`);
  }
  if (internalNoVehicle.length > 0) {
    console.log(`\n⚠️  ${internalNoVehicle.length} booking nội bộ KHÔNG có vehicle_id (cần update tay):`);
    internalNoVehicle.slice(0, 10).forEach(b => {
      console.log(`     • ${b.requester_name?.slice(0, 25).padEnd(25)} ${b.trip_date} status=${b.status}`);
    });
    if (internalNoVehicle.length > 10) console.log(`     ... và ${internalNoVehicle.length - 10} khác`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
}

main().catch(e => { console.error(e); process.exit(1); });
