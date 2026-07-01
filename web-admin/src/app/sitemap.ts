import type { MetadataRoute } from "next";
import { API_URL } from "@/lib/apiUrl";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trocare-production.vercel.app";

export const revalidate = 3600; // refresh sitemap hourly

interface SitemapData {
  articles: { slug: string; published_at?: string; last_reviewed_at?: string; updated_at?: string }[];
  categories: { slug: string; updated_at?: string }[];
  authors: { slug: string; updated_at?: string }[];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/tin-tuc`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/delete-account`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  let dynamic: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/public/articles/sitemap-data`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = (await res.json()) as SitemapData;
      const articleUrls: MetadataRoute.Sitemap = (data.articles || []).map((a) => ({
        url: `${siteUrl}/tin-tuc/${a.slug}`,
        lastModified: new Date(a.last_reviewed_at || a.published_at || a.updated_at || now),
        changeFrequency: "weekly",
        priority: 0.8,
      }));
      const categoryUrls: MetadataRoute.Sitemap = (data.categories || []).map((c) => ({
        url: `${siteUrl}/tin-tuc/danh-muc/${c.slug}`,
        lastModified: new Date(c.updated_at || now),
        changeFrequency: "weekly",
        priority: 0.6,
      }));
      const authorUrls: MetadataRoute.Sitemap = (data.authors || []).map((au) => ({
        url: `${siteUrl}/tin-tuc/tac-gia/${au.slug}`,
        lastModified: new Date(au.updated_at || now),
        changeFrequency: "monthly",
        priority: 0.5,
      }));
      dynamic = [...articleUrls, ...categoryUrls, ...authorUrls];
    }
  } catch (err) {
    console.error("sitemap dynamic fetch failed:", err);
  }

  return [...staticRoutes, ...dynamic];
}
