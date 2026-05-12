# Runbook §5 — Xuất KPI cứng theo tháng (Phiếu 4)

> File này tạo trong Block C. Khi Block A (PR `feat/A-doc-sync`) đã merge vào `master`, Quản lý nên copy toàn bộ nội dung dưới đây vào `docs/RUNBOOKS.md` thành mục `## 5. Xuất KPI cứng theo tháng (Phiếu 4)` và xoá file này. Trước khi merge: file đứng độc lập để tránh xung đột giữa hai PR.

## Mục đích

Phòng Tổng vụ cần xuất 5 chỉ số KPI cứng cho Trưởng ban TX (anh Phạm Hồng Khanh và các Trưởng ban khác sau này) **hằng tuần thứ Sáu** để paste vào Phiếu 4 trên Google Sheet (theo V2.2 §6.9 bước 2). Hệ thống Booking Xe V2 đã có sẵn endpoint và trang dashboard tự tính 5 chỉ số.

## Tần suất

- **Cuối mỗi tuần (Thứ Sáu, giờ hành chính):** xuất KPI tháng hiện tại tới cuối tuần.
- **Đầu mỗi tháng (mùng 3):** xuất KPI tháng vừa kết thúc làm bản chốt.

## Người thực hiện

- **Phòng Tổng vụ** (mặc định) hoặc bất kỳ Quản lý nào đã đăng nhập dashboard.
- Yêu cầu vai trò: `Quản lý` (theo `requireManagerRole()`).

## Chuẩn bị một lần

Trước lần xuất đầu tiên, Quản lý cần đánh dấu các tài xế thuộc team Khanh bằng SQL (Supabase Dashboard > SQL Editor):

```sql
-- Xem danh sách driver hiện có
SELECT id, full_name, email, team_lead_email FROM drivers ORDER BY full_name;

-- Gán team cho 7 tài xế thuộc anh Khanh (thay UUID/email cho đúng)
UPDATE drivers
   SET team_lead_email = 'khanh@esuhai.com'
 WHERE id IN ('<uuid_tx_1>', '<uuid_tx_2>', '<uuid_tx_3>', '<uuid_tx_4>', '<uuid_tx_5>', '<uuid_tx_6>', '<uuid_tx_7>');

-- Verify
SELECT full_name, email, team_lead_email FROM drivers WHERE team_lead_email = 'khanh@esuhai.com';
```

Nếu có thêm Trưởng ban khác (tương lai), lặp lại với email của họ.

## Quy trình xuất hằng tuần

### Bước 1 — Mở trang KPI cứng

1. Đăng nhập `https://esuhai-booking-xe-v2.vercel.app/login` bằng tài khoản Quản lý.
2. Vào menu trái → **KPI cứng** (icon đồng hồ tốc độ).

### Bước 2 — Chọn Trưởng ban và tháng

- **Trưởng ban TX (team lead):** chọn từ dropdown (mặc định lấy danh sách email đã set ở bước "Chuẩn bị một lần"). Nếu không có trong dropdown, gõ tay vào ô "Hoặc nhập email khác".
- **Tháng:** mặc định là tháng hiện tại. Đổi khi cần báo cáo tháng trước.
- Bấm **Tính KPI**.

### Bước 3 — Đối chiếu nhanh

Sau khi báo cáo xuất ra, kiểm tra:

- Cột **Lưu ý** (text vàng phía dưới mỗi chỉ số): chỉ số nào có note "Team trống" → chưa setup `team_lead_email`; "Chưa có post_trip" → nghĩa là tháng đó chưa cập nhật sau chuyến cho TX thuộc team; "Không có chi phí tháng trước" → bình thường ở tháng đầu tiên cutover (xảy ra 1 lần).
- Cột **Đầu mục** (A/B/C/D/E): khớp với 5 đầu mục V2.2 §6.7 — paste vào đúng nhóm trong Phiếu 4.
- Cột **Điểm /5**: là gợi ý hệ thống. Phòng Tổng vụ có thể điều chỉnh khi paste vào Phiếu 4 nếu có context ngoài app (ví dụ TGĐ phản ánh).

### Bước 4 — Copy hoặc tải về

Hai cách (chọn 1):

**Cách A — Copy JSON (khuyến nghị nếu chuyển sang Apps Script):**

1. Bấm **Copy JSON**.
2. Mở Google Sheet "Phiếu 4 — KPI cứng tuần X" (Phòng Tổng vụ giữ).
3. Paste vào ô script note hoặc vào cell A1 dạng raw nếu sheet có Apps Script đọc JSON.

**Cách B — Tải CSV (khuyến nghị paste thủ công):**

1. Bấm **Tải CSV** → file `kpi-<email>-<YYYY-MM>.csv` tải về.
2. Mở file bằng Google Sheets (File > Import > kéo CSV vào).
3. Copy các dòng từ "metric" trở xuống → paste vào Phiếu 4 ô tương ứng (theo mapping 5 chỉ số bên dưới).

### Bước 5 — Mapping vào Phiếu 4

Phiếu 4 (V2.2 §7.2) có 11 chỉ số. Hệ thống xuất 5 trong số đó:

| Hàng Phiếu 4 | Lấy từ |
|---|---|
| Số lần trễ giờ đón TGĐ (A) | `late_pickup_count.value` (số) + `score` |
| Phần trăm lịch xe đúng giờ (D) | `on_time_rate_pct.value` + `score` |
| Phần trăm bảo dưỡng đúng hạn (D) | `maintenance_on_time_pct.value` + `score` (kiểm chéo proxy đăng kiểm) |
| Chi phí đội xe so cùng kỳ (D) | `fleet_cost_vs_prev_month_pct.value` + `score` |
| KPI trung bình của 7 tài xế (E) | TẠM ĐỂ TRỐNG (Block O sẽ tự sinh) |

Sáu chỉ số còn lại (sự cố giao thông, kiểm xe bỏ sót, hỗ trợ gia đình TGĐ, phản hồi OT, buổi đào tạo, % nắm kiến thức) Phòng Tổng vụ điền tay theo nguồn dữ liệu ngoài app (xem V2.2 §7.2).

## Edge case + xử lý

| Tình huống | Giải thích | Xử lý |
|---|---|---|
| Dropdown trống | Chưa có driver nào set `team_lead_email` | Quay lại bước "Chuẩn bị một lần" |
| `value: null, score: null` ở mọi metric | Team trống hoặc không có chuyến trong tháng | Verify lại `team_lead_email` đã đúng email Khanh, và TX có chuyến hoàn thành kèm `post_trip` không |
| `fleet_cost_vs_prev_month_pct.value: null` | Tháng trước không có chi phí | Bình thường ở tháng đầu cutover, hoặc tháng có team mới |
| `maintenance_on_time_pct` có note "proxy" | Schema chưa có `next_maintenance_date` | Hiện dùng `vehicle_inspections.expiry_date`. Phòng Tổng vụ tự ghi đè nếu có bảng theo dõi bảo dưỡng riêng (chờ Block U). Liên hệ Quản lý nếu cần đổi logic |
| `team_avg_kpi.value: null` luôn luôn | Đúng spec — đợi Block O mở rộng evaluate cho 7 TX | Để trống, ghi "Chờ Block O" |
| HTTP 401 / 403 khi gọi API | Chưa login hoặc chưa được cấp vai trò Quản lý | Liên hệ admin để cấp `is_manager=true` hoặc thêm vào `ALLOWED_MANAGER_EMAILS` |

## Gọi API trực tiếp (nâng cao)

Phòng Tổng vụ hoặc dev có thể gọi endpoint trực tiếp khi cần tích hợp:

```
GET https://esuhai-booking-xe-v2.vercel.app/api/kpi/driver-monthly?driver_email=khanh@esuhai.com&month=2026-05
Cookie: <session sau khi login dashboard>
```

Trả `application/json` theo schema mô tả trong `docs/ROADMAP.md §6`. Authorization vẫn bắt buộc qua session login Quản lý — không có HMAC public token cho endpoint này.

## Outstanding (cần PM xác định)

- Định nghĩa chuẩn cho "% bảo dưỡng đúng hạn": dùng `vehicle_inspections.expiry_date` (đăng kiểm) hay `vehicle_maintenance` (bảo dưỡng định kỳ)? Hiện dùng đăng kiểm làm proxy.
- Mapping `value → score 1-5` cho 4 metric: hệ thống dùng heuristic (≥95%→5, ≥85%→4, ≥70%→3, ≥50%→2, <50%→1). Nếu PM muốn đổi target/ngưỡng, sửa trong `src/lib/kpi.ts` function `scoreHigherBetter` / `scoreLowerBetter` / `scoreLatePickup`.
