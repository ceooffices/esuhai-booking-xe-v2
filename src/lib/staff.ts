// ============================================================
// Staff lookup helpers — query bảng `staff` (Ver01 shared).
// Dùng cho: tìm tên/giới tính/email từ context booking để xưng hô
// đúng trong email template + verify role.
//
// LƯU Ý: tất cả dùng createAdminClient (bypass RLS) vì staff là
// reference data nội bộ, không có policy public-read.
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin';

export interface StaffInfo {
  name: string;
  email: string | null;
  gender: 'male' | 'female' | null;
  department: string | null;
  is_manager: boolean;
}

interface StaffRow {
  name: string | null;
  email: string | null;
  gender: 'male' | 'female' | null;
  department: string | null;
  is_manager: boolean | null;
}

function normalize(row: StaffRow | null): StaffInfo | null {
  if (!row) return null;
  return {
    name: row.name || '',
    email: row.email,
    gender: row.gender,
    department: row.department,
    is_manager: !!row.is_manager,
  };
}

// Tìm theo email (case-insensitive). Trả null nếu không có.
export async function lookupStaffByEmail(email: string | null | undefined): Promise<StaffInfo | null> {
  if (!email) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from('staff')
    .select('name, email, gender, department, is_manager')
    .ilike('email', email)
    .maybeSingle();
  return normalize(data as StaffRow | null);
}

// Tìm theo tên — dùng cho data từ Google Form (user gõ tay → có thể
// thiếu/dư khoảng trắng, khác hoa-thường, viết tắt, ...).
//
// Multi-tier fallback (dừng ở lần match đầu tiên):
//   1. Trim + match case-insensitive đầy đủ (vd "thúy hà" = "Thúy Hà")
//   2. Substring contains 2 chiều — staff name CHỨA query, hoặc query
//      CHỨA staff name (vd "Thúy Hà" tìm thấy "Lê Thị Thúy Hà").
//      Ngưỡng tối thiểu 5 ký tự để tránh khớp tùm lum tên ngắn.
//
// Nếu match nhiều người → trả null + log warning (an toàn hơn gửi nhầm).
export async function lookupStaffByName(name: string | null | undefined): Promise<StaffInfo | null> {
  if (!name) return null;
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  const admin = createAdminClient();

  // Tier 1: exact case-insensitive match
  const { data: exact } = await admin
    .from('staff')
    .select('name, email, gender, department, is_manager')
    .ilike('name', trimmed)
    .limit(2);
  if (exact && exact.length === 1) {
    return normalize(exact[0] as StaffRow);
  }
  if (exact && exact.length > 1) {
    console.warn(`[staff] lookupByName "${trimmed}": match ${exact.length} người (exact ilike). Trả null an toàn.`);
    return null;
  }

  // Tier 2: substring 2-way (chỉ áp dụng khi name đủ dài để tránh false match)
  if (trimmed.length < 5) {
    return null;
  }
  // Escape % và _ trong query (postgres LIKE wildcards)
  const escaped = trimmed.replace(/[%_]/g, '\\$&');
  const { data: partial } = await admin
    .from('staff')
    .select('name, email, gender, department, is_manager')
    .or(`name.ilike.%${escaped}%,name.ilike.${escaped}%,name.ilike.%${escaped}`)
    .limit(5);

  if (!partial || partial.length === 0) return null;

  // Lọc thêm: 2-way contains (staff.name chứa query OR query chứa staff.name)
  const lcQuery = trimmed.toLowerCase();
  const candidates = partial.filter(p => {
    const sName = ((p as StaffRow).name || '').toLowerCase();
    return sName.includes(lcQuery) || lcQuery.includes(sName);
  });

  if (candidates.length === 1) {
    console.warn(`[staff] lookupByName "${trimmed}": fuzzy match → "${(candidates[0] as StaffRow).name}"`);
    return normalize(candidates[0] as StaffRow);
  }
  if (candidates.length > 1) {
    console.warn(`[staff] lookupByName "${trimmed}": fuzzy match ${candidates.length} người. Trả null an toàn.`);
    return null;
  }
  return null;
}
