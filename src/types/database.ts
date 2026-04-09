// ============================================================
// Supabase Database Types — Booking Xe V2
// ============================================================

// --- Enums ---

export type ApprovalMode = 'internal' | 'external'; // xe cơ hữu | xe ngoài
export type BookingStatus =
  | 'cho_duyet'         // Chờ duyệt (cấp 1)
  | 'cho_duyet_cap2'    // Chờ duyệt cấp 2 (xe ngoài)
  | 'cho_duyet_cap3'    // Chờ duyệt cấp 3 (xe ngoài)
  | 'da_duyet'          // Đã duyệt
  | 'khong_duyet'       // Không duyệt
  | 'cho_tx_xac_nhan'   // Chờ TX xác nhận
  | 'tx_da_nhan'        // TX đã nhận
  | 'tx_tu_choi'        // TX từ chối
  | 'san_sang'          // Sẵn sàng
  | 'da_hoan_thanh'     // Đã hoàn thành
  | 'da_huy';           // Đã hủy

export type UserRole = 'admin' | 'manager' | 'approver_l2' | 'approver_l3' | 'driver' | 'staff';

export type PassengerType = 'nhan_vien' | 'khach';

export type CostCategory =
  | 'sua_chua'
  | 'thay_moi'
  | 'cau_duong'
  | 'do_xe'
  | 'xang_dau'
  | 'kiem_dinh'
  | 'thue_xe'
  | 'khac';

// --- Tables ---

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  department: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;       // e.g. "Toyota 4 chỗ"
  brand: string;
  seat_count: number;
  purchase_date: string | null;
  is_available: boolean;      // false = đang hư/garage
  assigned_driver_id: string | null;
  created_at: string;
}

export interface VehicleInspection {
  id: string;
  vehicle_id: string;
  inspection_date: string;
  expiry_date: string;
  center_name: string;
  next_inspection_date: string | null;
  created_at: string;
}

export interface VehicleMaintenance {
  id: string;
  vehicle_id: string;
  maintenance_date: string;
  from_date: string;
  to_date: string;
  location: string;
  items: MaintenanceItem[];
  created_at: string;
}

export interface MaintenanceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  cost_category: CostCategory;
}

export interface Driver {
  id: string;
  profile_id: string;
  full_name: string;
  phone: string;
  email: string;
  license_type: string;      // B1, C, D...
  license_issued_date: string | null;
  license_issued_place: string | null;
  vehicle_types_can_drive: string[];  // checklist
  is_available: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  // Người đặt
  requester_name: string;
  requester_department: string;
  requester_email: string | null;
  // Phân loại
  category: string;           // Nội bộ / Đối tác
  purpose: string;            // Mục đích / Tên khách
  // Thời gian
  trip_date: string;          // Ngày đi
  pickup_time: string;        // Giờ đón
  end_time: string;           // Giờ kết thúc
  // Chi tiết
  itinerary: string | null;   // Lịch trình
  passenger_count: number;
  staff_in_charge: string | null;  // NV phụ trách
  flight_number: string | null;
  member_names: string | null;
  // Xe ngoài / Chỉ định
  is_external_vehicle: boolean;     // checkbox Xe ngoài
  is_designated_vehicle: boolean;   // checkbox Chỉ định xe
  // Điểm đón/trả
  pickup_point: string | null;
  pickup_address: string | null;
  pickup_pax: number | null;
  dropoff_point: string | null;
  dropoff_address: string | null;
  dropoff_pax: number | null;
  transit_point: string | null;
  departure_point: string | null;
  total_distance_km: number | null;
  // Phân công
  vehicle_id: string | null;
  driver_id: string | null;
  // Duyệt
  status: BookingStatus;
  current_approval_level: number;   // 1, 2, hoặc 3
  max_approval_levels: number;      // 1 (cơ hữu) hoặc 3 (ngoài)
  // Tracking duyệt
  approved_by_l1: string | null;
  approved_at_l1: string | null;
  approved_by_l2: string | null;
  approved_at_l2: string | null;
  approved_by_l3: string | null;
  approved_at_l3: string | null;
  // Từ chối / Hủy
  rejection_reason: string | null;
  rejected_by: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  // TX
  driver_confirmed_at: string | null;
  driver_rejection_reason: string | null;
  // Xe ngoài — bổ sung sau duyệt cấp 3
  external_vehicle_cost: number | null;
  external_vehicle_info: string | null;
  // Ghi chú
  notes: string | null;
  ops_notes: string | null;
  // Meta
  created_at: string;
  updated_at: string;
}

export interface BookingPassenger {
  id: string;
  booking_id: string;
  full_name: string;
  department: string | null;
  email: string | null;
  phone: string | null;
  passenger_type: PassengerType;
}

export interface PostTrip {
  id: string;
  booking_id: string;
  actual_departure: string | null;
  actual_return: string | null;
  departure_diff_minutes: number | null;  // tự tính
  return_diff_minutes: number | null;     // tự tính
  overnight_hours: number | null;         // 22:00-06:00
  total_km: number | null;
  completed_at: string;
  updated_by: string;
  created_at: string;
}

export interface PostTripCost {
  id: string;
  post_trip_id: string;
  booking_id: string;
  cost_category: CostCategory;
  description: string | null;
  amount: number;
  created_at: string;
}

export interface TripEvaluation {
  id: string;
  booking_id: string;
  evaluator_email: string;
  evaluator_name: string;
  service_attitude: number;       // 1-5
  traffic_compliance: number;     // 1-5
  vehicle_quality: number;        // 1-5
  safe_driving: number;           // 1-5
  average_score: number;          // tự tính
  feedback: string | null;
  created_at: string;
}

export interface EmailLog {
  id: string;
  booking_id: string | null;
  template_name: string;
  recipient_email: string;
  subject: string;
  status: 'sent' | 'failed';
  error_message: string | null;
  sent_at: string;
}

export interface SystemConfig {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}
