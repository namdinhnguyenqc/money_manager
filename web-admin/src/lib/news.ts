import { API_URL } from "@/lib/apiUrl";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://trocare-production.vercel.app";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface NewsAuthor {
  id: string;
  name: string;
  slug: string;
  avatar_url?: string | null;
  title?: string | null;
  bio?: string | null;
  social_links?: Record<string, string>;
}

export interface NewsCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  image_url?: string | null;
}

export interface NewsTag {
  id: string;
  name: string;
  slug: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  description?: string | null;
  excerpt?: string | null;
  content?: string;
  image_url?: string | null;
  og_image_url?: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  canonical_url?: string | null;
  schema_type?: "Article" | "NewsArticle" | "HowTo" | "FAQPage";
  no_index?: boolean;
  faq?: FaqItem[];
  views?: number;
  reading_time?: number;
  is_featured?: boolean;
  published_at?: string | null;
  last_reviewed_at?: string | null;
  created_at?: string;
  author?: NewsAuthor | null;
  cat?: NewsCategory | null;
  tags?: NewsTag[];
  related?: Article[];
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ── Server-side fetch (ISR) ────────────────────────────────────────────────────
async function fetchJson<T>(path: string, revalidate = 300): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error("news fetch failed:", path, err);
    return null;
  }
}

export async function getArticles(params: {
  page?: number; limit?: number; category?: string; tag?: string; search?: string;
} = {}): Promise<Paginated<Article>> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.category) q.set("category", params.category);
  if (params.tag) q.set("tag", params.tag);
  if (params.search) q.set("search", params.search);
  const res = await fetchJson<Paginated<Article>>(`/public/articles?${q.toString()}`, 60);
  return res || { data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } };
}

export async function getFeatured(limit = 1): Promise<Article[]> {
  const res = await fetchJson<{ data: Article[] }>(`/public/articles/featured?limit=${limit}`, 60);
  return res?.data || [];
}

export async function getPopular(limit = 5): Promise<Article[]> {
  const res = await fetchJson<{ data: Article[] }>(`/public/articles/popular?limit=${limit}`, 60);
  return res?.data || [];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const res = await fetchJson<{ data: Article }>(`/public/articles/${slug}`, 300);
  return res?.data || null;
}

export async function getCategories(): Promise<NewsCategory[]> {
  const res = await fetchJson<{ data: NewsCategory[] }>(`/public/categories`, 300);
  return res?.data || [];
}

export async function getCategoryBySlug(slug: string): Promise<NewsCategory | null> {
  const res = await fetchJson<{ data: NewsCategory }>(`/public/categories/${slug}`, 300);
  return res?.data || null;
}

export async function getAuthorBySlug(slug: string): Promise<(NewsAuthor & { articles: Article[] }) | null> {
  const res = await fetchJson<{ data: NewsAuthor & { articles: Article[] } }>(`/public/authors/${slug}`, 300);
  return res?.data || null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
export const CATEGORY_BADGE: Record<string, string> = {
  "Kinh nghiệm": "bg-emerald-100 text-emerald-800",
  "Hướng dẫn": "bg-blue-100 text-blue-800",
  "Thủ tục": "bg-indigo-100 text-indigo-800",
  "Quy định": "bg-red-100 text-red-800",
  "Pháp lý": "bg-amber-100 text-amber-800",
};

export const badgeFor = (category?: string | null) =>
  (category && CATEGORY_BADGE[category]) || "bg-slate-100 text-slate-700";

export const formatDate = (iso?: string | null): string => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
};

const FALLBACK_IMG = "/blog/room-management.png";
export const coverOf = (a: Article) => a.image_url || FALLBACK_IMG;
