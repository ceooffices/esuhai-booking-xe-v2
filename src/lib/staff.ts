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

// Tìm theo tên đầy đủ (case-sensitive — staff table thường lưu chuẩn).
// Trả null nếu không có hoặc tên trùng nhiều người (maybeSingle).
export async function lookupStaffByName(name: string | null | undefined): Promise<StaffInfo | null> {
  if (!name) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from('staff')
    .select('name, email, gender, department, is_manager')
    .eq('name', name)
    .maybeSingle();
  return normalize(data as StaffRow | null);
}
