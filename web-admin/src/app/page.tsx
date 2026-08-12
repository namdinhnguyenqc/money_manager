import type { Metadata } from "next";
import LandingPageClient from "./LandingPageClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://trocare-production.vercel.app";
const SHARE_TITLE = "Phần Mềm Quản Lý Trọ Miễn Phí, Quản Lý Phòng Trọ - TroCare";
const SHARE_DESCRIPTION =
  "TroCare - Phần mềm quản lý nhà trọ miễn phí, giúp quản lý phòng, khách thuê, hợp đồng, hóa đơn, điện nước và doanh thu dễ dàng.";
const OG_IMAGE_URL = `${SITE_URL}/og-trocare.jpg`;

export const metadata: Metadata = {
  title: SHARE_TITLE,
  description: SHARE_DESCRIPTION,
  keywords: [
    "TroCare",
    "TrọCare",
    "quản lý trọ miễn phí",
    "quan ly tro mien phi",
    "phần mềm quản lý phòng trọ miễn phí",
    "phan mem quan ly phong tro mien phi",
    "quản lý nhà trọ miễn phí",
    "phần mềm quản lý nhà trọ",
    "app quản lý phòng trọ miễn phí",
    "phần mềm quản lý nhà trọ miễn phí",
    "quản lý hợp đồng thuê trọ",
    "lập hóa đơn phòng trọ",
    "thu chi nhà trọ",
    "QR thanh toán phòng trọ",
    "SePay nhà trọ",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    type: "website",
    url: SITE_URL,
    siteName: "TroCare",
    locale: "vi_VN",
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: SHARE_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: [OG_IMAGE_URL],
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
