import { Hono } from "hono";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { parseJson, toNumberId } from "../utils/validation.js";

const invoicesRoutes = new Hono<AppEnv>();

invoicesRoutes.use("*", requireAuth);

const invoiceItemSchema = z.object({
  serviceId: z.number().int().positive().nullable().optional(),
  name: z.string().min(1),
  detail: z.string().optional(),
  amount: z.number().nonnegative(),
});

const createInvoiceSchema = z.object({
  roomId: z.number().int().positive(),
  contractId: z.number().int().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  roomFee: z.number().nonnegative(),
  previousDebt: z.number().nonnegative().optional(),
  items: z.array(invoiceItemSchema),
  elecOld: z.number().nonnegative().nullable().optional(),
  elecNew: z.number().nonnegative().nullable().optional(),
  waterOld: z.number().nonnegative().nullable().optional(),
  waterNew: z.number().nonnegative().nullable().optional(),
});

const markPaidSchema = z.object({
  paidAmount: z.number().nonnegative(),
  transactionId: z.number().int().positive().nullable().optional(),
});

invoicesRoutes.get("/", async (c) => {
  const user = c.get("user");
  const monthRaw = c.req.query("month");
  const yearRaw = c.req.query("year");

  let query = supabaseAdmin.from("invoices").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

  if (monthRaw) query = query.eq("month", Number(monthRaw));
  if (yearRaw) query = query.eq("year", Number(yearRaw));

  const invRes = await query;
  if (invRes.error) return c.json({ error: invRes.error.message }, 500);

  const invoices = invRes.data ?? [];
  if (invoices.length === 0) return c.json({ data: [] });

  const contractIds = [...new Set(invoices.map((x) => Number(x.contract_id)))];
  const roomIds = [...new Set(invoices.map((x) => Number(x.room_id)))];

  const [contractsRes, roomsRes] = await Promise.all([
    supabaseAdmin.from("contracts").select("*").eq("user_id", user.id).in("id", contractIds),
    supabaseAdmin.from("rooms").select("*").eq("user_id", user.id).in("id", roomIds),
  ]);

  if (contractsRes.error) return c.json({ error: contractsRes.error.message }, 500);
  if (roomsRes.error) return c.json({ error: roomsRes.error.message }, 500);

  const contracts = contractsRes.data ?? [];
  const rooms = roomsRes.data ?? [];
  const tenantIds = [...new Set(contracts.map((x) => Number(x.tenant_id)))];
  const tenantsRes = await supabaseAdmin.from("tenants").select("*").eq("user_id", user.id).in("id", tenantIds);
  if (tenantsRes.error) return c.json({ error: tenantsRes.error.message }, 500);
  const tenants = tenantsRes.data ?? [];

  const data = invoices
    .map((inv) => {
      const room = rooms.find((x) => Number(x.id) === Number(inv.room_id));
      const contract = contracts.find((x) => Number(x.id) === Number(inv.contract_id));
      const tenant = tenants.find((x) => Number(x.id) === Number(contract?.tenant_id));
      return {
        ...inv,
        room_name: room?.name ?? "",
        tenant_name: tenant?.name ?? "",
        tenant_phone: tenant?.phone ?? "",
      };
    })
    .sort((a, b) => String(a.room_name).localeCompare(String(b.room_name)));

  return c.json({ data });
});

invoicesRoutes.post("/", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, createInvoiceSchema);
  if (!parsed.ok) return parsed.response;

  const previousDebt = parsed.data.previousDebt ?? 0;
  const serviceFees = parsed.data.items.reduce((sum, item) => sum + item.amount, 0);
  const total = parsed.data.roomFee + serviceFees + previousDebt;

  const invRes = await supabaseAdmin
    .from("invoices")
    .insert({
      user_id: user.id,
      room_id: parsed.data.roomId,
      contract_id: parsed.data.contractId,
      month: parsed.data.month,
      year: parsed.data.year,
      room_fee: parsed.data.roomFee,
      total_amount: total,
      previous_debt: previousDebt,
      elec_old: parsed.data.elecOld ?? null,
      elec_new: parsed.data.elecNew ?? null,
      water_old: parsed.data.waterOld ?? null,
      water_new: parsed.data.waterNew ?? null,
    })
    .select("*")
    .single();

  if (invRes.error) return c.json({ error: invRes.error.message }, 400);

  const invoiceId = Number(invRes.data.id);
  if (parsed.data.items.length > 0) {
    const rows = parsed.data.items.map((item) => ({
      user_id: user.id,
      invoice_id: invoiceId,
      service_id: item.serviceId ?? null,
      name: item.name,
      detail: item.detail ?? "",
      amount: item.amount,
    }));
    const itemRes = await supabaseAdmin.from("invoice_items").insert(rows);
    if (itemRes.error) return c.json({ error: itemRes.error.message }, 400);
  }

  return c.json({ data: invRes.data }, 201);
});

invoicesRoutes.get("/history/:contractId", async (c) => {
  const user = c.get("user");
  const contractId = toNumberId(c.req.param("contractId"));
  if (!contractId) return c.json({ error: "Invalid contract id" }, 400);

  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .eq("contract_id", contractId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: data ?? [] });
});

invoicesRoutes.get("/previous-debt", async (c) => {
  const user = c.get("user");
  const roomId = Number(c.req.query("roomId"));
  const month = Number(c.req.query("month"));
  const year = Number(c.req.query("year"));

  if (!Number.isInteger(roomId) || roomId <= 0) return c.json({ error: "Invalid roomId" }, 400);
  if (!Number.isInteger(month) || month < 1 || month > 12) return c.json({ error: "Invalid month" }, 400);
  if (!Number.isInteger(year) || year < 2000) return c.json({ error: "Invalid year" }, 400);

  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select("total_amount,paid_amount")
    .eq("user_id", user.id)
    .eq("room_id", roomId)
    .eq("month", prevMonth)
    .eq("year", prevYear)
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
  const roomId = Number(c.req.query("roomId"));
  if (!Number.isInteger(roomId) || roomId <= 0) return c.json({ error: "Invalid roomId" }, 400);

  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select("elec_new,water_new")
    .eq("user_id", user.id)
    .eq("room_id", roomId)
    .not("elec_new", "is", null)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ data: null });

  return c.json({
    data: {
      elec_old: Number(data.elec_new || 0),
      water_old: Number(data.water_new || 0),
    },
  });
});

invoicesRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid invoice id" }, 400);

  const invRes = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (invRes.error) return c.json({ error: invRes.error.message }, 404);

  const invoice = invRes.data;

  const [itemsRes, roomRes, contractRes] = await Promise.all([
    supabaseAdmin.from("invoice_items").select("*").eq("user_id", user.id).eq("invoice_id", id),
    supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("user_id", user.id)
      .eq("id", Number(invoice.room_id))
      .maybeSingle(),
    supabaseAdmin
      .from("contracts")
      .select("*")
      .eq("user_id", user.id)
      .eq("id", Number(invoice.contract_id))
      .maybeSingle(),
  ]);

  if (itemsRes.error) return c.json({ error: itemsRes.error.message }, 500);
  if (roomRes.error) return c.json({ error: roomRes.error.message }, 500);
  if (contractRes.error) return c.json({ error: contractRes.error.message }, 500);

  let tenant = null;
  if (contractRes.data?.tenant_id) {
    const tenantRes = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("user_id", user.id)
      .eq("id", Number(contractRes.data.tenant_id))
      .maybeSingle();
    if (tenantRes.error) return c.json({ error: tenantRes.error.message }, 500);
    tenant = tenantRes.data;
  }

  return c.json({
    data: {
      ...invoice,
      room_name: roomRes.data?.name ?? "",
      contract_price: roomRes.data?.price ?? 0,
      tenant_name: tenant?.name ?? "",
      tenant_phone: tenant?.phone ?? "",
      items: itemsRes.data ?? [],
    },
  });
});

invoicesRoutes.post("/:id/mark-paid", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid invoice id" }, 400);

  const parsed = await parseJson(c, markPaidSchema);
  if (!parsed.ok) return parsed.response;

  const { data, error } = await supabaseAdmin
    .from("invoices")
    .update({
      paid_amount: parsed.data.paidAmount,
      status: "paid",
      transaction_id: parsed.data.transactionId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

invoicesRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid invoice id" }, 400);

  const invRes = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();

  if (invRes.error) return c.json({ error: invRes.error.message }, 404);

  const transactionId = invRes.data.transaction_id ? Number(invRes.data.transaction_id) : null;
  await supabaseAdmin.from("invoice_items").delete().eq("user_id", user.id).eq("invoice_id", id);
  const delInv = await supabaseAdmin.from("invoices").delete().eq("user_id", user.id).eq("id", id);
  if (delInv.error) return c.json({ error: delInv.error.message }, 400);

  if (transactionId) {
    await supabaseAdmin
      .from("transactions")
      .delete()
      .eq("user_id", user.id)
      .eq("id", transactionId);
  }

  return c.json({ ok: true });
});

export default invoicesRoutes;
