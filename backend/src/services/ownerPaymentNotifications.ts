import { supabaseAdmin } from "../lib/supabase.js";
import { sendPushNotification } from "./firebaseService.js";
import { resolvePaymentNotificationChannels } from "./notificationPreferences.js";

export async function notifyOwnerPaymentReceived(
  ownerId: string,
  invoice: any,
  roomName: string | null,
  amount: number,
  status: "paid" | "partial",
): Promise<void> {
  const channels = await resolvePaymentNotificationChannels(ownerId, "received");
  if (!channels.inApp && !channels.push) return;

  const formattedAmount = new Intl.NumberFormat("vi-VN").format(Math.round(amount));
  const fullyPaid = status === "paid";
  const title = fullyPaid ? "Nhận tiền thành công" : "Nhận thanh toán một phần";
  const body = `${roomName || "Phòng"} đã thanh toán ${formattedAmount} ₫ cho hóa đơn tháng ${invoice.month}/${invoice.year}.`;
  const payload = {
    title,
    body,
    invoiceId: invoice.id,
    roomId: invoice.room_id,
    transactionStatus: status,
    paymentStatus: status,
    amount,
  };

  if (channels.inApp) {
    const { error } = await supabaseAdmin.from("rental_notifications").insert({
      user_id: ownerId,
      channel: channels.push ? "both" : "in_app",
      event_type: "INVOICE_PAID",
      payload,
      delivered_at: new Date().toISOString(),
    });
    if (error) console.error("Failed to create owner payment notification:", error.message);
  }

  if (channels.push) {
    await sendPushNotification(ownerId, {
      title,
      body,
      data: {
        type: "INVOICE_PAID",
        invoice_id: String(invoice.id),
        room_id: String(invoice.room_id || ""),
      },
    });
  }
}
