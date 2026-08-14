import { Hono } from "hono";
import { z } from "zod";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { parseJson, toId } from "../utils/validation.js";
import { logAuditAction } from "../utils/audit.js";
import { updateWalletBalance } from "../utils/wallet.js";
import { summarizeRoomInvoices } from "../utils/billing.js";
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
  roomType: z.string().trim().optional().nullable(),
  room_type: z.string().trim().optional().nullable(),
});

const updateRoomSchema = z
  .object({
    name: z.string().min(1).optional(),
    price: z.number().nonnegative().optional(),
    hasAc: z.boolean().optional(),
    numPeople: z.number().int().positive().optional(),
    roomType: z.string().trim().optional().nullable(),
    room_type: z.string().trim().optional().nullable(),
    status: z.string().optional(),
    area: z.number().nonnegative().optional(),
    max_people: z.number().int().positive().optional(),
    maxPeople: z.number().int().positive().optional(),
    blockId: z.string().uuid().nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, "No fields to update");

const roomTypeSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
});

const updateRoomTypeSchema = roomTypeSchema.partial().refine((obj) => Object.keys(obj).length > 0, "No fields to update");

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
  unit: z.string().optional(),
  icon: z.string().optional(),
});

const updateServiceSchema = z
  .object({
    name: z.string().min(1).optional(),
    unitPrice: z.number().nonnegative().optional(),
    unit_price: z.number().nonnegative().optional(),
    unitPriceAc: z.number().nonnegative().optional(),
    unit_price_ac: z.number().nonnegative().optional(),
    unit: z.string().optional(),
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
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  deposit: z.number().nonnegative(),
  occupantCount: z.number().int().positive().optional(),
  note: z.string().optional(),
  serviceIds: z.array(z.string()).optional(),
  tenantName: z.string().trim().min(1).optional(),
  tenantPhone: z.string().trim().optional(),
  tenantEmail: z.string().trim().email().optional().or(z.literal("")),
  tenantIdCard: z.string().trim().optional(),
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

const normalizeTenantPhone = (phone?: string | null) => String(phone || "").replace(/\D/g, "");

// ═══════════════════════════════════════════════
// ROOMS
// ═══════════════════════════════════════════════

rentalRoutes.get("/room-types", async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");
  const { data, error } = await db
    .from("room_types")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: data ?? [] });
});

rentalRoutes.post("/room-types", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, roomTypeSchema);
  if (!parsed.ok) return parsed.response;

  const db = c.get("supabase");
  const { data, error } = await db
    .from("room_types")
    .upsert(
      {
        user_id: user.id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      },
      { onConflict: "user_id,name" }
    )
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data }, 201);
});

rentalRoutes.patch("/room-types/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid room type id" }, 400);

  const parsed = await parseJson(c, updateRoomTypeSchema);
  if (!parsed.ok) return parsed.response;

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) payload.name = parsed.data.name;
  if (parsed.data.description !== undefined) payload.description = parsed.data.description ?? null;

  const db = c.get("supabase");
  const { data, error } = await db
    .from("room_types")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

rentalRoutes.delete("/room-types/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid room type id" }, 400);

  const db = c.get("supabase");
  const { data: roomType, error: findError } = await db
    .from("room_types")
    .select("name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (findError) return c.json({ error: findError.message }, 500);
  if (!roomType) return c.json({ error: "Room type not found" }, 404);

  await db.from("rooms").update({ room_type: null }).eq("user_id", user.id).eq("room_type", roomType.name);
  const { error } = await db.from("room_types").delete().eq("id", id).eq("user_id", user.id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

rentalRoutes.get("/rooms", async (c) => {
  const user = c.get("user");
  const buildingId = c.req.query("buildingId") || c.req.query("facilityId") || c.req.query("boardingHouseId");


  const db = c.get("supabase");

  let roomsQuery = db.from("rooms").select("*").eq("user_id", user.id);
  if (buildingId) {
    roomsQuery = roomsQuery.eq("boarding_house_id", buildingId);
  }

  const [roomsRes, contractsRes, tenantsRes, reservationsRes, invoicesRes] = await Promise.all([
    roomsQuery,
    db.from("contracts").select("*").eq("user_id", user.id).eq("status", "active"),
    db.from("tenants").select("*").eq("user_id", user.id),
    db.from("deposits")
      .select("id,room_id,tenant_name,tenant_phone,amount,recorded_at,note")
      .eq("user_id", user.id)
      .eq("type", "reservation")
      .eq("status", "active"),
    // Outstanding debt is derived here rather than stored on the room: invoices
    // are the source of truth, and a denormalized column would drift every time
    // a payment lands via the SePay webhook.
    db.from("invoices")
      .select("room_id,total_amount,paid_amount,status,month,year")
      .eq("user_id", user.id),
  ]);

  if (roomsRes.error) return c.json({ error: roomsRes.error.message }, 500);
  if (contractsRes.error) return c.json({ error: contractsRes.error.message }, 500);
  if (tenantsRes.error) return c.json({ error: tenantsRes.error.message }, 500);
  if (reservationsRes.error) return c.json({ error: reservationsRes.error.message }, 500);
  if (invoicesRes.error) return c.json({ error: invoicesRes.error.message }, 500);

  const contracts = contractsRes.data ?? [];
  const tenants = tenantsRes.data ?? [];
  const reservations = reservationsRes.data ?? [];
  const invoiceSummaryByRoom = summarizeRoomInvoices(invoicesRes.data ?? []);

  const data = (roomsRes.data ?? [])
    .map((room) => {
      const contract = contracts.find((x) => String(x.room_id) === String(room.id));
      const reservation = reservations.find((x) => String(x.room_id) === String(room.id));
      const invoiceSummary = invoiceSummaryByRoom.get(String(room.id));
      const baseRoom = {
        ...room,
        outstanding_amount: invoiceSummary?.outstanding ?? 0,
        latest_invoice_status: invoiceSummary?.latestStatus ?? null,
        hasAc: room.has_ac,
        numPeople: room.num_people,
        roomType: room.room_type ?? null,
        room_type: room.room_type ?? null,
        building_id: room.boarding_house_id,
        facility_id: room.boarding_house_id,
        reservation_deposit_id: reservation?.id ?? null,
        reservation_tenant_name: reservation?.tenant_name ?? null,
        reservation_tenant_phone: reservation?.tenant_phone ?? null,
        reservation_amount: reservation ? Number(reservation.amount || 0) : null,
        reservation_date: reservation?.recorded_at ?? null,
        reservation_note: reservation?.note ?? null,
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

const insertDeposit = async (db: any, payload: Record<string, any>) => {
  return db.from("deposits").insert(payload).select("*").single();
};

const normalizeDepositStatus = (status: string | null | undefined) =>
  status === "active" ? "holding" : status;

const normalizeDepositText = (value: unknown) =>
  String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const getDepositDisplayDedupeKey = (deposit: any) => [
  deposit.room_id || "",
  normalizeDepositText(deposit.tenant_name),
  normalizeDepositText(deposit.tenant_phone),
  Number(deposit.amount || 0),
  deposit.recorded_at || "",
  normalizeDepositStatus(deposit.status) || "",
].join("|");

const dedupeDepositRowsForDisplay = (rows: any[]) => {
  const byKey = new Map<string, any>();

  for (const row of rows) {
    const key = getDepositDisplayDedupeKey(row);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }

    // Prefer rows already linked to a contract; otherwise keep the newest row.
    if (row.contract_id && !existing.contract_id) {
      byKey.set(key, row);
    }
  }

  return Array.from(byKey.values());
};

rentalRoutes.get("/deposits", async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");

  const ownedRoomsRes = await db.from("rooms").select("id").eq("user_id", user.id);
  if (ownedRoomsRes.error) return c.json({ error: ownedRoomsRes.error.message }, 500);

  const ownedRoomIds = (ownedRoomsRes.data ?? []).map((room: any) => room.id).filter(Boolean);
  let depositQuery = db
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
    .order("created_at", { ascending: false });

  if (ownedRoomIds.length > 0) {
    depositQuery = depositQuery.or(`user_id.eq.${user.id},room_id.in.(${ownedRoomIds.join(",")})`);
  } else {
    depositQuery = depositQuery.eq("user_id", user.id);
  }

  const { data, error } = await depositQuery;

  if (error) return c.json({ error: error.message }, 500);

  const formatted = dedupeDepositRowsForDisplay(data ?? []).map((d: any) => ({
    id: d.id,
    room_id: d.room_id,
    room_name: d.rooms?.name || "Phòng đã xóa",
    facility_name: d.rooms?.boarding_houses?.name || "Cơ sở đã xóa",
    tenant_name: d.tenant_name,
    tenant_phone: d.tenant_phone,
    amount: d.amount,
    deposit_date: d.recorded_at,
    status: normalizeDepositStatus(d.status),
    note: d.note,
    contract_id: d.contract_id,
    created_at: d.created_at,
  }));

  return c.json({ data: formatted });
});

rentalRoutes.post("/deposits", async (c) => {
  const user = c.get("user");
  console.log(">>> POST /deposits - authenticated user:", JSON.stringify(user));
  const parsed = await parseJson(c, depositSchema);
  if (!parsed.ok) return parsed.response;

  const db = c.get("supabase");

  const { data: room, error: roomError } = await db
    .from("rooms")
    .select("id,name,status")
    .eq("id", parsed.data.roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (roomError) return c.json({ error: roomError.message }, 500);
  if (!room) return c.json({ error: "Không tìm thấy phòng hoặc phòng không thuộc tài khoản của bạn." }, 404);

  const roomStatus = String(room.status || "").toLowerCase();
  if (!["vacant", "available"].includes(roomStatus)) {
    return c.json({ error: "Chỉ có thể nhận cọc cho phòng đang trống." }, 400);
  }

  const { data: existingDeposit, error: existingDepositError } = await db
    .from("deposits")
    .select("id")
    .eq("room_id", parsed.data.roomId)
    .eq("status", "active")
    .eq("type", "reservation")
    .maybeSingle();

  if (existingDepositError) return c.json({ error: existingDepositError.message }, 500);
  if (existingDeposit) return c.json({ error: "Phòng này đã có cọc giữ chỗ đang hiệu lực." }, 400);

  if (parsed.data.walletId) {
    const { data: wallet, error: walletError } = await db
      .from("wallets")
      .select("id")
      .eq("id", parsed.data.walletId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError) return c.json({ error: walletError.message }, 500);
    if (!wallet) return c.json({ error: "Ví nhận tiền cọc không tồn tại hoặc không thuộc tài khoản của bạn." }, 400);
  }

  const { data: deposit, error: depError } = await insertDeposit(db, {
    user_id: user.id,
    room_id: parsed.data.roomId,
    tenant_name: parsed.data.tenantName,
    tenant_phone: parsed.data.tenantPhone || "",
    amount: parsed.data.amount,
    type: "reservation",
    status: "active",
    recorded_at: parsed.data.depositDate,
    note: parsed.data.note || "Đặt cọc giữ chỗ",
  });

  if (depError) return c.json({ error: depError.message }, 400);

  const { error: roomUpdateError } = await db
    .from("rooms")
    .update({ status: "reserved" })
    .eq("id", parsed.data.roomId)
    .eq("user_id", user.id);

  if (roomUpdateError) {
    await db.from("deposits").delete().eq("id", deposit.id).eq("user_id", user.id);
    return c.json({ error: `Không thể chuyển phòng sang trạng thái đã cọc: ${roomUpdateError.message}` }, 400);
  }

  if (parsed.data.amount > 0 && parsed.data.walletId) {
    const { error: txError } = await db.from("transactions").insert({
      user_id: user.id,
      wallet_id: parsed.data.walletId,
      type: "income",
      amount: parsed.data.amount,
      description: `Thu tiền cọc giữ chỗ - Phòng ${room.name} - ${parsed.data.tenantName}${parsed.data.note ? ` (${parsed.data.note})` : ""}`,
      date: parsed.data.depositDate,
      category_id: null,
      image_uri: null,
    });

    if (txError) {
      await db.from("deposits").delete().eq("id", deposit.id).eq("user_id", user.id);
      await db.from("rooms").update({ status: room.status }).eq("id", parsed.data.roomId).eq("user_id", user.id);
      return c.json({ error: `Không thể tạo phiếu thu tiền cọc: ${txError.message}` }, 400);
    }

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
    const { data: activeContract } = await db
      .from("contracts")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    // A deposit record can be changed after it has been linked to a lease.
    // Never make an occupied, contracted room vacant as a side effect.
    if (activeContract) return c.json({ data });
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

// End a reservation when the prospective tenant does not proceed.
// The deposit was already recorded as income on receipt, so this action does
// not create a second transaction or alter the wallet balance. It only closes
// the reservation and makes the room available again.
rentalRoutes.post("/deposits/:id/forfeit", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid deposit id" }, 400);

  const db = c.get("supabase");
  const { data: deposit, error: depositError } = await db
    .from("deposits")
    .select("id,room_id,tenant_name,amount,type,status,note")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (depositError) return c.json({ error: depositError.message }, 500);
  if (!deposit) return c.json({ error: "Không tìm thấy khoản cọc." }, 404);
  if (deposit.type !== "reservation" || deposit.status !== "active") {
    return c.json({ error: "Chỉ có thể bỏ cọc giữ chỗ đang hiệu lực." }, 400);
  }

  const { data: activeContract, error: contractError } = await db
    .from("contracts")
    .select("id")
    .eq("room_id", deposit.room_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (contractError) return c.json({ error: contractError.message }, 500);
  if (activeContract) {
    return c.json({ error: "Phòng đã có hợp đồng hiệu lực; không thể bỏ cọc giữ chỗ." }, 400);
  }

  const forfeitureNote = "Bỏ cọc giữ chỗ — khách không nhận phòng, tiền cọc được giữ lại.";
  const { data: updatedDeposit, error: updateDepositError } = await db
    .from("deposits")
    .update({
      status: "cancelled",
      note: deposit.note ? `${deposit.note}\n${forfeitureNote}` : forfeitureNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("type", "reservation")
    .eq("status", "active")
    .select("*")
    .maybeSingle();
  if (updateDepositError) return c.json({ error: updateDepositError.message }, 400);
  if (!updatedDeposit) return c.json({ error: "Khoản cọc đã được xử lý ở một thao tác khác." }, 409);

  const { data: reopenedRoom, error: roomError } = await db
    .from("rooms")
    .update({ status: "vacant", updated_at: new Date().toISOString() })
    .eq("id", deposit.room_id)
    .eq("user_id", user.id)
    .eq("status", "reserved")
    .select("id")
    .maybeSingle();
  if (roomError || !reopenedRoom) {
    // Keep the reservation effective if freeing the room failed. The original
    // receipt transaction remains untouched in either case.
    await db.from("deposits").update({
      status: "active",
      note: deposit.note ?? null,
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("user_id", user.id);
    return c.json({ error: roomError ? `Chưa thể mở lại phòng: ${roomError.message}` : "Trạng thái phòng đã thay đổi; không thể bỏ cọc tự động." }, 409);
  }

  await logAuditAction(db, user.id, "reservation_deposit_forfeited", "deposit", id, {
    roomId: deposit.room_id,
    tenantName: deposit.tenant_name,
    amount: Number(deposit.amount || 0),
  });

  return c.json({ data: updatedDeposit, message: "Đã bỏ cọc và chuyển phòng về trạng thái trống." });
});

rentalRoutes.post("/rooms", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, addRoomSchema);
  if (!parsed.ok) return parsed.response;



  const db = c.get("supabase");
  const roomType = parsed.data.roomType ?? parsed.data.room_type ?? null;
  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    name: parsed.data.name.trim(),
    price: parsed.data.price,
    has_ac: parsed.data.hasAc ?? false,
    num_people: parsed.data.numPeople ?? 1,
    room_type: roomType || null,
    status: "vacant",
  };
  let { data, error } = await db.from("rooms").insert(insertPayload).select("*").single();

  // Retry without room_type if column doesn't exist (migration 020 not applied)
  if (error && (error.message?.includes("room_type") || error.message?.includes("schema cache"))) {
    const { room_type: _, ...fallbackPayload } = insertPayload;
    const fallback = await db.from("rooms").insert(fallbackPayload).select("*").single();
    data = fallback.data;
    error = fallback.error;
  }

  if (!error && roomType) {
    try {
      await db.from("room_types").upsert(
        { user_id: user.id, name: roomType },
        { onConflict: "user_id,name" }
      );
    } catch { /* room_types table may not exist */ }
  }

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data: { ...data, hasAc: data.has_ac, numPeople: data.num_people, roomType: data.room_type ?? null } }, 201);
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
  const roomType = parsed.data.roomType ?? parsed.data.room_type;
  if (roomType !== undefined) payload.room_type = roomType || null;
  if (parsed.data.status !== undefined) payload.status = parsed.data.status;
  if (parsed.data.area !== undefined) payload.area = parsed.data.area;
  if (parsed.data.max_people !== undefined) payload.max_people = parsed.data.max_people;
  if (parsed.data.maxPeople !== undefined) payload.max_people = parsed.data.maxPeople;
  if (parsed.data.blockId !== undefined) {
    if (parsed.data.blockId) {
      const [{ data: block }, { data: room }] = await Promise.all([
        c.get("supabase").from("facility_blocks").select("id, boarding_house_id").eq("id", parsed.data.blockId).eq("owner_id", user.id).maybeSingle(),
        c.get("supabase").from("rooms").select("boarding_house_id").eq("id", id).eq("user_id", user.id).maybeSingle(),
      ]);
      if (!block || !room || String(block.boarding_house_id) !== String(room.boarding_house_id)) return c.json({ error: "Dãy không thuộc cơ sở của phòng." }, 400);
    }
    payload.block_id = parsed.data.blockId;
  }
  payload.updated_at = new Date().toISOString();

  const db = c.get("supabase");
  if (roomType) {
    try {
      await db.from("room_types").upsert(
        { user_id: user.id, name: roomType },
        { onConflict: "user_id,name" }
      );
    } catch { /* room_types table may not exist */ }
  }
  let { data, error } = await db.from("rooms").update(payload).eq("id", id).eq("user_id", user.id).select("*").single();

  // Retry without room_type if column doesn't exist
  if (error && (error.message?.includes("room_type") || error.message?.includes("schema cache"))) {
    const { room_type: _, ...fallbackPayload } = payload;
    const fallback = await db.from("rooms").update(fallbackPayload).eq("id", id).eq("user_id", user.id).select("*").single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data: { ...data, hasAc: data.has_ac, numPeople: data.num_people, roomType: data.room_type ?? null } });
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

  const formatted = (data ?? []).map(t => ({
    ...t,
    idCard: t.id_card,
    inviteCode: t.invite_code,
    inviteStatus: t.invite_status,
    inviteCodeExpiresAt: t.invite_code_expires_at
  }));
  return c.json({ data: formatted });
});

rentalRoutes.post("/tenants", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, addTenantSchema);
  if (!parsed.ok) return parsed.response;



  const db = c.get("supabase");
  
  if (parsed.data.phone && parsed.data.phone.trim() !== "") {
    const { data: existing } = await db.from("tenants")
      .select("*")
      .eq("user_id", user.id)
      .eq("phone", parsed.data.phone.trim())
      .maybeSingle();
    
    if (existing) {
      return c.json({
        error: "Số điện thoại này đã được sử dụng cho người thuê khác. Vui lòng kiểm tra lại."
      }, 400);
    }
  }

  const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  const inviteCodeExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db.from("tenants").insert({
    user_id: user.id,
    name: parsed.data.name.trim(),
    phone: parsed.data.phone ?? "",
    id_card: parsed.data.idCard ?? "",
    address: parsed.data.address ?? "",
    invite_code: inviteCode,
    invite_status: "pending",
    invite_code_expires_at: inviteCodeExpiresAt,
  }).select("*").single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({
    data: {
      ...data,
      idCard: data.id_card,
      inviteCode: data.invite_code,
      inviteStatus: data.invite_status,
      inviteCodeExpiresAt: data.invite_code_expires_at
    }
  }, 201);
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

  if (parsed.data.phone && parsed.data.phone.trim() !== "") {
    const { data: existing } = await db.from("tenants")
      .select("*")
      .eq("user_id", user.id)
      .eq("phone", parsed.data.phone.trim())
      .neq("id", id)
      .maybeSingle();

    if (existing) {
      return c.json({
        error: "Số điện thoại này đã được sử dụng cho người thuê khác. Vui lòng kiểm tra lại."
      }, 400);
    }
  }

  const { data, error } = await db.from("tenants").update(payload).eq("id", id).eq("user_id", user.id).select("*").single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({
    data: {
      ...data,
      idCard: data.id_card,
      inviteCode: data.invite_code,
      inviteStatus: data.invite_status,
      inviteCodeExpiresAt: data.invite_code_expires_at
    }
  });
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
    unit: parsed.data.unit ?? "",
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
  if (parsed.data.unit !== undefined) payload.unit = parsed.data.unit;
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

// Starter set for a new owner. These are editable suggestions, not authoritative
// prices — they exist so that a brand-new account can reach a correct invoice
// without hand-entering five services first. Nothing in the invoicing path falls
// back to these numbers; an owner who skips this still gets an explicit
// "chưa cấu hình dịch vụ" prompt rather than an invented price.
const DEFAULT_SERVICE_TEMPLATES = [
  { name: "Tiền điện", type: "metered", unit_price: 3500, unit_price_ac: 4000, unit: "kWh", icon: "⚡" },
  { name: "Tiền nước", type: "metered", unit_price: 15000, unit_price_ac: 0, unit: "m³", icon: "💧" },
  { name: "Internet / Wifi", type: "per_room", unit_price: 100000, unit_price_ac: 0, unit: "phòng", icon: "📶" },
  { name: "Tiền rác", type: "per_room", unit_price: 20000, unit_price_ac: 0, unit: "phòng", icon: "🗑️" },
  { name: "Gửi xe", type: "per_person", unit_price: 100000, unit_price_ac: 0, unit: "xe", icon: "🛵" },
] as const;

rentalRoutes.post("/services/seed-defaults", async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");

  const { data: existing, error: existingError } = await db
    .from("services")
    .select("name")
    .eq("user_id", user.id);

  if (existingError) return c.json({ error: existingError.message }, 500);

  // Re-running this must not create duplicates, so skip any template whose name
  // the owner already has (case/whitespace-insensitive).
  const takenNames = new Set(
    (existing ?? []).map((s: any) => String(s.name || "").trim().toLowerCase()),
  );
  const toInsert = DEFAULT_SERVICE_TEMPLATES.filter(
    (t) => !takenNames.has(t.name.trim().toLowerCase()),
  ).map((t) => ({
    user_id: user.id,
    name: t.name,
    type: t.type,
    unit_price: t.unit_price,
    unit_price_ac: t.unit_price_ac,
    unit: t.unit,
    icon: t.icon,
    active: true,
  }));

  if (toInsert.length === 0) {
    return c.json({ data: [], created: 0, skipped: DEFAULT_SERVICE_TEMPLATES.length });
  }

  const { data, error } = await db.from("services").insert(toInsert).select("*");
  if (error) return c.json({ error: error.message }, 400);

  const formatted = (data ?? []).map((s: any) => ({
    ...s,
    unitPrice: s.unit_price,
    unitPriceAc: s.unit_price_ac,
  }));

  return c.json(
    {
      data: formatted,
      created: formatted.length,
      skipped: DEFAULT_SERVICE_TEMPLATES.length - formatted.length,
    },
    201,
  );
});

// ═══════════════════════════════════════════════
// CONTRACTS
// ═══════════════════════════════════════════════

rentalRoutes.get("/contracts", async (c) => {
  const user = c.get("user");
  const roomId = c.req.query("roomId");
  const status = c.req.query("status");

  const db = c.get("supabase");
  let query = db.from("contracts").select("*").eq("user_id", user.id);
  if (roomId) query = query.eq("room_id", roomId);
  if (status) query = query.eq("status", status);

  const contractsRes = await query.order("start_date", { ascending: false });
  if (contractsRes.error) return c.json({ error: contractsRes.error.message }, 500);

  const contracts = contractsRes.data ?? [];
  if (contracts.length === 0) return c.json({ data: [] });

  const roomIds = [...new Set(contracts.map((contract) => contract.room_id).filter(Boolean))];
  const tenantIds = [...new Set(contracts.map((contract) => contract.tenant_id).filter(Boolean))];

  const [roomsRes, tenantsRes] = await Promise.all([
    roomIds.length > 0
      ? db.from("rooms").select("*").eq("user_id", user.id).in("id", roomIds)
      : Promise.resolve({ data: [], error: null }),
    tenantIds.length > 0
      ? db.from("tenants").select("*").eq("user_id", user.id).in("id", tenantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (roomsRes.error) return c.json({ error: roomsRes.error.message }, 500);
  if (tenantsRes.error) return c.json({ error: tenantsRes.error.message }, 500);

  const rooms = roomsRes.data ?? [];
  const tenants = tenantsRes.data ?? [];

  const data = contracts.map((contract) => {
    const room = rooms.find((x) => String(x.id) === String(contract.room_id));
    const tenant = tenants.find((x) => String(x.id) === String(contract.tenant_id));
    return {
      ...contract,
      deposit_amount: contract.deposit,
      startDate: contract.start_date,
      endDate: contract.end_date,
      billingDay: contract.billing_day,
      electricStart: contract.electric_start,
      waterStart: contract.water_start,
      occupantCount: contract.occupant_count,
      roomName: room?.name ?? "",
      room_name: room?.name ?? "",
      roomPrice: room?.price ?? 0,
      room_price: room?.price ?? 0,
      hasAc: room?.has_ac ?? false,
      has_ac: room?.has_ac ?? false,
      numPeople: room?.num_people ?? 1,
      num_people: room?.num_people ?? 1,
      tenantName: tenant?.name ?? "",
      tenant_name: tenant?.name ?? "",
      tenantPhone: tenant?.phone ?? "",
      tenant_phone: tenant?.phone ?? "",
    };
  });

  return c.json({ data });
});

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
  let appliedServicesSnapshot = contract.applied_services_snapshot;

  if (!Array.isArray(appliedServicesSnapshot) || appliedServicesSnapshot.length === 0) {
    const servicesRes = await db
      .from("contract_services")
      .select("service_snapshot, service_id, service_name, service_type, calculation_type, unit_price, unit_price_ac, unit")
      .eq("contract_id", id)
      .eq("user_id", user.id);

    let serviceRows = servicesRes.data ?? [];
    if (
      servicesRes.error?.message?.includes("contract_services.service_snapshot") ||
      servicesRes.error?.message?.includes("schema cache")
    ) {
      const fallbackServicesRes = await db
        .from("contract_services")
        .select("service_id")
        .eq("contract_id", id)
        .eq("user_id", user.id);

      if (fallbackServicesRes.error) return c.json({ error: fallbackServicesRes.error.message }, 500);

      serviceRows = (fallbackServicesRes.data ?? []).map((service) => ({
          service_snapshot: null,
          service_id: service.service_id,
          service_name: null,
          service_type: null,
          calculation_type: null,
          unit_price: null,
          unit_price_ac: null,
          unit: null,
      }));
    } else if (servicesRes.error) {
      return c.json({ error: servicesRes.error.message }, 500);
    }

    appliedServicesSnapshot = serviceRows.map((service) => ({
      service_id: service.service_id,
      name: service.service_snapshot?.name ?? service.service_name ?? "",
      category: service.service_snapshot?.category ?? "other",
      type: service.service_snapshot?.type ?? service.calculation_type ?? service.service_type ?? "fixed",
      unit: service.service_snapshot?.unit ?? service.unit ?? null,
      display_unit: service.service_snapshot?.display_unit ?? null,
      unit_price: Number(service.service_snapshot?.unit_price ?? service.unit_price ?? 0),
      unit_price_ac: Number(service.service_snapshot?.unit_price_ac ?? service.unit_price_ac ?? 0),
      applied_unit_price: Number(service.service_snapshot?.applied_unit_price ?? service.unit_price ?? 0),
      amount: service.service_snapshot?.amount ?? null,
      is_metered: service.service_snapshot?.is_metered ?? false,
    }));
  }

  return c.json({
    data: {
      ...contract,
      applied_services_snapshot: appliedServicesSnapshot ?? [],
      deposit_amount: contract.deposit,
      startDate: contract.start_date,
      endDate: contract.end_date,
      billingDay: contract.billing_day,
      electricStart: contract.electric_start,
      waterStart: contract.water_start,
      occupantCount: contract.occupant_count,
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

  // Validate deposit and wallet requirement before any mutations
  const reservationAmount = reservation ? Number(reservation.amount || 0) : 0;
  const amountToRecord = Math.max(0, Number(parsed.data.deposit || 0) - reservationAmount);

  let walletId = parsed.data.walletId;

  if (amountToRecord > 0) {
    const { data: userWallets, error: checkWalletsErr } = await db
      .from("wallets")
      .select("id")
      .eq("user_id", user.id);

    if (!checkWalletsErr && (!userWallets || userWallets.length === 0)) {
      const defaultWallets = [
        { user_id: user.id, name: "Ví cá nhân", type: "personal", icon: "wallet", color: "#8b5cf6", active: true },
        { user_id: user.id, name: "Chuyển khoản", type: "personal", icon: "card", color: "#2563eb", active: true },
        { user_id: user.id, name: "Tiền mặt", type: "personal", icon: "cash", color: "#10b981", active: true },
      ];
      const { data: seeded } = await db.from("wallets").insert(defaultWallets).select("id");
      if (seeded && seeded.length > 0) {
        if (!walletId) {
          walletId = seeded[0].id;
        }
      }
    }

    if (!walletId) {
      const { data: activeWallets, error: activeWalletsErr } = await db
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      
      if (!activeWalletsErr && activeWallets && activeWallets.length > 0) {
        walletId = activeWallets[0].id;
      }
    }

    if (!walletId) {
      return c.json({ error: "Tiền cọc không hợp lệ: Vui lòng chọn ví nhận tiền cọc." }, 400);
    }
    const { data: wallet, error: walletErr } = await db
      .from("wallets")
      .select("id")
      .eq("id", walletId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletErr || !wallet) {
      return c.json({ error: "Tiền cọc không hợp lệ: Ví nhận tiền cọc không tồn tại hoặc không thuộc tài khoản của bạn." }, 400);
    }
  }


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
    
    const { error: depErr } = await insertDeposit(db, {
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
      
      // Rollback contract creation
      await db.from("contract_services").delete().eq("contract_id", contract.id);
      await db.from("contracts").delete().eq("id", contract.id);
      await db.from("rooms").update({ status: "vacant" }).eq("id", parsed.data.roomId).eq("user_id", user.id);
      
      return c.json({ error: `Tạo hợp đồng thất bại do không thể lưu thông tin tiền cọc: ${depErr.message}` }, 400);
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

    if (amountToRecord > 0 && walletId) {
      const { error: txErr } = await db.from("transactions").insert({
        user_id: user.id,
        wallet_id: walletId,
        type: "income",
        amount: amountToRecord,
        description: `Thu tiền cọc HĐ - Phòng ${room.name}${txNote ? ` (${txNote})` : ""}`,
        date: parsed.data.startDate,
        category_id: null,
        image_uri: null,
      });

      if (txErr) {
        console.error("Failed to create transaction:", txErr.message);
        
        // Rollback contract, deposit, and room status
        await db.from("deposits").delete().eq("contract_id", contract.id);
        await db.from("contract_services").delete().eq("contract_id", contract.id);
        await db.from("contracts").delete().eq("id", contract.id);
        await db.from("rooms").update({ status: "vacant" }).eq("id", parsed.data.roomId).eq("user_id", user.id);
        
        if (reservation) {
          await db.from("deposits")
            .update({ status: "active", contract_id: null })
            .eq("id", reservation.id);
        }
        
        return c.json({ error: `Tạo hợp đồng thất bại do không thể tạo phiếu thu tiền cọc: ${txErr.message}` }, 400);
      }
      
      // Cập nhật số dư ví
      await updateWalletBalance(db, walletId, amountToRecord, 'income');
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

  // 2. Prepare update payload. Only write fields that were actually supplied
  // so a partial contract update never clears existing data by accident.
  const updatePayload: any = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.startDate !== undefined) updatePayload.start_date = parsed.data.startDate;
  if (parsed.data.endDate !== undefined) updatePayload.end_date = parsed.data.endDate || null;
  if (parsed.data.deposit !== undefined) updatePayload.deposit = parsed.data.deposit;
  if (parsed.data.occupantCount !== undefined) updatePayload.occupant_count = parsed.data.occupantCount;
  if (parsed.data.note !== undefined) updatePayload.note = parsed.data.note;

  const tenantPayload: any = {};
  if (parsed.data.tenantName !== undefined) tenantPayload.name = parsed.data.tenantName.trim();
  if (parsed.data.tenantPhone !== undefined) {
    const phone = normalizeTenantPhone(parsed.data.tenantPhone);
    if (phone && !/^0\d{9}$/.test(phone)) {
      return c.json({ error: "Số điện thoại khách thuê phải là số Việt Nam 10 chữ số." }, 400);
    }
    tenantPayload.phone = phone;
  }
  if (parsed.data.tenantEmail !== undefined) tenantPayload.email = parsed.data.tenantEmail.trim() || null;
  if (parsed.data.tenantIdCard !== undefined) tenantPayload.id_card = parsed.data.tenantIdCard.trim();

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

  if (Object.keys(tenantPayload).length > 0) {
    tenantPayload.updated_at = new Date().toISOString();
    const tenantRes = await db
      .from("tenants")
      .update(tenantPayload)
      .eq("id", contract.tenant_id)
      .eq("user_id", user.id);
    if (tenantRes.error) return c.json({ error: tenantRes.error.message }, 400);
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

  // Prefer the database transaction when the additive migration is deployed.
  // During a rolling deploy, older databases may not have the RPC yet; only in
  // that specific case do we retain the legacy sequence below.
  const atomicRes = await db.rpc("terminate_contract_atomic", {
    p_contract_id: id,
    p_user_id: user.id,
    p_refund_amount: Number(parsed.data.refundAmount || 0),
    p_refund_date: refundDate,
    p_refund_method: parsed.data.refundMethod || "Tiền mặt",
    p_note: parsed.data.note || "",
    p_refund_wallet_id: parsed.data.walletId || null,
    p_settlement_wallet_id: parsed.data.settlementWalletId || parsed.data.walletId || null,
    p_settlement_amount: Number(parsed.data.settlementAmount || 0),
  });
  if (!atomicRes.error) {
    const result = atomicRes.data as any;
    if (result?.error) return c.json({ error: String(result.error) }, 400);
    return c.json({ ok: true, message: "Trả phòng thành công", data: result });
  }

  const rpcMissing = atomicRes.error.code === "PGRST202"
    || atomicRes.error.code === "42883"
    || String(atomicRes.error.message || "").includes("terminate_contract_atomic");
  if (!rpcMissing) {
    console.error("Atomic contract termination failed:", atomicRes.error.message);
    return c.json({ error: "Không thể hoàn tất trả phòng an toàn. Dữ liệu chưa bị thay đổi." }, 400);
  }
  console.warn("terminate_contract_atomic is not deployed; using legacy termination flow.");

  // 2. End the contract
  const updateContractRes = await db.from("contracts").update({
    status: "ended", 
    end_date: refundDate, 
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("user_id", user.id);

  if (updateContractRes.error) return c.json({ error: updateContractRes.error.message }, 400);

  // 2.5. Update associated deposits status
  // Cập nhật cả deposit liên kết với hợp đồng này và bất kỳ cọc đang giữ nào của phòng
  await db.from("deposits")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("contract_id", id)
    .eq("user_id", user.id);

  await db.from("deposits")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("room_id", contract.room_id)
    .eq("status", "active")
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
  // ĐỂ PHẢN ÁNH ĐÚNG BẢN CHẤT KẾ TOÁN:
  // Nếu có khấu trừ cọc để thanh toán tiền nhà (settlementAmount > 0),
  // hệ thống phải ghi nhận Chi đủ số tiền cọc gốc (originalDeposit),
  // và Thu số tiền phòng thanh lý (settlementAmount).
  // Số tiền thực chi hoàn trả sẽ là: originalDeposit - settlementAmount.
  const expenseAmount = settlementAmount > 0 ? originalDeposit : refundAmount;

  if (expenseAmount > 0) {
    if (!refundWalletId) {
      console.warn("Refund amount present but no wallet provided. Skipping transaction.");
    } else {
      const { error: tx2Err } = await db.from("transactions").insert({
        user_id: user.id,
        wallet_id: refundWalletId,
        type: "expense",
        amount: expenseAmount,
        description: `Trả tiền cọc - ${roomName} (Hoàn tiền cọc HĐ #${String(id).slice(-6)})`,
        date: refundDate,
        category_id: null,
        image_uri: null,
      });
      if (tx2Err) console.error("Error creating refund transaction:", tx2Err.message);
      else await updateWalletBalance(db, refundWalletId, expenseAmount, 'expense');
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
  const { data: contract, error } = await db.from("contracts").select("*, rooms(*)").eq("id", id).eq("user_id", user.id).single();
  if (error || !contract) return c.json({ error: "Contract not found" }, 404);

  // Kiểm tra xem hóa đơn tháng hiện tại đã được thanh toán chưa
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const { data: paidInvoice } = await db
    .from("invoices")
    .select("id")
    .eq("contract_id", id)
    .eq("year", currentYear)
    .eq("month", currentMonth)
    .eq("status", "paid")
    .maybeSingle();

  const isAlreadyPaid = Boolean(paidInvoice);

  const { calculateProratedRent } = await import("../utils/rentCalc.js");
  const startOfLastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const contractStartDate = contract.start_date ? new Date(contract.start_date) : null;
  const prorationStartDate = (contractStartDate && contractStartDate > startOfLastMonth) ? contractStartDate : startOfLastMonth;
  const result = calculateProratedRent(contract.rooms.price, prorationStartDate, endDate);

  const actualTotalAmount = isAlreadyPaid ? 0 : result.totalAmount;

  return c.json({ 
    data: {
      ...result,
      totalAmount: actualTotalAmount,
      isAlreadyPaid,
      deposit: contract.deposit,
      suggestedRefund: Math.max(0, contract.deposit - actualTotalAmount)
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
