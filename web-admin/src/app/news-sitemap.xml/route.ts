import { API_URL } from "@/lib/apiUrl";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trocare-production.vercel.app";

export const revalidate = 900; // 15 min

// Google News sitemap: only articles published within the last 48 hours.
export async function GET() {
  let items = "";
  try {
    const res = await fetch(`${API_URL}/public/articles/sitemap-data`, { next: { revalidate: 900 } });
    if (res.ok) {
      const data = await res.json();
      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      const recent = (data.articles || []).filter(
        (a: any) => a.published_at && new Date(a.published_at).getTime() >= cutoff
      );
      items = recent
        .map(
          (a: any) => `  <url>
    <loc>${siteUrl}/tin-tuc/${a.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>TrọCare</news:name>
        <news:language>vi</news:language>
      </news:publication>
      <news:publication_date>${new Date(a.published_at).toISOString()}</news:publication_date>
    </news:news>
  </url>`
        )
        .join("\n");
    }
  } catch (err) {
    console.error("news-sitemap fetch failed:", err);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=900, s-maxage=900" },
  });
}
