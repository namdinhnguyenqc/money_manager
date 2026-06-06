import { Hono } from "hono";
import { z } from "zod";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { parseJson, toId } from "../utils/validation.js";
import { supabaseAdmin } from "../lib/supabase.js";

const tradingRoutes = new Hono<AppEnv>();

tradingRoutes.use("*", requireAuth);

tradingRoutes.use("*", async (c, next) => {
  const user = c.get("user");
  // Allow ADMIN and SUPER_ADMIN by default
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
    return await next();
  }

  const { data: dbUser, error } = await supabaseAdmin
    .from("users")
    .select("role_id")
    .eq("id", user.id)
    .single();

  if (error || !dbUser || !dbUser.role_id) {
    return c.json({ error: "Không tìm thấy thông tin tài khoản hoặc quyền truy cập." }, 404);
  }

  const { data: perm, error: permError } = await supabaseAdmin
    .from("role_permissions")
    .select("permission_key")
    .eq("role_id", dbUser.role_id)
    .eq("permission_key", "trading.view")
    .maybeSingle();

  if (permError || !perm) {
    return c.json({
      error: "Tính năng Kinh doanh yêu cầu tài khoản nâng cấp gói Cao cấp (Premium).",
      code: "PREMIUM_REQUIRED"
    }, 403);
  }

  return await next();
});

const subItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
});

const addTradingItemSchema = z.object({
  walletId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  importPrice: z.number().positive(),
  importDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetPrice: z.number().positive().nullable().optional(),
  batchId: z.string().nullable().optional(),
  note: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  subItems: z.array(subItemSchema).optional(),
});

const updateTradingItemSchema = z
  .object({
    name: z.string().min(1).optional(),
    category: z.string().optional(),
    importPrice: z.number().positive().optional(),
    sellPrice: z.number().nonnegative().optional(),
    targetPrice: z.number().positive().nullable().optional(),
    importDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sellDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    status: z.enum(["available", "sold"]).optional(),
    note: z.string().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, "No fields to update");

const enrichBatchFields = <T extends { batch_id: string | null; status: string }>(items: T[]) => {
  const batchMap = new Map<string, { total: number; sold: number }>();
  for (const item of items) {
    const batchId = item.batch_id;
    if (!batchId) continue;
    const stat = batchMap.get(batchId) ?? { total: 0, sold: 0 };
    stat.total += 1;
    if (item.status === "sold") stat.sold += 1;
    batchMap.set(batchId, stat);
  }

  return items.map((item) => {
    const stat = item.batch_id ? batchMap.get(item.batch_id) : null;
    return {
      ...item,
      batch_total: stat?.total ?? 0,
      batch_sold: stat?.sold ?? 0,
    };
  });
};

const normalizeTradingItem = (item: any) => ({
  ...item,
  import_price: item.import_price ?? item.buy_price ?? 0,
  import_date: item.import_date ?? item.buy_date ?? item.created_at?.slice?.(0, 10) ?? null,
  target_price: item.target_price ?? null,
  category: item.category ?? "",
  status: item.status === "holding" ? "available" : item.status,
  batch_id: item.batch_id ?? null,
  transaction_id: item.transaction_id ?? null,
  sell_transaction_id: item.sell_transaction_id ?? null,
});

tradingRoutes.get("/items", async (c) => {
  const user = c.get("user");
  const walletIdRaw = c.req.query("walletId");
  if (!walletIdRaw) {
    return c.json({ error: "walletId is required" }, 400);
  }

  const db = c.get("supabase");
  const { data, error } = await db
    .from("trading_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("wallet_id", walletIdRaw)
    .order("import_date", { ascending: false });

  if (error && error.message?.includes("import_date")) {
    const fallback = await db
      .from("trading_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("wallet_id", walletIdRaw)
      .order("created_at", { ascending: false });
    if (fallback.error) return c.json({ error: fallback.error.message }, 500);
    return c.json({ data: enrichBatchFields((fallback.data ?? []).map(normalizeTradingItem)) });
  }

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: enrichBatchFields((data ?? []).map(normalizeTradingItem)) });
});

tradingRoutes.get("/items/batch/:batchId", async (c) => {
  const user = c.get("user");
  const batchId = c.req.param("batchId");
  if (!batchId) return c.json({ error: "Invalid batch id" }, 400);

  const db = c.get("supabase");
  const { data, error } = await db
    .from("trading_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: (data ?? []).map(normalizeTradingItem) });
});

tradingRoutes.post("/items", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, addTradingItemSchema);
  if (!parsed.ok) return parsed.response;

  const quantity = parsed.data.quantity ?? 1;

  const subItems = parsed.data.subItems ?? [];

  const db = c.get("supabase");
  const txRes = await db
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "expense",
      amount: parsed.data.importPrice,
      description: `Nhap hang: ${parsed.data.name}${quantity > 1 ? ` (x${quantity})` : ""}${parsed.data.batchId ? ` (Lo: ${parsed.data.batchId})` : ""}`,
      wallet_id: parsed.data.walletId,
      date: parsed.data.importDate,
    })
    .select("id")
    .single();
  if (txRes.error) return c.json({ error: txRes.error.message }, 400);

  const perItemPrice = parsed.data.importPrice / quantity;
  const itemsToCreate =
    subItems.length > 0
      ? subItems.map((it) => ({ name: `${parsed.data.name} - ${it.name}`, category: it.category || parsed.data.category || "" }))
      : Array.from({ length: quantity }, (_, i) => ({
          name: quantity > 1 ? `${parsed.data.name} - sp ${i + 1}` : parsed.data.name,
          category: parsed.data.category || "",
        }));

  const rows = itemsToCreate.map((item) => ({
    user_id: user.id,
    wallet_id: parsed.data.walletId,
    name: item.name,
    category: item.category,
    import_price: perItemPrice,
    target_price: parsed.data.targetPrice ? parsed.data.targetPrice / quantity : null,
    import_date: parsed.data.importDate,
    sell_date: null,
    status: "available",
    note: parsed.data.note || "",
    batch_id: parsed.data.batchId ?? null,
    transaction_id: txRes.data.id,
    sell_transaction_id: null,
  }));

  let insertRes = await db.from("trading_items").insert(rows).select("*");
  if (insertRes.error && insertRes.error.message?.includes("import_date")) {
    const legacyRows = rows.map((row) => ({
      user_id: row.user_id,
      wallet_id: row.wallet_id,
      name: row.name,
      buy_price: row.import_price,
      sell_price: null,
      quantity: 1,
      status: "holding",
      buy_date: row.import_date,
      sell_date: null,
      note: row.note,
    }));
    insertRes = await db.from("trading_items").insert(legacyRows).select("*");
  }
  if (insertRes.error) return c.json({ error: insertRes.error.message }, 400);

  return c.json({ data: (insertRes.data ?? []).map(normalizeTradingItem) }, 201);
});

tradingRoutes.patch("/items/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid item id" }, 400);

  const parsed = await parseJson(c, updateTradingItemSchema);
  if (!parsed.ok) return parsed.response;

  const payload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name;
  if (parsed.data.category !== undefined) payload.category = parsed.data.category;
  if (parsed.data.importPrice !== undefined) payload.import_price = parsed.data.importPrice;
  if (parsed.data.sellPrice !== undefined) payload.sell_price = parsed.data.sellPrice;
  if (parsed.data.targetPrice !== undefined) payload.target_price = parsed.data.targetPrice;
  if (parsed.data.importDate !== undefined) payload.import_date = parsed.data.importDate;
  if (parsed.data.sellDate !== undefined) payload.sell_date = parsed.data.sellDate;
  if (parsed.data.status !== undefined) payload.status = parsed.data.status;
  if (parsed.data.note !== undefined) payload.note = parsed.data.note;
  payload.updated_at = new Date().toISOString();

  const db = c.get("supabase");
  let { data, error } = await db
    .from("trading_items")
    .update(payload)
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();

  if (error && (error.message?.includes("import_") || error.message?.includes("target_price"))) {
    const legacyPayload: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) legacyPayload.name = parsed.data.name;
    if (parsed.data.importPrice !== undefined) legacyPayload.buy_price = parsed.data.importPrice;
    if (parsed.data.sellPrice !== undefined) legacyPayload.sell_price = parsed.data.sellPrice;
    if (parsed.data.importDate !== undefined) legacyPayload.buy_date = parsed.data.importDate;
    if (parsed.data.sellDate !== undefined) legacyPayload.sell_date = parsed.data.sellDate;
    if (parsed.data.status !== undefined) legacyPayload.status = parsed.data.status === "available" ? "holding" : parsed.data.status;
    if (parsed.data.note !== undefined) legacyPayload.note = parsed.data.note;
    legacyPayload.updated_at = new Date().toISOString();
    const fallback = await db
      .from("trading_items")
      .update(legacyPayload)
      .eq("user_id", user.id)
      .eq("id", id)
      .select("*")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data: normalizeTradingItem(data) });
});

tradingRoutes.delete("/items/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid trading item id" }, 400);

  const db = c.get("supabase");
  const { error } = await db
    .from("trading_items")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

tradingRoutes.get("/stats", async (c) => {
  const user = c.get("user");

  const walletIdRaw = c.req.query("walletId");
  if (!walletIdRaw) {
    return c.json({ error: "walletId is required" }, 400);
  }

  const db = c.get("supabase");
  const { data, error } = await db
    .from("trading_items")
    .select("import_price,sell_price,status")
    .eq("user_id", user.id)
    .eq("wallet_id", walletIdRaw);

  if (error && error.message?.includes("import_price")) {
    const fallback = await db
      .from("trading_items")
      .select("buy_price,sell_price,status")
      .eq("user_id", user.id)
      .eq("wallet_id", walletIdRaw);
    if (fallback.error) return c.json({ error: fallback.error.message }, 500);
    const legacyRows = (fallback.data ?? []).map(normalizeTradingItem);
    const unsoldRows = legacyRows.filter((x) => x.status === "available");
    const soldRows = legacyRows.filter((x) => x.status === "sold");
    return c.json({
      data: {
        unsoldCapital: unsoldRows.reduce((sum, x) => sum + Number(x.import_price || 0), 0),
        unsoldCount: unsoldRows.length,
        realizedProfit: soldRows.reduce((sum, x) => sum + (Number(x.sell_price || 0) - Number(x.import_price || 0)), 0),
        soldCount: soldRows.length,
      },
    });
  }

  if (error) return c.json({ error: error.message }, 500);

  const rows = (data ?? []).map(normalizeTradingItem);
  const unsoldRows = rows.filter((x) => x.status === "available");
  const soldRows = rows.filter((x) => x.status === "sold");

  const unsoldCapital = unsoldRows.reduce((sum, x) => sum + Number(x.import_price || 0), 0);
  const realizedProfit = soldRows.reduce(
    (sum, x) => sum + (Number(x.sell_price || 0) - Number(x.import_price || 0)),
    0
  );

  return c.json({
    data: {
      unsoldCapital,
      unsoldCount: unsoldRows.length,
      realizedProfit,
      soldCount: soldRows.length,
    },
  });
});

export default tradingRoutes;
