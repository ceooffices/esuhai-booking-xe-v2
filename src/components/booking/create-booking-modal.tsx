'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Search, User } from 'lucide-react';
import { createBookingFromDashboard } from '@/lib/actions';

interface StaffMember {
  name: string;
  department: string;
  email: string;
  title?: string;
  is_manager?: boolean;
}

interface Props {
  onClose: () => void;
  onCreated: () => void;
  staffList: StaffMember[];
}

export function CreateBookingModal({ onClose, onCreated, staffList }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    requester_name: '',
    requester_department: '',
    requester_email: '',
    category: 'Nội bộ',
    purpose: '',
    trip_date: '',
    pickup_time: '',
    end_time: '',
    itinerary: '',
    passenger_count: 1,
    staff_in_charge: '',
    flight_number: '',
    member_names: '',
    is_external_vehicle: false,
  });

  // --- Staff Autocomplete ---
  const [staffQuery, setStaffQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredStaff = staffQuery.length >= 1
    ? staffList.filter(s =>
        s.name.toLowerCase().includes(staffQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(staffQuery.toLowerCase()) ||
        s.department?.toLowerCase().includes(staffQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  function selectStaff(s: StaffMember) {
    setForm(f => ({
      ...f,
      requester_name: s.name,
      requester_email: s.email || '',
      requester_department: s.department || '',
    }));
    setStaffQuery(s.name);
    setShowDropdown(false);
    setHighlightIdx(-1);
  }

  function handleStaffKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || filteredStaff.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, filteredStaff.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      selectStaff(filteredStaff[highlightIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function set(key: string, value: unknown) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Server action có session auth + role check, KHÔNG cần webhook secret
    // (trước đây POST /api/webhooks/google-form bị 401 sau fix fail-closed).
    try {
      const result = await createBookingFromDashboard(form);
      if (result.success) {
        onCreated();
      } else {
        setError(result.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không kết nối được server');
    }
    setLoading(false);
  }

  // Lấy danh sách phòng ban duy nhất từ staff list
  const departments = [...new Set(staffList.map(s => s.department).filter(Boolean))].sort();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-y-auto">

        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-slate-900">Tạo yêu cầu mới</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 min-h-0">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Người đăng ký — Autocomplete */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-700 flex items-center gap-2">
              <User size={16} className="text-blue-500" />
              Người đăng ký
            </h3>

            {/* Autocomplete input */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Họ và tên</label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  value={staffQuery}
                  onChange={e => {
                    const v = e.target.value;
                    setStaffQuery(v);
                    set('requester_name', v);
                    setShowDropdown(v.length >= 1);
                    setHighlightIdx(-1);
                  }}
                  onFocus={() => { if (staffQuery.length >= 1) setShowDropdown(true); }}
                  onKeyDown={handleStaffKeyDown}
                  required
                  placeholder="Gõ tên nhân viên để tìm..."
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Dropdown */}
              {showDropdown && filteredStaff.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                  {filteredStaff.map((s, i) => (
                    <button
                      key={`${s.email}-${i}`}
                      type="button"
                      onClick={() => selectStaff(s)}
                      className={`w-full px-4 py-3 text-left flex flex-col gap-0.5 transition min-h-0 ${
                        i === highlightIdx ? 'bg-blue-50' : 'hover:bg-slate-50'
                      } ${i > 0 ? 'border-t border-slate-100' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{s.name}</span>
                        {s.is_manager && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">QL</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {s.department}{s.title ? ` · ${s.title}` : ''} · {s.email}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && staffQuery.length >= 1 && filteredStaff.length === 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center text-sm text-slate-400">
                  Không tìm thấy nhân viên &quot;{staffQuery}&quot;
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Phòng ban</label>
                <select value={form.requester_department} onChange={e => set('requester_department', e.target.value)} required
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">— Chọn —</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Email</label>
                <input type="email" value={form.requester_email} onChange={e => set('requester_email', e.target.value)}
                  placeholder="email@esuhai.com"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" readOnly={!!form.requester_email && staffList.some(s => s.email === form.requester_email)} />
              </div>
            </div>
          </div>

          {/* Chi tiết chuyến xe */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-base font-bold text-slate-700">Chi tiết chuyến xe</h3>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Mục đích / Tên khách</label>
              <input value={form.purpose} onChange={e => set('purpose', e.target.value)} required
                placeholder="Đón đối tác ABC, Đi nộp hồ sơ..."
                className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Phân loại</label>
              <div className="flex gap-3">
                {['Nội bộ', 'Đối tác'].map(cat => (
                  <button type="button" key={cat} onClick={() => set('category', cat)}
                    className={`flex-1 py-3 rounded-xl text-base font-semibold border transition ${
                      form.category === cat
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Ngày đi</label>
                <input type="date" value={form.trip_date} onChange={e => set('trip_date', e.target.value)} required
                  className="w-full px-3 py-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Giờ đón</label>
                <input type="time" value={form.pickup_time} onChange={e => set('pickup_time', e.target.value)} required
                  className="w-full px-3 py-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Giờ về</label>
                <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)}
                  className="w-full px-3 py-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Lịch trình di chuyển</label>
              <textarea value={form.itinerary} onChange={e => set('itinerary', e.target.value)}
                placeholder="Văn phòng Esuhai → Sân bay → Khách sạn → Văn phòng"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Số lượng người</label>
                <input type="number" min={1} value={form.passenger_count} onChange={e => set('passenger_count', parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">NV phụ trách</label>
                <input value={form.staff_in_charge} onChange={e => set('staff_in_charge', e.target.value)}
                  placeholder="Tên nhân viên"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Chuyến bay</label>
                <input value={form.flight_number} onChange={e => set('flight_number', e.target.value)}
                  placeholder="VN123"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Thành viên</label>
                <input value={form.member_names} onChange={e => set('member_names', e.target.value)}
                  placeholder="Tên người đi cùng"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Xe ngoài */}
          <div className="pt-4 border-t border-slate-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_external_vehicle}
                onChange={e => set('is_external_vehicle', e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
              <div>
                <span className="text-base font-semibold text-slate-700">Xe ngoài (thuê ngoài)</span>
                <p className="text-sm text-slate-400">Cần qua 3 cấp duyệt</p>
              </div>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-base">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? 'Đang tạo...' : 'Tạo yêu cầu'}
          </button>
        </form>
      </div>
    </div>
  );
}
