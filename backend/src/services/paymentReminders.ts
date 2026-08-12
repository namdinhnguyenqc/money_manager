import { supabaseAdmin } from "../lib/supabase.js";
import { createNotification, formatCurrency, getTenantUserIdByInvoiceId } from "./notificationService.js";
import { sendPaymentReminderZalo } from "./zaloReminderService.js";

type ReminderRunSummary = {
  checked: number;
  delivered: number;
  skipped: number;
  failed: number;
};

const DEFAULT_REMINDER_DAYS_BEFORE = [3, 0];
const DEFAULT_REMINDER_DAYS_AFTER = [2, 7, 14];

const vietnamDate = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

export const dayDiff = (dueDate: string, today: string) => {
  const due = Date.parse(`${dueDate}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  return Math.round((due - now) / 86_400_000);
};

export const reminderMilestones = (
  daysBefore: unknown,
  daysAfter: unknown,
) => {
  const normalize = (value: unknown, fallback: number[]) => {
    if (!Array.isArray(value)) return fallback;
    const result = value
      .map(Number)
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 90);
    return result.length > 0 ? [...new Set(result)] : fallback;
  };
  const before = normalize(daysBefore, DEFAULT_REMINDER_DAYS_BEFORE);
  const after = normalize(daysAfter, DEFAULT_REMINDER_DAYS_AFTER);
  return new Set([...before, ...after.map((day) => -day)]);
};

const parseSettingDays = (value: unknown, fallback: number[]) => {
  if (Array.isArray(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  return raw.split(/[,\s]+/).map(Number);
};

async function getOwnerReminderSettings(ownerId: string) {
  const { data, error } = await supabaseAdmin
    .from("system_settings")
    .select("key,value")
    .eq("user_id", ownerId)
    .in("key", ["zalo_reminder_days_before", "zalo_reminder_days_after"]);
  if (error) {
    console.warn("Unable to load owner Zalo reminder settings; using defaults:", error.message);
    return {
      daysBefore: DEFAULT_REMINDER_DAYS_BEFORE,
      daysAfter: DEFAULT_REMINDER_DAYS_AFTER,
    };
  }
  const map = new Map((data || []).map((item: any) => [item.key, item.value]));
  return {
    daysBefore: parseSettingDays(map.get("zalo_reminder_days_before"), DEFAULT_REMINDER_DAYS_BEFORE),
    daysAfter: parseSettingDays(map.get("zalo_reminder_days_after"), DEFAULT_REMINDER_DAYS_AFTER),
  };
}

export const reminderCopy = (daysUntilDue: number, roomName: string, amountDue: number) => {
  const amount = formatCurrency(amountDue);
  if (daysUntilDue > 0) {
    return {
      key: `before_${daysUntilDue}`,
      title: "Sắp đến hạn thanh toán",
      body: `${roomName}: còn ${amount}, hạn sau ${daysUntilDue} ngày.`,
      status: `sắp đến hạn sau ${daysUntilDue} ngày`,
    };
  }
  if (daysUntilDue === 0) {
    return {
      key: "due_today",
      title: "Đến hạn thanh toán hôm nay",
      body: `${roomName}: còn ${amount}, đến hạn hôm nay.`,
      status: "đến hạn hôm nay",
    };
  }
  if (Math.abs(daysUntilDue) >= 14) {
    return {
      key: `overdue_${Math.abs(daysUntilDue)}`,
      title: "Cảnh báo nợ quá hạn lâu",
      body: `${roomName}: còn ${amount}, quá hạn ${Math.abs(daysUntilDue)} ngày. Vui lòng xử lý sớm.`,
      status: `quá hạn ${Math.abs(daysUntilDue)} ngày`,
    };
  }
  return {
    key: `overdue_${Math.abs(daysUntilDue)}`,
    title: "Hóa đơn đã quá hạn",
    body: `${roomName}: còn ${amount}, quá hạn ${Math.abs(daysUntilDue)} ngày.`,
    status: `quá hạn ${Math.abs(daysUntilDue)} ngày`,
  };
};

export async function runPaymentReminders(today = vietnamDate()): Promise<ReminderRunSummary> {
  const summary: ReminderRunSummary = { checked: 0, delivered: 0, skipped: 0, failed: 0 };
  const earliest = new Date(`${today}T00:00:00Z`);
  earliest.setUTCDate(earliest.getUTCDate() - 14);
  const latest = new Date(`${today}T00:00:00Z`);
  latest.setUTCDate(latest.getUTCDate() + 3);

  const { data: invoices, error } = await supabaseAdmin
    .from("invoices")
    .select("id,user_id,room_id,month,year,total_amount,paid_amount,status,due_date,payment_code,rooms(name)")
    .not("due_date", "is", null)
    .gte("due_date", earliest.toISOString().slice(0, 10))
    .lte("due_date", latest.toISOString().slice(0, 10))
    .neq("status", "paid");
  if (error) throw new Error(error.message);

  for (const invoice of invoices || []) {
    summary.checked += 1;
    const total = Number(invoice.total_amount || 0);
    const paid = Number(invoice.paid_amount || 0);
    const amountDue = Math.max(0, total - paid);
    if (amountDue <= 0 || !invoice.due_date) {
      summary.skipped += 1;
      continue;
    }

    const daysUntilDue = dayDiff(String(invoice.due_date), today);
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("notifications_enabled,payment_reminder_enabled,reminder_days_before,reminder_days_after")
      .eq("user_id", invoice.user_id)
      .maybeSingle();
    if (prefs?.notifications_enabled === false || prefs?.payment_reminder_enabled === false) {
      summary.skipped += 1;
      continue;
    }

    const settings = await getOwnerReminderSettings(String(invoice.user_id));
    const milestones = reminderMilestones(
      settings.daysBefore,
      settings.daysAfter,
    );
    if (!milestones.has(daysUntilDue)) {
      summary.skipped += 1;
      continue;
    }

    const room = Array.isArray(invoice.rooms) ? invoice.rooms[0] : invoice.rooms;
    const copy = reminderCopy(daysUntilDue, room?.name || "Phòng thuê", amountDue);
    const tenantUserId = await getTenantUserIdByInvoiceId(String(invoice.id));
    if (!tenantUserId) {
      summary.skipped += 1;
      continue;
    }

    // Claim the reminder before delivery. A concurrent/retried cron run hits the
    // unique key and exits. Failed sends remove the claim so the next run can retry.
    const claim = await supabaseAdmin.from("payment_reminder_deliveries").insert({
      user_id: invoice.user_id,
      invoice_id: invoice.id,
      reminder_key: copy.key,
      channel: "both",
      amount_due: amountDue,
      metadata: { due_date: invoice.due_date, tenant_user_id: tenantUserId },
    }).select("id").single();
    if (claim.error) {
      if (claim.error.code === "23505") summary.skipped += 1;
      else summary.failed += 1;
      continue;
    }

    const delivery = await createNotification({
      userId: tenantUserId,
      title: copy.title,
      body: copy.body,
      type: "payment_reminder",
      data: {
        invoice_id: String(invoice.id),
        payment_code: String(invoice.payment_code || ""),
        amount_due: String(amountDue),
      },
      channel: "both",
    });
    if (!delivery.success) {
      await supabaseAdmin.from("payment_reminder_deliveries").delete().eq("id", claim.data.id);
      summary.failed += 1;
      continue;
    }
    const zalo = await sendPaymentReminderZalo({
      ownerId: String(invoice.user_id),
      invoiceId: String(invoice.id),
      reminderKey: copy.key,
      roomName: room?.name || "Phòng thuê",
      amountDue,
      dueDate: String(invoice.due_date),
      paymentCode: String(invoice.payment_code || ""),
      reminderStatus: copy.status,
    });
    await supabaseAdmin.from("payment_reminder_deliveries").update({
      metadata: {
        due_date: invoice.due_date,
        tenant_user_id: tenantUserId,
        in_app_push: "sent",
        zalo: zalo.status,
        zalo_reason: zalo.reason || null,
      },
    }).eq("id", claim.data.id);
    summary.delivered += 1;
  }

  return summary;
}
