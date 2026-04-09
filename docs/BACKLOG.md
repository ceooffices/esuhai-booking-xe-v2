# BACKLOG — Booking Xe V2

> Cập nhật: 2026-04-10 | 18 commits | ~8,500 dòng code

## Đã hoàn thành (~95% spec)

- [x] Dashboard: stats, filter, booking cards, chi tiết, duyệt/phân công/hoàn thành/huỷ
- [x] Duyệt đa cấp: 1 cấp (xe cơ hữu) / 3 cấp (xe ngoài)
- [x] Không duyệt + Huỷ chuyến: bắt buộc lý do + email TOÀN BỘ thành viên
- [x] Phân công Tài xế & Xe + email tài xế (CTA xác nhận/từ chối)
- [x] TX xác nhận / từ chối qua link email
- [x] Cập nhật sau chuyến đi: giờ thực tế + chi phí phát sinh (8 loại)
- [x] Đánh giá chuyến đi: 5 sao, 4 tiêu chí, góp ý (/evaluate)
- [x] Calendar tuần/tháng + conflict detection (highlight đỏ)
- [x] Quản lý Tài xế: CRUD + bằng lái + loại xe + khả năng đáp ứng
- [x] Quản lý Phương tiện: CRUD + kiểm định + bảo dưỡng + disable
- [x] Báo cáo: filter tuần/tháng/quý/năm, 8 thống kê, phân tích theo BP/TX/chi phí
- [x] Cấu hình hệ thống: UI quản lý config
- [x] Gửi form đăng ký cho nhân viên (tiện ích nhỏ gọn)
- [x] GAS webhook ver01 → ver02 (sync booking realtime)
- [x] Email templates V2: cấu trúc 3 khối + Add to Calendar + quy định chờ xe
- [x] Framer Motion: stagger, modal slide-up, count-up, toast animation
- [x] Skeleton loading cho 6 trang
- [x] Mobile-optimized: SF Pro font, 44px touch, safe area, active feedback

---

## Còn lại (~5%)

### Ưu tiên khi cần

- [ ] Export báo cáo Excel/PDF
- [ ] Chart visualization (pie/line chart)
- [ ] Gantt-style lịch trình theo ngày
- [ ] Form thêm kiểm định xe trực tiếp trên dashboard
- [ ] Form thêm bảo dưỡng/sửa chữa xe
- [ ] Gán xe cố định cho tài xế (1 xe 1 TX)
- [ ] Time-driven jobs (nhắc lịch sáng, auto-complete)
- [ ] Supabase Edge Functions thay cho cron
