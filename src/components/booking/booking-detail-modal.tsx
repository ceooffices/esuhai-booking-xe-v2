'use client';

import { useState } from 'react';
import { X, Check, XCircle, UserPlus, Ban, CheckCircle } from 'lucide-react';
import { StatusBadge } from './status-badge';
import type { BookingStatus } from '@/types/database';

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

interface BookingDetail {
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

interface Props {
  booking: BookingDetail;
  drivers: Driver[];
  vehicles: Vehicle[];
  userEmail: string;
  onClose: () => void;
  onAction: (action: string, data?: Record<string, string>) => Promise<void>;
}

export function BookingDetailModal({ booking, drivers, vehicles, userEmail, onClose, onAction }: Props) {
  const [mode, setMode] = useState<'view' | 'assign' | 'reject'>('view');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);
  const b = booking;

  const canApprove = ['cho_duyet', 'cho_duyet_cap2', 'cho_duyet_cap3'].includes(b.status);
  const canAssign = b.status === 'da_duyet';
  const canCancel = ['da_duyet', 'cho_tx_xac_nhan', 'tx_da_nhan', 'san_sang'].includes(b.status);
  const canComplete = ['tx_da_nhan', 'san_sang'].includes(b.status);

  async function handleAction(action: string, data?: Record<string, string>) {
    setLoading(true);
    await onAction(action, data);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-900">Chi tiet yeu cau</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <StatusBadge status={b.status} />
            {b.is_external_vehicle && (
              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">
                Xe ngoai — {b.max_approval_levels} cap duyet
              </span>
            )}
          </div>

          {/* Info grid */}
          <div className="space-y-3">
            <InfoRow label="Muc dich" value={b.purpose} />
            <InfoRow label="Nguoi dat" value={`${b.requester_name} — ${b.requester_department}`} />
            <InfoRow label="Ngay di" value={b.trip_date} />
            <InfoRow label="Gio" value={`${b.pickup_time}${b.end_time ? ' - ' + b.end_time : ''}`} />
            <InfoRow label="So luong" value={`${b.passenger_count} nguoi`} />
            {b.staff_in_charge && <InfoRow label="NV phu trach" value={b.staff_in_charge} />}
            {b.flight_number && <InfoRow label="Chuyen bay" value={b.flight_number} />}
            {b.member_names && <InfoRow label="Thanh vien" value={b.member_names} />}
            {b.itinerary && <InfoRow label="Lich trinh" value={b.itinerary} />}
            {b.driver && <InfoRow label="Tai xe" value={`${b.driver.full_name} — ${b.driver.phone}`} />}
            {b.vehicle && <InfoRow label="Xe" value={`${b.vehicle.vehicle_type} — ${b.vehicle.plate_number}`} />}
            {b.rejection_reason && (
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-xs text-red-500 font-medium">Ly do tu choi</div>
                <div className="text-sm text-red-700 mt-1">{b.rejection_reason}</div>
              </div>
            )}
            {b.driver_rejection_reason && (
              <div className="bg-rose-50 rounded-lg p-3">
                <div className="text-xs text-rose-500 font-medium">TX tu choi</div>
                <div className="text-sm text-rose-700 mt-1">{b.driver_rejection_reason}</div>
              </div>
            )}
          </div>

          {/* Assign mode */}
          {mode === 'assign' && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h3 className="font-semibold text-slate-800">Phan cong tai xe va xe</h3>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Tai xe</label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Chon tai xe --</option>
                  {drivers.filter(d => d.is_available).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} — {d.phone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Xe</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Chon xe --</option>
                  {vehicles.filter(v => v.is_available).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicle_type} — {v.plate_number} ({v.seat_count} cho)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('assign', { driverId: selectedDriver, vehicleId: selectedVehicle })}
                  disabled={!selectedDriver || !selectedVehicle || loading}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition text-sm"
                >
                  {loading ? 'Dang xu ly...' : 'Xac nhan phan cong'}
                </button>
                <button
                  onClick={() => setMode('view')}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition text-sm"
                >
                  Huy
                </button>
              </div>
            </div>
          )}

          {/* Reject mode */}
          {mode === 'reject' && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h3 className="font-semibold text-slate-800">Ly do khong duyet</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhap ly do tu choi..."
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none h-20"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('reject', { reason: rejectReason })}
                  disabled={!rejectReason.trim() || loading}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition text-sm"
                >
                  {loading ? 'Dang xu ly...' : 'Xac nhan tu choi'}
                </button>
                <button
                  onClick={() => setMode('view')}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition text-sm"
                >
                  Huy
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {mode === 'view' && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
              {canApprove && (
                <>
                  <button
                    onClick={() => handleAction('approve')}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition text-sm"
                  >
                    <Check size={16} />
                    {b.max_approval_levels > 1 ? `Duyet cap ${b.current_approval_level}` : 'Duyet'}
                  </button>
                  <button
                    onClick={() => setMode('reject')}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition text-sm"
                  >
                    <XCircle size={16} />
                    Khong duyet
                  </button>
                </>
              )}
              {canAssign && (
                <button
                  onClick={() => setMode('assign')}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm"
                >
                  <UserPlus size={16} />
                  Phan cong TX & Xe
                </button>
              )}
              {canComplete && (
                <button
                  onClick={() => handleAction('complete')}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 transition text-sm"
                >
                  <CheckCircle size={16} />
                  Hoan thanh
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => handleAction('cancel')}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition text-sm"
                >
                  <Ban size={16} />
                  Huy chuyen
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-sm text-slate-400 w-24 shrink-0">{label}</span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  );
}
