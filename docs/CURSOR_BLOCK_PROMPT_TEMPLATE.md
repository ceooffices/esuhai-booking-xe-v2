# Cursor Block Prompt Template

> File này để PM (anh Hoàng Kha) **copy + điền + paste** vào Cursor chat khi giao
> 1 Block. Cursor đã có `.cursorrules` (auto-load), nên prompt này chỉ cần
> ngắn gọn cho Block cụ thể.

---

## Template chuẩn (paste vào Cursor)

```
Bắt đầu Block [BLOCK_ID] — [BLOCK_NAME].

ACTION: Đọc TOÀN BỘ file trong Context trước. Sau khi đọc xong, tóm tắt 3-5 câu về hiểu biết của em (file nào làm gì, pattern nào sẽ reuse). RỒI MỚI implement. KHÔNG code trước khi đọc.

## Context
Đọc trước:
- docs/ROADMAP.md §3 Tuần [N] Block [BLOCK_ID]
- [Liệt kê 3-5 file repository liên quan trực tiếp]

## DoD (copy từ ROADMAP)
[Paste nguyên DoD checklist từ ROADMAP Block đó]

## Branch
feat/[BLOCK_ID]-[short-slug]

## Đặc biệt lưu ý
[Optional: nếu Block có gì cần warning, vd "Block này động vào auth, đặc biệt cẩn thận theo .cursorrules §5"]

## Khi xong
Push PR + viết Report theo .cursorrules §11. ĐỪNG merge. ĐỪNG sang Block kế.
```

---

## Ví dụ điền sẵn — Block A (sync doc)

```
Bắt đầu Block A — Sync doc & runbook.

ACTION: Đọc TOÀN BỘ file trong Context trước. Sau khi đọc xong, tóm tắt 3-5 câu về hiểu biết của em (chỗ nào đang stale, cần sửa gì). RỒI MỚI viết. KHÔNG sửa doc trước khi đọc hết context.

## Context
Đọc trước:
- docs/ROADMAP.md §3 Tuần 1 Block A
- CLAUDE.md (file stale — cần sửa)
- docs/ONBOARDING.md (file stale — cần sửa)
- README.md (boilerplate — cần viết lại)
- docs/BACKLOG.md
- docs/DEEP_AUDIT_REPORT.md §1.1 S-5 (lý do đổi auth)

## DoD
- [ ] A.1 Sửa CLAUDE.md: Auth Magic Link → Password (signInWithPassword)
- [ ] A.2 Viết lại docs/ONBOARDING.md §1/§3/§4 theo password flow
- [ ] A.3 Tạo docs/RUNBOOKS.md với 4 runbook: cấp password, reset password, gỡ quyền, restore data
- [ ] A.4 Viết lại README.md (bỏ boilerplate Next.js)
- [ ] A.5 Cập nhật BACKLOG.md — tick P0/P1 đã fix
- A.6 SKIP — đã done trong commit `b3a021b` (file NHAT_TRINH đã tracked)

## Verification (PM thực hiện sau, KHÔNG phải DEV)
PM sẽ test thủ công: onboard 1 user mới theo đúng ONBOARDING.md → user login + bấm Duyệt 1 booking test thành công. **Yêu cầu cho DEV:** đảm bảo doc đủ chi tiết để PM làm theo step-by-step không cần hỏi lại — gồm: tạo Supabase user, cấp password ban đầu, set `is_manager` HOẶC `ALLOWED_MANAGER_EMAILS`, screenshot UI nếu cần thiết.

## Branch
feat/A-doc-sync

## Đặc biệt lưu ý
- Block này KHÔNG có code change. Chỉ doc.
- Khi viết RUNBOOKS — tham khảo style của ONBOARDING.md hiện tại (nhiều bảng, có ví dụ cụ thể).
- Cách cấp password Supabase: Dashboard → Authentication → Users → Add user → set password manually.
- Cách reset password: Dashboard → user → "..." → Send password reset email HOẶC admin set new password.

## Khi xong
Push PR `feat/A-doc-sync` + Report theo .cursorrules §11. ĐỪNG merge. ĐỪNG sang Block B.
```

---

## Ví dụ điền sẵn — Block M (Approval cấp 2+3 email-link)

```
Bắt đầu Block M — Ứng viên 1: Approval cấp 2+3 xe ngoài email-link.

ACTION: Đọc TOÀN BỘ file trong Context trước. Sau khi đọc xong, tóm tắt 3-5 câu về hiểu biết của em (pattern HMAC token hiện tại ra sao, approveBooking flow đã làm gì, atomic guard hoạt động ra sao). RỒI MỚI implement. KHÔNG code trước khi đọc.

## Context
Đọc trước:
- docs/ROADMAP.md §3 Tuần 1 Block M
- docs/ROADMAP.md §8 Email-link pattern template
- src/lib/tokens.ts (HMAC pattern hiện tại — pattern để copy)
- src/app/api/driver-response/route.ts (route public pattern — pattern để copy)
- src/app/driver-response/page.tsx (page public pattern)
- src/lib/actions.ts function approveBooking (logic duyệt hiện tại)
- src/lib/booking-emails.ts function notifyApprover (gửi email cấp N hiện tại)
- src/lib/email-templates.ts buildApprovalRequestEmail (template hiện tại — cần mở rộng thêm button)
- src/lib/supabase/middleware.ts (publicPaths để add route mới)

## DoD
- [ ] M.1 Mở rộng src/lib/tokens.ts: signApprovalToken(bookingId, level, approverEmail, exp) + verifyApprovalToken
- [ ] M.2 Email template buildApprovalRequestEmail — thêm 2 button [Duyệt cấp N] / [Không duyệt cấp N] với HMAC URL (VML cho Outlook)
- [ ] M.3 Page src/app/approval-response/page.tsx (public): query params action/booking_id/level/token → render screen confirm
- [ ] M.4 API src/app/api/approval-response/route.ts: verify token + check level đúng + atomic update. **TRƯỚC khi viết:** đọc kỹ `approveBooking()` trong `src/lib/actions.ts:109-180` để copy logic state machine. Pattern atomic guard tại line 161: `.eq('status', expectedStatus[level]).eq('current_approval_level', level)`. Map status tại line 129: `{1: 'cho_duyet', 2: 'cho_duyet_cap2', 3: 'cho_duyet_cap3'}`. Sau cấp 3 → `da_duyet`. KHÔNG tự bịa state machine — copy chuẩn.
- [ ] M.5 src/lib/supabase/middleware.ts — thêm /approval-response và /api/approval-response vào publicPaths
- [ ] M.6 Test E2E: tạo booking xe ngoài → đợi email cấp 2 → bấm link → trang web → confirm → status đổi sang cho_duyet_cap3

## Branch
feat/M-approval-email-link

## Đặc biệt lưu ý
- Block này động vào AUTH FLOW — đặc biệt cẩn thận theo .cursorrules §5.
- Token format: HMAC-SHA256(WEBHOOK_SECRET, bookingId + level + approverEmail + exp). Expiry 7 ngày.
- Atomic guard CỰC KỲ QUAN TRỌNG: 2 approver bấm Duyệt cùng lúc → chỉ 1 thắng, người kia thấy "Đã có người duyệt".
- Khi reject cấp N → status đi đâu? → Theo logic hiện tại của rejectBooking trong actions.ts (không phải "rớt về cấp N-1", mà chuyển sang khong_duyet luôn). VERIFY lại trong code.
- Email template: render trên /email-preview để check Outlook + Gmail rendering trước khi báo done.
- Test với token expired, token sai level, token đúng nhưng booking đã ở status khác (idempotent) — phải graceful.

## Khi xong
Push PR `feat/M-approval-email-link` + Report theo .cursorrules §11 + screenshot email + screenshot page confirm.
```

---

## Ví dụ điền sẵn — Block C (KPI cứng API)

```
Bắt đầu Block C — KPI cứng API cho doc V2.2 Phiếu 4.

ACTION: Đọc TOÀN BỘ file trong Context trước. Sau khi đọc xong, tóm tắt 3-5 câu (5 metric tính ra sao, sign convention của departure_diff_minutes, schema post_trips/post_trip_costs/vehicles dùng cột nào). RỒI MỚI implement. KHÔNG code trước khi đọc.

## Context
Đọc trước:
- docs/ROADMAP.md §3 Tuần 1 Block C
- docs/ROADMAP.md §6 KPI cứng API spec (FULL SPEC ở đây)
- docs/NHAT_TRINH_SWABB_PHAM_HONG_KHANH_TB_TAI_XE_V2.2.md §7.2 Phiếu 4 (yêu cầu nghiệp vụ)
- docs/NHAT_TRINH_SWABB_PHAM_HONG_KHANH_TB_TAI_XE_V2.2.md §6.6 (bảng quy đổi điểm QCD 1-5)
- src/lib/auth.ts (requireManagerRole)
- src/types/database.ts (types bookings, post_trips, post_trip_costs, vehicles, drivers)
- supabase/migrations/001_initial_schema.sql (schema bookings + post_trips)

## DoD
- [ ] C.1 Migration 004_driver_team.sql: thêm drivers.team_lead_email TEXT (đánh dấu tài xế thuộc đội Khanh)
- [ ] C.2 Endpoint GET /api/kpi/driver-monthly?driver_email=&month= — auth requireManagerRole
- [ ] C.3 Tính 5 metric tự động: late_pickup_count, on_time_rate_pct, maintenance_on_time_pct, fleet_cost_vs_prev_month_pct, team_avg_kpi (NULL với note)
- [ ] C.4 Trang /kpi/driver-monthly (admin only, trong (dashboard)/) — chọn driver + tháng → bảng + nút "Copy JSON" / "Tải CSV"
- [ ] C.5 Document trong docs/RUNBOOKS.md: cách Phòng Tổng vụ paste KPI vào Form 4 Google Sheet hằng tuần
- [ ] Verify: gọi API với driver_email của a Khanh tháng 4/2026 trả đúng 5 metric (test với data thật sau khi cutover Block B)

## Branch
feat/C-kpi-api

## Đặc biệt lưu ý
- Block này phụ thuộc Block B đã cutover (có data thật). Nếu B chưa xong → test với data dummy seed trước.
- Score mapping theo doc §6.6: 1.0-1.9 → score 1; 2.0-2.9 → score 2; 3.0-3.9 → score 3; 4.0-4.4 → score 4; 4.5-5.0 → score 5.
- Late pickup threshold: 5 phút. **Sign convention** (verify trong `supabase/migrations/001_initial_schema.sql` trigger `compute_post_trip_diffs`): `departure_diff_minutes = actual_departure - expected_pickup_time`. Dương = đến muộn (trễ); Âm = đến sớm. Vậy: `departure_diff_minutes > 5 → trễ` (KHÔNG phải `< -5` — sai). On-time: `BETWEEN -5 AND 5`.
- Maintenance on time: vehicles.next_maintenance_date >= today → on time. Nếu next_maintenance_date NULL → exclude khỏi tính.
- Fleet cost vs prev month: tính từ post_trip_costs.amount group by month. Tài xế trong team Khanh (drivers.team_lead_email = 'khanh@esuhai.com' — VERIFY email chính xác với PM).
- Format trả về JSON đúng schema trong ROADMAP §6. Đặc biệt field "note" cho metric chưa tính được (team_avg_kpi).
- Trang /kpi/driver-monthly: dùng Server Component cho fetch + Client Component cho UI interaction (chọn tháng dropdown).

## Khi xong
Push PR `feat/C-kpi-api` + Report + curl example response.
```

---

## Quy tắc điền template

| Trường | Cách điền |
|---|---|
| `[BLOCK_ID]` | Ký hiệu Block trong ROADMAP (A, B, C, M, N, O…) |
| `[BLOCK_NAME]` | Tên đầy đủ Block từ ROADMAP §3 |
| `[N]` | Số tuần (1-6) |
| `[short-slug]` | 2-4 từ tiếng Anh kebab-case mô tả Block (vd `doc-sync`, `kpi-api`, `approval-email-link`) |
| `Liệt kê file liên quan` | Mở ROADMAP §9 "Files thay đổi dự kiến" cho Block đó, copy danh sách + files pattern reference |
| `DoD` | Copy nguyên checkbox từ ROADMAP Block đó |
| `Đặc biệt lưu ý` | Mỗi Block có quirks riêng — chỉ điền khi có, không phải lúc nào cũng cần |

---

## Khi nào prompt thêm vs để Cursor tự đọc?

**Prompt thêm (vào "Đặc biệt lưu ý"):**
- Constraint nghiệp vụ không có trong doc (vd "team Khanh là email cụ thể XYZ")
- Phụ thuộc Block khác chưa xong (vd "Block C cần Block B cutover xong")
- Gotcha mà code base không tự rõ (vd race condition, edge case của 3rd party lib)
- Quyết định UX cụ thể nếu DoD để mở (vd "modal vs full page → chọn modal")

**Không cần prompt thêm:**
- Convention chung — đã có `.cursorrules`
- Security baseline — đã có `.cursorrules §5`
- Format Report — đã có `.cursorrules §11`
- Pattern code chuẩn — Cursor grep tự thấy

---

## Sai lầm cần tránh khi giao Block

| Sai | Đúng |
|---|---|
| "Làm Block A và B luôn" | "Bắt đầu Block A. Khi xong, em sẽ giao Block B." |
| "Tự quyết theo cảm giác" | "Nếu DoD không rõ → đọc ROADMAP phụ lục hoặc hỏi PM." |
| "Fix luôn bug khác thấy trên đường" | "Note vào Report cho PM. KHÔNG fix ngoài scope." |
| "Skip test vì code đơn giản" | "Vẫn run tsc + lint + build + manual test theo `.cursorrules §9`." |
| "Đẩy thẳng lên master" | "Branch feat/ → PR → Report → đợi QC." |

---

## Quick reference khi cấp bách

Anh có thể dùng prompt cực ngắn nếu Block đơn giản:

```
Block X — [tên]. DoD trong docs/ROADMAP.md §3. Branch feat/X-*. PR + Report khi xong.
```

Cursor đã có `.cursorrules` auto-load, sẽ tự đọc context đầy đủ. Chỉ dùng cách này cho Block đã làm pattern tương tự (vd làm Block O xong, làm Block P cùng style → prompt ngắn OK).

---

*Phòng Tổng Hợp — Esuhai Group*
