# BACKLOG — Booking Xe V2

> Cập nhật: 2026-04-10

## Đã hoàn thành

- [x] Dashboard: stats, filter, booking cards, chi tiết, duyệt/phân công/hoàn thành/huỷ
- [x] Calendar view: tuần/tháng, trục X=ngày Y=xe
- [x] Quản lý Tài xế: CRUD + bằng lái + loại xe lái được + khả năng đáp ứng
- [x] Quản lý Phương tiện: CRUD + kiểm định + bảo dưỡng + disable
- [x] Báo cáo: 8 thống kê tổng quan
- [x] Cấu hình: system config UI
- [x] Auth: login + middleware + roles
- [x] Gửi form đăng ký cho nhân viên (tiện ích nhỏ gọn)
- [x] GAS webhook sync ver01 → ver02
- [x] Mobile-optimized: SF Pro font, 44px touch targets, skeleton loading
- [x] Framer Motion: stagger, modal slide-up, count-up, toast animation
- [x] Email tích hợp: gửi email thật khi từ chối + phân công tài xế
- [x] Đánh giá chuyến đi: form 5 sao, 4 tiêu chí (/evaluate)
- [x] Email templates V2: cấu trúc 3 khối (An Tâm / Thực Thi / Dự Phòng)

---

## Còn lại (theo thứ tự ưu tiên)

### 1. Nghiệp vụ (ưu tiên cao)
- [ ] Cập nhật sau chuyến đi: UI form giờ thực tế + chi phí phát sinh trên dashboard
- [ ] Điều chỉnh đề xuất đã duyệt (chỉnh thông tin, thông báo các bên)
- [ ] Tích hợp email cho approve, complete, cancel (hiện chỉ có reject + assign)

### 2. Email nâng cao (ưu tiên cao)
- [ ] Nút "Add to Calendar" (Apple/Google Calendar) trong email xác nhận
- [ ] Link Google Maps trực tiếp cho địa điểm đón/trả
- [ ] Nút "Gọi Tài Xế" click-to-call trong email
- [ ] Nút "Quản lý/Huỷ chuyến" kết nối dashboard

### 3. Master Data (ưu tiên trung bình)
- [ ] Form thêm kiểm định xe (UI trên trang phương tiện)
- [ ] Form thêm bảo dưỡng/sửa chữa xe
- [ ] Gán xe cố định cho tài xế (1 xe 1 TX)

### 4. Báo cáo nâng cao (ưu tiên trung bình)
- [ ] Filter theo tuần/tháng/năm
- [ ] Export Excel/PDF
- [ ] Chart visualization (pie chart, line chart)
- [ ] Gantt-style lịch trình theo ngày

### 5. Calendar nâng cao (ưu tiên thấp)
- [ ] Click ô trống → popup tạo yêu cầu
- [ ] Conflict detection (cảnh báo xe đã có chuyến)

### 6. Hệ thống (ưu tiên thấp)
- [ ] Time-driven jobs (nhắc lịch sáng, auto-complete, weekly report)
- [ ] Supabase Edge Functions thay cho cron
