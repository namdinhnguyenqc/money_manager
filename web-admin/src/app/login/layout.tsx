import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng Nhập TrọCare | Phần Mềm Quản Lý Phòng Trọ Miễn Phí",
  description: "Đăng nhập vào TrọCare để quản lý phòng trọ, khách thuê, hợp đồng và hóa đơn dịch vụ hoàn toàn miễn phí, nhanh chóng và bảo mật.",
  alternates: {
    canonical: "https://trocare-production.vercel.app/login",
  },
  openGraph: {
    title: "Đăng Nhập TrọCare | Phần Mềm Quản Lý Phòng Trọ Miễn Phí",
    description: "Đăng nhập vào TrọCare để quản lý phòng trọ, khách thuê, hợp đồng và hóa đơn dịch vụ hoàn toàn miễn phí, nhanh chóng và bảo mật.",
    url: "https://trocare-production.vercel.app/login",
    siteName: "TrọCare",
    locale: "vi_VN",
    type: "website",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
