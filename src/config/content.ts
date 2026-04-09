// ============================================================
// Content / Copy — Theo Content Bible chuẩn
// Tiếng Việt có dấu, trang trọng, ấm áp, rõ ràng
// ============================================================

export const CONTENT = {
  // --- Thương hiệu ---
  org: 'PHÒNG TỔNG HỢP — ESUHAI GROUP',
  tagline: 'Mỗi chuyến xe là một chuyến yêu thương',
  autoEmail: 'Thư tự động từ hệ thống quản lý Vận Hành Ô Tô Esuhai.',

  // --- Tiêu đề email ---
  subject: {
    newBooking: '[Yêu cầu xe mới]',
    driverAssign: '[Phân công xe]',
    confirmBooker: '[Xe đã sẵn sàng]',
    confirmStaff: '[Lịch xe đã xác nhận]',
    confirmManager: '[Hoàn tất]',
    driverReject: '[Cần phân bổ lại]',
    rejectBooker: '[Không duyệt]',
    cancellation: '[Huỷ chuyến]',
    preTrip: '[Nhắc lịch]',
    completion: '[Xác nhận hoàn thành]',
    evaluation: '[Đánh giá chuyến đi]',
    morningSummary: '[Tổng hợp sáng]',
    weeklyReport: '[Báo cáo tuần]',
    approvalL2: '[Chờ duyệt cấp 2]',
    approvalL3: '[Chờ duyệt cấp 3]',
  },

  // --- Dashboard ---
  dashboard: {
    title: 'Quản lý Xe',
    subtitle: 'Phòng Tổng Hợp — Esuhai Group',
    steps: [
      { title: 'TIẾP NHẬN YÊU CẦU', label: 'Tiếp nhận yêu cầu' },
      { title: 'DUYỆT & PHÂN BỔ', label: 'Duyệt & Phân bổ' },
      { title: 'TÀI XẾ XÁC NHẬN', label: 'Tài xế xác nhận' },
      { title: 'SẴN SÀNG PHỤC VỤ', label: 'Sẵn sàng phục vụ' },
    ],
  },

  // --- Trang phản hồi tài xế ---
  driver: {
    loadingTitle: 'Đang xử lý...',
    loadingMsg: 'Vui lòng chờ trong giây lát.',
    rejectTitle: 'Vui lòng cho biết lý do',
    rejectMsg: 'Ban Điều Phối sẽ sắp xếp tài xế khác.',
    rejectPlaceholder: 'Ví dụ: Nghỉ phép, trùng lịch, xe đang bảo trì...',
    rejectBtn: 'Gửi lý do từ chối',
    invalidTitle: 'Đường dẫn không hợp lệ',
    invalidMsg: 'Vui lòng sử dụng đường dẫn từ email gốc.',
  },

  // --- Badge ---
  badge: {
    doiTac: 'ĐỐI TÁC',
    noiBo: 'NỘI BỘ',
  },
} as const;
