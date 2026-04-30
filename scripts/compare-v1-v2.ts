// ============================================================
// So sánh data giữa V1 Google Sheet và V2 Supabase
// Dùng trước khi --apply để biết Supabase đang có gì.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  V1 SHEET ↔ V2 SUPABASE — Comparison');
  console.log('═══════════════════════════════════════════════════════════\n');

  // === V2 Supabase ===
  console.log('🟢 V2 SUPABASE STATE');
  console.log('───────────────────────────────────────────────────────────');

  const { data: bookings, count: bookingCount } = await supabase
    .from('bookings')
    .select('id, requester_name, trip_date, pickup_time, status, notes, created_at, driver_id, vehicle_id, is_external_vehicle', { count: 'exact' })
    .order('created_at', { ascending: false });

  console.log(`📦 bookings: ${bookingCount} rows`);

  // Phân loại theo nguồn
  const fromV1 = bookings?.filter(b => b.notes?.startsWith('[v1 ts=')) || [];
  const fromOther = bookings?.filter(b => !b.notes?.startsWith('[v1 ts=')) || [];
  console.log(`   ├─ Từ V1 backfill (notes [v1 ts=...]): ${fromV1.length}`);
  console.log(`   └─ Khác (test/seed/webhook GForm mới): ${fromOther.length}`);

  if (fromOther.length > 0) {
    console.log('\n   📋 Chi tiết các booking KHÔNG phải từ V1 backfill:');
    fromOther.slice(0, 20).forEach(b => {
      const tag = b.notes?.startsWith('Tạo từ dashboard') ? '[dashboard]'
                : b.notes?.includes('v1_row') ? '[webhook v1_row]'
                : b.notes ? `[notes: ${b.notes.slice(0, 30)}]`
                : '[no notes]';
      console.log(`     • ${b.requester_name?.slice(0, 30)} | ${b.trip_date} ${b.pickup_time} | status=${b.status} ${tag}`);
    });
    if (fromOther.length > 20) console.log(`     ... và ${fromOther.length - 20} rows khác`);
  }

  // Phân bố status V2
  if (bookings && bookings.length > 0) {
    const byStatus: Record<string, number> = {};
    bookings.forEach(b => { byStatus[b.status] = (byStatus[b.status] || 0) + 1; });
    console.log('\n   📊 Phân bố theo status:');
    Object.entries(byStatus).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
      console.log(`     • ${s.padEnd(20)} : ${c}`);
    });
  }

  // Drivers + vehicles
  const { count: driverCount } = await supabase.from('drivers').select('*', { count: 'exact', head: true });
  const { count: vehicleCount } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
  console.log(`\n👥 drivers: ${driverCount} rows`);
  console.log(`🚗 vehicles: ${vehicleCount} rows`);

  // List drivers + vehicles để check match
  const { data: drivers } = await supabase.from('drivers').select('full_name').order('full_name');
  if (drivers && drivers.length > 0) {
    console.log('   Drivers hiện có:');
    drivers.forEach(d => console.log(`     • ${d.full_name}`));
  }

  const { data: vehicles } = await supabase.from('vehicles').select('plate_number, vehicle_type').order('plate_number');
  if (vehicles && vehicles.length > 0) {
    console.log('   Vehicles hiện có:');
    vehicles.forEach(v => console.log(`     • ${v.plate_number} — ${v.vehicle_type}`));
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  📋 KẾT LUẬN');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (fromV1.length === 0) {
    console.log('✅ Supabase CHƯA có booking nào từ V1 → an toàn để chạy --apply');
  } else {
    console.log(`ℹ️  Supabase đã có ${fromV1.length} booking từ V1 (backfill trước đó)`);
    console.log('   Re-run --apply sẽ SKIP các booking này (idempotent), không tạo dupe');
  }

  if (fromOther.length > 0) {
    console.log(`⚠️  Có ${fromOther.length} booking KHÔNG phải từ V1 backfill`);
    console.log('   → Có thể là test data, seed, hoặc booking thật từ GForm vào webhook');
    console.log('   → Backfill sẽ KHÔNG đụng các booking này (chỉ insert mới)');
  }

  console.log('');
  console.log('📊 V1 Sheet:    57 booking (data rows)');
  console.log(`📊 V2 Supabase: ${bookingCount} booking (tổng), trong đó ${fromV1.length} từ V1`);
  console.log(`📊 Nếu --apply: dự kiến insert ${57 - fromV1.length} booking mới`);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
