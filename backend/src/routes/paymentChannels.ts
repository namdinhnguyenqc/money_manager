import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { parseJson, toId } from "../utils/validation.js";
import type { AppEnv } from "../types.js";

const paymentChannelsRoutes = new Hono<AppEnv>();

paymentChannelsRoutes.use("*", requireAuth);

const channelSchema = z.object({
  provider: z.enum(["sepay", "bank_transfer", "cash", "manual"]).default("bank_transfer"),
  displayName: z.string().trim().min(1),
  bankId: z.string().trim().nullable().optional(),
  accountNo: z.string().trim().nullable().optional(),
  accountName: z.string().trim().nullable().optional(),
  walletId: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  autoReconcileEnabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  config: z.record(z.string(), z.any()).optional(),
});

const formatChannel = (row: any) => ({
  ...row,
  displayName: row.display_name,
  bankId: row.bank_id,
  accountNo: row.account_no,
  accountName: row.account_name,
  walletId: row.wallet_id,
  autoReconcileEnabled: row.auto_reconcile_enabled,
  isDefault: row.is_default,
});

paymentChannelsRoutes.get("/", async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");
  const { data, error } = await db
    .from("payment_channels")
    .select("*")
    .eq("user_id", user.id)
    .eq("enabled", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: (data ?? []).map(formatChannel) });
});

paymentChannelsRoutes.post("/", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, channelSchema);
  if (!parsed.ok) return parsed.response;

  const db = c.get("supabase");
  if (parsed.data.isDefault) {
    await db.from("payment_channels").update({ is_default: false }).eq("user_id", user.id);
  }

  const { data, error } = await db
    .from("payment_channels")
    .insert({
      user_id: user.id,
      provider: parsed.data.provider,
      display_name: parsed.data.displayName,
      bank_id: parsed.data.bankId || null,
      account_no: parsed.data.accountNo || null,
      account_name: parsed.data.accountName || null,
      wallet_id: parsed.data.walletId || null,
      enabled: parsed.data.enabled ?? true,
      auto_reconcile_enabled: parsed.data.autoReconcileEnabled ?? false,
      is_default: parsed.data.isDefault ?? false,
      config: parsed.data.config || {},
    })
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data: formatChannel(data) }, 201);
});

paymentChannelsRoutes.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid payment channel id" }, 400);

  const parsed = await parseJson(c, channelSchema.partial());
  if (!parsed.ok) return parsed.response;

  const db = c.get("supabase");
  if (parsed.data.isDefault) {
    await db.from("payment_channels").update({ is_default: false }).eq("user_id", user.id);
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.provider !== undefined) payload.provider = parsed.data.provider;
  if (parsed.data.displayName !== undefined) payload.display_name = parsed.data.displayName;
  if (parsed.data.bankId !== undefined) payload.bank_id = parsed.data.bankId || null;
  if (parsed.data.accountNo !== undefined) payload.account_no = parsed.data.accountNo || null;
  if (parsed.data.accountName !== undefined) payload.account_name = parsed.data.accountName || null;
  if (parsed.data.walletId !== undefined) payload.wallet_id = parsed.data.walletId || null;
  if (parsed.data.enabled !== undefined) payload.enabled = parsed.data.enabled;
  if (parsed.data.autoReconcileEnabled !== undefined) payload.auto_reconcile_enabled = parsed.data.autoReconcileEnabled;
  if (parsed.data.isDefault !== undefined) payload.is_default = parsed.data.isDefault;
  if (parsed.data.config !== undefined) payload.config = parsed.data.config;

  const { data, error } = await db
    .from("payment_channels")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data: formatChannel(data) });
});

paymentChannelsRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid payment channel id" }, 400);

  const db = c.get("supabase");
  const { error } = await db
    .from("payment_channels")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

export default paymentChannelsRoutes;
