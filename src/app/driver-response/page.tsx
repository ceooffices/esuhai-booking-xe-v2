'use client';

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

function DriverResponseContent() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const bookingId = searchParams.get('id');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(finalAction: string) {
    setStatus('loading');
    try {
      const res = await fetch('/api/driver-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: finalAction,
          booking_id: bookingId,
          reason: reason || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('done');
        setMessage(
          finalAction === 'confirm'
            ? 'Da xac nhan nhan ca. Thong tin se duoc gui den nguoi yeu cau.'
            : 'Da gui ly do tu choi. Phong Tong Hop se sap xep tai xe khac.'
        );
      } else {
        setStatus('error');
        setMessage(data.error || 'Co loi xay ra.');
      }
    } catch {
      setStatus('error');
      setMessage('Khong ket noi duoc. Vui long thu lai.');
    }
  }

  if (!action || !bookingId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
          <h2 className="text-lg font-bold text-slate-900">Duong dan khong hop le</h2>
          <p className="text-sm text-slate-500 mt-2">
            Vui long su dung duong dan tu email goc.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
          <div className="text-4xl mb-4">{action === 'confirm' ? '\u2705' : '\u2709\uFE0F'}</div>
          <h2 className="text-lg font-bold text-slate-900">{message}</h2>
          <p className="text-sm text-slate-500 mt-2">Anh co the dong trang nay.</p>
        </div>
      </div>
    );
  }

  if (action === 'reject') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Vui long cho biet ly do</h2>
          <p className="text-sm text-slate-500 mb-4">
            Ban Dieu Phoi se sap xep tai xe khac.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Vi du: Nghi phep, trung lich, xe dang bao tri..."
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
          />
          <button
            onClick={() => handleSubmit('reject')}
            disabled={status === 'loading' || !reason.trim()}
            className="w-full mt-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition"
          >
            {status === 'loading' ? 'Dang gui...' : 'Gui ly do tu choi'}
          </button>
          {status === 'error' && (
            <p className="mt-3 text-sm text-red-600 text-center">{message}</p>
          )}
        </div>
      </div>
    );
  }

  // action === 'confirm'
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Xac nhan nhan ca</h2>
        <p className="text-sm text-slate-500 mb-6">
          Bam nut ben duoi de xac nhan anh da san sang phuc vu chuyen xe nay.
        </p>
        <button
          onClick={() => handleSubmit('confirm')}
          disabled={status === 'loading'}
          className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
        >
          {status === 'loading' ? 'Dang xu ly...' : 'Xac nhan nhan ca'}
        </button>
        {status === 'error' && (
          <p className="mt-3 text-sm text-red-600">{message}</p>
        )}
      </div>
    </div>
  );
}

export default function DriverResponsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Dang tai...</p>
      </div>
    }>
      <DriverResponseContent />
    </Suspense>
  );
}
