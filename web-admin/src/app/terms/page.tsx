import type { Metadata } from "next";
import Link from "next/link";
import { Eye, ChevronRight } from "lucide-react";
import NewsNavbar from "@/components/news/NewsNavbar";
import NewsFooter from "@/components/news/NewsFooter";
import ArticleCard from "@/components/news/ArticleCard";
import { getCategories, getPopular, SITE_URL } from "@/lib/news";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng | TrọCare",
  description: "Điều khoản sử dụng dịch vụ TrọCare.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default async function TermsPage() {
  const [categories, popular] = await Promise.all([
    getCategories(),
    getPopular(5),
  ]);

  return (
    <main className="min-h-screen bg-slate-50">
      <NewsNavbar categories={categories} />
      
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-600">Trang chủ</Link>
          <ChevronRight size={12} />
          <Link href="/tin-tuc" className="hover:text-slate-600">Tin tức</Link>
          <ChevronRight size={12} />
          <span className="text-slate-500">Pháp lý</span>
          <ChevronRight size={12} />
          <span className="text-slate-500 truncate max-w-[220px]">Điều khoản sử dụng</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <article>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-10">
              <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-4">
                Điều khoản sử dụng
              </h1>
              <p className="text-sm font-semibold text-slate-400 pb-5 border-b border-slate-100 mb-6">
                Cập nhật lần cuối: 03/06/2026
              </p>

              <div className="space-y-8 text-sm md:text-base leading-relaxed text-slate-600">
                <section>
                  <h2 className="text-lg font-bold text-slate-900 mb-3">1. Phạm vi dịch vụ</h2>
                  <p>
                    TrọCare cung cấp công cụ quản lý cho thuê cho chủ trọ, bao gồm quản lý dãy trọ, phòng, khách thuê, hợp đồng, hóa đơn, thu chi, thanh toán và các tiện ích vận hành liên quan.
                  </p>
                </section>

                <section className="border-t border-slate-100 pt-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">2. Trách nhiệm người dùng</h2>
                  <p>
                    Người dùng chịu trách nhiệm về tính chính xác của dữ liệu nhập vào hệ thống, quyền sử dụng thông tin khách thuê và việc tuân thủ quy định pháp luật liên quan đến hoạt động cho thuê.
                  </p>
                </section>

                <section className="border-t border-slate-100 pt-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">3. Tài khoản và bảo mật</h2>
                  <p>
                    Người dùng cần bảo vệ tài khoản đăng nhập, không chia sẻ token, mật khẩu hoặc thiết bị đã đăng nhập cho người không có quyền. Nếu phát hiện truy cập bất thường, vui lòng đăng xuất và liên hệ TrọCare.
                  </p>
                </section>

                <section className="border-t border-slate-100 pt-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">4. Thanh toán và đối soát</h2>
                  <p>
                    Các tính năng QR, SePay, hóa đơn và sổ quỹ hỗ trợ vận hành và đối soát. Người dùng cần kiểm tra giao dịch thực tế với ngân hàng hoặc đơn vị thanh toán trước khi ra quyết định tài chính.
                  </p>
                </section>

                <section className="border-t border-slate-100 pt-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">5. Thay đổi dịch vụ</h2>
                  <p>
                    TrọCare có thể cập nhật tính năng, giao diện hoặc điều khoản để cải thiện dịch vụ và đáp ứng yêu cầu pháp lý. Các thay đổi quan trọng sẽ được thông báo trong ứng dụng hoặc trên website.
                  </p>
                </section>

                <section className="border-t border-slate-100 pt-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">6. Liên hệ</h2>
                  <p>
                    Hỗ trợ người dùng:{" "}
                    <a href="mailto:namnguyen.nexsoft@gmail.com" className="font-bold text-blue-600 hover:underline">
                      namnguyen.nexsoft@gmail.com
                    </a>.
                  </p>
                </section>
              </div>
            </div>
          </article>

          {/* Right rail */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Eye size={16} className="text-[#2563EB]" /> Đọc nhiều nhất
                </h3>
                <div className="space-y-4">
                  {popular.map((a) => <ArticleCard key={a.id} article={a} variant="compact" />)}
                  {popular.length === 0 && <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-center text-white">
                <h4 className="font-black mb-2">Quản lý nhà trọ dễ dàng</h4>
                <p className="text-xs text-blue-100 mb-4">Miễn phí mãi mãi, không cần thẻ tín dụng.</p>
                <Link href="/login" className="inline-block bg-white text-blue-700 font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-colors">
                  Dùng ngay →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <NewsFooter categories={categories} />
    </main>
  );
}
