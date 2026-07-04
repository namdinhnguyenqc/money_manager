import type { Metadata } from "next";
import Link from "next/link";
import NewsNavbar from "@/components/news/NewsNavbar";
import NewsFooter from "@/components/news/NewsFooter";
import { getCategories, SITE_URL } from "@/lib/news";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chính sách bảo mật | TrọCare",
  description: "Chính sách bảo mật dữ liệu người dùng của TrọCare.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default async function PrivacyPage() {
  const categories = await getCategories();

  return (
    <main className="min-h-screen bg-slate-50">
      <NewsNavbar categories={categories} />
      
      <div className="max-w-[800px] mx-auto px-4 md:px-6 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-6 font-bold uppercase tracking-wider">
          <Link href="/tin-tuc" className="hover:text-[#2563EB]">Tin tức</Link>
          <span>/</span>
          <span className="text-slate-600">Pháp lý</span>
          <span>/</span>
          <span className="text-slate-600">Chính sách bảo mật</span>
        </div>

        <article className="bg-white border border-slate-200 rounded-2xl p-6 md:p-10 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Chính sách bảo mật
          </h1>
          <p className="text-sm font-semibold text-slate-400 mt-3">Cập nhật lần cuối: 03/06/2026</p>

          <div className="mt-8 space-y-8 text-sm md:text-base leading-relaxed text-slate-600">
            <section className="border-t border-slate-100 pt-8">
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
        </article>
      </div>

      <NewsFooter categories={categories} />
    </main>
  );
}
