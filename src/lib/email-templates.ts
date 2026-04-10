// ============================================================
// Email Templates V2.1 — Hybrid Design
// Xương V1 (table layout, Outlook-safe, split row, timeline)
// + Da Apple V2 (bo tròn, màu mềm, typography sạch)
// ============================================================

export interface BookingEmailData {
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
  requesterGender?: 'male' | 'female';
  staffInCharge?: string;
  flightNumber?: string;
  memberNames?: string;
  driverName?: string;
  driverPhone?: string;
  driverGender?: 'male' | 'female';
  vehicleType?: string;
  plateNumber?: string;
  rejectionReason?: string;
  dashboardUrl?: string;
  managerName?: string;
  managerGender?: 'male' | 'female';
}

// ============================================================
// XƯNG HÔ TIẾNG VIỆT
// "TRẦN HỒNG THƠ" + female → "chị Hồng Thơ"
// "NGUYỄN VĂN MINH" + male → "anh Minh"
// ============================================================

/**
 * Tách tên gọi từ họ tên đầy đủ kiểu Việt Nam.
 * - 3+ từ: bỏ họ (từ đầu), giữ đệm+tên → "Hồng Thơ"
 * - 2 từ: giữ tên → "Minh"
 * - 1 từ: giữ nguyên
 */
function extractGivenName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 3) return parts.slice(1).map(capitalizeVn).join(' ');
  if (parts.length === 2) return capitalizeVn(parts[1]);
  return capitalizeVn(parts[0]);
}

/** "THƠ" → "Thơ", "hồng" → "Hồng" */
function capitalizeVn(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Xưng hô đúng giới tính + tên gọi.
 * vnGreeting("TRẦN HỒNG THƠ", "female") → "chị Hồng Thơ"
 * vnGreeting("NGUYỄN VĂN MINH", "male")  → "anh Minh"
 * vnGreeting("NGUYỄN VĂN MINH")          → "anh/chị Minh"
 */
export function vnGreeting(fullName: string, gender?: 'male' | 'female'): string {
  const given = extractGivenName(fullName);
  const p = pronoun(gender);
  return given ? `${p} ${given}` : p;
}

/** "male" → "anh", "female" → "chị", undefined → "anh/chị" */
export function pronoun(gender?: 'male' | 'female'): string {
  if (gender === 'female') return 'chị';
  if (gender === 'male') return 'anh';
  return 'anh/chị';
}

// ============================================================
// SHARED CONSTANTS
// ============================================================

const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, Helvetica, sans-serif";
const FOOTER_ORG = 'PHÒNG TỔNG HỢP — ESUHAI GROUP';
const FOOTER_TAGLINE = 'Mỗi chuyến xe là một chuyến yêu thương';

function esc(str: string | undefined | null): string {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function bookingCode(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

// ============================================================
// BASE WRAPPER — Outlook-safe table structure + Apple softness
// ============================================================

function baseWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${F};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f1f5f9" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" align="center" style="max-width:600px;border-collapse:collapse;">
${content}
</table>
<!--[if mso]></td></tr></table><![endif]-->
<!-- Footer branding -->
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" align="center" style="max-width:600px;">
<tr><td align="center" style="padding:28px 0 8px;">
<p style="margin:0 0 4px;color:#94a3b8;font-size:12px;font-family:${F};font-weight:600;letter-spacing:0.5px;">${FOOTER_ORG}</p>
<p style="margin:0;color:#94a3b8;font-size:12px;font-style:italic;font-family:Georgia,serif;">&ldquo;${FOOTER_TAGLINE}&rdquo;</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ============================================================
// HEADER — Accent bar + rounded feel (graceful Outlook fallback)
// ============================================================

function headerBlock(title: string, subtitle: string, accentColor: string = '#2563eb'): string {
  return `
<!-- Header -->
<tr><td>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
<tr><td height="5" bgcolor="${accentColor}" style="background-color:${accentColor};border-radius:16px 16px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
</td></tr>
<tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff;padding:36px 40px 16px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<h1 style="margin:0 0 6px;color:#1e293b;font-size:20px;font-family:${F};font-weight:800;letter-spacing:0.5px;">${title}</h1>
<p style="margin:0;color:#64748b;font-size:13px;font-family:${F};font-weight:500;letter-spacing:0.8px;text-transform:uppercase;">${subtitle}</p>
</td></tr>`;
}

// ============================================================
// BOOKING CODE BADGE
// ============================================================

function badgeRow(id: string): string {
  const code = bookingCode(id);
  return `
<tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff;padding:8px 40px 4px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" border="0" cellspacing="0" cellpadding="0">
<tr><td style="background-color:#eff6ff;padding:6px 18px;border:1px solid #bfdbfe;border-radius:20px;font-family:${F};font-size:13px;color:#1e40af;font-weight:700;letter-spacing:1.5px;">#${code}</td></tr>
</table>
</td></tr>`;
}

// ============================================================
// GREETING ROW
// ============================================================

function greetingRow(greeting: string, intro: string): string {
  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:16px 40px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<p style="margin:0;color:#334155;font-size:15px;font-family:${F};line-height:1.7;">${greeting}</p>
<p style="margin:10px 0 0;color:#475569;font-size:15px;font-family:${F};line-height:1.7;">${intro}</p>
</td></tr>`;
}

// ============================================================
// SPLIT ROW — 2 cột (V1 style) with Apple softness
// ============================================================

function splitInfoCard(
  leftLabel: string, leftValue: string, leftSub: string,
  rightItems: { label: string; value: string }[],
  highlightColor: string = '#2563eb'
): string {
  let rightHtml = '';
  for (const item of rightItems) {
    rightHtml += `
    <div style="margin-bottom:14px;">
      <p style="margin:0 0 4px;font-family:${F};font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">${item.label}</p>
      <p style="margin:0;font-family:${F};font-size:15px;color:#1e293b;font-weight:600;line-height:1.4;">${item.value}</p>
    </div>`;
  }

  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;border-collapse:separate;">
<tr>
<!--[if mso]><td width="286" valign="top" style="padding:24px 20px;border-right:1px solid #e2e8f0;"><![endif]-->
<!--[if !mso]><!--><td width="55%" valign="top" style="padding:24px 20px;border-right:1px solid #e2e8f0;"><!--<![endif]-->
  <p style="margin:0 0 4px;font-family:${F};font-size:11px;color:${highlightColor};font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">${leftLabel}</p>
  <p style="margin:0;font-family:${F};font-size:28px;color:#0f172a;font-weight:700;line-height:1.2;">${leftValue}</p>
  <p style="margin:6px 0 0;font-family:${F};font-size:14px;color:#475569;font-weight:500;">${leftSub}</p>
</td>
<!--[if mso]><td width="234" valign="top" style="padding:24px 20px;"><![endif]-->
<!--[if !mso]><!--><td width="45%" valign="top" style="padding:24px 20px;"><!--<![endif]-->
  ${rightHtml}
</td>
</tr>
</table>
</td></tr>`;
}

// ============================================================
// TICKET DIVIDER — dashed line (V1 style)
// ============================================================

function ticketDivider(): string {
  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 50px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
<tr><td style="border-top:2px dashed #e2e8f0;font-size:0;line-height:0;padding:12px 0 0;" height="1">&nbsp;</td></tr>
</table>
</td></tr>`;
}

// ============================================================
// DETAIL ROWS — label/value trong card
// ============================================================

function detailSection(items: { label: string; value: string }[], bgColor: string = '#ffffff'): string {
  let rows = '';
  for (const item of items) {
    if (!item.value) continue;
    rows += `
    <tr>
      <td style="padding:10px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:130px;vertical-align:top;font-family:${F};">${item.label}</td>
      <td style="padding:10px 0;color:#1e293b;font-size:15px;font-family:${F};line-height:1.5;">${item.value}</td>
    </tr>`;
  }

  return `
<tr><td bgcolor="${bgColor}" style="background-color:${bgColor};padding:16px 40px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
${rows}
</table>
</td></tr>`;
}

// ============================================================
// BADGE — Phân loại (Đối tác / Nội bộ)
// ============================================================

function categoryBadge(category: string): string {
  if (category === 'Đối tác') {
    return `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="display:inline-table;"><tr><td style="background-color:#fdf4ff;color:#9333ea;font-size:11px;font-family:${F};font-weight:700;padding:4px 12px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #f3e8ff;border-radius:20px;">ĐỐI TÁC</td></tr></table>`;
  }
  return `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="display:inline-table;"><tr><td style="background-color:#f0fdf4;color:#15803d;font-size:11px;font-family:${F};font-weight:700;padding:4px 12px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #dcfce7;border-radius:20px;">${esc(category).toUpperCase()}</td></tr></table>`;
}

// ============================================================
// TIMELINE — Lộ trình di chuyển (V1 style, Apple colors)
// ============================================================

function timelineRow(itinerary: string): string {
  if (!itinerary) return '';
  const lines = esc(itinerary).replace(/\n/g, '<br>');
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(itinerary.replace(/\n/g, ' ').trim())}`;

  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 40px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<p style="margin:0 0 14px;font-size:12px;font-family:${F};font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.8px;">Lộ trình di chuyển</p>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
<tr>
<td width="20" valign="top" align="center">
<!-- Blue dot (start) -->
<table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr><td width="12" height="12" style="background-color:#3b82f6;border-radius:6px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
<!-- Dotted line -->
<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:4px auto;"><tr><td width="2" height="32" style="border-left:2px dotted #cbd5e1;font-size:0;line-height:0;">&nbsp;</td></tr></table>
<!-- Green dot (end) -->
<table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr><td width="12" height="12" style="background-color:#16a34a;border-radius:6px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td>
<td valign="top" style="padding-left:15px;">
<p style="margin:0;font-size:15px;font-family:${F};font-weight:600;color:#0f172a;line-height:1.7;">${lines}</p>
</td>
</tr>
</table>
<p style="margin:12px 0 0;"><a href="${mapsUrl}" style="color:#2563eb;font-size:12px;font-family:${F};text-decoration:none;font-weight:600;" target="_blank">Xem tr\u00ean Google Maps &#8594;</a></p>
</td></tr>`;
}

// ============================================================
// CTA BUTTON — VML for Outlook, rounded for Apple
// ============================================================

function ctaButtonRow(text: string, url: string, bgColor: string = '#2563eb'): string {
  return `
<tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff;padding:8px 40px 28px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:50px;v-text-anchor:middle;width:400px;" arcsize="12%" strokecolor="${bgColor}" fillcolor="${bgColor}"><w:anchorlock/><center style="color:#ffffff;font-family:${F};font-size:15px;font-weight:bold;">${text}</center></v:roundrect><![endif]-->
<!--[if !mso]><!-->
<a href="${url}" style="display:inline-block;background-color:${bgColor};color:#ffffff;padding:16px 36px;border-radius:12px;text-decoration:none;font-size:15px;font-family:${F};font-weight:700;">${text}</a>
<!--<![endif]-->
</td></tr>`;
}

function secondaryButtonRow(text: string, url: string): string {
  return `
<tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff;padding:0 40px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:400px;" arcsize="12%" strokecolor="#2563eb" fillcolor="#ffffff"><w:anchorlock/><center style="color:#2563eb;font-family:${F};font-size:14px;font-weight:bold;">${text}</center></v:roundrect><![endif]-->
<!--[if !mso]><!-->
<a href="${url}" style="display:inline-block;background:#ffffff;color:#2563eb;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;font-family:${F};font-weight:600;border:2px solid #2563eb;">${text}</a>
<!--<![endif]-->
</td></tr>`;
}

function linkRow(text: string, url: string): string {
  return `
<tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff;padding:0 40px 20px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<a href="${url}" style="color:#64748b;font-size:14px;font-family:${F};font-weight:500;text-decoration:none;border-bottom:1px solid #cbd5e1;padding-bottom:2px;">${text}</a>
</td></tr>`;
}

// ============================================================
// HIGHLIGHT CARD — Ngày giờ / Alert box (Outlook-safe)
// ============================================================

function dateHighlightCard(label: string, date: string, time: string, borderColor: string, labelColor: string): string {
  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 40px 20px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border:2px solid ${borderColor};border-radius:12px;border-collapse:separate;">
<tr><td align="center" style="padding:20px;">
<p style="margin:0 0 8px;color:${labelColor};font-size:12px;font-family:${F};font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">${label}</p>
<p style="margin:0;color:#0f172a;font-size:26px;font-family:${F};font-weight:800;">${date}</p>
<p style="margin:6px 0 0;color:${labelColor};font-size:18px;font-family:${F};font-weight:600;">${time}</p>
</td></tr>
</table>
</td></tr>`;
}

function alertBox(title: string, message: string, bgColor: string, textColor: string, borderColor: string): string {
  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 40px 16px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid ${borderColor};border-radius:12px;border-collapse:separate;">
<tr><td style="padding:16px 20px;background-color:${bgColor};border-radius:12px;">
<p style="margin:0 0 6px;color:${textColor};font-size:12px;font-family:${F};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${title}</p>
<p style="margin:0;color:${textColor};font-size:15px;font-family:${F};line-height:1.5;">${message}</p>
</td></tr>
</table>
</td></tr>`;
}

// ============================================================
// DRIVER CARD — Apple style (V2) + table safe (V1)
// ============================================================

function driverCardRow(name: string, phone: string, vehicle?: string, plate?: string): string {
  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 40px 16px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #bbf7d0;border-radius:12px;border-collapse:separate;">
<tr><td style="padding:20px;background-color:#f0fdf4;border-radius:12px;">
<p style="margin:0 0 8px;color:#15803d;font-size:12px;font-family:${F};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Tài xế phục vụ</p>
<p style="margin:0;color:#166534;font-size:18px;font-family:${F};font-weight:700;">${esc(name)}</p>
<p style="margin:6px 0 0;"><a href="tel:${phone.replace(/\s/g, '')}" style="color:#16a34a;font-size:15px;font-family:${F};text-decoration:underline;">${esc(phone)}</a></p>
${vehicle ? `<p style="margin:8px 0 0;color:#166534;font-size:14px;font-family:${F};">${esc(vehicle)}${plate ? ' — ' + esc(plate) : ''}</p>` : ''}
</td></tr>
</table>
</td></tr>`;
}

// ============================================================
// WAITING POLICY
// ============================================================

function waitingPolicyRow(): string {
  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 40px 20px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #fde68a;border-radius:8px;border-collapse:separate;">
<tr><td style="padding:12px 16px;background-color:#fffbeb;border-radius:8px;">
<p style="margin:0;color:#92400e;font-size:13px;font-family:${F};line-height:1.5;">Tài xế sẽ chờ tối đa 15 phút tại điểm đón. Nếu có thay đổi, vui lòng liên hệ tài xế trực tiếp.</p>
</td></tr>
</table>
</td></tr>`;
}

// ============================================================
// ADD TO CALENDAR — Google Calendar link
// ============================================================

function calendarButtonRow(title: string, date: string, startTime: string, endTime?: string, location?: string): string {
  const dateClean = date.replace(/-/g, '');
  const start = startTime.replace(':', '') + '00';
  const end = endTime ? endTime.replace(':', '') + '00' : start;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${dateClean}T${start}/${dateClean}T${end}`,
    details: `Chuyến xe Esuhai — ${title}`,
    location: location || 'Văn phòng Esuhai',
    ctz: 'Asia/Ho_Chi_Minh',
  });
  const url = `https://calendar.google.com/calendar/render?${params.toString()}`;

  return secondaryButtonRow('Thêm vào Lịch (Google Calendar)', url);
}

// ============================================================
// FOOTER NOTE
// ============================================================

function footerRow(text: string, bookingId?: string): string {
  return `
<tr><td style="padding:20px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;border-radius:0 0 16px 16px;">
<p style="margin:0;color:#94a3b8;font-size:13px;font-family:${F};line-height:1.6;text-align:center;">${text}</p>
${bookingId ? `<p style="margin:8px 0 0;color:#cbd5e1;font-size:11px;font-family:${F};text-align:center;letter-spacing:0.3px;">Thư tự động — Mã: #${bookingCode(bookingId)}</p>` : ''}
</td></tr>`;
}

// ============================================================
// TEMPLATE 1: YÊU CẦU MỚI → QUẢN LÝ
// ============================================================

export function buildNewBookingEmail(d: BookingEmailData): { subject: string; html: string } {
  const subject = `[Yêu cầu xe mới] ${d.purpose} — ${d.tripDate}`;
  const mgr = d.managerName || 'chị';
  const timeStr = `${d.pickupTime}${d.endTime ? ' — ' + d.endTime : ''}`;

  const content = [
    headerBlock('Yêu cầu sử dụng xe mới', 'Phòng Tổng Hợp — Esuhai Group'),
    badgeRow(d.bookingId),
    greetingRow(
      `Kính gửi ${vnGreeting(mgr, d.managerGender)},`,
      'Hệ thống vừa tiếp nhận một yêu cầu sử dụng xe mới. Vui lòng xem xét và phân bổ tài xế phù hợp.'
    ),
    splitInfoCard(
      'Ngày và giờ đón', timeStr, d.tripDate,
      [
        { label: 'Phân loại', value: categoryBadge(d.category) },
        { label: 'Số lượng', value: `${d.passengerCount} người` },
        { label: 'NV phụ trách', value: d.staffInCharge ? `<span style="color:#3b82f6;">${esc(d.staffInCharge)}</span>` : '—' },
      ]
    ),
    ticketDivider(),
    detailSection([
      { label: 'Người yêu cầu', value: `${esc(d.requesterName)} <span style="font-size:12px;color:#64748b;background:#f1f5f9;padding:3px 8px;border-radius:4px;margin-left:6px;">${esc(d.requesterDepartment)}</span>` },
      { label: 'Mục đích', value: esc(d.purpose) },
      { label: 'Chuyến bay', value: d.flightNumber ? `<strong>${esc(d.flightNumber)}</strong>` : '' },
      { label: 'Thành viên', value: d.memberNames ? esc(d.memberNames) : '' },
    ]),
    d.itinerary ? timelineRow(d.itinerary) : '',
    d.dashboardUrl ? ctaButtonRow('Mở bảng điều phối', d.dashboardUrl) : '',
    footerRow('Vui lòng phân bổ tài xế và xe sớm nhất có thể.', d.bookingId),
  ].join('');

  return { subject, html: baseWrapper(content) };
}

// ============================================================
// TEMPLATE 2: PHÂN CÔNG → TÀI XẾ
// ============================================================

export function buildDriverAssignEmail(d: BookingEmailData & { confirmUrl: string; rejectUrl: string }): { subject: string; html: string } {
  const subject = `[Phân công xe] ${d.tripDate} — ${d.purpose}`;
  const timeStr = `${d.pickupTime}${d.endTime ? ' — ' + d.endTime : ''}`;

  const content = [
    headerBlock('Phân công phục vụ chuyến xe', 'Ban Điều Phối — Esuhai Group'),
    badgeRow(d.bookingId),
    greetingRow(
      `Kính gửi ${vnGreeting(d.driverName || '', d.driverGender)},`,
      `Ban Điều Phối phân công ${pronoun(d.driverGender)} phục vụ chuyến xe theo thông tin bên dưới. Vui lòng kiểm tra lộ trình và xác nhận để hoàn tất quy trình.`
    ),
    dateHighlightCard('Ngày và giờ đón', d.tripDate, timeStr, '#3b82f6', '#1d4ed8'),
    detailSection([
      { label: 'Mục đích', value: esc(d.purpose) },
      { label: 'Số lượng', value: `${d.passengerCount} người` },
      { label: 'Xe phân bổ', value: d.vehicleType ? `<strong>${esc(d.vehicleType)}</strong>${d.plateNumber ? ' — ' + esc(d.plateNumber) : ''}` : '' },
      { label: 'NV phụ trách', value: d.staffInCharge ? `<span style="color:#3b82f6;">${esc(d.staffInCharge)}</span>` : '' },
      { label: 'Chuyến bay', value: d.flightNumber ? `<strong>${esc(d.flightNumber)}</strong>` : '' },
      { label: 'Thành viên', value: d.memberNames ? esc(d.memberNames) : '' },
    ]),
    d.itinerary ? timelineRow(d.itinerary) : '',
    ctaButtonRow('Xác nhận nhận ca', d.confirmUrl, '#16a34a'),
    linkRow('Từ chối — ghi lý do', d.rejectUrl),
    calendarButtonRow(d.purpose, d.tripDate, d.pickupTime, d.endTime, d.itinerary),
    footerRow('Nếu xác nhận, thông tin sẽ được gửi đến người yêu cầu và nhân viên phụ trách. Nếu có trở ngại, vui lòng phản hồi sớm để Ban Điều Phối kịp thời xử lý.', d.bookingId),
  ].join('');

  return { subject, html: baseWrapper(content) };
}

// ============================================================
// TEMPLATE 3: XÁC NHẬN → NGƯỜI YÊU CẦU
// ============================================================

export function buildConfirmBookerEmail(d: BookingEmailData): { subject: string; html: string } {
  const subject = `[Xe đã sẵn sàng] ${d.purpose} — ${d.tripDate}`;
  const timeStr = `${d.pickupTime}${d.endTime ? ' — ' + d.endTime : ''}`;

  const content = [
    headerBlock('Chuyến xe đã được xác nhận', 'Xe đã phân bổ & Sẵn sàng', '#16a34a'),
    badgeRow(d.bookingId),
    greetingRow(
      `Kính gửi ${vnGreeting(d.requesterName, d.requesterGender)},`,
      `Yêu cầu sử dụng xe của ${pronoun(d.requesterGender)} đã được phê duyệt và tài xế đã xác nhận nhận ca. Dưới đây là thông tin chi tiết để ${pronoun(d.requesterGender)} chủ động liên hệ khi cần.`
    ),
    dateHighlightCard('Lịch đón xác nhận', d.tripDate, timeStr, '#22c55e', '#15803d'),
    detailSection([
      { label: 'Mục đích', value: esc(d.purpose) },
      { label: 'Số lượng', value: `${d.passengerCount} người` },
      { label: 'Chuyến bay', value: d.flightNumber ? `<strong>${esc(d.flightNumber)}</strong>` : '' },
    ]),
    d.itinerary ? timelineRow(d.itinerary) : '',
    d.driverName && d.driverPhone ? driverCardRow(d.driverName, d.driverPhone, d.vehicleType, d.plateNumber) : '',
    d.driverPhone ? ctaButtonRow(`Gọi Tài Xế: ${d.driverPhone}`, `tel:${d.driverPhone.replace(/\s/g, '')}`, '#16a34a') : '',
    calendarButtonRow(d.purpose, d.tripDate, d.pickupTime, d.endTime, d.itinerary),
    waitingPolicyRow(),
    footerRow('Nếu có thay đổi lịch trình, vui lòng liên hệ Phòng Tổng Hợp sớm nhất có thể.', d.bookingId),
  ].join('');

  return { subject, html: baseWrapper(content) };
}

// ============================================================
// TEMPLATE 4: TX TỪ CHỐI → QUẢN LÝ
// ============================================================

export function buildDriverRejectEmail(d: BookingEmailData): { subject: string; html: string } {
  const subject = `[Cần phân bổ lại] #${bookingCode(d.bookingId)} — ${d.purpose}`;

  const content = [
    headerBlock('Cần phân bổ tài xế khác', 'Yêu Cầu Thay Đổi Phân Bổ', '#dc2626'),
    badgeRow(d.bookingId),
    greetingRow(
      `Kính gửi ${vnGreeting(d.managerName || '', d.managerGender)},`,
      `Tài xế ${esc(d.driverName)} không nhận ca cho yêu cầu bên dưới. Vui lòng phân bổ tài xế khác sớm nhất có thể để đảm bảo phục vụ đúng lịch.`
    ),
    d.rejectionReason ? alertBox('Lý do từ chối', esc(d.rejectionReason), '#fef2f2', '#991b1b', '#fecaca') : '',
    detailSection([
      { label: 'Ngày và giờ', value: `${d.tripDate} | ${d.pickupTime}` },
      { label: 'Mục đích', value: esc(d.purpose) },
      { label: 'TX từ chối', value: esc(d.driverName) || '—' },
    ]),
    d.dashboardUrl ? ctaButtonRow('Mở bảng điều phối — phân bổ lại', d.dashboardUrl, '#dc2626') : '',
    footerRow('Vui lòng phân bổ lại ngay để đảm bảo lịch di chuyển.', d.bookingId),
  ].join('');

  return { subject, html: baseWrapper(content) };
}

// ============================================================
// TEMPLATE 5: KHÔNG DUYỆT → NGƯỜI YÊU CẦU
// ============================================================

export function buildRejectBookerEmail(d: BookingEmailData): { subject: string; html: string } {
  const subject = `[Không duyệt] ${d.purpose} — ${d.tripDate}`;

  const content = [
    headerBlock('Yêu cầu không được duyệt', 'Phòng Tổng Hợp — Esuhai Group', '#64748b'),
    badgeRow(d.bookingId),
    greetingRow(
      `Kính gửi ${vnGreeting(d.requesterName, d.requesterGender)},`,
      'Yêu cầu sử dụng xe bên dưới đã không được phê duyệt. Vui lòng liên hệ Phòng Tổng Hợp nếu cần thêm thông tin.'
    ),
    d.rejectionReason ? alertBox('Lý do', esc(d.rejectionReason), '#f8fafc', '#475569', '#e2e8f0') : '',
    detailSection([
      { label: 'Ngày đi', value: d.tripDate },
      { label: 'Giờ đón', value: d.pickupTime },
      { label: 'Mục đích', value: esc(d.purpose) },
      { label: 'Số lượng', value: `${d.passengerCount} người` },
    ]),
    footerRow('Nếu có thắc mắc, vui lòng liên hệ Phòng Tổng Hợp.', d.bookingId),
  ].join('');

  return { subject, html: baseWrapper(content) };
}

// ============================================================
// TEMPLATE 6: HUỶ CHUYẾN → TOÀN BỘ
// ============================================================

export function buildCancellationEmail(d: BookingEmailData & { cancelledBy: string; cancellationReason: string; recipientName: string; recipientGender?: 'male' | 'female' }): { subject: string; html: string } {
  const subject = `[Huỷ chuyến] ${d.purpose} — ${d.tripDate}`;

  const content = [
    headerBlock('Chuyến xe đã được huỷ', 'Phòng Tổng Hợp — Esuhai Group', '#dc2626'),
    badgeRow(d.bookingId),
    greetingRow(
      `Kính gửi ${vnGreeting(d.recipientName, d.recipientGender)},`,
      'Chuyến xe bên dưới đã được huỷ. Vui lòng xem lý do chi tiết.'
    ),
    alertBox('Lý do huỷ chuyến', esc(d.cancellationReason), '#fef2f2', '#991b1b', '#fecaca'),
    detailSection([
      { label: 'Ngày và giờ', value: `${d.tripDate} | ${d.pickupTime}` },
      { label: 'Mục đích', value: esc(d.purpose) },
      { label: 'Người yêu cầu', value: `${esc(d.requesterName)} — ${esc(d.requesterDepartment)}` },
      { label: 'Tài xế', value: d.driverName ? esc(d.driverName) : '' },
      { label: 'Xe', value: d.vehicleType ? `${esc(d.vehicleType)}${d.plateNumber ? ' — ' + esc(d.plateNumber) : ''}` : '' },
      { label: 'NV phụ trách', value: d.staffInCharge ? esc(d.staffInCharge) : '' },
    ]),
    alertBox('Người thực hiện huỷ', esc(d.cancelledBy), '#fff7ed', '#9a3412', '#fed7aa'),
    footerRow('Nếu có thắc mắc, vui lòng liên hệ Phòng Tổng Hợp.', d.bookingId),
  ].join('');

  return { subject, html: baseWrapper(content) };
}

// ============================================================
// TEMPLATE 7: KHÔNG DUYỆT → TOÀN BỘ
// ============================================================

export function buildRejectAllEmail(d: BookingEmailData & { recipientName: string; recipientGender?: 'male' | 'female' }): { subject: string; html: string } {
  const subject = `[Không duyệt] ${d.purpose} — ${d.tripDate}`;

  const content = [
    headerBlock('Yêu cầu không được duyệt', 'Phòng Tổng Hợp — Esuhai Group', '#64748b'),
    badgeRow(d.bookingId),
    greetingRow(
      `Kính gửi ${vnGreeting(d.recipientName, d.recipientGender)},`,
      'Yêu cầu sử dụng xe bên dưới đã không được phê duyệt.'
    ),
    d.rejectionReason ? alertBox('Lý do không duyệt', esc(d.rejectionReason), '#f8fafc', '#475569', '#e2e8f0') : '',
    detailSection([
      { label: 'Ngày đi', value: d.tripDate },
      { label: 'Giờ đón', value: d.pickupTime },
      { label: 'Mục đích', value: esc(d.purpose) },
      { label: 'Người yêu cầu', value: `${esc(d.requesterName)} — ${esc(d.requesterDepartment)}` },
      { label: 'NV phụ trách', value: d.staffInCharge ? esc(d.staffInCharge) : '' },
    ]),
    footerRow('Nếu có thắc mắc, vui lòng liên hệ Phòng Tổng Hợp.', d.bookingId),
  ].join('');

  return { subject, html: baseWrapper(content) };
}
