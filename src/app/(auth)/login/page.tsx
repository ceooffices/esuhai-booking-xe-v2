'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Auth strategy: Email + Password login
// Password được admin cấp cho từng người dùng thông qua Supabase Admin API.
// Khi SMTP Office365 sẵn sàng, có thể bổ sung lại Magic Link song song.

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setIsError(true);
      setMessage('Vui lòng nhập email và mật khẩu.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      setIsError(true);
      const msg = /invalid.*credentials|invalid.*login/i.test(error.message)
        ? 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.'
        : /email.*not.*confirmed/i.test(error.message)
        ? 'Tài khoản chưa được xác nhận. Vui lòng liên hệ Phòng Tổng Hợp.'
        : `Đăng nhập thất bại: ${error.message}`;
      setMessage(msg);
    } else {
      router.push('/dashboard');
      router.refresh();
      return; // Don't reset loading — navigating
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
            </div>

            <div>
              <label htmlFor="password" className="block text-base font-medium text-slate-700 mb-2">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={loading}
                className="w-full px-4 py-4 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:opacity-50"
              />
              <p className="mt-2 text-sm text-slate-400">
                Mật khẩu được cấp bởi Phòng Tổng Hợp.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          {message && (
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
