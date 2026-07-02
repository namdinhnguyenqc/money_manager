import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { NewsCategory } from "@/lib/news";

// Server component: top navbar for the news section (logo + CTA only —
// category browsing lives in the left CategorySidebar on article pages).
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
      </div>
    </header>
  );
}
