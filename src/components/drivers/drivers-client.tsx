'use client';

import { useState, useTransition } from 'react';
import { Plus, Phone, Mail, CreditCard, Edit2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { saveDriver } from '@/lib/actions';

interface Driver {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  license_type: string;
  license_issued_date: string | null;
  license_issued_place: string | null;
  vehicle_types_can_drive: string[];
  is_available: boolean;
}

interface Props {
  drivers: Driver[];
  tripCounts: Record<string, { total: number; completed: number }>;
}

const EMPTY_FORM = {
  full_name: '', phone: '', email: '', license_type: 'B2',
  license_issued_place: '', vehicle_types_can_drive: [] as string[],
  is_available: true,
};

const VEHICLE_TYPES = ['4 chỗ', '7 chỗ', '16 chỗ', '29 chỗ', '45 chỗ'];

export function DriversClient({ drivers, tripCounts }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(d: Driver) {
    setForm({
      full_name: d.full_name,
      phone: d.phone,
      email: d.email || '',
      license_type: d.license_type,
      license_issued_place: d.license_issued_place || '',
      vehicle_types_can_drive: d.vehicle_types_can_drive || [],
      is_available: d.is_available,
    });
    setEditId(d.id);
    setShowForm(true);
  }

  function toggleVehicleType(vt: string) {
    setForm(f => ({
      ...f,
      vehicle_types_can_drive: f.vehicle_types_can_drive.includes(vt)
        ? f.vehicle_types_can_drive.filter(v => v !== vt)
        : [...f.vehicle_types_can_drive, vt],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await saveDriver(editId, form);
    setLoading(false);
    if (result.error) {
      setToast('Lỗi: ' + result.error);
    } else {
      setToast(editId ? 'Đã cập nhật tài xế' : 'Đã thêm tài xế mới');
      setShowForm(false);
      startTransition(() => router.refresh());
    }
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-4">
      {/* Nút thêm mới */}
      <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">
        <Plus size={16} />
        Thêm tài xế
      </button>

      {/* Danh sách */}
      <div className="grid gap-3">
        {drivers.map(d => {
          const counts = tripCounts[d.id];
          return (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{d.full_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      d.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {d.is_available ? 'Sẵn sàng' : 'Không khả dụng'}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><Phone size={13} />{d.phone}</span>
                    {d.email && <span className="flex items-center gap-1"><Mail size={13} />{d.email}</span>}
                    <span className="flex items-center gap-1"><CreditCard size={13} />Bằng {d.license_type}</span>
                    {d.license_issued_place && <span>— {d.license_issued_place}</span>}
                  </div>
                  {d.vehicle_types_can_drive.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {d.vehicle_types_can_drive.map(vt => (
                        <span key={vt} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {vt}
                        </span>
                      ))}
                    </div>
                  )}
                  {counts && (
                    <div className="mt-2 text-xs text-slate-400">
                      {counts.total} chuyến phân công — {counts.completed} hoàn thành
                    </div>
                  )}
                </div>
                <button onClick={() => openEdit(d)} className="p-2 text-slate-400 hover:text-blue-600 transition">
                  <Edit2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        {drivers.length === 0 && (
          <div className="text-center py-12 text-slate-400">Chưa có tài xế nào</div>
        )}
      </div>

      {/* Form thêm/sửa */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900">{editId ? 'Chỉnh sửa tài xế' : 'Thêm tài xế mới'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                <input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                  <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} required
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loại bằng lái</label>
                  <select value={form.license_type} onChange={e => setForm(f => ({...f, license_type: e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="B1">B1</option><option value="B2">B2</option>
                    <option value="C">C</option><option value="D">D</option><option value="E">E</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nơi cấp</label>
                  <input value={form.license_issued_place} onChange={e => setForm(f => ({...f, license_issued_place: e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Loại xe có thể lái</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {VEHICLE_TYPES.map(vt => (
                    <button type="button" key={vt} onClick={() => toggleVehicleType(vt)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                        form.vehicle_types_can_drive.includes(vt)
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}>
                      {vt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="available" checked={form.is_available}
                  onChange={e => setForm(f => ({...f, is_available: e.target.checked}))}
                  className="rounded border-slate-300" />
                <label htmlFor="available" className="text-sm text-slate-700">Khả năng đáp ứng (sẵn sàng nhận ca)</label>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition text-sm">
                {loading ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Thêm tài xế'}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}
