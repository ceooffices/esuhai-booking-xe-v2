// ============================================================
// Seed Script — Tạo dữ liệu mẫu cho Booking Xe V2
// Chạy: npx tsx scripts/seed.ts
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://larfhojooprqrwywyidy.supabase.co',
  // Service role key — chỉ dùng trong script, không commit
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function seed() {
  console.log('--- Bắt đầu seed dữ liệu ---\n');

  // === 1. TÀI XẾ ===
  console.log('1. Tạo danh sách tài xế...');
  const drivers = [
    {
      full_name: 'TRẦN VĂN MINH',
      phone: '0912345678',
      email: 'minh.tx@esuhai.com',
      license_type: 'C',
      license_issued_place: 'TP.HCM',
      vehicle_types_can_drive: ['4 chỗ', '7 chỗ', '16 chỗ'],
      is_available: true,
    },
    {
      full_name: 'NGUYỄN VĂN NAM',
      phone: '0987654321',
      email: 'nam.tx@esuhai.com',
      license_type: 'D',
      license_issued_place: 'TP.HCM',
      vehicle_types_can_drive: ['4 chỗ', '7 chỗ', '16 chỗ', '29 chỗ'],
      is_available: true,
    },
    {
      full_name: 'LÊ VĂN HÙNG',
      phone: '0901111222',
      email: 'hung.tx@esuhai.com',
      license_type: 'B2',
      license_issued_place: 'Bình Dương',
      vehicle_types_can_drive: ['4 chỗ', '7 chỗ'],
      is_available: false, // Đang nghỉ phép
    },
  ];

  const { data: driverData, error: driverErr } = await supabase
    .from('drivers')
    .upsert(drivers, { onConflict: 'email' })
    .select();

  if (driverErr) {
    console.error('  Lỗi tạo tài xế:', driverErr.message);
  } else {
    console.log(`  Đã tạo ${driverData.length} tài xế`);
  }

  // === 2. PHƯƠNG TIỆN ===
  console.log('\n2. Tạo danh sách phương tiện...');
  const vehicles = [
    {
      plate_number: '51A-12345',
      vehicle_type: 'Toyota Innova 7 chỗ',
      brand: 'Toyota',
      seat_count: 7,
      is_available: true,
    },
    {
      plate_number: '51A-67890',
      vehicle_type: 'Ford Transit 16 chỗ',
      brand: 'Ford',
      seat_count: 16,
      is_available: true,
    },
    {
      plate_number: '51A-11111',
      vehicle_type: 'Toyota Vios 4 chỗ',
      brand: 'Toyota',
      seat_count: 4,
      is_available: false, // Đang bảo trì
    },
    {
      plate_number: '51A-22222',
      vehicle_type: 'Mercedes Sprinter 16 chỗ',
      brand: 'Mercedes',
      seat_count: 16,
      is_available: true,
    },
  ];

  const { data: vehicleData, error: vehicleErr } = await supabase
    .from('vehicles')
    .upsert(vehicles, { onConflict: 'plate_number' })
    .select();

  if (vehicleErr) {
    console.error('  Lỗi tạo xe:', vehicleErr.message);
  } else {
    console.log(`  Đã tạo ${vehicleData.length} phương tiện`);
  }

  // === 3. BOOKING MẪU ===
  console.log('\n3. Tạo yêu cầu booking mẫu...');

  // Lấy ID tài xế và xe vừa tạo
  const { data: allDrivers } = await supabase.from('drivers').select('id, full_name');
  const { data: allVehicles } = await supabase.from('vehicles').select('id, plate_number');

  const driverMihn = allDrivers?.find(d => d.full_name === 'TRẦN VĂN MINH');
  const driverNam = allDrivers?.find(d => d.full_name === 'NGUYỄN VĂN NAM');
  const vehicle7cho = allVehicles?.find(v => v.plate_number === '51A-12345');
  const vehicle16cho = allVehicles?.find(v => v.plate_number === '51A-67890');

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  function fmt(d: Date) { return d.toISOString().split('T')[0]; }

  const bookings = [
    // 1. Chờ duyệt — yêu cầu mới từ phòng MSA
    {
      requester_name: 'NGUYỄN THỊ MINH TÂM',
      requester_department: 'MSA',
      requester_email: 'minhtam@esuhai.com',
      category: 'Đối tác',
      purpose: 'Đón đối tác Honda Vietnam',
      trip_date: fmt(tomorrow),
      pickup_time: '08:30',
      end_time: '17:00',
      itinerary: 'Văn phòng Esuhai → Sân bay Tân Sơn Nhất → Khách sạn Rex → Văn phòng Esuhai',
      passenger_count: 3,
      staff_in_charge: 'LÊ ANH TUẤN',
      flight_number: 'VN123',
      member_names: 'Mr. Tanaka, Mr. Suzuki',
      status: 'cho_duyet',
      is_external_vehicle: false,
      max_approval_levels: 1,
      current_approval_level: 1,
    },
    // 2. Chờ duyệt — xe ngoài (3 cấp)
    {
      requester_name: 'TRẦN HƯƠNG GIANG',
      requester_department: 'Nhân sự',
      requester_email: 'giang.th@esuhai.com',
      category: 'Nội bộ',
      purpose: 'Di chuyển nhân viên đi team building Vũng Tàu',
      trip_date: fmt(nextWeek),
      pickup_time: '06:00',
      end_time: '20:00',
      itinerary: 'Văn phòng Esuhai → Vũng Tàu → Văn phòng Esuhai',
      passenger_count: 25,
      staff_in_charge: 'TRẦN HƯƠNG GIANG',
      status: 'cho_duyet',
      is_external_vehicle: true,
      max_approval_levels: 3,
      current_approval_level: 1,
    },
    // 3. Đã duyệt — chờ phân công
    {
      requester_name: 'PHẠM QUỐC VIỆT',
      requester_department: 'Kế toán',
      requester_email: 'viet.pq@esuhai.com',
      category: 'Nội bộ',
      purpose: 'Đi nộp hồ sơ thuế Quận 1',
      trip_date: fmt(tomorrow),
      pickup_time: '09:00',
      end_time: '11:30',
      itinerary: 'Văn phòng Esuhai → Chi cục thuế Quận 1 → Văn phòng Esuhai',
      passenger_count: 2,
      staff_in_charge: 'PHẠM QUỐC VIỆT',
      status: 'da_duyet',
      is_external_vehicle: false,
      max_approval_levels: 1,
      current_approval_level: 1,
      approved_by_l1: 'thuyha@esuhai.com',
      approved_at_l1: new Date().toISOString(),
    },
    // 4. Chờ TX xác nhận — đã phân công
    {
      requester_name: 'LÊ THỊ HỒNG NHUNG',
      requester_department: 'Đào tạo',
      requester_email: 'nhung.lth@esuhai.com',
      category: 'Đối tác',
      purpose: 'Đón giảng viên Nhật Bản tại sân bay',
      trip_date: fmt(dayAfter),
      pickup_time: '14:00',
      end_time: '16:30',
      itinerary: 'Sân bay Tân Sơn Nhất → Trung tâm Đào tạo Esuhai',
      passenger_count: 2,
      staff_in_charge: 'LÊ THỊ HỒNG NHUNG',
      flight_number: 'NH831',
      member_names: 'Sensei Yamamoto',
      status: 'cho_tx_xac_nhan',
      is_external_vehicle: false,
      max_approval_levels: 1,
      current_approval_level: 1,
      approved_by_l1: 'thuyha@esuhai.com',
      approved_at_l1: new Date().toISOString(),
      driver_id: driverMihn?.id,
      vehicle_id: vehicle7cho?.id,
    },
    // 5. TX đã nhận — sẵn sàng
    {
      requester_name: 'VÕ THANH TÙNG',
      requester_department: 'Kinh doanh',
      requester_email: 'tung.vt@esuhai.com',
      category: 'Đối tác',
      purpose: 'Đưa khách hàng tham quan nhà máy Long An',
      trip_date: fmt(today),
      pickup_time: '07:00',
      end_time: '17:00',
      itinerary: 'Văn phòng Esuhai → Nhà máy Long An → Nhà hàng → Văn phòng Esuhai',
      passenger_count: 5,
      staff_in_charge: 'VÕ THANH TÙNG',
      member_names: 'Đoàn khách ABC Corp',
      status: 'tx_da_nhan',
      is_external_vehicle: false,
      max_approval_levels: 1,
      current_approval_level: 1,
      approved_by_l1: 'thuyha@esuhai.com',
      approved_at_l1: new Date().toISOString(),
      driver_id: driverNam?.id,
      vehicle_id: vehicle16cho?.id,
      driver_confirmed_at: new Date().toISOString(),
    },
    // 6. Đã hoàn thành
    {
      requester_name: 'ĐẶNG THỊ MAI',
      requester_department: 'Hành chính',
      requester_email: 'mai.dt@esuhai.com',
      category: 'Nội bộ',
      purpose: 'Giao tài liệu cho đối tác Bình Dương',
      trip_date: fmt(new Date(today.getTime() - 86400000)), // hôm qua
      pickup_time: '13:00',
      end_time: '16:00',
      itinerary: 'Văn phòng Esuhai → KCN VSIP Bình Dương → Văn phòng Esuhai',
      passenger_count: 1,
      staff_in_charge: 'ĐẶNG THỊ MAI',
      status: 'da_hoan_thanh',
      is_external_vehicle: false,
      max_approval_levels: 1,
      current_approval_level: 1,
      approved_by_l1: 'thuyha@esuhai.com',
      approved_at_l1: new Date(today.getTime() - 172800000).toISOString(),
      driver_id: driverMihn?.id,
      vehicle_id: vehicle7cho?.id,
      driver_confirmed_at: new Date(today.getTime() - 172800000).toISOString(),
    },
    // 7. TX từ chối — cần phân bổ lại
    {
      requester_name: 'NGUYỄN HOÀNG SƠN',
      requester_department: 'IT',
      requester_email: 'son.nh@esuhai.com',
      category: 'Nội bộ',
      purpose: 'Di chuyển thiết bị đến chi nhánh 2',
      trip_date: fmt(dayAfter),
      pickup_time: '10:00',
      end_time: '12:00',
      itinerary: 'Văn phòng chính → Chi nhánh 2 Quận 7',
      passenger_count: 2,
      staff_in_charge: 'NGUYỄN HOÀNG SƠN',
      status: 'tx_tu_choi',
      is_external_vehicle: false,
      max_approval_levels: 1,
      current_approval_level: 1,
      approved_by_l1: 'thuyha@esuhai.com',
      approved_at_l1: new Date().toISOString(),
      driver_id: driverMihn?.id,
      vehicle_id: vehicle7cho?.id,
      driver_rejection_reason: 'Xe đang bảo trì định kỳ, không thể phục vụ trong ngày này.',
    },
    // 8. Không duyệt
    {
      requester_name: 'BÙI VĂN ĐẠT',
      requester_department: 'Marketing',
      requester_email: 'dat.bv@esuhai.com',
      category: 'Nội bộ',
      purpose: 'Đi quay video quảng cáo ngoại cảnh',
      trip_date: fmt(nextWeek),
      pickup_time: '08:00',
      end_time: '18:00',
      itinerary: 'Văn phòng → Các địa điểm quay phim tại Quận 2',
      passenger_count: 6,
      status: 'khong_duyet',
      is_external_vehicle: false,
      max_approval_levels: 1,
      current_approval_level: 1,
      rejection_reason: 'Yêu cầu này nên sử dụng dịch vụ thuê xe bên ngoài. Vui lòng liên hệ Phòng Tổng Hợp để được hỗ trợ.',
      rejected_by: 'thuyha@esuhai.com',
    },
  ];

  const { data: bookingData, error: bookingErr } = await supabase
    .from('bookings')
    .insert(bookings)
    .select('id, purpose, status');

  if (bookingErr) {
    console.error('  Lỗi tạo booking:', bookingErr.message);
  } else {
    console.log(`  Đã tạo ${bookingData.length} yêu cầu booking:`);
    bookingData.forEach((b, i) => {
      console.log(`    ${i + 1}. [${b.status}] ${b.purpose}`);
    });
  }

  // === 4. KIỂM ĐỊNH XE MẪU ===
  console.log('\n4. Tạo lịch sử kiểm định xe...');
  if (allVehicles && allVehicles.length > 0) {
    const inspections = allVehicles.map(v => ({
      vehicle_id: v.id,
      inspection_date: '2026-01-15',
      expiry_date: '2027-01-15',
      center_name: 'Trung tâm Đăng kiểm 50-03S',
      next_inspection_date: '2027-01-15',
    }));

    const { error: inspErr } = await supabase.from('vehicle_inspections').insert(inspections);
    if (inspErr) {
      console.error('  Lỗi:', inspErr.message);
    } else {
      console.log(`  Đã tạo ${inspections.length} bản ghi kiểm định`);
    }
  }

  // === TỔNG KẾT ===
  console.log('\n--- Seed hoàn tất ---');
  console.log('Tài xế:    3 (2 sẵn sàng, 1 nghỉ phép)');
  console.log('Xe:        4 (3 khả dụng, 1 bảo trì)');
  console.log('Booking:   8 (đủ mọi trạng thái)');
  console.log('Kiểm định: 4 bản ghi');
}

seed().catch(console.error);
