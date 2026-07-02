import Link from "next/link";
import { Eye, Clock } from "lucide-react";
import { Article, badgeFor, coverOf, formatDate } from "@/lib/news";

// Server component: article grid card
export default function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/tin-tuc/${article.slug}`}
      className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full"
    >
      <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverOf(article)}
          alt={article.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-center mb-3">
          <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeFor(article.category)}`}>
            {article.category}
          </span>
          {article.views && article.views > 0 ? (
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Eye size={12} /> {article.views}
            </span>
          ) : null}
        </div>
        <h3 className="text-base font-bold text-[#0f172a] mb-2 line-clamp-2 group-hover:text-[#2563EB] transition-colors">
          {article.title}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-3 mb-4 flex-grow">
          {article.excerpt || article.description}
        </p>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-auto">
          <span>{formatDate(article.published_at || article.created_at)}</span>
          {article.reading_time ? (
            <span className="flex items-center gap-1"><Clock size={11} /> {article.reading_time} phút</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
