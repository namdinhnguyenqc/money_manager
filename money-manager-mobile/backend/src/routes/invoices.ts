import { Hono } from "hono";
import { z } from "zod";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { parseJson, toId } from "../utils/validation.js";
import { updateWalletBalance } from "../utils/wallet.js";
import { env } from "../config/env.js";


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

invoicesRoutes.get("/", async (c) => {
  const user = c.get("user");
  const monthRaw = c.req.query("month");
  const yearRaw = c.req.query("year");
  const roomIdRaw = c.req.query("roomId");
  const statusRaw = c.req.query("status");
  const buildingId = c.req.query("buildingId");



  const db = c.get("supabase");
  let query = db.from("invoices").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

  if (monthRaw) query = query.eq("month", Number(monthRaw));
  if (yearRaw) query = query.eq("year", Number(yearRaw));
  if (roomIdRaw) query = query.eq("room_id", roomIdRaw);
  if (statusRaw) query = query.eq("status", String(statusRaw).toLowerCase());

  const invRes = await query;
  if (invRes.error) return c.json({ error: invRes.error.message }, 500);

  const invoices = invRes.data ?? [];
  if (invoices.length === 0) return c.json({ data: [] });

  const contractIds = [...new Set(invoices.map((x) => x.contract_id))];
  const roomIds = [...new Set(invoices.map((x) => x.room_id))];

  const [contractsRes, roomsRes] = await Promise.all([
    db.from("contracts").select("*").in("id", contractIds),
    db.from("rooms").select("*").in("id", roomIds),
  ]);

  if (contractsRes.error) return c.json({ error: contractsRes.error.message }, 500);
  if (roomsRes.error) return c.json({ error: roomsRes.error.message }, 500);

  const contracts = contractsRes.data ?? [];
  const rooms = roomsRes.data ?? [];
  const tenantIds = [...new Set(contracts.map((x) => x.tenant_id))];
  const tenantsRes = await db.from("tenants").select("*").in("id", tenantIds);
  if (tenantsRes.error) return c.json({ error: tenantsRes.error.message }, 500);
  const tenants = tenantsRes.data ?? [];

  const data = invoices
    .map((inv) => {
      const room = rooms.find((x) => String(x.id) === String(inv.room_id));
      const contract = contracts.find((x) => String(x.id) === String(inv.contract_id));
      const tenant = tenants.find((x) => String(x.id) === String(contract?.tenant_id));
      return {
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
      };
    })
    .sort((a, b) => String(a.room_name).localeCompare(String(b.room_name)));

  return c.json({ data });
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

  const roomFee = parsed.data.roomFee ?? Number(contract.rent_amount ?? roomRes.data?.price ?? 0);
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

  return c.json({ data: invRes.data }, 201);
});

invoicesRoutes.get("/history/:contractId", async (c) => {
  const user = c.get("user");
  const contractId = toId(c.req.param("contractId"));
  if (!contractId) return c.json({ error: "Invalid contract id" }, 400);



  const db = c.get("supabase");
  const { data, error } = await db
    .from("invoices")
    .select("*")
    .eq("contract_id", contractId)
    .eq("user_id", user.id)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: data ?? [] });
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

  const invoice = invRes.data;

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

  return c.json({
    data: {
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
    },
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
  const total = Number(invoice.total_amount || 0);
  const currentPaid = Number(invoice.paid_amount || 0);
  const dueAmount = Math.max(0, total - currentPaid);

  const collectAmount = Number(parsed.data.amount ?? dueAmount);
  if (collectAmount <= 0) {
    return c.json({ error: "Invalid payment amount", data: invoice }, 400);
  }

  // 1. Prevent duplicate collection if invoice is already paid
  if (invoice.status === "paid" && dueAmount <= 0) {
    return c.json({ error: "Hóa đơn này đã được thanh toán đầy đủ.", data: invoice }, 400);
  }

  const roomRes = await db.from("rooms").select("name").eq("id", invoice.room_id).eq("user_id", user.id).maybeSingle();

  // 2. Perform both operations. 
  // In a real production app, we should use a Postgres Transaction or RPC here.
  // For now, we perform them sequentially and ensure atomicity via logic.
  const txRes = await db
    .from("transactions")
    .insert({
      user_id: user.id,
      type: "income",
      amount: collectAmount,
      description: `Thu tiền phòng ${roomRes.data?.name ?? invoice.room_id} ${invoice.month}/${invoice.year}${parsed.data.note ? ` · ${parsed.data.note}` : ""}`,
      category_id: null,
      wallet_id: parsed.data.walletId,
      image_uri: null,
      date: parsed.data.date || new Date().toISOString().split("T")[0],
      invoice_id: invoice.id,
    })
    .select("*")
    .single();

  if (txRes.error || !txRes.data) return c.json({ error: txRes.error?.message || "Failed to create transaction" }, 400);

  // Cập nhật số dư ví
  await updateWalletBalance(db, parsed.data.walletId, collectAmount, 'income');

  const newPaid = currentPaid + collectAmount;
  const updateRes = await db
    .from("invoices")
    .update({
      paid_amount: newPaid,
      status: newPaid >= total ? "paid" : "partial",
      transaction_id: txRes.data.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateRes.error) {
    // CRITICAL: If invoice update fails, we MUST attempt to roll back the transaction
    await db.from("transactions").delete().eq("id", txRes.data.id).eq("user_id", user.id);
    return c.json({ error: "Lỗi khi cập nhật trạng thái hóa đơn. Giao dịch đã được hủy để tránh sai sót." }, 400);
  }

  if (!updateRes.data) return c.json({ error: "Failed to update invoice" }, 400);

  return c.json({ data: { invoice: updateRes.data, transaction: txRes.data } });
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

export default invoicesRoutes;
