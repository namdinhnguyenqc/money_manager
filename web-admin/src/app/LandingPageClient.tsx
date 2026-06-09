'use client';

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Receipt,
  ShieldCheck,
  QrCode,
  Bot,
  Sparkles,
  Cpu,
  CheckCircle,
  CheckCircle2,
  Menu,
  X,
  ArrowRight,
  ChevronRight,
  Landmark,
  MessageSquare,
  Home,
  Users,
  FileSignature,
  Wallet,
  Bell,
  MessageSquareText,
  BrainCircuit,
  TrendingUp
} from "lucide-react";

interface StepData {
  title: string;
  text: string;
  action: () => void;
}

export default function LandingPageClient() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [hasUserInteracted, setHasUserInteracted] = useState<boolean>(false);

  // Simulation states for Mockup Dashboard
  const [mockupTitle, setMockupTitle] = useState<string>("Dãy trọ Tân Bình A");
  const [mockupTitleHighlight, setMockupTitleHighlight] = useState<boolean>(false);
  const [mockupGridHighlight, setMockupGridHighlight] = useState<boolean>(false);
  const [showCustomer, setShowCustomer] = useState<boolean>(false);
  const [showCashLog, setShowCashLog] = useState<boolean>(false);
  const [showPaidStamp, setShowPaidStamp] = useState<boolean>(false);
  const [room102Rented, setRoom102Rented] = useState<boolean>(false);
  const [invoiceHighlight, setInvoiceHighlight] = useState<boolean>(false);
  const [invoiceTitleText, setInvoiceTitleText] = useState<string>("HÓA ĐƠN TIỀN PHÒNG T6");
  const [invoiceBasePriceText, setInvoiceBasePriceText] = useState<string>("2.500.000đ");
  const [invoiceTotalPriceText, setInvoiceTotalPriceText] = useState<string>("2.850.000đ");

  // Track window scroll for Navbar background
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // IntersectionObserver for scroll-reveal animations
  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.15 }
    );
    revealElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Reset function to clear mockup interactive classes
  const resetMockup = () => {
    setMockupTitle("Dãy trọ Tân Bình A");
    setMockupTitleHighlight(false);
    setMockupGridHighlight(false);
    setShowCustomer(false);
    setShowCashLog(false);
    setShowPaidStamp(false);
    setRoom102Rented(false);
    setInvoiceHighlight(false);
    setInvoiceTitleText("HÓA ĐƠN TIỀN PHÒNG T6");
    setInvoiceBasePriceText("2.500.000đ");
    setInvoiceTotalPriceText("2.850.000đ");
  };

  // Run mockup updates corresponding to the current step
  useEffect(() => {
    resetMockup();
    switch (activeStep) {
      case 1:
        setMockupTitleHighlight(true);
        setMockupTitle("Dãy trọ Tân Bình A (Đã Tạo)");
        break;
      case 2:
        setMockupGridHighlight(true);
        break;
      case 3:
        setShowCustomer(true);
        break;
      case 4:
        setRoom102Rented(true);
        setShowCustomer(true);
        break;
      case 5:
        setInvoiceHighlight(true);
        setInvoiceTitleText("HÓA ĐƠN P.102 - T6");
        setInvoiceBasePriceText("2.500.000đ");
        setInvoiceTotalPriceText("2.850.000đ");
        break;
      case 6:
        setInvoiceHighlight(true);
        setInvoiceTitleText("HÓA ĐƠN P.102 - T6");
        setInvoiceBasePriceText("2.500.000đ");
        setInvoiceTotalPriceText("2.850.000đ");
        setShowPaidStamp(true);
        break;
      case 7:
        setShowCashLog(true);
        break;
      default:
        break;
    }
  }, [activeStep]);

  // Autoplay loop rotating steps every 4.5s (pauses on user interaction)
  useEffect(() => {
    if (hasUserInteracted) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev % 7) + 1);
    }, 4500);
    return () => clearInterval(interval);
  }, [hasUserInteracted]);

  const handleStepClick = (stepNum: number) => {
    setHasUserInteracted(true);
    setActiveStep(stepNum);
  };

  const stepsData: Record<number, StepData> = {
    1: {
      title: "Bước 1: Tạo dãy trọ",
      text: "Thiết lập các thông tin cơ bản nhất như tên khu trọ, địa chỉ khu vực và quy định chung.",
      action: () => {}
    },
    2: {
      title: "Bước 2: Thêm phòng",
      text: "Cập nhật mã số phòng, thiết lập đơn giá cho thuê mặc định và các chỉ số dịch vụ.",
      action: () => {}
    },
    3: {
      title: "Bước 3: Nhập khách thuê",
      text: "Lưu giữ hồ sơ lý lịch, số định danh công dân và thông tin liên lạc của người ở.",
      action: () => {}
    },
    4: {
      title: "Bước 4: Ký hợp đồng",
      text: "Ký kết giao kèo điện tử, ghi nhận cọc phòng và kích hoạt thời hạn thuê chính thức.",
      action: () => {}
    },
    5: {
      title: "Bước 5: Lập hóa đơn",
      text: "Hệ thống tự động cộng dồn tiền phòng, điện nước thực tế sử dụng và xuất biểu mẫu hóa đơn.",
      action: () => {}
    },
    6: {
      title: "Bước 6: Thu tiền thông minh",
      text: "Khách chỉ cần quét mã QR có sẵn trên hóa đơn, đối soát SePay nhận thông báo có tức thì.",
      action: () => {}
    },
    7: {
      title: "Bước 7: Xem sổ quỹ",
      text: "Biểu đồ thu chi trực quan và dòng tiền thực tế tự động cộng dồn báo cáo chính xác.",
      action: () => {}
    }
  };

  return (
    <main className="trocare-landing">
      {/* 1. NAVBAR */}
      <header className={`navbar ${isScrolled ? "scrolled" : ""}`}>
        <div className="container">
          <Link href="/" className="logo">
            <div className="logo-symbol">T</div>
            <span>TroCare</span>
          </Link>
          
          <nav className={`nav-links ${isMobileMenuOpen ? "active" : ""}`}>
            <a href="#features" onClick={() => setIsMobileMenuOpen(false)}>Tính năng</a>
            <a href="#workflow" onClick={() => setIsMobileMenuOpen(false)}>Quy trình</a>
            <a href="#payment" onClick={() => setIsMobileMenuOpen(false)}>Thanh toán QR</a>
            <a href="#ai" onClick={() => setIsMobileMenuOpen(false)}>Trí tuệ AI</a>
          </nav>
          
          <div className="nav-cta">
            <Link href="/login" className="btn btn-secondary">Đăng nhập</Link>
            <button 
              className="mobile-menu-toggle" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="hero-badge">
                <Sparkles size={14} />
                Miễn phí cho chủ trọ Việt Nam
              </div>
              <h1>Quản lý nhà trọ miễn phí, <span>nhìn rõ từng phòng từng đồng</span>.</h1>
              <p className="hero-subtext">TroCare giúp chủ trọ số hóa quy trình quản lý dãy trọ, hợp đồng, lập hóa đơn tự động và nhận thanh toán QR thông minh không cần Excel.</p>
              
              <div className="hero-actions">
                <Link href="/login" className="btn btn-primary" data-cta="hero-start">
                  Bắt đầu miễn phí <ArrowRight size={16} />
                </Link>
                <a href="#workflow" className="btn btn-secondary">Xem demo trực quan</a>
              </div>
              
              <div className="hero-stats">
                <div className="stat-item">
                  <h3>0đ</h3>
                  <p>Chi phí bắt đầu</p>
                </div>
                <div className="stat-item">
                  <h3>7 bước</h3>
                  <p>Từ thiết lập đến thu tiền</p>
                </div>
                <div className="stat-item">
                  <h3>ACB + SePay</h3>
                  <p>QR đối soát tự động</p>
                </div>
              </div>
            </div>

            {/* Right Side: Interactive Mockup Dashboard */}
            <div className="mockup-container">
              <div className="mockup-header">
                <div className="mockup-header-info">
                  <Building2 size={18} className="text-primary" />
                  <span className={`mockup-title ${mockupTitleHighlight ? "highlight" : ""}`}>
                    {mockupTitle}
                  </span>
                </div>
                <span className="mockup-badge">Đang vận hành</span>
              </div>

              {/* Room Grid */}
              <div className={`mockup-grid ${mockupGridHighlight ? "highlight" : ""}`}>
                <div className="mockup-room active-room">
                  <h4>P.101</h4>
                  <span className="room-status status-rented">Đang thuê</span>
                </div>
                <div className="mockup-room">
                  <h4>P.102</h4>
                  <span className={`room-status ${room102Rented ? "status-rented" : "status-empty"}`}>
                    {room102Rented ? "Đang thuê" : "Trống"}
                  </span>
                </div>
                <div className="mockup-room">
                  <h4>P.103</h4>
                  <span className="room-status status-waiting">Chờ cọc</span>
                </div>
              </div>

              {/* Sample Invoice */}
              <div className={`mockup-invoice ${invoiceHighlight ? "highlight" : ""}`}>
                <div className={`paid-stamp ${showPaidStamp ? "show" : ""}`}>ĐÃ THU</div>
                <h5 className="invoice-title">{invoiceTitleText}</h5>
                <div className="invoice-line">
                  <span>Tiền phòng:</span>
                  <strong>{invoiceBasePriceText}</strong>
                </div>
                <div className="invoice-line">
                  <span>Điện nước dịch vụ:</span>
                  <strong>350.000đ</strong>
                </div>
                <div className="invoice-total">
                  <span>Cần thu:</span>
                  <span className="text-primary">{invoiceTotalPriceText}</span>
                </div>
              </div>

              {/* Floating Customer Info Widget */}
              <div className={`mockup-customer ${showCustomer ? "show" : ""}`}>
                <div className="avatar">AN</div>
                <div className="customer-details">
                  <h5>Nguyễn Văn An</h5>
                  <p>Khách thuê P.102</p>
                </div>
              </div>

              {/* Floating Cash Log Widget */}
              <div className={`mockup-cash-log ${showCashLog ? "show" : ""}`}>
                <CheckCircle className="text-success" size={18} />
                <div>
                  <h5 style={{ fontSize: "11px", fontWeight: 800 }}>Sổ quỹ +2.850.000đ</h5>
                  <p style={{ fontSize: "9px", color: "var(--text-muted)" }}>Hóa đơn P.102 thành công</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SOCIAL PROOF BAR */}
      <section className="social-proof">
        <div className="container">
          <div className="social-proof-content">
            <div className="social-proof-text">
              Đang hỗ trợ vận hành <span className="text-primary" style={{ fontWeight: 800 }}>1.200+</span> phòng cho thuê trên toàn quốc
            </div>
            <div className="partner-logos">
              <div className="partner-logo acb">
                <Landmark size={20} />
                <span>ACB Bank</span>
              </div>
              <div className="partner-logo sepay">
                <QrCode size={20} />
                <span>SePay</span>
              </div>
              <div className="partner-logo zalo">
                <MessageSquare size={20} />
                <span>Zalo OA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURES SECTION */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-header reveal">
            <h2>Số hóa toàn bộ việc quản lý phòng trọ</h2>
            <p>Giải quyết mọi nỗi lo quản lý thủ công trong cùng một nền tảng tinh gọn nhất.</p>
          </div>

          <div className="features-groups">
            {/* Group 1 */}
            <div className="features-group reveal">
              <h3 className="features-group-title">1. Quản lý cơ bản</h3>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <Home size={22} />
                  </div>
                  <h4>Dãy trọ & Phòng</h4>
                  <p>Tổ chức theo từng dãy, quản lý trạng thái thuê/trống, giá phòng và số lượng khách chi tiết.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <Users size={22} />
                  </div>
                  <h4>Khách thuê</h4>
                  <p>Lưu giữ thông tin liên lạc, hồ sơ tùy thân đầy đủ và lịch sử ở trọ chi tiết của từng khách hàng.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <FileSignature size={22} />
                  </div>
                  <h4>Hợp đồng thuê</h4>
                  <p>Tạo hợp đồng rõ ràng, quản lý tiền đặt cọc, thời hạn thuê, các dịch vụ đính kèm và điều khoản ràng buộc.</p>
                </div>
              </div>
            </div>

            {/* Group 2 */}
            <div className="features-group reveal">
              <h3 className="features-group-title">2. Thu chi & thanh toán</h3>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <Receipt size={22} />
                  </div>
                  <h4>Hóa đơn tháng</h4>
                  <p>Lập hóa đơn nhanh chóng, cộng dồn tiền phòng, điện nước dịch vụ, nợ cũ và gửi biên nhận số hóa.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <Wallet size={22} />
                  </div>
                  <h4>Sổ quỹ thu chi</h4>
                  <p>Theo dõi luồng tiền vào ra thực tế từ tiền cọc, tiền sửa chữa phòng, thu chi cân đối minh bạch.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <QrCode size={22} />
                  </div>
                  <h4>QR SePay</h4>
                  <p>Tự động tạo QR chuyển khoản ACB chứa mã hóa đơn riêng biệt, hỗ trợ đối soát báo khoản có tức thì.</p>
                </div>
              </div>
            </div>

            {/* Group 3 */}
            <div className="features-group reveal">
              <h3 className="features-group-title">3. Giao tiếp & nhắc việc</h3>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <Bell size={22} />
                  </div>
                  <h4>Nhắc việc thông minh</h4>
                  <p>Hệ thống tự động nhắc nhở các công việc định kỳ: thu tiền phòng, gia hạn hợp đồng, báo cáo tháng.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <MessageSquareText size={22} />
                  </div>
                  <h4>Zalo OA</h4>
                  <p>Kết nối gửi tin nhắn hóa đơn phòng tự động trực tiếp vào tài khoản Zalo của khách thuê cực nhanh chóng.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <BrainCircuit size={22} />
                  </div>
                  <h4>Trợ lý AI</h4>
                  <p>Gợi ý tối ưu hóa dòng tiền, viết mẫu thông báo thông minh và hỗ trợ phân tích hiệu quả cho thuê.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WORKFLOW SECTION */}
      <section className="workflow" id="workflow">
        <div className="container">
          <div className="section-header reveal">
            <h2>Vận hành dễ dàng sau vài bước</h2>
            <p>Bắt đầu ngay hôm nay và xem cách TroCare đơn giản hóa các tác vụ quản lý thủ công khó nhằn nhất.</p>
          </div>

          {/* Desktop Steps (Step Line Indicators) */}
          <div className="step-indicator-wrapper reveal">
            <div className="step-line"></div>
            <div 
              className="step-line-active" 
              style={{ width: `${((activeStep - 1) / 6) * 100}%` }}
            ></div>
            
            <div className="step-indicator">
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <button 
                  key={num}
                  className={`step-node ${activeStep >= num ? "active" : ""}`}
                  onClick={() => handleStepClick(num)}
                >
                  <div className="step-number">{num}</div>
                  <span className="step-title">
                    {num === 1 && "Tạo dãy trọ"}
                    {num === 2 && "Thêm phòng"}
                    {num === 3 && "Nhập khách"}
                    {num === 4 && "Ký hợp đồng"}
                    {num === 5 && "Lập hóa đơn"}
                    {num === 6 && "Thu tiền"}
                    {num === 7 && "Xem sổ quỹ"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step Description Box */}
          <div className="step-description-box reveal">
            <h4 className="step-desc-title">{stepsData[activeStep]?.title}</h4>
            <p className="step-desc-text">{stepsData[activeStep]?.text}</p>
          </div>

          {/* Mobile Timeline */}
          <div className="mobile-timeline">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <div 
                key={num}
                className={`timeline-item ${activeStep === num ? "active" : ""}`}
                onClick={() => handleStepClick(num)}
              >
                <div className="timeline-num">{num}</div>
                <div className="timeline-content">
                  <h4>
                    {num === 1 && "Tạo dãy trọ"}
                    {num === 2 && "Thêm phòng"}
                    {num === 3 && "Nhập khách thuê"}
                    {num === 4 && "Ký hợp đồng"}
                    {num === 5 && "Lập hóa đơn"}
                    {num === 6 && "Thu tiền thông minh"}
                    {num === 7 && "Xem sổ quỹ"}
                  </h4>
                  <p>{stepsData[num]?.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. QR PAYMENT SHOWCASE */}
      <section className="payment-showcase" id="payment">
        <div className="container">
          <div className="payment-grid">
            <div className="payment-text reveal">
              <span className="payment-tagline">Thanh toán thông minh</span>
              <h2>Đối soát tự động qua cổng SePay linh hoạt</h2>
              <p>Mỗi hóa đơn tiền phòng được xuất ra sẽ đi kèm một mã thanh toán duy nhất (`TCINV-XXXX`) và hiển thị thông tin QR chính xác. Khi khách thuê chuyển khoản qua ACB, giao dịch được khớp tự động chỉ trong vài giây.</p>
              
              <ul className="feature-check-list">
                <li className="check-item">
                  <CheckCircle2 className="check-icon" size={18} />
                  <span>Không cần chụp màn hình chuyển khoản gửi Zalo thủ công.</span>
                </li>
                <li className="check-item">
                  <CheckCircle2 className="check-icon" size={18} />
                  <span>Cập nhật trạng thái "Đã thu" tức thì trên bảng điều khiển.</span>
                </li>
                <li className="check-item">
                  <CheckCircle2 className="check-icon" size={18} />
                  <span>Rõ ràng, minh bạch, hạn chế nhầm lẫn số lẻ hoặc sai nội dung.</span>
                </li>
              </ul>
            </div>

            <div className="reveal">
              <div className="invoice-card">
                <div className="invoice-card-header">
                  <span className="invoice-card-logo">
                    <ShieldCheck size={18} style={{ verticalAlign: "middle", marginRight: "6px" }} /> 
                    TroCare Invoice
                  </span>
                  <span className="invoice-card-code">Mã: TCINV-1092</span>
                </div>
                
                <div className="invoice-card-lines">
                  <div className="invoice-card-line">
                    <span>Phòng P.109:</span>
                    <strong>2.500.000đ</strong>
                  </div>
                  <div className="invoice-card-line">
                    <span>Số điện (52kWh x 3.5k):</span>
                    <span>182.000đ</span>
                  </div>
                  <div className="invoice-card-line">
                    <span>Nước sinh hoạt:</span>
                    <span>80.000đ</span>
                  </div>
                  <div className="invoice-card-line total">
                    <span>Tổng cộng:</span>
                    <span className="text-primary">2.762.000đ</span>
                  </div>
                </div>

                <div className="invoice-card-qr-section">
                  <div className="qr-desc">
                    <h5>Quét mã chuyển khoản</h5>
                    <p>Nội dung: TCINV-1092</p>
                    <p style={{ fontWeight: 700, marginTop: "4px", color: "var(--primary)" }}>Ngân hàng ACB</p>
                  </div>
                  <div className="qr-placeholder">
                    <QrCode size={48} style={{ color: "var(--text-main)", marginBottom: "4px" }} />
                    <span>QR SEPAY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. AI SECTION */}
      <section className="ai-section" id="ai">
        <div className="container">
          <div className="ai-grid">
            <div className="ai-visual reveal">
              <div style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.05), rgba(37, 99, 235, 0.05))", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "32px", boxShadow: "var(--shadow-md)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                  <div style={{ width: "42px", height: "42px", backgroundColor: "var(--primary-light)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                    <Bot size={22} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 800 }}>Gợi ý vận hành AI</h4>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Trợ lý vận hành tự động</p>
                  </div>
                </div>
                
                <div style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "16px", fontSize: "13px", fontWeight: 600, lineHeight: 1.5, boxShadow: "var(--shadow-sm)", marginBottom: "12px" }}>
                  <Sparkles size={14} className="text-accent" style={{ color: "var(--accent)", marginRight: "6px", display: "inline-block", verticalAlign: "middle" }} />
                  "Phòng 104 sắp hết hợp đồng vào ngày 25 tới. Gợi ý gửi tin nhắn liên hệ gia hạn cho khách thuê Nguyễn Thị Bình."
                </div>
                <div style={{ backgroundColor: "#FFFFFF", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "16px", fontSize: "13px", fontWeight: 600, lineHeight: 1.5, boxShadow: "var(--shadow-sm)" }}>
                  <TrendingUp size={14} className="text-primary" style={{ marginRight: "6px", display: "inline-block", verticalAlign: "middle" }} />
                  "Dòng tiền thực thu tháng này tăng trưởng 12% so với tháng trước nhờ việc nhắc hóa đơn tự động."
                </div>
              </div>
            </div>

            <div className="ai-text reveal">
              <div className="ai-badge">
                <Cpu size={14} style={{ marginRight: "6px" }} />
                Trí tuệ nhân tạo (AI)
              </div>
              <h2>Tự động nhận diện công việc, tối ưu dòng tiền</h2>
              <p>Không can thiệp sâu vào quyết định của chủ trọ, Trợ lý ảo của TroCare giúp thống kê dữ liệu nhanh chóng và đưa ra các đề xuất giải quyết công việc hữu ích.</p>
              
              <div className="ai-bullets">
                <div className="ai-bullet-card">
                  <div className="ai-icon-box">
                    <CheckCircle size={18} />
                  </div>
                  <span>Phân tích cảnh báo phòng trống lâu dựa trên xu hướng mùa vụ.</span>
                </div>
                <div className="ai-bullet-card">
                  <div className="ai-icon-box">
                    <CheckCircle size={18} />
                  </div>
                  <span>Phác thảo mẫu tin nhắn nhắc đóng tiền thông minh qua Zalo.</span>
                </div>
                <div className="ai-bullet-card">
                  <div className="ai-icon-box">
                    <CheckCircle size={18} />
                  </div>
                  <span>Tóm tắt báo cáo tình hình doanh thu thực tế định kỳ hàng tháng.</span>
                </div>
                <div className="ai-bullet-card">
                  <div className="ai-icon-box">
                    <CheckCircle size={18} />
                  </div>
                  <span>Gợi ý điều chỉnh đơn giá dịch vụ hợp lý theo dữ liệu khu vực.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA SECTION */}
      <section className="final-cta">
        <div className="container reveal">
          <div className="final-cta-content">
            <h2>Số hóa việc quản lý phòng trọ của bạn ngay hôm nay</h2>
            <p>Bắt đầu miễn phí hoàn toàn, tối giản hóa quy trình vận hành và hạn chế tối đa sai sót dòng tiền mỗi tháng.</p>
            <Link href="/login" className="btn btn-primary" data-cta="final-start">
              Đăng ký sử dụng miễn phí <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link href="/" className="logo">
                <div className="logo-symbol">T</div>
                <span>TroCare</span>
              </Link>
              <p>Phần mềm quản lý phòng trọ miễn phí thông minh, nâng cao hiệu quả vận hành tối ưu cho chủ trọ Việt Nam.</p>
            </div>
            
            <div className="footer-col">
              <h4>Sản phẩm</h4>
              <ul className="footer-links-list">
                <li><a href="#features">Tính năng</a></li>
                <li><a href="#workflow">Quy trình</a></li>
                <li><a href="#payment">Thanh toán QR</a></li>
              </ul>
            </div>
            
            <div className="footer-col">
              <h4>Pháp lý</h4>
              <ul className="footer-links-list">
                <li><Link href="/terms">Điều khoản sử dụng</Link></li>
                <li><Link href="/privacy">Chính sách bảo mật</Link></li>
              </ul>
            </div>
            
            <div className="footer-col">
              <h4>Hỗ trợ</h4>
              <ul className="footer-links-list">
                <li><a href="#faq">Câu hỏi thường gặp</a></li>
                <li><a href="mailto:support@trocare.com">Liên hệ hỗ trợ</a></li>
              </ul>
            </div>
          </div>
          
          <div className="footer-bottom">
            <span className="copyright">© 2026 TroCare. Thiết kế và phát triển tại Việt Nam. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
