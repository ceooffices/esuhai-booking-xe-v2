'use client';

import { useState } from 'react';
import { X, Send, Check, Mail } from 'lucide-react';

interface Props {
  staffList: { name: string; department: string; email: string; title?: string; is_manager?: boolean }[];
  formUrl: string;
  onClose: () => void;
}

export function SendFormModal({ staffList, formUrl, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // Auto-detect staff name from email
  const matchedStaff = staffList.find(s => s.email?.toLowerCase() === email.trim().toLowerCase());

  async function handleSend() {
    const trimmed = email.trim();
    if (!trimmed) return;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Email không hợp lệ');
      return;
    }

    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/send-form-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: [trimmed],
          form_url: formUrl,
          recipient_name: matchedStaff?.name || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
      } else {
        setError(data.error || 'Có lỗi xảy ra');
      }
    } catch {
      setError('Không kết nối được server');
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Đã gửi thành công!</h3>
          <p className="text-base text-slate-500">
            Email hướng dẫn đăng ký xe đã được gửi đến
          </p>
          <p className="text-base font-semibold text-blue-600 mt-1">{email}</p>
          {matchedStaff && (
            <p className="text-sm text-slate-400 mt-1">{matchedStaff.name} — {matchedStaff.department}</p>
          )}
          <button onClick={onClose}
            className="mt-6 w-full py-3.5 bg-slate-100 text-slate-700 rounded-xl text-base font-semibold hover:bg-slate-200 transition">
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Mail size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Gửi hướng dẫn đăng ký xe</h2>
              <p className="text-blue-200 text-sm">Nhập email người nhận</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 min-h-0">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">Email người nhận</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="abc@esuhai.com"
              autoFocus
              className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Auto-detect staff info */}
          {matchedStaff && (
            <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                {matchedStaff.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">
                  {matchedStaff.name}
                  {matchedStaff.is_manager && (
                    <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">QL</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 truncate">{matchedStaff.department}{matchedStaff.title ? ` · ${matchedStaff.title}` : ''}</div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}

          {!formUrl && (
            <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-xl text-sm">
              Vui lòng cấu hình URL Google Form tại trang Cấu hình trước khi gửi.
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={!email.trim() || !formUrl || sending}
            className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl text-base font-bold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Send size={18} />
            {sending ? 'Đang gửi...' : 'Gửi email hướng dẫn'}
          </button>
        </div>
      </div>
    </div>
  );
}
