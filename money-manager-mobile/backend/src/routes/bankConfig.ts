import { Hono } from "hono";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { parseJson } from "../utils/validation.js";
import type { AppEnv } from "../types.js";

const bankConfigRoutes = new Hono<AppEnv>();

bankConfigRoutes.use("*", requireAuth);

const upsertBankConfigSchema = z.object({
  bank_id: z.string().min(1),
  account_no: z.string().min(1),
  account_name: z.string().min(1),
  qr_uri: z.string().nullable().optional(),
  user_avatar: z.string().nullable().optional(),
});

bankConfigRoutes.get("/", async (c) => {
  const user = c.get("user");
  const { data, error } = await supabaseAdmin
    .from("bank_config")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: data ?? null });
});

bankConfigRoutes.put("/", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, upsertBankConfigSchema);
  if (!parsed.ok) return parsed.response;

  const existing = await supabaseAdmin
    .from("bank_config")
    .select("id")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (existing.error) return c.json({ error: existing.error.message }, 500);

  const payload = {
    bank_id: parsed.data.bank_id,
    account_no: parsed.data.account_no,
    account_name: parsed.data.account_name,
    qr_uri: parsed.data.qr_uri ?? null,
    user_avatar: parsed.data.user_avatar ?? null,
    updated_at: new Date().toISOString(),
  };

  if (existing.data?.id) {
    const updateRes = await supabaseAdmin
      .from("bank_config")
      .update(payload)
      .eq("user_id", user.id)
      .eq("id", Number(existing.data.id))
      .select("*")
      .single();
    if (updateRes.error) return c.json({ error: updateRes.error.message }, 400);
    return c.json({ data: updateRes.data });
  }

  const insertRes = await supabaseAdmin
    .from("bank_config")
    .insert({
      user_id: user.id,
      ...payload,
      active: true,
    })
    .select("*")
    .single();
  if (insertRes.error) return c.json({ error: insertRes.error.message }, 400);
  return c.json({ data: insertRes.data }, 201);
});

export default bankConfigRoutes;
