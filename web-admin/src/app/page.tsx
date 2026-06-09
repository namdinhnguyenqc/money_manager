import type { Metadata } from "next";
import LandingPageClient from "./LandingPageClient";

export const metadata: Metadata = {
  title: "TroCare | Quản lý cho thuê miễn phí cho chủ trọ",
  description:
    "TroCare là phần mềm quản lý phòng trọ miễn phí: dãy trọ, phòng, khách thuê, hợp đồng, hóa đơn, thu chi, QR SePay, nhắc thanh toán và vận hành chủ trọ.",
  keywords: [
    "TroCare",
    "quản lý nhà trọ miễn phí",
    "phần mềm quản lý phòng trọ",
    "quản lý cho thuê",
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
    title: "TroCare | Quản lý cho thuê miễn phí",
    description:
      "Một nơi để chủ trọ quản lý phòng, hợp đồng, hóa đơn, thu chi, thanh toán và nhắc việc mỗi tháng.",
    type: "website",
    locale: "vi_VN",
    images: [
      {
        url: "/brand/trocare-og-banner.png?v=1",
        width: 1200,
        height: 630,
        alt: "TroCare - Quản lý trọ thông minh, vận hành an tâm",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TroCare | Quản lý cho thuê miễn phí",
    description: "Phần mềm quản lý phòng trọ, hợp đồng, hóa đơn, thu chi và thanh toán cho chủ trọ.",
    images: ["/brand/trocare-og-banner.png?v=1"],
  },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TroCare",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "VND",
  },
  description:
    "TroCare là phần mềm quản lý cho thuê miễn phí cho chủ trọ, hỗ trợ phòng, khách thuê, hợp đồng, hóa đơn, thu chi, QR thanh toán và nhắc việc.",
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
