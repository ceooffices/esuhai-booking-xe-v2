'use client';

import { useState } from 'react';
import { X, Check, XCircle, UserPlus, Ban, CheckCircle } from 'lucide-react';
import { StatusBadge } from './status-badge';
import { ModalOverlay } from '@/components/ui/animations';
import type { BookingStatus } from '@/types/database';

interface Driver { id: string; full_name: string; phone: string; is_available: boolean; }
interface Vehicle { id: string; plate_number: string; vehicle_type: string; seat_count: number; is_available: boolean; }

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
  const [mode, setMode] = useState<'view' | 'assign' | 'reject' | 'cancel'>('view');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
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
    <ModalOverlay onClose={onClose}>
        {/* Tiêu đề */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-900">Chi tiết yêu cầu</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 min-h-0">
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Trạng thái */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={b.status} />
            {b.is_external_vehicle && (
              <span className="text-sm px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-semibold">
                Xe ngoài — {b.max_approval_levels} cấp duyệt
              </span>
            )}
          </div>

          {/* Thông tin chi tiết */}
          <div className="space-y-4">
            <InfoRow label="Mục đích" value={b.purpose} bold />
            <InfoRow label="Người yêu cầu" value={`${b.requester_name} — ${b.requester_department}`} />
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Ngày đi" value={b.trip_date} />
              <InfoRow label="Giờ đón" value={`${b.pickup_time}${b.end_time ? ' — ' + b.end_time : ''}`} />
            </div>
            <InfoRow label="Số lượng" value={`${b.passenger_count} người`} />
            {b.staff_in_charge && <InfoRow label="NV phụ trách" value={b.staff_in_charge} />}
            {b.flight_number && <InfoRow label="Chuyến bay" value={b.flight_number} />}
            {b.member_names && <InfoRow label="Thành viên" value={b.member_names} />}
            {b.itinerary && <InfoRow label="Lịch trình" value={b.itinerary} />}
            {b.driver && (
              <div className="bg-emerald-50 rounded-xl p-4">
                <div className="text-xs text-emerald-600 font-semibold mb-1">Tài xế phục vụ</div>
                <div className="text-base font-bold text-emerald-800">{b.driver.full_name}</div>
                <a href={`tel:${b.driver.phone}`} className="text-sm text-emerald-600 underline min-h-0">{b.driver.phone}</a>
              </div>
            )}
            {b.vehicle && (
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="text-xs text-blue-600 font-semibold mb-1">Xe phục vụ</div>
                <div className="text-base font-bold text-blue-800">{b.vehicle.vehicle_type}</div>
                <div className="text-sm text-blue-600">{b.vehicle.plate_number}</div>
              </div>
            )}
            {b.rejection_reason && (
              <div className="bg-red-50 rounded-xl p-4">
                <div className="text-xs text-red-500 font-semibold mb-1">Lý do không duyệt</div>
                <div className="text-base text-red-700">{b.rejection_reason}</div>
              </div>
            )}
            {b.driver_rejection_reason && (
              <div className="bg-rose-50 rounded-xl p-4">
                <div className="text-xs text-rose-500 font-semibold mb-1">Lý do tài xế từ chối</div>
                <div className="text-base text-rose-700">{b.driver_rejection_reason}</div>
              </div>
            )}
          </div>

          {/* Phân công tài xế và xe */}
          {mode === 'assign' && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Phân công Tài xế & Xe</h3>
              <div>
                <label className="block text-base font-medium text-slate-700 mb-2">Chọn tài xế</label>
                <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">— Chọn tài xế —</option>
                  {drivers.filter(d => d.is_available).map((d) => (
                    <option key={d.id} value={d.id}>{d.full_name} — {d.phone}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-base font-medium text-slate-700 mb-2">Chọn xe</label>
                <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">— Chọn xe —</option>
                  {vehicles.filter(v => v.is_available).map((v) => (
                    <option key={v.id} value={v.id}>{v.vehicle_type} — {v.plate_number} ({v.seat_count} chỗ)</option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-slate-400">Tài xế sẽ nhận email thông báo ngay lập tức</p>
              <div className="flex gap-3">
                <button onClick={() => handleAction('assign', { driverId: selectedDriver, vehicleId: selectedVehicle })}
                  disabled={!selectedDriver || !selectedVehicle || loading}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
                  {loading ? 'Đang xử lý...' : 'Xác nhận phân công'}
                </button>
                <button onClick={() => setMode('view')}
                  className="px-6 py-4 bg-slate-100 text-slate-600 rounded-xl text-base font-semibold hover:bg-slate-200 transition">
                  Huỷ
                </button>
              </div>
            </div>
          )}

          {/* Lý do không duyệt */}
          {mode === 'reject' && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Lý do không duyệt</h3>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Vui lòng nhập lý do từ chối..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-red-500 outline-none resize-none h-28" />
              <div className="flex gap-3">
                <button onClick={() => handleAction('reject', { reason: rejectReason })}
                  disabled={!rejectReason.trim() || loading}
                  className="flex-1 py-4 bg-red-600 text-white rounded-xl text-base font-semibold hover:bg-red-700 disabled:opacity-50 transition">
                  {loading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
                <button onClick={() => setMode('view')}
                  className="px-6 py-4 bg-slate-100 text-slate-600 rounded-xl text-base font-semibold hover:bg-slate-200 transition">
                  Huỷ
                </button>
              </div>
            </div>
          )}

          {/* Huỷ chuyến — bắt buộc lý do */}
          {mode === 'cancel' && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-lg font-bold text-red-700">Huỷ chuyến xe</h3>
              <p className="text-sm text-slate-500">
                Thông báo huỷ sẽ được gửi đến toàn bộ thành viên tham gia quy trình: người yêu cầu, NV phụ trách, tài xế và quản lý.
              </p>
              <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Vui lòng nhập lý do huỷ chuyến (bắt buộc)..."
                className="w-full px-4 py-3 rounded-xl border border-red-300 text-base focus:ring-2 focus:ring-red-500 outline-none resize-none h-28" />
              <div className="flex gap-3">
                <button onClick={() => handleAction('cancel', { reason: cancelReason })}
                  disabled={!cancelReason.trim() || loading}
                  className="flex-1 py-4 bg-red-600 text-white rounded-xl text-base font-semibold hover:bg-red-700 disabled:opacity-50 transition">
                  {loading ? 'Đang xử lý...' : 'Xác nhận huỷ chuyến'}
                </button>
                <button onClick={() => setMode('view')}
                  className="px-6 py-4 bg-slate-100 text-slate-600 rounded-xl text-base font-semibold hover:bg-slate-200 transition">
                  Quay lại
                </button>
              </div>
            </div>
          )}

          {/* Nút hành động */}
          {mode === 'view' && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              {canApprove && (
                <>
                  <button onClick={() => handleAction('approve')} disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-xl text-base font-semibold hover:bg-emerald-700 disabled:opacity-50 transition">
                    <Check size={20} />
                    {b.max_approval_levels > 1 ? `Duyệt cấp ${b.current_approval_level}` : 'Duyệt yêu cầu này'}
                  </button>
                  <button onClick={() => setMode('reject')}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 rounded-xl text-base font-semibold hover:bg-red-100 transition border border-red-200">
                    <XCircle size={20} />
                    Không duyệt
                  </button>
                </>
              )}
              {canAssign && (
                <button onClick={() => setMode('assign')}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 transition">
                  <UserPlus size={20} />
                  Phân công Tài xế & Xe
                </button>
              )}
              {canComplete && (
                <button onClick={() => handleAction('complete')} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-teal-600 text-white rounded-xl text-base font-semibold hover:bg-teal-700 disabled:opacity-50 transition">
                  <CheckCircle size={20} />
                  Hoàn thành chuyến
                </button>
              )}
              {canCancel && (
                <button onClick={() => { setCancelReason(''); setMode('cancel'); }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-500 rounded-xl text-sm font-medium hover:bg-slate-200 transition">
                  <Ban size={16} />
                  Huỷ chuyến
                </button>
              )}
            </div>
          )}
        </div>
    </ModalOverlay>
  );
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`text-base text-slate-800 ${bold ? 'font-bold text-lg' : ''}`}>{value}</div>
    </div>
  );
}
