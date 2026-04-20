import { Hono } from "hono";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { parseJson, toNumberId } from "../utils/validation.js";
import { env } from "../config/env.js";
import { mockDb, updateMockBalance } from "../mockDb.js";

const rentalRoutes = new Hono<AppEnv>();

rentalRoutes.use("*", requireAuth);

const addRoomSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  hasAc: z.boolean().optional(),
  numPeople: z.number().int().positive().optional(),
});

const updateRoomSchema = z
  .object({
    name: z.string().min(1).optional(),
    price: z.number().nonnegative().optional(),
    hasAc: z.boolean().optional(),
    numPeople: z.number().int().positive().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, "No fields to update");

const addTenantSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  idCard: z.string().optional(),
  address: z.string().optional(),
});

const updateTenantSchema = z
  .object({
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    idCard: z.string().optional(),
    address: z.string().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, "No fields to update");

const addServiceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["fixed", "per_person", "metered", "meter"]),
  unitPrice: z.number().nonnegative(),
  unitPriceAc: z.number().nonnegative().optional(),
  unit: z.string().optional(),
  icon: z.string().optional(),
});

const updateServiceSchema = z
  .object({
    unitPrice: z.number().nonnegative().optional(),
    unitPriceAc: z.number().nonnegative().optional(),
    active: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, "No fields to update");

const addContractSchema = z.object({
  roomId: z.number().int().positive(),
  tenantId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deposit: z.number().nonnegative(),
  serviceIds: z.array(z.number().int().positive()).optional(),
});

const updateContractSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deposit: z.number().nonnegative(),
  serviceIds: z.array(z.number().int().positive()).optional(),
});

const terminateContractSchema = z.object({
  roomId: z.number().int().positive(),
  refundAmount: z.number().nonnegative().optional(),
  walletId: z.number().int().positive().nullable().optional(),
});

const roomSort = (a: { name: string }, b: { name: string }) => String(a.name).localeCompare(String(b.name));

rentalRoutes.get("/rooms", async (c) => {
  if (env.IS_MOCK) {
    return c.json({ data: mockDb.rooms });
  }
  const user = c.get("user");

  const [roomsRes, contractsRes, tenantsRes] = await Promise.all([
    supabaseAdmin.from("rooms").select("*").eq("user_id", user.id),
    supabaseAdmin
      .from("contracts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active"),
    supabaseAdmin.from("tenants").select("*").eq("user_id", user.id),
  ]);

  if (roomsRes.error) return c.json({ error: roomsRes.error.message }, 500);
  if (contractsRes.error) return c.json({ error: contractsRes.error.message }, 500);
  if (tenantsRes.error) return c.json({ error: tenantsRes.error.message }, 500);

  const contracts = contractsRes.data ?? [];
  const tenants = tenantsRes.data ?? [];

  const data = (roomsRes.data ?? [])
    .map((room) => {
      const contract = contracts.find((x) => Number(x.room_id) === Number(room.id));
      if (!contract) return room;

      const tenant = tenants.find((x) => Number(x.id) === Number(contract.tenant_id));
      return {
        ...room,
        contract_id: contract.id,
        deposit: contract.deposit,
        start_date: contract.start_date,
        end_date: contract.end_date,
        tenant_id: tenant?.id ?? null,
        tenant_name: tenant?.name ?? null,
        tenant_phone: tenant?.phone ?? null,
        tenant_id_card: tenant?.id_card ?? null,
        tenant_address: tenant?.address ?? null,
      };
    })
    .sort(roomSort);

  return c.json({ data });
});

rentalRoutes.post("/rooms", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, addRoomSchema);
  if (!parsed.ok) return parsed.response;

  const payload = {
    user_id: user.id,
    name: parsed.data.name.trim(),
    price: parsed.data.price,
    has_ac: parsed.data.hasAc ?? false,
    num_people: parsed.data.numPeople ?? 1,
    status: "vacant",
  };

  const { data, error } = await supabaseAdmin.from("rooms").insert(payload).select("*").single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data }, 201);
});

rentalRoutes.patch("/rooms/:id", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid room id" }, 400);

  const parsed = await parseJson(c, updateRoomSchema);
  if (!parsed.ok) return parsed.response;

  const payload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name.trim();
  if (parsed.data.price !== undefined) payload.price = parsed.data.price;
  if (parsed.data.hasAc !== undefined) payload.has_ac = parsed.data.hasAc;
  if (parsed.data.numPeople !== undefined) payload.num_people = parsed.data.numPeople;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .update(payload)
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

rentalRoutes.delete("/rooms/:id", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid room id" }, 400);

  const activeContractRes = await supabaseAdmin
    .from("contracts")
    .select("id")
    .eq("user_id", user.id)
    .eq("room_id", id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (activeContractRes.error) return c.json({ error: activeContractRes.error.message }, 500);
  if (activeContractRes.data?.id) {
    return c.json({ error: "Khong the xoa phong dang co khach thue" }, 400);
  }

  const { error } = await supabaseAdmin
    .from("rooms")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

rentalRoutes.get("/tenants", async (c) => {
  const user = c.get("user");
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: data ?? [] });
});

rentalRoutes.post("/tenants", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, addTenantSchema);
  if (!parsed.ok) return parsed.response;

  if (env.IS_MOCK) {
    return c.json({ data: { id: Date.now(), name: parsed.data.name } }, 201);
  }

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .insert({
      user_id: user.id,
      name: parsed.data.name.trim(),
      phone: parsed.data.phone ?? "",
      id_card: parsed.data.idCard ?? "",
      address: parsed.data.address ?? "",
    })
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data }, 201);
});

rentalRoutes.patch("/tenants/:id", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid tenant id" }, 400);

  const parsed = await parseJson(c, updateTenantSchema);
  if (!parsed.ok) return parsed.response;

  const payload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name.trim();
  if (parsed.data.phone !== undefined) payload.phone = parsed.data.phone;
  if (parsed.data.idCard !== undefined) payload.id_card = parsed.data.idCard;
  if (parsed.data.address !== undefined) payload.address = parsed.data.address;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .update(payload)
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

rentalRoutes.get("/services", async (c) => {
  const user = c.get("user");
  const activeOnly = c.req.query("activeOnly") !== "0";
  let query = supabaseAdmin
    .from("services")
    .select("*")
    .eq("user_id", user.id)
    .order("id", { ascending: true });
  if (activeOnly) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: data ?? [] });
});

rentalRoutes.post("/services", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, addServiceSchema);
  if (!parsed.ok) return parsed.response;

  const { data, error } = await supabaseAdmin
    .from("services")
    .insert({
      user_id: user.id,
      name: parsed.data.name.trim(),
      type: parsed.data.type,
      unit_price: parsed.data.unitPrice,
      unit_price_ac: parsed.data.unitPriceAc ?? 0,
      unit: parsed.data.unit ?? "thang",
      icon: parsed.data.icon ?? "⚙️",
      active: true,
    })
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data }, 201);
});

rentalRoutes.patch("/services/:id", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid service id" }, 400);

  const parsed = await parseJson(c, updateServiceSchema);
  if (!parsed.ok) return parsed.response;

  const payload: Record<string, unknown> = {};
  if (parsed.data.unitPrice !== undefined) payload.unit_price = parsed.data.unitPrice;
  if (parsed.data.unitPriceAc !== undefined) payload.unit_price_ac = parsed.data.unitPriceAc;
  if (parsed.data.active !== undefined) payload.active = parsed.data.active;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("services")
    .update(payload)
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

rentalRoutes.delete("/services/:id", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid service id" }, 400);

  const { error } = await supabaseAdmin
    .from("services")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

rentalRoutes.get("/contracts/active", async (c) => {
  const user = c.get("user");

  const [contractsRes, roomsRes, tenantsRes] = await Promise.all([
    supabaseAdmin
      .from("contracts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active"),
    supabaseAdmin.from("rooms").select("*").eq("user_id", user.id),
    supabaseAdmin.from("tenants").select("*").eq("user_id", user.id),
  ]);

  if (contractsRes.error) return c.json({ error: contractsRes.error.message }, 500);
  if (roomsRes.error) return c.json({ error: roomsRes.error.message }, 500);
  if (tenantsRes.error) return c.json({ error: tenantsRes.error.message }, 500);

  const rooms = roomsRes.data ?? [];
  const tenants = tenantsRes.data ?? [];

  const data = (contractsRes.data ?? [])
    .map((contract) => {
      const room = rooms.find((x) => Number(x.id) === Number(contract.room_id));
      const tenant = tenants.find((x) => Number(x.id) === Number(contract.tenant_id));
      return {
        ...contract,
        room_name: room?.name ?? "",
        room_price: room?.price ?? 0,
        has_ac: room?.has_ac ?? false,
        num_people: room?.num_people ?? 1,
        tenant_name: tenant?.name ?? "",
        tenant_phone: tenant?.phone ?? "",
      };
    })
    .sort((a, b) => String(a.room_name).localeCompare(String(b.room_name)));

  return c.json({ data });
});

rentalRoutes.post("/contracts", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, addContractSchema);
  if (!parsed.ok) return parsed.response;

  if (env.IS_MOCK) {
    const room = mockDb.rooms.find(r => r.id === parsed.data.roomId);
    if (room) {
      room.status = "occupied";
      room.tenant_name = "Khách mới ráp";
      room.contract_id = Date.now();
    }
    return c.json({ data: { id: room?.contract_id } }, 201);
  }

  const { data, error } = await supabaseAdmin
    .from("contracts")
    .insert({
      user_id: user.id,
      room_id: parsed.data.roomId,
      tenant_id: parsed.data.tenantId,
      start_date: parsed.data.startDate,
      deposit: parsed.data.deposit,
      status: "active",
    })
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);

  const contractId = Number(data.id);
  await supabaseAdmin
    .from("rooms")
    .update({ status: "occupied" })
    .eq("user_id", user.id)
    .eq("id", parsed.data.roomId);

  const serviceIds = parsed.data.serviceIds ?? [];
  if (serviceIds.length > 0) {
    const rows = serviceIds.map((serviceId) => ({
      user_id: user.id,
      contract_id: contractId,
      service_id: serviceId,
    }));
    const insertRes = await supabaseAdmin.from("contract_services").insert(rows);
    if (insertRes.error) return c.json({ error: insertRes.error.message }, 400);
  }

  return c.json({ data }, 201);
});

rentalRoutes.patch("/contracts/:id", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid contract id" }, 400);

  const parsed = await parseJson(c, updateContractSchema);
  if (!parsed.ok) return parsed.response;

  const updateRes = await supabaseAdmin
    .from("contracts")
    .update({
      start_date: parsed.data.startDate,
      deposit: parsed.data.deposit,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();
  if (updateRes.error) return c.json({ error: updateRes.error.message }, 400);

  await supabaseAdmin.from("contract_services").delete().eq("user_id", user.id).eq("contract_id", id);
  const serviceIds = parsed.data.serviceIds ?? [];
  if (serviceIds.length > 0) {
    const rows = serviceIds.map((serviceId) => ({
      user_id: user.id,
      contract_id: id,
      service_id: serviceId,
    }));
    const insertRes = await supabaseAdmin.from("contract_services").insert(rows);
    if (insertRes.error) return c.json({ error: insertRes.error.message }, 400);
  }

  return c.json({ data: updateRes.data });
});

rentalRoutes.post("/contracts/:id/terminate", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid contract id" }, 400);

  const parsed = await parseJson(c, terminateContractSchema);
  if (!parsed.ok) return parsed.response;

  if (env.IS_MOCK) {
    const room = mockDb.rooms.find(r => r.id === parsed.data.roomId);
    if (room) {
      room.status = "vacant";
      room.tenant_name = undefined;
      room.contract_id = undefined;
    }
    if (parsed.data.refundAmount && parsed.data.walletId) {
      updateMockBalance(parsed.data.walletId, -parsed.data.refundAmount);
    }
    return c.json({ ok: true });
  }

  const now = new Date().toISOString().split("T")[0];
  const updateContractRes = await supabaseAdmin
    .from("contracts")
    .update({
      status: "terminated",
      end_date: now,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("id", id);
  if (updateContractRes.error) return c.json({ error: updateContractRes.error.message }, 400);

  const updateRoomRes = await supabaseAdmin
    .from("rooms")
    .update({ status: "vacant", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("id", parsed.data.roomId);
  if (updateRoomRes.error) return c.json({ error: updateRoomRes.error.message }, 400);

  const refundAmount = Number(parsed.data.refundAmount || 0);
  if (refundAmount > 0 && parsed.data.walletId) {
    const roomRes = await supabaseAdmin
      .from("rooms")
      .select("name")
      .eq("user_id", user.id)
      .eq("id", parsed.data.roomId)
      .maybeSingle();
    if (roomRes.error) return c.json({ error: roomRes.error.message }, 500);

    const txRes = await supabaseAdmin.from("transactions").insert({
      user_id: user.id,
      type: "expense",
      amount: refundAmount,
      description: `Hoan tien coc phong ${roomRes.data?.name ?? ""}`.trim(),
      category_id: null,
      wallet_id: parsed.data.walletId,
      image_uri: null,
      date: now,
    });
    if (txRes.error) return c.json({ error: txRes.error.message }, 400);
  }

  return c.json({ ok: true });
});

rentalRoutes.get("/contracts/:id/services", async (c) => {
  const user = c.get("user");
  const id = toNumberId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid contract id" }, 400);

  const contractServicesRes = await supabaseAdmin
    .from("contract_services")
    .select("service_id")
    .eq("user_id", user.id)
    .eq("contract_id", id);
  if (contractServicesRes.error) return c.json({ error: contractServicesRes.error.message }, 500);

  const serviceIds = (contractServicesRes.data ?? []).map((x) => Number(x.service_id));
  if (serviceIds.length === 0) return c.json({ data: [] });

  const servicesRes = await supabaseAdmin
    .from("services")
    .select("*")
    .eq("user_id", user.id)
    .in("id", serviceIds);
  if (servicesRes.error) return c.json({ error: servicesRes.error.message }, 500);

  const map = new Map((servicesRes.data ?? []).map((x) => [Number(x.id), x]));
  const ordered = serviceIds.map((sid) => map.get(sid)).filter(Boolean);
  return c.json({ data: ordered });
});

export default rentalRoutes;
