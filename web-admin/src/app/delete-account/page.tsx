import type { Metadata } from "next";
import Link from "next/link";
import { Eye, ChevronRight } from "lucide-react";
import NewsNavbar from "@/components/news/NewsNavbar";
import NewsFooter from "@/components/news/NewsFooter";
import ArticleCard from "@/components/news/ArticleCard";
import Logo from "@/components/ui/Logo";
import { getCategories, getPopular, SITE_URL } from "@/lib/news";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Xóa tài khoản và dữ liệu | TrọCare",
  description: "Hướng dẫn chi tiết quy trình yêu cầu xóa tài khoản TrọCare và toàn bộ dữ liệu cá nhân liên quan.",
  alternates: { canonical: `${SITE_URL}/delete-account` },
};

export default async function DeleteAccountPage() {
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
          <span className="text-slate-500 truncate max-w-[220px]">Xóa tài khoản và dữ liệu</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <article>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-10">
              <div className="flex items-center gap-2 mb-6 pb-6 border-b border-slate-100">
                <Logo />
              </div>

              <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-4">
                Yêu cầu xóa tài khoản &amp; Dữ liệu người dùng
              </h1>
              <p className="text-sm font-semibold text-slate-400 pb-5 border-b border-slate-100 mb-6">
                Cập nhật lần cuối: 03/06/2026
              </p>

              <div className="space-y-8 text-sm md:text-base leading-relaxed text-slate-600">
                <section>
                  <h2 className="text-lg font-bold text-slate-900 mb-3">1. Quy trình gửi yêu cầu xóa tài khoản</h2>
                  <p>
                    Để đảm bảo tính bảo mật và xác thực quyền sở hữu, người dùng có thể gửi yêu cầu xóa tài khoản bằng cách gửi email trực tiếp tới bộ phận hỗ trợ kỹ thuật qua hòm thư:{" "}
                    <a href="mailto:namnguyen.nexsoft@gmail.com?subject=Yêu%20cầu%20xóa%20tài%20khoản%20TrọCare" className="font-bold text-blue-600 hover:underline">
                      namnguyen.nexsoft@gmail.com
                    </a>{" "}
                    với tiêu đề <strong>“Yêu cầu xóa tài khoản TrọCare”</strong>.
                  </p>
                  <p className="mt-2 text-slate-500 text-xs italic">
                    * Lưu ý: Email yêu cầu phải được gửi từ địa chỉ email mà quý khách đã sử dụng để đăng nhập và đăng ký tài khoản trên hệ thống TrọCare.
                  </p>
                </section>

                <section className="border-t border-slate-100 pt-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">2. Danh sách dữ liệu sẽ được xóa hoàn toàn</h2>
                  <p>
                    Sau khi yêu cầu của quý khách được tiếp nhận và xác thực thành công, hệ thống TrọCare sẽ tiến hành xóa vĩnh viễn tài khoản của chủ trọ (Owner) cùng toàn bộ dữ liệu quản lý liên quan bao gồm:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Thông tin hồ sơ cá nhân và tài khoản đăng nhập Google.</li>
                    <li>Danh sách các dãy trọ, thông tin chi tiết các phòng trọ và dữ liệu khách thuê.</li>
                    <li>Hợp đồng thuê nhà, hóa đơn hàng tháng, lịch sử giao dịch thu chi và ví tài chính.</li>
                    <li>Cấu hình liên kết thanh toán, lịch sử thông báo gửi đi và các token đăng nhập bảo mật.</li>
                  </ul>
                </section>

                <section className="border-t border-slate-100 pt-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">3. Chính sách lưu trữ dữ liệu tạm thời</h2>
                  <p>
                    Nhằm mục đích bảo mật hệ thống, phát hiện và ngăn ngừa gian lận, thực hiện các nghĩa vụ pháp lý bắt buộc hoặc quy trình sao lưu (backup) định kỳ, một số log kỹ thuật hoặc dữ liệu giao dịch có thể được giữ lại tạm thời trong cơ sở dữ liệu dự phòng. Các thông tin này sẽ được xóa hoàn toàn hoặc ẩn danh hóa (anonymized) theo đúng chính sách vận hành của hệ thống sau một thời gian hợp lý.
                  </p>
                </section>

                <section className="border-t border-slate-100 pt-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">4. Cam kết thời gian xử lý</h2>
                  <p>
                    Bộ phận kỹ thuật của TrọCare cam kết phản hồi thông tin xác nhận yêu cầu xóa tài khoản trong vòng <strong>7 ngày làm việc</strong> kể từ khi nhận được email yêu cầu của quý khách, và hoàn tất việc xóa sạch dữ liệu trên hệ thống lưu trữ chính ngay sau đó.
                  </p>
                </section>

                <section className="border-t border-slate-100 pt-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">5. Các điều khoản liên quan khác</h2>
                  <p>
                    Quý khách vui lòng tham khảo thêm thông tin chi tiết về quyền riêng tư và trách nhiệm sử dụng dịch vụ tại{" "}
                    <Link href="/privacy" className="font-bold text-blue-600 hover:underline">
                      Chính sách bảo mật
                    </Link>{" "}
                    và{" "}
                    <Link href="/terms" className="font-bold text-blue-600 hover:underline">
                      Điều khoản sử dụng
                    </Link>{" "}
                    của TrọCare.
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
