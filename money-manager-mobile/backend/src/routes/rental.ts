import { Hono } from "hono";
import { z } from "zod";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { parseJson, toId } from "../utils/validation.js";
import { logAuditAction } from "../utils/audit.js";
import { updateWalletBalance } from "../utils/wallet.js";
import { env } from "../config/env.js";


const formatMoney = (value: number) => 
  new Intl.NumberFormat("vi-VN").format(Math.round(value)) + " ₫";

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
  type: z.enum(["fixed", "per_person", "per_room", "metered", "meter"]),
  unitPrice: z.number().nonnegative().optional(),
  unit_price: z.number().nonnegative().optional(),
  unitPriceAc: z.number().nonnegative().optional(),
  unit_price_ac: z.number().nonnegative().optional(),
  icon: z.string().optional(),
});

const updateServiceSchema = z
  .object({
    name: z.string().min(1).optional(),
    unitPrice: z.number().nonnegative().optional(),
    unit_price: z.number().nonnegative().optional(),
    unitPriceAc: z.number().nonnegative().optional(),
    unit_price_ac: z.number().nonnegative().optional(),
    active: z.boolean().optional(),
    type: z.enum(["fixed", "per_person", "per_room", "metered", "meter"]).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, "No fields to update");

const addContractSchema = z.object({
  roomId: z.string().min(1),
  tenantId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().optional().nullable(),
  deposit: z.coerce.number().nonnegative(),
  rentAmount: z.coerce.number().nonnegative().optional(),
  billingDay: z.coerce.number().int().min(1).max(31).optional(),
  electricStart: z.coerce.number().nonnegative().optional(),
  waterStart: z.coerce.number().nonnegative().optional(),
  occupantCount: z.coerce.number().int().positive().optional(),
  note: z.string().optional(),
  serviceIds: z.array(z.string()).optional(),
  walletId: z.string().nullable().optional(),
});

const updateContractSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deposit: z.number().nonnegative(),
  occupantCount: z.number().int().positive().optional(),
  serviceIds: z.array(z.string()).optional(),
});

const terminateContractSchema = z.object({
  roomId: z.string().min(1),
  refundAmount: z.coerce.number().nonnegative(),
  settlementAmount: z.coerce.number().nonnegative().optional(),
  refundDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  refundMethod: z.string().optional(),
  note: z.string().optional(),
  walletId: z.string().nullable().optional(),
  settlementWalletId: z.string().nullable().optional(),
});

const roomSort = (a: { name: string }, b: { name: string }) => String(a.name).localeCompare(String(b.name));

// ═══════════════════════════════════════════════
// ROOMS
// ═══════════════════════════════════════════════

rentalRoutes.get("/rooms", async (c) => {
  const user = c.get("user");


  const db = c.get("supabase");

  const [roomsRes, contractsRes, tenantsRes] = await Promise.all([
    db.from("rooms").select("*").eq("user_id", user.id),
    db.from("contracts").select("*").eq("user_id", user.id).eq("status", "active"),
    db.from("tenants").select("*").eq("user_id", user.id),
  ]);

  if (roomsRes.error) return c.json({ error: roomsRes.error.message }, 500);
  if (contractsRes.error) return c.json({ error: contractsRes.error.message }, 500);
  if (tenantsRes.error) return c.json({ error: tenantsRes.error.message }, 500);

  const contracts = contractsRes.data ?? [];
  const tenants = tenantsRes.data ?? [];

  const data = (roomsRes.data ?? [])
    .map((room) => {
      const contract = contracts.find((x) => String(x.room_id) === String(room.id));
      const baseRoom = { 
        ...room, 
        hasAc: room.has_ac, 
        numPeople: room.num_people,
        building_id: room.boarding_house_id,
        facility_id: room.boarding_house_id,
      };

      if (!contract) return baseRoom;

      const tenant = tenants.find((x) => String(x.id) === String(contract.tenant_id));
      return {
        ...baseRoom,
        contractId: contract.id, contract_id: contract.id,
        deposit: contract.deposit,
        startDate: contract.start_date, start_date: contract.start_date,
        endDate: contract.end_date, end_date: contract.end_date,
        tenantId: tenant?.id ?? null, tenant_id: tenant?.id ?? null,
        tenantName: tenant?.name ?? null, tenant_name: tenant?.name ?? null,
        tenantPhone: tenant?.phone ?? null, tenant_phone: tenant?.phone ?? null,
        tenantIdCard: tenant?.id_card ?? null, tenant_id_card: tenant?.id_card ?? null,
        tenantAddress: tenant?.address ?? null, tenant_address: tenant?.address ?? null,
      };
    })
    .sort(roomSort);

  return c.json({ data });
});

// ═══════════════════════════════════════════════
// RESERVATIONS (Đặt cọc giữ chỗ)
// ═══════════════════════════════════════════════

const depositSchema = z.object({
  roomId: z.string().min(1),
  tenantName: z.string().min(1),
  tenantPhone: z.string().optional(),
  amount: z.number().positive(),
  depositDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod: z.string().optional().default("cash"),
  note: z.string().optional(),
  walletId: z.string().nullable().optional(),
});

rentalRoutes.get("/deposits", async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");

  const { data, error } = await db
    .from("deposits")
    .select(`
      *,
      rooms (
        name,
        boarding_houses (
          name
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);

  const formatted = (data ?? []).map((d: any) => ({
    id: d.id,
    room_id: d.room_id,
    room_name: d.rooms?.name || "Phòng đã xóa",
    facility_name: d.rooms?.boarding_houses?.name || "Cơ sở đã xóa",
    tenant_name: d.tenant_name,
    tenant_phone: d.tenant_phone,
    amount: d.amount,
    deposit_date: d.recorded_at,
    status: d.status === "active" ? "holding" : d.status, // Map legacy 'active' to 'holding'
    note: d.note,
    contract_id: d.contract_id,
    created_at: d.created_at,
  }));

  return c.json({ data: formatted });
});

rentalRoutes.post("/deposits", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, depositSchema);
  if (!parsed.ok) return parsed.response;

  const db = c.get("supabase");

  // 1. Create deposit record
  const { data: deposit, error: depError } = await db.from("deposits").insert({
    user_id: user.id,
    room_id: parsed.data.roomId,
    tenant_name: parsed.data.tenantName,
    tenant_phone: parsed.data.tenantPhone || "",
    amount: parsed.data.amount,
    type: "reservation",
    status: "active",
    payment_method: parsed.data.paymentMethod || "cash",
    recorded_at: parsed.data.depositDate,
    note: parsed.data.note || "Đặt cọc giữ chỗ",
  }).select("*").single();

  if (depError) return c.json({ error: depError.message }, 400);

  // 3. Create transaction for the deposit income
  if (parsed.data.amount > 0 && parsed.data.walletId) {
    await db.from("transactions").insert({
      user_id: user.id,
      wallet_id: parsed.data.walletId,
      type: "income",
      amount: parsed.data.amount,
      description: `Thu tiền cọc giữ chỗ - Phòng ${parsed.data.roomId} - ${parsed.data.tenantName}${parsed.data.note ? ` (${parsed.data.note})` : ""}`,
      date: parsed.data.depositDate,
      category_id: null,
      image_uri: null,
    });
    // Cập nhật số dư ví
    await updateWalletBalance(db, parsed.data.walletId, parsed.data.amount, 'income');
  }

  return c.json({ data: deposit }, 201);
});

rentalRoutes.patch("/deposits/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = c.get("supabase");

  const body = await c.req.json();
  const { status, note } = body;

  const payload: any = { updated_at: new Date().toISOString() };
  if (status) payload.status = status === "holding" ? "active" : status;
  if (note) payload.note = note;

  const { data, error } = await db
    .from("deposits")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);

  // If cancelled or refunded, and there's no active contract, set room back to vacant
  if (["cancelled", "refunded"].includes(status)) {
    const roomId = data.room_id;
    // Check if any other active deposit exists for this room
    const { data: others } = await db
      .from("deposits")
      .select("id")
      .eq("room_id", roomId)
      .eq("status", "active")
      .neq("id", id);
    
    if (!others || others.length === 0) {
      await db.from("rooms").update({ status: "vacant" }).eq("id", roomId).eq("user_id", user.id);
    }
  }

  return c.json({ data });
});

rentalRoutes.post("/rooms", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, addRoomSchema);
  if (!parsed.ok) return parsed.response;



  const db = c.get("supabase");
  const { data, error } = await db.from("rooms").insert({
    user_id: user.id,
    name: parsed.data.name.trim(),
    price: parsed.data.price,
    has_ac: parsed.data.hasAc ?? false,
    num_people: parsed.data.numPeople ?? 1,
    status: "vacant",
  }).select("*").single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data: { ...data, hasAc: data.has_ac, numPeople: data.num_people } }, 201);
});

rentalRoutes.patch("/rooms/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid room id" }, 400);

  const parsed = await parseJson(c, updateRoomSchema);
  if (!parsed.ok) return parsed.response;

  const payload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name.trim();
  if (parsed.data.price !== undefined) payload.price = parsed.data.price;
  if (parsed.data.hasAc !== undefined) payload.has_ac = parsed.data.hasAc;
  if (parsed.data.numPeople !== undefined) payload.num_people = parsed.data.numPeople;
  payload.updated_at = new Date().toISOString();



  const db = c.get("supabase");
  const { data, error } = await db.from("rooms").update(payload).eq("id", id).eq("user_id", user.id).select("*").single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

rentalRoutes.delete("/rooms/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid room id" }, 400);



  const db = c.get("supabase");
  const activeContractRes = await db.from("contracts").select("id").eq("room_id", id).eq("status", "active").eq("user_id", user.id).limit(1).maybeSingle();
  if (activeContractRes.error) return c.json({ error: activeContractRes.error.message }, 500);
  if (activeContractRes.data?.id) {
    return c.json({ error: "Khong the xoa phong dang co khach thue" }, 400);
  }

  const { error } = await db.from("rooms").delete().eq("id", id).eq("user_id", user.id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════
// TENANTS
// ═══════════════════════════════════════════════

rentalRoutes.get("/tenants", async (c) => {
  const user = c.get("user");


  const db = c.get("supabase");
  const { data, error } = await db.from("tenants").select("*").eq("user_id", user.id).order("name", { ascending: true });

  if (error) return c.json({ error: error.message }, 500);

  const formatted = (data ?? []).map(t => ({ ...t, idCard: t.id_card }));
  return c.json({ data: formatted });
});

rentalRoutes.post("/tenants", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, addTenantSchema);
  if (!parsed.ok) return parsed.response;



  const db = c.get("supabase");
  
  if (parsed.data.phone) {
    const { data: existing } = await db.from("tenants")
      .select("*")
      .eq("user_id", user.id)
      .eq("phone", parsed.data.phone)
      .maybeSingle();
    
    if (existing) {
      return c.json({ data: { ...existing, idCard: existing.id_card } }, 200);
    }
  }

  const { data, error } = await db.from("tenants").insert({
    user_id: user.id,
    name: parsed.data.name.trim(),
    phone: parsed.data.phone ?? "",
    id_card: parsed.data.idCard ?? "",
    address: parsed.data.address ?? "",
  }).select("*").single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data: { ...data, idCard: data.id_card } }, 201);
});

rentalRoutes.patch("/tenants/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid tenant id" }, 400);

  const parsed = await parseJson(c, updateTenantSchema);
  if (!parsed.ok) return parsed.response;

  const payload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name.trim();
  if (parsed.data.phone !== undefined) payload.phone = parsed.data.phone;
  if (parsed.data.idCard !== undefined) payload.id_card = parsed.data.idCard;
  if (parsed.data.address !== undefined) payload.address = parsed.data.address;
  payload.updated_at = new Date().toISOString();



  const db = c.get("supabase");
  const { data, error } = await db.from("tenants").update(payload).eq("id", id).eq("user_id", user.id).select("*").single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

rentalRoutes.delete("/tenants/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid tenant id" }, 400);



  const db = c.get("supabase");
  const { error } = await db.from("tenants").delete().eq("id", id).eq("user_id", user.id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════════════

rentalRoutes.get("/services", async (c) => {
  const user = c.get("user");


  const activeOnly = c.req.query("activeOnly") !== "0";
  const db = c.get("supabase");

  let query = db.from("services").select("*").eq("user_id", user.id).order("name", { ascending: true });
  if (activeOnly) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  const formattedData = (data ?? []).map(s => ({
    ...s,
    unitPrice: s.unit_price,
    unitPriceAc: s.unit_price_ac,
  }));

  return c.json({ data: formattedData });
});

rentalRoutes.post("/services", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, addServiceSchema);
  if (!parsed.ok) return parsed.response;

  const unitPrice = parsed.data.unit_price ?? parsed.data.unitPrice ?? 0;
  const unitPriceAc = parsed.data.unit_price_ac ?? parsed.data.unitPriceAc ?? 0;



  const db = c.get("supabase");
  const { data, error } = await db.from("services").insert({
    user_id: user.id,
    name: parsed.data.name.trim(),
    type: parsed.data.type,
    unit_price: unitPrice,
    unit_price_ac: unitPriceAc,
    icon: parsed.data.icon ?? "⚙️",
    active: true,
  }).select("*").single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data: { ...data, unitPrice: data.unit_price, unitPriceAc: data.unit_price_ac } }, 201);
});

rentalRoutes.patch("/services/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid service id" }, 400);

  const parsed = await parseJson(c, updateServiceSchema);
  if (!parsed.ok) return parsed.response;

  const payload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name.trim();
  const up = parsed.data.unit_price ?? parsed.data.unitPrice;
  if (up !== undefined) payload.unit_price = up;
  const upAc = parsed.data.unit_price_ac ?? parsed.data.unitPriceAc;
  if (upAc !== undefined) payload.unit_price_ac = upAc;
  if (parsed.data.type !== undefined) payload.type = parsed.data.type;
  if (parsed.data.active !== undefined) payload.active = parsed.data.active;
  payload.updated_at = new Date().toISOString();



  const db = c.get("supabase");
  const { data, error } = await db.from("services").update(payload).eq("id", id).eq("user_id", user.id).select("*").single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data: { ...data, unitPrice: data.unit_price, unitPriceAc: data.unit_price_ac } });
});

rentalRoutes.delete("/services/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid service id" }, 400);



  const db = c.get("supabase");
  const { error } = await db.from("services").delete().eq("id", id).eq("user_id", user.id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════
// CONTRACTS
// ═══════════════════════════════════════════════

rentalRoutes.get("/contracts/active", async (c) => {
  const user = c.get("user");


  const db = c.get("supabase");

  const [contractsRes, roomsRes, tenantsRes] = await Promise.all([
    db.from("contracts").select("*").eq("user_id", user.id).eq("status", "active"),
    db.from("rooms").select("*").eq("user_id", user.id),
    db.from("tenants").select("*").eq("user_id", user.id),
  ]);

  if (contractsRes.error) return c.json({ error: contractsRes.error.message }, 500);
  if (roomsRes.error) return c.json({ error: roomsRes.error.message }, 500);
  if (tenantsRes.error) return c.json({ error: tenantsRes.error.message }, 500);

  const rooms = roomsRes.data ?? [];
  const tenants = tenantsRes.data ?? [];

  // Filter to ensure only one active contract per room (safety against dirty data)
  const uniqueContractsMap = new Map();
  (contractsRes.data ?? []).forEach(c => {
    if (!uniqueContractsMap.has(c.room_id)) {
      uniqueContractsMap.set(c.room_id, c);
    }
  });

  const data = Array.from(uniqueContractsMap.values())
    .map((contract) => {
      const room = rooms.find((x) => String(x.id) === String(contract.room_id));
      const tenant = tenants.find((x) => String(x.id) === String(contract.tenant_id));
      return {
        ...contract,
        deposit_amount: contract.deposit,
        startDate: contract.start_date,
        roomName: room?.name ?? "", room_name: room?.name ?? "",
        roomPrice: room?.price ?? 0, room_price: room?.price ?? 0,
        hasAc: room?.has_ac ?? false, has_ac: room?.has_ac ?? false,
        numPeople: room?.num_people ?? 1, num_people: room?.num_people ?? 1,
        tenantName: tenant?.name ?? "", tenant_name: tenant?.name ?? "",
        tenantPhone: tenant?.phone ?? "", tenant_phone: tenant?.phone ?? "",
        tenantIdCard: tenant?.id_card ?? "", tenant_id_card: tenant?.id_card ?? "",
        tenantEmail: tenant?.email ?? "", tenant_email: tenant?.email ?? "",
        tenantAddress: tenant?.address ?? "", tenant_address: tenant?.address ?? "",
      };
    })
    .sort((a, b) => String(a.room_name).localeCompare(String(b.room_name)));

  return c.json({ data });
});

// GET single contract by ID (works for all statuses: active, ended, etc.)
rentalRoutes.get("/contracts/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid contract id" }, 400);

  const db = c.get("supabase");
  const { data: contract, error } = await db
    .from("contracts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !contract) return c.json({ error: "Contract not found" }, 404);

  const [roomRes, tenantRes] = await Promise.all([
    db.from("rooms").select("*").eq("id", contract.room_id).eq("user_id", user.id).maybeSingle(),
    db.from("tenants").select("*").eq("id", contract.tenant_id).eq("user_id", user.id).maybeSingle(),
  ]);

  const room = roomRes.data;
  const tenant = tenantRes.data;

  return c.json({
    data: {
      ...contract,
      deposit_amount: contract.deposit,
      startDate: contract.start_date,
      roomName: room?.name ?? "", room_name: room?.name ?? "",
      roomPrice: room?.price ?? 0, room_price: room?.price ?? 0,
      hasAc: room?.has_ac ?? false, has_ac: room?.has_ac ?? false,
      numPeople: room?.num_people ?? 1, num_people: room?.num_people ?? 1,
      tenantName: tenant?.name ?? "", tenant_name: tenant?.name ?? "",
      tenantPhone: tenant?.phone ?? "", tenant_phone: tenant?.phone ?? "",
      tenantIdCard: tenant?.id_card ?? "", tenant_id_card: tenant?.id_card ?? "",
      tenantEmail: tenant?.email ?? "", tenant_email: tenant?.email ?? "",
      tenantAddress: tenant?.address ?? "", tenant_address: tenant?.address ?? "",
    }
  });
});

rentalRoutes.post("/contracts", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, addContractSchema);
  if (!parsed.ok) return parsed.response;



  const db = c.get("supabase");

  // 1. Check if the room already has an active contract
  const { data: existingActive, error: checkError } = await db
    .from("contracts")
    .select("id")
    .eq("room_id", parsed.data.roomId)
    .eq("status", "active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkError) return c.json({ error: checkError.message }, 500);
  if (existingActive) {
    return c.json({ error: "Phòng này hiện đang có một hợp đồng hoạt động. Vui lòng kết thúc hợp đồng cũ trước khi tạo mới." }, 400);
  }

  // Check if room was reserved to carry over deposit
  const { data: reservation } = await db
    .from("deposits")
    .select("*")
    .eq("room_id", parsed.data.roomId)
    .eq("status", "active")
    .eq("type", "reservation")
    .maybeSingle();

  // 2. Get room to check for AC
  const { data: room, error: roomErr } = await db.from("rooms").select("*").eq("id", parsed.data.roomId).eq("user_id", user.id).single();
  if (roomErr || !room) return c.json({ error: roomErr?.message || "Room not found" }, 404);

  // 3. Get services to create snapshot
  const serviceIds = parsed.data.serviceIds ?? [];
  let appliedServicesSnapshot: any[] = [];
  if (serviceIds.length > 0) {
    const { data: services, error: sErr } = await db.from("services").select("*").eq("user_id", user.id).in("id", serviceIds);
    if (!sErr && services) {
      appliedServicesSnapshot = services.map(s => {
        const isElec = String(s.name || "").toLowerCase().includes("điện") || String(s.type || "").toLowerCase().includes("meter");
        const price = (isElec && room.has_ac && s.unit_price_ac > 0) ? s.unit_price_ac : s.unit_price;
        const occupantCount = Number(parsed.data.occupantCount || room.num_people || 1);
        
        let amount = price;
        if (s.type === "per_person") {
          amount = price * occupantCount;
        } else if (s.type === "per_room") {
          amount = price;
        }

        return {
          service_id: s.id, 
          name: s.name, 
          type: s.type,
          unit_price: s.unit_price, 
          unit_price_ac: s.unit_price_ac,
          applied_unit_price: price, 
          unit: s.unit,
          occupant_count: occupantCount,
          amount: amount,
          category: isElec ? "electricity" : (String(s.name || "").toLowerCase().includes("nước") ? "water" : "other")
        };
      });
    }
  }

  // 1. Create the contract
  const { data: contract, error: contractErr } = await db.from("contracts").insert({
    user_id: user.id,
    room_id: parsed.data.roomId,
    tenant_id: parsed.data.tenantId,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate || null,
    deposit: parsed.data.deposit,
    rent_amount: parsed.data.rentAmount ?? room.price,
    billing_day: parsed.data.billingDay || 5,
    electric_start: parsed.data.electricStart || 0,
    water_start: parsed.data.waterStart || 0,
    occupant_count: parsed.data.occupantCount || room.num_people,
    note: parsed.data.note || "",
    applied_services_snapshot: appliedServicesSnapshot,
    status: "active",
  }).select("*").single();

  if (contractErr) return c.json({ error: contractErr.message }, 400);

  // 2. Link services to contract
  if (serviceIds.length > 0) {
    const csRows = serviceIds.map((sid) => ({ user_id: user.id, contract_id: contract.id, service_id: sid }));
    await db.from("contract_services").insert(csRows);
  }

  // 3. Update room status to occupied
  await db.from("rooms").update({ status: "occupied" }).eq("id", parsed.data.roomId).eq("user_id", user.id);

  // 4. Record Deposit in Deposits Management
  if (parsed.data.deposit > 0) {
    const { data: tenant } = await db.from("tenants").select("name, phone").eq("id", parsed.data.tenantId).single();
    
    const { error: depErr } = await db.from("deposits").insert({
      user_id: user.id,
      room_id: parsed.data.roomId,
      contract_id: contract.id,
      tenant_name: tenant?.name || "Khách thuê",
      tenant_phone: tenant?.phone || "",
      amount: parsed.data.deposit,
      type: "contract",
      status: "active",
      recorded_at: parsed.data.startDate,
      note: `Tiền cọc hợp đồng phòng ${room.name}`,
    });

    if (depErr) {
      console.error("Failed to record deposit:", depErr.message);
      return c.json({ error: `Hợp đồng đã tạo nhưng không thể lưu thông tin tiền cọc: ${depErr.message}` }, 400);
    }

    // 5. Create Transaction for the income
    let amountToRecord = parsed.data.deposit;
    let txNote = `Thu cọc hợp đồng mới phòng ${room.name}`;
    
    if (reservation) {
      const reservationAmount = Number(reservation.amount || 0);
      amountToRecord = Math.max(0, parsed.data.deposit - reservationAmount);
      txNote = `Thu thêm cọc hợp đồng (đã trừ ${formatMoney(reservationAmount)} cọc giữ chỗ) - Phòng ${room.name}`;
      
      const { error: resUpdErr } = await db.from("deposits")
        .update({ status: "transferred", contract_id: contract.id })
        .eq("id", reservation.id);
        
      if (resUpdErr) console.error("Failed to update reservation status:", resUpdErr.message);
    }

    if (amountToRecord > 0 && parsed.data.walletId) {
      const { error: txErr } = await db.from("transactions").insert({
        user_id: user.id,
        wallet_id: parsed.data.walletId,
        type: "income",
        amount: amountToRecord,
        description: `Thu tiền cọc HĐ - Phòng ${room.name}${txNote ? ` (${txNote})` : ""}`,
        date: parsed.data.startDate,
        category_id: null,
        image_uri: null,
      });

      if (txErr) {
        console.error("Failed to create transaction:", txErr.message);
        return c.json({ error: `Hợp đồng đã tạo nhưng không thể tạo phiếu thu: ${txErr.message}` }, 400);
      }
      
      // Cập nhật số dư ví
      await updateWalletBalance(db, parsed.data.walletId, amountToRecord, 'income');
    }
  }

  await logAuditAction(db, user.id, "contract_created", "contract", contract.id, { roomId: parsed.data.roomId, deposit: parsed.data.deposit });

  return c.json({ data: contract }, 201);
});

rentalRoutes.patch("/contracts/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid contract id" }, 400);

  const parsed = await parseJson(c, updateContractSchema);
  if (!parsed.ok) return parsed.response;



  const db = c.get("supabase");

  // 1. Get current contract and room to recalculate snapshot if needed
  const { data: contract, error: fetchErr } = await db.from("contracts").select("*, rooms(*)").eq("id", id).eq("user_id", user.id).single();
  if (fetchErr || !contract) return c.json({ error: "Contract not found" }, 404);
  const room = contract.rooms;

  // 2. Prepare update payload
  const updatePayload: any = {
    start_date: parsed.data.startDate,
    deposit: parsed.data.deposit,
    occupant_count: parsed.data.occupantCount,
    updated_at: new Date().toISOString(),
  };

  // 3. Recalculate snapshot if services or occupantCount changed
  const serviceIds = parsed.data.serviceIds ?? [];
  if (serviceIds.length > 0 || parsed.data.occupantCount !== undefined) {
    const idsToFetch = serviceIds.length > 0 ? serviceIds : (await db.from("contract_services").select("service_id").eq("contract_id", id)).data?.map(x => x.service_id) || [];
    
    if (idsToFetch.length > 0) {
      const { data: services } = await db.from("services").select("*").eq("user_id", user.id).in("id", idsToFetch);
      if (services) {
        const occupantCount = Number(parsed.data.occupantCount || contract.occupant_count || 1);
        updatePayload.applied_services_snapshot = services.map(s => {
          const isElec = String(s.name || "").toLowerCase().includes("điện") || String(s.type || "").toLowerCase().includes("meter");
          const price = (isElec && room.has_ac && s.unit_price_ac > 0) ? s.unit_price_ac : s.unit_price;
          
          let amount = price;
          if (s.type === "per_person") amount = price * occupantCount;
          else if (s.type === "per_room") amount = price;

          return {
            service_id: s.id, name: s.name, type: s.type,
            unit_price: s.unit_price, unit_price_ac: s.unit_price_ac,
            applied_unit_price: price, unit: s.unit,
            occupant_count: occupantCount, amount: amount,
            category: isElec ? "electricity" : (String(s.name || "").toLowerCase().match(/nước|nuoc/i) ? "water" : "other")
          };
        });
      }
    }
  }

  const updateRes = await db.from("contracts").update(updatePayload).eq("id", id).eq("user_id", user.id).select("*").single();

  if (updateRes.error) return c.json({ error: updateRes.error.message }, 400);

  // 4. Update contract_services mapping table
  if (parsed.data.serviceIds !== undefined) {
    await db.from("contract_services").delete().eq("contract_id", id).eq("user_id", user.id);
    if (serviceIds.length > 0) {
      const rows = serviceIds.map((serviceId) => ({ user_id: user.id, contract_id: id, service_id: serviceId }));
      const insertRes = await db.from("contract_services").insert(rows);
      if (insertRes.error) return c.json({ error: insertRes.error.message }, 400);
    }
  }

  return c.json({ data: updateRes.data });
});

rentalRoutes.post("/contracts/:id/terminate", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid contract id" }, 400);

  const parsed = await parseJson(c, terminateContractSchema);
  if (!parsed.ok) return parsed.response;



  const db = c.get("supabase");
  const now = new Date().toISOString().split("T")[0];
  const refundDate = parsed.data.refundDate || now;

  // 1. Get contract details to get tenant_id and original deposit
  const { data: contract, error: cErr } = await db
    .from("contracts")
    .select("*, rooms(*), tenants(name)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (cErr || !contract) return c.json({ error: "Contract not found" }, 404);

  // 2. End the contract
  const updateContractRes = await db.from("contracts").update({
    status: "ended", 
    end_date: refundDate, 
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("user_id", user.id);

  if (updateContractRes.error) return c.json({ error: updateContractRes.error.message }, 400);

  // 2.5. Update associated deposits status
  await db.from("deposits")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("contract_id", id)
    .eq("user_id", user.id);

  // 3. Save deposit refund info
  const originalDeposit = Number(contract.deposit || 0);
  const refundAmount = Number(parsed.data.refundAmount || 0);
  const deductionAmount = Math.max(0, originalDeposit - refundAmount);

  const { error: refundErr } = await db.from("deposit_refunds").upsert({
    contract_id: id,
    tenant_id: contract.tenant_id,
    room_id: contract.room_id,
    original_deposit_amount: originalDeposit,
    refund_amount: refundAmount,
    deduction_amount: deductionAmount,
    refund_date: refundDate,
    refund_method: parsed.data.refundMethod || "Tiền mặt",
    note: parsed.data.note || "",
    user_id: user.id
  });

  if (refundErr) {
    console.error("Failed to save deposit refund:", refundErr.message);
  }

  // 4. Create transactions
  const refundWalletId = parsed.data.walletId;
  const settlementWalletId = parsed.data.settlementWalletId || refundWalletId;
  const settlementAmount = Number(parsed.data.settlementAmount || 0);

  // Helper to get room name (handle potential array from join)
  const roomData = Array.isArray(contract.rooms) ? contract.rooms[0] : contract.rooms;
  const roomName = roomData?.name || "Phòng";

  // Transaction for service settlement (Income)
  if (settlementAmount > 0) {
    if (!settlementWalletId) {
      console.warn("Settlement amount present but no wallet provided. Skipping transaction.");
    } else {
      const { error: tx1Err } = await db.from("transactions").insert({
        user_id: user.id,
        wallet_id: settlementWalletId,
        type: "income",
        amount: settlementAmount,
        description: `Thu tiền thanh lý HĐ - ${roomName} (Tất toán HĐ #${String(id).slice(-6)})`,
        date: refundDate,
        category_id: null,
        image_uri: null,
      });
      if (tx1Err) console.error("Error creating settlement transaction:", tx1Err.message);
      else await updateWalletBalance(db, settlementWalletId, settlementAmount, 'income');
    }
  }

  // Transaction for deposit refund (Expense)
  if (refundAmount > 0) {
    if (!refundWalletId) {
      console.warn("Refund amount present but no wallet provided. Skipping transaction.");
    } else {
      const { error: tx2Err } = await db.from("transactions").insert({
        user_id: user.id,
        wallet_id: refundWalletId,
        type: "expense",
        amount: refundAmount,
        description: `Trả tiền cọc - ${roomName} (Hoàn tiền cọc HĐ #${String(id).slice(-6)})`,
        date: refundDate,
        category_id: null,
        image_uri: null,
      });
      if (tx2Err) console.error("Error creating refund transaction:", tx2Err.message);
      else await updateWalletBalance(db, refundWalletId, refundAmount, 'expense');
    }
  }

  // 5. Final Sync: Ensure room is vacant
  const targetRoomId = contract.room_id;
  const { error: roomUpdateErr } = await db.from("rooms")
    .update({ 
      status: "vacant",
      updated_at: new Date().toISOString()
    })
    .eq("id", targetRoomId)
    .eq("user_id", user.id);

  if (roomUpdateErr) {
    console.error("Error updating room status to vacant:", roomUpdateErr.message);
    return c.json({ error: `Hợp đồng đã kết thúc nhưng không thể cập nhật trạng thái phòng: ${roomUpdateErr.message}` }, 400);
  }

  await logAuditAction(db, user.id, "contract_terminated", "contract", id, { 
    roomId: contract.room_id, 
    refundAmount, 
    settlementAmount,
    deduction: Number(contract.deposit || 0) - refundAmount 
  });

  return c.json({ ok: true, message: "Trả phòng thành công" });
});

// Route lấy dữ liệu tính toán thanh lý dự kiến
rentalRoutes.get("/contracts/:id/settlement-preview", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  const endDateStr = c.req.query("endDate") || new Date().toISOString().split('T')[0];
  const endDate = new Date(endDateStr);

  const db = c.get("supabase");
  const { data: contract, error } = await db.from("contracts").select("*, rooms(*)").eq("id", id).single();
  if (error || !contract) return c.json({ error: "Contract not found" }, 404);

  const { calculateProratedRent } = await import("../utils/rentCalc.js");
  const startOfLastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const result = calculateProratedRent(contract.rooms.price, startOfLastMonth, endDate);

  return c.json({ 
    data: {
      ...result,
      deposit: contract.deposit,
      suggestedRefund: Math.max(0, contract.deposit - result.totalAmount)
    } 
  });
});

rentalRoutes.get("/contracts/:id/refund", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid contract id" }, 400);

  const db = c.get("supabase");
  const { data, error } = await db
    .from("deposit_refunds")
    .select("*, tenants(name), rooms(name)")
    .eq("contract_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data });
});

rentalRoutes.delete("/contracts/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid contract id" }, 400);



  const db = c.get("supabase");
  const { data: contract, error: fetchErr } = await db.from("contracts").select("id, status, room_id").eq("id", id).eq("user_id", user.id).single();

  if (fetchErr || !contract) return c.json({ error: "Contract not found" }, 404);
  if (contract.status === "active") {
    return c.json({ error: "Không thể xóa hợp đồng đang hoạt động. Hãy kết thúc hợp đồng trước." }, 400);
  }

  await db.from("contract_services").delete().eq("contract_id", id).eq("user_id", user.id);
  const { error: deleteError } = await db.from("contracts").delete().eq("id", id).eq("user_id", user.id);
  if (deleteError) return c.json({ error: deleteError.message }, 400);

  // Update room status to vacant
  await db.from("rooms").update({ status: "vacant" }).eq("id", contract.room_id).eq("user_id", user.id);

  await logAuditAction(db, user.id, "contract_deleted", "contract", id, { roomId: contract.room_id });

  return c.json({ message: "Contract deleted successfully" });
});

rentalRoutes.get("/contracts/:id/services", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid contract id" }, 400);



  const db = c.get("supabase");
  const csRes = await db.from("contract_services").select("service_id").eq("contract_id", id).eq("user_id", user.id);
  if (csRes.error) return c.json({ error: csRes.error.message }, 500);

  const serviceIds = (csRes.data ?? []).map((x) => x.service_id);
  if (serviceIds.length === 0) return c.json({ data: [] });

  const servicesRes = await db.from("services").select("*").eq("user_id", user.id).in("id", serviceIds);
  if (servicesRes.error) return c.json({ error: servicesRes.error.message }, 500);

  const map = new Map((servicesRes.data ?? []).map((x) => [String(x.id), x]));
  const ordered = serviceIds.map((sid) => {
    const s = map.get(sid);
    if (!s) return null;
    return { ...s, unitPrice: s.unit_price, unitPriceAc: s.unit_price_ac };
  }).filter(Boolean);

  return c.json({ data: ordered });
});

export default rentalRoutes;
