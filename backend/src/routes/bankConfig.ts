import { Hono } from "hono";
import { z } from "zod";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";
import { parseJson } from "../utils/validation.js";
import type { AppEnv } from "../types.js";
import { env } from "../config/env.js";

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
  const db = c.get("supabase");
  const { data, error } = await db
    .from("bank_config")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  
  if (!data) return c.json({ data: null });
  
  return c.json({ 
    data: {
      id: data.id,
      bank_id: data.bank_name,
      account_no: data.account_number,
      account_name: data.account_name,
      qr_uri: data.qr_template,
    } 
  });
});

bankConfigRoutes.put("/", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, upsertBankConfigSchema);
  if (!parsed.ok) return parsed.response;

  const db = c.get("supabase");
  const existing = await db
    .from("bank_config")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing.error) return c.json({ error: existing.error.message }, 500);

  const payload = {
    bank_name: parsed.data.bank_id,
    account_number: parsed.data.account_no,
    account_name: parsed.data.account_name,
    qr_template: parsed.data.qr_uri ?? null,
    updated_at: new Date().toISOString(),
  };

  if (existing.data?.id) {
    const updateRes = await db
      .from("bank_config")
      .update(payload)
      .eq("user_id", user.id)
      .eq("id", existing.data.id)
      .select("*")
      .single();
    if (updateRes.error) return c.json({ error: updateRes.error.message }, 400);
    return c.json({ data: {
      id: updateRes.data.id,
      bank_id: updateRes.data.bank_name,
      account_no: updateRes.data.account_number,
      account_name: updateRes.data.account_name,
      qr_uri: updateRes.data.qr_template,
    } });
  }

  const insertRes = await db
    .from("bank_config")
    .insert({
      user_id: user.id,
      ...payload,
    })
    .select("*")
    .single();
  if (insertRes.error) return c.json({ error: insertRes.error.message }, 400);
  return c.json({ data: {
    id: insertRes.data.id,
    bank_id: insertRes.data.bank_name,
    account_no: insertRes.data.account_number,
    account_name: insertRes.data.account_name,
    qr_uri: insertRes.data.qr_template,
  } }, 201);
});

export default bankConfigRoutes;
