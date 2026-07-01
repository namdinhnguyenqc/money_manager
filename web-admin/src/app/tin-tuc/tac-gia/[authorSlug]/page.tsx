import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Facebook, Globe, Linkedin } from "lucide-react";
import { getAuthorBySlug, getCategories, SITE_URL, Article } from "@/lib/news";
import NewsNavbar from "@/components/news/NewsNavbar";
import ArticleCard from "@/components/news/ArticleCard";
import JsonLd from "@/components/news/JsonLd";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ authorSlug: string }>;
}): Promise<Metadata> {
  const { authorSlug } = await params;
  const author = await getAuthorBySlug(authorSlug);
  if (!author) return { title: "Tác giả không tồn tại | TrọCare" };
  const title = `${author.name}${author.title ? ` - ${author.title}` : ""} | TrọCare`;
  const description = author.bio || `Các bài viết của ${author.name} trên TrọCare.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/tin-tuc/tac-gia/${author.slug}` },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ authorSlug: string }>;
}) {
  const { authorSlug } = await params;
  const [author, categories] = await Promise.all([getAuthorBySlug(authorSlug), getCategories()]);
  if (!author) notFound();

  const social = author.social_links || {};

  return (
    <main className="min-h-screen bg-slate-50">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: author.name,
          jobTitle: author.title || undefined,
          description: author.bio || undefined,
          url: `${SITE_URL}/tin-tuc/tac-gia/${author.slug}`,
          image: author.avatar_url || undefined,
        }}
      />
      <NewsNavbar categories={categories} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Author card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
          {author.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatar_url} alt={author.name} className="w-24 h-24 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-3xl font-black shrink-0">
              {author.name.charAt(0)}
            </div>
          )}
          <div className="flex-grow">
            <h1 className="text-2xl font-black text-slate-900">{author.name}</h1>
            {author.title && <p className="text-sm font-semibold text-blue-600 mt-0.5">{author.title}</p>}
            {author.bio && <p className="text-sm text-slate-600 mt-3 leading-relaxed">{author.bio}</p>}
            <div className="flex gap-2 mt-4 justify-center sm:justify-start">
              {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-600"><Facebook size={16} /></a>}
              {social.linkedin && <a href={social.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-600"><Linkedin size={16} /></a>}
              {social.website && <a href={social.website} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-600"><Globe size={16} /></a>}
            </div>
          </div>
        </div>

        <h2 className="text-lg font-black text-slate-900 mt-10 mb-5">
          Bài viết của {author.name} ({author.articles.length})
        </h2>
        {author.articles.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            Tác giả chưa có bài viết nào.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {author.articles.map((a: Article) => <ArticleCard key={a.id} article={a} />)}
          </div>
        )}
      </div>
    </main>
  );
}
