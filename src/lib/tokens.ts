// ============================================================
// HMAC-signed tokens — dùng cho /evaluate, /driver-response, /approval-response,
// /perf-eval/*
// Ký bằng WEBHOOK_SECRET (env), verify constant-time.
//
// Format token: "{base64url(payload)}.{base64url(hmacSha256)}"
// Payload là plaintext có cấu trúc:
//   eval:{bookingId}:{evaluatorEmail}                                            — đánh giá chuyến
//   drv:{bookingId}:{driverId}:{expiresEpoch}                                    — phản hồi tài xế
//   approve:{bookingId}:{level}:{approverEmail}:{expiresEpoch}                   — duyệt/không duyệt cấp N
//   eval3:{role}:{evaluatorEmail}:{periodType}:{periodStart}:{expiresEpoch}      — V3 đánh giá hiệu quả (Block N)
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

// ============================================================
// EVAL TOKEN V3 — Đánh giá hiệu quả 5 nguồn QCD (/perf-eval/*) — Block N
//
// Mỗi token ràng buộc (role, evaluatorEmail, periodType, periodStart) cụ thể.
// Period_start làm anchor (không phải period_end) để evaluator submit cuối
// kỳ vs đầu kỳ kế không tạo conflict trong UNIQUE composite key của
// performance_evaluations.
//
// TTL mặc định lớn hơn cadence để tránh expire trong cửa sổ submit:
//   daily=2 ngày, weekly=10 ngày, monthly=35 ngày.
// ============================================================

export type EvalRoleV3 =
  | 'self'
  | 'receiver_tgd'
  | 'receiver_secretary'
  | 'receiver_general'
  | 'receiver_hr'
  | 'receiver_department'
  | 'manager_ha'
  | 'hard_kpi'
  | 'peer_360';

export type EvalPeriodV3 = 'daily' | 'weekly' | 'monthly';

const EVAL_ROLES_V3: ReadonlySet<EvalRoleV3> = new Set([
  'self',
  'receiver_tgd',
  'receiver_secretary',
  'receiver_general',
  'receiver_hr',
  'receiver_department',
  'manager_ha',
  'hard_kpi',
  'peer_360',
]);

const EVAL_PERIODS_V3: ReadonlySet<EvalPeriodV3> = new Set(['daily', 'weekly', 'monthly']);

const DEFAULT_TTL_DAYS_BY_PERIOD: Record<EvalPeriodV3, number> = {
  daily: 2,
  weekly: 10,
  monthly: 35,
};

export interface EvalTokenV3Payload {
  role: EvalRoleV3;
  evaluatorEmail: string;
  periodType: EvalPeriodV3;
  periodStart: string; // YYYY-MM-DD
}

export interface EvalTokenV3Result {
  valid: boolean;
  expired?: boolean;
  payload?: EvalTokenV3Payload;
}

const PERIOD_START_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function signEvalTokenV3(
  role: EvalRoleV3,
  evaluatorEmail: string,
  periodType: EvalPeriodV3,
  periodStart: string,
  ttlDays?: number
): string {
  if (!EVAL_ROLES_V3.has(role)) throw new Error(`Invalid eval role: ${role}`);
  if (!EVAL_PERIODS_V3.has(periodType)) throw new Error(`Invalid period type: ${periodType}`);
  if (!PERIOD_START_RE.test(periodStart)) {
    throw new Error(`Invalid period_start (cần YYYY-MM-DD): ${periodStart}`);
  }
  const days = ttlDays ?? DEFAULT_TTL_DAYS_BY_PERIOD[periodType];
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  return signToken(
    `eval3:${role}:${evaluatorEmail.toLowerCase()}:${periodType}:${periodStart}:${exp}`
  );
}

export function verifyEvalTokenV3(token: string | null | undefined): EvalTokenV3Result {
  const payload = verifyToken(token);
  if (!payload) return { valid: false };
  const parts = payload.split(':');
  if (parts.length !== 6 || parts[0] !== 'eval3') return { valid: false };
  const [, roleStr, evaluatorEmail, periodTypeStr, periodStart, expStr] = parts;
  if (!EVAL_ROLES_V3.has(roleStr as EvalRoleV3)) return { valid: false };
  if (!EVAL_PERIODS_V3.has(periodTypeStr as EvalPeriodV3)) return { valid: false };
  if (!PERIOD_START_RE.test(periodStart)) return { valid: false };
  const exp = parseInt(expStr, 10);
  if (!evaluatorEmail || !exp || isNaN(exp)) return { valid: false };
  const result: EvalTokenV3Payload = {
    role: roleStr as EvalRoleV3,
    evaluatorEmail,
    periodType: periodTypeStr as EvalPeriodV3,
    periodStart,
  };
  if (Math.floor(Date.now() / 1000) > exp) return { valid: true, expired: true, payload: result };
  return { valid: true, payload: result };
}
