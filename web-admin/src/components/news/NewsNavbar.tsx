import Link from "next/link";
import { Search } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { NewsCategory } from "@/lib/news";

// Server component: news-portal header — top bar (logo/search/CTA) + a
// horizontal category strip, matching the layout of major VN news sites.
export default function NewsNavbar({
  categories = [],
  activeSlug,
}: {
  categories?: NewsCategory[];
  activeSlug?: string;
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="TrọCare" className="shrink-0"><Logo /></Link>
            <span className="h-5 w-px bg-slate-200 hidden sm:block" />
            <Link
              href="/tin-tuc"
              className="hidden sm:block text-[11px] font-black tracking-[0.2em] text-slate-400 uppercase shrink-0"
            >
              Tin tức
            </Link>
          </div>

          <form action="/tin-tuc" className="hidden md:flex flex-1 max-w-md relative">
            <input
              type="text"
              name="q"
              placeholder="Tìm kiếm bài viết…"
              className="w-full bg-slate-100 border border-transparent focus:border-blue-300 focus:bg-white rounded-full pl-4 pr-10 py-2 text-sm outline-none transition-colors"
            />
            <button type="submit" aria-label="Tìm kiếm" className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <Search size={16} />
            </button>
          </form>

          <Link
            href="/login"
            className="shrink-0 text-sm font-bold text-white bg-[#2563EB] hover:bg-[#1d4ed8] px-4 py-2 rounded-lg transition-colors"
          >
            Dùng miễn phí
          </Link>
        </div>
      </div>

      {categories.length > 0 && (
        <nav className="border-t border-slate-100 bg-white">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6">
            <ul className="flex items-center gap-1 overflow-x-auto scrollbar-none h-11">
              <li className="shrink-0">
                <Link
                  href="/tin-tuc"
                  className={`block px-3 h-11 leading-[44px] text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                    !activeSlug
                      ? "text-[#2563EB] border-[#2563EB]"
                      : "text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-200"
                  }`}
                >
                  Trang chủ
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id} className="shrink-0">
                  <Link
                    href={`/tin-tuc/danh-muc/${c.slug}`}
                    className={`block px-3 h-11 leading-[44px] text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                      activeSlug === c.slug
                        ? "text-[#2563EB] border-[#2563EB]"
                        : "text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-200"
                    }`}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </header>
  );
}
