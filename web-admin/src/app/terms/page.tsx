import type { Metadata } from "next";
import Link from "next/link";
import NewsNavbar from "@/components/news/NewsNavbar";
import NewsFooter from "@/components/news/NewsFooter";
import { getCategories, SITE_URL } from "@/lib/news";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng | TrọCare",
  description: "Điều khoản sử dụng dịch vụ TrọCare.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default async function TermsPage() {
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
          <span className="text-slate-600">Điều khoản sử dụng</span>
        </div>

        <article className="bg-white border border-slate-200 rounded-2xl p-6 md:p-10 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Điều khoản sử dụng
          </h1>
          <p className="text-sm font-semibold text-slate-400 mt-3">Cập nhật lần cuối: 03/06/2026</p>

          <div className="mt-8 space-y-8 text-sm md:text-base leading-relaxed text-slate-600">
            <section className="border-t border-slate-100 pt-8">
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
        </article>
      </div>

      <NewsFooter categories={categories} />
    </main>
  );
}
