import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Chính sách bảo mật | TroCare",
  description: "Chính sách bảo mật dữ liệu người dùng của TroCare Owner.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <article className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/optimized/trocare-logo-full-navbar.png"
              alt="TroCare Logo"
              width={170}
              height={55}
              className="object-contain"
            />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-blue-200 hover:text-blue-600">
              Quay lại
            </Link>
            <Link href="/login" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700">
              Đăng nhập
            </Link>
          </div>
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">Chính sách bảo mật</h1>
        <p className="mt-3 text-sm font-semibold text-slate-500">Cập nhật lần cuối: 03/06/2026</p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">
          <section>
            <h2 className="text-lg font-extrabold text-slate-950">1. TroCare thu thập dữ liệu nào?</h2>
            <p className="mt-2">
              TroCare thu thập dữ liệu cần thiết để vận hành phần mềm quản lý cho thuê, gồm thông tin tài khoản như họ tên, email, ảnh đại diện Google, số điện thoại, thông tin hồ sơ chủ trọ, dữ liệu dãy trọ, phòng, khách thuê, hợp đồng, hóa đơn, giao dịch thu chi, kênh thanh toán và phản hồi hỗ trợ.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-950">2. TroCare dùng dữ liệu để làm gì?</h2>
            <p className="mt-2">
              Dữ liệu được dùng để đăng nhập, quản lý phòng trọ, lập hóa đơn, theo dõi thanh toán, quản lý hợp đồng, nhắc việc, hỗ trợ khách hàng, bảo mật hệ thống và cải thiện trải nghiệm sử dụng.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-950">3. Chia sẻ dữ liệu</h2>
            <p className="mt-2">
              TroCare không bán dữ liệu cá nhân. Dữ liệu có thể được xử lý bởi các nhà cung cấp hạ tầng cần thiết như dịch vụ lưu trữ, xác thực, thanh toán, gửi thông báo hoặc công cụ vận hành hệ thống. Các bên này chỉ được dùng dữ liệu trong phạm vi cung cấp dịch vụ cho TroCare.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-950">4. Bảo mật</h2>
            <p className="mt-2">
              TroCare sử dụng kết nối HTTPS, cơ chế token đăng nhập và lưu token trong vùng lưu trữ bảo mật của thiết bị. Người dùng cần giữ an toàn tài khoản Google và thiết bị cá nhân của mình.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-950">5. Quyền của người dùng</h2>
            <p className="mt-2">
              Người dùng có thể yêu cầu xem, chỉnh sửa hoặc xóa tài khoản và dữ liệu liên quan. Xem hướng dẫn tại <Link href="/delete-account" className="font-bold text-blue-600">trang xóa tài khoản</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-950">6. Liên hệ</h2>
            <p className="mt-2">
              Nếu có câu hỏi về bảo mật dữ liệu, vui lòng liên hệ: <a href="mailto:namnguyen.nexsoft@gmail.com" className="font-bold text-blue-600">namnguyen.nexsoft@gmail.com</a>.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
