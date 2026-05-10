import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "TrọCare Admin",
  description: "TrọCare - Nền tảng quản lý nhà trọ thông minh",
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
