import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Xóa tài khoản và dữ liệu | TroCare",
  description: "Hướng dẫn yêu cầu xóa tài khoản TroCare và dữ liệu liên quan.",
  alternates: { canonical: "/delete-account" },
};

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <article className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/transparent/trocare-symbol-tc-transparent-128.png"
              alt="TroCare Logo"
              width={28}
              height={28}
              className="object-contain"
            />
            <span className="text-lg tracking-tight font-medium">
              <span className="text-slate-900">Tro</span>
              <span className="text-blue-600 font-black">Care</span>
            </span>
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
        <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">Xóa tài khoản và dữ liệu</h1>
        <p className="mt-3 text-sm font-semibold text-slate-500">Cập nhật lần cuối: 03/06/2026</p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">
          <section>
            <h2 className="text-lg font-extrabold text-slate-950">1. Cách yêu cầu xóa tài khoản</h2>
            <p className="mt-2">
              Người dùng có thể yêu cầu xóa tài khoản bằng cách gửi email đến <a href="mailto:namnguyen.nexsoft@gmail.com?subject=Yeu%20cau%20xoa%20tai%20khoan%20TroCare" className="font-bold text-blue-600">namnguyen.nexsoft@gmail.com</a> với tiêu đề “Yêu cầu xóa tài khoản TroCare”. Vui lòng gửi từ email đang dùng để đăng nhập TroCare.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-950">2. Dữ liệu sẽ được xóa</h2>
            <p className="mt-2">
              Khi yêu cầu được xác minh, TroCare sẽ xóa tài khoản owner và dữ liệu liên quan trong hệ thống như hồ sơ chủ trọ, dãy trọ, phòng, khách thuê, hợp đồng, hóa đơn, giao dịch, ví, cấu hình thanh toán, thông báo và token đăng nhập.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-950">3. Dữ liệu có thể được giữ lại tạm thời</h2>
            <p className="mt-2">
              Một số log kỹ thuật hoặc dữ liệu cần thiết cho bảo mật, phòng chống gian lận, nghĩa vụ pháp lý hoặc sao lưu hệ thống có thể được giữ lại trong thời gian hợp lý, sau đó sẽ được xóa hoặc ẩn danh theo quy trình vận hành.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-950">4. Thời gian xử lý</h2>
            <p className="mt-2">
              TroCare sẽ phản hồi yêu cầu trong vòng 7 ngày làm việc và hoàn tất xử lý trong thời gian hợp lý sau khi xác minh chủ tài khoản.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-950">5. Liên kết liên quan</h2>
            <p className="mt-2">
              Xem thêm <Link href="/privacy" className="font-bold text-blue-600">Chính sách bảo mật</Link> và <Link href="/terms" className="font-bold text-blue-600">Điều khoản sử dụng</Link>.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
