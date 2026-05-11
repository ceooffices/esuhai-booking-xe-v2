# QC Checklist — Booking Xe V2

> Dành cho **Claude (QC)** review PR Cursor (DEV) gửi. PM (anh Hoàng Kha) dùng để
> tự audit nếu cần. Mỗi PR phải pass toàn bộ checklist tương ứng với loại Block.

---

## 0. Pre-merge baseline (mọi PR)

| # | Check | Cách verify | Block nếu fail |
|:---:|---|---|:---:|
| 0.1 | Branch name đúng pattern `feat/<block-id>-<desc>` | `git branch --show-current` | 🟡 Soft |
| 0.2 | PR description có Report đầy đủ theo `.cursorrules §11` | Đọc PR body | 🔴 Hard |
| 0.3 | `npx tsc --noEmit` pass | Chạy local hoặc check CI | 🔴 Hard |
| 0.4 | `npm run lint` pass | Chạy local hoặc check CI | 🔴 Hard |
| 0.5 | `npm run build` pass | CI workflow `.github/workflows/ci.yml` | 🔴 Hard |
| 0.6 | Không có file `.env*` trong diff | `git diff master --name-only \| grep env` | 🔴 Hard |
| 0.7 | Không có `console.log` debug rác (`console.error` cho lỗi thật OK) | grep `console.log` trong diff | 🟡 Soft |
| 0.8 | Commit history: atomic, message rõ ràng | `git log master..HEAD --oneline` | 🟡 Soft |
| 0.9 | Không có file > 1MB (image/binary lớn) | `git diff master --stat` | 🟠 Medium |
| 0.10 | Không animal/emoji trong file mới (trừ severity dot trong doc) | grep regex unicode emoji | 🟡 Soft |
| 0.11 | Block scope khớp ROADMAP — không lấn Block khác | So sánh files changed vs ROADMAP §9 | 🟠 Medium |
| 0.12 | DoD checklist trong Report tick đủ | Đọc Report | 🔴 Hard |

**Soft:** comment yêu cầu sửa, không block merge ngay. **Medium:** sửa trước merge. **Hard:** Request changes, không merge cho đến khi fix.

---

## 1. Migration block (Block B.2, C.1, N.1, hoặc bất kỳ block có `supabase/migrations/*.sql`)

| # | Check | Cách verify |
|:---:|---|---|
| 1.1 | File name đúng `NNN_<desc>.sql` với NNN tăng dần | `ls supabase/migrations/` |
| 1.2 | Idempotent — re-run không lỗi | Đọc SQL: `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` trước CREATE |
| 1.3 | Bảng mới có `ENABLE ROW LEVEL SECURITY` | grep `ENABLE ROW LEVEL SECURITY` |
| 1.4 | Bảng mới có write policy qua `is_current_user_manager()` | grep policy WITH CHECK |
| 1.5 | FK có `ON DELETE` clause rõ ràng | grep `REFERENCES` |
| 1.6 | Constraint check phù hợp (vd `q_score BETWEEN 1 AND 5`) | Đọc CHECK clauses |
| 1.7 | Generated column dùng `STORED` thay vì virtual | Audit `GENERATED ALWAYS AS` |
| 1.8 | Index cho cột truy vấn nhiều | Đối chiếu với route nào sẽ query |
| 1.9 | KHÔNG dùng `ALTER TABLE ... DROP COLUMN` cùng PR với code đọc column đó | git diff trùng file |
| 1.10 | Comment SQL bằng tiếng Việt giải thích intent | Đọc top comment |
| 1.11 | Cursor không tự apply prod — file chỉ commit, chưa apply | Hỏi PM hoặc check Supabase migrations table |
| 1.12 | Migration document trong `docs/SCHEMA.md` (nếu Block N+) | Check doc update |

---

## 2. API route block (route mới hoặc sửa route cũ)

| # | Check | Cách verify |
|:---:|---|---|
| 2.1 | **Auth gate** — server action / admin route → `requireManagerRole()` | grep tên function ở đầu route |
| 2.2 | **Public route** (driver-response, evaluate, approval-response, perf-eval/*) → HMAC token verify, KHÔNG `requireAuthUserEmail()` | Đọc route + verify trong `tokens.ts` |
| 2.3 | Middleware `publicPaths` có route public mới | Check `src/lib/supabase/middleware.ts` |
| 2.4 | Zod validate body trước khi vào logic (sau Block F.11) | `safeParse(body)` ở đầu |
| 2.5 | Trả 400 với message Việt khi validate fail | Test với payload sai |
| 2.6 | Trả 401/403 đúng (không 307 redirect cho API) | curl không cookie |
| 2.7 | KHÔNG `return { error: error.message }` raw — wrap `{ error: 'Lỗi hệ thống' }` + `console.error` server | grep `error.message` |
| 2.8 | DB write: atomic state guard `.eq('status', expected).eq('current_approval_level', N)` | Đọc `.update()` call |
| 2.9 | Idempotent: gọi 2 lần cùng payload → result giống nhau (hoặc trả 409) | Đọc logic check trước insert |
| 2.10 | Email side-effect: dùng `after()` (Next 15) hoặc fire-and-forget; KHÔNG chặn response | grep `await sendEmail` ở critical path |
| 2.11 | Service-role client (`createAdminClient`) chỉ trong server file | grep `'use client'` không có createAdminClient |
| 2.12 | Log audit: vào `email_logs` hoặc `console.log('[block-id] ...')` cho event quan trọng | Đọc logic |
| 2.13 | Cron route — verify `CRON_SECRET` header | grep `request.headers.get('authorization')` |

---

## 3. Public page (email-link form) block

| # | Check | Cách verify |
|:---:|---|---|
| 3.1 | Page trong `src/app/<route>/page.tsx` (KHÔNG trong `(dashboard)/`) | `ls src/app/` |
| 3.2 | Middleware `publicPaths` có cả `/page-route` và `/api/route` | Check `middleware.ts` |
| 3.3 | Page render gracefully khi token invalid/expired | Test URL với token rác |
| 3.4 | Page render gracefully khi token verified nhưng booking/period không tồn tại | Test với token valid + ID rác |
| 3.5 | Page render gracefully khi đã submit rồi (idempotent) | Test submit 2 lần |
| 3.6 | Form có loading state khi submit | Click button, không bị double-click |
| 3.7 | Form có error state hiển thị tiếng Việt | Force fail, kiểm message |
| 3.8 | Form có success state + CTA tiếp theo (vd "Đã nhận, cảm ơn anh/chị") | Test happy path |
| 3.9 | Mobile responsive — test viewport 375px (iPhone SE) | DevTools |
| 3.10 | Touch target ≥ 44px | Inspect button |
| 3.11 | KHÔNG có CSR redirect đến `/login` dù chưa login | Open in private window |
| 3.12 | KHÔNG leak credentials trong page HTML/JS | View-source check |
| 3.13 | `<title>` + meta description đúng tiếng Việt | View-source |
| 3.14 | Modal/dialog có `role="dialog"` + `aria-modal="true"` + Escape close | Test với keyboard |

---

## 4. Email template block

| # | Check | Cách verify |
|:---:|---|---|
| 4.1 | Outlook-safe: table-based layout, KHÔNG flexbox/grid | Đọc HTML |
| 4.2 | VML button cho Outlook (`<v:roundrect>`) | grep `mso-` |
| 4.3 | MSO conditional comment (`<!--[if mso]>`) | grep |
| 4.4 | Mọi user-input qua `esc()` (vd `${esc(purpose)}`) | grep `${` trong template |
| 4.5 | `vnGreeting(name, gender)` cho lời chào | grep `vnGreeting` |
| 4.6 | Subject prefix lấy từ `src/config/content.ts` (không hardcode) | grep `SUBJECT_PREFIX` |
| 4.7 | Process bar dùng `processBar(step)` helper | grep |
| 4.8 | Calendar inline link Google Calendar (nếu booking-related) | check `parseStops` |
| 4.9 | Footer "PHÒNG TỔNG HỢP — ESUHAI GROUP" nhất quán | check footer block |
| 4.10 | KHÔNG `'` raw trong attribute (escape `&#39;`) | grep `="...'..."` |
| 4.11 | Render preview trên `/email-preview` (dev only) | Vào browser |
| 4.12 | Test render trên Litmus/Mailtrap nếu Block tạo template mới | Đính kèm screenshot |
| 4.13 | KHÔNG dùng emoji trong subject (CONTENT_BIBLE §I cấm) | grep regex emoji |

---

## 5. Cron job block (Block H)

| # | Check | Cách verify |
|:---:|---|---|
| 5.1 | Entry trong `vercel.json` `crons[]` với schedule cron syntax đúng | Validate online |
| 5.2 | Route `/api/cron/*/route.ts` check `CRON_SECRET` header | grep `authorization` |
| 5.3 | Trả 401 khi thiếu/sai secret | curl không header |
| 5.4 | Query budget hợp lý — KHÔNG select * từ bảng > 10k row mà không paginate | Đọc query |
| 5.5 | Có timeout config trong `vercel.json` nếu chạy > 10s | Check `functions.maxDuration` |
| 5.6 | Audit log: ghi vào `email_logs` hoặc console event đã chạy + count | grep log |
| 5.7 | Idempotent: chạy 2 lần liên tiếp không tạo dupe email/state | Test manual |
| 5.8 | Error 1 record không crash cả batch — try/catch per item | Đọc loop |
| 5.9 | Schedule UTC vs local: Vercel cron là UTC, app timezone `Asia/Ho_Chi_Minh` → adjust offset | Comment trong file |

---

## 6. Server action block (`src/lib/actions.ts` modifications)

| # | Check | Cách verify |
|:---:|---|---|
| 6.1 | `'use server'` ở top file (đã có) | grep |
| 6.2 | Action thay đổi state → `await requireManagerRole()` ở dòng 1 | Đọc function |
| 6.3 | Action chỉ-đọc → `await requireAuthUserEmail()` (nếu cần auth) | Đọc function |
| 6.4 | Re-derive email từ session, KHÔNG trust client param | grep `clientApproverEmail` etc — phải có comment giải thích deprecated nếu còn |
| 6.5 | Atomic state guard `.eq('status', expectedStatus)` | grep `.update(` |
| 6.6 | `revalidatePath` cho route bị affect | grep |
| 6.7 | Trả `{ success: true, data?: ... }` hoặc `{ error: 'Việt-readable' }` | Đọc return |
| 6.8 | Email side-effect không chặn response (after() or fire-and-forget) | grep `await sendEmail` |
| 6.9 | TypeScript types từ `src/types/database.ts`, không `as any` | grep `as any` |

---

## 7. UI component block (CSR `*-client.tsx`)

| # | Check | Cách verify |
|:---:|---|---|
| 7.1 | `'use client'` directive | grep top |
| 7.2 | KHÔNG import `createAdminClient` | grep |
| 7.3 | Form submit → server action (KHÔNG fetch API trực tiếp trừ khi cần CSR-only) | Đọc onSubmit |
| 7.4 | Loading state trong button khi submit | Test |
| 7.5 | Error state hiển thị Việt | Test fail |
| 7.6 | Toast `setTimeout` có cleanup ref | grep `useRef` cho timer |
| 7.7 | Modal full a11y: `role="dialog"`, `aria-modal`, focus trap, Escape, body scroll lock | Test keyboard |
| 7.8 | `<label htmlFor>` cho mọi `<input>/<select>` | grep |
| 7.9 | Mobile: touch ≥ 44px, safe area, active feedback | Test device |
| 7.10 | Date hiển thị `dd/MM/yyyy` (KHÔNG ISO) | grep `format` hoặc `toLocaleDateString('vi-VN')` |
| 7.11 | Currency hiển thị `1.500.000 đ` | grep |
| 7.12 | Skeleton loading nếu fetch > 200ms | check `loading.tsx` |

---

## 8. Doc-only block (A.1–A.6)

| # | Check | Cách verify |
|:---:|---|---|
| 8.1 | Vietnamese đúng chính tả, không Anh-Việt lẫn | Đọc kỹ |
| 8.2 | KHÔNG còn "Magic Link" trong CLAUDE.md/ONBOARDING.md/README | grep `magic.*link` |
| 8.3 | KHÔNG còn `signInWithOtp` trong CLAUDE.md | grep |
| 8.4 | Cross-link giữa các doc đúng path | Click thử trên GitHub |
| 8.5 | RUNBOOKS.md cover đủ 4 runbook (cấp pass, reset pass, gỡ quyền, restore) | Đọc TOC |
| 8.6 | README.md không còn boilerplate Next.js | Đọc |
| 8.7 | BACKLOG.md trạng thái cập nhật chính xác | Đối chiếu git log |

---

## 9. Security-sensitive block (mọi block động vào auth/token/RLS)

| # | Check | Cách verify |
|:---:|---|---|
| 9.1 | Test với token rác → 403 với message rõ | curl |
| 9.2 | Test với token expired → 403 "Token hết hạn" | Sửa token exp |
| 9.3 | Test với token đúng role nhưng wrong subject → 403 | Replay attack test |
| 9.4 | RLS policy review: read/write tách bạch, write gated by `is_current_user_manager()` | SQL query `pg_policies` |
| 9.5 | KHÔNG `'use client'` import `createAdminClient` | grep |
| 9.6 | `SUPABASE_SERVICE_ROLE_KEY` chỉ trong `src/lib/supabase/admin.ts` + scripts | grep |
| 9.7 | Webhook fail-CLOSED khi thiếu secret | grep `if (!secret)` |
| 9.8 | CSRF: POST route check `headers.get('origin')` hoặc dùng server action | grep |
| 9.9 | Open redirect: `next` query param whitelist `/...` (không `//...`) | check callback route |
| 9.10 | Rate limit cho endpoint user-triggered (login, send-form, eval submit) | Check Block F.8/F.9 status |

---

## 10. QC Decision Matrix

Sau khi run checklist tương ứng:

| Kết quả | Action | Comment template |
|---|---|---|
| Tất cả pass | ✅ Approve PR + comment khen | `LGTM. Pass §0 + §<categories>. Merge khi sẵn sàng.` |
| Soft fail only | ✅ Approve nhưng request soft fix sau | `Approve. Note: [list soft fail], xử lý PR sau cũng được.` |
| Medium fail | 💬 Comment, không request changes | `Cần fix trước merge: [list]. Em đợi push update.` |
| Hard fail | 🔴 Request changes | `Block merge — fail: [list]. Sau khi fix → push thêm commit, PR tự update CI.` |
| Out of scope | 💬 Comment + suggest split | `PR này lấn sang Block Y, nên split. Giữ files A.1-A.6 ở PR này; Block C.1 mở PR mới.` |
| Mâu thuẫn spec | 🚨 Escalate PM | `@hoangkha — Cursor làm theo doc X nhưng doc Y nói khác: [...]. Cần PM quyết.` |

---

## 11. Sau merge — Post-merge verify

| # | Việc | Khi nào |
|:---:|---|---|
| 11.1 | Vercel Preview deploy success | Trong 5 phút sau merge |
| 11.2 | Smoke test Preview URL — flow chính chạy | Trước khi promote prod |
| 11.3 | Migration apply prod (nếu có) — qua Supabase Dashboard SQL Editor | Sau Preview pass |
| 11.4 | Update ROADMAP.md tick checkbox Block đã xong | Cùng commit |
| 11.5 | Update `docs/V2.2_FEEDBACK.md` nếu Block liên quan V3 | Tùy block |
| 11.6 | Sentry check 24h: không có error mới spike | Sau prod deploy |

---

## 12. Checklist nhanh — paste vào PR comment khi review

```markdown
## QC Review

### §0 Baseline
- [ ] tsc + lint + build pass
- [ ] Report đầy đủ
- [ ] Scope khớp ROADMAP
- [ ] DoD tick đủ

### §<categories áp dụng>
- [ ] [list từng item]

### Decision
[Approve / Request changes / Comments only]

### Notes
[Nếu có]
```

---

*Phòng Tổng Hợp — Esuhai Group | Living QC reference*
