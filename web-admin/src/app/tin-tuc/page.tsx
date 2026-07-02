import type { Metadata } from "next";
import Link from "next/link";
import { Eye } from "lucide-react";
import {
  getArticles, getPopular, getCategories,
  badgeFor, coverOf, formatDate, SITE_URL,
} from "@/lib/news";
import NewsNavbar from "@/components/news/NewsNavbar";
import CategorySidebar from "@/components/news/CategorySidebar";
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
  const isFirstPage = page === 1 && !search;

  const [popular, categories, list] = await Promise.all([
    getPopular(6),
    getCategories(),
    getArticles({ page, limit: 12, search }),
  ]);

  // Bài xem nhiều nhất tự động lên đầu trang thay vì phải gắn "nổi bật" thủ công.
  const hero = isFirstPage ? popular[0] : undefined;
  const gridArticles = hero ? list.data.filter((a) => a.id !== hero.id) : list.data;
  const sidebarPopular = hero ? popular.filter((a) => a.id !== hero.id) : popular;
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

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
        <div className="grid lg:grid-cols-[240px_1fr_300px] gap-8">
          <CategorySidebar categories={categories} />

          <div className="min-w-0">
            {/* Page heading */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {search ? `Kết quả tìm kiếm: "${search}"` : "Tin tức & Kinh nghiệm nhà trọ"}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Cẩm nang vận hành, pháp lý, PCCC và nghiệp vụ cho thuê phòng trọ.
              </p>
            </div>

            {/* Hero: bài xem nhiều nhất */}
            {hero && (
              <Link
                href={`/tin-tuc/${hero.slug}`}
                className="group grid md:grid-cols-12 gap-6 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all mb-8"
              >
                <div className="relative h-56 md:h-full min-h-[260px] md:col-span-7 bg-slate-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverOf(hero)} alt={hero.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-400 text-amber-950">
                    🔥 Xem nhiều nhất
                  </span>
                </div>
                <div className="p-6 md:p-8 md:col-span-5 flex flex-col justify-center">
                  <span className={`inline-block w-fit text-xs font-semibold px-2.5 py-0.5 rounded-full mb-3 ${badgeFor(hero.category)}`}>
                    {hero.category}
                  </span>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-snug group-hover:text-[#2563EB] transition-colors mb-3">
                    {hero.title}
                  </h2>
                  <p className="text-sm text-slate-500 line-clamp-3 mb-4">{hero.excerpt || hero.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>{formatDate(hero.published_at || hero.created_at)}</span>
                    {hero.views && hero.views > 0 ? (
                      <span className="flex items-center gap-1"><Eye size={12} /> {hero.views} lượt xem</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            )}

            {/* Grid */}
            {gridArticles.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                Chưa có bài viết nào.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
          <aside className="hidden lg:block">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sticky top-24">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Eye size={16} className="text-[#2563EB]" /> Xem nhiều nhất
              </h3>
              <ol className="space-y-4">
                {sidebarPopular.map((a, i) => (
                  <li key={a.id}>
                    <Link href={`/tin-tuc/${a.slug}`} className="group flex gap-3 items-start">
                      <span className="text-2xl font-black text-slate-200 group-hover:text-[#2563EB] transition-colors leading-none w-6 shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 line-clamp-2 group-hover:text-[#2563EB] transition-colors leading-snug">
                          {a.title}
                        </h4>
                        {a.views && a.views > 0 ? (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                            <Eye size={10} /> {a.views} lượt xem
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
                {sidebarPopular.length === 0 && <li className="text-sm text-slate-400">Chưa có dữ liệu.</li>}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
