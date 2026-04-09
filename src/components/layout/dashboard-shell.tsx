'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Car,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/calendar', label: 'Lịch xe', icon: Calendar },
  { href: '/drivers', label: 'Tài xế', icon: Users },
  { href: '/vehicles', label: 'Phương tiện', icon: Car },
  { href: '/reports', label: 'Báo cáo', icon: BarChart3 },
  { href: '/settings', label: 'Cấu hình', icon: Settings },
];

interface DashboardShellProps {
  user: User;
  profile: Profile | null;
  children: React.ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị',
  manager: 'Quản lý',
  approver_l2: 'Duyệt cấp 2',
  approver_l3: 'Duyệt cấp 3',
  driver: 'Tài xế',
  staff: 'Nhân viên',
};

export function DashboardShell({ user, profile, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Thanh trên */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Quản lý Xe</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              {profile?.full_name || user.email}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              {ROLE_LABELS[profile?.role || 'staff'] || profile?.role}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-slate-600 transition"
              title="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar — desktop */}
        <aside className="hidden md:block w-56 shrink-0 py-6 pr-6">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Nội dung chính */}
        <main className="flex-1 py-6 px-4 md:px-0 min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>

      {/* Thanh dưới — mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40">
        <div className="flex justify-around py-2">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs ${
                  isActive ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
