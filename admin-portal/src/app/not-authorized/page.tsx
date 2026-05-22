import Link from "next/link";

export default function NotAuthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">KhÃ´ng Ä‘á»§ quyá»n</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          TÃ i khoáº£n hiá»‡n táº¡i khÃ´ng Ä‘Æ°á»£c phÃ©p truy cáº­p trang Admin nÃ y.
        </p>
        <Link href="/login" className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">
          Vá» trang Ä‘Äƒng nháº­p Admin
        </Link>
      </section>
    </main>
  );
}
