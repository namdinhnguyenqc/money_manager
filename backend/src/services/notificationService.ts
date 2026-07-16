import { supabaseAdmin } from "../lib/supabase.js";
import { sendPushNotification } from "./firebaseService.js";
import { resolvePaymentNotificationChannels } from "./notificationPreferences.js";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })
    .format(amount)
    .replace(/\s/g, "");
}

export async function createNotification(params: {
  userId: string;
  title: string;
  body: string;
  type: "invoice_created" | "payment_success" | "payment_reminder" | "contract_update" | "contract_expiring" | "announcement" | "system";
  data?: Record<string, string>;
  channel?: "push" | "in_app" | "both";
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const channel = params.channel || "both";
    const data = params.data || {};

    let notificationId: string | undefined;
    if (channel === "in_app" || channel === "both") {
      const { data: notif, error } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: params.userId,
          title: params.title,
          body: params.body,
          type: params.type,
          data,
          channel,
          is_read: false,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to save notification in DB:", error.message);
        return { success: false, error: error.message };
      }
      notificationId = notif.id;
    }

    // 2. If channel includes 'push', send FCM
    if (channel === "push" || channel === "both") {
      // Async call so we don't block the API thread
      sendPushNotification(params.userId, {
        title: params.title,
        body: params.body,
        data: {
          ...data,
          ...(notificationId ? { notification_id: notificationId } : {}),
          type: params.type,
        },
      }).catch((pushErr) => {
        console.error("Background FCM push failed:", pushErr.message);
      });
    }

    return { success: true, id: notificationId };
  } catch (err: any) {
    console.error("Unexpected error creating notification:", err.message);
    return { success: false, error: err.message };
  }
}

export async function getTenantUserIdByContractId(contractId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("contracts")
      .select("tenant_id")
      .eq("id", contractId)
      .maybeSingle();

    if (error || !data?.tenant_id) return null;

    const { data: tenantAccount, error: accountError } = await supabaseAdmin
      .from("tenant_accounts")
      .select("user_id")
      .eq("tenant_id", data.tenant_id)
      .maybeSingle();

    if (accountError || !tenantAccount) return null;
    return tenantAccount.user_id;
  } catch (err) {
    console.error("Error looking up tenant user ID from contract ID:", err);
    return null;
  }
}

export async function getTenantUserIdByInvoiceId(invoiceId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .select("contract_id")
      .eq("id", invoiceId)
      .maybeSingle();

    if (error || !data?.contract_id) return null;
    return getTenantUserIdByContractId(data.contract_id);
  } catch (err) {
    console.error("Error looking up tenant user ID from invoice ID:", err);
    return null;
  }
}

export async function notifyInvoiceCreated(
  tenantUserId: string,
  invoice: { id: string; month: number; year: number; total_amount: number; payment_code?: string }
): Promise<void> {
  const formattedAmount = formatCurrency(invoice.total_amount);
  await createNotification({
    userId: tenantUserId,
    title: "Hóa đơn mới 📋",
    body: `Bạn vừa nhận hóa đơn tháng ${invoice.month}/${invoice.year} tổng số tiền ${formattedAmount}.`,
    type: "invoice_created",
    data: {
      invoice_id: invoice.id,
      payment_code: invoice.payment_code || "",
    },
    channel: "both",
  });
}

export async function notifyPaymentSuccess(
  tenantUserId: string,
  invoice: { id: string; payment_code: string },
  amount: number
): Promise<void> {
  const channels = await resolvePaymentNotificationChannels(tenantUserId, "sent");
  if (!channels.inApp && !channels.push) return;
  const formattedAmount = formatCurrency(amount);
  await createNotification({
    userId: tenantUserId,
    title: "Thanh toán thành công! ✅",
    body: `Giao dịch thanh toán hóa đơn ${invoice.payment_code} số tiền ${formattedAmount} đã được xác nhận thành công.`,
    type: "payment_success",
    data: {
      invoice_id: invoice.id,
      payment_code: invoice.payment_code,
      amount: amount.toString(),
    },
    channel: channels.inApp && channels.push ? "both" : channels.push ? "push" : "in_app",
  });
}

export async function notifyContractUpdate(
  tenantUserId: string,
  contract: { id: string; room_name?: string },
  action: "created" | "updated" | "ended"
): Promise<void> {
  let title = "Cập nhật hợp đồng ✍️";
  let body = `Hợp đồng thuê phòng của bạn đã được cập nhật.`;

  if (action === "created") {
    title = "Hợp đồng mới đã được ký ✍️";
    body = `Hợp đồng thuê phòng ${contract.room_name || ""} của bạn đã được khởi tạo thành công trên hệ thống.`;
  } else if (action === "ended") {
    title = "Hợp đồng đã kết thúc 🚫";
    body = `Hợp đồng thuê phòng ${contract.room_name || ""} của bạn đã kết thúc. Cảm ơn bạn đã đồng hành cùng TrọCare.`;
  }

  await createNotification({
    userId: tenantUserId,
    title,
    body,
    type: "contract_update",
    data: {
      contract_id: contract.id,
      action,
    },
    channel: "both",
  });
}
