import { Hono } from "hono";
import { z } from "zod";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { parseJson, toId } from "../utils/validation.js";
import { updateWalletBalance } from "../utils/wallet.js";

const transactionsRoutes = new Hono<AppEnv>();

transactionsRoutes.use("*", requireAuth);

const txType = z.enum(["income", "expense"]);

const createTxSchema = z.object({
  type: txType,
  amount: z.number().positive(),
  description: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  walletId: z.string().min(1),
  invoiceId: z.string().optional(),
  imageUri: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const updateTxSchema = z
  .object({
    type: txType.optional(),
    amount: z.number().positive().optional(),
    description: z.string().optional(),
    categoryId: z.string().nullable().optional(),
    walletId: z.string().optional(),
    invoiceId: z.string().nullable().optional(),
    imageUri: z.string().nullable().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, "No fields to update");

transactionsRoutes.get("/", async (c) => {
  const user = c.get("user");
  const walletIdRaw = c.req.query("walletId");
  const limit = Math.min(Number(c.req.query("limit") || 50), 200);
  const offset = Math.max(Number(c.req.query("offset") || 0), 0);

  const db = c.get("supabase");
  let query = db
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (walletIdRaw) {
    query = query.eq("wallet_id", walletIdRaw);
  }
  
  const invoiceIdRaw = c.req.query("invoiceId");
  if (invoiceIdRaw) {
    query = query.eq("invoice_id", invoiceIdRaw);
  }

  const { data, error, count } = await query;
  if (error) return c.json({ error: error.message }, 500);

  const txRows = data ?? [];
  if (txRows.length === 0) return c.json({ data: [], count: count ?? 0, limit, offset });

  const walletIds = [...new Set(txRows.map((x) => x.wallet_id))];
  const categoryIds = [
    ...new Set(
      txRows
        .map((x) => x.category_id)
        .filter((x) => x != null)
    ),
  ];

  const [walletsRes, categoriesRes] = await Promise.all([
    walletIds.length > 0
      ? db.from("wallets").select("*").eq("user_id", user.id).in("id", walletIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length > 0
      ? db.from("categories").select("*").eq("user_id", user.id).in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (walletsRes.error) return c.json({ error: walletsRes.error.message }, 500);
  if (categoriesRes.error) return c.json({ error: categoriesRes.error.message }, 500);

  const walletMap = new Map((walletsRes.data ?? []).map((x) => [String(x.id), x]));
  const categoryMap = new Map((categoriesRes.data ?? []).map((x) => [String(x.id), x]));

  const enriched = txRows.map((row) => {
    const wallet = walletMap.get(String(row.wallet_id));
    const category = row.category_id == null ? null : categoryMap.get(String(row.category_id));
    return {
      ...row,
      walletId: row.wallet_id,
      categoryId: row.category_id,
      invoiceId: row.invoice_id,
      imageUri: row.image_uri,
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

  const payload = {
    user_id: user.id,
    type: parsed.data.type,
    amount: parsed.data.amount,
    description: parsed.data.description ?? "",
    category_id: parsed.data.categoryId ?? null,
    wallet_id: parsed.data.walletId,
    invoice_id: parsed.data.invoiceId ?? null,
    image_uri: parsed.data.imageUri ?? null,
    date: parsed.data.date,
  };

  const db = c.get("supabase");
  const { data, error } = await db.from("transactions").insert(payload).select("*").single();
  if (error) return c.json({ error: error.message }, 400);

  // Cập nhật số dư ví
  await updateWalletBalance(db, parsed.data.walletId, parsed.data.amount, parsed.data.type);

  const formatted = data ? { ...data, walletId: data.wallet_id, categoryId: data.category_id, invoiceId: data.invoice_id, imageUri: data.image_uri } : data;
  return c.json({ data: formatted }, 201);
});

transactionsRoutes.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid transaction id" }, 400);

  const parsed = await parseJson(c, updateTxSchema);
  if (!parsed.ok) return parsed.response;

  const payload: Record<string, unknown> = {};
  if (parsed.data.type !== undefined) payload.type = parsed.data.type;
  if (parsed.data.amount !== undefined) payload.amount = parsed.data.amount;
  if (parsed.data.description !== undefined) payload.description = parsed.data.description;
  if (parsed.data.categoryId !== undefined) payload.category_id = parsed.data.categoryId;
  if (parsed.data.walletId !== undefined) payload.wallet_id = parsed.data.walletId;
  if (parsed.data.invoiceId !== undefined) payload.invoice_id = parsed.data.invoiceId;
  if (parsed.data.imageUri !== undefined) payload.image_uri = parsed.data.imageUri;
  if (parsed.data.date !== undefined) payload.date = parsed.data.date;
  payload.updated_at = new Date().toISOString();

  const db = c.get("supabase");
  const { data, error } = await db
    .from("transactions")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  const formatted = data ? { ...data, walletId: data.wallet_id, categoryId: data.category_id, invoiceId: data.invoice_id, imageUri: data.image_uri } : data;
  return c.json({ data: formatted });
});

transactionsRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid transaction id" }, 400);

  const db = c.get("supabase");
  
  // 1. Lấy thông tin giao dịch trước khi xóa để hoàn tác số dư ví
  const { data: tx, error: getErr } = await db
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
    
  if (getErr || !tx) return c.json({ error: getErr?.message || "Transaction not found" }, 404);

  // 2. Cập nhật hóa đơn liên quan (nếu có)
  await db
    .from("invoices")
    .update({ status: "unpaid", transaction_id: null, paid_amount: 0 })
    .eq("user_id", user.id)
    .eq("transaction_id", id);

  // 3. Xóa giao dịch
  const { error } = await db
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return c.json({ error: error.message }, 400);

  // 4. Hoàn tác số dư ví
  // Nếu là thu (income) thì phải trừ (expense), nếu là chi (expense) thì phải cộng (income)
  const reverseType = tx.type === "income" ? "expense" : "income";
  await updateWalletBalance(db, tx.wallet_id, tx.amount, reverseType);

  return c.json({ ok: true });
});

export default transactionsRoutes;
