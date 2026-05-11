'use client';

// ============================================================
// /approval-response — Public page, approver click button HMAC trong
// email "Chờ duyệt cấp N" để duyệt / không duyệt từ điện thoại không
// cần login dashboard.
//
// Query params:
//   action: 'approve' | 'reject'
//   level:  1 | 2 | 3 (chỉ hiển thị, server lấy từ token payload)
//   booking_id: hiển thị mã booking (server lấy từ token payload)
//   token:  HMAC token (server verify)
//
// Pattern copy từ src/app/driver-response/page.tsx — Suspense wrapper +
// content component dùng useSearchParams.
// ============================================================

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

function shortCode(id: string | null): string {
  return id ? id.slice(0, 8).toUpperCase() : '';
}

function ApprovalResponseContent() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const bookingId = searchParams.get('booking_id');
  const level = searchParams.get('level');
  const token = searchParams.get('token');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [alreadyProcessed, setAlreadyProcessed] = useState(false);

  async function handleSubmit(finalAction: 'approve' | 'reject') {
    setStatus('loading');
    try {
      const res = await fetch('/api/approval-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: finalAction,
          token: token || undefined,
          reason: finalAction === 'reject' ? reason : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('done');
        setAlreadyProcessed(Boolean(data.alreadyProcessed));
        if (data.alreadyProcessed) {
          setMessage(data.message || 'Yêu cầu đã được xử lý bởi người khác.');
        } else if (finalAction === 'approve') {
          setMessage(
            data.isFinalApproval
              ? 'Đã duyệt cấp cuối. Hệ thống đang thông báo Phòng Tổng Hợp phân bổ tài xế.'
              : `Đã duyệt cấp ${level}. Yêu cầu chuyển sang cấp ${data.nextLevel} để duyệt tiếp.`
          );
        } else {
          setMessage('Đã ghi nhận không duyệt. Hệ thống đang gửi thông báo cho người đăng ký và thành viên liên quan.');
        }
      } else {
        setStatus('error');
        setMessage(data.error || 'Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } catch {
      setStatus('error');
      setMessage('Không kết nối được. Vui lòng thử lại.');
    }
  }

  if (!action || !bookingId || !level || !token) {
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
          <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${alreadyProcessed ? 'bg-amber-100' : action === 'approve' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={alreadyProcessed ? '#d97706' : action === 'approve' ? '#16a34a' : '#475569'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {alreadyProcessed ? (
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              ) : (
                <path d="M20 6 9 17l-5-5" />
              )}
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            {alreadyProcessed ? 'Đã được xử lý' : action === 'approve' ? 'Đã duyệt' : 'Đã ghi nhận'}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
          <p className="text-xs text-slate-400 mt-3">Mã yêu cầu: #{shortCode(bookingId)}</p>
          <p className="text-sm text-slate-500 mt-6">Anh/chị có thể đóng trang này.</p>
          <p className="mt-6 text-xs text-slate-400 italic">Mỗi chuyến xe là một chuyến yêu thương</p>
        </div>
      </div>
    );
  }

  if (action === 'reject') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-red-100 mx-auto mb-3 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Không duyệt cấp {level}</h2>
            <p className="text-xs text-slate-400 mt-1">Mã yêu cầu: #{shortCode(bookingId)}</p>
            <p className="text-sm text-slate-500 mt-3">
              Vui lòng cho biết lý do không duyệt. Hệ thống sẽ gửi thông báo
              kèm lý do đến người đăng ký và thành viên liên quan.
            </p>
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Đã có booking trùng lịch, xin xác minh lại với Phòng Tổng Hợp..."
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none h-28 text-base"
            disabled={status === 'loading'}
          />
          <button
            onClick={() => handleSubmit('reject')}
            disabled={status === 'loading' || !reason.trim()}
            className="w-full mt-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition"
          >
            {status === 'loading' ? 'Đang gửi...' : `Gửi không duyệt cấp ${level}`}
          </button>
          {status === 'error' && (
            <p className="mt-3 text-sm text-red-600 text-center">{message}</p>
          )}
          <p className="mt-6 text-xs text-slate-400 text-center italic">Mỗi chuyến xe là một chuyến yêu thương</p>
        </div>
      </div>
    );
  }

  // action === 'approve' — screen confirm trước khi POST (tránh accidental
  // click trong inbox preview Outlook/Gmail tự render image).
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 mx-auto mb-3 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Xác nhận duyệt cấp {level}</h2>
        <p className="text-xs text-slate-400">Mã yêu cầu: #{shortCode(bookingId)}</p>
        <p className="text-sm text-slate-500 mt-4 leading-relaxed">
          Anh/chị đang duyệt cấp {level} cho yêu cầu sử dụng xe. Sau khi xác nhận,
          {level === 3
            ? ' hệ thống sẽ thông báo Phòng Tổng Hợp phân bổ tài xế.'
            : ` yêu cầu sẽ chuyển sang cấp ${Number(level) + 1} để duyệt tiếp.`}
        </p>
        <button
          onClick={() => handleSubmit('approve')}
          disabled={status === 'loading'}
          className="w-full mt-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
        >
          {status === 'loading' ? 'Đang xử lý...' : `Xác nhận duyệt cấp ${level}`}
        </button>
        {status === 'error' && (
          <p className="mt-3 text-sm text-red-600">{message}</p>
        )}
        <p className="mt-6 text-xs text-slate-400 italic">Mỗi chuyến xe là một chuyến yêu thương</p>
      </div>
    </div>
  );
}

export default function ApprovalResponsePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-slate-500">Đang tải...</p>
        </div>
      }
    >
      <ApprovalResponseContent />
    </Suspense>
  );
}
