'use client';

import { useState } from 'react';
import {
  buildNewBookingEmail,
  buildDriverAssignEmail,
  buildConfirmBookerEmail,
  buildDriverRejectEmail,
  buildRejectBookerEmail,
  buildCancellationEmail,
} from '@/lib/email-templates';

const SAMPLE: Parameters<typeof buildNewBookingEmail>[0] = {
  bookingId: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
  purpose: 'Đón đối tác Nhật Bản tại sân bay Tân Sơn Nhất',
  category: 'Đối tác',
  tripDate: '2026-04-15',
  pickupTime: '08:00',
  endTime: '12:00',
  itinerary: 'VP Esuhai (Q.Tân Bình) → Sân bay TSN → Khách sạn Rex (Q.1)',
  passengerCount: 4,
  requesterName: 'TRẦN HỒNG THƠ',
  requesterDepartment: 'Phòng Kinh Doanh',
  requesterGender: 'female',
  staffInCharge: 'Nguyễn Thị Bích Ngọc',
  flightNumber: 'VN123',
  memberNames: 'Tanaka-san, Suzuki-san, Trần Hồng Thơ, Nguyễn Thị Bích Ngọc',
  driverName: 'NGUYỄN VĂN MINH',
  driverPhone: '0901 234 567',
  driverGender: 'male',
  vehicleType: 'Toyota Innova 7 chỗ',
  plateNumber: '51A-12345',
  rejectionReason: 'Xe đang bảo trì, không thể phục vụ ngày này',
  dashboardUrl: '#',
  managerName: 'LÊ THỊ THÚY HÀ',
  managerGender: 'female',
};

const TEMPLATES = [
  {
    id: 'new_booking',
    name: '1. Yêu cầu mới → Quản lý',
    color: '#2563eb',
    build: () => buildNewBookingEmail(SAMPLE),
  },
  {
    id: 'driver_assign',
    name: '2. Phân công → Tài xế',
    color: '#1d4ed8',
    build: () =>
      buildDriverAssignEmail({
        ...SAMPLE,
        confirmUrl: '#confirm',
        rejectUrl: '#reject',
      }),
  },
  {
    id: 'confirm_booker',
    name: '3. Xác nhận → Người yêu cầu',
    color: '#16a34a',
    build: () => buildConfirmBookerEmail(SAMPLE),
  },
  {
    id: 'driver_reject',
    name: '4. TX từ chối → Quản lý',
    color: '#dc2626',
    build: () => buildDriverRejectEmail(SAMPLE),
  },
  {
    id: 'reject_booker',
    name: '5. Không duyệt → Người yêu cầu',
    color: '#64748b',
    build: () => buildRejectBookerEmail(SAMPLE),
  },
  {
    id: 'cancellation',
    name: '6. Huỷ chuyến → Toàn bộ',
    color: '#dc2626',
    build: () =>
      buildCancellationEmail({
        ...SAMPLE,
        cancelledBy: 'Lê Thị Thúy Hà (Phòng Tổng Hợp)',
        cancellationReason: 'Đối tác hoãn lịch sang tuần sau',
        recipientName: 'NGUYỄN VĂN MINH',
        recipientGender: 'male' as const,
      }),
  },
];

export default function EmailPreviewPage() {
  const [active, setActive] = useState(0);
  const tpl = TEMPLATES[active];
  const result = tpl.build();

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: 280, background: '#1e293b', padding: '24px 0', overflowY: 'auto', flexShrink: 0 }}>
        <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, padding: '0 20px', margin: '0 0 8px', letterSpacing: 0.5 }}>
          EMAIL PREVIEW
        </h2>
        <p style={{ color: '#94a3b8', fontSize: 12, padding: '0 20px', margin: '0 0 20px' }}>
          Xem template — Không gửi email
        </p>
        {TEMPLATES.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setActive(i)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '12px 20px',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              background: i === active ? '#334155' : 'transparent',
              color: i === active ? '#fff' : '#cbd5e1',
              borderLeft: i === active ? `3px solid ${t.color}` : '3px solid transparent',
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
        {/* Top bar */}
        <div style={{ padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Subject:</div>
            <div style={{ fontSize: 15, color: '#1e293b', fontWeight: 600 }}>{result.subject}</div>
          </div>
          <div style={{
            padding: '6px 14px',
            background: tpl.color,
            color: '#fff',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
          }}>
            {tpl.id}
          </div>
        </div>

        {/* iframe */}
        <div style={{ flex: 1, padding: 24 }}>
          <iframe
            srcDoc={result.html}
            style={{
              width: '100%',
              height: '100%',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              background: '#fff',
            }}
            title="Email Preview"
          />
        </div>
      </div>
    </div>
  );
}
