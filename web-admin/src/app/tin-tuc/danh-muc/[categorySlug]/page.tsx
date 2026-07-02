import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategoryBySlug, getCategories, getArticles, accentFor, SITE_URL,
} from "@/lib/news";
import NewsNavbar from "@/components/news/NewsNavbar";
import NewsFooter from "@/components/news/NewsFooter";
import ArticleCard from "@/components/news/ArticleCard";
import JsonLd from "@/components/news/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const cat = await getCategoryBySlug(categorySlug);
  if (!cat) return { title: "Danh mục không tồn tại | TrọCare" };
  const title = cat.meta_title || `${cat.name} - Tin tức nhà trọ | TrọCare`;
  const description = cat.meta_description || cat.description || `Các bài viết thuộc chủ đề ${cat.name} cho chủ trọ.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/tin-tuc/danh-muc/${cat.slug}` },
    openGraph: { title, description, url: `${SITE_URL}/tin-tuc/danh-muc/${cat.slug}`, type: "website" },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { categorySlug } = await params;
  const sp = await searchParams;
  const page = Math.max(parseInt(sp.page || "1", 10) || 1, 1);

  const cat = await getCategoryBySlug(categorySlug);
  if (!cat) notFound();

  const [categories, list] = await Promise.all([
    getCategories(),
    getArticles({ page, limit: 16, category: cat.name }),
  ]);
  const { totalPages, total } = list.pagination;
  const accent = accentFor(cat.name);

  return (
    <main className="min-h-screen bg-slate-50">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: cat.name,
          description: cat.description || undefined,
          url: `${SITE_URL}/tin-tuc/danh-muc/${cat.slug}`,
        }}
      />
      <NewsNavbar categories={categories} activeSlug={cat.slug} />

      {/* Category banner */}
      <div className="text-white" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-10 md:py-14">
          <nav className="text-xs text-white/70 mb-3">
            <Link href="/tin-tuc" className="hover:text-white">Tin tức</Link> / <span className="text-white">{cat.name}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">{cat.name}</h1>
          <p className="text-sm md:text-base text-white/80 mt-2 max-w-2xl">{cat.description || `${total} bài viết thuộc chủ đề ${cat.name}.`}</p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-10">
        {list.data.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
            Chưa có bài viết trong danh mục này.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {list.data.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            {page > 1 && (
              <Link href={`/tin-tuc/danh-muc/${cat.slug}?page=${page - 1}`}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-white bg-white/50">← Trước</Link>
            )}
            <span className="px-4 py-2 text-sm text-slate-500">Trang {page}/{totalPages}</span>
            {page < totalPages && (
              <Link href={`/tin-tuc/danh-muc/${cat.slug}?page=${page + 1}`}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-white bg-white/50">Sau →</Link>
            )}
          </div>
        )}
      </div>

      <NewsFooter categories={categories} />
    </main>
  );
}
