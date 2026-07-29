import type { Metadata, Viewport } from "next";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import PWAProvider from "@/components/PWAProvider";
import { ToastProvider } from "@/components/ui/Toast";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://trocare-production.vercel.app";
const SHARE_TITLE = "Phần Mềm Quản Lý Trọ Miễn Phí, Quản Lý Phòng Trọ - TrọCare";
const SHARE_DESCRIPTION =
  "TrọCare giúp chủ trọ quản lý phòng, khách thuê, hợp đồng, hóa đơn, thu chi, thanh toán QR tự động.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "TrọCare Owner",
  description: "TrọCare - Nền tảng quản lý nhà trọ và phòng cho thuê thế hệ mới.",
  applicationName: "TrọCare",
  manifest: "/manifest.webmanifest",
  // Favicon + apple-touch icon are provided by file conventions:
  // src/app/icon.png and src/app/apple-icon.png (official TrọCare brand mark).
  // The share-link preview image comes from src/app/opengraph-image.tsx
  // (Next.js file convention — auto-generates /opengraph-image at build time).
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "TrọCare",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    locale: "vi_VN",
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
  },
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
