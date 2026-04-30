# V1 → V2 BACKFILL — Hướng dẫn cutover sang V2 master

> Hướng dẫn 1 lần backfill toàn bộ data V1 Google Sheet sang V2 Supabase. Sau khi xong, V1 sheet đóng băng (read-only backup), V2 thành master duy nhất.

---

## Tại sao cần backfill?

Hiện tại V1 và V2 đang chạy song song:
- **V1** (GAS dashboard + Google Sheet): chị Hà thao tác, status mới nhất ở đây
- **V2** (Next.js + Supabase): chỉ nhận **booking mới khởi tạo** từ GForm — sau đó KHÔNG sync lại update từ V1

→ V2 dashboard hiện thấy data **lệch và lỗi thời** so với V1.

Backfill = copy snapshot V1 hiện tại sang V2 → 2 bên đồng bộ → sau đó cutover sang V2-as-master, freeze V1 sheet.

---

## Quy trình 5 bước

### Bước 1 — Export V1 sheet ra CSV

1. Mở Google Sheet V1
2. Tab chứa data booking → **File → Download → Comma-separated values (.csv)**
3. Lưu file vào root project, đặt tên `v1-export.csv`

⚠️ **Quan trọng** — kiểm thứ tự cột phải đúng (26 cột, từ trái sang phải):

| # | Cột |
|---|-----|
| 1 | Dấu thời gian |
| 2 | Phòng ban của anh/chị |
| 3 | Họ tên người yêu cầu |
| 4 | Phân loại chuyến xe |
| 5 | Mục đích sử dụng |
| 6 | Ngày dự kiến sử dụng xe |
| 7 | Giờ tài xế cần có mặt |
| 8 | Giờ kết thúc dự kiến |
| 9 | Lịch trình chi tiết |
| 10 | Số lượng người đi trên xe |
| 11 | Nhân viên phụ trách chuyến đi |
| 12 | Số hiệu chuyến bay |
| 13 | Tên các thành viên |
| 14 | Trạng thái |
| 15 | Tài xế |
| 16 | Xe |
| 17 | TX xác nhận |
| 18 | Lý do từ chối |
| 19 | Ghi chú |
| 20 | Hoàn thành lúc |
| 21 | Hủy bởi / Lý do |
| 22 | Ghi chú vận hành |
| 23 | Xe ngoài |
| 24 | Nhà cung cấp |
| 25 | BS xe ngoài |
| 26 | Chi phí xe ngoài |

Nếu V1 sheet có cột thừa/thiếu/đổi thứ tự → script sẽ cảnh báo nhưng vẫn chạy (có thể lệch field).

### Bước 2 — Đảm bảo `.env.local` có service role key

```bash
# .env.local (chỉ local, KHÔNG commit)
NEXT_PUBLIC_SUPABASE_URL=https://larfhojooprqrwywyidy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Service role key lấy ở **Supabase Dashboard → Project Settings → API → service_role secret**.

### Bước 3 — DRY-RUN (KHÔNG insert, chỉ in report)

```bash
npx tsx scripts/import-v1-bulk.ts v1-export.csv
```

Script sẽ:
- Parse CSV
- Cho từng dòng → in ra trạng thái: `✅ OK / ⏭️ SKIP / ❌ ERROR`
- Skip dòng thiếu requester_name, purpose, trip_date, pickup_time
- Cảnh báo driver/vehicle nào không match (sẽ để `null`)
- Cuối cùng in summary

**Đọc kỹ output**:
- `OK` cao, `SKIP` thấp, `ERROR` = 0 → tốt, sang bước 4
- Nhiều `SKIP` → check lại CSV (có dòng rỗng? thiếu data?)
- Có `ERROR` → check error message, fix CSV hoặc DB rồi re-run

Ví dụ output:
```
✅ Row 2: Lê Thị Thúy Hà | 15/04/2026 08:30
⏭️  Row 3: (no name) (skip: thiếu requester_name)
✅ Row 4: Trần Văn Minh | 16/04/2026 14:00
     ⚠️  driver "Nguyễn A" không match → driver_id=null
❌ Row 5: ... (error: invalid date format)

📊 SUMMARY
   ✅ OK:    187
   ⏭️  SKIP:  12
   ❌ ERROR: 1
```

### Bước 4 — APPLY (insert thật)

Sau khi DRY-RUN OK, chạy lại với cờ `--apply`:

```bash
npx tsx scripts/import-v1-bulk.ts v1-export.csv --apply
```

Script sẽ insert thật. Mỗi row OK → 1 row mới trong `bookings` table.

**Idempotent**: re-run cùng CSV không tạo dupe — script check `notes LIKE '[v1 ts=<timestamp>]%'` trước khi insert.

### Bước 5 — Verify trên V2 dashboard

1. Vào https://esuhai-booking-xe-v2.vercel.app/dashboard
2. Số lượng booking phải khớp với CSV (tổng OK count)
3. Vài card random → check status, driver, vehicle có đúng không
4. Vào `/calendar` → xem lịch xe có đầy đủ không

Hoặc query trực tiếp:
```sql
-- Count tổng đã import
SELECT count(*) FROM bookings WHERE notes LIKE '[v1 ts=%';

-- Phân bố theo status
SELECT status, count(*) FROM bookings WHERE notes LIKE '[v1 ts=%' GROUP BY status;

-- Driver/vehicle còn null → cần update tay
SELECT count(*) FROM bookings WHERE notes LIKE '[v1 ts=%' AND driver_id IS NULL;
```

---

## Sau khi backfill

### A. Disable V1 GAS email gửi (KHÔNG xoá trigger)

V1 dùng pattern `email_router.gs` (transport layer) — mọi caller (`onFormSubmit`,
`onSheetEdit`) đều gọi function `sendEmail(emailData)`. Cách an toàn nhất:
**stub `sendEmail()` thành no-op**, không xoá triggers.

Vào **Apps Script editor → email_router.gs** → replace TOÀN BỘ function
`sendEmail` bằng:

```javascript
function sendEmail(emailData) {
  var firstEmail = (emailData.to || "").split(",")[0].trim();
  if (!isValidEmail(firstEmail)) {
    Logger.log("[email][V1-DISABLED] Invalid email, skip: " + emailData.to);
    return false;
  }
  Logger.log("[email][V1-DISABLED] Đã chặn gửi: to=" + emailData.to + " subject=" + emailData.subject);
  try {
    logEmailSend(
      "v1_disabled_" + (emailData.type || "unknown"),
      "[V1 STOPPED 2026-04-30] " + (emailData.to || "") + " | " + (emailData.subject || "")
    );
  } catch (e) {
    Logger.log("[email][V1-DISABLED] log error: " + e.message);
  }
  return true; // giả lập success để caller không error
}
```

→ Save (KHÔNG cần Deploy lại — function hot-swap).

**Verify:** sheet "Email Log" V1 sẽ có entries `[V1 STOPPED 2026-04-30]`
mỗi khi V1 muốn gửi email — confirm V1 đã ngừng phát mail.

⚠️ **GIỮ LẠI** (đừng xoá):
- File `email_router.gs` (chỉ stub function `sendEmail`)
- Trigger `onFormSubmit` forward GForm → V2 webhook (booking mới vẫn vào V2)
- Function `logEmailSend` (vẫn cần để audit)
- Function `sendViaWebhook` + `sendViaGmail` (backup, không gọi nếu sendEmail stub)

(Tuỳ chọn) Defense in depth — vào **tab Config V1 sheet**:

- Row `EMAIL_METHOD` → đổi value sang `disabled`
- Row `sys_webhookUrl` → để trống

→ Phòng trường hợp code khác bypass `sendEmail` mà gọi `sendViaWebhook` direct.

### B. Freeze V1 sheet

1. Đổi tên sheet thành `[ARCHIVE 2026-04] Booking Xe V1`
2. **File → Settings → Protect sheet** → chỉ owner edit được
3. Báo team: từ giờ chỉ thao tác trên V2 dashboard

### C. Verify cutover (1 tuần)

- Hằng ngày check `/dashboard` V2 với số liệu thực tế (nhờ chị Hà confirm)
- Nếu phát hiện sai → re-run import lại (idempotent) hoặc edit tay
- Tuần sau ổn → V1 chính thức retire

---

## Troubleshooting

### "Driver X không match → driver_id=null"

Driver name V1 sheet không khớp với `drivers` table V2. 2 cách fix:
- Vào `/drivers` (V2 dashboard) → thêm driver thiếu → re-run script (idempotent)
- Hoặc vào Supabase: `UPDATE bookings SET driver_id='<uuid>' WHERE notes LIKE '[v1 ts=...%'`

### "Vehicle X không match → vehicle_id=null"

Tương tự driver. Vào `/vehicles` → thêm xe thiếu → re-run.

### "ERROR: duplicate key value violates unique constraint"

Có thể V2 đã có booking với cùng key → script báo SKIP nhưng nếu vẫn ERROR → check Supabase logs.

### "Date format không parse được"

V1 sheet có format date lạ (vd `2026.04.15`). Script support `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`. Nếu khác → fix CSV manual hoặc báo em update parser.

### Muốn xoá hết data đã import (rollback)

```sql
DELETE FROM bookings WHERE notes LIKE '[v1 ts=%';
```

Cẩn thận — chỉ xoá khi chắc chắn muốn redo.

---

## Mapping V1 → V2 (chi tiết)

| V1 cột | V2 field | Logic |
|--------|----------|-------|
| Dấu thời gian | `created_at` + idempotency tag trong `notes` | parse "DD/MM/YYYY HH:mm:ss" |
| Phòng ban | `requester_department` | text |
| Họ tên người yêu cầu | `requester_name` | text |
| (không có) | `requester_email` | **null** — V2 fallback lookup theo tên trong `staff` table |
| Phân loại | `category` | "Nội bộ" hoặc "Đối tác" |
| Mục đích | `purpose` | text |
| Ngày dự kiến | `trip_date` | parse "DD/MM/YYYY" → "YYYY-MM-DD" |
| Giờ TX cần có mặt | `pickup_time` | parse "HH:mm" |
| Giờ kết thúc | `end_time` | parse "HH:mm", có thể null |
| Lịch trình | `itinerary` | text |
| Số lượng | `passenger_count` | int, default 1 |
| NV phụ trách | `staff_in_charge` | text (V2 lookup email khi gửi mail) |
| Chuyến bay | `flight_number` | text |
| Tên thành viên | `member_names` | text |
| Trạng thái + TX xác nhận + Hoàn thành lúc + Hủy | `status` (combined) | xem mapping bên dưới |
| Tài xế | `driver_id` | lookup theo tên (multi-tier ilike + substring) |
| Xe | `vehicle_id` | lookup theo plate hoặc vehicle_type |
| Lý do từ chối | `rejection_reason` (nếu khong_duyet) hoặc `driver_rejection_reason` (nếu tx_tu_choi) | |
| Ghi chú | `notes` (append sau idempotency tag) | |
| Hủy bởi / Lý do | parse "X / Y" → `cancelled_by` + `cancellation_reason` | |
| Ghi chú vận hành | `ops_notes` | |
| Xe ngoài | `is_external_vehicle` | boolean (Có/Có thuê → true) |
| Nhà cung cấp + BS xe ngoài | `external_vehicle_info` (combined) | |
| Chi phí xe ngoài | `external_vehicle_cost` | parse number, hỗ trợ "1.500.000" |

### Status mapping (ưu tiên từ trên xuống)

```
1. Hủy bởi/Lý do (col 21) có giá trị     → da_huy
2. Hoàn thành lúc (col 20) có timestamp  → da_hoan_thanh
3. TX xác nhận = "TX từ chối"            → tx_tu_choi
4. TX xác nhận = "TX đã nhận"            → tx_da_nhan
5. TX xác nhận = "Chờ TX xác nhận"       → cho_tx_xac_nhan
6. Trạng thái = "Không duyệt"            → khong_duyet
7. Trạng thái = "Đã duyệt"               → da_duyet
8. Trạng thái = "Chờ duyệt"              → cho_duyet
9. Default                               → cho_duyet
```

V1 chỉ có 1 cấp duyệt — script set `current_approval_level=1` cho status đang duyệt (V2 có 3 cấp cho xe ngoài, nhưng các booking xe ngoài đã đang ở trạng thái khác — không cần re-process approval).

---

*Phòng Tổng Hợp — Esuhai Group*
