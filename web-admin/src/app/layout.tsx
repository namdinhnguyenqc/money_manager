import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "Trá»Care Owner",
  description: "Trá»Care - Ná»n táº£ng quáº£n lÃ½ nhÃ  trá» vÃ  phÃ²ng cho thuÃª tháº¿ há»‡ má»›i.",
  icons: {
    icon: "/brand/app-icons/app-icon-gradient-32.png",
    apple: "/brand/app-icons/app-icon-gradient-180.png",
  }
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
