import { Hono } from "hono";
import type { AppEnv } from "../types.js";
import { supabaseAdmin } from "../lib/supabase.js";

const publicArticlesRoutes = new Hono<AppEnv>();

const ARTICLE_SELECT =
  "id,title,slug,category,description,excerpt,image_url,views,reading_time,published_at,created_at," +
  "author:article_authors(id,name,slug,avatar_url,title),cat:article_categories(id,name,slug)";

const listParams = (c: any) => {
  const page = Math.max(parseInt(c.req.query("page") || "1", 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(c.req.query("limit") || "12", 10) || 12, 1), 50);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const toPagination = (page: number, limit: number, total = 0) => ({
  page, limit, total, totalPages: Math.ceil(total / limit),
});

// Published + scheduled-in-the-past filter
const publishedFilter = (q: any) =>
  q.eq("status", "published").lte("published_at", new Date().toISOString());

// ── GET / — list published ────────────────────────────────────────────────────
publicArticlesRoutes.get("/", async (c) => {
  const { page, limit, offset } = listParams(c);
  const { search = "", category = "", tag = "" } = c.req.query();

  // Tag filter needs article ids from map
  let tagArticleIds: string[] | null = null;
  if (tag) {
    const { data: tagRow } = await supabaseAdmin
      .from("article_tags").select("id").eq("slug", tag).maybeSingle();
    if (tagRow) {
      const { data: map } = await supabaseAdmin
        .from("article_tag_map").select("article_id").eq("tag_id", tagRow.id);
      tagArticleIds = (map || []).map((m) => m.article_id);
      if (tagArticleIds.length === 0) {
        return c.json({ data: [], pagination: toPagination(page, limit, 0) });
      }
    } else {
      return c.json({ data: [], pagination: toPagination(page, limit, 0) });
    }
  }

  let query = publishedFilter(
    supabaseAdmin.from("articles").select(ARTICLE_SELECT, { count: "exact" })
  );

  if (category) query = query.eq("category", category);
  if (tagArticleIds) query = query.in("id", tagArticleIds);
  if (search) {
    const cleanSearch = search.replace(/[\\,():.]/g, "");
    query = query.or(`title.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`);
  }

  const { data, error, count } = await query
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Failed to fetch public articles:", error.message);
    return c.json({ error: "Không thể lấy danh sách bài viết" }, 500);
  }

  return c.json({ data: data ?? [], pagination: toPagination(page, limit, count || 0) });
});

// ── GET /featured — hero article(s) ───────────────────────────────────────────
publicArticlesRoutes.get("/featured", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "1", 10) || 1, 5);
  const { data, error } = await publishedFilter(
    supabaseAdmin.from("articles").select(ARTICLE_SELECT).eq("is_featured", true)
  )
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) return c.json({ error: "Không thể lấy bài nổi bật" }, 500);
  return c.json({ data: data ?? [] });
});

// ── GET /popular — top views (sidebar) ────────────────────────────────────────
publicArticlesRoutes.get("/popular", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "5", 10) || 5, 10);
  const { data, error } = await publishedFilter(
    supabaseAdmin.from("articles").select(ARTICLE_SELECT)
  )
    .order("views", { ascending: false })
    .limit(limit);

  if (error) return c.json({ error: "Không thể lấy bài xem nhiều" }, 500);
  return c.json({ data: data ?? [] });
});

// ── GET /sitemap-data — for dynamic sitemap.xml ───────────────────────────────
publicArticlesRoutes.get("/sitemap-data", async (c) => {
  const { data: articles } = await publishedFilter(
    supabaseAdmin.from("articles").select("slug,published_at,last_reviewed_at,updated_at")
  ).order("published_at", { ascending: false }).limit(5000);

  const { data: categories } = await supabaseAdmin
    .from("article_categories").select("slug,updated_at").eq("is_active", true);

  const { data: authors } = await supabaseAdmin
    .from("article_authors").select("slug,updated_at");

  return c.json({
    articles: articles || [],
    categories: categories || [],
    authors: authors || [],
  });
});

// ── GET /:slug — detail + views++ ─────────────────────────────────────────────
publicArticlesRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const { data: article, error } = await publishedFilter(
    supabaseAdmin
      .from("articles")
      .select(
        "*,author:article_authors(id,name,slug,avatar_url,title,bio,social_links)," +
        "cat:article_categories(id,name,slug,description)"
      )
      .eq("slug", slug)
  ).maybeSingle();

  if (error || !article) {
    return c.json({ error: "Bài viết không tồn tại hoặc chưa xuất bản" }, 404);
  }

  // Tags
  const { data: tagMap } = await supabaseAdmin
    .from("article_tag_map")
    .select("tag:article_tags(id,name,slug)")
    .eq("article_id", article.id);
  const tags = (tagMap || []).map((t: any) => t.tag).filter(Boolean);

  // Related: same category, exclude self
  const { data: related } = await publishedFilter(
    supabaseAdmin
      .from("articles")
      .select(ARTICLE_SELECT)
      .eq("category", article.category)
      .neq("id", article.id)
  ).order("published_at", { ascending: false }).limit(3);

  // Increment views (non-blocking)
  supabaseAdmin
    .from("articles")
    .update({ views: (article.views || 0) + 1 })
    .eq("id", article.id)
    .then(({ error: viewError }) => {
      if (viewError) console.error(`View increment failed for ${article.id}:`, viewError.message);
    });

  return c.json({ data: { ...article, tags, related: related || [] } });
});

export default publicArticlesRoutes;
