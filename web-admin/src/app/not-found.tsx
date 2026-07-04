"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-[#F8FAFC] px-6 text-center">
      <div className="max-w-md space-y-6 flex flex-col items-center">
        <Logo />
        <h1 className="text-8xl font-black text-blue-600 tracking-tight">404</h1>
        <h2 className="text-2xl font-bold text-slate-800">Không tìm thấy trang</h2>
        <p className="text-sm font-medium text-slate-500 leading-relaxed">
          Đường dẫn bạn truy cập không tồn tại hoặc đã bị di chuyển. Vui lòng kiểm tra lại địa chỉ hoặc sử dụng các nút dưới đây để quay lại.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 w-full">
          <Link
            href="/"
            className="rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex-1"
          >
            Quay về Trang chủ
          </Link>
          <Link
            href="/owner/dashboard"
            className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex-1"
          >
            Vào Trang quản lý
          </Link>
        </div>
      </div>
    </main>
  );
}
