import React from 'react';

const FOOTER_LINKS = [
  { label: 'Tính năng', href: '#features' },
  { label: 'Bảng giá', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Liên hệ', href: 'mailto:support@trocare.vn' },
];

export default function LandingFooter() {
  const scrollTo = (href) => {
    if (href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-400" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          {/* Logo + description */}
          <div className="flex flex-col items-center md:items-start gap-4 max-w-xs text-center md:text-left">
            <div className="flex items-center gap-3">
              <img
                src="/brand/transparent/trocare-symbol-tc-transparent-128.png"
                alt="TrọCare logo"
                className="h-9 w-9 object-contain"
              />
              <span className="text-white font-black text-xl">TrọCare</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Nền tảng quản lý cho thuê phòng trọ miễn phí, dễ dùng cho chủ trọ Việt Nam.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Đang hoạt động và phát triển</span>
            </div>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation" className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-3">
            {FOOTER_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  if (link.href.startsWith('mailto:')) {
                    window.location.href = link.href;
                  } else {
                    scrollTo(link.href);
                  }
                }}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} TrọCare. Tất cả quyền được bảo lưu.
          </p>
          <p className="text-xs text-slate-600">
            Được xây dựng cho chủ trọ Việt Nam 🇻🇳
          </p>
        </div>
      </div>
    </footer>
  );
}
