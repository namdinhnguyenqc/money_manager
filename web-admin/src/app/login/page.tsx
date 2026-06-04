"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Logo from "@/components/ui/Logo";
import OwnerGoogleLoginButton from "@/components/OwnerGoogleLoginButton";
import { getStoredAccessToken } from "@/utils/session";

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Auto-redirect to dashboard if user has an active session and goes back to login page
    const token = getStoredAccessToken();
    if (token) {
      const isProfileCompleted = localStorage.getItem("isProfileCompleted") === "true";
      const approvalStatus = localStorage.getItem("approvalStatus") || localStorage.getItem("userStatus");
      router.replace(!isProfileCompleted ? "/complete-profile" : approvalStatus === "PENDING_APPROVAL" ? "/pending-approval" : "/owner/dashboard");
    }
  }, [router]);

  if (!mounted) return null;

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#F8FAFC] font-sans text-[#0F172A] p-4 lg:p-10 flex items-center justify-center">
      
      {/* Background Decor */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.35]" 
        style={{
          backgroundImage: `radial-gradient(rgba(15, 23, 42, .08) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(to bottom, black, transparent 78%)'
        }}
      />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(circle at 8% 0%, rgba(37, 99, 235, .12), transparent 30%),
          radial-gradient(circle at 100% 20%, rgba(6, 182, 212, .16), transparent 34%),
          linear-gradient(135deg, #F8FAFC 0%, #F3F8FF 48%, #F8FAFC 100%)
        `
      }} />

      <section className="relative w-full max-w-[1360px] h-full max-h-[820px] grid grid-cols-1 lg:grid-cols-[1.12fr_.78fr] gap-8 items-stretch z-10">
        
        {/* Left Hero Card */}
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden rounded-[32px] p-10 text-white shadow-[0_32px_100px_rgba(15,23,42,0.24)]" style={{
          background: `
            radial-gradient(circle at 85% 10%, rgba(6, 182, 212, .88), transparent 34%),
            radial-gradient(circle at 65% 35%, rgba(37, 99, 235, .8), transparent 36%),
            linear-gradient(135deg, #06152B 0%, #0B1E3B 46%, #0F172A 100%)
          `
        }}>
          {/* Hero Decor */}
          <div className="absolute inset-0 opacity-15" style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.08) 1px, transparent 1px)`,
            backgroundSize: '56px 56px'
          }} />
          <div className="absolute w-[560px] h-[560px] -right-[260px] -bottom-[260px] rounded-full bg-[#10B981]/15 blur-[20px]" />

          <div className="relative z-10 max-w-[650px]">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-white/16 bg-white/12 backdrop-blur-xl text-white/92 text-[10px] font-bold font-['Plus_Jakarta_Sans'] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_0_6px_rgba(34,197,94,0.16)]" />
              Nền tảng quản lý phòng trọ cho chủ nhà hiện đại
            </div>
            <h1 className="mt-4 text-[clamp(28px,4vh,48px)] leading-[1.1] font-[800] tracking-[-0.055em] font-['Plus_Jakarta_Sans']">
              Quản lý trọ thông minh<br />Vận hành an tâm
            </h1>
            <p className="mt-3 max-w-[500px] text-slate-200/86 text-sm leading-relaxed font-medium">
              TroCare giúp chủ trọ quản lý phòng, khách thuê, thu chi và hợp đồng dễ dàng — mọi lúc, mọi nơi.
            </p>
          </div>

          {/* Mock Dashboard */}
          <div className="relative z-10 mt-6 rounded-2xl overflow-hidden border border-white/14 bg-white/8 shadow-[0_30px_80px_rgba(0,0,0,0.22)] backdrop-blur-[22px] flex-1 min-h-0">
            <div className="grid grid-cols-[170px_1fr] h-full bg-white text-[#0F172A]">
              <nav className="bg-gradient-to-b from-[#071C39] to-[#0B1E3B] p-4 text-white">
                <div className="flex items-center gap-2 mb-6 font-extrabold tracking-tight">
                  <Image src="/brand/transparent/trocare-symbol-tc-transparent-64.png" width={24} height={24} alt="" />
                  <div className="text-sm">Tro<span className="text-[#38BDF8]">Care</span></div>
                </div>
                <div className="flex items-center gap-2 h-8 px-3 rounded-lg text-[10px] font-bold bg-[#2563EB] mb-1.5">⌂ Tổng quan</div>
                <div className="flex items-center gap-2 h-8 px-3 rounded-lg text-[10px] font-bold text-white/60 mb-1.5">▣ Phòng trọ</div>
                <div className="flex items-center gap-2 h-8 px-3 rounded-lg text-[10px] font-bold text-white/60 mb-1.5">♙ Khách thuê</div>
                <div className="flex items-center gap-2 h-8 px-3 rounded-lg text-[10px] font-bold text-white/60 mb-1.5">▤ Hợp đồng</div>
              </nav>
              <div className="p-4 bg-slate-50 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] text-slate-500 font-bold">Xin chào, <strong className="text-slate-900 ml-1">Chủ trọ</strong></div>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FDBA74] to-[#0F172A] border border-white" />
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { l: 'Phòng', v: '128' }, { l: 'Thuê', v: '96' }, { l: 'Trống', v: '32' }, { l: 'Doanh thu', v: '128M' }
                  ].map((s, i) => (
                    <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                      <small className="block text-slate-400 text-[8px] font-bold mb-0.5 uppercase">{s.l}</small>
                      <strong className="block text-sm font-black text-[#0F172A]">{s.v}</strong>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-2 flex-1">
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="text-[10px] font-black mb-2">Chưa thanh toán</div>
                    <div className="space-y-1">
                      {[1,2,3].map(r => (
                        <div key={r} className="flex justify-between py-1.5 border-b border-slate-50 text-[9px] font-bold last:border-0">
                          <span className="text-slate-600">Nguyễn Văn A</span>
                          <span className="text-red-500 font-black">2.8TR</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-4 gap-4 mt-6">
            {[
              { t: 'Quản lý phòng', d: 'Theo dõi dễ dàng' },
              { t: 'Công nợ', d: 'Tự động nhắc hạn' },
              { t: 'Báo cáo', d: 'Trực quan hơn' },
              { t: 'Nhắc việc', d: 'Tiện ích thông minh' }
            ].map((f, i) => (
              <div key={i} className="text-white/80">
                <h3 className="text-white text-[11px] font-bold leading-tight mb-1">{f.t}</h3>
                <p className="text-[10px] leading-snug opacity-70">{f.d}</p>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Login Card */}
        <section className="relative overflow-hidden rounded-[32px] p-10 md:p-12 border border-white/90 bg-white/92 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-3xl flex flex-col justify-center h-full">
          <div className="absolute w-[260px] h-[260px] -right-20 -top-20 bg-gradient-to-br from-blue-600/15 to-cyan-500/16 rounded-full blur-[4px]" />
          
          <header className="relative flex flex-col items-center gap-3 mb-10">
            <Image src="/brand/transparent/trocare-symbol-tc-transparent-256.png" width={72} height={72} alt="Logo" className="drop-shadow-[0_18px_26px_rgba(37,99,235,0.16)]" />
            <div className="text-3xl font-bold tracking-[-0.06em] font-['Plus_Jakarta_Sans']">
              <span>Tro</span><span className="text-[#2563EB] font-black">Care</span>
            </div>
          </header>

          <div className="relative text-center mb-8">
            <h2 className="text-[28px] leading-tight font-extrabold tracking-[-0.055em] font-['Plus_Jakarta_Sans'] text-[#0F172A]">
              Đăng nhập vào TroCare Owner
            </h2>
            <p className="mt-3 text-slate-500 text-sm font-semibold">
              Quản lý trọ thông minh, vận hành an tâm
            </p>
          </div>

          <div className="relative z-20 space-y-4">
            <OwnerGoogleLoginButton />
          </div>

          <div className="mt-8 mb-6 relative flex justify-center items-center h-20">
            <div className="absolute left-1/2 -translate-x-1/2 w-[64px] h-[64px] grid place-items-center rounded-2xl bg-gradient-to-br from-blue-600/8 to-cyan-500/8 shadow-sm">
              <svg className="w-10 h-10 text-[#2563EB]/20" viewBox="0 0 64 64" fill="none">
                <path d="M32 7l21 8v15c0 13.5-8.7 23.2-21 28-12.3-4.8-21-14.5-21-28V15l21-8z" fill="currentColor" />
                <path d="M22 32l7 7 14-16" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { t: 'Bảo mật', d: 'Tiêu chuẩn', i: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6v-9z' },
              { t: 'Đồng bộ', d: 'Tức thì', i: 'M13 2L4 14h7l-1 8 10-13h-7l0-7z' },
              { t: 'Dành cho', d: 'Chủ trọ', i: 'M16 11a4 4 0 1 0-8 0M4 20c1.5-4 14.5-4 16 0' }
            ].map((b, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-white/70 p-3 text-center flex flex-col items-center justify-center gap-1.5">
                <svg className="text-[#2563EB]" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d={b.i} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-slate-700 text-[10px] font-extrabold uppercase leading-tight tracking-wider">{b.t}</span>
              </div>
            ))}
          </div>

          <footer className="mt-8 text-center text-slate-500 text-[11px] font-medium">
            © {new Date().getFullYear()} TroCare Platform. <br/>
            <a href="/terms" className="text-[#2563EB] font-extrabold hover:underline">Điều khoản</a> & <a href="/privacy" className="text-[#2563EB] font-extrabold hover:underline">Bảo mật</a>
          </footer>
        </section>
      </section>
    </main>
  );
}
