// ============================================================
// Auth helpers — chỉ dùng server-side (server actions / route handlers).
//
// requireAuthUserEmail() — yêu cầu user đã login, trả email.
// requireManagerRole()   — thêm check user là Quản lý (is_manager=true
//                          trong staff table, HOẶC email nằm trong env
//                          ALLOWED_MANAGER_EMAILS).
//
// Lý do dual-source: staff table cần update để cấp/gỡ quyền (có lúc lag);
// env var `ALLOWED_MANAGER_EMAILS` (comma-separated) cho phép whitelist
// nhanh trên Vercel mà không cần SQL.
// ============================================================

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function getEnvWhitelist(): Set<string> {
  const raw = process.env.ALLOWED_MANAGER_EMAILS || '';
  return new Set(
    raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  );
}

export async function requireAuthUserEmail(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) throw new Error('Bạn cần đăng nhập để thực hiện thao tác này');
  return user.email;
}

export interface ManagerRole {
  email: string;
  name: string;
  gender: 'male' | 'female' | null;
  department: string | null;
  source: 'staff_table' | 'env_whitelist';
}

interface StaffRow {
  name: string | null;
  email: string | null;
  gender: 'male' | 'female' | null;
  department: string | null;
  is_manager: boolean | null;
}

// Yêu cầu user là Quản lý. Throw lỗi rõ ràng nếu không.
// LƯU Ý: dùng cho mọi server action thay đổi state (approve, reject,
// assign, cancel, save*, updateConfig). KHÔNG dùng cho action chỉ-đọc.
export async function requireManagerRole(): Promise<ManagerRole> {
  const email = await requireAuthUserEmail();
  const lcEmail = email.toLowerCase();
  const admin = createAdminClient();

  // Lookup staff dù đến từ env whitelist (để có name/gender/department)
  const { data } = await admin
    .from('staff')
    .select('name, email, gender, department, is_manager')
    .ilike('email', email)
    .maybeSingle();
  const row = (data as StaffRow | null) || null;

  // 1. Env whitelist — bypass DB check (cho phép cấp quyền nhanh)
  if (getEnvWhitelist().has(lcEmail)) {
    return {
      email,
      name: row?.name || email.split('@')[0],
      gender: row?.gender || null,
      department: row?.department || null,
      source: 'env_whitelist',
    };
  }

  // 2. DB check
  if (!row || !row.is_manager) {
    throw new Error(
      'Chỉ Quản lý mới thực hiện được thao tác này. Liên hệ admin để cấp quyền.'
    );
  }

  return {
    email,
    name: row.name || email.split('@')[0],
    gender: row.gender || null,
    department: row.department || null,
    source: 'staff_table',
  };
}
