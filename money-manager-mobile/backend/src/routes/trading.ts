import { Hono } from "hono";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { parseJson, toNumberId } from "../utils/validation.js";
import { env } from "../config/env.js";
import { mockDb, updateMockBalance } from "../mockDb.js";

const tradingRoutes = new Hono<AppEnv>();

tradingRoutes.use("*", requireAuth);

const subItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
});

const addTradingItemSchema = z.object({
  walletId: z.number().int().positive(),
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

tradingRoutes.get("/items", async (c) => {
  if (env.IS_MOCK) {
    return c.json({ data: mockDb.tradingItems });
  }
  const user = c.get("user");
  const walletIdRaw = c.req.query("walletId");
  if (!walletIdRaw) return c.json({ error: "walletId is required" }, 400);
  const walletId = Number(walletIdRaw);
  if (!Number.isInteger(walletId) || walletId <= 0) return c.json({ error: "Invalid walletId" }, 400);

  const { data, error } = await supabaseAdmin
    .from("trading_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("wallet_id", walletId)
    .order("import_date", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: enrichBatchFields(data ?? []) });
});

tradingRoutes.get("/items/batch/:batchId", async (c) => {
  const user = c.get("user");
  const batchId = c.req.param("batchId");
  if (!batchId) return c.json({ error: "Invalid batch id" }, 400);

  const { data, error } = await supabaseAdmin
    .from("trading_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: data ?? [] });
});

tradingRoutes.post("/items", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, addTradingItemSchema);
  if (!parsed.ok) return parsed.response;

  const quantity = parsed.data.quantity ?? 1;

  if (env.IS_MOCK) {
    const newItems = Array.from({ length: quantity }, (_, i) => ({
      id: Date.now() + i,
      name: quantity > 1 ? `${parsed.data.name} - sp ${i + 1}` : parsed.data.name,
      category: parsed.data.category || "",
      import_price: parsed.data.importPrice / quantity,
      import_date: parsed.data.importDate,
      status: "available"
    }));
    mockDb.tradingItems.push(...newItems);
    updateMockBalance(parsed.data.walletId, -parsed.data.importPrice);
    return c.json({ data: newItems }, 201);
  }

  const subItems = parsed.data.subItems ?? [];

  const txRes = await supabaseAdmin
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
    transaction_id: Number(txRes.data.id),
    sell_transaction_id: null,
  }));

  const insertRes = await supabaseAdmin.from("trading_items").insert(rows).select("*");
  if (insertRes.error) return c.json({ error: insertRes.error.message }, 400);

  return c.json({ data: insertRes.data ?? [] }, 201);
});

tradingRoutes.patch("/items/:id", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid item id" }, 400);

  const parsed = await parseJson(c, updateTradingItemSchema);
  if (!parsed.ok) return parsed.response;

  if (env.IS_MOCK) {
    const item = mockDb.tradingItems.find(x => x.id === id);
    if (!item) return c.json({ error: "Item not found" }, 404);
    if (parsed.data.status) item.status = parsed.data.status;
    if (parsed.data.sellPrice) item.sell_price = parsed.data.sellPrice;
    if (parsed.data.sellDate) item.sell_date = parsed.data.sellDate;
    
    // Simulate updating a wallet balance (we just use wallet 4 for trading mock)
    if (parsed.data.status === "sold" && parsed.data.sellPrice) {
      updateMockBalance(4, parsed.data.sellPrice);
    }
    return c.json({ data: item });
  }

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

  const { data, error } = await supabaseAdmin
    .from("trading_items")
    .update(payload)
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

tradingRoutes.delete("/items/:id", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid trading item id" }, 400);

  const { error } = await supabaseAdmin
    .from("trading_items")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

tradingRoutes.get("/stats", async (c) => {
  if (env.IS_MOCK) {
    return c.json({ data: { unsoldCapital: 50000, unsoldCount: 1, realizedProfit: 100000, soldCount: 1 } });
  }
  const user = c.get("user");
  const walletIdRaw = c.req.query("walletId");
  if (!walletIdRaw) return c.json({ error: "walletId is required" }, 400);
  const walletId = Number(walletIdRaw);
  if (!Number.isInteger(walletId) || walletId <= 0) return c.json({ error: "Invalid walletId" }, 400);

  const { data, error } = await supabaseAdmin
    .from("trading_items")
    .select("import_price,sell_price,status")
    .eq("user_id", user.id)
    .eq("wallet_id", walletId);

  if (error) return c.json({ error: error.message }, 500);

  const rows = data ?? [];
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
