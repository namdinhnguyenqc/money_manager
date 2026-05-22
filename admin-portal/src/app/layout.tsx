import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trá»Care Admin",
  description: "Cá»•ng váº­n hÃ nh ná»™i bá»™ Trá»Care.",
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
