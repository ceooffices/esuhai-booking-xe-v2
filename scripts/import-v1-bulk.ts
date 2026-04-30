// ============================================================
// Import bookings từ V1 Google Sheet (CSV export) → V2 Supabase
//
// Mục tiêu: 1 LẦN backfill toàn bộ data V1 sang V2 để cutover sang
// V2-as-master. Sau đó V1 sheet → freeze, không edit nữa.
//
// Usage:
//   1. Export V1 sheet ra CSV (Google Sheets: File → Download → .csv)
//   2. Đặt file ở root project, vd: v1-export.csv
//   3. DRY RUN (default — KHÔNG insert, chỉ in report):
//        npx tsx scripts/import-v1-bulk.ts v1-export.csv
//   4. APPLY (sau khi review dry-run OK):
//        npx tsx scripts/import-v1-bulk.ts v1-export.csv --apply
//
// Env yêu cầu (.env.local):
//   - NEXT_PUBLIC_SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//
// Idempotent: re-run an toàn — script ghi notes='[v1 ts=ISO row=N]'
// và check exists trước insert. Re-run cùng CSV → 0 dupe.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import * as path from 'path';

// ---------- Load env ----------
const envPath = path.join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) {
      const val = m[2].replace(/^["']|["']$/g, '');
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------- CLI args ----------
const args = process.argv.slice(2);
const csvPath = args.find(a => !a.startsWith('--'));
const apply = args.includes('--apply');
const verbose = args.includes('--verbose') || args.includes('-v');

if (!csvPath) {
  console.error('Usage: npx tsx scripts/import-v1-bulk.ts <csv-path> [--apply] [--verbose]');
  process.exit(1);
}

if (!existsSync(csvPath)) {
  console.error(`❌ File không tồn tại: ${csvPath}`);
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  V1 → V2 BACKFILL IMPORT');
console.log('═══════════════════════════════════════════════════════════');
console.log(`📂 CSV:  ${csvPath}`);
console.log(`🔧 Mode: ${apply ? '⚠️  APPLY (SẼ INSERT THẬT vào Supabase)' : '✅ DRY-RUN (chỉ in report, không insert)'}`);
console.log('');

// ---------- Minimal CSV parser ----------
// Handle: quoted fields, embedded commas, embedded newlines, escaped quotes ("")
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(cell);
        cell = '';
      } else if (c === '\n' || c === '\r') {
        if (cell !== '' || row.length > 0) {
          row.push(cell);
          rows.push(row);
          row = [];
          cell = '';
        }
        if (c === '\r' && text[i + 1] === '\n') i++;
      } else {
        cell += c;
      }
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// ---------- V1 column indices (0-based) ----------
const COL = {
  TIMESTAMP: 0,         // Dấu thời gian (form submit timestamp)
  DEPARTMENT: 1,        // Phòng ban của anh/chị
  REQUESTER_NAME: 2,    // Họ tên người yêu cầu
  CATEGORY: 3,          // Phân loại chuyến xe (Nội bộ / Đối tác)
  PURPOSE: 4,           // Mục đích sử dụng
  TRIP_DATE: 5,         // Ngày dự kiến sử dụng xe
  PICKUP_TIME: 6,       // Giờ tài xế cần có mặt
  END_TIME: 7,          // Giờ kết thúc dự kiến
  ITINERARY: 8,         // Lịch trình chi tiết
  PASSENGER_COUNT: 9,   // Số lượng người đi trên xe
  STAFF_IN_CHARGE: 10,  // Nhân viên phụ trách chuyến đi
  FLIGHT_NUMBER: 11,    // Số hiệu chuyến bay
  MEMBER_NAMES: 12,     // Tên các thành viên
  STATUS: 13,           // Trạng thái (Chờ duyệt / Đã duyệt / Không duyệt / Hoàn tất)
  DRIVER: 14,           // Tài xế (text name)
  VEHICLE: 15,          // Xe (plate hoặc loại xe)
  TX_CONFIRM: 16,       // TX xác nhận (Chờ TX xác nhận / TX đã nhận / TX từ chối)
  REJECTION_REASON: 17, // Lý do từ chối
  NOTES: 18,            // Ghi chú
  COMPLETED_AT: 19,     // Hoàn thành lúc
  CANCELLED: 20,        // Hủy bởi / Lý do
  OPS_NOTES: 21,        // Ghi chú vận hành
  EXTERNAL_VEHICLE: 22, // Xe ngoài
  SUPPLIER: 23,         // Nhà cung cấp
  EXTERNAL_PLATE: 24,   // BS xe ngoài
  EXTERNAL_COST: 25,    // Chi phí xe ngoài
};

const EXPECTED_COLS = 26;

// ---------- Date/time parsing helpers ----------
function parseDate(s: string): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  // DD/MM/YYYY or DD-MM-YYYY
  const m1 = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m1) {
    const [, dd, mm, yyyy] = m1;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  return null;
}

function parseTime(s: string): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  // HH:mm or HH:mm:ss
  const m = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}:${m[3] || '00'}`;
}

function parseDateTime(s: string): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  // Google Sheets format "DD/MM/YYYY HH:mm:ss"
  const m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const [, dd, mm, yyyy, hh, min, sec] = m;
    // Treat as Asia/Ho_Chi_Minh timezone (+07:00)
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh.padStart(2, '0')}:${min}:${sec || '00'}+07:00`;
  }
  // ISO already
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed;
  return null;
}

function parseInt0(s: string): number {
  const n = parseInt(s?.trim() || '', 10);
  return isNaN(n) ? 0 : n;
}

function parseFloat0(s: string): number | null {
  if (!s?.trim()) return null;
  // Strip Vietnamese formatting: "1.500.000" or "1,500,000"
  const cleaned = s.trim().replace(/[.,]/g, (m, idx, full) => {
    const after = full.slice(idx + 1);
    // Last separator before 0-2 digits = decimal; else thousand separator
    return after.length <= 2 ? '.' : '';
  });
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function isTruthy(s: string): boolean {
  if (!s) return false;
  const t = s.trim().toLowerCase();
  return t === 'có' || t === 'co' || t === 'yes' || t === 'true' || t === 'x' || t === '1' || t === 'có thuê';
}

function clean(s: string | undefined): string | null {
  const t = s?.trim();
  return t || null;
}

// ---------- Status mapping ----------
type V2Status =
  | 'cho_duyet' | 'cho_duyet_cap2' | 'cho_duyet_cap3'
  | 'da_duyet' | 'khong_duyet'
  | 'cho_tx_xac_nhan' | 'tx_da_nhan' | 'tx_tu_choi'
  | 'san_sang' | 'da_hoan_thanh' | 'da_huy';

function mapStatus(row: string[]): V2Status {
  const status = (row[COL.STATUS] || '').trim().toLowerCase();
  const tx = (row[COL.TX_CONFIRM] || '').trim().toLowerCase();
  const cancelled = (row[COL.CANCELLED] || '').trim();
  const completed = (row[COL.COMPLETED_AT] || '').trim();

  // Ưu tiên huỷ → hoàn thành → driver state → trạng thái
  if (cancelled) return 'da_huy';
  if (completed) return 'da_hoan_thanh';
  if (tx.includes('từ chối') || tx.includes('tu choi')) return 'tx_tu_choi';
  if (tx.includes('đã nhận') || tx.includes('da nhan') || tx === 'tx ok') return 'tx_da_nhan';
  if (tx.includes('chờ tx') || tx.includes('cho tx')) return 'cho_tx_xac_nhan';
  if (status.includes('không duyệt') || status.includes('khong duyet')) return 'khong_duyet';
  if (status.includes('đã duyệt') || status.includes('da duyet')) return 'da_duyet';
  if (status.includes('chờ duyệt') || status.includes('cho duyet')) return 'cho_duyet';
  return 'cho_duyet'; // default
}

// ---------- Driver/vehicle lookup with cache ----------
const driverCache = new Map<string, string | null>();
const vehicleCache = new Map<string, string | null>();

async function lookupDriverIdByName(name: string): Promise<string | null> {
  if (!name?.trim()) return null;
  const key = name.trim().toLowerCase();
  if (driverCache.has(key)) return driverCache.get(key)!;

  // Tier 1: exact ilike
  const { data: t1 } = await supabase
    .from('drivers')
    .select('id, full_name')
    .ilike('full_name', name.trim())
    .limit(2);
  if (t1 && t1.length === 1) {
    driverCache.set(key, t1[0].id);
    return t1[0].id;
  }
  // Tier 2: substring 2-way (chỉ khi name đủ dài)
  if (name.trim().length >= 4) {
    const escaped = name.trim().replace(/[%_]/g, '\\$&');
    const { data: t2 } = await supabase
      .from('drivers')
      .select('id, full_name')
      .or(`full_name.ilike.%${escaped}%,full_name.ilike.${escaped}%`)
      .limit(5);
    if (t2 && t2.length === 1) {
      driverCache.set(key, t2[0].id);
      return t2[0].id;
    }
  }
  driverCache.set(key, null);
  return null;
}

async function lookupVehicleIdByText(text: string): Promise<string | null> {
  if (!text?.trim()) return null;
  const key = text.trim().toLowerCase();
  if (vehicleCache.has(key)) return vehicleCache.get(key)!;

  // Try plate_number first (exact)
  const { data: byPlate } = await supabase
    .from('vehicles')
    .select('id, plate_number, vehicle_type')
    .ilike('plate_number', text.trim())
    .limit(2);
  if (byPlate && byPlate.length === 1) {
    vehicleCache.set(key, byPlate[0].id);
    return byPlate[0].id;
  }
  // Fallback: substring on plate
  if (text.trim().length >= 4) {
    const escaped = text.trim().replace(/[%_]/g, '\\$&');
    const { data: t2 } = await supabase
      .from('vehicles')
      .select('id, plate_number')
      .or(`plate_number.ilike.%${escaped}%,vehicle_type.ilike.%${escaped}%`)
      .limit(5);
    if (t2 && t2.length === 1) {
      vehicleCache.set(key, t2[0].id);
      return t2[0].id;
    }
  }
  vehicleCache.set(key, null);
  return null;
}

// ---------- Build booking insert payload ----------
interface BookingInsert {
  requester_name: string;
  requester_department: string;
  requester_email: null; // V1 sheet không có email column → để null, V2 fallback lookup theo tên
  category: string;
  purpose: string;
  trip_date: string;
  pickup_time: string;
  end_time: string | null;
  itinerary: string | null;
  passenger_count: number;
  staff_in_charge: string | null;
  flight_number: string | null;
  member_names: string | null;
  status: V2Status;
  current_approval_level: number;
  max_approval_levels: number;
  driver_id: string | null;
  vehicle_id: string | null;
  rejection_reason: string | null;
  driver_rejection_reason: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  is_external_vehicle: boolean;
  is_designated_vehicle: boolean;
  external_vehicle_info: string | null;
  external_vehicle_cost: number | null;
  notes: string;
  ops_notes: string | null;
  created_at?: string;
}

interface RowResult {
  rowIdx: number;
  status: 'ok' | 'skip' | 'error';
  bookingId?: string;
  reason?: string;
  warnings?: string[];
}

async function processRow(row: string[], rowIdx: number): Promise<RowResult> {
  const warnings: string[] = [];

  // Validate required
  const requesterName = clean(row[COL.REQUESTER_NAME]);
  const purpose = clean(row[COL.PURPOSE]);
  const tripDate = parseDate(row[COL.TRIP_DATE]);
  const pickupTime = parseTime(row[COL.PICKUP_TIME]);

  if (!requesterName) return { rowIdx, status: 'skip', reason: 'thiếu requester_name' };
  if (!purpose) return { rowIdx, status: 'skip', reason: 'thiếu purpose' };
  if (!tripDate) return { rowIdx, status: 'skip', reason: `trip_date không parse được: "${row[COL.TRIP_DATE]}"` };
  if (!pickupTime) return { rowIdx, status: 'skip', reason: `pickup_time không parse được: "${row[COL.PICKUP_TIME]}"` };

  // Idempotency key: V1 timestamp from col 1 (form submit moment, unique per booking)
  const v1Timestamp = parseDateTime(row[COL.TIMESTAMP]) || row[COL.TIMESTAMP] || `row-${rowIdx}`;
  const idempotencyTag = `[v1 ts=${v1Timestamp} row=${rowIdx}]`;

  // Check exists
  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .ilike('notes', `${idempotencyTag}%`)
    .maybeSingle();

  if (existing) {
    return { rowIdx, status: 'skip', reason: `đã import trước đó (booking ${existing.id})` };
  }

  // Map status
  const status = mapStatus(row);
  const isExternal = isTruthy(row[COL.EXTERNAL_VEHICLE]);

  // Lookup driver/vehicle
  const driverName = clean(row[COL.DRIVER]);
  const vehicleText = clean(row[COL.VEHICLE]);
  const driverId = driverName ? await lookupDriverIdByName(driverName) : null;
  const vehicleId = vehicleText && !isExternal ? await lookupVehicleIdByText(vehicleText) : null;

  if (driverName && !driverId) warnings.push(`driver "${driverName}" không match → driver_id=null`);
  if (vehicleText && !vehicleId && !isExternal) warnings.push(`vehicle "${vehicleText}" không match → vehicle_id=null`);

  // Rejection reason (depends on status — driver reject vs manager reject)
  const rejReason = clean(row[COL.REJECTION_REASON]);
  const rejection_reason = (status === 'khong_duyet' && rejReason) ? rejReason : null;
  const driver_rejection_reason = (status === 'tx_tu_choi' && rejReason) ? rejReason : null;

  // Cancelled
  let cancelled_by: string | null = null;
  let cancellation_reason: string | null = null;
  const cancelledRaw = clean(row[COL.CANCELLED]);
  if (cancelledRaw) {
    const slashIdx = cancelledRaw.indexOf('/');
    if (slashIdx > 0) {
      cancelled_by = cancelledRaw.slice(0, slashIdx).trim();
      cancellation_reason = cancelledRaw.slice(slashIdx + 1).trim();
    } else {
      cancellation_reason = cancelledRaw;
    }
  }

  // External vehicle info: combine supplier + plate
  const supplier = clean(row[COL.SUPPLIER]);
  const externalPlate = clean(row[COL.EXTERNAL_PLATE]);
  const external_vehicle_info = isExternal
    ? [supplier, externalPlate].filter(Boolean).join(' — ') || null
    : null;
  const external_vehicle_cost = isExternal ? parseFloat0(row[COL.EXTERNAL_COST] || '') : null;

  // Notes: combine V1 notes + ops_notes + idempotency tag
  const v1Notes = clean(row[COL.NOTES]);
  const notesParts = [idempotencyTag];
  if (v1Notes) notesParts.push(v1Notes);
  const notes = notesParts.join(' ');
  const ops_notes = clean(row[COL.OPS_NOTES]);

  const payload: BookingInsert = {
    requester_name: requesterName,
    requester_department: clean(row[COL.DEPARTMENT]) || '',
    requester_email: null, // V1 không có cột email → V2 fallback lookup theo tên
    category: clean(row[COL.CATEGORY]) || 'Nội bộ',
    purpose,
    trip_date: tripDate,
    pickup_time: pickupTime,
    end_time: parseTime(row[COL.END_TIME]),
    itinerary: clean(row[COL.ITINERARY]),
    passenger_count: parseInt0(row[COL.PASSENGER_COUNT]) || 1,
    staff_in_charge: clean(row[COL.STAFF_IN_CHARGE]),
    flight_number: clean(row[COL.FLIGHT_NUMBER]),
    member_names: clean(row[COL.MEMBER_NAMES]),
    status,
    current_approval_level: ['cho_duyet', 'cho_duyet_cap2', 'cho_duyet_cap3'].includes(status)
      ? (status === 'cho_duyet_cap3' ? 3 : status === 'cho_duyet_cap2' ? 2 : 1)
      : isExternal ? 3 : 1,
    max_approval_levels: isExternal ? 3 : 1,
    driver_id: driverId,
    vehicle_id: vehicleId,
    rejection_reason,
    driver_rejection_reason,
    cancelled_by,
    cancellation_reason,
    is_external_vehicle: isExternal,
    is_designated_vehicle: false,
    external_vehicle_info,
    external_vehicle_cost,
    notes,
    ops_notes,
  };

  // Use V1 timestamp as created_at for chronological accuracy
  const createdAt = parseDateTime(row[COL.TIMESTAMP]);
  if (createdAt) payload.created_at = createdAt;

  if (verbose) {
    console.log(`  Row ${rowIdx} payload preview:`, JSON.stringify({
      requester_name: payload.requester_name,
      trip_date: payload.trip_date,
      pickup_time: payload.pickup_time,
      status: payload.status,
      driver_id: payload.driver_id,
      is_external: payload.is_external_vehicle,
    }, null, 2));
  }

  if (!apply) {
    return { rowIdx, status: 'ok', reason: 'dry-run', warnings };
  }

  const { data: inserted, error } = await supabase
    .from('bookings')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    return { rowIdx, status: 'error', reason: error.message, warnings };
  }

  return { rowIdx, status: 'ok', bookingId: inserted.id, warnings };
}

// ---------- Main ----------
async function main() {
  const csv = readFileSync(csvPath!, 'utf-8');
  const allRows = parseCSV(csv);

  if (allRows.length === 0) {
    console.error('❌ CSV rỗng');
    process.exit(1);
  }

  const header = allRows[0];
  console.log(`📋 Header (${header.length} cols): ${header.slice(0, 5).join(' | ')}...`);
  if (header.length !== EXPECTED_COLS) {
    console.warn(`⚠️  Số cột không khớp: file có ${header.length}, expected ${EXPECTED_COLS}. Tiếp tục nhưng có thể lệch field.`);
  }

  const dataRows = allRows.slice(1).filter(r => r.some(c => c?.trim()));
  console.log(`📊 ${dataRows.length} dòng dữ liệu (đã skip header + dòng rỗng)\n`);
  console.log('───────────────────────────────────────────────────────────');

  const results: RowResult[] = [];
  let okCount = 0, skipCount = 0, errorCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowIdx = i + 2; // +1 for header, +1 for 1-based sheet row number
    try {
      const r = await processRow(row, rowIdx);
      results.push(r);
      if (r.status === 'ok') okCount++;
      else if (r.status === 'skip') skipCount++;
      else errorCount++;

      const icon = r.status === 'ok' ? '✅' : r.status === 'skip' ? '⏭️ ' : '❌';
      const tail = r.bookingId ? ` → ${r.bookingId.slice(0, 8)}` : r.reason ? ` (${r.reason})` : '';
      console.log(`${icon} Row ${rowIdx}: ${row[COL.REQUESTER_NAME]?.slice(0, 30) || '(no name)'} | ${row[COL.TRIP_DATE]} ${row[COL.PICKUP_TIME]}${tail}`);
      if (r.warnings && r.warnings.length > 0) {
        for (const w of r.warnings) console.log(`     ⚠️  ${w}`);
      }
    } catch (e) {
      errorCount++;
      results.push({ rowIdx, status: 'error', reason: String(e) });
      console.log(`❌ Row ${rowIdx}: EXCEPTION ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log('───────────────────────────────────────────────────────────\n');
  console.log('📊 SUMMARY');
  console.log(`   ✅ OK:    ${okCount}`);
  console.log(`   ⏭️  SKIP:  ${skipCount}`);
  console.log(`   ❌ ERROR: ${errorCount}`);
  console.log(`   📈 Total: ${dataRows.length}`);

  if (!apply) {
    console.log('\n💡 DRY-RUN xong. Để insert thật, chạy lại với cờ --apply:');
    console.log(`   npx tsx scripts/import-v1-bulk.ts ${csvPath} --apply`);
  } else {
    console.log('\n✅ APPLY xong. Verify trên dashboard hoặc Supabase SQL:');
    console.log(`   SELECT count(*) FROM bookings WHERE notes LIKE '[v1 ts=%';`);
  }

  // Lookup cache stats
  const driversFound = [...driverCache.values()].filter(v => v).length;
  const driversNotFound = [...driverCache.values()].filter(v => !v).length;
  const vehiclesFound = [...vehicleCache.values()].filter(v => v).length;
  const vehiclesNotFound = [...vehicleCache.values()].filter(v => !v).length;
  console.log(`\n🔍 Lookup stats:`);
  console.log(`   Drivers:  ${driversFound} found, ${driversNotFound} not found`);
  console.log(`   Vehicles: ${vehiclesFound} found, ${vehiclesNotFound} not found`);

  if (driversNotFound > 0 || vehiclesNotFound > 0) {
    console.log('\n⚠️  Có driver/vehicle không match → driver_id/vehicle_id để null.');
    console.log('   Sau import có thể update tay trên dashboard, hoặc thêm vào drivers/vehicles');
    console.log('   table rồi re-run script (script idempotent — không tạo dupe).');
  }
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
