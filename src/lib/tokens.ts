// ============================================================
// HMAC-signed tokens — dùng cho /evaluate, /driver-response, /approval-response
// Ký bằng WEBHOOK_SECRET (env), verify constant-time.
//
// Format token: "{base64url(payload)}.{base64url(hmacSha256)}"
// Payload là plaintext có cấu trúc:
//   eval:{bookingId}:{evaluatorEmail}                              — đánh giá chuyến
//   drv:{bookingId}:{driverId}:{expiresEpoch}                      — phản hồi tài xế
//   approve:{bookingId}:{level}:{approverEmail}:{expiresEpoch}     — duyệt/không duyệt cấp N
// ============================================================

import { createHmac, timingSafeEqual } from 'crypto';

function getSecret(): string {
  const s = process.env.WEBHOOK_SECRET;
  if (!s) throw new Error('WEBHOOK_SECRET not configured');
  return s;
}

function b64uEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64uDecode(s: string): Buffer {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function hmac(payload: string): Buffer {
  return createHmac('sha256', getSecret()).update(payload).digest();
}

// Sign tuỳ ý payload string. Trả về token tự đóng gói.
export function signToken(payload: string): string {
  return `${b64uEncode(Buffer.from(payload))}.${b64uEncode(hmac(payload))}`;
}

// Verify token và trả lại payload nếu valid; null nếu invalid.
export function verifyToken(token: string | null | undefined): string | null {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const pBase = token.slice(0, dot);
  const sigBase = token.slice(dot + 1);
  let payloadBuf: Buffer;
  let sigBuf: Buffer;
  try {
    payloadBuf = b64uDecode(pBase);
    sigBuf = b64uDecode(sigBase);
  } catch {
    return null;
  }
  const payload = payloadBuf.toString('utf-8');
  let expected: Buffer;
  try {
    expected = hmac(payload);
  } catch {
    return null;
  }
  if (sigBuf.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(sigBuf, expected)) return null;
  } catch {
    return null;
  }
  return payload;
}

// ============================================================
// EVAL TOKEN — đánh giá chuyến đi (/evaluate)
// ============================================================

export function signEvalToken(bookingId: string, evaluatorEmail: string): string {
  return signToken(`eval:${bookingId}:${evaluatorEmail.toLowerCase()}`);
}

export function verifyEvalToken(token: string | null | undefined, bookingId: string, evaluatorEmail: string): boolean {
  const payload = verifyToken(token);
  return payload === `eval:${bookingId}:${evaluatorEmail.toLowerCase()}`;
}

// ============================================================
// DRIVER TOKEN — phản hồi tài xế (/driver-response)
// TTL mặc định 14 ngày kể từ lúc gửi email phân công.
// ============================================================

export interface DriverTokenResult {
  valid: boolean;
  expired?: boolean;
}

export function signDriverToken(bookingId: string, driverId: string, ttlSeconds: number = 14 * 86400): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return signToken(`drv:${bookingId}:${driverId}:${exp}`);
}

export function verifyDriverToken(token: string | null | undefined, bookingId: string, driverId: string): DriverTokenResult {
  const payload = verifyToken(token);
  if (!payload) return { valid: false };
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== 'drv') return { valid: false };
  if (parts[1] !== bookingId || parts[2] !== driverId) return { valid: false };
  const exp = parseInt(parts[3], 10);
  if (!exp || isNaN(exp)) return { valid: false };
  if (Math.floor(Date.now() / 1000) > exp) return { valid: true, expired: true };
  return { valid: true };
}

// ============================================================
// APPROVAL TOKEN — duyệt/không duyệt cấp N từ email-link (/approval-response)
// TTL mặc định 7 ngày kể từ lúc gửi email "Chờ duyệt cấp N".
// Mỗi token ràng buộc với (bookingId, level, approverEmail) cụ thể —
// approver cấp 2 KHÔNG dùng được token cấp 3 dù cùng booking.
// ============================================================

export type ApprovalLevel = 1 | 2 | 3;

export interface ApprovalTokenPayload {
  bookingId: string;
  level: ApprovalLevel;
  approverEmail: string;
}

export interface ApprovalTokenResult {
  valid: boolean;
  expired?: boolean;
  payload?: ApprovalTokenPayload;
}

export function signApprovalToken(
  bookingId: string,
  level: ApprovalLevel,
  approverEmail: string,
  ttlSeconds: number = 7 * 86400
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return signToken(`approve:${bookingId}:${level}:${approverEmail.toLowerCase()}:${exp}`);
}

export function verifyApprovalToken(token: string | null | undefined): ApprovalTokenResult {
  const payload = verifyToken(token);
  if (!payload) return { valid: false };
  const parts = payload.split(':');
  if (parts.length !== 5 || parts[0] !== 'approve') return { valid: false };
  const [, bookingId, levelStr, approverEmail, expStr] = parts;
  const levelNum = parseInt(levelStr, 10);
  const exp = parseInt(expStr, 10);
  if (!bookingId || !approverEmail || !exp || isNaN(exp)) return { valid: false };
  if (levelNum !== 1 && levelNum !== 2 && levelNum !== 3) return { valid: false };
  const result: ApprovalTokenPayload = {
    bookingId,
    level: levelNum as ApprovalLevel,
    approverEmail,
  };
  if (Math.floor(Date.now() / 1000) > exp) return { valid: true, expired: true, payload: result };
  return { valid: true, payload: result };
}
