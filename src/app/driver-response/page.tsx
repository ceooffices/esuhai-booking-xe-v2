'use client';

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

function DriverResponseContent() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const bookingId = searchParams.get('id');
  const token = searchParams.get('token');
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
          token: token || undefined,
          reason: reason || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('done');
        setMessage(
          finalAction === 'confirm'
            ? 'Đã xác nhận nhận ca. Thông tin chuyến xe sẽ được gửi đến người đăng ký và nhân viên phụ trách.'
            : 'Đã gửi lý do từ chối. Phòng Tổng Hợp sẽ sắp xếp tài xế khác.'
        );
      } else {
        setStatus('error');
        setMessage(data.error || 'Có lỗi xảy ra.');
      }
    } catch {
      setStatus('error');
      setMessage('Không kết nối được. Vui lòng thử lại.');
    }
  }

  if (!action || !bookingId || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
          <h2 className="text-lg font-bold text-slate-900">Đường dẫn không hợp lệ</h2>
          <p className="text-sm text-slate-500 mt-2">
            Vui lòng sử dụng đường dẫn từ email gốc.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
          <h2 className="text-lg font-bold text-slate-900 mb-2">{message}</h2>
          <p className="text-sm text-slate-500 mt-2">Anh có thể đóng trang này.</p>
          <p className="mt-4 text-xs text-slate-400">Mỗi chuyến xe là một chuyến yêu thương</p>
        </div>
      </div>
    );
  }

  if (action === 'reject') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Vui lòng cho biết lý do</h2>
          <p className="text-sm text-slate-500 mb-4">
            Ban Điều Phối sẽ sắp xếp tài xế khác.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Nghỉ phép, trùng lịch, xe đang bảo trì..."
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
          />
          <button
            onClick={() => handleSubmit('reject')}
            disabled={status === 'loading' || !reason.trim()}
            className="w-full mt-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition"
          >
            {status === 'loading' ? 'Đang gửi...' : 'Gửi lý do từ chối'}
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
        <h2 className="text-lg font-bold text-slate-900 mb-4">Xác nhận nhận ca</h2>
        <p className="text-sm text-slate-500 mb-6">
          Vui lòng bấm nút bên dưới để xác nhận anh đã sẵn sàng phục vụ chuyến xe này.
        </p>
        <button
          onClick={() => handleSubmit('confirm')}
          disabled={status === 'loading'}
          className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
        >
          {status === 'loading' ? 'Đang xử lý...' : 'Xác nhận nhận ca'}
        </button>
        {status === 'error' && (
          <p className="mt-3 text-sm text-red-600">{message}</p>
        )}
        <p className="mt-6 text-xs text-slate-400">Mỗi chuyến xe là một chuyến yêu thương</p>
      </div>
    </div>
  );
}

export default function DriverResponsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Đang tải...</p>
      </div>
    }>
      <DriverResponseContent />
    </Suspense>
  );
}
