import type { Metadata } from "next";
import Link from "next/link";
import { Eye, ChevronRight } from "lucide-react";
import {
  getArticles, getFeatured, getPopular, getCategories,
  Article, badgeFor, coverOf, formatDate, SITE_URL,
} from "@/lib/news";
import NewsNavbar from "@/components/news/NewsNavbar";
import ArticleCard from "@/components/news/ArticleCard";
import JsonLd from "@/components/news/JsonLd";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Tin tức & Kinh nghiệm quản lý nhà trọ | TrọCare",
  description:
    "Cẩm nang quản lý phòng trọ, hướng dẫn tính tiền điện nước, thủ tục pháp lý, quy định PCCC và kinh nghiệm cho thuê nhà trọ mới nhất từ TrọCare.",
  alternates: { canonical: `${SITE_URL}/tin-tuc` },
  openGraph: {
    title: "Tin tức & Kinh nghiệm quản lý nhà trọ | TrọCare",
    description: "Cẩm nang, hướng dẫn, pháp lý và kinh nghiệm cho thuê nhà trọ mới nhất.",
    url: `${SITE_URL}/tin-tuc`,
    type: "website",
  },
};

export default async function NewsHomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(parseInt(sp.page || "1", 10) || 1, 1);
  const search = sp.q || "";

  const [featured, popular, categories, list] = await Promise.all([
    page === 1 && !search ? getFeatured(1) : Promise.resolve([]),
    getPopular(5),
    getCategories(),
    getArticles({ page, limit: 9, search }),
  ]);

  const hero = featured[0];
  // Avoid duplicating hero in the grid
  const gridArticles = hero
    ? list.data.filter((a) => a.id !== hero.id)
    : list.data;
  const { totalPages } = list.pagination;

  return (
    <main className="min-h-screen bg-slate-50">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Tin tức & Kinh nghiệm quản lý nhà trọ",
          url: `${SITE_URL}/tin-tuc`,
          isPartOf: { "@type": "WebSite", name: "TrọCare", url: SITE_URL },
        }}
      />
      <NewsNavbar categories={categories} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {search ? `Kết quả tìm kiếm: "${search}"` : "Tin tức & Kinh nghiệm nhà trọ"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cẩm nang vận hành, pháp lý, PCCC và nghiệp vụ cho thuê phòng trọ.
          </p>
        </div>

        {/* Hero featured */}
        {hero && (
          <Link
            href={`/tin-tuc/${hero.slug}`}
            className="group grid md:grid-cols-2 gap-6 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all mb-10"
          >
            <div className="relative h-56 md:h-full min-h-[240px] bg-slate-100 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverOf(hero)} alt={hero.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-6 md:p-8 flex flex-col justify-center">
              <span className={`inline-block w-fit text-xs font-semibold px-2.5 py-0.5 rounded-full mb-3 ${badgeFor(hero.category)}`}>
                {hero.category}
              </span>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-snug group-hover:text-[#2563EB] transition-colors mb-3">
                {hero.title}
              </h2>
              <p className="text-sm text-slate-500 line-clamp-3 mb-4">{hero.excerpt || hero.description}</p>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>{formatDate(hero.published_at || hero.created_at)}</span>
                <span className="flex items-center gap-1"><Eye size={12} /> {hero.views || 0}</span>
              </div>
            </div>
          </Link>
        )}

        {/* Grid + sidebar */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {gridArticles.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                Chưa có bài viết nào.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-6">
                {gridArticles.map((a) => <ArticleCard key={a.id} article={a} />)}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {page > 1 && (
                  <Link href={`/tin-tuc?page=${page - 1}${search ? `&q=${search}` : ""}`}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-white bg-white/50">
                    ← Trước
                  </Link>
                )}
                <span className="px-4 py-2 text-sm text-slate-500">Trang {page}/{totalPages}</span>
                {page < totalPages && (
                  <Link href={`/tin-tuc?page=${page + 1}${search ? `&q=${search}` : ""}`}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-white bg-white/50">
                    Sau →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Sidebar: most viewed */}
          <aside className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sticky top-32">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Eye size={16} className="text-[#2563EB]" /> Xem nhiều nhất
              </h3>
              <ol className="space-y-4">
                {popular.map((a, i) => (
                  <li key={a.id}>
                    <Link href={`/tin-tuc/${a.slug}`} className="group flex gap-3 items-start">
                      <span className="text-2xl font-black text-slate-200 group-hover:text-[#2563EB] transition-colors leading-none w-6 shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 line-clamp-2 group-hover:text-[#2563EB] transition-colors leading-snug">
                          {a.title}
                        </h4>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                          <Eye size={10} /> {a.views || 0}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
                {popular.length === 0 && <li className="text-sm text-slate-400">Chưa có dữ liệu.</li>}
              </ol>

              {/* Category links */}
              {categories.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-3">Danh mục</h3>
                  <ul className="space-y-1">
                    {categories.map((c) => (
                      <li key={c.id}>
                        <Link href={`/tin-tuc/danh-muc/${c.slug}`}
                          className="flex items-center justify-between text-sm text-slate-600 hover:text-[#2563EB] py-1.5 group">
                          {c.name}
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-[#2563EB]" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
