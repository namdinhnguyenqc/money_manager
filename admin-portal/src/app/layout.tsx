import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrọCare Admin",
  description: "Cổng vận hành nội bộ TrọCare.",
  icons: {
    icon: "/brand/app-icons/app-icon-gradient-32.png",
    apple: "/brand/app-icons/app-icon-gradient-180.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
