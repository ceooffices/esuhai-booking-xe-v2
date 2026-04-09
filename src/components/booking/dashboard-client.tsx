'use client';

import { useState, useTransition } from 'react';
import { Send } from 'lucide-react';
import { BookingCard } from './booking-card';
import { BookingDetailModal } from './booking-detail-modal';
import { SendFormModal } from './send-form-modal';
import { FadeIn, StaggerList, StaggerItem, CountUp, ToastAnimation, PageTransition } from '@/components/ui/animations';
import { approveBooking, rejectBooking, assignDriverVehicle, cancelBooking, completeTrip, savePostTrip, savePostTripCost } from '@/lib/actions';
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
  staffList: { name: string; department: string; email: string }[];
  formUrl: string;
}

export function DashboardClient({ bookings, drivers, vehicles, userEmail, stats, staffList, formUrl }: Props) {
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const filtered = activeTab === 'all'
    ? bookings
    : bookings.filter(b => FILTER_TABS.find(t => t.key === activeTab)?.statuses.includes(b.status));

  const selectedBooking = bookings.find(b => b.id === selectedId);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function savePostTripAction(bookingId: string, data: Record<string, string>): Promise<{ success?: boolean; error?: string }> {
    const ptResult = await savePostTrip(bookingId, {
      actual_departure: data.actual_departure || '',
      actual_return: data.actual_return || '',
      total_km: parseFloat(data.total_km) || 0,
      overnight_hours: parseFloat(data.overnight_hours) || 0,
    }, userEmail);
    if (ptResult.error) return ptResult;

    // Save costs
    if (data.costs) {
      try {
        const costs = JSON.parse(data.costs) as { category: string; description: string; amount: string }[];
        for (const c of costs) {
          if (parseFloat(c.amount) > 0) {
            await savePostTripCost('', bookingId, {
              cost_category: c.category,
              description: c.description,
              amount: parseFloat(c.amount),
            });
          }
        }
      } catch { /* ignore parse errors */ }
    }
    return { success: true };
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
        if (!data?.reason?.trim()) { showToast('Vui lòng nhập lý do huỷ chuyến'); return; }
        result = await cancelBooking(selectedId, userEmail, data.reason);
        if (result.success) showToast('Đã huỷ chuyến. Thông báo đã gửi cho toàn bộ thành viên.');
        break;
      case 'complete':
        result = await completeTrip(selectedId);
        if (result.success) showToast('Đã hoàn thành chuyến');
        break;
      case 'posttrip':
        result = await savePostTripAction(selectedId, data || {});
        if (result.success) showToast('Đã lưu cập nhật sau chuyến đi');
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
    <PageTransition className="space-y-5">
      {/* Thanh tiện ích */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition min-h-0 shrink-0">
          <Send size={14} />
          Gửi form đăng ký
        </button>
      </div>

      {/* Thống kê */}
      <FadeIn>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {[
            { label: 'Chờ duyệt', value: stats.pending, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
            { label: 'Đã duyệt', value: stats.approved, color: 'bg-green-50 text-green-700 border-green-200' },
            { label: 'Chờ TX', value: stats.waiting, color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { label: 'TX từ chối', value: stats.rejected, color: 'bg-rose-50 text-rose-700 border-rose-200' },
            { label: 'Hôm nay', value: stats.today, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl p-4 border ${s.color}`}>
              <div className="text-2xl font-bold"><CountUp value={s.value} /></div>
              <div className="text-xs mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* Thanh lọc */}
      <FadeIn delay={0.1}>
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
      </FadeIn>

      {/* Danh sách yêu cầu */}
      <StaggerList className="space-y-3">
        {filtered.map((b) => (
          <StaggerItem key={b.id}>
            <BookingCard booking={b} onSelect={setSelectedId} />
          </StaggerItem>
        ))}
        {filtered.length === 0 && (
          <FadeIn>
            <div className="text-center py-20 text-slate-400 text-base">
              Không có yêu cầu ở bước này
            </div>
          </FadeIn>
        )}
      </StaggerList>

      {/* Chi tiết yêu cầu */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          drivers={drivers}
          vehicles={vehicles}
          onClose={() => setSelectedId(null)}
          onAction={handleAction}
        />
      )}

      {/* Gửi form cho nhân viên */}
      {showCreate && (
        <SendFormModal
          staffList={staffList}
          formUrl={formUrl}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Thông báo */}
      <ToastAnimation show={!!toast}>
        <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl text-base font-medium max-w-sm text-center">
          {toast}
        </div>
      </ToastAnimation>
    </PageTransition>
  );
}
