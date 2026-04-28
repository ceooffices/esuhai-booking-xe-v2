'use client';

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { Star } from 'lucide-react';
import { submitEvaluation } from '@/lib/actions';
import { EVALUATION_CRITERIA } from '@/config/constants';

function EvaluateContent() {
  const params = useSearchParams();
  const bookingId = params.get('id');
  const evaluatorName = params.get('name') || '';
  const evaluatorEmail = params.get('email') || '';
  const token = params.get('token') || '';

  const [scores, setScores] = useState<Record<string, number>>({
    service_attitude: 0, traffic_compliance: 0,
    vehicle_quality: 0, safe_driving: 0,
  });
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  function setScore(key: string, value: number) {
    setScores(s => ({ ...s, [key]: value }));
  }

  const allScored = Object.values(scores).every(s => s > 0);

  async function handleSubmit() {
    if (!bookingId || !allScored) return;
    setStatus('loading');
    const result = await submitEvaluation(bookingId, {
      evaluator_email: evaluatorEmail,
      evaluator_name: evaluatorName,
      ...scores as { service_attitude: number; traffic_compliance: number; vehicle_quality: number; safe_driving: number },
      feedback,
      token,
    });
    if (result.error) {
      setStatus('error');
      setError(result.error);
    } else {
      setStatus('done');
    }
  }

  // Bắt buộc cả 3: id, email người đánh giá, token (HMAC ký bookingId+email)
  if (!bookingId || !evaluatorEmail || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-5">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
          <h2 className="text-xl font-bold text-slate-900">Đường dẫn không hợp lệ</h2>
          <p className="text-base text-slate-500 mt-2">Vui lòng sử dụng đường dẫn từ email gốc.</p>
        </div>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-5">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Cảm ơn anh/chị đã đánh giá</h2>
          <p className="text-base text-slate-500">Phản hồi của anh/chị giúp chúng tôi cải thiện chất lượng phục vụ.</p>
          <p className="mt-6 text-sm text-slate-400">Mỗi chuyến xe là một chuyến yêu thương</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-blue-600 px-6 py-6 text-center">
            <h1 className="text-xl font-bold text-white">Đánh giá chuyến đi</h1>
            <p className="text-blue-100 text-sm mt-1">Phòng Tổng Hợp — Esuhai Group</p>
          </div>

          <div className="px-6 py-6 space-y-6">
            <p className="text-base text-slate-600 leading-relaxed">
              Kính gửi {evaluatorName || 'anh/chị'},<br />
              Vui lòng đánh giá chất lượng phục vụ của chuyến xe vừa qua.
            </p>

            {/* 4 tiêu chí đánh giá */}
            {EVALUATION_CRITERIA.map(criterion => (
              <div key={criterion.key}>
                <label className="block text-base font-semibold text-slate-700 mb-2">
                  {criterion.label}
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setScore(criterion.key, star)}
                      className="p-1 min-h-0 transition-transform hover:scale-110"
                    >
                      <Star
                        size={32}
                        className={star <= scores[criterion.key]
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200'
                        }
                      />
                    </button>
                  ))}
                  <span className="text-sm text-slate-400 self-center ml-2">
                    {scores[criterion.key] > 0 ? `${scores[criterion.key]}/5` : ''}
                  </span>
                </div>
              </div>
            ))}

            {/* Góp ý */}
            <div>
              <label className="block text-base font-semibold text-slate-700 mb-2">
                Góp ý thêm (không bắt buộc)
              </label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Kiến nghị, góp ý với tài xế hoặc dịch vụ..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-base">{error}</div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!allScored || status === 'loading'}
              className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {status === 'loading' ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </div>
        <p className="text-center text-sm text-slate-400 mt-6">
          Mỗi chuyến xe là một chuyến yêu thương
        </p>
      </div>
    </div>
  );
}

export default function EvaluatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Đang tải...</p>
      </div>
    }>
      <EvaluateContent />
    </Suspense>
  );
}
