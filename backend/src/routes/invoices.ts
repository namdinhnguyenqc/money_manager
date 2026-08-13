import { Hono } from "hono";
import { z } from "zod";
import crypto from "crypto";
import ExcelJS from "exceljs";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { parseJson, toId } from "../utils/validation.js";
import { env } from "../config/env.js";
import { applyInvoicePayment } from "../services/invoicePayments.js";
import { notifyOwnerPaymentReceived } from "../services/ownerPaymentNotifications.js";
import { getTenantUserIdByInvoiceId, notifyPaymentSuccess } from "../services/notificationService.js";
import { getTenantUserIdByContractId, notifyInvoiceCreated } from "../services/notificationService.js";
import { readMeterNumber } from "../services/meterOcr.js";
import { resolveInvoiceRoomFee } from "../utils/billing.js";
import { invalidateCache } from "../middleware/cache.js";


const invoicesRoutes = new Hono<AppEnv>();

invoicesRoutes.use("*", requireAuth);

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().nonnegative()
).optional();

const nullableNumber = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.coerce.number().nonnegative().nullable()
).optional();

const optionalString = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : String(value)),
  z.string()
).optional();

const nullableString = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : String(value)),
  z.string().nullable()
).optional();

const invoiceItemSchema = z.object({
  serviceId: nullableString,
  name: z.coerce.string().min(1),
  detail: optionalString,
  amount: z.coerce.number().nonnegative(),
  calculationType: optionalString,
  unitPrice: optionalNumber,
  quantity: optionalNumber,
  startReading: optionalNumber,
  endReading: optionalNumber,
  usageValue: optionalNumber,
  unit: optionalString,
  serviceSnapshot: z.any().optional(),
});

const createInvoiceSchema = z.object({
  roomId: optionalString,
  contractId: optionalString,
  paymentChannelId: nullableString,
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  roomFee: optionalNumber,
  previousDebt: z.coerce.number().nonnegative().optional(),
  items: z.array(invoiceItemSchema).optional(),
  elecOld: nullableNumber,
  elecNew: nullableNumber,
  waterOld: nullableNumber,
  waterNew: nullableNumber,
  invoiceNote: nullableString,
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const markPaidSchema = z.object({
  paidAmount: z.number().nonnegative(),
  transactionId: z.string().nullable().optional(),
});

const collectPaymentSchema = z.object({
  walletId: z.string().min(1),
  amount: z.number().nonnegative().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  method: z.string().optional(),
  note: z.string().optional(),
});

const bulkCollectPaymentSchema = z.object({
  invoiceIds: z.array(z.string().min(1)),
  walletId: z.string().min(1),
});

const resolveInvoiceDueDate = async (
  db: any,
  userId: string,
  month: number,
  year: number,
  explicitDueDate?: string,
) => {
  if (explicitDueDate) return explicitDueDate;
  const { data } = await db
    .from("system_settings")
    .select("value")
    .eq("user_id", userId)
    .eq("key", "invoice_due_day")
    .maybeSingle();
  const configuredDay = Number((data as any)?.value ?? 5);
  const day = Math.min(28, Math.max(1, Number.isInteger(configuredDay) ? configuredDay : 5));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const generatePaymentCode = () =>
  `${env.SEPAY_PAYMENT_PREFIX || "TCINV"}${crypto.randomBytes(5).toString("hex").toUpperCase()}`;

const loadDefaultPaymentChannel = async (db: any, userId: string) => {
  const { data } = await db
    .from("payment_channels")
    .select("*")
    .eq("user_id", userId)
    .eq("enabled", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data || null;
};

const ensureInvoicePaymentFields = async (db: any, invoice: any, userId: string) => {
  if (invoice.payment_code && invoice.payment_channel_id) return invoice;

  const defaultChannel = invoice.payment_channel_id ? null : await loadDefaultPaymentChannel(db, userId);
  const payload: Record<string, unknown> = {};
  if (!invoice.payment_code) payload.payment_code = generatePaymentCode();
  if (!invoice.payment_channel_id && defaultChannel?.id) payload.payment_channel_id = defaultChannel.id;

  if (Object.keys(payload).length === 0) return invoice;

  const { data } = await db
    .from("invoices")
    .update(payload)
    .eq("id", invoice.id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  return data || { ...invoice, ...payload };
};

const enrichPaymentFields = (invoice: any, channel?: any | null) => {
  const total = Number(invoice.total_amount || 0);
  const paid = Number(invoice.paid_amount || 0);
  const remaining = Math.max(0, total - paid);
  const now = new Date();
  const invoiceYear = Number(invoice.year || 0);
  const invoiceMonth = Number(invoice.month || 0);
  const isPastPeriod = invoiceYear < now.getFullYear() || (invoiceYear === now.getFullYear() && invoiceMonth < now.getMonth() + 1);
  // New invoices always have a due_date. Older records retain the historical
  // month-based behavior until they are edited, so a configuration change does
  // not retroactively alter their financial state.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
  const isOverdue = invoice.due_date
    ? today > String(invoice.due_date)
    : isPastPeriod;
  const displayStatus = isOverdue && total > 0 && paid < total ? "overdue" : invoice.status;
  return {
    ...invoice,
    status: displayStatus,
    paymentCode: invoice.payment_code ?? null,
    payment_code: invoice.payment_code ?? null,
    paymentChannelId: invoice.payment_channel_id ?? null,
    payment_channel_id: invoice.payment_channel_id ?? null,
    payment_channel: channel ? {
      id: channel.id,
      provider: channel.provider,
      displayName: channel.display_name,
      display_name: channel.display_name,
      bankId: channel.bank_id,
      bank_id: channel.bank_id,
      accountNo: channel.account_no,
      account_no: channel.account_no,
      accountName: channel.account_name,
      account_name: channel.account_name,
      walletId: channel.wallet_id,
      wallet_id: channel.wallet_id,
      autoReconcileEnabled: channel.auto_reconcile_enabled,
      auto_reconcile_enabled: channel.auto_reconcile_enabled,
    } : null,
    remainingAmount: remaining,
    remaining_amount: remaining,
  };
};

invoicesRoutes.get("/", async (c) => {
  const user = c.get("user");
  const monthRaw = c.req.query("month");
  const yearRaw = c.req.query("year");
  const yearFromRaw = c.req.query("yearFrom");
  const roomIdRaw = c.req.query("roomId");
  const statusRaw = c.req.query("status");
  const buildingId = c.req.query("buildingId");
  const includeOverdueCarryover = c.req.query("includeOverdueCarryover") === "true";



  const db = c.get("supabase");
  let buildingRoomIds: string[] | null = null;
  if (buildingId) {
    const roomsRes = await db.from("rooms").select("id").eq("boarding_house_id", buildingId).eq("user_id", user.id);
    if (roomsRes.error) return c.json({ error: roomsRes.error.message }, 500);
    buildingRoomIds = (roomsRes.data || []).map((r) => r.id);
    if (buildingRoomIds.length === 0) return c.json({ data: [] });
  }

  const applyCommonFilters = (source: any) => {
    let filteredQuery = source;
    if (roomIdRaw) filteredQuery = filteredQuery.eq("room_id", roomIdRaw);
    if (statusRaw) filteredQuery = filteredQuery.eq("status", String(statusRaw).toLowerCase());
    if (buildingRoomIds) filteredQuery = filteredQuery.in("room_id", buildingRoomIds);
    return filteredQuery;
  };

  let invoices: any[] = [];
  if (includeOverdueCarryover && monthRaw && yearRaw) {
    const selectedMonth = Number(monthRaw);
    const selectedYear = Number(yearRaw);

    // Keep filtering in Postgres. The previous implementation downloaded the
    // owner's complete invoice history before discarding most rows in JS.
    const currentPeriodQuery = applyCommonFilters(
      db.from("invoices").select("*").eq("user_id", user.id)
        .eq("month", selectedMonth).eq("year", selectedYear)
        .order("created_at", { ascending: false }),
    );
    const overdueQuery = applyCommonFilters(
      db.from("invoices").select("*").eq("user_id", user.id)
        .or(`year.lt.${selectedYear},and(year.eq.${selectedYear},month.lt.${selectedMonth})`)
        .neq("status", "paid")
        .order("year", { ascending: false }).order("month", { ascending: false }),
    );
    const [currentRes, overdueRes] = await Promise.all([currentPeriodQuery, overdueQuery]);
    if (currentRes.error) return c.json({ error: currentRes.error.message }, 500);
    if (overdueRes.error) return c.json({ error: overdueRes.error.message }, 500);

    const unpaidOverdue = (overdueRes.data || []).filter((inv: any) => {
      const total = Math.round(Number(inv.total_amount || 0));
      const paid = Math.round(Number(inv.paid_amount || 0));
      return total > 0 && paid < total;
    });
    invoices = [...(currentRes.data || []), ...unpaidOverdue];
  } else {
    let query = db.from("invoices").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (monthRaw) query = query.eq("month", Number(monthRaw));
    if (yearRaw) query = query.eq("year", Number(yearRaw));
    if (yearFromRaw) query = query.gte("year", Number(yearFromRaw));
    query = applyCommonFilters(query);
    const invRes = await query;
    if (invRes.error) return c.json({ error: invRes.error.message }, 500);
    invoices = invRes.data ?? [];
  }
  if (invoices.length === 0) return c.json({ data: [] });

  const contractIds = [...new Set(invoices.map((x) => x.contract_id))];
  const roomIds = [...new Set(invoices.map((x) => x.room_id))];
  const channelIds = [...new Set(invoices.map((x) => x.payment_channel_id).filter(Boolean))];
  const includeItems = c.req.query("includeItems") === "true";
  const invIds = invoices.map((i) => i.id);

  // These four lookups all derive from `invoices` alone, so run them together
  // instead of sequentially (cuts the request from ~5 round-trips down to 3 —
  // matters most on a high-latency / cold backend).
  const [contractsRes, roomsRes, channelsRes, itemsRes] = await Promise.all([
    db.from("contracts").select("*").in("id", contractIds),
    db.from("rooms").select("*").in("id", roomIds),
    channelIds.length > 0
      ? db.from("payment_channels").select("*").eq("user_id", user.id).in("id", channelIds)
      : Promise.resolve({ data: [], error: null }),
    includeItems
      ? db.from("invoice_items").select("*").in("invoice_id", invIds).eq("user_id", user.id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (contractsRes.error) return c.json({ error: contractsRes.error.message }, 500);
  if (roomsRes.error) return c.json({ error: roomsRes.error.message }, 500);
  if (channelsRes.error) return c.json({ error: channelsRes.error.message }, 500);

  const contracts = contractsRes.data ?? [];
  const rooms = roomsRes.data ?? [];
  const tenantIds = [...new Set(contracts.map((x) => x.tenant_id))];
  const tenantsRes = await db.from("tenants").select("*").in("id", tenantIds);
  if (tenantsRes.error) return c.json({ error: tenantsRes.error.message }, 500);
  const tenants = tenantsRes.data ?? [];
  const roomsById = new Map(rooms.map((room) => [String(room.id), room]));
  const contractsById = new Map(contracts.map((contract) => [String(contract.id), contract]));
  const tenantsById = new Map(tenants.map((tenant) => [String(tenant.id), tenant]));
  const channelsById = new Map((channelsRes.data ?? []).map((channel) => [String(channel.id), channel]));

  const itemsById: Map<string, any[]> = new Map();
  if (includeItems && !itemsRes.error && itemsRes.data) {
    itemsRes.data.forEach((item) => {
      const list = itemsById.get(String(item.invoice_id)) || [];
      list.push({
        id: item.id,
        name: item.name,
        detail: item.detail,
        amount: item.amount,
      });
      itemsById.set(String(item.invoice_id), list);
    });
  }

  const data = invoices
    .map((inv) => {
      const room = roomsById.get(String(inv.room_id));
      const contract = contractsById.get(String(inv.contract_id));
      const tenant = contract?.tenant_id ? tenantsById.get(String(contract.tenant_id)) : null;
      const baseResult = enrichPaymentFields({
        ...inv,
        roomId: inv.room_id,
        contractId: inv.contract_id,
        roomFee: inv.room_fee,
        totalAmount: inv.total_amount,
        paidAmount: inv.paid_amount,
        elecOld: inv.elec_old,
        elecNew: inv.elec_new,
        waterOld: inv.water_old,
        waterNew: inv.water_new,
        roomName: room?.name ?? "",
        room_name: room?.name ?? "",
        tenantName: tenant?.name ?? "",
        tenant_name: tenant?.name ?? "",
        tenantPhone: tenant?.phone ?? "",
        tenant_phone: tenant?.phone ?? "",
      }, inv.payment_channel_id ? channelsById.get(String(inv.payment_channel_id)) : null);

      if (includeItems) {
        baseResult.items = itemsById.get(String(inv.id)) || [];
      }
      return baseResult;
    })
    .sort((a, b) => String(a.room_name).localeCompare(String(b.room_name)));

  return c.json({ data });
});

invoicesRoutes.get("/export-excel", async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");

  const monthsRaw = c.req.query("months") || "";
  const buildingId = c.req.query("buildingId");

  if (!monthsRaw) {
    return c.json({ error: "Missing months parameter" }, 400);
  }

  const periods = monthsRaw.split(",").map((p) => {
    const [m, y] = p.split("/").map(Number);
    return { month: m, year: y };
  });

  let query = db.from("invoices").select("*").eq("user_id", user.id);
  if (buildingId) {
    const roomsRes = await db.from("rooms").select("id").eq("boarding_house_id", buildingId).eq("user_id", user.id);
    if (roomsRes.error) return c.json({ error: roomsRes.error.message }, 500);
    const roomIds = (roomsRes.data || []).map((r) => r.id);
    if (roomIds.length > 0) {
      query = query.in("room_id", roomIds);
    } else {
      query = query.in("room_id", ["00000000-0000-0000-0000-000000000000"]);
    }
  }

  const invRes = await query;
  if (invRes.error) return c.json({ error: invRes.error.message }, 500);
  let invoices = invRes.data || [];

  invoices = invoices.filter((inv) =>
    periods.some((p) => inv.month === p.month && inv.year === p.year)
  );

  const contractIds = [...new Set(invoices.map((x) => x.contract_id))];
  const roomIds = [...new Set(invoices.map((x) => x.room_id))];

  const [contractsRes, roomsRes] = await Promise.all([
    contractIds.length > 0 ? db.from("contracts").select("*").in("id", contractIds) : { data: [], error: null },
    roomIds.length > 0 ? db.from("rooms").select("*").in("id", roomIds) : { data: [], error: null },
  ]);

  if (contractsRes.error) return c.json({ error: contractsRes.error.message }, 500);
  if (roomsRes.error) return c.json({ error: roomsRes.error.message }, 500);

  const contracts = contractsRes.data ?? [];
  const rooms = roomsRes.data ?? [];
  const tenantIds = [...new Set(contracts.map((x) => x.tenant_id))];
  const tenantsRes = tenantIds.length > 0
    ? await db.from("tenants").select("*").in("id", tenantIds)
    : { data: [], error: null };
  if (tenantsRes.error) return c.json({ error: tenantsRes.error.message }, 500);
  const tenants = tenantsRes.data ?? [];

  const roomsById = new Map(rooms.map((room) => [String(room.id), room]));
  const contractsById = new Map(contracts.map((contract) => [String(contract.id), contract]));
  const tenantsById = new Map(tenants.map((tenant) => [String(tenant.id), tenant]));

  const invoiceIds = invoices.map((i) => i.id);
  const itemsRes = invoiceIds.length > 0
    ? await db.from("invoice_items").select("*").in("invoice_id", invoiceIds).eq("user_id", user.id)
    : { data: [], error: null };
  if (itemsRes.error) return c.json({ error: itemsRes.error.message }, 500);

  const itemsById: Map<string, any[]> = new Map();
  (itemsRes.data || []).forEach((item) => {
    const list = itemsById.get(String(item.invoice_id)) || [];
    list.push(item);
    itemsById.set(String(item.invoice_id), list);
  });

  const enrichedInvoices = invoices.map((inv) => {
    const room = roomsById.get(String(inv.room_id));
    const contract = contractsById.get(String(inv.contract_id));
    const tenant = contract?.tenant_id ? tenantsById.get(String(contract.tenant_id)) : null;
    return {
      ...inv,
      roomName: room?.name ?? "",
      tenantName: tenant?.name ?? "",
      items: itemsById.get(String(inv.id)) || [],
    };
  });

  const groupedInvoices: Record<string, any[]> = {};
  enrichedInvoices.forEach((inv) => {
    const key = `${inv.month}/${inv.year}`;
    groupedInvoices[key] = groupedInvoices[key] || [];
    groupedInvoices[key].push(inv);
  });

  const workbook = new ExcelJS.Workbook();

  for (const period of periods) {
    const sheetName = `Tháng ${period.month}-${period.year}`;
    const periodInvoices = groupedInvoices[`${period.month}/${period.year}`] || [];
    periodInvoices.sort((a, b) => String(a.roomName || "").localeCompare(String(b.roomName || ""), undefined, { numeric: true }));

    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }]
    });

    worksheet.columns = [
      { key: "room", width: 12 },
      { key: "elecOld", width: 10 },
      { key: "elecNew", width: 10 },
      { key: "elecUsage", width: 12 },
      { key: "waterOld", width: 10 },
      { key: "waterNew", width: 10 },
      { key: "waterUsage", width: 12 },
      { key: "elecAmt", width: 16 },
      { key: "waterAmt", width: 16 },
      { key: "roomFee", width: 16 },
      { key: "trashAmt", width: 12 },
      { key: "wifiAmt", width: 12 },
      { key: "otherAmt", width: 12 },
      { key: "debtAmt", width: 16 },
      { key: "totalAmt", width: 18 },
      { key: "tenantName", width: 22 },
      { key: "status", width: 18 },
    ];

    const blueHeaderFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF85B3F4" }
    };

    const lightGreenFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFA9D08E" }
    };

    const yellowFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFE699" }
    };

    const lightBlueFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2EFDA" }
    };

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FFBFBFBF" } },
      left: { style: "thin", color: { argb: "FFBFBFBF" } },
      bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
      right: { style: "thin", color: { argb: "FFBFBFBF" } },
    };

    const textCenter: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "center", wrapText: true };
    const textLeft: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "left" };
    const textRight: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "right" };

    worksheet.addRow([]);
    worksheet.getRow(1).height = 15;

    worksheet.mergeCells("A2:Q2");
    const titleCell = worksheet.getCell("A2");
    titleCell.value = `Tháng ${period.month}/${period.year}`;
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF000000" } };
    titleCell.alignment = textCenter;
    titleCell.fill = blueHeaderFill;
    worksheet.getRow(2).height = 30;

    const indexRowValues = Array.from({ length: 17 }, (_, i) => i + 1);
    const indexRow = worksheet.addRow(indexRowValues);
    indexRow.height = 20;
    indexRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true };
      cell.alignment = textCenter;
      cell.fill = lightBlueFill;
      cell.border = borderStyle;
    });

    const row4 = worksheet.getRow(4);
    const row5 = worksheet.getRow(5);
    row4.height = 24;
    row5.height = 24;

    const headers = [
      { col: "A", text: "Phòng", merge: "A4:A5" },
      { col: "B", text: "Số điện", merge: "B4:C4" },
      { col: "D", text: "Điện tiêu thụ", merge: "D4:D5" },
      { col: "E", text: "Số nước", merge: "E4:F4" },
      { col: "G", text: "Nước tiêu thụ", merge: "G4:G5" },
      { col: "H", text: "Tiền điện\n(KWh)", merge: "H4:H5", fill: yellowFill },
      { col: "I", text: "Tiền nước\n(Khối)", merge: "I4:I5", fill: yellowFill },
      { col: "J", text: "Tiền phòng", merge: "J4:J5", fill: yellowFill },
      { col: "K", text: "Rác", merge: "K4:K5", fill: yellowFill },
      { col: "L", text: "Wifi", merge: "L4:L5", fill: yellowFill },
      { col: "M", text: "Khác", merge: "M4:M5", fill: yellowFill },
      { col: "N", text: "Công nợ", merge: "N4:N5", fill: yellowFill },
      { col: "O", text: "Tổng cộng", merge: "O4:O5", fill: yellowFill },
      { col: "P", text: "Họ & Tên", merge: "P4:P5" },
      { col: "Q", text: "Trạng thái", merge: "Q4:Q5" },
    ];

    worksheet.getCell("B5").value = "Số cũ";
    worksheet.getCell("C5").value = "Số mới";
    worksheet.getCell("E5").value = "Số cũ";
    worksheet.getCell("F5").value = "Số mới";

    headers.forEach((h) => {
      const cell = worksheet.getCell(`${h.col}4`);
      cell.value = h.text;
      worksheet.mergeCells(h.merge);
    });

    for (let r = 4; r <= 5; r++) {
      const row = worksheet.getRow(r);
      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Arial", size: 10, bold: true };
        cell.alignment = textCenter;
        cell.border = borderStyle;

        if (colNumber >= 8 && colNumber <= 15) {
          cell.fill = yellowFill;
        } else {
          cell.fill = lightGreenFill;
        }
      });
    }

    periodInvoices.forEach((inv) => {
      const items = inv.items || [];
      const dienOld = inv.elec_old ?? 0;
      const dienNew = inv.elec_new ?? 0;
      const waterOld = inv.water_old ?? 0;
      const waterNew = inv.water_new ?? 0;

      let tienDien = 0;
      let tienNuoc = 0;
      let tienRac = 0;
      let tienWifi = 0;
      let tienKhac = 0;

      items.forEach((item: any) => {
        const nameNorm = normalizeServiceName(item.name);
        const amt = Number(item.amount || 0);
        if (nameNorm.includes("dien") || nameNorm.includes("electric")) {
          tienDien += amt;
        } else if (nameNorm.includes("nuoc") || nameNorm.includes("water")) {
          tienNuoc += amt;
        } else if (nameNorm.includes("rac") || nameNorm.includes("trash")) {
          tienRac += amt;
        } else if (nameNorm.includes("wifi") || nameNorm.includes("internet") || nameNorm.includes("mang")) {
          tienWifi += amt;
        } else {
          tienKhac += amt;
        }
      });

      const statusRaw = String(inv.status || "").toLowerCase();
      const statusText = statusRaw === "paid" ? "Đã thanh toán" : "Chưa thanh toán";

      const dataRow = worksheet.addRow([
        inv.roomName || "",
        dienOld,
        dienNew,
        Math.max(0, dienNew - dienOld),
        waterOld,
        waterNew,
        Math.max(0, waterNew - waterOld),
        tienDien,
        tienNuoc,
        inv.room_fee ?? 0,
        tienRac,
        tienWifi,
        tienKhac,
        inv.previous_debt ?? 0,
        inv.total_amount ?? 0,
        inv.tenantName || "",
        statusText
      ]);

      dataRow.height = 22;
      dataRow.eachCell((cell, colNumber) => {
        cell.font = { name: "Arial", size: 10 };
        cell.border = borderStyle;

        if (colNumber === 1 || colNumber === 16 || colNumber === 17) {
          cell.alignment = colNumber === 16 ? textLeft : textCenter;
        } else {
          cell.alignment = textRight;
          if (colNumber >= 8 && colNumber <= 15) {
            cell.numFmt = `#,##0" ₫"`;
          } else {
            cell.numFmt = `#,##0`;
          }
        }

        if (colNumber === 1) {
          cell.font = { name: "Arial", size: 10, bold: true };
        }
        if (colNumber === 15) {
          cell.font = { name: "Arial", size: 10, bold: true };
          cell.fill = yellowFill;
        }
      });
    });

    const lastDataRow = worksheet.lastRow ? worksheet.lastRow.number : 5;
    if (lastDataRow >= 6) {
      const summaryRow = worksheet.addRow([]);
      summaryRow.height = 24;

      for (let c = 1; c <= 17; c++) {
        const cell = summaryRow.getCell(c);
        cell.fill = lightGreenFill;
        cell.border = borderStyle;
        cell.font = { name: "Arial", size: 10, bold: true };
        cell.alignment = c === 1 || c === 16 || c === 17 ? textCenter : textRight;

        if (c === 1) {
          cell.value = "Tổng";
        } else if (c === 4) {
          cell.value = { formula: `SUM(D6:D${lastDataRow})` };
          cell.numFmt = `#,##0`;
        } else if (c === 7) {
          cell.value = { formula: `SUM(G6:G${lastDataRow})` };
          cell.numFmt = `#,##0`;
        } else if (c >= 8 && c <= 15) {
          const colLetter = String.fromCharCode(64 + c);
          cell.value = { formula: `SUM(${colLetter}6:${colLetter}${lastDataRow})` };
          cell.numFmt = `#,##0" ₫"`;
        }
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  c.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  
  const label = periods.length === 1 
    ? `Thang_${periods[0].month}_${periods[0].year}` 
    : `Bao_cao_nhieu_thang`;
  c.header("Content-Disposition", `attachment; filename=Danh_Sach_Hoa_Don_${label}.xlsx`);

  return c.body(buffer as any);
});

const normalizeServiceName = (value: unknown) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

const buildInvoiceItemsFromServices = (
  services: any[],
  contract: any,
  readings: {
    elecOld: number | null;
    elecNew: number | null;
    waterOld: number | null;
    waterNew: number | null;
  }
) => {
  const occupantCount = Number(contract.occupant_count ?? contract.num_people ?? 1) || 1;
  const hasAc = Boolean(contract.has_ac);

  return services.flatMap((service) => {
    const name = String(service.name || "");
    const type = String(service.type || "");
    const normalizedName = normalizeServiceName(name);
    const isElectricity = normalizedName.includes("dien") || normalizedName.includes("electric");
    const isWater = normalizedName.includes("nuoc") || normalizedName.includes("water");
    const unitPrice = Number(service.unit_price || 0);
    const acUnitPrice = Number(service.unit_price_ac || 0);
    const appliedUnitPrice = isElectricity && hasAc && acUnitPrice > 0 ? acUnitPrice : unitPrice;

    if (type === "fixed") {
      return [{
        name,
        detail: `${unitPrice.toLocaleString("vi-VN")}d cố định`,
        amount: unitPrice,
        serviceId: service.id,
        calculationType: type,
        unitPrice,
        quantity: 1,
        unit: service.unit ?? null,
        serviceSnapshot: service,
      }];
    }

    if (type === "per_person" || (isWater && type !== "metered" && type !== "meter")) {
      return [{
        name,
        detail: `${unitPrice.toLocaleString("vi-VN")}d x ${occupantCount} người`,
        amount: unitPrice * occupantCount,
        serviceId: service.id,
        calculationType: type || "per_person",
        unitPrice,
        quantity: occupantCount,
        unit: service.unit ?? null,
        serviceSnapshot: service,
      }];
    }

    if (type === "metered" || type === "meter") {
      const startReading = isElectricity ? readings.elecOld : isWater ? readings.waterOld : null;
      const endReading = isElectricity ? readings.elecNew : isWater ? readings.waterNew : null;
      if (startReading === null || endReading === null || endReading <= 0) return [];
      if (endReading < startReading) {
        throw new Error(`${name}: chỉ số mới (${endReading}) không được nhỏ hơn chỉ số cũ (${startReading}).`);
      }

      const usageValue = endReading - startReading;
      return [{
        name,
        detail: `${startReading} -> ${endReading} = ${usageValue}${service.unit || ""} x ${appliedUnitPrice.toLocaleString("vi-VN")}d`,
        amount: usageValue * appliedUnitPrice,
        serviceId: service.id,
        calculationType: type,
        unitPrice: appliedUnitPrice,
        quantity: usageValue,
        startReading,
        endReading,
        usageValue,
        unit: service.unit ?? null,
        serviceSnapshot: service,
      }];
    }

    return [];
  });
};

invoicesRoutes.post("/", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, createInvoiceSchema);
  if (!parsed.ok) return parsed.response;

  const db = c.get("supabase");
  if (!parsed.data.contractId && !parsed.data.roomId) {
    return c.json({ error: "Missing contractId or roomId" }, 400);
  }

  let contractQuery = db.from("contracts").select("*").eq("user_id", user.id);
  contractQuery = parsed.data.contractId
    ? contractQuery.eq("id", parsed.data.contractId)
    : contractQuery.eq("room_id", parsed.data.roomId).eq("status", "active");

  const contractRes = await contractQuery.maybeSingle();
  if (contractRes.error) return c.json({ error: contractRes.error.message }, 400);
  if (!contractRes.data) return c.json({ error: "Contract not found" }, 404);

  const contract = contractRes.data;
  const contractId = String(contract.id);
  const roomId = parsed.data.roomId ?? contract.room_id;
  if (!roomId) return c.json({ error: "Missing roomId" }, 400);

  const roomRes = await db.from("rooms").select("*").eq("id", roomId).eq("user_id", user.id).maybeSingle();
  if (roomRes.error) return c.json({ error: roomRes.error.message }, 400);

  let elecOld = parsed.data.elecOld ?? null;
  let waterOld = parsed.data.waterOld ?? null;
  if (elecOld === null || waterOld === null) {
    const lastInvoiceRes = await db
      .from("invoices")
      .select("elec_new,water_new")
      .eq("room_id", roomId)
      .eq("contract_id", contractId)
      .eq("user_id", user.id)
      .or("elec_new.not.is.null,water_new.not.is.null")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastInvoiceRes.error) return c.json({ error: lastInvoiceRes.error.message }, 400);
    elecOld = elecOld ?? Number(lastInvoiceRes.data?.elec_new ?? contract.electric_start ?? 0);
    waterOld = waterOld ?? Number(lastInvoiceRes.data?.water_new ?? contract.water_start ?? 0);
  }

  let items = parsed.data.items;
  if (items === undefined) {
    const csRes = await db.from("contract_services").select("service_id").eq("contract_id", contractId);
    if (csRes.error) return c.json({ error: csRes.error.message }, 400);

    const serviceIds = (csRes.data ?? []).map((x) => x.service_id).filter(Boolean);
    if (serviceIds.length > 0) {
      const servicesRes = await db.from("services").select("*").eq("user_id", user.id).in("id", serviceIds);
      if (servicesRes.error) return c.json({ error: servicesRes.error.message }, 400);
      const serviceMap = new Map((servicesRes.data ?? []).map((service) => [String(service.id), service]));
      const services = serviceIds.map((id) => serviceMap.get(String(id))).filter(Boolean);
      try {
        items = buildInvoiceItemsFromServices(services, { ...contract, ...roomRes.data }, {
          elecOld,
          elecNew: parsed.data.elecNew ?? null,
          waterOld,
          waterNew: parsed.data.waterNew ?? null,
        });
      } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Invalid meter readings" }, 400);
      }
    } else {
      items = [];
    }
  }

  const monthlyRent = Number(contract.rent_amount ?? roomRes.data?.price ?? 0);
  const roomFee = resolveInvoiceRoomFee({
    requestedRoomFee: parsed.data.roomFee,
    monthlyRent,
    contractStartDate: contract.start_date,
    month: parsed.data.month,
    year: parsed.data.year,
  });
  const previousDebt = parsed.data.previousDebt ?? 0;
  const serviceFees = items.reduce((sum, item) => sum + item.amount, 0);
  const total = roomFee + serviceFees + previousDebt;

  const existingInvoiceRes = await db
    .from("invoices")
    .select("*")
    .eq("room_id", roomId)
    .eq("contract_id", contractId)
    .eq("month", parsed.data.month)
    .eq("year", parsed.data.year)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingInvoiceRes.error) return c.json({ error: existingInvoiceRes.error.message }, 400);
  if (existingInvoiceRes.data) {
    return c.json({ error: "Invoice already exists for this room and billing period", data: existingInvoiceRes.data }, 409);
  }

  const paymentChannel = parsed.data.paymentChannelId
    ? (await db.from("payment_channels").select("*").eq("id", parsed.data.paymentChannelId).eq("user_id", user.id).maybeSingle()).data
    : await loadDefaultPaymentChannel(db, user.id);
  const dueDate = await resolveInvoiceDueDate(db, user.id, parsed.data.month, parsed.data.year, parsed.data.dueDate);

  const invRes = await db
    .from("invoices")
    .insert({
      user_id: user.id,
      room_id: roomId,
      contract_id: contractId,
      month: parsed.data.month,
      year: parsed.data.year,
      room_fee: roomFee,
      total_amount: total,
      previous_debt: previousDebt,
      elec_old: elecOld,
      elec_new: parsed.data.elecNew ?? null,
      water_old: waterOld,
      water_new: parsed.data.waterNew ?? null,
      note: parsed.data.invoiceNote ?? null,
      due_date: dueDate,
      payment_code: generatePaymentCode(),
      payment_channel_id: paymentChannel?.id || null,
    })
    .select("*")
    .single();

  if (invRes.error) return c.json({ error: invRes.error.message }, 400);

  const invoiceId = invRes.data.id;
  if (items.length > 0) {
    const rows = items.map((item) => ({
      user_id: user.id,
      invoice_id: invoiceId,
      service_id: item.serviceId ?? null,
      name: item.name,
      detail: item.detail ?? "",
      amount: item.amount,
      calculation_type: item.calculationType ?? null,
      unit_price: item.unitPrice ?? null,
      quantity: item.quantity ?? null,
      start_reading: item.startReading ?? null,
      end_reading: item.endReading ?? null,
      usage_value: item.usageValue ?? null,
      unit: item.unit ?? null,
      service_snapshot: item.serviceSnapshot ?? null,
    }));
    const itemRes = await db.from("invoice_items").insert(rows);
    if (itemRes.error) return c.json({ error: itemRes.error.message }, 400);
  }

  // Notify tenant asynchronously (non-blocking)
  getTenantUserIdByContractId(contractId).then((tenantUserId) => {
    if (tenantUserId) {
      notifyInvoiceCreated(tenantUserId, invRes.data).catch((err) => {
        console.error("Failed to send invoice notification to tenant:", err);
      });
    }
  }).catch((err) => {
    console.error("Failed to fetch tenant user ID for invoice notification:", err);
  });

  return c.json({ data: enrichPaymentFields(invRes.data, paymentChannel) }, 201);
});

invoicesRoutes.get("/history/:contractId", async (c) => {
  const user = c.get("user");
  const contractId = toId(c.req.param("contractId"));
  if (!contractId) return c.json({ error: "Invalid contract id" }, 400);



  const db = c.get("supabase");
  const { data, error } = await db
    .from("invoices")
    .select("id, room_id, contract_id, month, year, room_fee, total_amount, paid_amount, previous_debt, status, elec_old, elec_new, water_old, water_new, transaction_id, payment_code, payment_channel_id, created_at, updated_at")
    .eq("contract_id", contractId)
    .eq("user_id", user.id)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: (data ?? []).map((invoice) => enrichPaymentFields(invoice)) });
});

invoicesRoutes.get("/previous-debt", async (c) => {
  const user = c.get("user");
  const roomIdRaw = c.req.query("roomId");
  const month = Number(c.req.query("month"));
  const year = Number(c.req.query("year"));

  if (!roomIdRaw) return c.json({ error: "Missing roomId" }, 400);
  const roomId = roomIdRaw;
  if (!Number.isInteger(month) || month < 1 || month > 12) return c.json({ error: "Invalid month" }, 400);
  if (!Number.isInteger(year) || year < 2000) return c.json({ error: "Invalid year" }, 400);

  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }



  const db = c.get("supabase");
  
  // Try to find the active contract for this room to ensure we only get debt for the current tenant
  const { data: activeContract } = await db
    .from("contracts")
    .select("id")
    .eq("room_id", roomId)
    .eq("status", "active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!activeContract) return c.json({ data: 0 });

  const { data, error } = await db
    .from("invoices")
    .select("total_amount,paid_amount")
    .eq("room_id", roomId)
    .eq("contract_id", activeContract.id) // Only debt for the SAME contract
    .eq("month", prevMonth)
    .eq("year", prevYear)
    .eq("user_id", user.id)
    .neq("status", "paid")
    .limit(1)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ data: 0 });

  const debt = Number(data.total_amount || 0) - Number(data.paid_amount || 0);
  return c.json({ data: debt > 0 ? debt : 0 });
});

// ── POST /ocr-meter-readings — free, self-hosted OCR for meter-photo batches ──
// Accepts a batch of base64 photos, reads a digit sequence off each one.
// Results are suggestions only (see meterOcr.ts) — the owner must confirm/
// edit the number and which room it belongs to before it's used for billing.
const ocrMeterSchema = z.object({
  images: z.array(z.object({
    id: z.string().min(1), // caller-assigned id (e.g. filename) to correlate results back
    dataUrl: z.string().min(1), // base64 data URI
  })).min(1).max(60),
});

invoicesRoutes.post("/ocr-meter-readings", async (c) => {
  const parsed = await c.req.json().catch(() => ({}));
  const body = ocrMeterSchema.safeParse(parsed);
  if (!body.success) return c.json({ error: "Dữ liệu ảnh không hợp lệ", details: body.error.format() }, 400);

  const totalEncodedBytes = body.data.images.reduce((sum, image) => sum + image.dataUrl.length, 0);
  if (totalEncodedBytes > 24 * 1024 * 1024) {
    return c.json({ error: "Tổng dung lượng ảnh quá lớn. Vui lòng gửi từng nhóm nhỏ." }, 413);
  }

  const results = await Promise.all(
    body.data.images.map(async ({ id, dataUrl }) => {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return { id, number: null, rawText: "", confidence: 0, error: "Ảnh không đúng định dạng" };
      if (!match[1].startsWith("image/") || match[2].length > 8 * 1024 * 1024) {
        return { id, number: null, rawText: "", confidence: 0, error: "Ảnh không hợp lệ hoặc vượt quá 6 MB" };
      }
      try {
        const buffer = Buffer.from(match[2], "base64");
        const { rawText, number, confidence } = await readMeterNumber(buffer);
        return { id, number, rawText, confidence };
      } catch (e: any) {
        console.error(`OCR failed for image ${id}:`, e);
        return { id, number: null, rawText: "", confidence: 0, error: "Không đọc được ảnh" };
      }
    })
  );

  return c.json({ data: results });
});

invoicesRoutes.get("/latest-meter-readings", async (c) => {
  const user = c.get("user");
  const roomIdRaw = c.req.query("roomId");
  if (!roomIdRaw) return c.json({ error: "Missing roomId" }, 400);
  const roomId = roomIdRaw;



  const db = c.get("supabase");

  // Get active contract first
  const { data: activeContract } = await db
    .from("contracts")
    .select("id, electric_start, water_start")
    .eq("room_id", roomId)
    .eq("status", "active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!activeContract) return c.json({ data: { elec_old: 0, water_old: 0 } });

  const { data, error } = await db
    .from("invoices")
    .select("elec_new,water_new")
    .eq("room_id", roomId)
    .eq("contract_id", activeContract.id) // Only look at invoices for THIS contract
    .eq("user_id", user.id)
    .or("elec_new.not.is.null,water_new.not.is.null")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);

  if (!data) {
    return c.json({
      data: {
        elec_old: Number(activeContract.electric_start || 0),
        water_old: Number(activeContract.water_start || 0),
      },
    });
  }

  return c.json({
    data: {
      elec_old: Number(data.elec_new || 0),
      water_old: Number(data.water_new || 0),
    },
  });
});

invoicesRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid invoice id" }, 400);



  const db = c.get("supabase");
  const invRes = await db.from("invoices").select("*").eq("id", id).eq("user_id", user.id).single();
  if (invRes.error) return c.json({ error: invRes.error.message }, 404);

  const invoice = await ensureInvoicePaymentFields(db, invRes.data, user.id);

  const [itemsRes, roomRes, contractRes] = await Promise.all([
    db.from("invoice_items").select("*").eq("invoice_id", id).eq("user_id", user.id),
    db.from("rooms").select("*").eq("id", invoice.room_id).eq("user_id", user.id).maybeSingle(),
    db.from("contracts").select("*").eq("id", invoice.contract_id).eq("user_id", user.id).maybeSingle(),
  ]);

  if (itemsRes.error) return c.json({ error: itemsRes.error.message }, 500);
  if (roomRes.error) return c.json({ error: roomRes.error.message }, 500);
  if (contractRes.error) return c.json({ error: contractRes.error.message }, 500);

  let tenant = null;
  if (contractRes.data?.tenant_id) {
    const tenantRes = await db.from("tenants").select("*").eq("id", contractRes.data.tenant_id).eq("user_id", user.id).maybeSingle();
    if (tenantRes.error) return c.json({ error: tenantRes.error.message }, 500);
    tenant = tenantRes.data;
  }

  const formattedItems = (itemsRes.data ?? []).map(item => ({
    ...item,
    serviceId: item.service_id,
    calculationType: item.calculation_type,
    unitPrice: item.unit_price,
    startReading: item.start_reading,
    endReading: item.end_reading,
    usageValue: item.usage_value,
    serviceSnapshot: item.service_snapshot,
  }));

  let paymentChannel = null;
  if (invoice.payment_channel_id) {
    const channelRes = await db
      .from("payment_channels")
      .select("*")
      .eq("id", invoice.payment_channel_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (channelRes.error) return c.json({ error: channelRes.error.message }, 500);
    paymentChannel = channelRes.data;
  }

  return c.json({
    data: enrichPaymentFields({
      ...invoice,
      roomId: invoice.room_id,
      contractId: invoice.contract_id,
      roomFee: invoice.room_fee,
      totalAmount: invoice.total_amount,
      paidAmount: invoice.paid_amount,
      elecOld: invoice.elec_old,
      elecNew: invoice.elec_new,
      waterOld: invoice.water_old,
      waterNew: invoice.water_new,
      roomName: roomRes.data?.name ?? "",
      room_name: roomRes.data?.name ?? "",
      contractPrice: roomRes.data?.price ?? 0,
      contract_price: roomRes.data?.price ?? 0,
      tenantName: tenant?.name ?? "",
      tenant_name: tenant?.name ?? "",
      tenantPhone: tenant?.phone ?? "",
      tenant_phone: tenant?.phone ?? "",
      items: formattedItems,
    }, paymentChannel),
  });
});

invoicesRoutes.post("/:id/mark-paid", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid invoice id" }, 400);

  const parsed = await parseJson(c, markPaidSchema);
  if (!parsed.ok) return parsed.response;



  const db = c.get("supabase");
  const invRes = await db
    .from("invoices")
    .select("paid_amount, total_amount")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (invRes.error || !invRes.data) return c.json({ error: "Invoice not found" }, 404);

  const currentPaid = Number(invRes.data.paid_amount || 0);
  const total = Number(invRes.data.total_amount || 0);
  const newPayment = Number(parsed.data.paidAmount || 0);
  const totalPaid = currentPaid + newPayment;
  const newStatus = totalPaid >= total ? "paid" : (totalPaid > 0 ? "partial" : "unpaid");

  const { data, error } = await db
    .from("invoices")
    .update({
      paid_amount: totalPaid,
      status: newStatus,
      transaction_id: parsed.data.transactionId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

invoicesRoutes.post("/:id/collect-payment", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid invoice id" }, 400);

  const parsed = await parseJson(c, collectPaymentSchema);
  if (!parsed.ok) return parsed.response;

  const db = c.get("supabase");
  const invRes = await db
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (invRes.error || !invRes.data) return c.json({ error: "Invoice not found" }, 404);

  const invoice = invRes.data;
  const dueAmount = Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
  const collectAmount = Number(parsed.data.amount ?? dueAmount);
  const roomRes = await db.from("rooms").select("name").eq("id", invoice.room_id).eq("user_id", user.id).maybeSingle();
  const paymentRes = await applyInvoicePayment(db, {
    invoice,
    amount: collectAmount,
    walletId: parsed.data.walletId,
    source: parsed.data.method === "cash" ? "cash" : parsed.data.method === "bank_transfer" ? "bank_transfer" : "manual",
    date: parsed.data.date,
    note: parsed.data.note,
    roomName: roomRes.data?.name || null,
  });

  if (paymentRes.error || !paymentRes.data) return c.json({ error: paymentRes.error || "Failed to collect payment" }, 400);
  if (!paymentRes.data.idempotent) {
    await notifyOwnerPaymentReceived(
      String(user.id),
      invoice,
      roomRes.data?.name || null,
      collectAmount,
      paymentRes.data.status,
    );
    const tenantUserId = await getTenantUserIdByInvoiceId(invoice.id);
    if (tenantUserId) {
      await notifyPaymentSuccess(tenantUserId, invoice, collectAmount);
    }
  }
  invalidateCache("/owner/dashboard-init", user.id);
  invalidateCache("/owner/cashflow-summary", user.id);
  return c.json({ data: { invoice: paymentRes.data.invoice, transaction: paymentRes.data.transaction } });
});

invoicesRoutes.post("/bulk-collect-payment", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, bulkCollectPaymentSchema);
  if (!parsed.ok) return parsed.response;

  const { invoiceIds, walletId } = parsed.data;
  const db = c.get("supabase");

  if (invoiceIds.length === 0) {
    return c.json({ data: [] });
  }

  // Fetch all invoices
  const { data: invoices, error: fetchError } = await db
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .in("id", invoiceIds);

  if (fetchError) return c.json({ error: fetchError.message }, 500);
  if (!invoices || invoices.length === 0) {
    return c.json({ error: "Không tìm thấy hóa đơn nào." }, 404);
  }

  const roomIds = [...new Set(invoices.map((inv) => inv.room_id))];
  const { data: rooms } = await db
    .from("rooms")
    .select("id, name")
    .eq("user_id", user.id)
    .in("id", roomIds);
  const roomMap = new Map(rooms?.map((r) => [r.id, r.name]) ?? []);

  const results: any[] = [];
  let totalCollected = 0;

  for (const invoice of invoices) {
    const total = Number(invoice.total_amount || 0);
    const currentPaid = Number(invoice.paid_amount || 0);
    const dueAmount = Math.max(0, total - currentPaid);

    if (dueAmount <= 0) {
      results.push({ invoiceId: invoice.id, status: "already_paid", amount: 0 });
      continue;
    }

    const paymentRes = await applyInvoicePayment(db, {
      invoice,
      amount: dueAmount,
      walletId,
      source: "manual",
      note: "Thanh toán hàng loạt",
      roomName: roomMap.get(invoice.room_id) ?? invoice.room_id,
    });

    if (paymentRes.error || !paymentRes.data) {
      results.push({ invoiceId: invoice.id, status: "error", error: paymentRes.error || "Failed to collect payment" });
      continue;
    }

    totalCollected += dueAmount;
    if (!paymentRes.data.idempotent) {
      await notifyOwnerPaymentReceived(
        String(user.id),
        invoice,
        roomMap.get(invoice.room_id) ?? null,
        dueAmount,
        paymentRes.data.status,
      );
      const tenantUserId = await getTenantUserIdByInvoiceId(invoice.id);
      if (tenantUserId) {
        await notifyPaymentSuccess(tenantUserId, invoice, dueAmount);
      }
    }
    results.push({ invoiceId: invoice.id, status: "success", amount: dueAmount, transactionId: paymentRes.data.transaction.id });
  }

  invalidateCache("/owner/dashboard-init", user.id);
  invalidateCache("/owner/cashflow-summary", user.id);
  return c.json({ data: results, totalCollected });
});

invoicesRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid invoice id" }, 400);



  const db = c.get("supabase");
  const invRes = await db
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (invRes.error) return c.json({ error: invRes.error.message }, 404);

  const transactionId = invRes.data.transaction_id;
  await db.from("invoice_items").delete().eq("invoice_id", id).eq("user_id", user.id);
  const delInv = await db.from("invoices").delete().eq("id", id).eq("user_id", user.id);
  if (delInv.error) return c.json({ error: delInv.error.message }, 400);

  if (transactionId) {
    await db.from("transactions").delete().eq("id", transactionId).eq("user_id", user.id);
  }

  return c.json({ ok: true });
});

invoicesRoutes.post("/auto-generate", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const month = Number(body.month);
  const year = Number(body.year);
  const facilityId = body.facilityId;

  if (!month || !year) return c.json({ error: "Missing month or year" }, 400);

  const db = c.get("supabase");

  // 1. Lấy tất cả các phòng đang có khách thuê (occupied) của user này
  let roomsQuery = db
    .from("rooms")
    .select("id, name, boarding_house_id, price, has_ac, status")
    .eq("user_id", user.id)
    .eq("status", "occupied");

  if (facilityId) {
    roomsQuery = roomsQuery.eq("boarding_house_id", facilityId);
  }

  const roomsRes = await roomsQuery;
  if (roomsRes.error) return c.json({ error: roomsRes.error.message }, 500);

  const rooms = roomsRes.data || [];
  if (rooms.length === 0) return c.json({ created: 0, skipped: 0, message: "Không có phòng nào đang được thuê." });

  // 2. Lấy các hóa đơn đã tồn tại trong kỳ này
  const existingInvoicesRes = await db
    .from("invoices")
    .select("room_id")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year);
  
  if (existingInvoicesRes.error) return c.json({ error: existingInvoicesRes.error.message }, 500);
  const existingRoomIds = new Set((existingInvoicesRes.data || []).map(inv => inv.room_id));

  // 3. Lọc ra các phòng chưa có hóa đơn
  const pendingRooms = rooms.filter(r => !existingRoomIds.has(r.id));
  if (pendingRooms.length === 0) return c.json({ created: 0, skipped: rooms.length, message: "Tất cả các phòng đã có hóa đơn." });

  // 4. Lấy hợp đồng active cho các phòng này
  const pendingRoomIds = pendingRooms.map(r => r.id);
  const contractsRes = await db
    .from("contracts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("room_id", pendingRoomIds);

  if (contractsRes.error) return c.json({ error: contractsRes.error.message }, 500);
  const contracts = contractsRes.data || [];
  const roomToContract = new Map(contracts.map(c => [c.room_id, c]));
  const defaultDueDate = await resolveInvoiceDueDate(db, user.id, month, year);

  let createdCount = 0;

  for (const room of pendingRooms) {
    const contract = roomToContract.get(room.id);
    if (!contract) continue;

    try {
      const contractId = String(contract.id);
      
      const lastInvoiceRes = await db
        .from("invoices")
        .select("elec_new,water_new")
        .eq("room_id", room.id)
        .eq("contract_id", contractId)
        .eq("user_id", user.id)
        .or("elec_new.not.is.null,water_new.not.is.null")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle();

      const elecOld = Number(lastInvoiceRes.data?.elec_new ?? contract.electric_start ?? 0);
      const waterOld = Number(lastInvoiceRes.data?.water_new ?? contract.water_start ?? 0);

      const csRes = await db.from("contract_services").select("service_id").eq("contract_id", contractId);
      let items: any[] = [];
      
      if (!csRes.error && csRes.data && csRes.data.length > 0) {
        const serviceIds = csRes.data.map((x: any) => x.service_id).filter(Boolean);
        const servicesRes = await db.from("services").select("*").eq("user_id", user.id).in("id", serviceIds);
        
        if (!servicesRes.error && servicesRes.data) {
          const serviceMap = new Map(servicesRes.data.map(s => [String(s.id), s]));
          const services = serviceIds.map(id => serviceMap.get(String(id))).filter(Boolean);
          
          items = buildInvoiceItemsFromServices(services, { ...contract, ...room }, {
            elecOld,
            elecNew: null,
            waterOld,
            waterNew: null,
          });
        }
      }

      const roomFee = resolveInvoiceRoomFee({
        monthlyRent: Number(contract.rent_amount ?? room.price ?? 0),
        contractStartDate: contract.start_date,
        month,
        year,
      });
      const serviceFees = items.reduce((sum, item) => sum + item.amount, 0);
      const total = roomFee + serviceFees;

      const invRes = await db
        .from("invoices")
        .insert({
          user_id: user.id,
          room_id: room.id,
          contract_id: contractId,
          month,
          year,
          room_fee: roomFee,
          total_amount: total,
          previous_debt: 0,
          elec_old: elecOld,
          elec_new: null,
          water_old: waterOld,
          water_new: null,
          status: "unpaid",
          due_date: defaultDueDate,
          note: "Tự động tạo nháp",
        })
        .select("id")
        .single();

      if (!invRes.error && invRes.data) {
        const invoiceId = invRes.data.id;
        
        // Notify tenant asynchronously
        getTenantUserIdByContractId(contractId).then((tenantUserId) => {
          if (tenantUserId) {
            notifyInvoiceCreated(tenantUserId, {
              id: invoiceId,
              month,
              year,
              total_amount: total,
            }).catch((err) => {
              console.error("Failed to send invoice notification to tenant in bulk path:", err);
            });
          }
        }).catch((err) => {
          console.error("Failed to fetch tenant user ID for invoice notification in bulk path:", err);
        });

        if (items.length > 0) {
          const rows = items.map((item) => ({
            user_id: user.id,
            invoice_id: invoiceId,
            service_id: item.serviceId ?? null,
            name: item.name,
            detail: item.detail ?? "",
            amount: item.amount,
            calculation_type: item.calculationType ?? null,
            unit_price: item.unitPrice ?? null,
            quantity: item.quantity ?? null,
            start_reading: item.startReading ?? null,
            end_reading: item.endReading ?? null,
            usage_value: item.usageValue ?? null,
            unit: item.unit ?? null,
            service_snapshot: item.serviceSnapshot ?? null,
          }));
          await db.from("invoice_items").insert(rows);
        }
        createdCount++;
      }
    } catch (e) {
      console.error(`Failed to auto-generate for room ${room.name}:`, e);
    }
  }

  return c.json({ created: createdCount, skipped: rooms.length - createdCount });
});

invoicesRoutes.post("/bulk-create", async (c) => {
  const user = c.get("user");
  const invoices = await c.req.json();
  if (!Array.isArray(invoices)) return c.json({ error: "Invalid data format" }, 400);

  const db = c.get("supabase");
  const results = [];
  const defaultPaymentChannel = await loadDefaultPaymentChannel(db, user.id);

  for (const invData of invoices) {
    try {
      // Check if invoice already exists for this room and billing period
      const { data: existing, error: checkError } = await db
        .from("invoices")
        .select("id")
        .eq("room_id", invData.roomId)
        .eq("month", invData.month)
        .eq("year", invData.year)
        .eq("user_id", user.id)
        .maybeSingle();

      if (checkError) {
        results.push({ roomId: invData.roomId, error: checkError.message });
        continue;
      }

      if (existing) {
        results.push({ roomId: invData.roomId, error: "Hóa đơn đã tồn tại cho phòng này trong kỳ thanh toán." });
        continue;
      }

      const contractRes = await db
        .from("contracts")
        .select("rent_amount,start_date")
        .eq("id", invData.contractId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (contractRes.error || !contractRes.data) {
        results.push({ roomId: invData.roomId, error: contractRes.error?.message || "Không tìm thấy hợp đồng." });
        continue;
      }

      const requestedRoomFee = Number(invData.roomFee || 0);
      const roomFee = resolveInvoiceRoomFee({
        requestedRoomFee,
        monthlyRent: Number(contractRes.data.rent_amount || requestedRoomFee),
        contractStartDate: contractRes.data.start_date,
        month: Number(invData.month),
        year: Number(invData.year),
      });
      const totalAmount = Math.max(0, Number(invData.totalAmount || 0) - requestedRoomFee + roomFee);

      // Logic tương tự như route POST / nhưng dành cho bulk
      const payload = {
        user_id: user.id,
        room_id: invData.roomId,
        contract_id: invData.contractId,
        month: invData.month,
        year: invData.year,
        room_fee: roomFee,
        total_amount: totalAmount,
        previous_debt: invData.previousDebt || 0,
        elec_old: invData.elecOld,
        elec_new: invData.elecNew,
        water_old: invData.waterOld,
        water_new: invData.waterNew,
        note: invData.note || "Lập hàng loạt",
        status: "unpaid",
        due_date: await resolveInvoiceDueDate(db, user.id, Number(invData.month), Number(invData.year), invData.dueDate),
        payment_code: generatePaymentCode(),
        payment_channel_id: invData.paymentChannelId || defaultPaymentChannel?.id || null,
      };

      const res = await db.from("invoices").insert(payload).select("id").single();
      if (res.error) {
        results.push({ roomId: invData.roomId, error: res.error.message });
        continue;
      }

      const invoiceId = res.data.id;
      if (invData.items && invData.items.length > 0) {
        const rows = invData.items.map((item: any) => ({
          user_id: user.id,
          invoice_id: invoiceId,
          service_id: item.serviceId || null,
          name: item.name,
          detail: item.detail || "",
          amount: item.amount,
          calculation_type: item.calculationType || null,
          unit_price: item.unitPrice || null,
          quantity: item.quantity || null,
          start_reading: item.startReading || null,
          end_reading: item.endReading || null,
          usage_value: item.usageValue || null,
          unit: item.unit || null,
          service_snapshot: item.serviceSnapshot || null,
        }));
        await db.from("invoice_items").insert(rows);
      }
      results.push({ roomId: invData.roomId, id: invoiceId, success: true });
    } catch (err: any) {
      results.push({ roomId: invData.roomId, error: err.message });
    }
  }

  return c.json({ data: results });
});

export default invoicesRoutes;
