import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, Clock, ChevronRight, Calendar } from "lucide-react";
import {
  getArticleBySlug, getCategories, badgeFor, coverOf, formatDate, SITE_URL, Article,
} from "@/lib/news";
import { sanitizeHtml } from "@/lib/sanitize";
import NewsNavbar from "@/components/news/NewsNavbar";
import ArticleCard from "@/components/news/ArticleCard";
import JsonLd from "@/components/news/JsonLd";
import ReadingProgress from "@/components/news/ReadingProgress";
import ShareButtons from "@/components/news/ShareButtons";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Không tìm thấy bài viết | TrọCare" };

  const title = (article.seo_title || article.title).slice(0, 65);
  const description =
    (article.meta_description || article.excerpt || article.description || "").slice(0, 165);
  const url = article.canonical_url || `${SITE_URL}/tin-tuc/${article.slug}`;
  const ogImage = article.og_image_url || coverOf(article);

  return {
    title: `${title} | TrọCare`,
    description,
    keywords: article.focus_keyword || undefined,
    alternates: { canonical: url },
    robots: article.no_index ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: article.published_at || undefined,
      modifiedTime: article.last_reviewed_at || undefined,
      authors: article.author?.name ? [article.author.name] : undefined,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [article, categories] = await Promise.all([getArticleBySlug(slug), getCategories()]);
  if (!article) notFound();

  const url = `${SITE_URL}/tin-tuc/${article.slug}`;
  const cover = coverOf(article);
  const faq = article.faq || [];

  // ── JSON-LD ──
  const articleSchema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": article.schema_type || "Article",
    headline: article.title,
    description: article.excerpt || article.description || "",
    image: [cover],
    datePublished: article.published_at || article.created_at,
    dateModified: article.last_reviewed_at || article.published_at || article.created_at,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: article.author
      ? { "@type": "Person", name: article.author.name, jobTitle: article.author.title || undefined }
      : { "@type": "Organization", name: "TrọCare" },
    publisher: {
      "@type": "Organization",
      name: "TrọCare",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Tin tức", item: `${SITE_URL}/tin-tuc` },
      { "@type": "ListItem", position: 3, name: article.category, item: `${SITE_URL}/tin-tuc/danh-muc/${article.cat?.slug || ""}` },
      { "@type": "ListItem", position: 4, name: article.title, item: url },
    ],
  };

  const faqSchema = faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  return (
    <main className="min-h-screen bg-white">
      <ReadingProgress />
      <JsonLd data={faqSchema ? [articleSchema, breadcrumbSchema, faqSchema] : [articleSchema, breadcrumbSchema]} />
      <NewsNavbar categories={categories} />

      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-600">Trang chủ</Link>
          <ChevronRight size={12} />
          <Link href="/tin-tuc" className="hover:text-slate-600">Tin tức</Link>
          <ChevronRight size={12} />
          {article.cat?.slug && (
            <>
              <Link href={`/tin-tuc/danh-muc/${article.cat.slug}`} className="hover:text-slate-600">{article.category}</Link>
              <ChevronRight size={12} />
            </>
          )}
          <span className="text-slate-500 truncate max-w-[180px]">{article.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-6">
          <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-3 ${badgeFor(article.category)}`}>
            {article.category}
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight tracking-tight mb-4">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="text-base text-slate-600 leading-relaxed border-l-4 border-blue-200 pl-4 mb-5 font-medium">
              {article.excerpt}
            </p>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              {article.author && (
                <Link href={`/tin-tuc/tac-gia/${article.author.slug}`} className="flex items-center gap-2 group">
                  {article.author.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={article.author.avatar_url} alt={article.author.name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      {article.author.name.charAt(0)}
                    </div>
                  )}
                  <div className="leading-tight">
                    <div className="text-sm font-bold text-slate-800 group-hover:text-[#2563EB]">{article.author.name}</div>
                    {article.author.title && <div className="text-[11px] text-slate-400">{article.author.title}</div>}
                  </div>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(article.published_at || article.created_at)}</span>
              {article.reading_time ? <span className="flex items-center gap-1"><Clock size={12} /> {article.reading_time} phút đọc</span> : null}
              <span className="flex items-center gap-1"><Eye size={12} /> {article.views || 0}</span>
            </div>
          </div>
        </header>

        {/* Cover */}
        <div className="relative w-full rounded-2xl overflow-hidden bg-slate-100 mb-8" style={{ aspectRatio: "16/9" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt={article.title} className="w-full h-full object-cover" />
        </div>

        {/* Content */}
        <div
          className="article-prose"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content || "") }}
        />

        {/* FAQ */}
        {faq.length > 0 && (
          <section className="mt-10 pt-8 border-t border-slate-100">
            <h2 className="text-xl font-black text-slate-900 mb-5">Câu hỏi thường gặp</h2>
            <div className="space-y-3">
              {faq.map((f, i) => (
                <details key={i} className="group bg-slate-50 rounded-xl border border-slate-100 p-4">
                  <summary className="font-bold text-slate-800 cursor-pointer list-none flex justify-between items-center">
                    {f.q}
                    <ChevronRight size={16} className="text-slate-400 group-open:rotate-90 transition-transform" />
                  </summary>
                  <p className="text-sm text-slate-600 mt-3 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Tags + Share */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {article.tags.map((t) => (
                <Link key={t.id} href={`/tin-tuc/tag/${t.slug}`}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition-colors">
                  #{t.name}
                </Link>
              ))}
            </div>
          )}
          <ShareButtons url={url} title={article.title} />
        </div>

        {/* CTA */}
        <div className="mt-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-center text-white">
          <h3 className="text-lg md:text-xl font-black mb-2">Tự động hóa quản lý nhà trọ với TrọCare</h3>
          <p className="text-sm text-blue-100 mb-4">Quản lý phòng, khách thuê, hóa đơn và thu chi — miễn phí mãi mãi.</p>
          <Link href="/login" className="inline-block bg-white text-blue-700 font-bold text-sm px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors">
            Dùng miễn phí ngay →
          </Link>
        </div>

        {/* Related */}
        {article.related && article.related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-black text-slate-900 mb-5">Bài viết liên quan</h2>
            <div className="grid sm:grid-cols-3 gap-5">
              {article.related.map((a) => <ArticleCard key={a.id} article={a} />)}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
