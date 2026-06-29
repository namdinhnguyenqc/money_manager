import type { Metadata, Viewport } from "next";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import PWAProvider from "@/components/PWAProvider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://trocare-production.vercel.app"),
  title: "TrọCare Owner",
  description: "TrọCare - Nền tảng quản lý nhà trọ và phòng cho thuê thế hệ mới.",
  applicationName: "TrọCare",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TrọCare",
  },
  // Favicon + apple-touch icon are provided by file conventions:
  // src/app/icon.png and src/app/apple-icon.png (official TrọCare brand mark).
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
        <QueryProvider>{children}</QueryProvider>
        <PWAProvider />
      </body>
    </html>
  );
}
