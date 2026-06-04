import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng | TroCare",
  description: "Điều khoản sử dụng dịch vụ TroCare Owner.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <article className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-bold text-blue-600">TroCare</Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-blue-200 hover:text-blue-600">
              Quay lại
            </Link>
            <Link href="/login" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700">
              Đăng nhập
            </Link>
          </div>
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">Điều khoản sử dụng</h1>
        <p className="mt-3 text-sm font-semibold text-slate-500">Cập nhật lần cuối: 03/06/2026</p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">
          <section>
            <h2 className="text-lg font-extrabold text-slate-950">1. Phạm vi dịch vụ</h2>
            <p className="mt-2">
              TroCare cung cấp công cụ quản lý cho thuê cho chủ trọ, bao gồm quản lý dãy trọ, phòng, khách thuê, hợp đồng, hóa đơn, thu chi, thanh toán và các tiện ích vận hành liên quan.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-950">2. Trách nhiệm người dùng</h2>
            <p className="mt-2">
              Người dùng chịu trách nhiệm về tính chính xác của dữ liệu nhập vào hệ thống, quyền sử dụng thông tin khách thuê và việc tuân thủ quy định pháp luật liên quan đến hoạt động cho thuê.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-950">3. Tài khoản và bảo mật</h2>
            <p className="mt-2">
              Người dùng cần bảo vệ tài khoản đăng nhập, không chia sẻ token, mật khẩu hoặc thiết bị đã đăng nhập cho người không có quyền. Nếu phát hiện truy cập bất thường, vui lòng đăng xuất và liên hệ TroCare.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-950">4. Thanh toán và đối soát</h2>
            <p className="mt-2">
              Các tính năng QR, SePay, hóa đơn và sổ quỹ hỗ trợ vận hành và đối soát. Người dùng cần kiểm tra giao dịch thực tế với ngân hàng hoặc đơn vị thanh toán trước khi ra quyết định tài chính.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-950">5. Thay đổi dịch vụ</h2>
            <p className="mt-2">
              TroCare có thể cập nhật tính năng, giao diện hoặc điều khoản để cải thiện dịch vụ và đáp ứng yêu cầu pháp lý. Các thay đổi quan trọng sẽ được thông báo trong ứng dụng hoặc trên website.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-extrabold text-slate-950">6. Liên hệ</h2>
            <p className="mt-2">
              Hỗ trợ người dùng: <a href="mailto:namnguyen.nexsoft@gmail.com" className="font-bold text-blue-600">namnguyen.nexsoft@gmail.com</a>.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
