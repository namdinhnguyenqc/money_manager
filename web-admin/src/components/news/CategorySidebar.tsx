import Link from "next/link";
import { List } from "lucide-react";
import { NewsCategory } from "@/lib/news";

// Server component: vertical category menu shown on the left of news pages.
export default function CategorySidebar({
  categories,
  activeSlug,
}: {
  categories: NewsCategory[];
  activeSlug?: string;
}) {
  return (
    <aside className="hidden lg:block">
      <nav className="sticky top-24 bg-white border border-slate-200 rounded-2xl p-4">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wide px-2 mb-2 flex items-center gap-1.5">
          <List size={14} /> Danh mục
        </h3>
        <ul className="space-y-0.5">
          <li>
            <Link
              href="/tin-tuc"
              className={`block px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                !activeSlug ? "bg-blue-50 text-[#2563EB]" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Tất cả
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/tin-tuc/danh-muc/${c.slug}`}
                className={`block px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSlug === c.slug ? "bg-blue-50 text-[#2563EB] font-semibold" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
