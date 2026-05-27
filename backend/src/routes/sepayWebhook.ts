import { Hono } from "hono";
import crypto from "crypto";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { applyInvoicePayment } from "../services/invoicePayments.js";
import type { AppEnv } from "../types.js";

const sepayWebhookRoutes = new Hono<AppEnv>();

const jsonOk = () => new Response(JSON.stringify({ success: true }), {
  status: 200,
  headers: { "content-type": "application/json" },
});

const timingSafeEqualText = (left: string, right: string) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const verifySignature = (rawBody: string, signature?: string, timestamp?: string, customSecret?: string | null) => {
  const activeSecret = customSecret || env.SEPAY_WEBHOOK_SECRET;
  if (!activeSecret) return true;
  if (!signature) return false;

  const cleaned = signature.replace(/^sha256=/i, "");
  const candidates = [
    crypto.createHmac("sha256", activeSecret).update(`${timestamp || ""}.${rawBody}`).digest("hex"),
    crypto.createHmac("sha256", activeSecret).update(rawBody).digest("hex"),
  ];

  return candidates.some((candidate) => timingSafeEqualText(candidate, cleaned));
};

const verifyApiKey = (apiKey?: string, customApiKey?: string | null) => {
  const activeApiKey = customApiKey || env.SEPAY_API_KEY;
  if (!activeApiKey) return true;
  return apiKey === activeApiKey;
};

const findPaymentCode = (payload: any) => {
  const prefix = env.SEPAY_PAYMENT_PREFIX || "TCINV";
  const direct = String(payload.code || "").trim();
  if (direct.toUpperCase().startsWith(prefix.toUpperCase())) return direct.toUpperCase();

  const content = String(payload.content || payload.description || "");
  const match = content.toUpperCase().match(new RegExp(`${prefix.toUpperCase()}[A-Z0-9]+`));
  return match?.[0] || "";
};

const insertEvent = async (payload: Record<string, unknown>) => {
  const { data, error } = await supabaseAdmin
    .from("sepay_webhook_events")
    .insert(payload)
    .select("*")
    .single();
  return { data, error };
};

sepayWebhookRoutes.post("/", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-sepay-signature");
  const timestamp = c.req.header("x-sepay-timestamp");
  const apiKey = c.req.header("x-api-key") || c.req.header("authorization")?.replace(/^Bearer\s+/i, "");

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ success: false, error: "Invalid JSON payload" }, 400);
  }

  const paymentCode = findPaymentCode(payload);
  let userWebhookSecret: string | null = null;
  let userApiKey: string | null = null;

  if (paymentCode) {
    const invoiceRes = await supabaseAdmin
      .from("invoices")
      .select("user_id")
      .eq("payment_code", paymentCode)
      .maybeSingle();

    if (invoiceRes.data?.user_id) {
      const settingsRes = await supabaseAdmin
        .from("system_settings")
        .select("*")
        .eq("user_id", invoiceRes.data.user_id)
        .in("key", ["sepay_webhook_secret", "sepay_api_key"]);

      if (settingsRes.data) {
        const secretSetting = settingsRes.data.find((s) => s.key === "sepay_webhook_secret");
        const apiKeySetting = settingsRes.data.find((s) => s.key === "sepay_api_key");

        if (secretSetting?.value !== undefined && secretSetting?.value !== null) {
          userWebhookSecret = String(secretSetting.value);
        }
        if (apiKeySetting?.value !== undefined && apiKeySetting?.value !== null) {
          userApiKey = String(apiKeySetting.value);
        }
      }
    }
  }

  if (!verifySignature(rawBody, signature, timestamp, userWebhookSecret) || !verifyApiKey(apiKey, userApiKey)) {
    return c.json({ success: false, error: "Invalid SePay signature" }, 401);
  }

  const sepayTransactionId = String(payload.id || payload.referenceCode || payload.reference_code || "");
  if (!sepayTransactionId) {
    return c.json({ success: false, error: "Missing SePay transaction id" }, 400);
  }

  const existing = await supabaseAdmin
    .from("sepay_webhook_events")
    .select("id")
    .eq("sepay_transaction_id", sepayTransactionId)
    .maybeSingle();
  if (existing.data) return jsonOk();

  const transferType = String(payload.transferType || payload.transfer_type || "").toLowerCase();
  const transferAmount = Number(payload.transferAmount ?? payload.transfer_amount ?? payload.amount ?? 0);
  const accountNumber = String(payload.accountNumber || payload.account_number || "");

  if (transferType && !["in", "credit"].includes(transferType)) {
    await insertEvent({
      sepay_transaction_id: sepayTransactionId,
      gateway: payload.gateway || null,
      account_number: accountNumber || null,
      transfer_type: transferType,
      transfer_amount: transferAmount,
      payment_code: paymentCode || null,
      status: "ignored",
      raw_payload: payload,
    });
    return jsonOk();
  }

  if (!paymentCode) {
    await insertEvent({
      sepay_transaction_id: sepayTransactionId,
      gateway: payload.gateway || null,
      account_number: accountNumber || null,
      transfer_type: transferType || null,
      transfer_amount: transferAmount,
      status: "unmatched",
      raw_payload: payload,
      error_message: "Missing payment code",
    });
    return jsonOk();
  }

  const invoiceRes = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("payment_code", paymentCode)
    .maybeSingle();

  if (invoiceRes.error || !invoiceRes.data) {
    await insertEvent({
      sepay_transaction_id: sepayTransactionId,
      gateway: payload.gateway || null,
      account_number: accountNumber || null,
      transfer_type: transferType || null,
      transfer_amount: transferAmount,
      payment_code: paymentCode,
      status: "unmatched",
      raw_payload: payload,
      error_message: invoiceRes.error?.message || "Invoice not found",
    });
    return jsonOk();
  }

  const invoice = invoiceRes.data;
  let channel: any = null;
  if (invoice.payment_channel_id) {
    const channelRes = await supabaseAdmin
      .from("payment_channels")
      .select("*")
      .eq("id", invoice.payment_channel_id)
      .eq("user_id", invoice.user_id)
      .maybeSingle();
    channel = channelRes.data;
  }

  if (!channel && accountNumber) {
    const channelRes = await supabaseAdmin
      .from("payment_channels")
      .select("*")
      .eq("user_id", invoice.user_id)
      .eq("provider", "sepay")
      .eq("account_no", accountNumber)
      .eq("enabled", true)
      .limit(1)
      .maybeSingle();
    channel = channelRes.data;
  }

  if (!channel?.wallet_id || channel.auto_reconcile_enabled === false) {
    await insertEvent({
      user_id: invoice.user_id,
      invoice_id: invoice.id,
      payment_channel_id: channel?.id || invoice.payment_channel_id || null,
      sepay_transaction_id: sepayTransactionId,
      gateway: payload.gateway || null,
      account_number: accountNumber || null,
      transfer_type: transferType || null,
      transfer_amount: transferAmount,
      payment_code: paymentCode,
      status: "pending_wallet",
      raw_payload: payload,
      error_message: !channel?.wallet_id ? "Payment channel has no wallet_id" : "Auto reconcile disabled",
    });
    return jsonOk();
  }

  const roomRes = await supabaseAdmin
    .from("rooms")
    .select("name")
    .eq("id", invoice.room_id)
    .eq("user_id", invoice.user_id)
    .maybeSingle();

  const paymentRes = await applyInvoicePayment(supabaseAdmin, {
    invoice,
    amount: transferAmount,
    walletId: String(channel.wallet_id),
    source: "sepay",
    date: payload.transactionDate || payload.transaction_date,
    externalRef: sepayTransactionId,
    roomName: roomRes.data?.name || null,
    metadata: {
      sepay_transaction_id: sepayTransactionId,
      sepay_reference_code: payload.referenceCode || payload.reference_code || null,
      account_number: accountNumber || null,
      gateway: payload.gateway || null,
      content: payload.content || null,
    },
  });

  if (paymentRes.error || !paymentRes.data) {
    await insertEvent({
      user_id: invoice.user_id,
      invoice_id: invoice.id,
      payment_channel_id: channel.id,
      sepay_transaction_id: sepayTransactionId,
      gateway: payload.gateway || null,
      account_number: accountNumber || null,
      transfer_type: transferType || null,
      transfer_amount: transferAmount,
      payment_code: paymentCode,
      status: "error",
      raw_payload: payload,
      error_message: paymentRes.error || "Failed to apply payment",
    });
    return jsonOk();
  }

  const status = paymentRes.data.overpaidAmount > 0 ? "overpaid" : paymentRes.data.status;
  await insertEvent({
    user_id: invoice.user_id,
    invoice_id: invoice.id,
    payment_channel_id: channel.id,
    transaction_id: paymentRes.data.transaction.id,
    sepay_transaction_id: sepayTransactionId,
    gateway: payload.gateway || null,
    account_number: accountNumber || null,
    transfer_type: transferType || null,
    transfer_amount: transferAmount,
    allocated_amount: paymentRes.data.allocatedAmount,
    overpaid_amount: paymentRes.data.overpaidAmount,
    payment_code: paymentCode,
    status,
    raw_payload: payload,
  });

  return jsonOk();
});

export default sepayWebhookRoutes;
