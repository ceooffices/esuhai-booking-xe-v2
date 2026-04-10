// ============================================================
// Email Templates V2.2 — Perfect 10 Design + Content Bible
//
// Tuân thủ:
// - CONTENT_BIBLE.md: văn phong, thuật ngữ, 4 bước quy trình
// - perfect_10_email_design.md: table layout, split row, ticket
//   divider, timeline, badge, VML button (Outlook-safe)
// - Không emoji trong email (Content Bible §I)
// - Xưng hô đúng giới tính: vnGreeting()
// - Thanh tiến trình 4 bước trong MỌI template
//
// Templates:
// 0. buildFormInviteEmail     — Gửi form đăng ký cho nhân viên
// 1. buildNewBookingEmail     — Yêu cầu mới → Quản lý
// 2. buildDriverAssignEmail   — Phân công → Tài xế
// 3. buildConfirmBookerEmail  — Xác nhận → Người yêu cầu
// 4. buildConfirmStaffEmail   — Thông tin → NV phụ trách
// 5. buildConfirmManagerEmail — Hoàn tất → Quản lý
// 6. buildDriverRejectEmail   — Tài xế từ chối → Quản lý
// 7. buildRejectBookerEmail   — Không duyệt → Người yêu cầu
// 8. buildCancellationEmail   — Huỷ chuyến → Toàn bộ
// 9. buildRejectAllEmail      — Không duyệt → Toàn bộ
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
  staffInChargePhone?: string;
  staffInChargeGender?: 'male' | 'female';
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
// ============================================================

/**
 * Tách tên gọi từ họ tên đầy đủ kiểu Việt Nam.
 * Luôn lấy 2 từ cuối. Nếu từ đầu là "Thị" → dùng đầy đủ họ tên.
 *
 * "TRẦN HỒNG THƠ"        → "Hồng Thơ"
 * "NGUYỄN VĂN MINH"      → "Văn Minh"
 * "LÊ THỊ THÚY HÀ"       → "Thúy Hà" (4 từ, lấy 2 cuối)
 * "NGUYỄN THỊ NGỌC"       → "Nguyễn Thị Ngọc" (2 cuối = "Thị Ngọc" → Thị rule → full)
 * "Minh"                  → "Minh"
 */
function extractGivenName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/).map(capitalizeVn);
  if (parts.length <= 1) return parts[0] || '';
  // Lấy 2 từ cuối
  const last2 = parts.slice(-2);
  // Nếu từ đầu tiên trong 2 từ cuối là "Thị" → dùng đầy đủ họ tên
  if (last2[0].toLowerCase() === 'thị') return parts.join(' ');
  return last2.join(' ');
}

function capitalizeVn(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function vnGreeting(fullName: string, gender?: 'male' | 'female'): string {
  const given = extractGivenName(fullName);
  const p = pronoun(gender);
  return given ? `${p} ${given}` : p;
}

export function pronoun(gender?: 'male' | 'female'): string {
  if (gender === 'female') return 'chị';
  if (gender === 'male') return 'anh';
  return 'anh/chị';
}

// ============================================================
// SHARED CONSTANTS — Perfect 10 palette
// ============================================================

const F = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
const BLUE = '#2563eb';
const GREEN = '#16a34a';
const RED = '#dc2626';
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
// BASE WRAPPER
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
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:${F};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f8fafc">
<tr><td align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" align="center" style="max-width:600px;border-collapse:collapse;">
${content}
</table>
<!--[if mso]></td></tr></table><![endif]-->
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
// HEADER — Accent bar + title
// ============================================================

function headerBlock(title: string, subtitle: string, accentColor: string = BLUE): string {
  return `
<tr><td>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
<tr><td height="5" bgcolor="${accentColor}" style="background-color:${accentColor};font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
</td></tr>
<tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff;padding:36px 40px 16px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<h1 style="margin:0 0 6px;color:#0f172a;font-size:19px;font-family:${F};font-weight:800;letter-spacing:0.5px;text-transform:uppercase;">${title}</h1>
<p style="margin:0;color:#64748b;font-size:13px;font-family:${F};font-weight:500;letter-spacing:0.8px;text-transform:uppercase;">${subtitle}</p>
</td></tr>`;
}

// ============================================================
// PROCESS BAR — 4 bước (Content Bible §IV)
// ============================================================

// 5 bước theo Flow Book Xe.pdf:
// 1. Tiếp nhận → 2. Phân bổ → 3. Xác nhận → 4. Phục vụ → 5. Hoàn thành
const STEPS = ['Tiếp nhận', 'Phân bổ', 'Xác nhận', 'Phục vụ', 'Hoàn thành'];
const STEP_COUNT = STEPS.length;

function processBar(activeStep: number): string {
  let html = '';
  for (let i = 0; i < STEP_COUNT; i++) {
    const isDone = i < activeStep;
    const isActive = i === activeStep;

    let circleStyle: string;
    let labelColor: string;
    let labelWeight = '500';

    if (isDone) {
      circleStyle = `width:22px;height:22px;background-color:${GREEN};color:#fff;font-size:11px;font-family:${F};font-weight:700;text-align:center;line-height:22px;border-radius:11px;`;
      labelColor = '#15803d';
    } else if (isActive) {
      circleStyle = `width:22px;height:22px;background-color:${BLUE};color:#fff;font-size:11px;font-family:${F};font-weight:700;text-align:center;line-height:22px;border-radius:11px;`;
      labelColor = BLUE;
      labelWeight = '700';
    } else {
      circleStyle = `width:22px;height:22px;background-color:#e2e8f0;color:#94a3b8;font-size:11px;font-family:${F};font-weight:600;text-align:center;line-height:22px;border-radius:11px;`;
      labelColor = '#94a3b8';
    }

    const circleContent = isDone ? '&#10003;' : String(i + 1);
    const lineColor = isDone ? GREEN : '#e2e8f0';

    // Connector line before step (except first)
    if (i > 0) {
      html += `<!--[if mso]><td width="30" valign="middle"><![endif]--><!--[if !mso]><!--><td valign="middle" style="padding:0;"><!--<![endif]-->
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td height="2" bgcolor="${lineColor}" style="font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td>`;
    }

    html += `<td width="20%" align="center" valign="top" style="padding:0;">
<div style="${circleStyle}">${circleContent}</div>
<p style="margin:5px 0 0;font-size:9px;font-family:${F};color:${labelColor};font-weight:${labelWeight};line-height:1.2;text-align:center;white-space:nowrap;">${STEPS[i]}</p>
</td>`;
  }

  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:16px 20px 20px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
<tr>${html}</tr>
</table>
</td></tr>`;
}

// ============================================================
// BOOKING CODE BADGE
// ============================================================

function badgeRow(id: string): string {
  return `
<tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff;padding:8px 40px 4px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" border="0" cellspacing="0" cellpadding="0">
<tr><td style="background-color:#eff6ff;padding:6px 18px;border:1px solid #bfdbfe;font-family:${F};font-size:13px;color:#1e40af;font-weight:700;letter-spacing:1.5px;">#${bookingCode(id)}</td></tr>
</table>
</td></tr>`;
}

// ============================================================
// GREETING
// ============================================================

function greetingRow(greeting: string, intro: string): string {
  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:16px 40px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<p style="margin:0;color:#334155;font-size:15px;font-family:${F};line-height:1.7;">${greeting}</p>
<p style="margin:10px 0 0;color:#475569;font-size:15px;font-family:${F};line-height:1.7;">${intro}</p>
</td></tr>`;
}

// ============================================================
// SPLIT ROW — 2 cột (Perfect 10 §3.1)
// ============================================================

function splitInfoCard(
  leftLabel: string, leftValue: string, leftSub: string,
  rightItems: { label: string; value: string }[],
  highlightColor: string = BLUE
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
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;border-collapse:separate;overflow:hidden;">
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
// TICKET DIVIDER (Perfect 10 §3.3)
// ============================================================

function ticketDivider(): string {
  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 50px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
<tr><td style="border-top:2px dashed #cbd5e1;font-size:0;line-height:0;padding:12px 0 0;" height="1">&nbsp;</td></tr>
</table>
</td></tr>`;
}

// ============================================================
// DETAIL SECTION — label/value rows
// ============================================================

function detailSection(items: { label: string; value: string }[], bgColor: string = '#ffffff'): string {
  let rows = '';
  const validItems = items.filter(item => item.value);
  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    const borderBottom = i < validItems.length - 1 ? 'border-bottom:1px solid #f1f5f9;' : '';
    rows += `
    <tr>
      <td style="padding:12px 16px;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;width:120px;vertical-align:top;font-family:${F};${borderBottom}">${item.label}</td>
      <td style="padding:12px 16px;color:#1e293b;font-size:15px;font-family:${F};font-weight:600;line-height:1.4;${borderBottom}">${item.value}</td>
    </tr>`;
  }
  return `
<tr><td bgcolor="${bgColor}" style="background-color:${bgColor};padding:0 40px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;border-collapse:separate;overflow:hidden;">${rows}</table>
</td></tr>`;
}

// ============================================================
// BADGE — Phân loại (Perfect 10 §3.4)
// ============================================================

function categoryBadge(category: string): string {
  if (category === 'Đối tác') {
    return `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="display:inline-table;"><tr><td style="background-color:#fdf4ff;color:#9333ea;font-size:11px;font-family:${F};font-weight:700;padding:3px 10px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #f3e8ff;">ĐỐI TÁC</td></tr></table>`;
  }
  return `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="display:inline-table;"><tr><td style="background-color:#f0fdf4;color:#15803d;font-size:11px;font-family:${F};font-weight:700;padding:3px 10px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #dcfce7;">${esc(category).toUpperCase()}</td></tr></table>`;
}

// ============================================================
// TIMELINE — Lộ trình (Perfect 10 §3.5)
// ============================================================

/**
 * Parse lịch trình text tự do thành các điểm dừng.
 * Nhận diện: →, >, -, -->, >>, \n, và nếu không có separator → trả nguyên 1 node.
 */
function parseStops(itinerary: string): string[] {
  if (!itinerary) return [];
  // Thử tách theo các separator phổ biến (ưu tiên dài trước)
  const separators = /\s*(?:-->|→|>>|->|>|\|)\s*/;
  const parts = itinerary.split(separators).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  // Thử tách bằng newline
  const byLine = itinerary.split(/\n+/).map(s => s.trim()).filter(Boolean);
  if (byLine.length > 1) return byLine;
  // Trả nguyên
  return [itinerary.trim()];
}

function timelineRow(itinerary: string): string {
  if (!itinerary) return '';
  const stops = parseStops(itinerary);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(itinerary.replace(/\n/g, ' ').trim())}`;

  let nodesHtml = '';
  for (let i = 0; i < stops.length; i++) {
    const isFirst = i === 0;
    const isLast = i === stops.length - 1;
    const dotColor = isLast && stops.length > 1 ? GREEN : '#3b82f6';
    const dotSize = isFirst || isLast ? '12' : '8';
    const dotBorder = isFirst ? `background:#fff;border:3px solid ${BLUE};` : `background-color:${dotColor};border:2px solid #fff;`;

    // Dotted line before node (except first)
    const line = !isFirst
      ? `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto;"><tr><td width="2" height="20" style="border-left:2px dotted #cbd5e1;font-size:0;line-height:0;">&nbsp;</td></tr></table>`
      : '';

    nodesHtml += `
    <tr>
      <td width="24" align="center" valign="middle" style="padding:0;">
        ${line}
        <table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr><td width="${dotSize}" height="${dotSize}" style="${dotBorder}border-radius:50%;font-size:0;line-height:0;">&nbsp;</td></tr></table>
      </td>
      <td valign="middle" style="padding:${isFirst ? '0' : '4px'} 0 0 12px;">
        <p style="margin:0;font-size:14px;font-family:${F};font-weight:${isFirst || isLast ? '600' : '500'};color:${isFirst || isLast ? '#0f172a' : '#475569'};line-height:1.4;">${esc(stops[i])}</p>
      </td>
    </tr>`;
  }

  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 40px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;border-collapse:separate;">
<tr><td style="padding:16px 20px;">
<p style="margin:0 0 12px;font-size:11px;font-family:${F};font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;">Lộ trình di chuyển</p>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
${nodesHtml}
</table>
<p style="margin:14px 0 0;"><a href="${mapsUrl}" style="color:${BLUE};font-size:12px;font-family:${F};text-decoration:none;font-weight:600;" target="_blank">Xem tr\u00ean Google Maps &#8594;</a></p>
</td></tr>
</table>
</td></tr>`;
}

// ============================================================
// CTA BUTTONS — VML for Outlook (Perfect 10 §3.6)
// ============================================================

function ctaButtonRow(text: string, url: string, bgColor: string = BLUE): string {
  return `
<tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff;padding:8px 40px 28px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:50px;v-text-anchor:middle;width:400px;" arcsize="10%" strokecolor="${bgColor}" fillcolor="${bgColor}"><w:anchorlock/><center style="color:#ffffff;font-family:${F};font-size:15px;font-weight:bold;">${text}</center></v:roundrect><![endif]-->
<!--[if !mso]><!-->
<a href="${url}" style="display:inline-block;background-color:${bgColor};color:#ffffff;padding:16px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-family:${F};font-weight:600;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">${text}</a>
<!--<![endif]-->
</td></tr>`;
}

function secondaryButtonRow(text: string, url: string): string {
  return `
<tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff;padding:0 40px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:400px;" arcsize="10%" strokecolor="${BLUE}" fillcolor="#ffffff"><w:anchorlock/><center style="color:${BLUE};font-family:${F};font-size:14px;font-weight:bold;">${text}</center></v:roundrect><![endif]-->
<!--[if !mso]><!-->
<a href="${url}" style="display:inline-block;background:#ffffff;color:${BLUE};padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;font-family:${F};font-weight:600;border:2px solid ${BLUE};">${text}</a>
<!--<![endif]-->
</td></tr>`;
}

function linkRow(text: string, url: string): string {
  return `
<tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff;padding:0 40px 20px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<a href="${url}" style="color:#64748b;font-size:14px;font-family:${F};font-weight:500;text-decoration:none;border-bottom:1px solid #cbd5e1;padding-bottom:2px;">${text}</a>
</td></tr>`;
}

// Dual action: Xác nhận (xanh lá) + Từ chối (đỏ viền) — ngang hàng
function dualActionRow(confirmUrl: string, rejectUrl: string): string {
  return `
<tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff;padding:8px 40px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
<tr>
<!--[if mso]><td width="270" align="center" valign="middle" style="padding-right:8px;"><![endif]-->
<!--[if !mso]><!--><td width="50%" align="center" valign="middle" style="padding-right:8px;"><!--<![endif]-->
<a href="${confirmUrl}" style="display:block;background-color:${GREEN};color:#ffffff;padding:16px 12px;border-radius:10px;text-decoration:none;font-size:15px;font-family:${F};font-weight:700;text-align:center;box-shadow:0 2px 6px rgba(22,163,106,0.3);">Xác nhận nhận ca</a>
</td>
<!--[if mso]><td width="270" align="center" valign="middle" style="padding-left:8px;"><![endif]-->
<!--[if !mso]><!--><td width="50%" align="center" valign="middle" style="padding-left:8px;"><!--<![endif]-->
<a href="${rejectUrl}" style="display:block;background:#ffffff;color:${RED};padding:14px 12px;border-radius:10px;text-decoration:none;font-size:15px;font-family:${F};font-weight:600;text-align:center;border:2px solid ${RED};">Từ chối</a>
</td>
</tr>
</table>
</td></tr>`;
}

// Calendar link nhỏ gọn với icon
function calendarInlineRow(title: string, date: string, startTime: string, endTime?: string, location?: string): string {
  const dateClean = date.replace(/-/g, '');
  const start = startTime.replace(':', '') + '00';
  const end = endTime ? endTime.replace(':', '') + '00' : start;
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: title,
    dates: `${dateClean}T${start}/${dateClean}T${end}`,
    details: `Chuyến xe Esuhai — ${title}`,
    location: location || 'Văn phòng Esuhai', ctz: 'Asia/Ho_Chi_Minh',
  });
  const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
  return `
<tr><td bgcolor="#ffffff" align="center" style="background-color:#ffffff;padding:0 40px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<a href="${url}" style="color:#64748b;font-size:13px;font-family:${F};font-weight:500;text-decoration:none;" target="_blank">
&#128197;&nbsp;&nbsp;Thêm vào Google Calendar
</a>
</td></tr>`;
}

// ============================================================
// HIGHLIGHT CARD — Date/Time, Alert, Success, Driver
// ============================================================

function dateHighlightCard(label: string, date: string, time: string, borderColor: string, labelColor: string): string {
  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 40px 20px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border:2px solid ${borderColor};border-collapse:separate;">
<tr><td align="center" style="padding:20px;">
<p style="margin:0 0 8px;color:${labelColor};font-size:11px;font-family:${F};font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">${label}</p>
<p style="margin:0;color:#0f172a;font-size:26px;font-family:${F};font-weight:700;">${date}</p>
<p style="margin:6px 0 0;color:${labelColor};font-size:18px;font-family:${F};font-weight:600;">${time}</p>
</td></tr>
</table>
</td></tr>`;
}

function alertBox(title: string, message: string, bgColor: string, textColor: string, borderColor: string): string {
  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 40px 16px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid ${borderColor};border-collapse:separate;">
<tr><td style="padding:16px 20px;background-color:${bgColor};">
<p style="margin:0 0 6px;color:${textColor};font-size:11px;font-family:${F};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${title}</p>
<p style="margin:0;color:${textColor};font-size:15px;font-family:${F};line-height:1.5;">${message}</p>
</td></tr>
</table>
</td></tr>`;
}

function successBox(text: string): string {
  return alertBox('Trạng thái', text, '#f0fdf4', '#15803d', '#bbf7d0');
}

function driverCardRow(name: string, phone: string, vehicle?: string, plate?: string): string {
  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 40px 16px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #bbf7d0;border-collapse:separate;">
<tr><td style="padding:20px;background-color:#f0fdf4;">
<p style="margin:0 0 8px;color:#15803d;font-size:11px;font-family:${F};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Tài xế phục vụ</p>
<p style="margin:0;color:#166534;font-size:18px;font-family:${F};font-weight:700;">${esc(name)}</p>
<p style="margin:6px 0 0;"><a href="tel:${phone.replace(/\s/g, '')}" style="color:${GREEN};font-size:15px;font-family:${F};text-decoration:underline;">${esc(phone)}</a></p>
${vehicle ? `<p style="margin:8px 0 0;color:#166534;font-size:14px;font-family:${F};">${esc(vehicle)}${plate ? ' — ' + esc(plate) : ''}</p>` : ''}
</td></tr>
</table>
</td></tr>`;
}

function waitingPolicyRow(): string {
  return `
<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 40px 20px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #fde68a;border-collapse:separate;">
<tr><td style="padding:12px 16px;background-color:#fffbeb;">
<p style="margin:0;color:#92400e;font-size:13px;font-family:${F};line-height:1.5;">Tài xế sẽ chờ tối đa 15 phút tại điểm đón. Nếu có thay đổi, vui lòng liên hệ tài xế trực tiếp.</p>
</td></tr>
</table>
</td></tr>`;
}

// ============================================================
// ADD TO CALENDAR
// ============================================================

function calendarButtonRow(title: string, date: string, startTime: string, endTime?: string, location?: string): string {
  const dateClean = date.replace(/-/g, '');
  const start = startTime.replace(':', '') + '00';
  const end = endTime ? endTime.replace(':', '') + '00' : start;
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: title,
    dates: `${dateClean}T${start}/${dateClean}T${end}`,
    details: `Chuyến xe Esuhai — ${title}`,
    location: location || 'Văn phòng Esuhai', ctz: 'Asia/Ho_Chi_Minh',
  });
  return secondaryButtonRow('Thêm vào Lịch (Google Calendar)', `https://calendar.google.com/calendar/render?${params.toString()}`);
}

// ============================================================
// FOOTER
// ============================================================

function footerRow(text: string, bookingId?: string): string {
  return `
<tr><td style="padding:20px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
<p style="margin:0;color:#94a3b8;font-size:13px;font-family:${F};line-height:1.6;text-align:center;">${text}</p>
${bookingId ? `<p style="margin:8px 0 0;color:#cbd5e1;font-size:11px;font-family:${F};text-align:center;font-style:italic;">Thư tự động từ hệ thống quản lý Vận Hành Ô Tô Esuhai. Mã: #${bookingCode(bookingId)}</p>` : ''}
</td></tr>`;
}

// ============================================================
// TEMPLATE 0: GỬI FORM ĐĂNG KÝ → NHÂN VIÊN
// ============================================================

export function buildFormInviteEmail(d: { recipientName: string; recipientGender?: 'male' | 'female'; formUrl: string; dashboardUrl: string }): { subject: string; html: string } {
  const subject = '[Hệ thống Đăng ký Xe] Hướng dẫn sử dụng — Phòng Tổng Hợp Esuhai Group';
  const greeting = vnGreeting(d.recipientName, d.recipientGender);

  const stepsHtml = [
    { num: '1', title: 'Gửi yêu cầu', desc: 'Điền form đăng ký với thông tin chuyến xe cần sử dụng' },
    { num: '2', title: 'Phê duyệt', desc: 'Phòng Tổng Hợp xem xét và phê duyệt yêu cầu của ' + pronoun(d.recipientGender) },
    { num: '3', title: 'Phân công tài xế', desc: 'Tài xế được phân bổ và xác nhận nhận ca' },
    { num: '4', title: 'Sẵn sàng phục vụ', desc: pronoun(d.recipientGender).charAt(0).toUpperCase() + pronoun(d.recipientGender).slice(1) + ' nhận email xác nhận kèm thông tin tài xế và số điện thoại liên lạc' },
  ].map(s => `
    <tr>
      <td style="padding:8px 12px 8px 0;vertical-align:top;">
        <table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr><td width="28" height="28" bgcolor="${s.num === '4' ? '#dcfce7' : '#dbeafe'}" style="background-color:${s.num === '4' ? '#dcfce7' : '#dbeafe'};color:${s.num === '4' ? GREEN : BLUE};font-family:${F};font-size:13px;font-weight:700;text-align:center;line-height:28px;">${s.num === '4' ? '&#10003;' : s.num}</td></tr></table>
      </td>
      <td style="padding:8px 0;color:#475569;font-size:14px;font-family:${F};line-height:1.5;">
        <strong>${s.title}</strong> — ${s.desc}
      </td>
    </tr>`).join('');

  const content = [
    headerBlock('Hệ thống Đăng ký Xe', 'Phòng Tổng Hợp — Esuhai Group'),
    greetingRow(
      `Kính gửi ${greeting},`,
      `Phòng Tổng Hợp xin giới thiệu Hệ thống Đăng ký Xe dành cho toàn bộ nhân viên Esuhai Group. Khi cần sử dụng xe công ty cho công tác, đón khách, hoặc các hoạt động chung, ${pronoun(d.recipientGender)} vui lòng bấm nút bên dưới để gửi yêu cầu.`
    ),
    ctaButtonRow('Đăng ký sử dụng xe', d.formUrl),
    // Quy trình 4 bước
    `<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 40px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:20px;border:1px solid #e2e8f0;">
<tr><td style="padding:20px;">
<p style="margin:0 0 14px;color:#0f172a;font-size:14px;font-family:${F};font-weight:700;">Quy trình 4 bước:</p>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">${stepsHtml}</table>
</td></tr>
</table>
</td></tr>`,
    // Lưu ý
    alertBox('Lưu ý', `Vui lòng gửi yêu cầu trước ít nhất 1 ngày để Phòng Tổng Hợp kịp sắp xếp. Đối với xe thuê ngoài, yêu cầu cần qua 3 cấp phê duyệt.`, '#fffbeb', '#92400e', '#fde68a'),
    secondaryButtonRow('Xem bảng điều phối', d.dashboardUrl),
    footerRow('Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ Phòng Tổng Hợp.'),
  ].join('');

  return { subject, html: baseWrapper(content) };
}

// ============================================================
// TEMPLATE 1: YÊU CẦU MỚI → QUẢN LÝ (Step 1 active)
// ============================================================

export function buildNewBookingEmail(d: BookingEmailData): { subject: string; html: string } {
  const subject = `[Yêu cầu xe mới] ${d.purpose} — ${d.tripDate}`;
  const mgr = d.managerName || '';
  const timeStr = `${d.pickupTime}${d.endTime ? ' — ' + d.endTime : ''}`;

  const content = [
    headerBlock('Yêu cầu sử dụng xe mới', 'Phòng Tổng Hợp — Esuhai Group'),
    processBar(0),
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
      { label: 'Người yêu cầu', value: `${esc(d.requesterName)} <span style="font-size:11px;color:#64748b;background:#f1f5f9;padding:3px 8px;">${esc(d.requesterDepartment)}</span>` },
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
// TEMPLATE 2: PHÂN CÔNG → TÀI XẾ (Step 2 active)
// ============================================================

export function buildDriverAssignEmail(d: BookingEmailData & { confirmUrl: string; rejectUrl: string }): { subject: string; html: string } {
  const subject = `[Phân công xe] ${d.tripDate} — ${d.purpose}`;
  const timeStr = `${d.pickupTime}${d.endTime ? ' — ' + d.endTime : ''}`;

  const content = [
    headerBlock('Phân công phục vụ chuyến xe', 'Ban Điều Phối — Esuhai Group'),
    processBar(1),
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
    dualActionRow(d.confirmUrl, d.rejectUrl),
    calendarInlineRow(d.purpose, d.tripDate, d.pickupTime, d.endTime, d.itinerary),
    footerRow('Nếu xác nhận, thông tin sẽ được gửi đến người yêu cầu và nhân viên phụ trách. Nếu từ chối, vui lòng ghi rõ lý do để Ban Điều Phối sắp xếp tài xế khác.', d.bookingId),
  ].join('');

  return { subject, html: baseWrapper(content) };
}

// ============================================================
// TEMPLATE 3: XÁC NHẬN → NGƯỜI YÊU CẦU (Step 3 done = all done)
// ============================================================

export function buildConfirmBookerEmail(d: BookingEmailData): { subject: string; html: string } {
  const subject = `[Xe đã sẵn sàng] ${d.purpose} — ${d.tripDate}`;
  const timeStr = `${d.pickupTime}${d.endTime ? ' — ' + d.endTime : ''}`;

  const content = [
    headerBlock('Chuyến xe đã được xác nhận', 'Xe đã phân bổ — Sẵn sàng phục vụ', GREEN),
    processBar(2),
    badgeRow(d.bookingId),
    greetingRow(
      `Kính gửi ${vnGreeting(d.requesterName, d.requesterGender)},`,
      `Yêu cầu sử dụng xe của ${pronoun(d.requesterGender)} đã được phê duyệt và tài xế đã xác nhận nhận ca. Dưới đây là thông tin chi tiết để ${pronoun(d.requesterGender)} chủ động liên hệ khi cần.`
    ),
    successBox('Chuyến xe đã sẵn sàng phục vụ'),
    dateHighlightCard('Lịch đón xác nhận', d.tripDate, timeStr, '#22c55e', '#15803d'),
    detailSection([
      { label: 'Mục đích', value: esc(d.purpose) },
      { label: 'Số lượng', value: `${d.passengerCount} người` },
      { label: 'Chuyến bay', value: d.flightNumber ? `<strong>${esc(d.flightNumber)}</strong>` : '' },
    ]),
    d.itinerary ? timelineRow(d.itinerary) : '',
    d.driverName && d.driverPhone ? driverCardRow(d.driverName, d.driverPhone, d.vehicleType, d.plateNumber) : '',
    d.driverPhone ? ctaButtonRow(`Gọi Tài Xế: ${d.driverPhone}`, `tel:${d.driverPhone.replace(/\s/g, '')}`, GREEN) : '',
    calendarButtonRow(d.purpose, d.tripDate, d.pickupTime, d.endTime, d.itinerary),
    waitingPolicyRow(),
    footerRow('Nếu có thay đổi lịch trình, vui lòng liên hệ Phòng Tổng Hợp sớm nhất có thể.', d.bookingId),
  ].join('');

  return { subject, html: baseWrapper(content) };
}

// ============================================================
// TEMPLATE 4: THÔNG TIN → NV PHỤ TRÁCH (Step 3 done)
// ============================================================

export function buildConfirmStaffEmail(d: BookingEmailData): { subject: string; html: string } {
  const subject = `[Lịch xe đã xác nhận] ${d.tripDate} — Tài xế: ${d.driverName || ''}`;
  const timeStr = `${d.pickupTime}${d.endTime ? ' — ' + d.endTime : ''}`;

  const content = [
    headerBlock('Thông tin chuyến xe đã xác nhận', 'Ban Điều Phối — Esuhai Group', GREEN),
    processBar(2),
    badgeRow(d.bookingId),
    greetingRow(
      `Kính gửi ${vnGreeting(d.staffInCharge || '', d.staffInChargeGender)},`,
      `${pronoun(d.staffInChargeGender).charAt(0).toUpperCase() + pronoun(d.staffInChargeGender).slice(1)} được giao phụ trách chuyến xe bên dưới. Tài xế đã xác nhận nhận ca. Vui lòng liên hệ trực tiếp với tài xế nếu cần phối hợp trước chuyến đi.`
    ),
    dateHighlightCard('Lịch đón xác nhận', d.tripDate, timeStr, '#22c55e', '#15803d'),
    detailSection([
      { label: 'Mục đích', value: esc(d.purpose) },
      { label: 'Người yêu cầu', value: `${esc(d.requesterName)} — ${esc(d.requesterDepartment)}` },
      { label: 'Số lượng', value: `${d.passengerCount} người` },
      { label: 'Chuyến bay', value: d.flightNumber ? `<strong>${esc(d.flightNumber)}</strong>` : '' },
      { label: 'Thành viên', value: d.memberNames ? esc(d.memberNames) : '' },
    ]),
    d.itinerary ? timelineRow(d.itinerary) : '',
    d.driverName && d.driverPhone ? driverCardRow(d.driverName, d.driverPhone, d.vehicleType, d.plateNumber) : '',
    d.driverPhone ? ctaButtonRow(`Gọi Tài Xế: ${d.driverPhone}`, `tel:${d.driverPhone.replace(/\s/g, '')}`, GREEN) : '',
    calendarButtonRow(d.purpose, d.tripDate, d.pickupTime, d.endTime, d.itinerary),
    waitingPolicyRow(),
    footerRow('Nếu có thay đổi, vui lòng liên hệ Phòng Tổng Hợp sớm nhất có thể.', d.bookingId),
  ].join('');

  return { subject, html: baseWrapper(content) };
}

// ============================================================
// TEMPLATE 5: HOÀN TẤT → QUẢN LÝ (Step 3 done)
// ============================================================

export function buildConfirmManagerEmail(d: BookingEmailData): { subject: string; html: string } {
  const subject = `[Hoàn tất] #${bookingCode(d.bookingId)} — ${d.purpose}`;

  const content = [
    headerBlock('Quy trình phân bổ hoàn tất', 'Phòng Tổng Hợp — Esuhai Group', GREEN),
    processBar(3),  // Step 4: Phục vụ — chuyến xe sẵn sàng, chờ thực hiện
    badgeRow(d.bookingId),
    greetingRow(
      `Kính gửi ${vnGreeting(d.managerName || '', d.managerGender)},`,
      `Tài xế ${esc(d.driverName)} đã xác nhận nhận ca. Quy trình phân bổ cho yêu cầu bên dưới đã hoàn tất.`
    ),
    successBox('Quy trình đã hoàn tất — Chuyến xe sẵn sàng phục vụ'),
    detailSection([
      { label: 'Ngày và giờ', value: `${d.tripDate} | ${d.pickupTime}${d.endTime ? ' — ' + d.endTime : ''}` },
      { label: 'Mục đích', value: esc(d.purpose) },
      { label: 'Người yêu cầu', value: `${esc(d.requesterName)} — ${esc(d.requesterDepartment)}` },
      { label: 'Tài xế', value: esc(d.driverName) || '—' },
      { label: 'Xe', value: d.vehicleType ? `${esc(d.vehicleType)}${d.plateNumber ? ' — ' + esc(d.plateNumber) : ''}` : '' },
      { label: 'NV phụ trách', value: d.staffInCharge ? esc(d.staffInCharge) : '' },
    ]),
    d.dashboardUrl ? ctaButtonRow('Mở bảng điều phối', d.dashboardUrl) : '',
    footerRow('Hệ thống đã gửi email thông báo đến người yêu cầu, nhân viên phụ trách và tài xế.', d.bookingId),
  ].join('');

  return { subject, html: baseWrapper(content) };
}

// ============================================================
// TEMPLATE 6: TÀI XẾ TỪ CHỐI → QUẢN LÝ (Step 2 active — quay lại)
// ============================================================

export function buildDriverRejectEmail(d: BookingEmailData): { subject: string; html: string } {
  const subject = `[Cần phân bổ lại] #${bookingCode(d.bookingId)} — ${d.purpose}`;

  const content = [
    headerBlock('Cần phân bổ tài xế khác', 'Yêu Cầu Thay Đổi Phân Bổ', RED),
    processBar(1),  // Quay lại bước Phân bổ
    badgeRow(d.bookingId),
    greetingRow(
      `Kính gửi ${vnGreeting(d.managerName || '', d.managerGender)},`,
      `Tài xế ${esc(d.driverName)} không nhận ca cho yêu cầu bên dưới. Vui lòng phân bổ tài xế khác sớm nhất có thể để đảm bảo phục vụ đúng lịch.`
    ),
    d.rejectionReason ? alertBox('Lý do từ chối', esc(d.rejectionReason), '#fef2f2', '#991b1b', '#fecaca') : '',
    detailSection([
      { label: 'Ngày và giờ', value: `${d.tripDate} | ${d.pickupTime}` },
      { label: 'Mục đích', value: esc(d.purpose) },
      { label: 'Tài xế từ chối', value: esc(d.driverName) || '—' },
    ]),
    d.dashboardUrl ? ctaButtonRow('Mở bảng điều phối — phân bổ lại', d.dashboardUrl, RED) : '',
    footerRow('Vui lòng phân bổ lại ngay để đảm bảo lịch di chuyển.', d.bookingId),
  ].join('');

  return { subject, html: baseWrapper(content) };
}

// ============================================================
// TEMPLATE 7: KHÔNG DUYỆT → NGƯỜI YÊU CẦU
// ============================================================

export function buildRejectBookerEmail(d: BookingEmailData): { subject: string; html: string } {
  const subject = `[Không duyệt] ${d.purpose} — ${d.tripDate}`;

  const content = [
    headerBlock('Yêu cầu không được duyệt', 'Phòng Tổng Hợp — Esuhai Group', '#64748b'),
    processBar(0),
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
// TEMPLATE 8: HUỶ CHUYẾN → TOÀN BỘ
// ============================================================

export function buildCancellationEmail(d: BookingEmailData & { cancelledBy: string; cancellationReason: string; recipientName: string; recipientGender?: 'male' | 'female' }): { subject: string; html: string } {
  const subject = `[Huỷ chuyến] ${d.purpose} — ${d.tripDate}`;

  const content = [
    headerBlock('Chuyến xe đã được huỷ', 'Phòng Tổng Hợp — Esuhai Group', RED),
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
// TEMPLATE 9: KHÔNG DUYỆT → TOÀN BỘ
// ============================================================

export function buildRejectAllEmail(d: BookingEmailData & { recipientName: string; recipientGender?: 'male' | 'female' }): { subject: string; html: string } {
  const subject = `[Không duyệt] ${d.purpose} — ${d.tripDate}`;

  const content = [
    headerBlock('Yêu cầu không được duyệt', 'Phòng Tổng Hợp — Esuhai Group', '#64748b'),
    processBar(0),
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
