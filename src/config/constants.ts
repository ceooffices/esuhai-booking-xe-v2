// ============================================================
// Business Constants — Theo Content Bible chuẩn
// ============================================================

import type { BookingStatus } from '@/types/database';

// --- Status Labels (theo Content Bible mục III) ---
export const STATUS_LABELS: Record<BookingStatus, string> = {
  cho_duyet: 'Chờ duyệt',
  cho_duyet_cap2: 'Chờ duyệt cấp 2',
  cho_duyet_cap3: 'Chờ duyệt cấp 3',
  da_duyet: 'Đã duyệt',
  khong_duyet: 'Không duyệt',
  cho_tx_xac_nhan: 'Chờ tài xế xác nhận',
  tx_da_nhan: 'Tài xế đã nhận',
  tx_tu_choi: 'Tài xế từ chối',
  san_sang: 'Sẵn sàng',
  da_hoan_thanh: 'Đã hoàn thành',
  da_huy: 'Đã huỷ',
};

// --- Status Colors (theo Content Bible mục VI) ---
export const STATUS_COLORS: Record<BookingStatus, string> = {
  cho_duyet: 'bg-yellow-100 text-yellow-800',
  cho_duyet_cap2: 'bg-amber-100 text-amber-800',
  cho_duyet_cap3: 'bg-orange-100 text-orange-800',
  da_duyet: 'bg-green-100 text-green-800',
  khong_duyet: 'bg-red-100 text-red-800',
  cho_tx_xac_nhan: 'bg-blue-100 text-blue-800',
  tx_da_nhan: 'bg-emerald-100 text-emerald-800',
  tx_tu_choi: 'bg-rose-100 text-rose-800',
  san_sang: 'bg-teal-100 text-teal-800',
  da_hoan_thanh: 'bg-gray-100 text-gray-600',
  da_huy: 'bg-gray-100 text-gray-400',
};

// --- Approval Config ---
export const APPROVAL_CONFIG = {
  internal: { levels: 1, label: 'Xe cơ hữu' },
  external: { levels: 3, label: 'Xe ngoài' },
} as const;

// --- Loại chi phí ---
export const COST_CATEGORIES = [
  { value: 'sua_chua', label: 'Chi phí sửa chữa' },
  { value: 'thay_moi', label: 'Chi phí thay mới' },
  { value: 'cau_duong', label: 'Phí cầu đường' },
  { value: 'do_xe', label: 'Chi phí đỗ xe' },
  { value: 'xang_dau', label: 'Chi phí xăng dầu' },
  { value: 'kiem_dinh', label: 'Chi phí kiểm định' },
  { value: 'thue_xe', label: 'Chi phí thuê xe' },
  { value: 'khac', label: 'Chi phí khác' },
] as const;

// --- Tiêu chí đánh giá ---
export const EVALUATION_CRITERIA = [
  { key: 'service_attitude', label: 'Thái độ phục vụ' },
  { key: 'traffic_compliance', label: 'Chấp hành luật giao thông' },
  { key: 'vehicle_quality', label: 'Chất lượng phương tiện' },
  { key: 'safe_driving', label: 'Lái xe an toàn' },
] as const;

// --- Email Config ---
export const EMAIL_CONFIG = {
  senderName: 'Phòng Tổng Hợp - Esuhai',
  senderEmail: 'booking.xe@esuhai.com',
  alwaysCC: 'hoangkha@esuhai.com',
  delayMs: 500,
} as const;

// --- Timezone ---
export const TIMEZONE = 'Asia/Ho_Chi_Minh';
