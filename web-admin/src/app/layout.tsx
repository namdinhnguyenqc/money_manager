import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "TrọCare Owner",
  description: "TrọCare - Nền tảng quản lý nhà trọ và phòng cho thuê thế hệ mới.",
  icons: {
    icon: "/brand/app-icons/app-icon-gradient-32.png",
    apple: "/brand/app-icons/app-icon-gradient-180.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body><QueryProvider>{children}</QueryProvider></body>
    </html>
  );
}
