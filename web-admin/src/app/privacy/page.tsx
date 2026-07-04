import type { Metadata } from "next";
import Link from "next/link";
import { Eye, ChevronRight } from "lucide-react";
import NewsNavbar from "@/components/news/NewsNavbar";
import NewsFooter from "@/components/news/NewsFooter";
import ArticleCard from "@/components/news/ArticleCard";
import { getCategories, getPopular, SITE_URL } from "@/lib/news";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chính sách bảo mật | TrọCare",
  description: "Chính sách bảo mật dữ liệu người dùng của TrọCare.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default async function PrivacyPage() {
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
          <span className="text-slate-500 truncate max-w-[220px]">Chính sách bảo mật</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <article>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-10">
              <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-4">
                Chính sách bảo mật
              </h1>
              <p className="text-sm font-semibold text-slate-400 pb-5 border-b border-slate-100 mb-6">
                Cập nhật lần cuối: 03/06/2026
              </p>

              <div className="space-y-8 text-sm md:text-base leading-relaxed text-slate-600">
                <section>
                  <h2 className="text-lg font-bold text-slate-900 mb-3">1. TrọCare thu thập dữ liệu nào?</h2>
                  <p>
                    TrọCare thu thập dữ liệu cần thiết để vận hành phần mềm quản lý cho thuê, gồm thông tin tài khoản như họ tên, email, ảnh đại diện Google, số điện thoại, thông tin hồ sơ chủ trọ, dữ liệu dãy trọ, phòng, khách thuê, hợp đồng, hóa đơn, giao dịch thu chi, kênh thanh toán và phản hồi hỗ trợ.
                  </p>
                </section>

                <section className="border-t border-slate-100 pt-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">2. TrọCare dùng dữ liệu để làm gì?</h2>
                  <p>
                    Dữ liệu được dùng để đăng nhập, quản lý phòng trọ, lập hóa đơn, theo dõi thanh toán, quản lý hợp đồng, nhắc việc, hỗ trợ khách hàng, bảo mật hệ thống và cải thiện trải nghiệm sử dụng.
                  </p>
                </section>

                <section className="border-t border-slate-100 pt-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">3. Chia sẻ dữ liệu</h2>
                  <p>
                    TrọCare không bán dữ liệu cá nhân. Dữ liệu có thể được xử lý bởi các nhà cung cấp hạ tầng cần thiết như dịch vụ lưu trữ, xác thực, thanh toán, gửi thông báo hoặc công cụ vận hành hệ thống. Các bên này chỉ được dùng dữ liệu trong phạm vi cung cấp dịch vụ cho TrọCare.
                  </p>
                </section>

                <section className="border-t border-slate-100 pt-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">4. Bảo mật</h2>
                  <p>
                    TrọCare sử dụng kết nối HTTPS, cơ chế token đăng nhập và lưu token trong vùng lưu trữ bảo mật của thiết bị. Người dùng cần giữ an toàn tài khoản Google và thiết bị cá nhân của mình.
                  </p>
                </section>

                <section className="border-t border-slate-100 pt-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">5. Quyền của người dùng</h2>
                  <p>
                    Người dùng có thể yêu cầu xem, chỉnh sửa hoặc xóa tài khoản và dữ liệu liên quan. Xem hướng dẫn tại{" "}
                    <Link href="/delete-account" className="font-bold text-blue-600 hover:underline">
                      trang xóa tài khoản
                    </Link>
                    .
                  </p>
                </section>

                <section className="border-t border-slate-100 pt-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">6. Liên hệ</h2>
                  <p>
                    Nếu có câu hỏi về bảo mật dữ liệu, vui lòng liên hệ:{" "}
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
