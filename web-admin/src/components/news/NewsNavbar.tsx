import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { NewsCategory } from "@/lib/news";

// Server component: top navbar for the news section
export default function NewsNavbar({ categories = [] }: { categories?: NewsCategory[] }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" aria-label="TrọCare"><Logo /></Link>
          <Link
            href="/login"
            className="text-sm font-bold text-white bg-[#2563EB] hover:bg-[#1d4ed8] px-4 py-2 rounded-lg transition-colors"
          >
            Dùng miễn phí
          </Link>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto pb-2 -mb-px text-sm scrollbar-none">
          <Link href="/tin-tuc" className="px-3 py-1.5 rounded-lg font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap">
            Tất cả
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/tin-tuc/danh-muc/${c.slug}`}
              className="px-3 py-1.5 rounded-lg font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 whitespace-nowrap"
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
