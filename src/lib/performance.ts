import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { EvalPeriodV3, EvalRoleV3 } from '@/lib/tokens';

// ============================================================
// Performance evaluation V3 helpers (Block N)
//
// Schema: migrations/005_performance_evaluation_v3.sql
// Spec: docs/ROADMAP.md §7 + docs/NHAT_TRINH_SWABB_PHAM_HONG_KHANH_TB_TAI_XE_V2.2.md §6.2
//
// API chính:
//   - getOrCreateEvaluation(params)         — atomic UPSERT theo UNIQUE composite
//   - submitScores(evaluationId, scores[])  — atomic UPSERT scores theo (eval, category)
//
// Helper kèm (Block R dashboard sẽ dùng):
//   - getEvaluationByKey(params)
//   - getMonthlyAverageByCategory(subjectEmail, month, opts?)
//
// Tất cả function gọi service-role client (bypass RLS) — chỉ dùng server-side.
// Public form (peer_360 Block O) gọi qua API route + verify HMAC token trước.
// ============================================================

export type EvalCategory = 'A' | 'B' | 'C' | 'D' | 'E';
const ALL_CATEGORIES: readonly EvalCategory[] = ['A', 'B', 'C', 'D', 'E'] as const;

export interface EvaluationKey {
  subjectEmail: string;
  evaluatorEmail: string;
  evaluatorRole: EvalRoleV3;
  periodType: EvalPeriodV3;
  periodStart: string; // YYYY-MM-DD
}

export interface GetOrCreateEvaluationInput extends EvaluationKey {
  periodEnd: string; // YYYY-MM-DD
  isAnonymous?: boolean;
  notes?: string | null;
  tokenJti?: string | null;
}

export interface EvaluationRow {
  id: string;
  subject_email: string;
  evaluator_email: string;
  evaluator_role: EvalRoleV3;
  period_type: EvalPeriodV3;
  period_start: string;
  period_end: string;
  is_anonymous: boolean;
  notes: string | null;
  submitted_at: string;
  token_jti: string | null;
}

export interface ScoreInput {
  category: EvalCategory;
  q: number; // 1-5
  c: number; // 1-5
  d: number; // 1-5
}

export interface ScoreRow {
  id: string;
  evaluation_id: string;
  category: EvalCategory;
  q_score: number;
  c_score: number;
  d_score: number;
  avg_score: number;
}

// ============================================================
// Validate helpers
// ============================================================

const PERIOD_START_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function assertDate(name: string, value: string) {
  if (!PERIOD_START_RE.test(value)) {
    throw new Error(`${name} không hợp lệ (cần YYYY-MM-DD): ${value}`);
  }
}

function assertScore(name: string, value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error(`${name} không hợp lệ (cần số nguyên 1-5): ${value}`);
  }
}

function normalizeKey(k: EvaluationKey): EvaluationKey {
  return {
    subjectEmail: k.subjectEmail.trim().toLowerCase(),
    evaluatorEmail: k.evaluatorEmail.trim().toLowerCase(),
    evaluatorRole: k.evaluatorRole,
    periodType: k.periodType,
    periodStart: k.periodStart,
  };
}

// ============================================================
// getOrCreateEvaluation — atomic per (subject, evaluator, role, period)
//
// Idempotent: nếu evaluator submit lại cùng key → cập nhật is_anonymous /
// notes / token_jti / submitted_at, KHÔNG tạo bản ghi mới. Trả id để chained
// tiếp gọi submitScores().
// ============================================================

export async function getOrCreateEvaluation(
  input: GetOrCreateEvaluationInput
): Promise<EvaluationRow> {
  const key = normalizeKey(input);
  assertDate('period_start', key.periodStart);
  assertDate('period_end', input.periodEnd);
  if (input.periodEnd < key.periodStart) {
    throw new Error('period_end phải >= period_start');
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('performance_evaluations')
    .upsert(
      {
        subject_email: key.subjectEmail,
        evaluator_email: key.evaluatorEmail,
        evaluator_role: key.evaluatorRole,
        period_type: key.periodType,
        period_start: key.periodStart,
        period_end: input.periodEnd,
        is_anonymous: input.isAnonymous ?? false,
        notes: input.notes ?? null,
        token_jti: input.tokenJti ?? null,
        submitted_at: new Date().toISOString(),
      },
      {
        onConflict: 'subject_email,evaluator_email,evaluator_role,period_start,period_type',
      }
    )
    .select('*')
    .single();

  if (error) {
    console.error('[performance] getOrCreateEvaluation error', error.message);
    throw new Error('Không lưu được đánh giá');
  }
  return data as EvaluationRow;
}

// ============================================================
// submitScores — atomic UPSERT scores cho 1..5 category
//
// Đầu vào: mảng scores. Evaluator có thể chấm tập con (vd chỉ A-B-C).
// Hành vi: với mỗi entry, UPSERT theo (evaluation_id, category). Không
// xóa các category không có trong input — nếu evaluator muốn "xóa" 1
// category đã chấm, gọi removeScore() (chưa expose). Re-submit cùng
// category overrides q/c/d.
// ============================================================

export async function submitScores(
  evaluationId: string,
  scores: ReadonlyArray<ScoreInput>
): Promise<ScoreRow[]> {
  if (!evaluationId) throw new Error('evaluationId trống');
  if (scores.length === 0) return [];

  const seen = new Set<EvalCategory>();
  const rows = scores.map((s) => {
    if (seen.has(s.category)) {
      throw new Error(`Trùng category trong input: ${s.category}`);
    }
    seen.add(s.category);
    assertScore(`${s.category}.q`, s.q);
    assertScore(`${s.category}.c`, s.c);
    assertScore(`${s.category}.d`, s.d);
    return {
      evaluation_id: evaluationId,
      category: s.category,
      q_score: s.q,
      c_score: s.c,
      d_score: s.d,
    };
  });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('performance_scores')
    .upsert(rows, { onConflict: 'evaluation_id,category' })
    .select('*');

  if (error) {
    console.error('[performance] submitScores error', error.message);
    throw new Error('Không lưu được điểm chấm');
  }
  return (data as ScoreRow[]) || [];
}

// ============================================================
// getEvaluationByKey — lookup theo UNIQUE composite
// ============================================================

export async function getEvaluationByKey(key: EvaluationKey): Promise<EvaluationRow | null> {
  const k = normalizeKey(key);
  assertDate('period_start', k.periodStart);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('performance_evaluations')
    .select('*')
    .eq('subject_email', k.subjectEmail)
    .eq('evaluator_email', k.evaluatorEmail)
    .eq('evaluator_role', k.evaluatorRole)
    .eq('period_type', k.periodType)
    .eq('period_start', k.periodStart)
    .maybeSingle();
  if (error) {
    console.error('[performance] getEvaluationByKey error', error.message);
    return null;
  }
  return (data as EvaluationRow | null) ?? null;
}

// ============================================================
// getMonthlyAverageByCategory — trung bình điểm tháng theo đầu mục
//
// Trả: { A: {q, c, d, avg, count}, B: {...}, ... } cho subject_email trong
// tháng YYYY-MM. Filter optional theo role(s) (vd chỉ tính peer_360).
// ============================================================

export interface CategoryAverage {
  q: number | null;
  c: number | null;
  d: number | null;
  avg: number | null;
  count: number;
}

export interface MonthlyAverageOptions {
  roles?: ReadonlyArray<EvalRoleV3>;
}

export async function getMonthlyAverageByCategory(
  subjectEmail: string,
  month: string,
  opts: MonthlyAverageOptions = {}
): Promise<Record<EvalCategory, CategoryAverage>> {
  if (!MONTH_RE.test(month)) {
    throw new Error(`month không hợp lệ (cần YYYY-MM): ${month}`);
  }
  const subject = subjectEmail.trim().toLowerCase();
  const [yStr, mStr] = month.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const monthStart = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

  const admin = createAdminClient();
  let q = admin
    .from('performance_evaluations')
    .select('id, evaluator_role')
    .eq('subject_email', subject)
    .gte('period_start', monthStart)
    .lte('period_start', monthEnd);
  if (opts.roles && opts.roles.length > 0) {
    q = q.in('evaluator_role', opts.roles as EvalRoleV3[]);
  }
  const { data: evals, error: evalErr } = await q;
  if (evalErr) {
    console.error('[performance] getMonthlyAverageByCategory eval error', evalErr.message);
    return emptyByCategory();
  }
  const evalIds = ((evals as { id: string }[]) || []).map((e) => e.id);
  if (evalIds.length === 0) return emptyByCategory();

  const { data: scores, error: scoreErr } = await admin
    .from('performance_scores')
    .select('category, q_score, c_score, d_score, avg_score')
    .in('evaluation_id', evalIds);
  if (scoreErr) {
    console.error('[performance] getMonthlyAverageByCategory scores error', scoreErr.message);
    return emptyByCategory();
  }

  type Acc = { q: number; c: number; d: number; avg: number; count: number };
  const acc: Record<EvalCategory, Acc> = {
    A: { q: 0, c: 0, d: 0, avg: 0, count: 0 },
    B: { q: 0, c: 0, d: 0, avg: 0, count: 0 },
    C: { q: 0, c: 0, d: 0, avg: 0, count: 0 },
    D: { q: 0, c: 0, d: 0, avg: 0, count: 0 },
    E: { q: 0, c: 0, d: 0, avg: 0, count: 0 },
  };
  type ScoreLite = {
    category: EvalCategory;
    q_score: number;
    c_score: number;
    d_score: number;
    avg_score: number | string;
  };
  ((scores as ScoreLite[]) || []).forEach((s) => {
    const slot = acc[s.category];
    slot.q += s.q_score;
    slot.c += s.c_score;
    slot.d += s.d_score;
    slot.avg += Number(s.avg_score);
    slot.count += 1;
  });

  const result = emptyByCategory();
  (Object.keys(acc) as EvalCategory[]).forEach((cat) => {
    const slot = acc[cat];
    if (slot.count === 0) return;
    result[cat] = {
      q: round2(slot.q / slot.count),
      c: round2(slot.c / slot.count),
      d: round2(slot.d / slot.count),
      avg: round2(slot.avg / slot.count),
      count: slot.count,
    };
  });
  return result;
}

function emptyByCategory(): Record<EvalCategory, CategoryAverage> {
  return ALL_CATEGORIES.reduce(
    (m, cat) => {
      m[cat] = { q: null, c: null, d: null, avg: null, count: 0 };
      return m;
    },
    {} as Record<EvalCategory, CategoryAverage>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
