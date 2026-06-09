'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  MessageSquareText
} from "lucide-react";

interface StepData {
  title: string;
  text: string;
}

export default function LandingPageClient() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [activeAccordion, setActiveAccordion] = useState<number>(0);
  const [activeSection, setActiveSection] = useState<string>("");

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
          <Link href="/" className="logo">
            <Image
              src="/brand/transparent/trocare-logo-full-transparent-2000.png"
              alt="TroCare"
              width={200}
              height={55}
              priority
              style={{ objectFit: "contain" }}
            />
          </Link>
          
          <nav className="nav-links">
            <a href="#features" className={activeSection === "features" ? "active" : ""}>Tính năng</a>
            <a href="#workflow" className={activeSection === "workflow" ? "active" : ""}>Quy trình</a>
            <a href="#payment" className={activeSection === "payment" ? "active" : ""}>Thanh toán</a>
            <a href="#ai" className={activeSection === "ai" ? "active" : ""}>AI</a>
          </nav>
          
          <div className="nav-cta">
            <Link href="/login" className="btn btn-outline" data-cta="secondary">Đăng nhập</Link>
            <Link href="/login" className="btn btn-primary" data-cta="primary">Dùng miễn phí</Link>
            <button 
              className="mobile-nav-toggle" 
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Mở trình đơn"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer Overlay */}
      <div 
        className={`mobile-drawer-overlay ${isMobileMenuOpen ? "active" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>
      
      {/* Mobile Menu Drawer */}
      <div className={`mobile-drawer ${isMobileMenuOpen ? "active" : ""}`}>
        <button 
          className="mobile-drawer-close" 
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Đóng trình đơn"
        >
          <X size={24} />
        </button>
        <nav className="mobile-nav-links">
          <a href="#features" onClick={() => setIsMobileMenuOpen(false)}>Tính năng</a>
          <a href="#workflow" onClick={() => setIsMobileMenuOpen(false)}>Quy trình</a>
          <a href="#payment" onClick={() => setIsMobileMenuOpen(false)}>Thanh toán</a>
          <a href="#ai" onClick={() => setIsMobileMenuOpen(false)}>AI</a>
        </nav>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "24px" }}>
          <Link href="/login" className="btn btn-outline" style={{ width: "100%" }} data-cta="secondary">Đăng nhập</Link>
          <Link href="/login" className="btn btn-primary" style={{ width: "100%" }} data-cta="primary">Dùng miễn phí</Link>
        </div>
      </div>

      {/* SECTION 2 — HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-left">
              <div className="hero-badge">
                <span>✦ Miễn phí · Không cần cài đặt</span>
              </div>
              <h1>Quản lý nhà trọ miễn phí, nhìn rõ <span>từng phòng từng đồng</span>.</h1>
              <p className="hero-subtext">TroCare giúp chủ trọ quản lý phòng, hóa đơn, thu chi và nhắc nợ — trong một màn hình, không cần Excel.</p>
              
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
            <span className="eyebrow">Tất cả trong một màn hình</span>
            <h2>TroCare quản lý toàn bộ vòng đời cho thuê.</h2>
            <p>Giúp chủ trọ Việt Nam số hóa quy trình và tự động hóa các khâu thu chi phức tạp.</p>
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
              <button className="accordion-trigger" onClick={() => setActiveAccordion(activeAccordion === 0 ? -1 : 0)}>
                <span>Quản lý cơ bản</span>
                <ChevronRight size={18} />
              </button>
              <div 
                className="accordion-content" 
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
              <button className="accordion-trigger" onClick={() => setActiveAccordion(activeAccordion === 1 ? -1 : 1)}>
                <span>Thu chi & Thanh toán</span>
                <ChevronRight size={18} />
              </button>
              <div 
                className="accordion-content" 
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
              <button className="accordion-trigger" onClick={() => setActiveAccordion(activeAccordion === 2 ? -1 : 2)}>
                <span>Giao tiếp & Nhắc việc</span>
                <ChevronRight size={18} />
              </button>
              <div 
                className="accordion-content" 
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

      {/* SECTION 8 — FINAL CTA */}
      <section className="final-cta">
        <div className="container reveal">
          <div className="final-cta-content">
            <h2>Bắt đầu miễn phí, chuẩn hóa vận hành từ hôm nay.</h2>
            <p>Nhập phòng trọ một lần. Từ tháng sau, hóa đơn và nhắc nợ tự chạy.</p>
            <Link href="/login" className="btn btn-primary" data-cta="primary">
              Dùng TroCare miễn phí →
            </Link>
            <span>Không cần thẻ tín dụng · Miễn phí mãi mãi</span>
          </div>
        </div>
      </section>

      {/* SECTION 9 — FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link href="/" className="logo" style={{ textDecoration: "none" }}>
                <Image
                  src="/brand/transparent/trocare-wordmark-transparent-1600.png"
                  alt="TroCare"
                  width={150}
                  height={45}
                  style={{ objectFit: "contain" }}
                />
              </Link>
              <p>Quản lý trọ thông minh, vận hành an tâm.</p>
            </div>
            
            <div className="footer-col">
              <h4>Sản phẩm</h4>
              <ul className="footer-links">
                <li><a href="#features">Tính năng</a></li>
                <li><a href="#workflow">Quy trình</a></li>
                <li><a href="#payment">Thanh toán QR</a></li>
                <li><a href="#ai">AI vận hành</a></li>
              </ul>
            </div>
            
            <div className="footer-col">
              <h4>Hỗ trợ</h4>
              <ul className="footer-links">
                <li><a href="#faq">Hỏi đáp</a></li>
                <li><a href="mailto:support@trocare.com">Liên hệ hỗ trợ</a></li>
                <li><a href="#guide">Hướng dẫn bắt đầu</a></li>
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
            <span>© 2026 TroCare. Miễn phí cho chủ trọ Việt Nam.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
