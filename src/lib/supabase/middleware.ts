import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes — no auth required.
  // QUAN TRỌNG: ENUM /driver-response (page) VÀ /api/driver-response (route)
  // riêng biệt — startsWith không bắc cầu giữa 2 path. Nếu thiếu API path,
  // fetch của tài xế (không login) → middleware redirect /login → POST /login
  // → 405 Method Not Allowed → driver thấy "Không kết nối được". Đã từng
  // ngầm hỏng trong prod cho tài xế thật (chỉ chạy được khi tester ở dashboard
  // với cookies có sẵn).
  const publicPaths = [
    '/login',
    '/driver-response',
    '/api/driver-response',
    '/approval-response',
    '/api/approval-response',
    '/evaluate',
    '/api/webhooks',
    '/api/auth/callback',
  ];
  const isPublic = publicPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
