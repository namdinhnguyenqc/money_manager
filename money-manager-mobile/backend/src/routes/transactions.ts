import { Hono } from "hono";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { parseJson, toNumberId } from "../utils/validation.js";
import { env } from "../config/env.js";
import { mockDb, updateMockBalance } from "../mockDb.js";

const transactionsRoutes = new Hono<AppEnv>();

transactionsRoutes.use("*", requireAuth);

const MOCK_TX = [
  { 
    id: 1, type: "income", amount: 15000000, description: "Lương tháng 4", 
    date: "2026-04-10", wallet_name: "Vietcombank", wallet_color: "#2563eb",
    category_name: "Lương", category_icon: "briefcase", category_color: "#10b981"
  },
  { 
    id: 2, type: "expense", amount: 500000, description: "Ăn trưa", 
    date: "2026-04-15", wallet_name: "Tiền mặt", wallet_color: "#475569",
    category_name: "Ăn uống", category_icon: "utensils", category_color: "#f59e0b"
  },
];

const txType = z.enum(["income", "expense"]);

const createTxSchema = z.object({
  type: txType,
  amount: z.number().positive(),
  description: z.string().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  walletId: z.number().int().positive(),
  imageUri: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const updateTxSchema = z
  .object({
    type: txType.optional(),
    amount: z.number().positive().optional(),
    description: z.string().optional(),
    categoryId: z.number().int().positive().nullable().optional(),
    walletId: z.number().int().positive().optional(),
    imageUri: z.string().nullable().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, "No fields to update");

transactionsRoutes.get("/", async (c) => {
  if (env.IS_MOCK) {
    return c.json({ data: mockDb.transactions.slice().reverse() });
  }
  const user = c.get("user");
  const walletIdRaw = c.req.query("walletId");
  const limit = Math.min(Number(c.req.query("limit") || 50), 200);
  const offset = Math.max(Number(c.req.query("offset") || 0), 0);

  let query = supabaseAdmin
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (walletIdRaw) {
    const walletId = Number(walletIdRaw);
    if (!Number.isInteger(walletId) || walletId <= 0) {
      return c.json({ error: "Invalid walletId" }, 400);
    }
    query = query.eq("wallet_id", walletId);
  }

  const { data, error, count } = await query;
  if (error) return c.json({ error: error.message }, 500);

  const txRows = data ?? [];
  if (txRows.length === 0) return c.json({ data: [], count: count ?? 0, limit, offset });

  const walletIds = [...new Set(txRows.map((x) => Number(x.wallet_id)).filter((x) => Number.isInteger(x) && x > 0))];
  const categoryIds = [
    ...new Set(
      txRows
        .map((x) => (x.category_id == null ? null : Number(x.category_id)))
        .filter((x): x is number => Number.isInteger(x as number) && (x as number) > 0)
    ),
  ];

  const [walletsRes, categoriesRes] = await Promise.all([
    walletIds.length > 0
      ? supabaseAdmin.from("wallets").select("*").eq("user_id", user.id).in("id", walletIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length > 0
      ? supabaseAdmin.from("categories").select("*").eq("user_id", user.id).in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (walletsRes.error) return c.json({ error: walletsRes.error.message }, 500);
  if (categoriesRes.error) return c.json({ error: categoriesRes.error.message }, 500);

  const walletMap = new Map((walletsRes.data ?? []).map((x) => [Number(x.id), x]));
  const categoryMap = new Map((categoriesRes.data ?? []).map((x) => [Number(x.id), x]));

  const enriched = txRows.map((row) => {
    const wallet = walletMap.get(Number(row.wallet_id));
    const category = row.category_id == null ? null : categoryMap.get(Number(row.category_id));
    return {
      ...row,
      wallet_name: wallet?.name ?? "",
      wallet_color: wallet?.color ?? null,
      category_name: category?.name ?? null,
      category_icon: category?.icon ?? null,
      category_color: category?.color ?? null,
    };
  });

  return c.json({ data: enriched, count: count ?? 0, limit, offset });
});

transactionsRoutes.post("/", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, createTxSchema);
  if (!parsed.ok) return parsed.response;

  if (env.IS_MOCK) {
    const newTx = {
      id: Date.now(),
      type: parsed.data.type,
      amount: parsed.data.amount,
      description: parsed.data.description || "Giao dịch",
      date: parsed.data.date,
      wallet_id: parsed.data.walletId
    };
    mockDb.transactions.push(newTx);
    updateMockBalance(parsed.data.walletId, parsed.data.type === "income" ? parsed.data.amount : -parsed.data.amount);
    return c.json({ data: newTx }, 201);
  }

  const payload = {
    user_id: user.id,
    type: parsed.data.type,
    amount: parsed.data.amount,
    description: parsed.data.description ?? "",
    category_id: parsed.data.categoryId ?? null,
    wallet_id: parsed.data.walletId,
    image_uri: parsed.data.imageUri ?? null,
    date: parsed.data.date,
  };

  const { data, error } = await supabaseAdmin.from("transactions").insert(payload).select("*").single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data }, 201);
});

transactionsRoutes.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid transaction id" }, 400);

  const parsed = await parseJson(c, updateTxSchema);
  if (!parsed.ok) return parsed.response;

  const payload: Record<string, unknown> = {};
  if (parsed.data.type !== undefined) payload.type = parsed.data.type;
  if (parsed.data.amount !== undefined) payload.amount = parsed.data.amount;
  if (parsed.data.description !== undefined) payload.description = parsed.data.description;
  if (parsed.data.categoryId !== undefined) payload.category_id = parsed.data.categoryId;
  if (parsed.data.walletId !== undefined) payload.wallet_id = parsed.data.walletId;
  if (parsed.data.imageUri !== undefined) payload.image_uri = parsed.data.imageUri;
  if (parsed.data.date !== undefined) payload.date = parsed.data.date;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

transactionsRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid transaction id" }, 400);

  await supabaseAdmin
    .from("invoices")
    .update({ status: "unpaid", transaction_id: null, paid_amount: 0 })
    .eq("user_id", user.id)
    .eq("transaction_id", id);

  const { error } = await supabaseAdmin
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

export default transactionsRoutes;
