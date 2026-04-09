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

interface Driver {
  id: string;
  full_name: string;
  phone: string;
  is_available: boolean;
}

interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  seat_count: number;
  is_available: boolean;
}

type FilterTab = 'pending' | 'approved' | 'waiting' | 'done' | 'all';

const FILTER_TABS: { key: FilterTab; label: string; statuses: BookingStatus[] }[] = [
  { key: 'pending', label: 'Cho duyet', statuses: ['cho_duyet', 'cho_duyet_cap2', 'cho_duyet_cap3'] },
  { key: 'approved', label: 'Da duyet', statuses: ['da_duyet'] },
  { key: 'waiting', label: 'Cho TX', statuses: ['cho_tx_xac_nhan', 'tx_da_nhan', 'tx_tu_choi'] },
  { key: 'done', label: 'Hoan thanh', statuses: ['da_hoan_thanh', 'san_sang'] },
  { key: 'all', label: 'Tat ca', statuses: [] },
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

    let result: { success?: boolean; error?: string };

    switch (action) {
      case 'approve':
        result = await approveBooking(selectedId, userEmail);
        if (result.success) showToast('Da duyet yeu cau');
        break;
      case 'reject':
        result = await rejectBooking(selectedId, userEmail, data?.reason || '');
        if (result.success) showToast('Da tu choi yeu cau');
        break;
      case 'assign':
        result = await assignDriverVehicle(selectedId, data?.driverId || '', data?.vehicleId || '');
        if (result.success) showToast('Da phan cong tai xe');
        break;
      case 'cancel':
        result = await cancelBooking(selectedId, userEmail, 'Huy boi quan ly');
        if (result.success) showToast('Da huy chuyen');
        break;
      case 'complete':
        result = await completeTrip(selectedId);
        if (result.success) showToast('Da hoan thanh chuyen');
        break;
      default:
        return;
    }

    if (result.error) {
      showToast('Loi: ' + result.error);
    } else {
      setSelectedId(null);
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: 'Cho duyet', value: stats.pending, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
          { label: 'Da duyet', value: stats.approved, color: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'Cho TX', value: stats.waiting, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'TX tu choi', value: stats.rejected, color: 'bg-rose-50 text-rose-700 border-rose-200' },
          { label: 'Hom nay', value: stats.today, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 border ${s.color}`}>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTER_TABS.map((tab) => {
          const count = tab.key === 'all'
            ? bookings.length
            : bookings.filter(b => tab.statuses.includes(b.status)).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Booking list */}
      <div className="space-y-2">
        {filtered.map((b) => (
          <BookingCard key={b.id} booking={b} onSelect={setSelectedId} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            Khong co yeu cau nao
          </div>
        )}
      </div>

      {/* Detail modal */}
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
