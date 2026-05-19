"use client";

import React, { useState, useEffect } from "react";
import Logo from "@/components/ui/Logo";
import OwnerGoogleLoginButton from "@/components/OwnerGoogleLoginButton";
import { CheckCircle2, ShieldCheck, Zap, BarChart3 } from "lucide-react";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-white font-sans text-slate-950 flex flex-col md:flex-row">
      
      {/* Left Panel - Visual & Brand Story (Hidden on Mobile) */}
      <div className="relative hidden md:flex md:w-[55%] lg:w-[60%] flex-col justify-between bg-[#0a0a0b] overflow-hidden px-12 py-16 text-white">
        
        {/* Dynamic Abstract Glowing Orbs Background */}
        <div className="absolute top-[-20%] left-[-10%] h-[800px] w-[800px] rounded-full bg-blue-600/30 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-20%] h-[600px] w-[600px] rounded-full bg-indigo-500/20 blur-[100px] mix-blend-screen" />
        
        {/* Elegant CSS Grid Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.04]" 
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }}
        />

        {/* Top Brand Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
            <ShieldCheck className="text-blue-400" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">TrọCare</span>
        </div>

        {/* Center Story Content */}
        <div className="relative z-10 max-w-2xl mt-20">
          <div className={`transition-all duration-1000 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h1 className="text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500 mb-6">
              Kỷ nguyên mới<br />của quản lý lưu trú.
            </h1>
            <p className="text-lg lg:text-xl text-slate-400 font-medium leading-relaxed mb-12 max-w-xl">
              Nền tảng vận hành nhà trọ thông minh, tối ưu dòng tiền và tự động hóa toàn bộ quy trình chăm sóc khách hàng.
            </p>

            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4 text-slate-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={20} />
                </div>
                <span className="text-[17px] font-semibold">Chốt điện nước và xuất hóa đơn tự động</span>
              </div>
              <div className="flex items-center gap-4 text-slate-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Zap size={20} />
                </div>
                <span className="text-[17px] font-semibold">Phân tích dòng tiền trực quan chuẩn Real-time</span>
              </div>
              <div className="flex items-center gap-4 text-slate-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <BarChart3 size={20} />
                </div>
                <span className="text-[17px] font-semibold">Báo cáo tài chính chuẩn mực doanh nghiệp</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm font-medium text-slate-500">
          © {new Date().getFullYear()} TrọCare Platform. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="relative flex w-full md:w-[45%] lg:w-[40%] flex-col items-center justify-center bg-white px-6 sm:px-12 py-16 shadow-[-30px_0_50px_-20px_rgba(0,0,0,0.07)] z-20">
        
        {/* Mobile Logo */}
        <div className="md:hidden mb-12 flex justify-center w-full">
          <Logo size="lg" />
        </div>

        <div className={`w-full max-w-[420px] transition-all duration-700 delay-300 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 mb-3">Đăng nhập</h2>
            <p className="text-slate-500 text-[15px] font-medium leading-relaxed">
              Chào mừng trở lại! Vui lòng tiếp tục với tài khoản Google để truy cập không gian quản lý.
            </p>
          </div>

          <div className="space-y-6">
            <OwnerGoogleLoginButton />
          </div>

          <div className="mt-12 relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
              <span className="bg-white px-3 text-slate-300">Secure Identity</span>
            </div>
          </div>

          <div className="mt-10 rounded-2xl bg-slate-50 p-5 text-center border border-slate-100">
            <p className="text-[13px] font-medium leading-relaxed text-slate-500">
              Việc đăng nhập đồng nghĩa với việc bạn đồng ý với <br className="hidden lg:block"/>
              <a href="#" className="text-blue-600 font-bold hover:underline">Điều khoản dịch vụ</a> và <a href="#" className="text-blue-600 font-bold hover:underline">Chính sách bảo mật</a>.
            </p>
          </div>
        </div>
        
      </div>
    </main>
  );
}
