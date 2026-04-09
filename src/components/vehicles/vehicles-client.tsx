'use client';

import { useState, useTransition } from 'react';
import { Plus, Edit2, X, Shield, Wrench, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { saveVehicle } from '@/lib/actions';

interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  brand: string;
  seat_count: number;
  purchase_date: string | null;
  is_available: boolean;
}

interface Inspection {
  id: string;
  vehicle_id: string;
  inspection_date: string;
  expiry_date: string;
  center_name: string;
  next_inspection_date: string | null;
}

interface Maintenance {
  id: string;
  vehicle_id: string;
  maintenance_date: string;
  from_date: string;
  to_date: string;
  location: string;
  items: unknown[];
}

interface Props {
  vehicles: Vehicle[];
  inspectionMap: Record<string, Inspection[]>;
  maintenanceMap: Record<string, Maintenance[]>;
}

const EMPTY_FORM = {
  plate_number: '', vehicle_type: '', brand: '', seat_count: 4,
  purchase_date: '', is_available: true,
};

export function VehiclesClient({ vehicles, inspectionMap, maintenanceMap }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(v: Vehicle) {
    setForm({
      plate_number: v.plate_number,
      vehicle_type: v.vehicle_type,
      brand: v.brand,
      seat_count: v.seat_count,
      purchase_date: v.purchase_date || '',
      is_available: v.is_available,
    });
    setEditId(v.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await saveVehicle(editId, form);
    setLoading(false);
    if (result.error) {
      setToast('Lỗi: ' + result.error);
    } else {
      setToast(editId ? 'Đã cập nhật phương tiện' : 'Đã thêm phương tiện mới');
      setShowForm(false);
      startTransition(() => router.refresh());
    }
    setTimeout(() => setToast(null), 3000);
  }

  function isExpiringSoon(expiryDate: string): boolean {
    const diff = new Date(expiryDate).getTime() - Date.now();
    return diff > 0 && diff < 30 * 86400000; // 30 ngày
  }

  return (
    <div className="space-y-4">
      <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">
        <Plus size={16} />
        Thêm phương tiện
      </button>

      <div className="grid gap-3">
        {vehicles.map(v => {
          const inspections = inspectionMap[v.id] || [];
          const maintenances = maintenanceMap[v.id] || [];
          const latestInsp = inspections[0];
          const isExpanded = expandedId === v.id;

          return (
            <div key={v.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : v.id)}>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{v.vehicle_type}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        v.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {v.is_available ? 'Khả dụng' : 'Không khả dụng'}
                      </span>
                      {latestInsp && isExpiringSoon(latestInsp.expiry_date) && (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle size={12} />
                          Sắp hết hạn kiểm định
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {v.plate_number} — {v.brand} — {v.seat_count} chỗ
                      {v.purchase_date && <span> — Mua {v.purchase_date}</span>}
                    </div>
                  </div>
                  <button onClick={() => openEdit(v)} className="p-2 text-slate-400 hover:text-blue-600 transition">
                    <Edit2 size={16} />
                  </button>
                </div>

                {/* Chi tiết mở rộng */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                    {/* Kiểm định */}
                    <div>
                      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2">
                        <Shield size={14} />Lịch sử kiểm định
                      </h4>
                      {inspections.length > 0 ? (
                        <div className="space-y-1">
                          {inspections.map(i => (
                            <div key={i.id} className="text-sm text-slate-600 flex gap-4">
                              <span>Ngày: {i.inspection_date}</span>
                              <span>Hạn: {i.expiry_date}</span>
                              <span className="text-slate-400">{i.center_name}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-slate-400">Chưa có dữ liệu kiểm định</p>}
                    </div>

                    {/* Bảo dưỡng */}
                    <div>
                      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2">
                        <Wrench size={14} />Lịch sử bảo dưỡng, sửa chữa
                      </h4>
                      {maintenances.length > 0 ? (
                        <div className="space-y-1">
                          {maintenances.map(m => (
                            <div key={m.id} className="text-sm text-slate-600 flex gap-4">
                              <span>{m.maintenance_date}</span>
                              <span>{m.from_date} — {m.to_date}</span>
                              <span className="text-slate-400">{m.location}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-slate-400">Chưa có dữ liệu bảo dưỡng</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {vehicles.length === 0 && (
          <div className="text-center py-12 text-slate-400">Chưa có phương tiện nào</div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-900">{editId ? 'Chỉnh sửa phương tiện' : 'Thêm phương tiện mới'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Biển số xe</label>
                  <input value={form.plate_number} onChange={e => setForm(f => ({...f, plate_number: e.target.value}))} required
                    placeholder="51A-12345"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nhãn hiệu</label>
                  <input value={form.brand} onChange={e => setForm(f => ({...f, brand: e.target.value}))} required
                    placeholder="Toyota"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loại xe</label>
                  <input value={form.vehicle_type} onChange={e => setForm(f => ({...f, vehicle_type: e.target.value}))} required
                    placeholder="Toyota Innova 7 chỗ"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số chỗ</label>
                  <input type="number" value={form.seat_count} onChange={e => setForm(f => ({...f, seat_count: parseInt(e.target.value) || 4}))} required min={1}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày mua</label>
                <input type="date" value={form.purchase_date} onChange={e => setForm(f => ({...f, purchase_date: e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="v_available" checked={form.is_available}
                  onChange={e => setForm(f => ({...f, is_available: e.target.checked}))}
                  className="rounded border-slate-300" />
                <label htmlFor="v_available" className="text-sm text-slate-700">Khả dụng (hiển thị trong danh sách book xe)</label>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition text-sm">
                {loading ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Thêm phương tiện'}
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
