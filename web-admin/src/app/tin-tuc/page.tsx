import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Flame, ChevronRight } from "lucide-react";
import {
  getArticles, getPopular, getCategories,
  badgeFor, accentFor, coverOf, formatDate, SITE_URL, Article,
} from "@/lib/news";
import NewsNavbar from "@/components/news/NewsNavbar";
import NewsFooter from "@/components/news/NewsFooter";
import ArticleCard from "@/components/news/ArticleCard";
import JsonLd from "@/components/news/JsonLd";

export const dynamic = "force-dynamic";

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
  const subHero = isFirstPage ? popular.slice(1, 4) : [];
  const usedIds = new Set([hero?.id, ...subHero.map((a) => a.id)].filter(Boolean));
  const gridArticles = list.data.filter((a) => !usedIds.has(a.id));
  const sidebarPopular = popular.filter((a) => !usedIds.has(a.id)).slice(0, 5);
  const { totalPages } = list.pagination;

  // Per-category sections for the homepage (only on the un-filtered first page).
  let sections: { cat: (typeof categories)[number]; articles: Article[] }[] = [];
  if (isFirstPage && categories.length > 0) {
    const results = await Promise.all(
      categories.map((c) => getArticles({ category: c.name, limit: 4 }))
    );
    sections = categories
      .map((cat, i) => ({ cat, articles: results[i].data }))
      .filter((s) => s.articles.length > 0);
  }

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
        {!search && (
          <div className="mb-8">
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
              Tin tức &amp; Kinh nghiệm nhà trọ
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-2 max-w-2xl">
              Cẩm nang vận hành, pháp lý, phòng cháy chữa cháy và nghiệp vụ cho chủ trọ Việt Nam — cập nhật mỗi ngày.
            </p>
          </div>
        )}

        {search && (
          <h1 className="text-2xl font-black text-slate-900 mb-6">Kết quả tìm kiếm: &quot;{search}&quot;</h1>
        )}

        {/* ── Hero: 1 big story + 3 secondary stories + popular rail ────────── */}
        {hero && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6 mb-12">
            <div className="grid sm:grid-cols-[1.4fr_1fr] gap-5">
              <Link
                href={`/tin-tuc/${hero.slug}`}
                className="group relative rounded-2xl overflow-hidden bg-slate-900 shadow-lg min-h-[320px] sm:min-h-[420px] flex flex-col justify-end"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverOf(hero)}
                  alt={hero.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="relative p-6 md:p-8">
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full mb-3"
                    style={{ backgroundColor: accentFor(hero.category), color: "white" }}
                  >
                    <Flame size={11} /> Đọc nhiều nhất
                  </span>
                  <h2 className="text-xl md:text-3xl font-black text-white leading-snug group-hover:underline decoration-2 underline-offset-4 mb-2">
                    {hero.title}
                  </h2>
                  <p className="hidden md:block text-sm text-slate-200 line-clamp-2 max-w-xl mb-3">
                    {hero.excerpt || hero.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <span>{formatDate(hero.published_at || hero.created_at)}</span>
                    {hero.views && hero.views > 0 ? (
                      <span className="flex items-center gap-1"><Eye size={12} /> {hero.views} lượt xem</span>
                    ) : null}
                  </div>
                </div>
              </Link>

              <div className="flex flex-col gap-4">
                {subHero.map((a) => (
                  <Link key={a.id} href={`/tin-tuc/${a.slug}`} className="group flex gap-3 items-start">
                    <div className="relative w-24 h-20 sm:w-28 sm:h-24 shrink-0 rounded-xl overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverOf(a)} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="min-w-0">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 ${badgeFor(a.category)}`}>
                        {a.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-[#2563EB] transition-colors">
                        {a.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Popular rail */}
            <aside className="bg-white border border-slate-200 rounded-2xl p-5">
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
            </aside>
          </div>
        )}

        {/* ── Grid (search results / pagination) ─────────────────────────── */}
        {(search || page > 1) && (
          <>
            {gridArticles.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 mb-8">
                Không tìm thấy bài viết phù hợp.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                {gridArticles.map((a) => <ArticleCard key={a.id} article={a} />)}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mb-12">
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
          </>
        )}

        {/* ── Per-category sections ───────────────────────────────────────── */}
        {isFirstPage && sections.map(({ cat, articles }) => (
          <section key={cat.id} className="mb-14">
            <div className="flex items-center justify-between mb-5 pb-3 border-b-2" style={{ borderColor: accentFor(cat.name) }}>
              <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2.5">
                <span className="w-2 h-6 rounded-full" style={{ backgroundColor: accentFor(cat.name) }} />
                {cat.name}
              </h2>
              <Link
                href={`/tin-tuc/danh-muc/${cat.slug}`}
                className="text-xs font-bold text-slate-500 hover:text-[#2563EB] flex items-center gap-0.5 transition-colors"
              >
                Xem tất cả <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {articles.map((a) => <ArticleCard key={a.id} article={a} showCategory={false} />)}
            </div>
          </section>
        ))}
      </div>

      <NewsFooter categories={categories} />
    </main>
  );
}
