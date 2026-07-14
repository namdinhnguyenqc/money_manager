import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { parseJson, toId } from "../utils/validation.js";
import type { AppEnv } from "../types.js";

const paymentChannelsRoutes = new Hono<AppEnv>();

paymentChannelsRoutes.use("*", requireAuth);

const normalizeBankId = (value: unknown) =>
  String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

const normalizeAccountNo = (value: unknown) =>
  String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

const duplicateSepayMessage = "Tài khoản ngân hàng này đã được dùng cho một kênh SePay khác.";

const findDuplicateSepayChannel = async (
  db: any,
  userId: string,
  bankId: unknown,
  accountNo: unknown,
  excludeId?: string,
) => {
  const normalizedBankId = normalizeBankId(bankId);
  const normalizedAccountNo = normalizeAccountNo(accountNo);
  if (!normalizedBankId || !normalizedAccountNo) return null;

  const { data, error } = await db
    .from("payment_channels")
    .select("id,bank_id,account_no")
    .eq("user_id", userId)
    .eq("provider", "sepay")
    .eq("enabled", true);

  if (error) throw new Error(error.message);
  return (data || []).find((channel: any) =>
    channel.id !== excludeId &&
    normalizeBankId(channel.bank_id) === normalizedBankId &&
    normalizeAccountNo(channel.account_no) === normalizedAccountNo
  ) || null;
};

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
  const includeDisabled = c.req.query("includeDisabled") === "true";
  let query = db
    .from("payment_channels")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("enabled", { ascending: false })
    .order("created_at", { ascending: true });
  if (!includeDisabled) query = query.eq("enabled", true);
  const { data, error } = await query;

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: (data ?? []).map(formatChannel) });
});

paymentChannelsRoutes.post("/", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, channelSchema);
  if (!parsed.ok) return parsed.response;

  const db = c.get("supabase");
  if (parsed.data.provider === "sepay") {
    if (!normalizeBankId(parsed.data.bankId) || !normalizeAccountNo(parsed.data.accountNo)) {
      return c.json({ error: "Kênh SePay cần có ngân hàng và số tài khoản." }, 400);
    }
    try {
      if (await findDuplicateSepayChannel(db, user.id, parsed.data.bankId, parsed.data.accountNo)) {
        return c.json({ error: duplicateSepayMessage }, 409);
      }
    } catch (error: any) {
      return c.json({ error: error.message || "Không thể kiểm tra tài khoản SePay." }, 500);
    }
  }
  if (parsed.data.isDefault) {
    const { error: defaultError } = await db.from("payment_channels").update({ is_default: false }).eq("user_id", user.id);
    if (defaultError) return c.json({ error: defaultError.message }, 400);
  }

  const { data, error } = await db
    .from("payment_channels")
    .insert({
      user_id: user.id,
      provider: parsed.data.provider,
      display_name: parsed.data.displayName,
      bank_id: parsed.data.provider === "sepay" ? normalizeBankId(parsed.data.bankId) : parsed.data.bankId || null,
      account_no: parsed.data.provider === "sepay" ? normalizeAccountNo(parsed.data.accountNo) : parsed.data.accountNo || null,
      account_name: parsed.data.accountName || null,
      wallet_id: parsed.data.walletId || null,
      enabled: parsed.data.enabled ?? true,
      auto_reconcile_enabled: parsed.data.autoReconcileEnabled ?? false,
      is_default: parsed.data.isDefault ?? false,
      config: parsed.data.config || {},
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") return c.json({ error: duplicateSepayMessage }, 409);
    return c.json({ error: error.message }, 400);
  }
  return c.json({ data: formatChannel(data) }, 201);
});

paymentChannelsRoutes.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid payment channel id" }, 400);

  const channelUpdateSchema = z.object({
    provider: z.enum(["sepay", "bank_transfer", "cash", "manual"]).optional(),
    displayName: z.string().trim().min(1).optional(),
    bankId: z.string().trim().nullable().optional(),
    accountNo: z.string().trim().nullable().optional(),
    accountName: z.string().trim().nullable().optional(),
    walletId: z.string().nullable().optional(),
    enabled: z.boolean().optional(),
    autoReconcileEnabled: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    config: z.record(z.string(), z.any()).optional(),
  });

  const parsed = await parseJson(c, channelUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const db = c.get("supabase");
  const { data: currentChannel, error: currentError } = await db
    .from("payment_channels")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (currentError || !currentChannel) return c.json({ error: "Không tìm thấy kênh thanh toán." }, 404);

  const nextProvider = parsed.data.provider ?? currentChannel.provider;
  const nextBankId = parsed.data.bankId !== undefined ? parsed.data.bankId : currentChannel.bank_id;
  const nextAccountNo = parsed.data.accountNo !== undefined ? parsed.data.accountNo : currentChannel.account_no;
  const nextEnabled = parsed.data.enabled ?? currentChannel.enabled;
  if (nextProvider === "sepay" && nextEnabled) {
    if (!normalizeBankId(nextBankId) || !normalizeAccountNo(nextAccountNo)) {
      return c.json({ error: "Kênh SePay cần có ngân hàng và số tài khoản." }, 400);
    }
    try {
      if (await findDuplicateSepayChannel(db, user.id, nextBankId, nextAccountNo, String(id))) {
        return c.json({ error: duplicateSepayMessage }, 409);
      }
    } catch (error: any) {
      return c.json({ error: error.message || "Không thể kiểm tra tài khoản SePay." }, 500);
    }
  }
  if (parsed.data.isDefault) {
    const { error: defaultError } = await db.from("payment_channels").update({ is_default: false }).eq("user_id", user.id);
    if (defaultError) return c.json({ error: defaultError.message }, 400);
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.provider !== undefined) payload.provider = parsed.data.provider;
  if (parsed.data.displayName !== undefined) payload.display_name = parsed.data.displayName;
  if (parsed.data.bankId !== undefined) payload.bank_id = nextProvider === "sepay" ? normalizeBankId(parsed.data.bankId) : parsed.data.bankId || null;
  if (parsed.data.accountNo !== undefined) payload.account_no = nextProvider === "sepay" ? normalizeAccountNo(parsed.data.accountNo) : parsed.data.accountNo || null;
  if (parsed.data.accountName !== undefined) payload.account_name = parsed.data.accountName || null;
  if (parsed.data.walletId !== undefined) payload.wallet_id = parsed.data.walletId || null;
  if (parsed.data.enabled !== undefined) payload.enabled = parsed.data.enabled;
  if (parsed.data.autoReconcileEnabled !== undefined) payload.auto_reconcile_enabled = parsed.data.autoReconcileEnabled;
  if (parsed.data.isDefault !== undefined) payload.is_default = parsed.data.isDefault;
  if (parsed.data.enabled === false) payload.is_default = false;
  if (parsed.data.isDefault === true) payload.enabled = true;
  if (parsed.data.config !== undefined) payload.config = parsed.data.config;

  const { data, error } = await db
    .from("payment_channels")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") return c.json({ error: duplicateSepayMessage }, 409);
    return c.json({ error: error.message }, 400);
  }
  return c.json({ data: formatChannel(data) });
});

paymentChannelsRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid payment channel id" }, 400);

  const db = c.get("supabase");
  const { error } = await db
    .from("payment_channels")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

export default paymentChannelsRoutes;
