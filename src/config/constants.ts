// ============================================================
// Business Constants — Ported from Ver01 gas_project/config.js
// ============================================================

import type { BookingStatus } from '@/types/database';

// --- Status Labels (Vietnamese) ---
export const STATUS_LABELS: Record<BookingStatus, string> = {
  cho_duyet: 'Cho duyet',
  cho_duyet_cap2: 'Cho duyet cap 2',
  cho_duyet_cap3: 'Cho duyet cap 3',
  da_duyet: 'Da duyet',
  khong_duyet: 'Khong duyet',
  cho_tx_xac_nhan: 'Cho TX xac nhan',
  tx_da_nhan: 'TX da nhan',
  tx_tu_choi: 'TX tu choi',
  san_sang: 'San sang',
  da_hoan_thanh: 'Da hoan thanh',
  da_huy: 'Da huy',
};

// --- Status Colors (Tailwind classes) ---
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
  internal: { levels: 1, label: 'Xe co huu' },
  external: { levels: 3, label: 'Xe ngoai' },
} as const;

// --- Cost Categories ---
export const COST_CATEGORIES = [
  { value: 'sua_chua', label: 'Chi phi sua chua' },
  { value: 'thay_moi', label: 'Chi phi thay moi' },
  { value: 'cau_duong', label: 'Phi cau duong' },
  { value: 'do_xe', label: 'Chi phi do xe' },
  { value: 'xang_dau', label: 'Chi phi xang dau' },
  { value: 'kiem_dinh', label: 'Chi phi kiem dinh' },
  { value: 'thue_xe', label: 'Chi phi thue xe' },
  { value: 'khac', label: 'Chi phi khac' },
] as const;

// --- Evaluation Criteria ---
export const EVALUATION_CRITERIA = [
  { key: 'service_attitude', label: 'Thai do phuc vu' },
  { key: 'traffic_compliance', label: 'Chap hanh luat giao thong' },
  { key: 'vehicle_quality', label: 'Chat luong phuong tien' },
  { key: 'safe_driving', label: 'Lai xe an toan' },
] as const;

// --- Email Config ---
export const EMAIL_CONFIG = {
  senderName: 'Phong Tong hop - Esuhai',
  senderEmail: 'booking.xe@esuhai.com',
  alwaysCC: 'hoangkha@esuhai.com',
  delayMs: 500,
} as const;

// --- Timezone ---
export const TIMEZONE = 'Asia/Ho_Chi_Minh';
