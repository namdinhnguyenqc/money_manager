import Link from "next/link";
import Image from "next/image";
import { NewsCategory } from "@/lib/news";

export default function NewsFooter({ categories = [] }: { categories?: NewsCategory[] }) {
  return (
    <footer className="mt-16 bg-slate-900 text-slate-400">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Image src="/brand/transparent/trocare-symbol-tc-transparent-256.png" alt="" width={36} height={36} />
              <span className="text-lg font-bold text-white">Tro<span className="text-blue-400">Care</span></span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Nền tảng quản lý nhà trọ, phòng cho thuê tự động — miễn phí, dễ dùng cho mọi chủ trọ Việt Nam.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-wide text-white mb-4">Chuyên mục</h4>
            <ul className="space-y-2.5 text-sm">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/tin-tuc/danh-muc/${c.slug}`} className="hover:text-white transition-colors">{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-wide text-white mb-4">TrọCare</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Trang chủ</Link></li>
              <li><Link href="/tin-tuc" className="hover:text-white transition-colors">Tin tức</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Đăng nhập</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-wide text-white mb-4">Bắt đầu ngay</h4>
            <p className="text-sm mb-4">Quản lý phòng, khách thuê, hóa đơn và thu chi hoàn toàn miễn phí.</p>
            <Link href="/login" className="inline-block bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors">
              Dùng miễn phí →
            </Link>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span>© {new Date().getFullYear()} TrọCare. Mọi quyền được bảo lưu.</span>
          <span>Nội dung mang tính chất tham khảo, không thay thế tư vấn pháp lý chuyên môn.</span>
        </div>
      </div>
    </footer>
  );
}
