import { Hono } from "hono";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { parseJson, toNumberId } from "../utils/validation.js";
import type { AppEnv } from "../types.js";

const categoriesRoutes = new Hono<AppEnv>();

categoriesRoutes.use("*", requireAuth);

const categoryTypeEnum = z.enum(["income", "expense"]);

const createCategorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  color: z.string().optional(),
  type: categoryTypeEnum,
  walletId: z.number().int().positive(),
  parentId: z.number().int().positive().nullable().optional(),
});

const updateCategorySchema = z
  .object({
    name: z.string().min(1).optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    parentId: z.number().int().positive().nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, "No fields to update");

categoriesRoutes.get("/", async (c) => {
  const user = c.get("user");
  const type = c.req.query("type");
  const walletIdRaw = c.req.query("walletId");

  let query = supabaseAdmin
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("parent_id", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  if (type) {
    if (type !== "income" && type !== "expense") return c.json({ error: "Invalid type" }, 400);
    query = query.eq("type", type);
  }

  if (walletIdRaw) {
    const walletId = Number(walletIdRaw);
    if (!Number.isInteger(walletId) || walletId <= 0) return c.json({ error: "Invalid walletId" }, 400);
    query = query.eq("wallet_id", walletId);
  }

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: data ?? [] });
});

categoriesRoutes.post("/", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, createCategorySchema);
  if (!parsed.ok) return parsed.response;

  const payload = {
    user_id: user.id,
    name: parsed.data.name.trim(),
    icon: parsed.data.icon ?? "💬",
    color: parsed.data.color ?? "#64748b",
    type: parsed.data.type,
    wallet_id: parsed.data.walletId,
    parent_id: parsed.data.parentId ?? null,
  };

  const { data, error } = await supabaseAdmin.from("categories").insert(payload).select("*").single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data }, 201);
});

categoriesRoutes.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid category id" }, 400);

  const parsed = await parseJson(c, updateCategorySchema);
  if (!parsed.ok) return parsed.response;

  const payload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name.trim();
  if (parsed.data.icon !== undefined) payload.icon = parsed.data.icon;
  if (parsed.data.color !== undefined) payload.color = parsed.data.color;
  if (parsed.data.parentId !== undefined) payload.parent_id = parsed.data.parentId;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("categories")
    .update(payload)
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

categoriesRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid category id" }, 400);

  await supabaseAdmin
    .from("transactions")
    .update({ category_id: null })
    .eq("user_id", user.id)
    .eq("category_id", id);

  const { error } = await supabaseAdmin
    .from("categories")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

export default categoriesRoutes;
