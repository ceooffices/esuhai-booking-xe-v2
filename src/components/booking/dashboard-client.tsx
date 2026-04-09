'use client';

import { useState, useTransition } from 'react';
import { BookingCard } from './booking-card';
import { BookingDetailModal } from './booking-detail-modal';
import { approveBooking, rejectBooking, assignDriverVehicle, cancelBooking, completeTrip } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import type { BookingStatus } from '@/types/database';

interface Booking {
  id: string;
  requester_name: string;
  requester_department: string;
  requester_email: string | null;
  purpose: string;
  category: string;
  trip_date: string;
  pickup_time: string;
  end_time: string | null;
  itinerary: string | null;
  passenger_count: number;
  staff_in_charge: string | null;
  flight_number: string | null;
  member_names: string | null;
  status: BookingStatus;
  is_external_vehicle: boolean;
  max_approval_levels: number;
  current_approval_level: number;
  rejection_reason: string | null;
  driver_rejection_reason: string | null;
  notes: string | null;
  driver?: { full_name: string; phone: string } | null;
  vehicle?: { plate_number: string; vehicle_type: string } | null;
}

interface Driver { id: string; full_name: string; phone: string; is_available: boolean; }
interface Vehicle { id: string; plate_number: string; vehicle_type: string; seat_count: number; is_available: boolean; }

type FilterTab = 'pending' | 'approved' | 'waiting' | 'done' | 'all';

const FILTER_TABS: { key: FilterTab; label: string; statuses: BookingStatus[] }[] = [
  { key: 'pending', label: 'Chờ duyệt', statuses: ['cho_duyet', 'cho_duyet_cap2', 'cho_duyet_cap3'] },
  { key: 'approved', label: 'Đã duyệt', statuses: ['da_duyet'] },
  { key: 'waiting', label: 'Chờ TX', statuses: ['cho_tx_xac_nhan', 'tx_da_nhan', 'tx_tu_choi'] },
  { key: 'done', label: 'Hoàn thành', statuses: ['da_hoan_thanh', 'san_sang'] },
  { key: 'all', label: 'Tất cả', statuses: [] },
];

interface Props {
  bookings: Booking[];
  drivers: Driver[];
  vehicles: Vehicle[];
  userEmail: string;
  stats: { pending: number; approved: number; waiting: number; rejected: number; today: number };
}

export function DashboardClient({ bookings, drivers, vehicles, userEmail, stats }: Props) {
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = activeTab === 'all'
    ? bookings
    : bookings.filter(b => FILTER_TABS.find(t => t.key === activeTab)?.statuses.includes(b.status));

  const selectedBooking = bookings.find(b => b.id === selectedId);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAction(action: string, data?: Record<string, string>) {
    if (!selectedId) return;

    let result: { success?: boolean; error?: string; driverName?: string };

    switch (action) {
      case 'approve':
        result = await approveBooking(selectedId, userEmail);
        if (result.success) showToast('Đã duyệt yêu cầu');
        break;
      case 'reject':
        result = await rejectBooking(selectedId, userEmail, data?.reason || '');
        if (result.success) showToast('Đã từ chối yêu cầu');
        break;
      case 'assign':
        result = await assignDriverVehicle(selectedId, data?.driverId || '', data?.vehicleId || '');
        if (result.success) showToast(`Đã phân công ${result.driverName}. Email đã gửi cho tài xế.`);
        break;
      case 'cancel':
        result = await cancelBooking(selectedId, userEmail, 'Huỷ bởi quản lý');
        if (result.success) showToast('Đã huỷ chuyến');
        break;
      case 'complete':
        result = await completeTrip(selectedId);
        if (result.success) showToast('Đã hoàn thành chuyến');
        break;
      default:
        return;
    }

    if (result.error) {
      showToast('Lỗi: ' + result.error);
    } else {
      setSelectedId(null);
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="space-y-5">
      {/* Thống kê */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {[
          { label: 'Chờ duyệt', value: stats.pending, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
          { label: 'Đã duyệt', value: stats.approved, color: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'Chờ TX', value: stats.waiting, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'TX từ chối', value: stats.rejected, color: 'bg-rose-50 text-rose-700 border-rose-200' },
          { label: 'Hôm nay', value: stats.today, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 border ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs mt-1 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Thanh lọc */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTER_TABS.map((tab) => {
          const count = tab.key === 'all'
            ? bookings.length
            : bookings.filter(b => tab.statuses.includes(b.status)).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition min-h-0 ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Danh sách yêu cầu */}
      <div className="space-y-3">
        {filtered.map((b) => (
          <BookingCard key={b.id} booking={b} onSelect={setSelectedId} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-20 text-slate-400 text-base">
            Không có yêu cầu ở bước này
          </div>
        )}
      </div>

      {/* Chi tiết yêu cầu */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          drivers={drivers}
          vehicles={vehicles}
          userEmail={userEmail}
          onClose={() => setSelectedId(null)}
          onAction={handleAction}
        />
      )}

      {/* Thông báo */}
      {toast && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl text-base font-medium max-w-sm text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
