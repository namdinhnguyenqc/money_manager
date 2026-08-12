import type { Metadata, Viewport } from "next";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import PWAProvider from "@/components/PWAProvider";
import { ToastProvider } from "@/components/ui/Toast";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://trocare-production.vercel.app";
const SHARE_TITLE = "Phần Mềm Quản Lý Trọ Miễn Phí, Quản Lý Phòng Trọ - TroCare";
const SHARE_DESCRIPTION =
  "TroCare - Phần mềm quản lý nhà trọ miễn phí, giúp quản lý phòng, khách thuê, hợp đồng, hóa đơn, điện nước và doanh thu dễ dàng.";
const OG_IMAGE_URL = `${SITE_URL}/og-trocare.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SHARE_TITLE,
  description: SHARE_DESCRIPTION,
  applicationName: "TroCare",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "TroCare",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    locale: "vi_VN",
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: "Phần Mềm Quản Lý Trọ Miễn Phí, Quản Lý Phòng Trọ - TroCare",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: [OG_IMAGE_URL],
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
