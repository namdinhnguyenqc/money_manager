import { Hono } from "hono";
import { z } from "zod";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";
import { parseJson, toId } from "../utils/validation.js";
import type { AppEnv } from "../types.js";

const walletsRoutes = new Hono<AppEnv>();

walletsRoutes.use("*", requireAuth);

const walletTypeEnum = z.enum(["personal", "rental", "trading"]);

const createWalletSchema = z.object({
  name: z.string().min(1),
  type: walletTypeEnum,
  icon: z.string().optional(),
  color: z.string().optional(),
});

const updateWalletSchema = z
  .object({
    name: z.string().min(1).optional(),
    type: walletTypeEnum.optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    active: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, "No fields to update");

const walletStyleByType = {
  personal: { icon: "wallet", color: "#2563eb" },
  rental: { icon: "home", color: "#10b981" },
  trading: { icon: "box", color: "#f59e0b" },
} as const;

walletsRoutes.get("/", async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");
  const activeOnly = c.req.query("activeOnly") !== "0";

  let query = db.from("wallets").select("*");
  if (activeOnly) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  const orderMap: Record<string, number> = { personal: 1, rental: 2, trading: 3 };
  const sorted = (data ?? []).sort((a, b) => {
    const o = (orderMap[a.type] ?? 99) - (orderMap[b.type] ?? 99);
    return o !== 0 ? o : String(a.name).localeCompare(String(b.name));
  });

  return c.json({ data: sorted });
});

walletsRoutes.post("/", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, createWalletSchema);
  if (!parsed.ok) return parsed.response;

  const style = walletStyleByType[parsed.data.type];
  const db = c.get("supabase");
  const { data, error } = await db.from("wallets").insert({
    user_id: user.id,
    name: parsed.data.name.trim(),
    type: parsed.data.type,
    icon: parsed.data.icon ?? style.icon,
    color: parsed.data.color ?? style.color,
    active: true,
  }).select("*").single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data }, 201);
});

walletsRoutes.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid wallet id" }, 400);

  const parsed = await parseJson(c, updateWalletSchema);
  if (!parsed.ok) return parsed.response;

  const updatePayload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name.trim();
  if (parsed.data.type !== undefined) {
    updatePayload.type = parsed.data.type;
    const style = walletStyleByType[parsed.data.type];
    updatePayload.icon = parsed.data.icon ?? style.icon;
    updatePayload.color = parsed.data.color ?? style.color;
  } else {
    if (parsed.data.icon !== undefined) updatePayload.icon = parsed.data.icon;
    if (parsed.data.color !== undefined) updatePayload.color = parsed.data.color;
  }
  if (parsed.data.active !== undefined) updatePayload.active = parsed.data.active;

  const db = c.get("supabase");
  const { data, error } = await db.from("wallets").update(updatePayload).eq("id", id).select("*").single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

walletsRoutes.get("/:id/stats", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid wallet id" }, 400);

  const month = c.req.query("month");
  const year = c.req.query("year");
  const hasPeriod = Boolean(month && year);
  const prefix = hasPeriod ? `${year}-${String(month).padStart(2, "0")}` : null;

  const db = c.get("supabase");

  let incomeQuery = db.from("transactions").select("amount").eq("wallet_id", id).eq("type", "income");
  let expenseQuery = db.from("transactions").select("amount").eq("wallet_id", id).eq("type", "expense");

  if (prefix) {
    incomeQuery = incomeQuery.gte("date", `${prefix}-01`).lte("date", `${prefix}-31`);
    expenseQuery = expenseQuery.gte("date", `${prefix}-01`).lte("date", `${prefix}-31`);
  }

  const [incomeRes, expenseRes] = await Promise.all([incomeQuery, expenseQuery]);
  if (incomeRes.error) return c.json({ error: incomeRes.error.message }, 500);
  if (expenseRes.error) return c.json({ error: expenseRes.error.message }, 500);

  const income = (incomeRes.data ?? []).reduce((s, x) => s + Number(x.amount || 0), 0);
  const expense = (expenseRes.data ?? []).reduce((s, x) => s + Number(x.amount || 0), 0);

  return c.json({ data: { income, expense, balance: income - expense } });
});

walletsRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid wallet id" }, 400);

  const db = c.get("supabase");

  const walletCheck = await db.from("wallets").select("id").eq("id", id).single();
  if (walletCheck.error || !walletCheck.data) return c.json({ error: "Wallet not found" }, 404);

  const txCheck = await db.from("transactions").select("id", { count: 'exact', head: true }).eq("wallet_id", id);
  if (txCheck.count && txCheck.count > 0) return c.json({ error: "Cannot delete wallet with existing transactions" }, 400);

  const { error } = await db.from("wallets").delete().eq("id", id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

export default walletsRoutes;
