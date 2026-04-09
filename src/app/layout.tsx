import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quản lý Xe — Esuhai",
  description: "Hệ thống quản lý vận hành ô tô — Phòng Tổng Hợp Esuhai Group",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Quản lý Xe",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
