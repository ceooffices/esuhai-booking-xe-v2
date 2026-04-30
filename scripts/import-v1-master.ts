// ============================================================
// Import master data từ V1 Sheet → V2 Supabase:
//   - Drivers (gid 224139517 — "Tên tài xế, SĐT, Email, Trạng thái")
//   - Vehicles (gid 2080583690 — "Biển số xe, Loại xe, Trạng thái")
//
// Idempotent: dedup theo full_name (driver) / plate_number (vehicle).
// Re-run an toàn — đã có thì SKIP, chưa có thì INSERT.
//
// Usage:
//   npx tsx scripts/import-v1-master.ts            (DRY-RUN)
//   npx tsx scripts/import-v1-master.ts --apply    (insert thật)
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
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SHEET_ID = '10LUaemeZ1lonkNCDT5QD9JsVIdzykNMlKz76ok3qTUg';
const GID_DRIVERS = '224139517';
const GID_VEHICLES = '2080583690';

const apply = process.argv.includes('--apply');

console.log('═══════════════════════════════════════════════════════════');
console.log('  V1 → V2 IMPORT MASTER DATA (Drivers + Vehicles)');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Mode: ${apply ? '⚠️  APPLY (insert thật)' : '✅ DRY-RUN (chỉ in report)'}\n`);

// Minimal CSV parser (handle quoted fields)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); row = []; cell = ''; }
        if (c === '\r' && text[i + 1] === '\n') i++;
      } else cell += c;
    }
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

async function fetchTabAsCSV(gid: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch gid ${gid} → HTTP ${res.status}`);
  const text = await res.text();
  return parseCSV(text);
}

// ---------- Drivers ----------

interface DriverRow {
  full_name: string;
  phone: string;
  email: string | null;
  is_available: boolean;
}

async function importDrivers() {
  console.log('───────────────────────────────────────────────────────────');
  console.log('👥 DRIVERS');
  console.log('───────────────────────────────────────────────────────────');

  const rows = await fetchTabAsCSV(GID_DRIVERS);
  // Header: Tên tài xế, Số điện thoại, Email, Trạng thái
  const dataRows = rows.slice(1).filter(r => r[0]?.trim());
  console.log(`📊 Tìm thấy ${dataRows.length} driver trong V1 sheet\n`);

  let okCount = 0, skipCount = 0, errorCount = 0;

  for (const r of dataRows) {
    const fullName = r[0]?.trim() || '';
    const phone = r[1]?.trim() || '';
    const email = r[2]?.trim() || null;
    const status = r[3]?.trim() || '';
    const isAvailable = !status || /hoạt động|active|ok|đang/i.test(status);

    if (!fullName) { skipCount++; continue; }

    // Check exists by full_name (case-insensitive)
    const { data: existing } = await supabase
      .from('drivers')
      .select('id, full_name')
      .ilike('full_name', fullName)
      .maybeSingle();

    if (existing) {
      console.log(`⏭️  ${fullName.padEnd(30)} đã có (${existing.id.slice(0, 8)})`);
      skipCount++;
      continue;
    }

    const payload: DriverRow & { license_type: string; vehicle_types_can_drive: string[] } = {
      full_name: fullName,
      phone,
      email,
      is_available: isAvailable,
      license_type: 'B2', // default — V1 không có data, anh edit sau
      vehicle_types_can_drive: [], // default — anh tick checkbox trên dashboard
    };

    if (!apply) {
      console.log(`✅ ${fullName.padEnd(30)} ${phone} ${email || '(no email)'} (dry-run insert)`);
      okCount++;
      continue;
    }

    const { error } = await supabase.from('drivers').insert(payload);
    if (error) {
      console.log(`❌ ${fullName.padEnd(30)} ERROR: ${error.message}`);
      errorCount++;
    } else {
      console.log(`✅ ${fullName.padEnd(30)} INSERTED`);
      okCount++;
    }
  }

  console.log(`\n📊 Drivers: ✅ ${okCount} | ⏭️  ${skipCount} | ❌ ${errorCount}`);
  return { okCount, skipCount, errorCount };
}

// ---------- Vehicles ----------

interface VehicleRow {
  plate_number: string;
  vehicle_type: string;
  brand: string;
  seat_count: number;
  is_available: boolean;
}

// Suy luận số chỗ từ tên loại xe (heuristic — anh edit sau nếu sai)
function inferSeatCount(vehicleType: string): number {
  const t = vehicleType.toUpperCase();
  if (/16\s*ch/.test(t) || /HIACE|SPRINTER|TRANSIT|FORD\s*TRANSIT/.test(t)) return 16;
  if (/29\s*ch/.test(t) || /COUNTY|UNIVERSE/.test(t)) return 29;
  if (/45\s*ch/.test(t)) return 45;
  if (/7\s*ch/.test(t) || /INNOVA|SIENNA|FORTUNER|XPANDER|KIA(?!\s*MORNING)/.test(t)) return 7;
  // Default sedan 4 chỗ
  return 4;
}

async function importVehicles() {
  console.log('\n───────────────────────────────────────────────────────────');
  console.log('🚗 VEHICLES');
  console.log('───────────────────────────────────────────────────────────');

  const rows = await fetchTabAsCSV(GID_VEHICLES);
  // Header: Biển số xe, Loại xe, Trạng thái
  const dataRows = rows.slice(1).filter(r => r[0]?.trim());
  console.log(`📊 Tìm thấy ${dataRows.length} vehicle trong V1 sheet\n`);

  let okCount = 0, skipCount = 0, errorCount = 0;

  for (const r of dataRows) {
    const plate = r[0]?.trim() || '';
    const vehicleType = r[1]?.trim() || '';
    const status = r[2]?.trim() || '';
    const isAvailable = !status || /hoạt động|active|ok|đang/i.test(status);

    if (!plate) { skipCount++; continue; }

    // Check exists by plate (case-insensitive)
    const { data: existing } = await supabase
      .from('vehicles')
      .select('id, plate_number')
      .ilike('plate_number', plate)
      .maybeSingle();

    if (existing) {
      console.log(`⏭️  ${plate.padEnd(15)} đã có (${existing.id.slice(0, 8)})`);
      skipCount++;
      continue;
    }

    const seatCount = inferSeatCount(vehicleType);
    const payload: VehicleRow = {
      plate_number: plate,
      vehicle_type: vehicleType || 'Chưa xác định',
      brand: '', // default — anh edit sau
      seat_count: seatCount,
      is_available: isAvailable,
    };

    if (!apply) {
      console.log(`✅ ${plate.padEnd(15)} ${vehicleType.padEnd(20)} ~${seatCount} chỗ (dry-run insert)`);
      okCount++;
      continue;
    }

    const { error } = await supabase.from('vehicles').insert(payload);
    if (error) {
      console.log(`❌ ${plate.padEnd(15)} ERROR: ${error.message}`);
      errorCount++;
    } else {
      console.log(`✅ ${plate.padEnd(15)} ${vehicleType.padEnd(20)} ~${seatCount} chỗ INSERTED`);
      okCount++;
    }
  }

  console.log(`\n📊 Vehicles: ✅ ${okCount} | ⏭️  ${skipCount} | ❌ ${errorCount}`);
  return { okCount, skipCount, errorCount };
}

// ---------- Main ----------
async function main() {
  const driversResult = await importDrivers();
  const vehiclesResult = await importVehicles();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  📊 TỔNG KẾT');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Drivers:  ✅ ${driversResult.okCount} | ⏭️  ${driversResult.skipCount} | ❌ ${driversResult.errorCount}`);
  console.log(`Vehicles: ✅ ${vehiclesResult.okCount} | ⏭️  ${vehiclesResult.skipCount} | ❌ ${vehiclesResult.errorCount}`);

  if (!apply) {
    console.log('\n💡 DRY-RUN xong. Chạy lại với --apply để insert thật:');
    console.log('   npx tsx scripts/import-v1-master.ts --apply');
  } else {
    console.log('\n✅ APPLY xong. Bước tiếp:');
    console.log('   1. Vào /drivers + /vehicles V2 dashboard verify');
    console.log('   2. Edit license_type, seat_count nếu cần (V1 không có data)');
    console.log('   3. Re-run backfill: npx tsx scripts/import-v1-bulk.ts v1-export.csv');
    console.log('      → driver_id + vehicle_id của 57 booking sẽ link đầy đủ');
  }
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
