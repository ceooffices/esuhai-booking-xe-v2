// ============================================================
// Email Templates V2 — Chiến lược 3 Khối
// Khối An Tâm (Top) → Khối Thực Thi (Middle) → Khối Dự Phòng (Bottom)
// Theo Content Bible: trang trọng, ấm áp, rõ ràng
// ============================================================

interface BookingEmailData {
  bookingId: string;
  purpose: string;
  category: string;
  tripDate: string;
  pickupTime: string;
  endTime?: string;
  itinerary?: string;
  passengerCount: number;
  requesterName: string;
  requesterDepartment: string;
  staffInCharge?: string;
  flightNumber?: string;
  memberNames?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleType?: string;
  plateNumber?: string;
  rejectionReason?: string;
  dashboardUrl?: string;
}

// --- Shared Components ---

function baseWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    ${content}
    <div style="text-align:center;padding:24px 0 8px;color:#94a3b8;font-size:12px;line-height:1.5;">
      <div style="font-weight:600;letter-spacing:0.5px;">PHÒNG TỔNG HỢP — ESUHAI GROUP</div>
      <div style="margin-top:4px;font-style:italic;">Mỗi chuyến xe là một chuyến yêu thương</div>
    </div>
  </div>
</body>
</html>`;
}

function headerBlock(title: string, subtitle: string, color: string = '#2563eb'): string {
  return `
    <div style="background:${color};border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${title}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${subtitle}</p>
    </div>`;
}

function infoRow(label: string, value: string, highlight?: boolean): string {
  return `
    <tr>
      <td style="padding:10px 0;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;width:140px;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;color:#1e293b;font-size:15px;${highlight ? 'font-weight:700;font-size:17px;' : ''}">${value}</td>
    </tr>`;
}

function ctaButton(text: string, url: string, color: string = '#2563eb'): string {
  return `
    <div style="text-align:center;padding:8px 0;">
      <a href="${url}" style="display:inline-block;background:${color};color:#ffffff;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:700;">${text}</a>
    </div>`;
}

function alertBox(title: string, message: string, bgColor: string, textColor: string, borderColor: string): string {
  return `
    <div style="background:${bgColor};border:1px solid ${borderColor};border-radius:12px;padding:16px 20px;margin:16px 0;">
      <div style="color:${textColor};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;">${title}</div>
      <div style="color:${textColor};font-size:15px;margin-top:6px;line-height:1.5;">${message}</div>
    </div>`;
}

function driverCard(name: string, phone: string, vehicle?: string, plate?: string): string {
  return `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:16px 0;">
      <div style="color:#15803d;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;">Tài xế phục vụ</div>
      <div style="color:#166534;font-size:18px;font-weight:700;margin-top:8px;">${name}</div>
      <a href="tel:${phone.replace(/\s/g, '')}" style="color:#16a34a;font-size:15px;text-decoration:underline;display:inline-block;margin-top:4px;">${phone}</a>
      ${vehicle ? `<div style="color:#166534;font-size:14px;margin-top:8px;">${vehicle}${plate ? ' — ' + plate : ''}</div>` : ''}
    </div>`;
}

// --- Add to Calendar (Google Calendar link) ---
function addToCalendarButton(title: string, date: string, startTime: string, endTime?: string, location?: string): string {
  // Format: YYYYMMDDTHHMMSS
  const dateClean = date.replace(/-/g, '');
  const start = startTime.replace(':', '') + '00';
  const end = endTime ? endTime.replace(':', '') + '00' : start;
  const dtStart = `${dateClean}T${start}`;
  const dtEnd = `${dateClean}T${end}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${dtStart}/${dtEnd}`,
    details: `Chuyến xe Esuhai — ${title}`,
    location: location || 'Văn phòng Esuhai',
    ctz: 'Asia/Ho_Chi_Minh',
  });

  const googleUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;

  return `
    <div style="text-align:center;padding:8px 0;">
      <a href="${googleUrl}" style="display:inline-block;background:#ffffff;color:#2563eb;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;border:2px solid #2563eb;">
        Thêm vào Lịch
      </a>
    </div>`;
}

// --- Google Maps link ---
function mapsLink(address: string): string {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return `<a href="${url}" style="color:#2563eb;text-decoration:underline;">${address}</a>`;
}

// --- Quy định chờ xe ---
function waitingPolicy(): string {
  return `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:12px 0;font-size:13px;color:#92400e;line-height:1.5;">
      Tài xế sẽ chờ tối đa 15 phút tại điểm đón. Nếu có thay đổi, vui lòng liên hệ tài xế trực tiếp.
    </div>`;
}

function footerNote(text: string): string {
  return `
    <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;">
      <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;text-align:center;">${text}</p>
    </div>`;
}

// --- Template 1: Yêu cầu mới → Quản lý ---
export function buildNewBookingEmail(d: BookingEmailData): { subject: string; html: string } {
  const subject = `[Yêu cầu xe mới] ${d.purpose} — ${d.tripDate}`;

  const body = `
    ${headerBlock('Yêu cầu sử dụng xe mới', 'Phòng Tổng Hợp — Esuhai Group')}
    <div style="background:#ffffff;padding:24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 20px;">
        Kính gửi chị,<br>
        Hệ thống vừa tiếp nhận một yêu cầu sử dụng xe mới. Vui lòng xem xét và phân bổ tài xế phù hợp.
      </p>
      <table style="width:100%;border-collapse:collapse;">
        ${infoRow('Mã yêu cầu', '#' + d.bookingId.slice(0, 8).toUpperCase())}
        ${infoRow('Ngày và giờ đón', `<strong>${d.tripDate}</strong> | ${d.pickupTime}${d.endTime ? ' — ' + d.endTime : ''}`, true)}
        ${infoRow('Mục đích', d.purpose)}
        ${infoRow('Phân loại', d.category === 'Đối tác' ? '<span style="background:#dbeafe;color:#1d4ed8;padding:2px 10px;border-radius:20px;font-size:13px;font-weight:600;">ĐỐI TÁC</span>' : 'Nội bộ')}
        ${infoRow('Người yêu cầu', `${d.requesterName} — ${d.requesterDepartment}`)}
        ${infoRow('Số lượng', `${d.passengerCount} người`)}
        ${d.staffInCharge ? infoRow('NV phụ trách', d.staffInCharge) : ''}
        ${d.flightNumber ? infoRow('Chuyến bay', `<strong>${d.flightNumber}</strong>`) : ''}
        ${d.memberNames ? infoRow('Thành viên', d.memberNames) : ''}
        ${d.itinerary ? infoRow('Lịch trình', d.itinerary) : ''}
      </table>
      ${d.dashboardUrl ? ctaButton('Mở bảng điều phối', d.dashboardUrl) : ''}
    </div>
    ${footerNote('Vui lòng phân bổ tài xế và xe sớm nhất có thể.')}`;

  return { subject, html: baseWrapper(body) };
}

// --- Template 2: Phân công tài xế → Tài xế ---
export function buildDriverAssignEmail(d: BookingEmailData & { confirmUrl: string; rejectUrl: string }): { subject: string; html: string } {
  const subject = `[Phân công xe] ${d.tripDate} — ${d.purpose}`;

  const body = `
    ${headerBlock('Phân công phục vụ chuyến xe', 'Ban Điều Phối — Esuhai Group')}
    <div style="background:#ffffff;padding:24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 20px;">
        Kính gửi anh ${d.driverName},<br>
        Ban Điều Phối phân công anh phục vụ chuyến xe theo thông tin bên dưới. Vui lòng kiểm tra lộ trình và xác nhận để hoàn tất quy trình.
      </p>

      <div style="background:#eff6ff;border:2px solid #3b82f6;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
        <div style="color:#1d4ed8;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Ngày và giờ đón</div>
        <div style="color:#1e3a5f;font-size:24px;font-weight:800;margin-top:8px;">${d.tripDate}</div>
        <div style="color:#1d4ed8;font-size:18px;font-weight:600;margin-top:4px;">${d.pickupTime}${d.endTime ? ' — ' + d.endTime : ''}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        ${infoRow('Mục đích', d.purpose)}
        ${infoRow('Số lượng', `${d.passengerCount} người`)}
        ${d.vehicleType ? infoRow('Xe phân bổ', `${d.vehicleType}${d.plateNumber ? ' — ' + d.plateNumber : ''}`) : ''}
        ${d.staffInCharge ? infoRow('NV phụ trách', d.staffInCharge) : ''}
        ${d.itinerary ? infoRow('Lịch trình', d.itinerary) : ''}
      </table>

      <div style="margin:24px 0 8px;display:flex;gap:12px;">
        ${ctaButton('Xác nhận nhận ca', d.confirmUrl, '#16a34a')}
      </div>
      <div style="text-align:center;">
        <a href="${d.rejectUrl}" style="color:#64748b;font-size:14px;text-decoration:underline;">Từ chối — ghi lý do</a>
      </div>

      ${addToCalendarButton(d.purpose, d.tripDate, d.pickupTime, d.endTime, d.itinerary)}
    </div>
    ${footerNote('Nếu xác nhận, thông tin sẽ được gửi đến người yêu cầu và nhân viên phụ trách. Nếu có trở ngại, vui lòng phản hồi sớm để Ban Điều Phối kịp thời xử lý.')}`;

  return { subject, html: baseWrapper(body) };
}

// --- Template 3: Xác nhận → Người yêu cầu ---
export function buildConfirmBookerEmail(d: BookingEmailData): { subject: string; html: string } {
  const subject = `[Xe đã sẵn sàng] ${d.purpose} — ${d.tripDate}`;

  const body = `
    ${headerBlock('Chuyến xe đã được xác nhận', 'Xe đã phân bổ & Sẵn sàng', '#16a34a')}
    <div style="background:#ffffff;padding:24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 20px;">
        Kính gửi anh/chị ${d.requesterName},<br>
        Yêu cầu sử dụng xe của anh/chị đã được phê duyệt và tài xế đã xác nhận nhận ca. Dưới đây là thông tin chi tiết để anh/chị chủ động liên hệ khi cần.
      </p>

      <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
        <div style="color:#15803d;font-size:13px;font-weight:700;text-transform:uppercase;">Lịch đón xác nhận</div>
        <div style="color:#14532d;font-size:24px;font-weight:800;margin-top:8px;">${d.tripDate}</div>
        <div style="color:#16a34a;font-size:18px;font-weight:600;margin-top:4px;">${d.pickupTime}${d.endTime ? ' — ' + d.endTime : ''}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        ${infoRow('Mục đích', d.purpose)}
        ${infoRow('Số lượng', `${d.passengerCount} người`)}
        ${d.itinerary ? infoRow('Lịch trình', d.itinerary) : ''}
      </table>

      ${d.driverName && d.driverPhone ? driverCard(d.driverName, d.driverPhone, d.vehicleType, d.plateNumber) : ''}

      ${d.driverPhone ? ctaButton(`Gọi Tài Xế: ${d.driverPhone}`, `tel:${d.driverPhone.replace(/\s/g, '')}`, '#16a34a') : ''}

      ${addToCalendarButton(d.purpose, d.tripDate, d.pickupTime, d.endTime, d.itinerary)}

      ${waitingPolicy()}
    </div>
    ${footerNote('Nếu có thay đổi lịch trình, vui lòng liên hệ Phòng Tổng Hợp sớm nhất có thể.')}`;

  return { subject, html: baseWrapper(body) };
}

// --- Template 6: TX từ chối → Quản lý ---
export function buildDriverRejectEmail(d: BookingEmailData): { subject: string; html: string } {
  const subject = `[Cần phân bổ lại] Yêu cầu #${d.bookingId.slice(0, 8).toUpperCase()} — ${d.purpose}`;

  const body = `
    ${headerBlock('Cần phân bổ tài xế khác', 'Yêu Cầu Thay Đổi Phân Bổ', '#dc2626')}
    <div style="background:#ffffff;padding:24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 20px;">
        Kính gửi chị,<br>
        Tài xế ${d.driverName} không nhận ca cho yêu cầu bên dưới. Vui lòng phân bổ tài xế khác sớm nhất có thể để đảm bảo phục vụ đúng lịch.
      </p>

      ${d.rejectionReason ? alertBox('Lý do từ chối', d.rejectionReason, '#fef2f2', '#991b1b', '#fecaca') : ''}

      <table style="width:100%;border-collapse:collapse;">
        ${infoRow('Ngày và giờ', `${d.tripDate} | ${d.pickupTime}`)}
        ${infoRow('Mục đích', d.purpose)}
        ${infoRow('Tài xế từ chối', d.driverName || '—')}
      </table>

      ${d.dashboardUrl ? ctaButton('Mở bảng điều phối — phân bổ lại', d.dashboardUrl, '#dc2626') : ''}
    </div>
    ${footerNote('Vui lòng phân bổ lại ngay để đảm bảo lịch di chuyển.')}`;

  return { subject, html: baseWrapper(body) };
}

// --- Template: Không duyệt → Người yêu cầu ---
export function buildRejectBookerEmail(d: BookingEmailData): { subject: string; html: string } {
  const subject = `[Không duyệt] ${d.purpose} — ${d.tripDate}`;

  const body = `
    ${headerBlock('Yêu cầu không được duyệt', 'Phòng Tổng Hợp — Esuhai Group', '#64748b')}
    <div style="background:#ffffff;padding:24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 20px;">
        Kính gửi anh/chị ${d.requesterName},<br>
        Yêu cầu sử dụng xe bên dưới đã không được phê duyệt. Vui lòng liên hệ Phòng Tổng Hợp nếu cần thêm thông tin.
      </p>

      ${d.rejectionReason ? alertBox('Lý do', d.rejectionReason, '#f8fafc', '#475569', '#e2e8f0') : ''}

      <table style="width:100%;border-collapse:collapse;">
        ${infoRow('Ngày đi', d.tripDate)}
        ${infoRow('Giờ đón', d.pickupTime)}
        ${infoRow('Mục đích', d.purpose)}
        ${infoRow('Số lượng', `${d.passengerCount} người`)}
      </table>
    </div>
    ${footerNote('Nếu có thắc mắc, vui lòng liên hệ Phòng Tổng Hợp.')}`;

  return { subject, html: baseWrapper(body) };
}

// --- Template: Huỷ chuyến → Toàn bộ thành viên ---
export function buildCancellationEmail(d: BookingEmailData & { cancelledBy: string; cancellationReason: string; recipientName: string }): { subject: string; html: string } {
  const subject = `[Huỷ chuyến] ${d.purpose} — ${d.tripDate}`;

  const body = `
    ${headerBlock('Chuyến xe đã được huỷ', 'Phòng Tổng Hợp — Esuhai Group', '#dc2626')}
    <div style="background:#ffffff;padding:24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 20px;">
        Kính gửi ${d.recipientName},<br>
        Chuyến xe bên dưới đã được huỷ. Vui lòng xem lý do chi tiết.
      </p>

      ${alertBox('Lý do huỷ chuyến', d.cancellationReason, '#fef2f2', '#991b1b', '#fecaca')}

      <table style="width:100%;border-collapse:collapse;">
        ${infoRow('Mã yêu cầu', '#' + d.bookingId.slice(0, 8).toUpperCase())}
        ${infoRow('Ngày và giờ', `${d.tripDate} | ${d.pickupTime}`)}
        ${infoRow('Mục đích', d.purpose)}
        ${infoRow('Người yêu cầu', `${d.requesterName} — ${d.requesterDepartment}`)}
        ${d.driverName ? infoRow('Tài xế', d.driverName) : ''}
        ${d.vehicleType ? infoRow('Xe', `${d.vehicleType}${d.plateNumber ? ' — ' + d.plateNumber : ''}`) : ''}
        ${d.staffInCharge ? infoRow('NV phụ trách', d.staffInCharge) : ''}
      </table>

      <div style="margin:16px 0;padding:12px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;color:#9a3412;font-size:13px;">
        Người thực hiện huỷ: <strong>${d.cancelledBy}</strong>
      </div>
    </div>
    ${footerNote('Nếu có thắc mắc, vui lòng liên hệ Phòng Tổng Hợp.')}`;

  return { subject, html: baseWrapper(body) };
}

// --- Template: Không duyệt → Thông báo toàn bộ ---
export function buildRejectAllEmail(d: BookingEmailData & { recipientName: string }): { subject: string; html: string } {
  const subject = `[Không duyệt] ${d.purpose} — ${d.tripDate}`;

  const body = `
    ${headerBlock('Yêu cầu không được duyệt', 'Phòng Tổng Hợp — Esuhai Group', '#64748b')}
    <div style="background:#ffffff;padding:24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 20px;">
        Kính gửi ${d.recipientName},<br>
        Yêu cầu sử dụng xe bên dưới đã không được phê duyệt.
      </p>

      ${d.rejectionReason ? alertBox('Lý do không duyệt', d.rejectionReason, '#f8fafc', '#475569', '#e2e8f0') : ''}

      <table style="width:100%;border-collapse:collapse;">
        ${infoRow('Ngày đi', d.tripDate)}
        ${infoRow('Giờ đón', d.pickupTime)}
        ${infoRow('Mục đích', d.purpose)}
        ${infoRow('Người yêu cầu', `${d.requesterName} — ${d.requesterDepartment}`)}
        ${d.staffInCharge ? infoRow('NV phụ trách', d.staffInCharge) : ''}
      </table>
    </div>
    ${footerNote('Nếu có thắc mắc, vui lòng liên hệ Phòng Tổng Hợp.')}`;

  return { subject, html: baseWrapper(body) };
}
