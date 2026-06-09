import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  BellRing,
  Bot,
  Building2,
  FileText,
  Gauge,
  Home,
  MessageCircle,
  QrCode,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

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

const ownerFeatures = [
  {
    icon: Building2,
    title: "Dãy trọ và phòng",
    copy: "Theo dõi từng dãy, từng phòng, trạng thái trống, đang thuê, đặt cọc, số người ở và giá thuê.",
  },
  {
    icon: Users,
    title: "Khách thuê",
    copy: "Lưu hồ sơ khách thuê, số điện thoại, giấy tờ, địa chỉ, phòng đang ở và lịch sử hợp đồng.",
  },
  {
    icon: FileText,
    title: "Hợp đồng",
    copy: "Tạo hợp đồng, gắn dịch vụ, quản lý ngày bắt đầu, ngày hết hạn, cọc và tất toán khi trả phòng.",
  },
  {
    icon: Receipt,
    title: "Hóa đơn",
    copy: "Lập hóa đơn theo tháng, tính điện nước, dịch vụ, nợ cũ, thanh toán từng phần và in biên nhận.",
  },
  {
    icon: WalletCards,
    title: "Sổ quỹ thu chi",
    copy: "Ghi nhận thu tiền phòng, thu cọc, chi sửa chữa, lọc theo ngày, ví và danh mục.",
  },
  {
    icon: QrCode,
    title: "Thanh toán QR",
    copy: "Hiển thị QR chuyển khoản ACB, mã thanh toán riêng cho từng hóa đơn và đối soát qua SePay.",
  },
  {
    icon: BellRing,
    title: "Nhắc việc",
    copy: "Theo dõi hóa đơn chưa thanh toán, hợp đồng sắp hết hạn, lịch sử thông báo và trạng thái gửi.",
  },
  {
    icon: MessageCircle,
    title: "Zalo và tin nhắn",
    copy: "Kết nối Zalo OA, gửi hóa đơn cho khách thuê, xem lịch sử gửi và xử lý gửi lại khi cần.",
  },
];

const flow = [
  "Tạo dãy trọ",
  "Thêm phòng",
  "Nhập khách thuê",
  "Ký hợp đồng",
  "Lập hóa đơn",
  "Nhận thanh toán",
  "Xem sổ quỹ",
];

const aiIdeas = [
  "Gợi ý hóa đơn cần nhắc dựa trên trạng thái thanh toán",
  "Tóm tắt dòng tiền theo tháng cho chủ trọ",
  "Cảnh báo phòng trống lâu, hợp đồng sắp hết hạn, cọc cần xử lý",
  "Chuẩn bị nội dung nhắn Zalo dễ hiểu cho khách thuê",
];

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
  featureList: ownerFeatures.map((feature) => feature.title),
};

export default function LandingPage() {
  return (
    <main className="trocare-landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="tc-hero" aria-labelledby="hero-title">
        <nav className="tc-nav" aria-label="Điều hướng TroCare">
          <Link href="/" className="tc-brand" aria-label="TroCare trang chủ">
            <Image
              src="/brand/transparent/trocare-logo-full-transparent-2000.png"
              alt="TroCare"
              width={260}
              height={80}
              priority
              className="tc-brand-logo"
            />
          </Link>
          <div className="tc-nav-links">
            <a href="#features">Tính năng</a>
            <a href="#workflow">Quy trình</a>
            <a href="#ai">AI</a>
            <Link href="/login" className="tc-nav-cta">
              Đăng nhập
            </Link>
          </div>
        </nav>

        <div className="tc-hero-grid">
          <div className="tc-hero-copy">
            <div className="tc-kicker">
              <Sparkles size={16} aria-hidden="true" />
              Miễn phí cho chủ trọ bắt đầu số hóa vận hành
            </div>
            <h1 id="hero-title">
              Quản lý nhà trọ miễn phí, nhìn rõ từng phòng từng đồng.
            </h1>
            <p className="tc-hero-lead">
              TroCare giúp chủ trọ quản lý dãy trọ, phòng, khách thuê, hợp đồng, hóa đơn, thu chi, QR thanh toán và nhắc việc trong một màn hình dễ hiểu.
            </p>
            <div className="tc-hero-actions">
              <Link href="/login" className="tc-primary">
                Bắt đầu miễn phí <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href="#features" className="tc-secondary">
                Xem TroCare quản lý gì
              </a>
            </div>
            <dl className="tc-proof">
              <div>
                <dt>0đ</dt>
                <dd>chi phí bắt đầu</dd>
              </div>
              <div>
                <dt>7 bước</dt>
                <dd>từ phòng đến thu tiền</dd>
              </div>
              <div>
                <dt>QR</dt>
                <dd>thanh toán rõ mã hóa đơn</dd>
              </div>
            </dl>
          </div>

          <div className="tc-hero-stage" aria-label="Mô phỏng bảng quản lý TroCare">
            <div className="tc-orbit tc-orbit-one" />
            <div className="tc-orbit tc-orbit-two" />
            <div className="tc-dashboard-card tc-card-main">
              <div className="tc-card-head">
              <span>Vận hành tháng 06/2026</span>
                <strong>Đang vận hành</strong>
              </div>
              <div className="tc-rent-row">
                <Home size={18} aria-hidden="true" />
                <div>
                  <strong>Dãy A, phòng P109</strong>
                  <span>Đã tạo hóa đơn, chờ khách chuyển khoản</span>
                </div>
                <b>2.671.100đ</b>
              </div>
              <div className="tc-meter">
                <span style={{ width: "72%" }} />
              </div>
              <div className="tc-mini-grid">
                <div>
                  <small>Phòng thuê</small>
                  <strong>28</strong>
                </div>
                <div>
                  <small>Đã thu</small>
                  <strong>84%</strong>
                </div>
                <div>
                  <small>Cần nhắc</small>
                  <strong>5</strong>
                </div>
              </div>
            </div>
            <div className="tc-dashboard-card tc-card-float tc-float-pay">
              <QrCode size={20} aria-hidden="true" />
              <span>QR ACB sẵn sàng</span>
            </div>
            <div className="tc-dashboard-card tc-card-float tc-float-alert">
              <BellRing size={20} aria-hidden="true" />
              <span>3 hóa đơn cần nhắc</span>
            </div>
            <div className="tc-dashboard-card tc-card-float tc-float-cash">
              <Banknote size={20} aria-hidden="true" />
              <span>Sổ quỹ vừa cập nhật</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="tc-section tc-feature-section" aria-labelledby="features-title">
        <div className="tc-section-copy">
          <span className="tc-eyebrow">Một app cho việc lặp lại mỗi tháng</span>
          <h2 id="features-title">TroCare quản lý toàn bộ vòng đời cho thuê.</h2>
          <p>
            Không cần nhớ bằng sổ tay, không cần dò từng file Excel. Mọi dữ liệu đi theo phòng, hợp đồng và hóa đơn nên chủ trọ kiểm tra nhanh hơn, xử lý ít sai hơn.
          </p>
        </div>
        <div className="tc-feature-wall">
          {ownerFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article className="tc-feature" key={feature.title} style={{ ["--delay" as string]: `${index * 70}ms` }}>
                <Icon size={22} aria-hidden="true" />
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="workflow" className="tc-section tc-workflow" aria-labelledby="workflow-title">
        <div className="tc-section-copy">
          <span className="tc-eyebrow">Flow chuẩn cho chủ trọ mới</span>
          <h2 id="workflow-title">Vào app lần đầu vẫn biết phải làm gì tiếp theo.</h2>
        </div>
        <ol className="tc-flow">
          {flow.map((item, index) => (
            <li key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="tc-section tc-money" aria-labelledby="money-title">
        <div className="tc-money-panel">
          <div>
            <span className="tc-eyebrow">Thu tiền rõ ràng</span>
            <h2 id="money-title">Mỗi hóa đơn có mã riêng, QR riêng, trạng thái riêng.</h2>
            <p>
              TroCare giúp người nhận hóa đơn thấy ngay số tiền cần trả, khoản điện nước, wifi, rác, nợ cũ và mã QR chuyển khoản. Khi webhook SePay nhận giao dịch, hệ thống có thể đối soát theo mã thanh toán.
            </p>
          </div>
          <div className="tc-invoice-demo" aria-label="Mẫu hóa đơn TroCare">
            <div className="tc-invoice-title">Thông báo tiền phòng T1</div>
            <div className="tc-invoice-lines">
              <span>Phòng</span><b>2.300.000đ</b>
              <span>Điện</span><b>234.600đ</b>
              <span>Nước</span><b>100.000đ</b>
              <span>Rác</span><b>36.500đ</b>
            </div>
            <div className="tc-invoice-total">
              <span>Cần thanh toán</span>
              <strong>2.671.100đ</strong>
            </div>
            <div className="tc-qr-block">
              <QrCode size={54} aria-hidden="true" />
              <span>ACB · TCINV-P109</span>
            </div>
          </div>
        </div>
      </section>

      <section id="ai" className="tc-section tc-ai" aria-labelledby="ai-title">
        <div className="tc-ai-copy">
          <span className="tc-eyebrow">AI cho vận hành cho thuê</span>
          <h2 id="ai-title">Không thay chủ trọ quyết định, chỉ giúp chủ trọ nhìn việc nhanh hơn.</h2>
          <p>
            Nền dữ liệu của TroCare đã có phòng, hợp đồng, hóa đơn, thanh toán và lịch sử thu chi. Đây là nền tốt để thêm các kỹ năng AI phục vụ vận hành thực tế, ưu tiên nhắc đúng việc và viết nội dung dễ hiểu cho khách thuê.
          </p>
        </div>
        <div className="tc-ai-list">
          {aiIdeas.map((idea) => (
            <div key={idea}>
              <Bot size={20} aria-hidden="true" />
              <span>{idea}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="tc-section tc-seo-copy" aria-labelledby="seo-title">
        <Gauge size={28} aria-hidden="true" />
        <h2 id="seo-title">Phần mềm quản lý nhà trọ miễn phí cho chủ trọ Việt Nam</h2>
        <p>
          TroCare phù hợp cho chủ trọ đang quản lý vài phòng đến nhiều dãy trọ. Hệ thống tập trung vào các việc quan trọng nhất: quản lý phòng trọ, quản lý khách thuê, quản lý hợp đồng thuê phòng, lập hóa đơn tiền phòng, theo dõi thu chi nhà trọ, tạo mã QR thanh toán và nhắc khách thuê thanh toán đúng hạn.
        </p>
      </section>

      <section className="tc-final" aria-labelledby="final-title">
        <ShieldCheck size={34} aria-hidden="true" />
        <h2 id="final-title">Bắt đầu miễn phí, chuẩn hóa vận hành từ hôm nay.</h2>
        <p>
          Đưa dữ liệu phòng trọ vào TroCare trước. Khi mọi thứ đã rõ, tháng sau việc thu tiền và kiểm tra nợ sẽ nhẹ hơn.
        </p>
        <Link href="/login" className="tc-primary tc-primary-light">
          Dùng TroCare miễn phí <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <footer className="tc-footer">
        <div className="tc-footer-brand">
          <Image
            src="/brand/transparent/trocare-wordmark-transparent-1600.png"
            alt="TroCare"
            width={180}
            height={54}
          />
          <span>Quản lý trọ thông minh, vận hành an tâm.</span>
        </div>
        <nav className="tc-footer-links" aria-label="Liên kết pháp lý TroCare">
          <Link href="/privacy">Chính sách bảo mật</Link>
          <Link href="/terms">Điều khoản sử dụng</Link>
          <Link href="/delete-account">Xóa tài khoản</Link>
        </nav>
      </footer>
    </main>
  );
}
