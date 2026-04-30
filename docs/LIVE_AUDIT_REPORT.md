# LIVE PRODUCTION AUDIT — esuhai-booking-xe-v2.vercel.app

> **Audit date:** 2026-04-30 — **Auditor:** Claude (Opus 4.7) — **Target:** https://esuhai-booking-xe-v2.vercel.app
>
> **Phương pháp:** Black-box testing từ ngoài internet — curl, header inspection, fetch behavior trace, attack-path probing. KHÔNG có credentials login dashboard. KHÔNG test SMTP, KHÔNG test Supabase trực tiếp.

---

## 0. EXECUTIVE SUMMARY

Live audit phát hiện **1 BUG CRITICAL ngầm hỏng feature production** + **4 thiếu sót security headers**. Cả 2 đã được fix + commit + push trong session này (commits `9f8f4d6` + `2b1c8bd`).

### 🔴 CRITICAL BUG đã fix
**`/api/driver-response` bị middleware redirect → tài xế thật không xác nhận được chuyến**.

Trace:
1. Tài xế nhận email phân công → bấm "Xác nhận nhận ca"
2. URL mở `/driver-response?action=confirm&id=X&token=Y` (page public, OK)
3. Page JS chạy `fetch('/api/driver-response', {method:'POST', ...})`
4. Middleware nhận POST `/api/driver-response`, kiểm publicPaths
5. publicPaths gồm `/driver-response` (page) nhưng KHÔNG có `/api/driver-response` (route)
6. `'/api/driver-response'.startsWith('/driver-response')` → `false`
7. → Middleware redirect `/login` (307)
8. Fetch follow → POST `/login` → **405 Method Not Allowed**
9. Page driver-response báo *"Không kết nối được. Vui lòng thử lại"*

**Tại sao chưa ai phát hiện sớm?** Tester (chị Hà) test trong cùng browser đã login dashboard → cookies session có sẵn → middleware skip auth → API chạy bình thường → chị thấy email kích hoạt → tưởng work. Nhưng tài xế thật mở email link trong điện thoại / browser không có session → broken hoàn toàn.

**Fix** (commit `9f8f4d6`): thêm `/api/driver-response` vào `publicPaths` array trong [`src/lib/supabase/middleware.ts:33`](src/lib/supabase/middleware.ts#L33). Token HMAC trong URL email là tuyến auth duy nhất cho route này (đã verify từ commit 16a9126).

### 🟡 MISSING security headers đã fix
Live response chỉ có HSTS (Vercel default), thiếu:
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Permissions-Policy`

**Fix** (commit `2b1c8bd`): thêm 4 headers qua [`next.config.ts`](next.config.ts) `async headers()`.

CSP chưa add vì cần tune kỹ với Next.js inline scripts + Supabase + FullCalendar — sẽ làm sau qua report-only mode.

---

## 1. TEST METHODOLOGY

| Layer | Tool | What checked |
|-------|------|--------------|
| HTTP layer | `curl -sI` | Response headers, status codes, redirect chain |
| API layer | `curl -X POST` | Auth gates, error responses, idempotency |
| Page layer | `curl` raw HTML | Render, Vietnamese encoding, env var leaks |
| Static assets | `curl -sI` | Source maps, cache headers, CDN behavior |
| Performance | `curl -w` | TTFB, total time, transferred bytes |
| Attack surface | Path probing | `.env`, `.git`, `/api/admin`, source files |

---

## 2. RESULTS — by category

### 2.1 ✅ Auth gates — đúng

| Path | Status | Behavior | Note |
|------|--------|----------|------|
| `/` (root) | 307 → `/login` | Middleware redirect | ✅ |
| `/dashboard` | 307 → `/login` | Middleware redirect | ✅ |
| `/calendar` | 307 → `/login` | Middleware redirect | ✅ |
| `/drivers` | 307 → `/login` | Middleware redirect | ✅ |
| `/vehicles` | 307 → `/login` | Middleware redirect | ✅ |
| `/reports` | 307 → `/login` | Middleware redirect | ✅ |
| `/settings` | 307 → `/login` | Middleware redirect | ✅ |
| `/email-preview` | 307 → `/login` | Middleware redirect — đúng (đáng lẽ chỉ dev mới truy cập, prod gate là OK) | ✅ |

### 2.2 ✅ Public pages — đúng

| Path | Status | Size | Note |
|------|--------|------|------|
| `/login` | 200 | 11.7 KB | Vietnamese render OK ("Quản lý Xe", "Đăng nhập", "Mật khẩu"), title meta đúng |
| `/driver-response?action=confirm&id=x&token=y` | 200 | 8.3 KB | Page public, sẽ render error state khi token invalid (đúng) |
| `/evaluate` | 200 | 8.3 KB | Page public, render "Đường dẫn không hợp lệ" khi thiếu params |

### 2.3 ✅ API auth behavior

| Path | Method | Test | Expected | Actual | Status |
|------|--------|------|----------|--------|:---:|
| `/api/webhooks/google-form` | POST | No secret header | 401 | 401 `{"error":"Unauthorized"}` | ✅ |
| `/api/webhooks/google-form` | POST | Wrong secret | 401 | 401 `{"error":"Unauthorized"}` | ✅ |
| `/api/webhooks/google-form` | OPTIONS | CORS preflight | 204 + `Allow:` | 204 + `Allow: OPTIONS, POST` | ✅ |
| `/api/bookings` | GET | No session | 307 → `/login` | 307 → `/login` | ✅ (gated by middleware) |
| `/api/send-form-link` | GET | No session | 307 → `/login` | 307 → `/login` | ✅ |
| `/api/driver-response` | POST | No session, fake token | **403/404 JSON** | **307 → /login → 405** | 🔴 **FIXED** in `9f8f4d6` |
| `/api/auth/callback` | GET | No code param | 307 → `/login?error=auth` | 307 → `/login?error=auth` | ✅ (handler logic, not middleware) |

### 2.4 🟢 Build artifacts — sạch

| Test | Result |
|------|--------|
| Source maps in prod (`.map` files) | 404 — **không expose** ✅ |
| Env vars in HTML body (`SUPABASE_SERVICE_ROLE_KEY`, `SMTP_PASS`, etc.) | Không tìm thấy ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` / anon key trong JS bundle | Có (đúng — anon key public by design) ✅ |
| Source code paths trong HTML | Không (Turbopack obfuscated) ✅ |

### 2.5 🛡️ Security headers — pre-fix vs post-fix

#### Trước commit `2b1c8bd`:
```
HTTP/1.1 200 OK
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload   ✅ (Vercel default)
[NO X-Frame-Options]                                                       🟡
[NO X-Content-Type-Options]                                                🟡
[NO Referrer-Policy]                                                       🟡
[NO Permissions-Policy]                                                    🟡
[NO Content-Security-Policy]                                               🟡 (chưa add)
```

#### Sau commit `2b1c8bd` (chờ Vercel deploy):
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload   ✅
X-Content-Type-Options: nosniff                                           ✅
X-Frame-Options: DENY                                                     ✅
Referrer-Policy: strict-origin-when-cross-origin                          ✅
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()  ✅
[CSP — sẽ add sau khi tune]                                               ⏳
```

### 2.6 🟢 Attack surface — không tìm thấy lỗ

| Path probed | Status | Note |
|-------------|--------|------|
| `/.env` | 307 → `/login` | Middleware bắt sạch ✅ |
| `/.git/config` | 307 → `/login` | Không expose ✅ |
| `/api/admin` | 307 → `/login` | Endpoint không tồn tại (handled by middleware) ✅ |
| `/_next/server/app/api/.../route.js` | 307 → `/login` | Server bundle không truy cập được ✅ |

### 2.7 📊 Performance

| Metric | Login | Driver-response | Evaluate |
|--------|-------|-----------------|----------|
| TTFB | 191 ms | 653 ms | 421 ms |
| Total | 210 ms | 681 ms | 429 ms |
| Size (HTML) | 11.7 KB | 8.3 KB | 8.3 KB |
| Cache | HIT (Edge) | MISS | MISS |

**Observations:**
- Login page cached at edge → super fast (TTFB 191ms ở Singapore region `sin1`).
- Driver-response/evaluate slower vì cần render dynamic.
- Largest JS chunks: `0c36m8_6yj-b7.js` (228 KB), `0mstyq17cbf8-.js` (228 KB) — likely FullCalendar split. Acceptable.
- Không thấy bundle nào > 250 KB → chấp nhận được cho internal app.

### 2.8 🌐 Vietnamese rendering

✅ **Render đúng** trên live:
- `<title>Quản lý Xe — Esuhai</title>`
- `<meta description="Hệ thống quản lý vận hành ô tô — Phòng Tổng Hợp Esuhai Group">`
- Login form: "Quản lý Xe", "Đăng nhập", "Mật khẩu", "Email công ty"
- Tất cả diacritic (Quản, lý, Đăng, nhập, Mật, khẩu) hiển thị đúng UTF-8.

### 2.9 🟡 Robots / Sitemap (minor)

- `/robots.txt` → 307 → `/login` (middleware bắt vì matcher không exclude)
- `/sitemap.xml` → 307 → `/login`

**Đánh giá:** Acceptable cho internal app — không muốn Google index. Nếu sau này muốn public landing page thì cần exclude `\.txt|xml` trong middleware matcher.

---

## 3. PROD vs CODE — verify recent commits đã deploy

| Commit | Test | Verified |
|--------|------|:---:|
| `5ec2c12` Webhook fail-closed | POST without secret → 401 | ✅ |
| `5ec2c12` Webhook wrong secret | POST with wrong secret → 401 | ✅ |
| `2221acb` Email Vietnamese fix | (cần test gửi mail thật) | ⏳ |
| `0bd39a1` Dashboard create regression | (cần login test) | ⏳ |
| `8c3ac8c` Staff lookup multi-tier | (cần test confirm flow) | ⏳ |
| `feb8da2` Booker email không nhận | (cần test confirm flow) | ⏳ |
| `9f8f4d6` API driver-response public | (just pushed, deploy pending) | ⏳ |
| `2b1c8bd` Security headers | (just pushed, deploy pending) | ⏳ |

---

## 4. WHAT'S NEXT — ưu tiên

### 🔴 Immediate (em vừa fix)
1. ✅ `/api/driver-response` middleware fix — `9f8f4d6`
2. ✅ Security headers — `2b1c8bd`

### 🟠 Next priority (anh quyết)
3. **Verify driver flow end-to-end** với tài xế thật (mở email link trên điện thoại, không login)
4. **Add CSP** (Content-Security-Policy) qua report-only mode 1-2 tuần → tighten dần
5. **Apply RLS migration** `supabase/migrations/003_rls_hardening.sql` (defense in depth)
6. **error.tsx boundaries** (P1 audit §5.1) — chặn white screen khi exception
7. **Modal a11y polish** (P1 audit §5.2)
8. **Rate limiting** `/api/send-form-link` (P1 audit §4.2)

### 🟡 Cleanup
- `resend` dependency không dùng → `npm uninstall`
- README.md vẫn là `create-next-app` boilerplate
- Tạo `vercel.ts` với `crons`, `functions.maxDuration`
- Migration 003 dọn n8n config dead trong `system_config`

---

## 5. APPENDIX — raw test commands

```bash
# Auth gates
curl -sI https://esuhai-booking-xe-v2.vercel.app/dashboard       # → 307 /login

# Webhook fail-closed verify
curl -X POST -H 'Content-Type: application/json' -d '{...}' \
  https://esuhai-booking-xe-v2.vercel.app/api/webhooks/google-form    # → 401

# Driver response (CRITICAL bug — pre-fix)
curl -X POST -H 'Content-Type: application/json' \
  -d '{"action":"confirm","booking_id":"x","token":"y"}' -L \
  https://esuhai-booking-xe-v2.vercel.app/api/driver-response
# Pre-fix: → 307 /login → 405 Method Not Allowed
# Post-fix (after 9f8f4d6 deploy): → 403 JSON {"error":"Token xác minh không hợp lệ"}

# Headers (post-fix verify)
curl -sI https://esuhai-booking-xe-v2.vercel.app/login | \
  grep -iE 'x-frame|x-content|referrer|permissions|strict-transport'
```

---

*Live audit completed 2026-04-30 by Claude (Opus 4.7, 1M context). Black-box testing only — không có credentials login dashboard.*
