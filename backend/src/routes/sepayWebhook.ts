import { Hono } from "hono";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { applyInvoicePayment } from "../services/invoicePayments.js";
import { getTenantUserIdByContractId, notifyPaymentSuccess } from "../services/notificationService.js";
import { notifyOwnerPaymentReceived } from "../services/ownerPaymentNotifications.js";
import { extractPaymentCodeFromPayload } from "../utils/paymentCodes.js";
import { resolveSepayChannel } from "../services/sepayReconcile.js";
import { extractSepayApiKey, verifySepayWebhookAuth } from "../services/sepayAuth.js";
import type { AppEnv } from "../types.js";

const sepayWebhookRoutes = new Hono<AppEnv>();

const jsonOk = () => new Response(JSON.stringify({ success: true }), {
  status: 200,
  headers: { "content-type": "application/json" },
});

const insertEvent = async (payload: Record<string, unknown>) => {
  const { data, error } = await supabaseAdmin
    .from("sepay_webhook_events")
    .upsert(payload, { onConflict: "sepay_transaction_id" })
    .select("*")
    .single();
  return { data, error };
};

sepayWebhookRoutes.post("/", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-sepay-signature");
  const timestamp = c.req.header("x-sepay-timestamp");
  const apiKey = extractSepayApiKey(c.req.header("x-api-key"), c.req.header("authorization"));
  const urlUserId = c.req.query("user_id") || c.req.query("userId");
 
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ success: false, error: "Invalid JSON payload" }, 400);
  }
 
  const paymentCode = extractPaymentCodeFromPayload(payload);
  let userWebhookSecret: string | null = null;
  let userApiKey: string | null = null;
  let resolvedUserId: string | null = urlUserId || null;
 
  if (!resolvedUserId && paymentCode) {
    const invoiceRes = await supabaseAdmin
      .from("invoices")
      .select("user_id")
      .eq("payment_code", paymentCode)
      .maybeSingle();
 
    if (invoiceRes.data?.user_id) {
      resolvedUserId = invoiceRes.data.user_id;
    }
  }
 
  if (resolvedUserId) {
    const settingsRes = await supabaseAdmin
      .from("system_settings")
      .select("*")
      .eq("user_id", resolvedUserId)
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

  // Verify auth ONLY when a secret/api-key is actually configured (env or owner
  // settings). If nothing is configured we accept the webhook rather than 401 a
  // real payment away — a missing server-side secret must never lose money. When
  // a secret IS configured, it is enforced strictly below.
  const authValid = verifySepayWebhookAuth({
    rawBody,
    signature,
    timestamp,
    apiKey,
    configuredSecret: userWebhookSecret || env.SEPAY_WEBHOOK_SECRET,
    configuredApiKey: userApiKey || env.SEPAY_API_KEY,
    requireAuth: env.SEPAY_REQUIRE_AUTH,
  });
  if (!authValid) {
    return c.json({ success: false, error: "Invalid SePay webhook credentials" }, 401);
  }

  const sepayTransactionId = String(payload.id || payload.referenceCode || payload.reference_code || "");
  if (!sepayTransactionId) {
    return c.json({ success: false, error: "Missing SePay transaction id" }, 400);
  }

  const existing = await supabaseAdmin
    .from("sepay_webhook_events")
    .select("id,status")
    .eq("sepay_transaction_id", sepayTransactionId)
    .maybeSingle();
  if (existing.data && ["paid", "partial", "overpaid", "ignored"].includes(existing.data.status)) {
    return jsonOk();
  }

  const transferType = String(payload.transferType || payload.transfer_type || "").toLowerCase();
  const transferAmount = Number(payload.transferAmount ?? payload.transfer_amount ?? payload.amount ?? 0);
  const accountNumber = String(payload.accountNumber || payload.account_number || "");

  if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
    await insertEvent({
      user_id: resolvedUserId,
      sepay_transaction_id: sepayTransactionId,
      gateway: payload.gateway || null,
      account_number: accountNumber || null,
      transfer_type: transferType || null,
      transfer_amount: 0,
      payment_code: paymentCode || null,
      status: "ignored",
      raw_payload: payload,
      error_message: "Invalid transfer amount",
    });
    return jsonOk();
  }

  if (transferType && !["in", "credit"].includes(transferType)) {
    await insertEvent({
      user_id: resolvedUserId,
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
      user_id: resolvedUserId,
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
      user_id: resolvedUserId,
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
  if (urlUserId && invoice.user_id !== urlUserId) {
    await insertEvent({
      user_id: urlUserId,
      sepay_transaction_id: sepayTransactionId,
      gateway: payload.gateway || null,
      account_number: accountNumber || null,
      transfer_type: transferType || null,
      transfer_amount: transferAmount,
      payment_code: paymentCode,
      status: "unmatched",
      raw_payload: payload,
      error_message: "Payment code does not belong to webhook owner",
    });
    return jsonOk();
  }
  const channel = await resolveSepayChannel(supabaseAdmin, { invoice, accountNumber });

  if (!channel) {
    await insertEvent({
      user_id: invoice.user_id,
      invoice_id: invoice.id,
      payment_channel_id: invoice.payment_channel_id || null,
      sepay_transaction_id: sepayTransactionId,
      gateway: payload.gateway || null,
      account_number: accountNumber || null,
      transfer_type: transferType || null,
      transfer_amount: transferAmount,
      payment_code: paymentCode,
      status: "pending_wallet",
      raw_payload: payload,
      error_message: "Payment channel not configured (no wallet or auto-reconcile disabled)",
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

  if (!paymentRes.data.idempotent) {
    await notifyOwnerPaymentReceived(
      String(invoice.user_id),
      invoice,
      roomRes.data?.name || null,
      transferAmount,
      paymentRes.data.status,
    );
  }

  // Success path: Trigger FCM notification and create auto expense for tenant
  if (!paymentRes.data.idempotent) {
    try {
      const tenantUserId = await getTenantUserIdByContractId(invoice.contract_id);
      if (tenantUserId) {
      // 1. Notify the tenant
      await notifyPaymentSuccess(tenantUserId, invoice, transferAmount);

      // 2. Look up the default "Tiền phòng" category for this tenant
      let categoryId: string | null = null;
      const { data: cat } = await supabaseAdmin
        .from("tenant_categories")
        .select("id")
        .eq("user_id", tenantUserId)
        .eq("name", "Tiền phòng")
        .eq("type", "expense")
        .maybeSingle();

      if (cat) {
        categoryId = cat.id;
      } else {
        const { data: firstExpense } = await supabaseAdmin
          .from("tenant_categories")
          .select("id")
          .eq("user_id", tenantUserId)
          .eq("type", "expense")
          .limit(1)
          .maybeSingle();
        categoryId = firstExpense?.id || null;
      }

      // 3. Create the expense transaction for tenant
      await supabaseAdmin.from("tenant_transactions").insert({
        user_id: tenantUserId,
        category_id: categoryId,
        type: "expense",
        amount: transferAmount,
        description: `Thanh toán hóa đơn phòng trọ ${invoice.month}/${invoice.year} (Tự động)`,
        date: new Date().toISOString().split("T")[0],
        source: "auto_invoice",
        reference_id: invoice.id,
      });
        console.log(`Auto expense transaction created for Tenant User ${tenantUserId}`);
      }
    } catch (notifyErr: any) {
      console.error("Non-blocking error during tenant FCM notification or auto expense creation:", notifyErr.message);
    }
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
