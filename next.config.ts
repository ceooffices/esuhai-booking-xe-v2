import type { NextConfig } from "next";

// Security headers — apply cho mọi response. HSTS đã được Vercel set
// tự động (max-age 2 năm + preload). Phần dưới bổ sung tuyến phòng
// thủ chống clickjacking, MIME sniffing, leak referrer, browser API
// abuse, và XSS qua inline script.
//
// CSP: dùng tier "report-only" trước cho an toàn — nếu break feature
// nào sẽ thấy log trong DevTools console mà không chặn execution.
// Sau khi quan sát 1-2 tuần ổn → đổi sang strict (bỏ -Report-Only).
const securityHeaders = [
  // Chống MIME sniffing (browser tự đoán content-type → có thể chạy script
  // từ file image)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Chống clickjacking — không cho iframe app này
  { key: 'X-Frame-Options', value: 'DENY' },
  // Hạn chế referrer leak khi user click link ra ngoài
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Vô hiệu hoá các browser API mặc định không dùng (camera/mic/location)
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
