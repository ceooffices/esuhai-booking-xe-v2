import { createClient } from '@supabase/supabase-js';

// Service role client — ONLY use in API routes / server actions
// Bypasses RLS for admin operations
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
