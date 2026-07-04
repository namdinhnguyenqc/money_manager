import type { Metadata, Viewport } from "next";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import PWAProvider from "@/components/PWAProvider";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://trocare-production.vercel.app"),
  title: "TrọCare Owner",
  description: "TrọCare - Nền tảng quản lý nhà trọ và phòng cho thuê thế hệ mới.",
  applicationName: "TrọCare",
  manifest: "/manifest.webmanifest",
  // Favicon + apple-touch icon are provided by file conventions:
  // src/app/icon.png and src/app/apple-icon.png (official TrọCare brand mark).
  other: {
    "zalo-platform-site-verification": "JyNX2gN6KrPvpEjjXzDWOdlUxNgNg3WZDJKm",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <PWAProvider>
          <ToastProvider>
            <QueryProvider>{children}</QueryProvider>
          </ToastProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
