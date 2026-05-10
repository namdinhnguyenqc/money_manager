"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import Logo from "@/components/ui/Logo";

export default function LoginChooserPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <Logo className="justify-center mb-6" size="lg" />
          <h1 className="text-4xl font-bold text-slate-900">TrọCare Portal</h1>
          <p className="text-slate-500 mt-2">Vui lòng chọn cổng đăng nhập để tiếp tục</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Link href="/login/owner" className="group p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:border-blue-500 transition-all">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6">
              <Building2 size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Chủ trọ / Vận hành</h2>
            <p className="text-slate-500 text-sm mb-6">Quản lý dãy trọ, hợp đồng, hóa đơn và khách thuê của bạn.</p>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
              Đăng nhập Owner <ArrowRight size={16} />
            </div>
          </Link>

          <Link href="/login/admin" className="group p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:border-slate-900 transition-all">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Quản trị hệ thống</h2>
            <p className="text-slate-500 text-sm mb-6">Dành cho admin xử lý người dùng và cấu hình hệ thống.</p>
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              Đăng nhập Admin <ArrowRight size={16} />
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
