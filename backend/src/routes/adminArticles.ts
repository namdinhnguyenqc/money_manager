import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../types.js";
import { supabaseAdmin } from "../lib/supabase.js";

const adminArticlesRoutes = new Hono<AppEnv>();
// Note: requireAuth + requireAdmin are applied at mount point in index.ts

const STORAGE_BUCKET = "article-images";

// ── Helpers ─────────────────────────────────────────────────────────────────
const listParams = (c: any) => {
  const page = Math.max(parseInt(c.req.query("page") || "1", 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(c.req.query("limit") || "20", 10) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const toPagination = (page: number, limit: number, total = 0) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const jsonDbError = (c: any, error: any, fallback: string, status = 500) => {
  console.error(fallback, error);
  return c.json({ error: fallback, details: error?.message }, status);
};

// Estimate reading time (minutes) from HTML content
const estimateReadingTime = (html: string): number => {
  const text = (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.ceil(words / 200));
};

// ── Validation ──────────────────────────────────────────────────────────────
const faqItemSchema = z.object({
  q: z.string().trim().min(1),
  a: z.string().trim().min(1),
});

const articleSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống"),
  slug: z.string().trim().min(1, "Slug không được để trống")
    .regex(/^[a-z0-9-]+$/, "Slug chỉ chứa chữ thường, số và dấu gạch ngang"),
  category: z.string().trim().min(1, "Danh mục không được để trống"),
  category_id: z.string().uuid().optional().nullable(),
  author_id: z.string().uuid().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  excerpt: z.string().trim().optional().nullable(),
  content: z.string().min(1, "Nội dung bài viết không được để trống"),
  image_url: z.string().optional().nullable(),
  og_image_url: z.string().optional().nullable(),
  // SEO
  seo_title: z.string().trim().max(70).optional().nullable(),
  meta_description: z.string().trim().max(200).optional().nullable(),
  focus_keyword: z.string().trim().optional().nullable(),
  canonical_url: z.string().optional().nullable(),
  schema_type: z.enum(["Article", "NewsArticle", "HowTo", "FAQPage"]).default("Article"),
  no_index: z.boolean().default(false),
  faq: z.array(faqItemSchema).default([]),
  // Editorial
  is_featured: z.boolean().default(false),
  sort_order: z.number().int().default(0),
  status: z.enum(["draft", "scheduled", "published", "archived"]).default("draft"),
  published_at: z.string().optional().nullable(),
  tag_ids: z.array(z.string().uuid()).default([]),
});

// Build the DB row from validated body (excludes relational tag_ids)
const buildRow = (body: z.infer<typeof articleSchema>, userId: string) => {
  const { tag_ids, ...rest } = body;
  const now = new Date().toISOString();
  return {
    ...rest,
    reading_time: estimateReadingTime(body.content),
    last_reviewed_at: now,
    // published_at: use provided, else set now when publishing
    published_at:
      body.published_at ||
      (body.status === "published" ? now : null),
    user_id: userId,
  };
};

// Replace tag map for an article
const syncTags = async (articleId: string, tagIds: string[]) => {
  await supabaseAdmin.from("article_tag_map").delete().eq("article_id", articleId);
  if (tagIds.length > 0) {
    await supabaseAdmin
      .from("article_tag_map")
      .insert(tagIds.map((tag_id) => ({ article_id: articleId, tag_id })));
  }
};

// ── GET / — list ──────────────────────────────────────────────────────────────
adminArticlesRoutes.get("/", async (c) => {
  const { page, limit, offset } = listParams(c);
  const { search = "", category = "", status = "" } = c.req.query();

  let query = supabaseAdmin
    .from("articles")
    .select("*, author:article_authors(id,name,slug), cat:article_categories(id,name,slug)", { count: "exact" });

  if (category) query = query.eq("category", category);
  if (status) query = query.eq("status", status);
  if (search) {
    const cleanSearch = search.replace(/[\\,():.]/g, "");
    query = query.or(`title.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return jsonDbError(c, error, "Không thể lấy danh sách bài viết");

  return c.json({ data: data ?? [], pagination: toPagination(page, limit, count || 0) });
});

// ── GET /:id — detail (with tags) ────────────────────────────────────────────
adminArticlesRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const { data, error } = await supabaseAdmin
    .from("articles")
    .select("*, author:article_authors(id,name,slug), cat:article_categories(id,name,slug)")
    .eq("id", id)
    .single();

  if (error) return c.json({ error: "Bài viết không tồn tại" }, 404);

  const { data: tagMap } = await supabaseAdmin
    .from("article_tag_map")
    .select("tag_id")
    .eq("article_id", id);

  return c.json({ data: { ...data, tag_ids: (tagMap || []).map((t) => t.tag_id) } });
});

// ── POST / — create ──────────────────────────────────────────────────────────
adminArticlesRoutes.post("/", async (c) => {
  const user = c.get("user");
  const parsed = await c.req.json().catch(() => ({}));

  const validation = articleSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Dữ liệu không hợp lệ", details: validation.error.format() }, 400);
  }
  const body = validation.data;

  const { data: slugCheck } = await supabaseAdmin
    .from("articles").select("id").eq("slug", body.slug).maybeSingle();
  if (slugCheck) {
    return c.json({ error: "Đường dẫn slug bài viết đã tồn tại", code: "SLUG_EXISTS" }, 400);
  }

  const row = buildRow(body, user.id);
  const { data, error } = await supabaseAdmin
    .from("articles")
    .insert({ ...row, views: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return jsonDbError(c, error, "Không thể tạo bài viết");

  await syncTags(data.id, body.tag_ids);

  return c.json({ success: true, data });
});

// ── PUT /:id — update ────────────────────────────────────────────────────────
adminArticlesRoutes.put("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const parsed = await c.req.json().catch(() => ({}));

  const validation = articleSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Dữ liệu không hợp lệ", details: validation.error.format() }, 400);
  }
  const body = validation.data;

  const { data: existing } = await supabaseAdmin
    .from("articles").select("id, slug, published_at").eq("id", id).single();
  if (!existing) return c.json({ error: "Bài viết không tồn tại" }, 404);

  if (body.slug !== existing.slug) {
    const { data: slugCheck } = await supabaseAdmin
      .from("articles").select("id").eq("slug", body.slug).maybeSingle();
    if (slugCheck) {
      return c.json({ error: "Đường dẫn slug bài viết đã tồn tại", code: "SLUG_EXISTS" }, 400);
    }
  }

  const row = buildRow(body, user.id);
  // Preserve original published_at if already set and not overridden
  if (existing.published_at && !body.published_at && body.status === "published") {
    row.published_at = existing.published_at;
  }
  const { user_id, ...updateFields } = row; // don't overwrite original author user_id

  const { data, error } = await supabaseAdmin
    .from("articles")
    .update({ ...updateFields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return jsonDbError(c, error, "Không thể cập nhật bài viết");

  await syncTags(id, body.tag_ids);

  return c.json({ success: true, data });
});

// ── DELETE /:id ──────────────────────────────────────────────────────────────
adminArticlesRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const { error } = await supabaseAdmin.from("articles").delete().eq("id", id);
  if (error) return jsonDbError(c, error, "Không thể xóa bài viết");
  return c.json({ success: true });
});

// ── POST /upload-image — upload to Supabase Storage ──────────────────────────
const uploadSchema = z.object({
  fileUrl: z.string().min(1), // base64 data URI
  fileName: z.string().optional(),
  scope: z.enum(["cover", "inline"]).default("inline"),
});

adminArticlesRoutes.post("/upload-image", async (c) => {
  const parsed = await c.req.json().catch(() => ({}));
  const validation = uploadSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Dữ liệu ảnh không hợp lệ", details: validation.error.format() }, 400);
  }
  const { fileUrl, scope } = validation.data;

  const match = fileUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return c.json({ error: "Định dạng ảnh không hợp lệ (cần base64 data URI)" }, 400);

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");

  // Size guard: max 5MB
  if (buffer.length > 5 * 1024 * 1024) {
    return c.json({ error: "Ảnh vượt quá 5MB" }, 400);
  }

  let ext = "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = "jpg";
  else if (mimeType.includes("webp")) ext = "webp";
  else if (mimeType.includes("gif")) ext = "gif";
  else if (mimeType.includes("png")) ext = "png";

  const fileName = `${scope === "cover" ? "covers" : "inline"}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, buffer, { contentType: mimeType, upsert: false } as any);

  if (uploadErr) {
    return jsonDbError(c, uploadErr, "Không thể tải ảnh lên (kiểm tra bucket article-images)");
  }

  const { data: { publicUrl } } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  return c.json({ success: true, url: publicUrl });
});

// ── GET /stats — analytics summary ───────────────────────────────────────────
adminArticlesRoutes.get("/meta/stats", async (c) => {
  const { count: total } = await supabaseAdmin.from("articles").select("id", { count: "exact", head: true });
  const { count: published } = await supabaseAdmin
    .from("articles").select("id", { count: "exact", head: true }).eq("status", "published");
  const { count: drafts } = await supabaseAdmin
    .from("articles").select("id", { count: "exact", head: true }).eq("status", "draft");

  const { data: topArticles } = await supabaseAdmin
    .from("articles")
    .select("id,title,slug,views,category")
    .eq("status", "published")
    .order("views", { ascending: false })
    .limit(10);

  const { data: allViews } = await supabaseAdmin.from("articles").select("views");
  const totalViews = (allViews || []).reduce((sum, a) => sum + (a.views || 0), 0);

  return c.json({
    data: {
      total: total || 0,
      published: published || 0,
      drafts: drafts || 0,
      totalViews,
      topArticles: topArticles || [],
    },
  });
});

export default adminArticlesRoutes;
