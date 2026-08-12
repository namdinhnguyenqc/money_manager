import { env } from "../config/env.js";
import { sendZBSNotification, type ZaloNotificationLog } from "../lib/zaloService.js";
import { supabaseAdmin } from "../lib/supabase.js";

export type ZaloReminderResult = {
  status: "sent" | "skipped" | "failed";
  reason?: string;
};

const retryAt = (retryCount: number) => {
  const delays = [15, 60, 360];
  return new Date(Date.now() + delays[Math.min(retryCount, delays.length - 1)] * 60_000).toISOString();
};

const DEFAULT_ZALO_REMINDER_MESSAGE =
  "Chào {tenant_name}, hóa đơn phòng {room_name} {reminder_status}.\n" +
  "Số tiền còn lại: {amount_due}.\n" +
  "Hạn thanh toán: {due_date}.\n" +
  "Mã chuyển khoản: {payment_code}.\n" +
  "Nếu đã thanh toán, vui lòng bỏ qua tin này. Cảm ơn anh/chị.";

const fillTemplate = (template: string, values: Record<string, unknown>) =>
  template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => String(values[key] ?? match));

async function getOwnerSettingValue(ownerId: string, key: string) {
  const { data, error } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("user_id", ownerId)
    .eq("key", key)
    .maybeSingle();
  if (error) console.warn(`[settings] Unable to load ${key}:`, error.message);
  return typeof data?.value === "string" && data.value.trim() ? data.value : null;
}

async function getRecipient(invoiceId: string) {
  const { data: invoice } = await supabaseAdmin
    .from("invoices")
    .select("id,contract_id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice?.contract_id) return null;

  const { data: contract } = await supabaseAdmin
    .from("contracts")
    .select("tenant_id")
    .eq("id", invoice.contract_id)
    .maybeSingle();
  if (!contract?.tenant_id) return null;

  const [{ data: tenant }, { data: account }] = await Promise.all([
    supabaseAdmin.from("tenants").select("id,name,phone").eq("id", contract.tenant_id).maybeSingle(),
    supabaseAdmin.from("tenant_accounts").select("user_id").eq("tenant_id", contract.tenant_id).maybeSingle(),
  ]);
  if (!tenant?.phone || !account?.user_id) return null;
  return { tenantUserId: String(account.user_id), name: String(tenant.name || "Khách thuê"), phone: String(tenant.phone) };
}

export async function sendPaymentReminderZalo(input: {
  ownerId: string;
  invoiceId: string;
  reminderKey: string;
  roomName: string;
  amountDue: number;
  dueDate: string;
  paymentCode: string;
  reminderStatus?: string;
}): Promise<ZaloReminderResult> {
  if (!env.ZALO_REMINDERS_ENABLED) return { status: "skipped", reason: "disabled" };
  if (!env.ZALO_SHARED_OWNER_ID || !env.ZALO_PAYMENT_REMINDER_TEMPLATE_ID) {
    return { status: "skipped", reason: "not_configured" };
  }

  const recipient = await getRecipient(input.invoiceId);
  if (!recipient) return { status: "skipped", reason: "missing_recipient" };
  const externalKey = `payment-reminder:${input.invoiceId}:${input.reminderKey}`;
  const amountText = `${new Intl.NumberFormat("vi-VN").format(Math.round(input.amountDue))} đ`;
  const template = await getOwnerSettingValue(input.ownerId, "zalo_reminder_template") || DEFAULT_ZALO_REMINDER_MESSAGE;
  const message = fillTemplate(template, {
    tenant_name: recipient.name,
    room_name: input.roomName,
    reminder_status: input.reminderStatus || "cần thanh toán",
    amount_due: amountText,
    due_date: input.dueDate,
    payment_code: input.paymentCode || "Chưa có",
  });
  const payload = {
    customer_name: recipient.name,
    room_name: input.roomName,
    amount_due: String(Math.round(input.amountDue)),
    due_date: input.dueDate,
    payment_code: input.paymentCode,
    reminder_status: input.reminderStatus || "",
    message,
  };

  const logData: ZaloNotificationLog = {
    invoice_id: input.invoiceId,
    tenant_id: recipient.tenantUserId,
    phone_number: recipient.phone,
    template_id: env.ZALO_PAYMENT_REMINDER_TEMPLATE_ID,
    message_payload: payload,
    send_status: "PENDING",
    retry_count: 0,
  };
  const { data: log, error } = await supabaseAdmin
    .from("invoice_zalo_notifications")
    .insert({ ...logData, message_type: "payment_reminder", external_key: externalKey })
    .select("id")
    .single();
  if (error?.code === "23505") return { status: "skipped", reason: "already_sent_or_queued" };
  if (error || !log) return { status: "failed", reason: error?.message || "queue_failed" };

  const sent = await sendZBSNotification(logData, env.ZALO_SHARED_OWNER_ID);
  await supabaseAdmin.from("invoice_zalo_notifications").update(sent.success ? {
    send_status: "SENT",
    zalo_message_id: sent.msgId || null,
    sent_at: new Date().toISOString(),
    next_retry_at: null,
    updated_at: new Date().toISOString(),
  } : {
    send_status: "FAILED",
    error_code: sent.errCode || null,
    error_message: sent.errMsg || "Zalo delivery failed",
    next_retry_at: retryAt(0),
    updated_at: new Date().toISOString(),
  }).eq("id", log.id);
  return sent.success ? { status: "sent" } : { status: "failed", reason: sent.errMsg };
}

export async function retryFailedPaymentReminderZalo(limit = 25) {
  if (!env.ZALO_REMINDERS_ENABLED || !env.ZALO_SHARED_OWNER_ID) return { checked: 0, sent: 0, failed: 0 };
  const { data: logs } = await supabaseAdmin
    .from("invoice_zalo_notifications")
    .select("*")
    .eq("message_type", "payment_reminder")
    .eq("send_status", "FAILED")
    .lte("next_retry_at", new Date().toISOString())
    .lt("retry_count", 3)
    .order("next_retry_at", { ascending: true })
    .limit(limit);
  const summary = { checked: 0, sent: 0, failed: 0 };
  for (const log of logs || []) {
    summary.checked += 1;
    const nextCount = Number(log.retry_count || 0) + 1;
    const sent = await sendZBSNotification(log as ZaloNotificationLog, env.ZALO_SHARED_OWNER_ID);
    await supabaseAdmin.from("invoice_zalo_notifications").update(sent.success ? {
      send_status: "SENT", zalo_message_id: sent.msgId || null,
      sent_at: new Date().toISOString(), retry_count: nextCount, next_retry_at: null,
      updated_at: new Date().toISOString(),
    } : {
      error_code: sent.errCode || null, error_message: sent.errMsg || "Zalo delivery failed",
      retry_count: nextCount, next_retry_at: nextCount >= 3 ? null : retryAt(nextCount),
      updated_at: new Date().toISOString(),
    }).eq("id", log.id);
    if (sent.success) summary.sent += 1;
    else summary.failed += 1;
  }
  return summary;
}
