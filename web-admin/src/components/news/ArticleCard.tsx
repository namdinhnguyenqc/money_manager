import Link from "next/link";
import { Eye, Clock } from "lucide-react";
import { Article, badgeFor, coverOf, formatDate } from "@/lib/news";

// Server component: article grid card. `variant="compact"` renders a
// horizontal thumb+text row for dense list sections (sidebars, "more news").
export default function ArticleCard({
  article,
  variant = "grid",
  showCategory = true,
}: {
  article: Article;
  variant?: "grid" | "compact";
  showCategory?: boolean;
}) {
  if (variant === "compact") {
    return (
      <Link href={`/tin-tuc/${article.slug}`} className="group flex gap-3 items-start">
        <div className="relative w-20 h-16 md:w-24 md:h-[72px] shrink-0 rounded-lg overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverOf(article)} alt={article.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-[#2563EB] transition-colors">
            {article.title}
          </h4>
          <span className="text-[11px] text-slate-400 mt-1 block">{formatDate(article.published_at || article.created_at)}</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/tin-tuc/${article.slug}`}
      className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full"
    >
      <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverOf(article)}
          alt={article.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/40 to-transparent" />
        {showCategory && (
          <span className={`absolute top-3 left-3 inline-block text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm ${badgeFor(article.category)}`}>
            {article.category}
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-base font-bold text-[#0f172a] mb-2 line-clamp-2 group-hover:text-[#2563EB] transition-colors leading-snug">
          {article.title}
        </h3>
        <p className="text-[13px] text-slate-500 line-clamp-2 mb-4 flex-grow leading-relaxed">
          {article.excerpt || article.description}
        </p>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-auto pt-3 border-t border-slate-50">
          <span>{formatDate(article.published_at || article.created_at)}</span>
          <div className="flex items-center gap-3">
            {article.reading_time ? (
              <span className="flex items-center gap-1"><Clock size={11} /> {article.reading_time} phút</span>
            ) : null}
            {article.views && article.views > 0 ? (
              <span className="flex items-center gap-1"><Eye size={11} /> {article.views}</span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
