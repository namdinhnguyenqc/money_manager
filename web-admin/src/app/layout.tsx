import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Money Manager - Admin",
  description: "Admin dashboard for Money Manager",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}