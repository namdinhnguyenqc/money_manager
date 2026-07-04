import type { Metadata } from "next";
import LandingPageClient from "./LandingPageClient";

export const metadata: Metadata = {
  title: "Phần Mềm Quản Lý Trọ Miễn Phí, Quản Lý Phòng Trọ - TrọCare",
  description:
    "TrọCare là phần mềm quản lý trọ miễn phí uy tín, bảo mật tốt nhất. Hỗ trợ quản lý phòng trọ, khách thuê, hợp đồng, hóa đơn tự động và thanh toán QR tiện lợi.",
  keywords: [
    "TrọCare",
    "quản lý trọ miễn phí",
    "quan ly tro mien phi",
    "phần mềm quản lý phòng trọ miễn phí",
    "phan mem quan ly phong tro mien phi",
    "quản lý trọ uy tín",
    "quản lý trọ bảo mật",
    "phần mềm quản lý trọ uy tín",
    "phần mềm quản lý trọ bảo mật",
    "quản lý phòng trọ bảo mật",
    "quản lý nhà trọ miễn phí",
    "phần mềm quản lý nhà trọ",
    "app quản lý phòng trọ miễn phí",
    "phần mềm quản lý nhà trọ miễn phí",
    "phần mềm quản lý nhà cho thuê",
    "quản lý hợp đồng thuê trọ",
    "lập hóa đơn phòng trọ",
    "thu chi nhà trọ",
    "QR thanh toán phòng trọ",
    "SePay nhà trọ",
    "app quản lý chủ trọ",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Phần Mềm Quản Lý Trọ Miễn Phí, Quản Lý Phòng Trọ - TrọCare",
    description:
      "TrọCare giúp chủ trọ quản lý phòng, khách thuê, hợp đồng, hóa đơn, thu chi, thanh toán QR tự động.",
    type: "website",
    locale: "vi_VN",
    images: [
      {
        url: "/brand/trocare-og-banner.png?v=1",
        width: 1200,
        height: 630,
        alt: "TrọCare - Phần mềm quản lý trọ miễn phí, vận hành an tâm",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Phần Mềm Quản Lý Trọ Miễn Phí, Quản Lý Phòng Trọ - TrọCare",
    description: "Phần mềm quản lý phòng trọ, hợp đồng, hóa đơn, thu chi và thanh toán QR tự động cho chủ trọ.",
    images: ["/brand/trocare-og-banner.png?v=1"],
  },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TrọCare",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "VND",
  },
  description:
    "TrọCare là phần mềm quản lý cho thuê miễn phí cho chủ trọ, hỗ trợ phòng, khách thuê, hợp đồng, hóa đơn, thu chi, QR thanh toán và nhắc việc.",
  featureList: [
    "Dãy trọ và phòng",
    "Khách thuê",
    "Hợp đồng",
    "Hóa đơn",
    "Sổ quỹ thu chi",
    "Thanh toán QR",
    "Nhắc việc",
    "Zalo và tin nhắn",
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <LandingPageClient />
    </>
  );
}
