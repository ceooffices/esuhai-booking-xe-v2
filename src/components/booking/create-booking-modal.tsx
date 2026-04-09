'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateBookingModal({ onClose, onCreated }: Props) {
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

  function set(key: string, value: unknown) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/webhooks/google-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'dashboard' }),
      });
      const data = await res.json();
      if (data.success) {
        onCreated();
      } else {
        setError(data.error || 'Có lỗi xảy ra');
      }
    } catch {
      setError('Không kết nối được server');
    }
    setLoading(false);
  }

  const DEPARTMENTS = [
    'MSA', 'Nhân sự', 'Kế toán', 'Đào tạo', 'Kinh doanh', 'IT',
    'Hành chính', 'Marketing', 'Phòng Tổng Hợp', 'Ban Giám đốc',
  ];

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
          {/* Người yêu cầu */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-700">Người yêu cầu</h3>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Họ và tên</label>
              <input value={form.requester_name} onChange={e => set('requester_name', e.target.value)} required
                placeholder="Nguyễn Văn A"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Phòng ban</label>
                <select value={form.requester_department} onChange={e => set('requester_department', e.target.value)} required
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">— Chọn —</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Email</label>
                <input type="email" value={form.requester_email} onChange={e => set('requester_email', e.target.value)}
                  placeholder="email@esuhai.com"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none" />
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
