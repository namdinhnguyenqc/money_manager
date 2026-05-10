"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/ui/Logo";
import OwnerGoogleLoginButton from "@/components/OwnerGoogleLoginButton";

export default function OwnerLoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 font-sans text-slate-950">
      <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-blue-100/50 blur-3xl" />
      
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div>
          <Link href="/login" className="mb-12 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
            <ArrowLeft size={18} /> Quay lại lựa chọn
          </Link>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-10 shadow-2xl shadow-blue-200/40">
          <Logo className="mb-10" size="md" />
          
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Owner Login</h1>
          <p className="mt-3 text-base font-medium text-slate-500">
            Sử dụng tài khoản Google đã đăng ký để quản lý hệ thống nhà trọ của bạn.
          </p>

          <div className="mt-10">
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
                <span className="bg-white px-3 text-slate-400">Tiếp tục với</span>
              </div>
            </div>

            <div className="mt-8">
              <OwnerGoogleLoginButton />
            </div>
          </div>

          <div className="mt-10 rounded-2xl bg-blue-50/50 p-4 text-center">
            <p className="text-xs font-bold leading-relaxed text-blue-700">
              Bằng cách đăng nhập, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của TrọCare.
            </p>
          </div>
        </div>

        <footer className="mt-12 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
          Secure Identity Management
        </footer>
      </div>
    </main>
  );
}
