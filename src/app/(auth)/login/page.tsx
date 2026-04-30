'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Magic-link auth (signInWithOtp):
// - User chỉ nhập email, KHÔNG cần nhớ password
// - Supabase gửi email kèm link 1-lần → click → tự đăng nhập
// - shouldCreateUser=false: chỉ user đã được admin invite mới login được
//   (Phòng Tổng Hợp đảm bảo bằng cách disable "Allow new signup" ở
//   Supabase project + invite từng người qua Dashboard)
// - emailRedirectTo: callback xử lý code → set session → redirect /dashboard

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setIsError(true);
      setMessage('Vui lòng nhập email công ty.');
      setLoading(false);
      return;
    }

    const redirectTo = `${window.location.origin}/api/auth/callback?next=/dashboard`;

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false,
      },
    });

    if (error) {
      setIsError(true);
      // Supabase trả "Signups not allowed for otp" hoặc tương tự khi
      // shouldCreateUser=false + email chưa có trong auth.users.
      const msg = /signups not allowed|user not found|invalid|disabled/i.test(error.message)
        ? 'Email này chưa được cấp quyền truy cập hệ thống. Vui lòng liên hệ Phòng Tổng Hợp để được mời sử dụng.'
        : 'Không gửi được link đăng nhập. Vui lòng thử lại sau ít phút.';
      setMessage(msg);
    } else {
      setSent(true);
      setMessage('Đã gửi link đăng nhập đến email của anh/chị. Vui lòng kiểm hộp thư (kể cả mục Spam) và bấm vào nút trong email để vào hệ thống.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-2-2.2-3.5C13 5.5 12 5 11 5H5c-1.1 0-2.1.5-2.8 1.3L0 9v6c0 .6.4 1 1 1h1"/>
                <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Quản lý Xe</h1>
            <p className="text-base text-slate-500 mt-1">
              Phòng Tổng Hợp — Esuhai Group
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-base font-medium text-slate-700 mb-2">
                  Email công ty
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ten@esuhai.com"
                  required
                  autoFocus
                  autoComplete="email"
                  disabled={loading}
                  className="w-full px-4 py-4 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:opacity-50"
                />
                <p className="mt-2 text-sm text-slate-400">
                  Hệ thống sẽ gửi link đăng nhập đến email của anh/chị.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? 'Đang gửi link...' : 'Gửi link đăng nhập'}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <p className="text-base font-semibold text-emerald-800 mb-1">Đã gửi link đăng nhập</p>
                <p className="text-sm text-emerald-700 leading-relaxed">{message}</p>
              </div>

              <button
                type="button"
                onClick={() => { setSent(false); setMessage(''); setEmail(''); }}
                className="w-full py-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition"
              >
                Dùng email khác
              </button>
            </div>
          )}

          {!sent && message && (
            <p className={`mt-5 text-center text-base ${isError ? 'text-red-600' : 'text-emerald-600'}`}>
              {message}
            </p>
          )}

          <p className="mt-8 text-center text-sm text-slate-400">
            Mỗi chuyến xe là một chuyến yêu thương
          </p>
        </div>
      </div>
    </div>
  );
}
