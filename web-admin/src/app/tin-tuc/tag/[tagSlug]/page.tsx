import type { Metadata } from "next";
import Link from "next/link";
import { getArticles, getCategories, SITE_URL } from "@/lib/news";
import NewsNavbar from "@/components/news/NewsNavbar";
import ArticleCard from "@/components/news/ArticleCard";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tagSlug: string }>;
}): Promise<Metadata> {
  const { tagSlug } = await params;
  const label = decodeURIComponent(tagSlug).replace(/-/g, " ");
  return {
    title: `#${label} - Tin tức nhà trọ | TrọCare`,
    description: `Các bài viết gắn thẻ ${label}.`,
    alternates: { canonical: `${SITE_URL}/tin-tuc/tag/${tagSlug}` },
  };
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tagSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { tagSlug } = await params;
  const sp = await searchParams;
  const page = Math.max(parseInt(sp.page || "1", 10) || 1, 1);

  const [categories, list] = await Promise.all([
    getCategories(),
    getArticles({ page, limit: 12, tag: tagSlug }),
  ]);
  const { totalPages } = list.pagination;
  const label = decodeURIComponent(tagSlug).replace(/-/g, " ");

  return (
    <main className="min-h-screen bg-slate-50">
      <NewsNavbar categories={categories} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">#{label}</h1>
        <p className="text-sm text-slate-500 mt-1">{list.pagination.total} bài viết</p>

        {list.data.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 mt-8">
            Chưa có bài viết nào với thẻ này.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {list.data.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {page > 1 && (
              <Link href={`/tin-tuc/tag/${tagSlug}?page=${page - 1}`}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-white bg-white/50">← Trước</Link>
            )}
            <span className="px-4 py-2 text-sm text-slate-500">Trang {page}/{totalPages}</span>
            {page < totalPages && (
              <Link href={`/tin-tuc/tag/${tagSlug}?page=${page + 1}`}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-white bg-white/50">Sau →</Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
