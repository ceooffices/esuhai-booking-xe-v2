'use client';

import { useState } from 'react';
import { X, Send, Search, Check } from 'lucide-react';

interface Staff {
  name: string;
  department: string;
  email: string;
}

interface Props {
  staffList: Staff[];
  formUrl: string;
  onClose: () => void;
}

export function SendFormModal({ staffList, formUrl, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const filtered = search.trim()
    ? staffList.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.department.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
      )
    : staffList;

  function toggle(email: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(s => s.email)));
    }
  }

  async function handleSend() {
    if (selected.size === 0 || !formUrl) return;
    setSending(true);

    try {
      await fetch('/api/send-form-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: Array.from(selected),
          form_url: formUrl,
        }),
      });
      setDone(true);
    } catch {
      // silent fail
    }
    setSending(false);
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Đã gửi thành công</h3>
          <p className="text-base text-slate-500">
            Đã gửi link đăng ký xe đến {selected.size} nhân viên
          </p>
          <button onClick={onClose}
            className="mt-6 w-full py-3.5 bg-slate-100 text-slate-700 rounded-xl text-base font-semibold hover:bg-slate-200 transition">
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[92vh] flex flex-col">

        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Gửi form đăng ký xe</h2>
            <p className="text-sm text-slate-500 mt-0.5">Chọn nhân viên để gửi link Google Form</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 min-h-0">
            <X size={24} />
          </button>
        </div>

        {/* Tìm kiếm */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên, phòng ban, email..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex items-center justify-between mt-3">
            <button onClick={selectAll} className="text-sm font-semibold text-blue-600 min-h-0 px-0">
              {selected.size === filtered.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
            <span className="text-sm text-slate-400">
              Đã chọn {selected.size} / {staffList.length}
            </span>
          </div>
        </div>

        {/* Danh sách nhân viên */}
        <div className="flex-1 overflow-y-auto px-4 py-2" style={{ maxHeight: '50vh' }}>
          {filtered.map(s => (
            <button key={s.email} onClick={() => toggle(s.email)}
              className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-left transition min-h-0 ${
                selected.has(s.email) ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}>
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition ${
                selected.has(s.email) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
              }`}>
                {selected.has(s.email) && <Check size={14} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-slate-800 truncate">{s.name}</div>
                <div className="text-sm text-slate-500 truncate">{s.department} — {s.email}</div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-base">
              Không tìm thấy nhân viên
            </div>
          )}
        </div>

        {/* Nút gửi */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white">
          {!formUrl && (
            <p className="text-sm text-amber-600 mb-3">
              Vui lòng cấu hình URL Google Form tại trang Cấu hình trước khi gửi.
            </p>
          )}
          <button onClick={handleSend}
            disabled={selected.size === 0 || !formUrl || sending}
            className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl text-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition">
            <Send size={20} />
            {sending ? 'Đang gửi...' : `Gửi link cho ${selected.size} nhân viên`}
          </button>
        </div>
      </div>
    </div>
  );
}
