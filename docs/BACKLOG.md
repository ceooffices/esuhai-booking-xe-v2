# BACKLOG — Booking Xe V2

## Email Templates — Chiến lược 3 Khối (ưu tiên cao)

### Framework đã thiết kế:
- **Khối An Tâm (Top):** Mã yêu cầu, trạng thái → khẳng định xử lý thành công
- **Khối Thực Thi (Middle):** Thời gian, địa điểm, tài xế → dữ liệu lõi chính xác
- **Khối Dự Phòng (Bottom):** Hotline, chính sách → lối thoát khi có biến số

### 2 chiến thuật template:
1. **Tối giản & Sang trọng** — Khách VIP/Đối tác cấp cao
2. **Năng động & Trực quan** — Vận hành nội bộ

### Tính năng nâng cao cần tích hợp:
- [ ] Nút "Add to Calendar" (Apple/Google Calendar) trong mọi email xác nhận
- [ ] Link Google Maps trực tiếp cho địa điểm đón/trả
- [ ] Avatar tài xế + nút "Gọi Tài Xế" click-to-call
- [ ] Quy định chờ xe (VD: chờ tối đa 15 phút)
- [ ] Nút "Quản lý/Huỷ chuyến" kết nối dashboard

### File code đã tạo sẵn:
- `src/lib/email-templates.ts` — 5 templates theo cấu trúc 3 khối
- Cần tích hợp vào server actions (approve, assign, reject, complete)

---

## Các hạng mục còn lại:

### Nghiệp vụ
- [ ] Cập nhật sau chuyến đi: giờ thực tế, chi phí phát sinh (UI form trên dashboard)
- [ ] Đánh giá chuyến đi: form 5 sao, 4 tiêu chí, góp ý (public page sau hoàn thành)
- [ ] Tích hợp email templates vào server actions (gửi email thật khi duyệt/phân công/từ chối)
- [ ] Điều chỉnh đề xuất đã duyệt (chỉnh thông tin, thông báo các bên)

### Calendar nâng cao
- [ ] Click ô trống trên calendar → popup tạo yêu cầu
- [ ] Drag & drop booking giữa các xe
- [ ] Conflict detection (cảnh báo xe đã có chuyến)

### Báo cáo nâng cao
- [ ] Filter theo tuần/tháng/năm
- [ ] Export Excel/PDF
- [ ] Chart visualization (pie chart, line chart)
- [ ] Gantt-style lịch trình theo ngày

### Master Data
- [ ] Form thêm kiểm định xe (UI trên trang phương tiện)
- [ ] Form thêm bảo dưỡng/sửa chữa xe
- [ ] Gán xe cố định cho tài xế (1 xe 1 TX)

### Hệ thống
- [ ] Time-driven jobs (nhắc lịch sáng, auto-complete, weekly report)
- [ ] Supabase Edge Functions thay cho cron
- [ ] SMS notification backup
