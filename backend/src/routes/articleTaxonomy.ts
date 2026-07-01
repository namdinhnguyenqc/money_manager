import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../types.js";
import { supabaseAdmin } from "../lib/supabase.js";

// Two routers: public (read-only) and admin (CRUD). Mounted separately in index.ts.
export const publicTaxonomyRoutes = new Hono<AppEnv>();
export const adminTaxonomyRoutes = new Hono<AppEnv>();

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d").replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

const dbErr = (c: any, e: any, msg: string) => {
  console.error(msg, e);
  return c.json({ error: msg, details: e?.message }, 500);
};

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC — read only
// ══════════════════════════════════════════════════════════════════════════════

publicTaxonomyRoutes.get("/categories", async (c) => {
  const { data, error } = await supabaseAdmin
    .from("article_categories").select("*").eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return dbErr(c, error, "Không thể lấy danh mục");
  return c.json({ data: data ?? [] });
});

publicTaxonomyRoutes.get("/categories/:slug", async (c) => {
  const { data, error } = await supabaseAdmin
    .from("article_categories").select("*").eq("slug", c.req.param("slug")).maybeSingle();
  if (error || !data) return c.json({ error: "Danh mục không tồn tại" }, 404);
  return c.json({ data });
});

publicTaxonomyRoutes.get("/tags", async (c) => {
  const { data, error } = await supabaseAdmin
    .from("article_tags").select("*").order("name", { ascending: true });
  if (error) return dbErr(c, error, "Không thể lấy tag");
  return c.json({ data: data ?? [] });
});

publicTaxonomyRoutes.get("/authors/:slug", async (c) => {
  const slug = c.req.param("slug");
  const { data: author, error } = await supabaseAdmin
    .from("article_authors").select("*").eq("slug", slug).maybeSingle();
  if (error || !author) return c.json({ error: "Tác giả không tồn tại" }, 404);

  const { data: articles } = await supabaseAdmin
    .from("articles")
    .select("id,title,slug,description,excerpt,image_url,views,published_at,category")
    .eq("author_id", author.id)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(50);

  return c.json({ data: { ...author, articles: articles || [] } });
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — CRUD (protected by requireAuth + requireAdmin at mount)
// ══════════════════════════════════════════════════════════════════════════════

// ── Categories ──
const categorySchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  description: z.string().trim().optional().nullable(),
  meta_title: z.string().trim().optional().nullable(),
  meta_description: z.string().trim().optional().nullable(),
  image_url: z.string().optional().nullable(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

adminTaxonomyRoutes.get("/categories", async (c) => {
  const { data, error } = await supabaseAdmin
    .from("article_categories").select("*").order("sort_order", { ascending: true });
  if (error) return dbErr(c, error, "Không thể lấy danh mục");
  return c.json({ data: data ?? [] });
});

adminTaxonomyRoutes.post("/categories", async (c) => {
  const parsed = categorySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Dữ liệu không hợp lệ", details: parsed.error.format() }, 400);
  const body = parsed.data;
  const slug = body.slug?.trim() || slugify(body.name);
  const { data, error } = await supabaseAdmin
    .from("article_categories").insert({ ...body, slug }).select().single();
  if (error) return dbErr(c, error, "Không thể tạo danh mục");
  return c.json({ success: true, data });
});

adminTaxonomyRoutes.put("/categories/:id", async (c) => {
  const parsed = categorySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Dữ liệu không hợp lệ", details: parsed.error.format() }, 400);
  const body = parsed.data;
  const slug = body.slug?.trim() || slugify(body.name);
  const { data, error } = await supabaseAdmin
    .from("article_categories")
    .update({ ...body, slug, updated_at: new Date().toISOString() })
    .eq("id", c.req.param("id")).select().single();
  if (error) return dbErr(c, error, "Không thể cập nhật danh mục");
  return c.json({ success: true, data });
});

adminTaxonomyRoutes.delete("/categories/:id", async (c) => {
  const { error } = await supabaseAdmin.from("article_categories").delete().eq("id", c.req.param("id"));
  if (error) return dbErr(c, error, "Không thể xóa danh mục");
  return c.json({ success: true });
});

// ── Tags ──
const tagSchema = z.object({ name: z.string().trim().min(1), slug: z.string().trim().optional() });

adminTaxonomyRoutes.get("/tags", async (c) => {
  const { data, error } = await supabaseAdmin.from("article_tags").select("*").order("name");
  if (error) return dbErr(c, error, "Không thể lấy tag");
  return c.json({ data: data ?? [] });
});

adminTaxonomyRoutes.post("/tags", async (c) => {
  const parsed = tagSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Dữ liệu không hợp lệ" }, 400);
  const slug = parsed.data.slug?.trim() || slugify(parsed.data.name);
  // Idempotent: return existing if slug present
  const { data: existing } = await supabaseAdmin
    .from("article_tags").select("*").eq("slug", slug).maybeSingle();
  if (existing) return c.json({ success: true, data: existing });
  const { data, error } = await supabaseAdmin
    .from("article_tags").insert({ name: parsed.data.name, slug }).select().single();
  if (error) return dbErr(c, error, "Không thể tạo tag");
  return c.json({ success: true, data });
});

adminTaxonomyRoutes.delete("/tags/:id", async (c) => {
  const { error } = await supabaseAdmin.from("article_tags").delete().eq("id", c.req.param("id"));
  if (error) return dbErr(c, error, "Không thể xóa tag");
  return c.json({ success: true });
});

// ── Authors ──
const authorSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  avatar_url: z.string().optional().nullable(),
  title: z.string().trim().optional().nullable(),
  bio: z.string().trim().optional().nullable(),
  social_links: z.record(z.string(), z.string()).default({}),
});

adminTaxonomyRoutes.get("/authors", async (c) => {
  const { data, error } = await supabaseAdmin.from("article_authors").select("*").order("name");
  if (error) return dbErr(c, error, "Không thể lấy tác giả");
  return c.json({ data: data ?? [] });
});

adminTaxonomyRoutes.post("/authors", async (c) => {
  const parsed = authorSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Dữ liệu không hợp lệ", details: parsed.error.format() }, 400);
  const slug = parsed.data.slug?.trim() || slugify(parsed.data.name);
  const { data, error } = await supabaseAdmin
    .from("article_authors").insert({ ...parsed.data, slug }).select().single();
  if (error) return dbErr(c, error, "Không thể tạo tác giả");
  return c.json({ success: true, data });
});

adminTaxonomyRoutes.put("/authors/:id", async (c) => {
  const parsed = authorSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Dữ liệu không hợp lệ", details: parsed.error.format() }, 400);
  const slug = parsed.data.slug?.trim() || slugify(parsed.data.name);
  const { data, error } = await supabaseAdmin
    .from("article_authors")
    .update({ ...parsed.data, slug, updated_at: new Date().toISOString() })
    .eq("id", c.req.param("id")).select().single();
  if (error) return dbErr(c, error, "Không thể cập nhật tác giả");
  return c.json({ success: true, data });
});

adminTaxonomyRoutes.delete("/authors/:id", async (c) => {
  const { error } = await supabaseAdmin.from("article_authors").delete().eq("id", c.req.param("id"));
  if (error) return dbErr(c, error, "Không thể xóa tác giả");
  return c.json({ success: true });
});
