/**
 * Script: Tự động điền gender cho bảng staff dựa trên tên Việt Nam.
 *
 * Logic phát hiện giới tính:
 * - Tên đệm "Thị" → female (100% chính xác với tên VN)
 * - Tên đệm "Văn" → male (100% chính xác)
 * - Tên cuối khớp danh sách tên nữ phổ biến → female
 * - Tên cuối khớp danh sách tên nam phổ biến → male
 * - Không chắc chắn → bỏ qua (cần review thủ công)
 *
 * Chạy: npx tsx scripts/fill-gender.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load .env.local manually
const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

// Bảng staff nằm ở project EsuhaiGroup PRO (fgiszdvchpknmyfscxnp)
// Không phải project booking-xe (larfhojooprqrwywyidy)
const STAFF_PROJECT_URL = process.env.STAFF_SUPABASE_URL || 'https://fgiszdvchpknmyfscxnp.supabase.co';
const STAFF_SERVICE_KEY = process.env.STAFF_SERVICE_ROLE_KEY || '';

if (!STAFF_SERVICE_KEY) {
  console.error('Thiếu STAFF_SERVICE_ROLE_KEY. Thêm vào .env.local:');
  console.error('  STAFF_SUPABASE_URL=https://fgiszdvchpknmyfscxnp.supabase.co');
  console.error('  STAFF_SERVICE_ROLE_KEY=eyJ...');
  process.exit(1);
}

const supabase = createClient(STAFF_PROJECT_URL, STAFF_SERVICE_KEY);

// Tên đệm chắc chắn
const MIDDLE_FEMALE = ['thị'];
const MIDDLE_MALE = ['văn'];

// Tên cuối phổ biến — nữ
const FEMALE_NAMES = new Set([
  'an', 'anh', 'ái',
  'bích', 'bình',
  'châu', 'chi', 'chinh', 'cúc',
  'dao', 'diễm', 'diệu', 'dung', 'duyên',
  'đào',
  'giang',
  'hà', 'hạnh', 'hằng', 'hiền', 'hoa', 'hoài', 'hồng', 'huệ', 'hương', 'huyền',
  'khuyên', 'kiều',
  'la', 'lan', 'lam', 'lệ', 'liên', 'liễu', 'linh', 'loan', 'ly', 'lý',
  'mai', 'mỹ', 'my',
  'nga', 'ngân', 'ngọc', 'nguyệt', 'nhi', 'nhiên', 'như', 'nhung', 'nương',
  'oanh',
  'phương', 'phượng',
  'quỳnh', 'quyên',
  'sen', 'sương',
  'tâm', 'thanh', 'thảo', 'thắm', 'thơ', 'thủy', 'thương', 'tiên', 'tình', 'trang', 'trinh', 'trúc', 'tuyền', 'tuyết',
  'uyên', 'uyển',
  'vân', 'vi', 'vy',
  'xoan', 'xuân',
  'yến',
]);

// Tên cuối phổ biến — nam
const MALE_NAMES = new Set([
  'bảo', 'bình',
  'cường', 'công',
  'dũng', 'dương', 'duy',
  'đạt', 'đức', 'đại',
  'hải', 'hiếu', 'hoàng', 'hùng', 'hưng', 'huy',
  'khải', 'khoa', 'khánh', 'kiên', 'kiệt',
  'lâm', 'lộc', 'long', 'luân',
  'minh', 'mạnh',
  'nam', 'nghĩa', 'nhân', 'nhật',
  'phong', 'phú', 'phúc',
  'quân', 'quang', 'quốc',
  'sơn',
  'tài', 'thành', 'thiện', 'thịnh', 'thuận', 'tiến', 'toàn', 'trí', 'triều', 'trung', 'trường', 'tuấn', 'tùng',
  'vinh', 'vũ', 'việt',
]);

// Tên xuất hiện ở cả hai giới — cần tên đệm để quyết định
const AMBIGUOUS = new Set(['anh', 'bình', 'an', 'linh', 'thanh', 'phương', 'tâm']);

function detectGender(fullName: string): 'male' | 'female' | null {
  if (!fullName) return null;
  const parts = fullName.trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return null;

  // Check tên đệm "Thị" / "Văn"
  const middleParts = parts.slice(1, -1);
  for (const m of middleParts) {
    if (MIDDLE_FEMALE.includes(m)) return 'female';
    if (MIDDLE_MALE.includes(m)) return 'male';
  }

  // Check tên cuối
  const lastName = parts[parts.length - 1];

  // Nếu ambiguous và không có tên đệm rõ → skip
  if (AMBIGUOUS.has(lastName)) return null;

  if (FEMALE_NAMES.has(lastName)) return 'female';
  if (MALE_NAMES.has(lastName)) return 'male';

  return null;
}

async function main() {
  console.log('Đọc danh sách staff...');
  const { data: staff, error } = await supabase
    .from('staff')
    .select('id, name, gender')
    .order('name');

  if (error) {
    console.error('Lỗi đọc staff:', error.message);
    return;
  }

  if (!staff || staff.length === 0) {
    console.log('Không có staff nào.');
    return;
  }

  console.log(`Tổng: ${staff.length} nhân viên`);

  const updates: { id: number; name: string; gender: 'male' | 'female' }[] = [];
  const skipped: string[] = [];

  for (const s of staff) {
    // Bỏ qua nếu đã có gender
    if (s.gender) continue;

    const g = detectGender(s.name);
    if (g) {
      updates.push({ id: s.id, name: s.name, gender: g });
    } else {
      skipped.push(s.name);
    }
  }

  console.log(`\nĐã phát hiện: ${updates.length} người`);
  console.log(`Không chắc chắn (cần review): ${skipped.length} người\n`);

  if (skipped.length > 0) {
    console.log('--- CẦN REVIEW THỦ CÔNG ---');
    for (const name of skipped) {
      console.log(`  ? ${name}`);
    }
    console.log('');
  }

  // Preview
  console.log('--- PREVIEW (10 đầu tiên) ---');
  for (const u of updates.slice(0, 10)) {
    console.log(`  ${u.gender === 'female' ? '♀' : '♂'} ${u.name} → ${u.gender}`);
  }

  // Dry run — chỉ update nếu có arg --apply
  if (process.argv.includes('--apply')) {
    console.log(`\nĐang cập nhật ${updates.length} records...`);
    let ok = 0;
    for (const u of updates) {
      const { error: updateError } = await supabase
        .from('staff')
        .update({ gender: u.gender })
        .eq('id', u.id);
      if (updateError) {
        console.error(`  Lỗi: ${u.name} — ${updateError.message}`);
      } else {
        ok++;
      }
    }
    console.log(`Hoàn tất: ${ok}/${updates.length} đã cập nhật.`);
  } else {
    console.log('\n(Dry run — thêm --apply để cập nhật thật)');
  }
}

main().catch(console.error);
