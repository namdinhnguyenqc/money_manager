'use client';

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { API_URL } from '@/lib/api';
import Logo from "@/components/ui/Logo";
import {
  Building2,
  Receipt,
  ShieldCheck,
  QrCode,
  Bot,
  Sparkles,
  Cpu,
  Check,
  Menu,
  X,
  ChevronRight,
  DoorOpen,
  Users,
  FileText,
  CreditCard,
  Wallet,
  CalendarCheck,
  MessageCircle,
  BellRing,
  TrendingUp,
  AlertTriangle,
  MessageSquareText,
  Eye
} from "lucide-react";

interface StepData {
  title: string;
  text: string;
}

interface BlogPost {
  id: number | string;
  slug?: string;
  title: string;
  category: string;
  badgeColor: string;
  image: string;
  description: string;
  source: string;
  content: React.ReactNode;
  views?: number;
}

const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "Cách Quản Lý Phòng Trọ Hiệu Quả Cho Chủ Nhà Mới",
    category: "Kinh nghiệm",
    badgeColor: "bg-emerald-100 text-emerald-800",
    image: "/blog/room-management.png",
    description: "Tổng hợp kinh nghiệm thực tế từ sàng lọc khách thuê đến lập hợp đồng và cấn trừ tiền cọc phòng rõ ràng...",
    source: "TrọCare & Kinh nghiệm từ Hiệp hội Chủ trọ Việt Nam",
    content: (
      <div className="prose max-w-none text-[#0f172a] space-y-4">
        <p className="text-slate-600">Quản lý phòng trọ cho thuê là một kênh đầu tư mang lại dòng tiền ổn định. Tuy nhiên, đối với những chủ trọ mới bắt đầu, việc vận hành một hoặc nhiều dãy trọ có thể phát sinh vô vàn khó khăn nếu không có phương pháp quản lý khoa học.</p>
        <h3 className="text-xl font-bold text-slate-800">1. Những thách thức phổ biến của chủ trọ mới</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Lưu trữ thông tin rời rạc:</strong> Thường dùng sổ tay hoặc file Excel rời rạc dẫn đến việc thất lạc thông tin CCCD hoặc số điện thoại liên lạc của khách thuê.</li>
          <li><strong>Nhầm lẫn công nợ:</strong> Việc tính toán thủ công từng số điện, số nước kèm theo các phí dịch vụ hàng tháng rất dễ dẫn đến sai sót và tranh cãi.</li>
          <li><strong>Trễ hạn đóng tiền:</strong> Không có quy trình nhắc nhở chuyên nghiệp khiến chủ trọ rơi vào cảnh phải đi đòi tiền phòng nhiều lần rất mệt mỏi.</li>
        </ul>
        
        <h3 className="text-xl font-bold text-slate-800">2. Quy trình 4 bước quản lý phòng trọ tối ưu</h3>
        <div className="space-y-3">
          <div className="p-4 bg-blue-50/50 border-l-4 border-blue-500 rounded-lg">
            <h4 className="font-semibold text-blue-900">Bước 1: Sàng lọc khách thuê</h4>
            <p className="text-sm text-blue-800">Kiểm tra kỹ giấy tờ tùy thân, xác minh công việc và mục đích thuê phòng để hạn chế rủi ro an ninh trong khu vực trọ.</p>
          </div>
          <div className="p-4 bg-blue-50/50 border-l-4 border-blue-500 rounded-lg">
            <h4 className="font-semibold text-blue-900">Bước 2: Soạn thảo hợp đồng chặt chẽ</h4>
            <p className="text-sm text-blue-800">Ghi rõ kỳ hạn thuê, số tiền đặt cọc (thường từ 1-2 tháng tiền phòng), hạn đóng tiền hàng tháng và các quy chuẩn sử dụng tài sản chung.</p>
          </div>
          <div className="p-4 bg-blue-50/50 border-l-4 border-blue-500 rounded-lg">
            <h4 className="font-semibold text-blue-900">Bước 3: Ghi nhận chỉ số minh bạch</h4>
            <p className="text-sm text-blue-800">Ghi chép chỉ số điện nước công khai vào ngày cố định hàng tháng, chụp ảnh làm bằng chứng đối chiếu gửi kèm hóa đơn cho khách.</p>
          </div>
          <div className="p-4 bg-blue-50/50 border-l-4 border-blue-500 rounded-lg">
            <h4 className="font-semibold text-blue-900">Bước 4: Sử dụng công cụ tự động</h4>
            <p className="text-sm text-blue-800">Thay thế sổ sách bằng phần mềm quản lý để tự động tính tiền, nhắc việc và quản lý thông tin tập trung.</p>
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-800">3. Ứng dụng công nghệ để giải phóng sức lao động</h3>
        <p>Hiện nay, đa số các chủ trọ hiện đại đã chuyển dịch sang dùng phần mềm quản lý trọ thông minh như <strong>TrọCare</strong>. Việc số hóa giúp giảm thiểu 80% thời gian tính toán thủ công và tự động hóa toàn bộ việc lập hóa đơn chỉ với vài thao tác nhấp chuột.</p>
      </div>
    )
  },
  {
    id: 2,
    title: "Cách Ghi Chỉ Số Điện Nước Phòng Trọ Chính Xác & Chống Thất Thoát",
    category: "Hướng dẫn",
    badgeColor: "bg-blue-100 text-blue-800",
    image: "/blog/meter-reading.png",
    description: "Các quy định đọc công tơ điện nước, tính toán đơn giá đúng luật và những phương án khắc phục thất thoát nước ngầm...",
    source: "Điện lực EVN & Quy định Cấp nước sinh hoạt",
    content: (
      <div className="prose max-w-none text-[#0f172a] space-y-4">
        <p className="text-slate-600">Thất thoát điện nước là một trong những nguyên nhân phổ biến khiến chủ trọ bị hao hụt lợi nhuận thực tế. Để hạn chế vấn đề này, chủ trọ cần nắm rõ cách ghi nhận chỉ số chính xác và thiết lập hệ thống giám sát khoa học.</p>
        
        <h3 className="text-xl font-bold text-slate-800">1. Cách đọc công tơ điện và đồng hồ nước chuẩn xác</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Đối với công tơ điện:</strong> Đọc các chữ số màu đen hiển thị trên màn hình hiển thị (bỏ qua chữ số màu đỏ sau cùng hiển thị hàng thập phân). Ghi nhận chỉ số vào cùng một ngày cố định hàng tháng (ví dụ: ngày 25 hoặc ngày 30).</li>
          <li><strong>Đối với đồng hồ nước:</strong> Xem số mét khối hiển thị trên dãy số cơ học chính. Đảm bảo nắp đồng hồ đóng kín và không bị đọng nước bên trong làm mờ số.</li>
        </ul>
        
        <h3 className="text-xl font-bold text-slate-800">2. Phương pháp phòng chống thất thoát nước ngầm hiệu quả</h3>
        <p>Tình trạng rò rỉ nước thường xảy ra âm thầm tại các phao bồn cầu, vòi rửa chén, hoặc bồn chứa nước sân thượng. Chủ trọ nên áp dụng các mẹo sau:</p>
        <ul className="list-decimal pl-5 space-y-2">
          <li><strong>Kiểm tra định kỳ:</strong> Yêu cầu khách khóa tất cả các thiết bị nước trong phòng, sau đó kiểm tra xem kim đồng hồ nước tổng hoặc đồng hồ phòng có tự quay hay không.</li>
          <li><strong>Lắp đặt thiết bị chất lượng:</strong> Tránh sử dụng các loại van nước giá rẻ dễ bị mài mòn sau vài tháng sử dụng.</li>
        </ul>

        <h3 className="text-xl font-bold text-slate-800">3. Quy định của nhà nước về đơn giá bán điện cho người thuê trọ</h3>
        <p>Theo Thông tư của Bộ Công Thương, chủ trọ có thể đăng ký định mức sử dụng điện cho người thuê trọ (cứ 4 người tính 1 định mức hộ sử dụng điện sinh hoạt), hoặc áp dụng mức giá bán lẻ điện sinh hoạt bậc 3 cho toàn bộ sản lượng đo được nếu không xác định được số người thuê.</p>
      </div>
    )
  },
  {
    id: 3,
    title: "Thủ Tục Đăng Ký Giấy Phép Kinh Doanh Hộ Cá Thể Cho Chủ Trọ",
    category: "Thủ tục",
    badgeColor: "bg-indigo-100 text-indigo-800",
    image: "/blog/business-license.png",
    description: "Hướng dẫn các bước xin cấp đăng ký kinh doanh cho thuê nhà và quy trình khai báo thuế thu nhập cá nhân chủ trọ...",
    source: "Tổng cục Thuế Việt Nam & Luật Doanh nghiệp hiện hành",
    content: (
      <div className="prose max-w-none text-[#0f172a] space-y-4">
        <p className="text-slate-600">Hoạt động cho thuê nhà trọ, phòng trọ là hình thức kinh doanh dịch vụ lưu trú. Do đó, để hoạt động hợp pháp và tránh các chế tài xử lý hành chính từ cơ quan quản lý, chủ trọ cần đăng ký giấy phép kinh doanh.</p>
        
        <h3 className="text-xl font-bold text-slate-800">1. Các giấy tờ cần chuẩn bị trong hồ sơ đăng ký kinh doanh</h3>
        <p>Chủ nhà trọ chuẩn bị 01 bộ hồ sơ xin thành lập Hộ kinh doanh cá thể gồm:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Giấy đề nghị đăng ký hộ kinh doanh (theo mẫu chuẩn quy định).</li>
          <li>Bản sao hợp lệ Căn cước công dân (CCCD) của chủ hộ kinh doanh.</li>
          <li>Bản sao giấy chứng nhận quyền sở hữu nhà và quyền sử dụng đất (Sổ hồng/Sổ đỏ) nơi đặt địa điểm kinh doanh nhà trọ.</li>
        </ul>
        
        <h3 className="text-xl font-bold text-slate-800">2. Quy trình thực hiện các bước</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li><strong>Bước 1:</strong> Nộp hồ sơ tại bộ phận tiếp nhận hồ sơ hành chính (Một cửa) thuộc UBND Quận/Huyện sở tại, hoặc đăng ký trực tuyến qua hệ thống dịch vụ công.</li>
          <li><strong>Bước 2:</strong> Cơ quan chức năng tiếp nhận, kiểm tra tính hợp lệ của hồ sơ trong vòng 3 ngày làm việc.</li>
          <li><strong>Bước 3:</strong> Nhận giấy chứng nhận đăng ký hộ kinh doanh và thực hiện đăng ký mã số thuế hộ kinh doanh tại chi cục thuế địa phương.</li>
        </ol>

        <h3 className="text-xl font-bold text-slate-800">3. Nghĩa vụ thuế thu nhập đối với kinh doanh nhà trọ</h3>
        <p>Chủ trọ có doanh thu từ cho thuê nhà trọ vượt quá 100 triệu đồng/năm sẽ có nghĩa vụ nộp thuế GTGT (5% doanh thu) và thuế TNCN (5% doanh thu), tổng cộng là 10% trên doanh thu cho thuê thực tế nhận được.</p>
      </div>
    )
  },
  {
    id: 4,
    title: "Tiêu Chuẩn Phòng Cháy Chữa Cháy (PCCC) Cho Nhà Trọ Mới Nhất",
    category: "Quy định",
    badgeColor: "bg-red-100 text-red-800",
    image: "/blog/fire-safety.png",
    description: "Quy định lắp đặt bình chữa cháy, đầu khói cảnh báo và thiết lập lối thoát hiểm thứ 2 an toàn cho chung cư mini...",
    source: "Bộ Công an - Cục Cảnh sát PCCC & CNCH",
    content: (
      <div className="prose max-w-none text-[#0f172a] space-y-4">
        <p className="text-slate-600">Đảm bảo an toàn phòng cháy chữa cháy (PCCC) không chỉ là nghĩa vụ bắt buộc theo luật pháp hiện hành mà còn bảo vệ trực tiếp tài sản của chủ trọ và tính mạng của những khách thuê đang sinh sống tại đây.</p>
        
        <h3 className="text-xl font-bold text-slate-800">1. Thiết kế lối thoát nạn và cầu thang thoát hiểm an toàn</h3>
        <p>Đối với nhà trọ cao tầng hoặc chung cư mini, tiêu chuẩn thoát hiểm bắt buộc phải đảm bảo:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Phải có ít nhất 2 lối thoát nạn độc lập (Ví dụ: Cầu thang chính bên trong nhà và cầu thang sắt thoát hiểm ngoài trời).</li>
          <li>Hành lang thoát nạn, lối dẫn ra cửa thoát hiểm phải luôn thông thoáng, không chứa đồ đạc cản trở đường đi.</li>
          <li>Ban công không được bịt kín kiểu chuồng cọp rào sắt, bắt buộc phải thiết kế cửa mở thoát hiểm khẩn cấp.</li>
        </ul>
        
        <h3 className="text-xl font-bold text-slate-800">2. Lắp đặt các trang thiết bị chữa cháy tiêu chuẩn</h3>
        <ul className="list-decimal pl-5 space-y-2">
          <li><strong>Bình chữa cháy xách tay:</strong> Mỗi tầng lầu phải bố trí tối thiểu 02 bình bột ABC hoặc bình khí CO2 tại vị trí dễ thấy và dễ tiếp cận.</li>
          <li><strong>Hệ thống cảnh báo cháy:</strong> Lắp đặt đầu báo khói tự động tại khu vực hành lang chung và bếp nấu của các phòng.</li>
          <li><strong>Hệ thống đèn chiếu sáng sự cố:</strong> Đèn EXIT chỉ hướng lối thoát và đèn pin tự sạc khi mất nguồn điện lưới chính.</li>
        </ul>

        <h3 className="text-xl font-bold text-slate-800">3. Quy định về khu vực sạc và đỗ xe điện</h3>
        <p>Nhà xe phải được trang bị hệ thống ngắt điện sạc tự động theo thời gian hoặc nhiệt độ. Không cắm sạc xe điện qua đêm mà không có người trông coi. Bố trí vách ngăn chống cháy lan ngăn cách khu vực để xe điện với lối thoát nạn chính của tòa nhà.</p>
      </div>
    )
  }
];

export default function LandingPageClient() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [activeAccordion, setActiveAccordion] = useState<number>(0);
  const [activeSection, setActiveSection] = useState<string>("");
  const [dbPosts, setDbPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const res = await fetch(`${API_URL}/public/articles?limit=4`);
        if (res.ok) {
          const json = await res.json();
          const mapped: BlogPost[] = (json.data || []).map((art: any) => ({
            id: art.id,
            slug: art.slug,
            title: art.title,
            category: art.category,
            badgeColor: 
              art.category === "Kinh nghiệm" ? "bg-emerald-100 text-emerald-800" :
              art.category === "Hướng dẫn" ? "bg-blue-100 text-blue-800" :
              art.category === "Thủ tục" ? "bg-indigo-100 text-indigo-800" :
              "bg-red-100 text-red-800",
            image: art.image_url || "/blog/room-management.png",
            description: art.description || "Nhấp để xem chi tiết bài viết...",
            source: art.source || "TrọCare & Biên soạn chuyên nghiệp",
            content: <div dangerouslySetInnerHTML={{ __html: art.content }} />,
            views: art.views || 0,
          }));
          
          if (mapped.length > 0) {
            setDbPosts(mapped);
          } else {
            setDbPosts(blogPosts);
          }
        } else {
          setDbPosts(blogPosts);
        }
      } catch (err) {
        console.warn("Failed to fetch dynamic articles, using static fallback:", err);
        setDbPosts(blogPosts);
      } finally {
        setLoadingPosts(false);
      }
    };
    loadPosts();
  }, []);

  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuCloseRef = useRef<HTMLButtonElement>(null);

  // Track window scroll for Navbar height & background transition
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 80) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // IntersectionObserver for Scroll Reveal animations
  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );
    revealElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Scroll Spy to highlight active section in Navbar
  useEffect(() => {
    const sections = document.querySelectorAll("section[id]");
    const handleScrollSpy = () => {
      let currentSectionId = "";
      sections.forEach((sec) => {
        const secTop = (sec as HTMLElement).offsetTop - 120;
        if (window.scrollY >= secTop) {
          currentSectionId = sec.getAttribute("id") || "";
        }
      });
      setActiveSection(currentSectionId);
    };
    window.addEventListener("scroll", handleScrollSpy);
    return () => window.removeEventListener("scroll", handleScrollSpy);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    mobileMenuCloseRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      mobileMenuButtonRef.current?.focus();
    };
  }, [isMobileMenuOpen]);

  const stepsData: Record<number, StepData> = {
    1: {
      title: "Bước 1: Tạo dãy trọ",
      text: "Thiết lập các thông tin cơ bản về dãy nhà trọ, vị trí và các quy tắc chung quy định trong khu vực cho thuê."
    },
    2: {
      title: "Bước 2: Thêm phòng",
      text: "Tạo chi tiết các phòng đơn lẻ, cập nhật đơn giá cho thuê mặc định và các tiện ích dịch vụ đi kèm."
    },
    3: {
      title: "Bước 3: Nhập khách thuê",
      text: "Ghi chép thông tin lý lịch cá nhân, số căn cước công dân và liên hệ của người thuê phòng."
    },
    4: {
      title: "Bước 4: Ký hợp đồng",
      text: "Kích hoạt thời hạn cho thuê chính thức, mức đặt cọc phòng và điều khoản phạt nếu có."
    },
    5: {
      title: "Bước 5: Lập hóa đơn",
      text: "Tổng hợp các phí phát sinh thực tế (điện nước dùng trong tháng, wifi, rác) và in biểu mẫu hóa đơn."
    },
    6: {
      title: "Bước 6: Nhận thanh toán",
      text: "Hệ thống tự động liên kết với ngân hàng ACB xuất QR thanh toán hóa đơn riêng, đối soát qua SePay."
    },
    7: {
      title: "Bước 7: Xem sổ quỹ",
      text: "Biểu diễn trực quan dòng tiền thu chi tức thời, tổng kết lợi nhuận kinh doanh sạch sẽ của từng tháng."
    }
  };

  return (
    <main className="trocare-landing">
      {/* SECTION 1 — NAVBAR */}
      <header className={`navbar ${isScrolled ? "scrolled" : ""}`}>
        <div className="container">
          <Link href="/" className="logo-container">
            <Logo />
          </Link>
          
          <nav className="nav-links">
            <a href="#features" className={activeSection === "features" ? "active" : ""}>Tính năng</a>
            <a href="#workflow" className={activeSection === "workflow" ? "active" : ""}>Quy trình</a>
            <a href="#payment" className={activeSection === "payment" ? "active" : ""}>Thanh toán</a>
            <a href="#ai" className={activeSection === "ai" ? "active" : ""}>AI</a>
            <a href="#blog" className={activeSection === "blog" ? "active" : ""}>Tin tức</a>
          </nav>
          
          <div className="nav-cta">
            <Link href="/login" className="btn btn-outline" data-cta="secondary">Đăng nhập</Link>
            <Link href="/login" className="btn btn-primary" data-cta="primary">Dùng miễn phí</Link>
            <button 
              ref={mobileMenuButtonRef}
              className="mobile-nav-toggle" 
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Mở trình đơn"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <>
          <button
            className="mobile-drawer-overlay active"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Đóng trình đơn"
          />
          <aside
            id="mobile-navigation"
            className="mobile-drawer active"
            aria-label="Trình đơn di động"
          >
            <button
              ref={mobileMenuCloseRef}
              className="mobile-drawer-close"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Đóng trình đơn"
            >
              <X size={24} />
            </button>
            <nav className="mobile-nav-links" aria-label="Điều hướng di động">
              <a href="#features" onClick={() => setIsMobileMenuOpen(false)}>Tính năng</a>
              <a href="#workflow" onClick={() => setIsMobileMenuOpen(false)}>Quy trình</a>
              <a href="#payment" onClick={() => setIsMobileMenuOpen(false)}>Thanh toán</a>
              <a href="#ai" onClick={() => setIsMobileMenuOpen(false)}>AI</a>
              <a href="#blog" onClick={() => setIsMobileMenuOpen(false)}>Tin tức</a>
            </nav>
            <div className="mobile-drawer-actions">
              <Link href="/login" className="btn btn-outline" data-cta="secondary">Đăng nhập</Link>
              <Link href="/login" className="btn btn-primary" data-cta="primary">Dùng miễn phí</Link>
            </div>
          </aside>
        </>
      )}

      {/* SECTION 2 — HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-left">
              <div className="hero-badge">
                <span>✦ Uy Tín · Bảo Mật · Miễn Phí Mãi Mãi</span>
              </div>
              <h1>Phần mềm quản lý trọ miễn phí, nhìn rõ <span>từng phòng từng đồng</span>.</h1>
              <p className="hero-subtext">TrọCare là phần mềm quản lý phòng trọ miễn phí chuyên nghiệp giúp chủ trọ quản lý dãy trọ, phòng, khách thuê, hợp đồng, hóa đơn và doanh thu thu chi tự động.</p>
              
              <div className="hero-actions">
                <Link href="/login" className="btn btn-primary" data-cta="primary">Bắt đầu miễn phí →</Link>
                <a href="#features" className="btn btn-ghost" data-cta="secondary">Xem tính năng ↓</a>
              </div>
              
              <div className="hero-stats">
                <div className="stat-item">
                  <h3>0đ</h3>
                  <p>chi phí bắt đầu</p>
                </div>
                <div className="stat-item">
                  <h3>7 bước</h3>
                  <p>từ phòng đến thu tiền</p>
                </div>
                <div className="stat-item">
                  <h3>Tự động</h3>
                  <p>đối soát QR SePay</p>
                </div>
              </div>
            </div>

            {/* App Mockup */}
            <div className="hero-right">
              <div className="mockup-container">
                <div className="mockup-header">
                  <h4>Vận hành T06/2026</h4>
                  <span className="mockup-header-badge">Đang vận hành</span>
                </div>
                
                <div className="mockup-metrics">
                  <div className="metric-card">
                    <span>phòng thuê</span>
                    <strong>28</strong>
                  </div>
                  <div className="metric-card">
                    <span>đã thu</span>
                    <strong>84%</strong>
                  </div>
                  <div className="metric-card">
                    <span>cần nhắc</span>
                    <strong>5</strong>
                  </div>
                </div>
                
                <div className="mockup-rooms">
                  <div className="room-row">
                    <div className="room-row-info">
                      <h5>P101</h5>
                      <span className="room-row-badge badge-rented">Đang thuê</span>
                    </div>
                    <span className="room-price">3.500.000đ</span>
                  </div>
                  <div className="room-row">
                    <div className="room-row-info">
                      <h5>P102</h5>
                      <span className="room-row-badge badge-empty">Trống</span>
                    </div>
                    <span className="room-price">2.800.000đ</span>
                  </div>
                  <div className="room-row">
                    <div className="room-row-info">
                      <h5>P103</h5>
                      <span className="room-row-badge badge-waiting">Chờ cọc</span>
                    </div>
                    <span className="room-price">3.200.000đ</span>
                  </div>
                  <div className="room-row">
                    <div className="room-row-info">
                      <h5>P104</h5>
                      <span className="room-row-badge badge-rented">Đang thuê</span>
                    </div>
                    <span className="room-price">2.500.000đ</span>
                  </div>
                </div>
                
                <div className="mockup-footer">
                  <span>3 hóa đơn cần nhắc · QR ACB sẵn sàng</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — SOCIAL PROOF BAR */}
      <section className="social-proof">
        <div className="container">
          <div className="social-proof-content">
            <p>Đang được dùng bởi 200+ chủ trọ trên cả nước</p>
            <div className="social-logos">
              <span>ACB Bank</span>
              <span>SePay</span>
              <span>Zalo OA</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — FEATURES */}
      <section className="features" id="features">
        <div className="container">
          <div className="features-header reveal">
            <span className="eyebrow">Tính năng phần mềm quản lý trọ miễn phí</span>
            <h2>Giải pháp quản lý phòng trọ miễn phí toàn diện</h2>
            <p>Giúp chủ dãy trọ và nhà cho thuê số hóa quy trình vận hành, tự động lập hóa đơn và đối soát thanh toán.</p>
          </div>

          {/* Desktop 3-column Layout */}
          <div className="features-layout">
            {/* Column 1: Quản lý cơ bản */}
            <div className="feature-group-column">
              <div className="feature-group-header">
                <Building2 size={20} />
                <h3>Quản lý cơ bản</h3>
              </div>
              
              <div className="feature-card">
                <div className="feature-card-header">
                  <DoorOpen size={18} />
                  <h4>Dãy trọ & phòng</h4>
                </div>
                <p>Theo dõi chi tiết giá thuê phòng, số người ở và cập nhật trạng thái thuê linh hoạt.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-card-header">
                  <Users size={18} />
                  <h4>Khách thuê</h4>
                </div>
                <p>Lưu giữ thông tin liên hệ, căn cước công dân và lịch sử lưu trú của từng khách thuê.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-card-header">
                  <FileText size={18} />
                  <h4>Hợp đồng</h4>
                </div>
                <p>Quản lý kỳ hạn thuê, các điều khoản ràng buộc và đối soát tiền đặt cọc khi tất toán.</p>
              </div>
            </div>

            {/* Column 2: Thu chi & Thanh toán */}
            <div className="feature-group-column">
              <div className="feature-group-header">
                <CreditCard size={20} />
                <h3>Thu chi & Thanh toán</h3>
              </div>
              
              <div className="feature-card">
                <div className="feature-card-header">
                  <Receipt size={18} />
                  <h4>Hóa đơn</h4>
                </div>
                <p>Tính tự động tiền điện nước, dịch vụ kèm theo, cấn trừ nợ cũ và xuất biên nhận online.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-card-header">
                  <Wallet size={18} />
                  <h4>Sổ quỹ</h4>
                </div>
                <p>Theo dõi chính xác dòng tiền vào ra, phân loại danh mục thu chi phòng trọ rõ ràng.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-card-header">
                  <QrCode size={18} />
                  <h4>QR SePay</h4>
                </div>
                <p>Xuất mã QR riêng biệt cho từng hóa đơn, nhận thông báo chuyển khoản đối soát tức thì.</p>
              </div>
            </div>

            {/* Column 3: Giao tiếp & Nhắc việc */}
            <div className="feature-group-column">
              <div className="feature-group-header">
                <BellRing size={20} />
                <h3>Giao tiếp & Nhắc việc</h3>
              </div>
              
              <div className="feature-card">
                <div className="feature-card-header">
                  <CalendarCheck size={18} />
                  <h4>Nhắc việc</h4>
                </div>
                <p>Nhận cảnh báo sớm về các hóa đơn trễ hạn và các hợp đồng sắp sửa hết hiệu lực.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-card-header">
                  <MessageCircle size={18} />
                  <h4>Zalo OA</h4>
                </div>
                <p>Gửi tin nhắn thông báo hóa đơn tự động trực tiếp đến tài khoản Zalo của từng khách hàng.</p>
              </div>
            </div>
          </div>

          {/* Mobile Accordion Layout */}
          <div className="features-mobile-accordion">
            {/* Accordion Item 1 */}
            <div className={`accordion-item ${activeAccordion === 0 ? "active" : ""}`}>
              <button
                className="accordion-trigger"
                onClick={() => setActiveAccordion(activeAccordion === 0 ? -1 : 0)}
                aria-expanded={activeAccordion === 0}
                aria-controls="feature-panel-basic"
              >
                <span>Quản lý cơ bản</span>
                <ChevronRight size={18} />
              </button>
              <div 
                id="feature-panel-basic"
                className="accordion-content" 
                aria-hidden={activeAccordion !== 0}
                style={{ maxHeight: activeAccordion === 0 ? "1000px" : "0" }}
              >
                <div className="mobile-feature-list">
                  <div className="feature-card">
                    <div className="feature-card-header">
                      <DoorOpen size={18} />
                      <h4>Dãy trọ & phòng</h4>
                    </div>
                    <p>Theo dõi chi tiết giá thuê phòng, số người ở và cập nhật trạng thái thuê linh hoạt.</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-card-header">
                      <Users size={18} />
                      <h4>Khách thuê</h4>
                    </div>
                    <p>Lưu giữ thông tin liên hệ, căn cước công dân và lịch sử lưu trú của từng khách thuê.</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-card-header">
                      <FileText size={18} />
                      <h4>Hợp đồng</h4>
                    </div>
                    <p>Quản lý kỳ hạn thuê, các điều khoản ràng buộc và đối soát tiền đặt cọc khi tất toán.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Accordion Item 2 */}
            <div className={`accordion-item ${activeAccordion === 1 ? "active" : ""}`}>
              <button
                className="accordion-trigger"
                onClick={() => setActiveAccordion(activeAccordion === 1 ? -1 : 1)}
                aria-expanded={activeAccordion === 1}
                aria-controls="feature-panel-payment"
              >
                <span>Thu chi & Thanh toán</span>
                <ChevronRight size={18} />
              </button>
              <div 
                id="feature-panel-payment"
                className="accordion-content" 
                aria-hidden={activeAccordion !== 1}
                style={{ maxHeight: activeAccordion === 1 ? "1000px" : "0" }}
              >
                <div className="mobile-feature-list">
                  <div className="feature-card">
                    <div className="feature-card-header">
                      <Receipt size={18} />
                      <h4>Hóa đơn</h4>
                    </div>
                    <p>Tính tự động tiền điện nước, dịch vụ kèm theo, cấn trừ nợ cũ và xuất biên nhận online.</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-card-header">
                      <Wallet size={18} />
                      <h4>Sổ quỹ</h4>
                    </div>
                    <p>Theo dõi chính xác dòng tiền vào ra, phân loại danh mục thu chi phòng trọ rõ ràng.</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-card-header">
                      <QrCode size={18} />
                      <h4>QR SePay</h4>
                    </div>
                    <p>Xuất mã QR riêng biệt cho từng hóa đơn, nhận thông báo chuyển khoản đối soát tức thì.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Accordion Item 3 */}
            <div className={`accordion-item ${activeAccordion === 2 ? "active" : ""}`}>
              <button
                className="accordion-trigger"
                onClick={() => setActiveAccordion(activeAccordion === 2 ? -1 : 2)}
                aria-expanded={activeAccordion === 2}
                aria-controls="feature-panel-communication"
              >
                <span>Giao tiếp & Nhắc việc</span>
                <ChevronRight size={18} />
              </button>
              <div 
                id="feature-panel-communication"
                className="accordion-content" 
                aria-hidden={activeAccordion !== 2}
                style={{ maxHeight: activeAccordion === 2 ? "1000px" : "0" }}
              >
                <div className="mobile-feature-list">
                  <div className="feature-card">
                    <div className="feature-card-header">
                      <CalendarCheck size={18} />
                      <h4>Nhắc việc</h4>
                    </div>
                    <p>Nhận cảnh báo sớm về các hóa đơn trễ hạn và các hợp đồng sắp sửa hết hiệu lực.</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-card-header">
                      <MessageCircle size={18} />
                      <h4>Zalo OA</h4>
                    </div>
                    <p>Gửi tin nhắn thông báo hóa đơn tự động trực tiếp đến tài khoản Zalo của từng khách hàng.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — WORKFLOW */}
      <section className="workflow" id="workflow">
        <div className="container">
          <div className="features-header reveal">
            <span className="eyebrow">Bắt đầu trong 15 phút</span>
            <h2>Vào app lần đầu vẫn biết phải làm gì tiếp theo.</h2>
          </div>

          {/* Desktop Visual Step Bar */}
          <div className="workflow-bar-wrapper reveal">
            <div className="workflow-bar-line"></div>
            <div 
              className="workflow-bar-progress" 
              style={{ width: `${((activeStep - 1) / 6) * 100}%` }}
            ></div>
            
            <div className="workflow-steps">
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <button 
                  key={num}
                  className={`workflow-step-node ${activeStep >= num ? "active" : ""}`}
                  onClick={() => setActiveStep(num)}
                  aria-pressed={activeStep === num}
                >
                  <div className="workflow-circle">{num}</div>
                  <span>
                    {num === 1 && "Tạo dãy trọ"}
                    {num === 2 && "Thêm phòng"}
                    {num === 3 && "Nhập khách thuê"}
                    {num === 4 && "Ký hợp đồng"}
                    {num === 5 && "Lập hóa đơn"}
                    {num === 6 && "Nhận thanh toán"}
                    {num === 7 && "Xem sổ quỹ"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Detail Card Box */}
          <div className="workflow-desc-box reveal">
            <h4>{stepsData[activeStep]?.title}</h4>
            <p>{stepsData[activeStep]?.text}</p>
          </div>

          {/* Mobile Vertical Timeline */}
          <div className="mobile-workflow-timeline">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <div 
                key={num}
                className={`mobile-timeline-item ${activeStep === num ? "active" : ""}`}
                onClick={() => setActiveStep(num)}
              >
                <div className="mobile-timeline-circle">{num}</div>
                <div className="mobile-timeline-content">
                  <h4>
                    {num === 1 && "Tạo dãy trọ"}
                    {num === 2 && "Thêm phòng"}
                    {num === 3 && "Nhập khách thuê"}
                    {num === 4 && "Ký hợp đồng"}
                    {num === 5 && "Lập hóa đơn"}
                    {num === 6 && "Nhận thanh toán"}
                    {num === 7 && "Xem sổ quỹ"}
                  </h4>
                  <p>{stepsData[num]?.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 — QR PAYMENT */}
      <section className="qr-payment" id="payment">
        <div className="container">
          <div className="qr-grid">
            <div className="qr-text reveal">
              <span className="eyebrow">Thu tiền rõ ràng</span>
              <h2>Mỗi hóa đơn có mã riêng, QR riêng, trạng thái riêng.</h2>
              <p>Hạn chế tối đa sai lệch thông tin và nhầm lẫn đối soát chuyển khoản của từng phòng hàng tháng.</p>
              
              <ul className="qr-bullets">
                <li className="qr-bullet">
                  <Check size={18} />
                  <span>Khách thấy ngay số tiền, từng khoản chi tiết điện nước rõ ràng.</span>
                </li>
                <li className="qr-bullet">
                  <Check size={18} />
                  <span>Mã QR chuyển khoản ACB được mã hóa tự động riêng biệt cho từng hóa đơn.</span>
                </li>
                <li className="qr-bullet">
                  <Check size={18} />
                  <span>SePay nhận giao dịch báo có ngay lập tức → tự đối soát chuẩn xác theo mã hóa đơn.</span>
                </li>
              </ul>
            </div>

            <div className="qr-visual reveal">
              <div className="invoice-card">
                <div className="invoice-header">
                  <h4>Thông báo tiền phòng T6/2026</h4>
                  <span>Phòng P109 — Dãy A</span>
                </div>
                
                <div className="invoice-card-lines">
                  <div className="invoice-card-line">
                    <span>Phòng:</span>
                    <span>2.300.000đ</span>
                  </div>
                  <div className="invoice-card-line">
                    <span>Điện (234 số):</span>
                    <span>234.600đ</span>
                  </div>
                  <div className="invoice-card-line">
                    <span>Nước:</span>
                    <span>100.000đ</span>
                  </div>
                  <div className="invoice-card-line">
                    <span>Rác:</span>
                    <span>36.500đ</span>
                  </div>
                  <div className="invoice-card-line total">
                    <span>Tổng:</span>
                    <span>2.671.100đ</span>
                  </div>
                </div>

                <div className="invoice-qr-section">
                  <div className="invoice-qr-desc">
                    <h5>Quét chuyển khoản</h5>
                    <p>Nội dung: TCINV-P109</p>
                  </div>
                  <div className="invoice-qr-box">
                    <span>QR</span>
                  </div>
                </div>

                <div className="invoice-footer">
                  <span>ACB · TCINV-P109</span>
                  <span className="badge-warning-custom">Chờ thanh toán</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7 — AI */}
      <section className="ai-section" id="ai">
        <div className="container">
          <div className="ai-header reveal">
            <span className="eyebrow">AI cho vận hành cho thuê</span>
            <h2>Không thay chủ trọ quyết định, chỉ giúp nhìn việc nhanh hơn.</h2>
            <p>Tích hợp mô hình AI gợi ý xử lý các vấn đề quản lý, tính toán dòng tiền tối ưu.</p>
          </div>

          <div className="ai-grid reveal">
            <div className="ai-card">
              <div className="ai-card-icon">
                <BellRing size={20} />
              </div>
              <h4>Gợi ý nhắc nợ</h4>
              <p>Tự động phân tích lịch sử trả tiền và đề xuất danh sách phòng trọ cần nhắc thanh toán sớm.</p>
            </div>

            <div className="ai-card">
              <div className="ai-card-icon">
                <TrendingUp size={20} />
              </div>
              <h4>Tóm tắt dòng tiền</h4>
              <p>Tổng hợp biểu đồ doanh thu chi tiết, đưa ra dự báo luồng tiền nhận được vào cuối tháng.</p>
            </div>

            <div className="ai-card">
              <div className="ai-card-icon">
                <AlertTriangle size={20} />
              </div>
              <h4>Cảnh báo bất thường</h4>
              <p>Nhận diện nhanh chóng các biến động đột biến về chỉ số tiêu thụ điện nước của từng dãy trọ.</p>
            </div>

            <div className="ai-card">
              <div className="ai-card-icon">
                <MessageSquareText size={20} />
              </div>
              <h4>Soạn tin Zalo</h4>
              <p>AI hỗ trợ viết biểu mẫu thông báo tiền phòng bằng văn phong nhã nhặn, lịch sự tự động.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7.5 — BLOG */}
      <section className="faq-section" id="blog" style={{ background: '#ffffff', paddingBottom: '40px' }}>
        <div className="container">
          <div className="features-header reveal">
            <span className="eyebrow">Tin tức & Chia sẻ</span>
            <h2>Tin tức & Kinh nghiệm vận hành nhà trọ</h2>
            <p>Tổng hợp các bài viết hướng dẫn nghiệp vụ, chia sẻ kinh nghiệm thực tế, pháp lý và PCCC mới nhất.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8 reveal">
            {dbPosts.map((post) => (
              <Link
                key={post.id}
                href={post.slug ? `/tin-tuc/${post.slug}` : "/tin-tuc"}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full"
              >
                <div className="relative h-48 w-full bg-slate-100">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex justify-between items-center mb-3">
                    <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${post.badgeColor}`}>
                      {post.category}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Eye size={12} /> {post.views || 0}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-[#0f172a] mb-2 line-clamp-2 hover:text-[#2563EB] transition-colors">
                    {post.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-3 mb-4 flex-grow">
                    {post.description}
                  </p>
                  <span className="text-xs font-bold text-[#2563EB] hover:text-[#1d4ed8] flex items-center gap-1 self-start mt-auto">
                    Đọc bài viết <ChevronRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8 reveal">
            <Link
              href="/tin-tuc"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2563EB] hover:text-[#1d4ed8]"
            >
              Xem tất cả tin tức <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 8 — FAQ */}
      <section className="faq-section" id="faq">
        <div className="container">
          <div className="features-header reveal">
            <span className="eyebrow">Hỏi nhanh, đáp rõ</span>
            <h2>Những điều chủ trọ thường hỏi trước khi bắt đầu.</h2>
          </div>
          <div className="faq-list reveal">
            <details>
              <summary>TrọCare có thực sự miễn phí không?</summary>
              <p>Có. Bạn có thể bắt đầu quản lý phòng, khách thuê, hợp đồng, hóa đơn và thu chi mà không cần thẻ tín dụng.</p>
            </details>
            <details>
              <summary>Tôi có cần cài phần mềm không?</summary>
              <p>Không. TrọCare chạy trên trình duyệt, bạn chỉ cần đăng nhập để sử dụng trên máy tính hoặc điện thoại.</p>
            </details>
            <details>
              <summary>Dữ liệu quản lý trọ có được bảo mật và an toàn không?</summary>
              <p>Có. TrọCare cam kết bảo mật thông tin tuyệt đối bằng mã hóa SSL/HTTPS kết hợp cơ chế xác thực tài khoản nghiêm ngặt, đảm bảo dữ liệu quản lý phòng trọ của bạn luôn an toàn, uy tín và riêng tư.</p>
            </details>
            <details>
              <summary>Tôi bắt đầu từ đâu?</summary>
              <p>Tạo dãy trọ, thêm phòng, nhập khách thuê và hợp đồng. Quy trình 7 bước phía trên hướng dẫn đầy đủ thứ tự cần làm.</p>
            </details>
          </div>
        </div>
      </section>

      {/* SECTION 9 — FINAL CTA */}
      <section className="final-cta">
        <div className="container reveal">
          <div className="final-cta-content">
            <h2>Bắt đầu miễn phí, chuẩn hóa vận hành từ hôm nay.</h2>
            <p>Nhập phòng trọ một lần. Từ tháng sau, hóa đơn và nhắc nợ tự chạy.</p>
            <Link href="/login" className="btn btn-primary" data-cta="primary">
              Dùng TrọCare miễn phí →
            </Link>
            <span>Không cần thẻ tín dụng · Miễn phí mãi mãi</span>
          </div>
        </div>
      </section>

      {/* SECTION 10 — FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link href="/" className="logo-container">
                <Logo />
              </Link>
            </div>
            
            <div className="footer-col">
              <h4>Sản phẩm</h4>
              <ul className="footer-links">
                <li><a href="#features">Tính năng</a></li>
                <li><a href="#workflow">Quy trình</a></li>
                <li><a href="#payment">Thanh toán QR</a></li>
                <li><a href="#ai">AI vận hành</a></li>
                <li><a href="#blog">Tin tức</a></li>
              </ul>
            </div>
            
            <div className="footer-col">
              <h4>Hỗ trợ</h4>
              <ul className="footer-links">
                <li><a href="#faq">Hỏi đáp</a></li>
                <li><a href="mailto:support@trocare.com">Liên hệ hỗ trợ</a></li>
                <li><a href="#workflow">Hướng dẫn bắt đầu</a></li>
              </ul>
            </div>
            
            <div className="footer-col">
              <h4>Pháp lý</h4>
              <ul className="footer-links">
                <li><Link href="/privacy">Chính sách bảo mật</Link></li>
                <li><Link href="/terms">Điều khoản sử dụng</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="footer-bottom">
            <span>© 2026 TrọCare. Miễn phí cho chủ trọ Việt Nam.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
