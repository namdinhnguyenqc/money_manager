import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tìm phòng trọ theo khu vực | TroCare",
  description:
    "Tìm phòng trọ đang trống theo khu vực, mức giá và số người. Liên hệ trực tiếp chủ trọ và đặt lịch xem phòng trên TroCare.",
  alternates: {
    canonical: "/phong-tro",
  },
  openGraph: {
    title: "TroCare Tìm phòng",
    description: "Phòng trọ cập nhật trực tiếp từ hệ thống quản lý TroCare.",
    type: "website",
    locale: "vi_VN",
    images: ["/brand/trocare-og-banner.png"],
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
