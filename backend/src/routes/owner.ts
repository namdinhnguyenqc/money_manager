import { Hono } from "hono";
import { z } from "zod";

import { requireAuth, requireOwner, clearAuthCacheForUser } from "../middleware/auth.js";
import { cacheMiddleware, invalidateCache } from "../middleware/cache.js";
import type { AppEnv } from "../types.js";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../lib/supabase.js";
import Tesseract from "tesseract.js";
import sharp from "sharp";

import { isRolePremium, limitsFromRole, getRoleId } from "../lib/roles.js";
import { registerFcmToken, unregisterFcmToken } from "../services/firebaseService.js";
import { getNotificationPreferences, saveNotificationPreferences } from "../services/notificationPreferences.js";
import { notifyOwnerPaymentReceived } from "../services/ownerPaymentNotifications.js";
import { getTenantUserIdByInvoiceId, notifyPaymentSuccess } from "../services/notificationService.js";

/**
 * Resolve the plan limits for the given user.
 *
 * Single query: users JOIN roles — no hardcoded UUIDs, no two-step lookup.
 * NULL limit columns in the roles table = unlimited (Infinity).
 */
async function getPlanLimits(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("max_boarding_houses, max_rooms_per_house, roles(name, max_boarding_houses, max_rooms_per_house)")
    .eq("id", userId)
    .single();

  const role = (data as any)?.roles ?? null;
  const user = data as any;

  const maxBoardingHouses = user?.max_boarding_houses !== null && user?.max_boarding_houses !== undefined
    ? user.max_boarding_houses
    : (role?.max_boarding_houses ?? Infinity);

  const maxRoomsPerHouse = user?.max_rooms_per_house !== null && user?.max_rooms_per_house !== undefined
    ? user.max_rooms_per_house
    : (role?.max_rooms_per_house ?? Infinity);

  return {
    roleName: role?.name ?? "USER",
    isPremium: isRolePremium(role?.name),
    limits: {
      maxBoardingHouses,
      maxRoomsPerHouse,
    },
  };
}


const ownerRoutes = new Hono<AppEnv>();

ownerRoutes.use("*", requireAuth, requireOwner);

// ============================================================
// DASHBOARD BULK ENDPOINT (PHASE 4)
// ============================================================
ownerRoutes.get("/dashboard-init", cacheMiddleware(30), async (c) => {
  const currentUser = c.get("user");
  const supabase = c.get("supabase");

  // Parallel Supabase queries for performance
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);

  const [bhRes, roomsRes, walletsRes, settingsRes, transactionsRes, invoicesRes, depositsRes] = await Promise.all([
    supabase.from("boarding_houses").select("id").eq("owner_id", currentUser.id),
    supabase.from("rooms").select("id, status").eq("user_id", currentUser.id),
    supabase.from("wallets").select("id, name, balance").eq("user_id", currentUser.id),
    supabase.from("users").select("id, status, is_profile_completed").eq("id", currentUser.id).single(),
    supabase
      .from("transactions")
      .select("id, type, amount, description, date, wallet_id, category_id, invoice_id")
      .eq("user_id", currentUser.id)
      // Home only renders current-month cash flow. Historical transactions are
      // loaded by the dedicated ledger screen, so do not block app startup on them.
      .gte("date", currentMonthStart.toISOString().slice(0, 10))
      .order("date", { ascending: false })
      .limit(300),
    supabase
      .from("invoices")
      // Dashboard calculations only require invoice totals and period. Removing
      // nested invoice_items dramatically reduces JSON and database work.
      .select("id, room_id, month, year, total_amount, paid_amount, status, created_at")
      .eq("user_id", currentUser.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(600),
    supabase
      .from("deposits")
      .select("id, amount, status")
      .eq("user_id", currentUser.id)
      .eq("status", "holding")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  return c.json({
    boardingHouses: bhRes.data || [],
    rooms: (roomsRes.data || []).map((room) => ({
      ...room,
      status: String(room.status || "").trim().toLowerCase(),
    })),
    wallets: walletsRes.data || [],
    transactions: transactionsRes.data || [],
    invoices: invoicesRes.data || [],
    deposits: depositsRes.data || [],
    tradingStats: null,
    settings: settingsRes.data || {}
  });
});

// Mirrors the client-side heuristic in dashboard/page.tsx's isDepositTransaction —
// deposit-tagged transactions are excluded from income/expense so they don't
// double-count against invoice-driven revenue figures.
const isDepositTransactionRow = (t: { categories?: { name?: string | null }[] | { name?: string | null } | null; description?: string | null }) => {
  const categoryRow = Array.isArray(t.categories) ? t.categories[0] : t.categories;
  const category = String(categoryRow?.name || "").toLowerCase();
  const desc = String(t.description || "").toLowerCase();
  return (
    category.includes("cọc") ||
    category.includes("deposit") ||
    desc.includes("tiền cọc") ||
    desc.includes("cọc phòng") ||
    desc.includes("deposit")
  );
};

type RevenueComposition = { rent: number; electricity: number; water: number; other: number };
const emptyRevenueComposition = (): RevenueComposition => ({ rent: 0, electricity: 0, water: 0, other: 0 });

const parseLocalDate = (value: string) => {
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(year, Math.max(0, month - 1), day || 1);
};

const addInvoicePaymentComposition = (
  target: RevenueComposition,
  transaction: any,
  invoice: any | undefined,
  items: any[],
) => {
  const received = Number(transaction.amount || 0);
  if (received <= 0) return;

  if (!invoice) {
    const categoryRow = Array.isArray(transaction.categories) ? transaction.categories[0] : transaction.categories;
    const label = `${transaction.description || ""} ${categoryRow?.name || ""}`.toLowerCase();
    if (label.includes("tiền phòng") || label.includes("thu tiền phòng")) target.rent += received;
    else if (label.includes("điện")) target.electricity += received;
    else if (label.includes("nước")) target.water += received;
    else target.other += received;
    return;
  }

  // Invoice payments are allocated proportionally to the invoice lines. This
  // keeps this card on the same cash basis as the cash-flow chart, including
  // partial payments, rather than reporting unpaid invoices as revenue.
  const total = Number(invoice.total_amount || 0);
  if (total <= 0) { target.other += received; return; }
  const allocated = Math.min(received, Number(transaction.metadata?.allocated_amount ?? received));
  const ratio = Math.min(1, allocated / total);
  const roomFee = Math.max(0, Number(invoice.room_fee || 0));
  target.rent += roomFee * ratio;

  let itemTotal = 0;
  for (const item of items) {
    const amount = Math.max(0, Number(item.amount || 0));
    itemTotal += amount;
    const name = String(item.name || "").toLowerCase();
    if (name.includes("điện") || name.includes("electric")) target.electricity += amount * ratio;
    else if (name.includes("nước") || name.includes("water")) target.water += amount * ratio;
    else target.other += amount * ratio;
  }

  // Previous debt or legacy lines without an item are still money received,
  // but do not belong to rent/electricity/water.
  const uncovered = Math.max(0, total - roomFee - itemTotal);
  target.other += uncovered * ratio;
  // Preserve overpayments in cashflow and revenue composition as other income.
  if (received > allocated) target.other += received - allocated;
};

// Aggregated monthly income/expense for the dashboard cash-flow chart.
// Deliberately separate from /dashboard-init (which only ships current-month
// raw transactions to keep app-startup payload small) — this returns
// pre-aggregated per-month totals only, so a wide time window (up to 18
// months) stays cheap regardless of transaction volume.
ownerRoutes.get("/cashflow-summary", cacheMiddleware(60), async (c) => {
  const currentUser = c.get("user");
  const supabase = c.get("supabase");

  const requestedMonths = Number(c.req.query("months") || 12);
  const months = Math.min(18, Math.max(1, Number.isFinite(requestedMonths) ? requestedMonths : 12));

  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount, date, description, invoice_id, metadata, categories(name)")
    .eq("user_id", currentUser.id)
    .gte("date", rangeStart.toISOString().slice(0, 10))
    .limit(5000);

  if (error) return c.json({ error: error.message }, 500);

  const buckets = new Map<string, { month: number; year: number; income: number; expense: number; composition: RevenueComposition }>();
  for (let i = 0; i < months; i++) {
    const d = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + i, 1);
    buckets.set(`${d.getFullYear()}-${d.getMonth()}`, { month: d.getMonth() + 1, year: d.getFullYear(), income: 0, expense: 0, composition: emptyRevenueComposition() });
  }

  const invoiceIds = [...new Set((data || []).map((row: any) => row.invoice_id).filter(Boolean))];
  const [invoicesRes, itemsRes] = invoiceIds.length
    ? await Promise.all([
      supabase.from("invoices").select("id, room_fee, total_amount").eq("user_id", currentUser.id).in("id", invoiceIds),
      supabase.from("invoice_items").select("invoice_id, name, amount").eq("user_id", currentUser.id).in("invoice_id", invoiceIds),
    ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (invoicesRes.error || itemsRes.error) return c.json({ error: invoicesRes.error?.message || itemsRes.error?.message }, 500);

  const invoicesById = new Map((invoicesRes.data || []).map((invoice: any) => [String(invoice.id), invoice]));
  const itemsByInvoiceId = new Map<string, any[]>();
  for (const item of itemsRes.data || []) {
    const key = String((item as any).invoice_id);
    itemsByInvoiceId.set(key, [...(itemsByInvoiceId.get(key) || []), item]);
  }

  for (const row of data || []) {
    if (isDepositTransactionRow(row)) continue;
    const d = parseLocalDate(row.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const amount = Number(row.amount || 0);
    if (row.type === "income") {
      bucket.income += amount;
      addInvoicePaymentComposition(bucket.composition, row, invoicesById.get(String((row as any).invoice_id)), itemsByInvoiceId.get(String((row as any).invoice_id)) || []);
    }
    else if (row.type === "expense") bucket.expense += amount;
  }

  const result = Array.from(buckets.values()).map((b) => ({ ...b, profit: b.income - b.expense }));
  return c.json({ months: result });
});

// One source of truth for the owner dashboard. Monetary labels deliberately
// remain distinct: billed revenue is invoice value, collected cash is posted
// income, and profit is billed revenue minus recorded expense.
ownerRoutes.get("/dashboard-summary", cacheMiddleware(30), async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");
  const now = new Date();
  const month = Math.min(12, Math.max(1, Number(c.req.query("month") || now.getMonth() + 1)));
  const year = Math.min(2100, Math.max(2000, Number(c.req.query("year") || now.getFullYear())));
  const facilityId = c.req.query("facilityId") || null;
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10);

  const [housesRes, roomsRes, invoicesRes, txRes, contractsRes] = await Promise.all([
    db.from("boarding_houses").select("id, name").eq("owner_id", user.id).order("name"),
    db.from("rooms").select("id, name, status, price, boarding_house_id").eq("user_id", user.id),
    db.from("invoices").select("id, room_id, total_amount, paid_amount, due_date, status").eq("user_id", user.id).eq("month", month).eq("year", year),
    db.from("transactions").select("id, type, amount, date, description, invoice_id, contract_id, categories(name)").eq("user_id", user.id).gte("date", monthStart).lte("date", monthEnd).limit(5000),
    db.from("contracts").select("id, room_id, end_date, status").eq("user_id", user.id),
  ]);
  const firstError = housesRes.error || roomsRes.error || invoicesRes.error || txRes.error || contractsRes.error;
  if (firstError) return c.json({ error: firstError.message }, 500);

  const houses = housesRes.data || [];
  const rooms = (roomsRes.data || []).filter((room: any) => !facilityId || String(room.boarding_house_id) === facilityId);
  const roomIds = new Set(rooms.map((room: any) => String(room.id)));
  const invoices = (invoicesRes.data || []).filter((invoice: any) => roomIds.has(String(invoice.room_id)));
  // Payments can arrive in this month for an invoice issued in a prior month.
  // Fetch only the invoice ids referenced by the month's transactions so cash
  // collection remains date-correct without loading the full invoice history.
  const paymentInvoiceIds = [...new Set((txRes.data || []).map((tx: any) => tx.invoice_id).filter(Boolean))];
  const paymentInvoicesRes = paymentInvoiceIds.length
    ? await db.from("invoices").select("id, room_id").eq("user_id", user.id).in("id", paymentInvoiceIds)
    : { data: [], error: null };
  if (paymentInvoicesRes.error) return c.json({ error: paymentInvoicesRes.error.message }, 500);
  const invoiceById = new Map([...(invoices as any[]), ...(paymentInvoicesRes.data || [])].map((invoice: any) => [String(invoice.id), invoice]));
  const contractRoomById = new Map((contractsRes.data || []).map((contract: any) => [String(contract.id), String(contract.room_id)]));
  const inScopeTransaction = (tx: any) => {
    const invoice = tx.invoice_id ? invoiceById.get(String(tx.invoice_id)) : null;
    if (invoice) return roomIds.has(String(invoice.room_id));
    // Contract-linked expenses/income can be scoped to a facility. General
    // ledger entries have no facility field and therefore stay global only.
    if (tx.contract_id) return roomIds.has(String(contractRoomById.get(String(tx.contract_id))));
    return !facilityId;
  };
  const txs = (txRes.data || []).filter((tx: any) => !isDepositTransactionRow(tx) && inScopeTransaction(tx));

  const today = new Date().toISOString().slice(0, 10);
  const blank = () => ({ billed: 0, collected: 0, receivable: 0, overdue: 0, notDue: 0, expense: 0, overdueCount: 0, overdueDaysTotal: 0 });
  const totals = blank();
  for (const invoice of invoices) {
    const billed = Number((invoice as any).total_amount || 0);
    const paid = Math.min(billed, Number((invoice as any).paid_amount || 0));
    const remaining = Math.max(0, billed - paid);
    totals.billed += billed;
    totals.receivable += remaining;
    if (remaining > 0) {
      const dueDate = String((invoice as any).due_date || monthEnd);
      if (today > dueDate) {
        totals.overdue += remaining;
        totals.overdueCount += 1;
        totals.overdueDaysTotal += Math.max(0, Math.floor((Date.parse(today) - Date.parse(dueDate)) / 86_400_000));
      } else totals.notDue += remaining;
    }
  }
  const expenseByCategory = new Map<string, number>();
  for (const tx of txs) {
    const amount = Number((tx as any).amount || 0);
    if ((tx as any).type === "income") totals.collected += amount;
    if ((tx as any).type === "expense") {
      totals.expense += amount;
      const categoryRow = Array.isArray((tx as any).categories) ? (tx as any).categories[0] : (tx as any).categories;
      const label = String(categoryRow?.name || "Khác");
      expenseByCategory.set(label, (expenseByCategory.get(label) || 0) + amount);
    }
  }
  const profit = totals.billed - totals.expense;
  const occupancy = {
    total: rooms.length,
    occupied: rooms.filter((room: any) => String(room.status).toLowerCase() === "occupied").length,
    vacant: rooms.filter((room: any) => ["vacant", "available"].includes(String(room.status).toLowerCase())).length,
    maintenance: rooms.filter((room: any) => String(room.status).toLowerCase() === "maintenance").length,
    expiringContracts: (contractsRes.data || []).filter((contract: any) => contract.status === "active" && roomIds.has(String(contract.room_id)) && contract.end_date && contract.end_date >= today && contract.end_date <= new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)).length,
  };
  const byFacility = houses.map((house: any) => {
    const houseRooms = (roomsRes.data || []).filter((room: any) => String(room.boarding_house_id) === String(house.id));
    const houseRoomIds = new Set(houseRooms.map((room: any) => String(room.id)));
    const houseInvoices = (invoicesRes.data || []).filter((invoice: any) => houseRoomIds.has(String(invoice.room_id)));
    const billed = houseInvoices.reduce((sum: number, invoice: any) => sum + Number(invoice.total_amount || 0), 0);
    const receivable = houseInvoices.reduce((sum: number, invoice: any) => sum + Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)), 0);
    const overdue = houseInvoices.reduce((sum: number, invoice: any) => sum + (Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)) > 0 && today > String(invoice.due_date || monthEnd) ? Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)) : 0), 0);
    const collected = (txRes.data || []).filter((tx: any) => tx.type === "income" && !isDepositTransactionRow(tx) && houseRoomIds.has(String(invoiceById.get(String(tx.invoice_id))?.room_id))).reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
    const occupied = houseRooms.filter((room: any) => String(room.status).toLowerCase() === "occupied").length;
    return { id: house.id, name: house.name, occupancyRate: houseRooms.length ? Math.round((occupied / houseRooms.length) * 100) : 0, collectedRate: billed ? Math.round((collected / billed) * 100) : 0, overdue, receivable, billed, collected, roomCount: houseRooms.length, occupied };
  });

  return c.json({
    period: { month, year }, facilities: houses, scope: { facilityId },
    totals: { ...totals, profit, margin: totals.billed > 0 ? profit / totals.billed : 0, netCashflow: totals.collected - totals.expense, collectionRate: totals.billed > 0 ? totals.collected / totals.billed : 0, averageOverdueDays: totals.overdueCount ? Math.round(totals.overdueDaysTotal / totals.overdueCount) : 0 },
    occupancy, facilitiesPerformance: byFacility.sort((a, b) => b.overdue - a.overdue || a.collectedRate - b.collectedRate),
    expenseComposition: [...expenseByCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, amount]) => ({ name, amount })),
  });
});

const boardingHouseSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  description: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

const updateBoardingHouseSchema = boardingHouseSchema.partial();

const roomSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  area: z.number().nonnegative().optional(),
  maxPeople: z.number().int().positive().optional(),
  blockId: z.string().uuid().nullable().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]).default("AVAILABLE"),
});

const updateRoomSchema = roomSchema.partial();

const mapRentalStatusToOwner = (status?: string) => {
  if (status === "occupied") return "OCCUPIED";
  if (status === "maintenance") return "MAINTENANCE";
  return "AVAILABLE";
};

const mapOwnerStatusToRental = (status?: string) => {
  if (status === "OCCUPIED") return "occupied";
  if (status === "MAINTENANCE") return "maintenance";
  return "vacant";
};

ownerRoutes.get("/boarding-houses", cacheMiddleware(30), async (c) => {
  const currentUser = c.get("user");
  const { page = "1", limit = "20", status = "" } = c.req.query();

  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  let query = c
    .get("supabase")
    .from("boarding_houses")
    .select("*, rooms(id, status)", { count: "exact" })
    .eq("owner_id", currentUser.id);

  if (status) {
    query = query.eq("status", status);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching boarding houses:", error);
    return c.json({ error: "Failed to fetch boarding houses" }, 500);
  }

  return c.json({
    data: data?.map((bh) => {
      const rooms = Array.isArray(bh.rooms) ? bh.rooms : [];
      const countByStatus = (statuses: string[]) => rooms.filter((room: any) => {
        const statusValue = String(room.status || "").toLowerCase();
        return statuses.includes(statusValue);
      }).length;

      return {
        id: bh.id,
        name: bh.name,
        address: bh.address,
        description: bh.description,
        latitude: bh.latitude,
        longitude: bh.longitude,
        status: bh.status,
        ownerId: bh.owner_id,
        createdAt: bh.created_at,
        room_count: rooms.length,
        roomCount: rooms.length,
        vacant_count: countByStatus(["vacant", "available"]),
        vacantCount: countByStatus(["vacant", "available"]),
        occupied_count: countByStatus(["occupied", "occupied_soon"]),
        occupiedCount: countByStatus(["occupied", "occupied_soon"]),
        maintenance_count: countByStatus(["maintenance"]),
        maintenanceCount: countByStatus(["maintenance"]),
        reserved_count: countByStatus(["reserved"]),
        reservedCount: countByStatus(["reserved"]),
      };
    }),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count || 0,
    },
  });
});

ownerRoutes.get("/boarding-houses/:id", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");

  const { data, error } = await c
    .get("supabase")
    .from("boarding_houses")
    .select("*")
    .eq("id", bhId)
    .eq("owner_id", currentUser.id)
    .single();

  if (error || !data) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }

  return c.json({
    id: data.id,
    name: data.name,
    address: data.address,
    description: data.description,
    latitude: data.latitude,
    longitude: data.longitude,
    status: data.status,
    ownerId: data.owner_id,
    createdAt: data.created_at,
  });
});

ownerRoutes.get("/boarding-houses/:id/blocks", async (c) => {
  const currentUser = c.get("user");
  const boardingHouseId = c.req.param("id");
  const db = c.get("supabase");
  const { data, error } = await db
    .from("facility_blocks")
    .select("id, name, boarding_house_id, created_at")
    .eq("owner_id", currentUser.id)
    .eq("boarding_house_id", boardingHouseId)
    .order("name", { ascending: true });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: data ?? [] });
});

ownerRoutes.post("/boarding-houses/:id/blocks", async (c) => {
  const currentUser = c.get("user");
  const boardingHouseId = c.req.param("id");
  const parsed = z.object({ name: z.string().trim().min(1).max(120) }).safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Tên dãy là bắt buộc." }, 400);
  const db = c.get("supabase");
  const { data: house } = await db.from("boarding_houses").select("id").eq("id", boardingHouseId).eq("owner_id", currentUser.id).maybeSingle();
  if (!house) return c.json({ error: "Không tìm thấy cơ sở." }, 404);
  const { data, error } = await db.from("facility_blocks").insert({ owner_id: currentUser.id, boarding_house_id: boardingHouseId, name: parsed.data.name }).select("id, name, boarding_house_id, created_at").single();
  if (error) return c.json({ error: error.message.includes("unique") ? "Tên dãy đã tồn tại trong cơ sở này." : error.message }, 400);
  return c.json({ data }, 201);
});

ownerRoutes.patch("/boarding-houses/:id/blocks/:blockId", async (c) => {
  const currentUser = c.get("user");
  const parsed = z.object({ name: z.string().trim().min(1).max(120) }).safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Tên dãy là bắt buộc." }, 400);
  const { data, error } = await c.get("supabase").from("facility_blocks").update({ name: parsed.data.name, updated_at: new Date().toISOString() }).eq("id", c.req.param("blockId")).eq("boarding_house_id", c.req.param("id")).eq("owner_id", currentUser.id).select("id, name, boarding_house_id, created_at").single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ data });
});

ownerRoutes.delete("/boarding-houses/:id/blocks/:blockId", async (c) => {
  const currentUser = c.get("user");
  const db = c.get("supabase");
  const blockId = c.req.param("blockId");
  // Keeping rooms is intentional: they become "Không phân dãy" via ON DELETE SET NULL.
  const { error } = await db.from("facility_blocks").delete().eq("id", blockId).eq("boarding_house_id", c.req.param("id")).eq("owner_id", currentUser.id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

ownerRoutes.post("/boarding-houses", async (c) => {
  const currentUser = c.get("user");
  const parsed = await c.req.json();

  const validation = boardingHouseSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json(
      { error: "Invalid data", details: validation.error.issues },
      400,
    );
  }

  // ── Plan limit check ───────────────────────────────────────
  const { roleName, limits } = await getPlanLimits(currentUser.id);
  if (limits.maxBoardingHouses !== Infinity) {
    const { count } = await c
      .get("supabase")
      .from("boarding_houses")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", currentUser.id);

    if ((count ?? 0) >= limits.maxBoardingHouses) {
      return c.json(
        {
          error: `Tài khoản của bạn (gói ${roleName.replace("OWNER_", "")}) chỉ cho phép tối đa ${limits.maxBoardingHouses} nhà trọ. Vui lòng nâng cấp để mở rộng giới hạn.`,
          code: "PLAN_LIMIT_REACHED",
          limit: limits.maxBoardingHouses,
          current: count,
          upgrade_required: true,
        },
        403,
      );
    }
  }
  // ──────────────────────────────────────────────────────────

  const { name, address, description, latitude, longitude, status } =
    validation.data;

  const { data: bh, error } = await c
    .get("supabase")
    .from("boarding_houses")
    .insert({
      name,
      address,
      description,
      latitude,
      longitude,
      status,
      owner_id: currentUser.id,
    })
    .select()
    .single();

  invalidateCache("/owner/boarding-houses", currentUser.id);
  invalidateCache("/owner/dashboard-init", currentUser.id);

  if (error) {
    console.error("Error creating boarding house:", error);
    return c.json({ error: "Failed to create boarding house" }, 500);
  }

  return c.json(
    {
      id: bh.id,
      name: bh.name,
      address: bh.address,
      description: bh.description,
      latitude: bh.latitude,
      longitude: bh.longitude,
      status: bh.status,
      ownerId: bh.owner_id,
      createdAt: bh.created_at,
    },
    201,
  );
});

ownerRoutes.patch("/boarding-houses/:id", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");
  const parsed = await c.req.json();

  const validation = updateBoardingHouseSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json(
      { error: "Invalid data", details: validation.error.issues },
      400,
    );
  }

  const existing = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", bhId)
    .single();

  if (!existing.data || existing.data.owner_id !== currentUser.id) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }

  const updateData: Record<string, unknown> = { ...validation.data };
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await c
    .get("supabase")
    .from("boarding_houses")
    .update(updateData)
    .eq("id", bhId)
    .select()
    .single();

  if (error) {
    console.error("Error updating boarding house:", error);
    return c.json({ error: "Failed to update boarding house" }, 500);
  }

  return c.json({
    id: data.id,
    name: data.name,
    address: data.address,
    description: data.description,
    latitude: data.latitude,
    longitude: data.longitude,
    status: data.status,
    ownerId: data.owner_id,
    createdAt: data.created_at,
  });
});

ownerRoutes.delete("/boarding-houses/:id", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");

  const existing = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", bhId)
    .single();

  if (!existing.data || existing.data.owner_id !== currentUser.id) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }



  const { error } = await c
    .get("supabase")
    .from("boarding_houses")
    .delete()
    .eq("id", bhId);

  if (error) {
    console.error("Error deleting boarding house:", error);
    return c.json({ error: "Failed to delete boarding house" }, 500);
  }

  return c.json({ success: true });
});

ownerRoutes.get("/boarding-houses/:id/rooms", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");
  const { status = "" } = c.req.query();

  if (currentUser.role !== "ADMIN" && currentUser.role !== "SUPER_ADMIN") {
    const bhCheck = await c
      .get("supabase")
      .from("boarding_houses")
      .select("owner_id")
      .eq("id", bhId)
      .maybeSingle();

    if (bhCheck.data && bhCheck.data.owner_id && bhCheck.data.owner_id !== currentUser.id) {
      return c.json({ error: "Boarding house not found or access denied" }, 404);
    }
  }

  let query = c
    .get("supabase")
    .from("rooms")
    .select("*")
    .eq("boarding_house_id", bhId);

  if (status) {
    query = query.eq("status", status);
  }
  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching rooms:", error);
    return c.json({ error: "Failed to fetch rooms" }, 500);
  }

  return c.json({
    data: data?.map((r) => ({
      ...r,
      id: r.id,
      name: r.name,
      boardingHouseId: r.boarding_house_id,
      boarding_house_id: r.boarding_house_id,
      building_id: r.boarding_house_id,
      facility_id: r.boarding_house_id,
      price: r.price,
      area: r.area ?? 0,
      maxPeople: r.max_people ?? 1,
      numPeople: r.num_people ?? 0,
      hasAc: r.has_ac ?? false,
      status: r.status,
      createdAt: r.created_at,
    })),
  });
});

ownerRoutes.post("/boarding-houses/:id/rooms", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");
  const parsed = await c.req.json();

  const bhCheck = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", bhId)
    .single();

  if (!bhCheck.data || bhCheck.data.owner_id !== currentUser.id) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }

  const validation = roomSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json(
      { error: "Invalid data", details: validation.error.issues },
      400,
    );
  }

  // ── Plan limit check ───────────────────────────────────────
  const { roleName, limits } = await getPlanLimits(currentUser.id);
  if (limits.maxRoomsPerHouse !== Infinity) {
    const { count } = await c
      .get("supabase")
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("boarding_house_id", bhId)
      .eq("user_id", currentUser.id);

    if ((count ?? 0) >= limits.maxRoomsPerHouse) {
      return c.json(
        {
          error: `Tài khoản của bạn (gói ${roleName.replace("OWNER_", "")}) chỉ cho phép tối đa ${limits.maxRoomsPerHouse} phòng trên mỗi nhà trọ. Vui lòng nâng cấp để mở rộng giới hạn.`,
          code: "PLAN_LIMIT_REACHED",
          limit: limits.maxRoomsPerHouse,
          current: count,
          upgrade_required: true,
        },
        403,
      );
    }
  }
  // ──────────────────────────────────────────────────────────

  const { name, price, status, area, maxPeople, blockId } = validation.data;

  if (blockId) {
    const { data: block } = await c.get("supabase").from("facility_blocks").select("id").eq("id", blockId).eq("boarding_house_id", bhId).eq("owner_id", currentUser.id).maybeSingle();
    if (!block) return c.json({ error: "Dãy không thuộc cơ sở đã chọn." }, 400);
  }

  const { data: room, error } = await c
    .get("supabase")
    .from("rooms")
    .insert({
      user_id: currentUser.id,
      name,
      boarding_house_id: bhId,
      price,
      area: area ?? 0,
      max_people: maxPeople ?? 1,
      block_id: blockId ?? null,
      status,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating room:", error);
    return c.json({ error: "Failed to create room" }, 500);
  }

  invalidateCache("/owner/boarding-houses", currentUser.id);
  invalidateCache("/owner/dashboard-init", currentUser.id);

  return c.json(
    {
      id: room.id,
      name: room.name,
      boardingHouseId: room.boarding_house_id,
      price: room.price,
      area: room.area,
      maxPeople: room.max_people,
      status: room.status,
      block_id: room.block_id,
      createdAt: room.created_at,
    },
    201,
  );
});

ownerRoutes.patch("/rooms/:id", async (c) => {
  const currentUser = c.get("user");
  const roomId = c.req.param("id");
  const parsed = await c.req.json();

  const roomCheck = await c
    .get("supabase")
    .from("rooms")
    .select("boarding_house_id")
    .eq("id", roomId)
    .single();

  if (!roomCheck.data) {
    return c.json({ error: "Room not found" }, 404);
  }

  const bhCheck = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", roomCheck.data.boarding_house_id)
    .single();

  if (!bhCheck.data || bhCheck.data.owner_id !== currentUser.id) {
    return c.json({ error: "Access denied" }, 403);
  }

  const validation = updateRoomSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json(
      { error: "Invalid data", details: validation.error.issues },
      400,
    );
  }

  const updateData: Record<string, unknown> = { ...validation.data };
  if (validation.data.blockId !== undefined) updateData.block_id = validation.data.blockId;
  delete updateData.blockId;
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await c
    .get("supabase")
    .from("rooms")
    .update(updateData)
    .eq("id", roomId)
    .select()
    .single();

  if (error) {
    console.error("Error updating room:", error);
    return c.json({ error: "Failed to update room" }, 500);
  }

  invalidateCache("/owner/boarding-houses", currentUser.id);
  invalidateCache("/owner/dashboard-init", currentUser.id);

  return c.json({
    id: data.id,
    name: data.name,
    boardingHouseId: data.boarding_house_id,
    price: data.price,
    status: data.status,
    createdAt: data.created_at,
  });
});

ownerRoutes.delete("/rooms/:id", async (c) => {
  const currentUser = c.get("user");
  const roomId = c.req.param("id");

  const roomCheck = await c
    .get("supabase")
    .from("rooms")
    .select("boarding_house_id")
    .eq("id", roomId)
    .single();

  if (!roomCheck.data) {
    return c.json({ error: "Room not found" }, 404);
  }

  const bhCheck = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", roomCheck.data.boarding_house_id)
    .single();

  if (!bhCheck.data || bhCheck.data.owner_id !== currentUser.id) {
    return c.json({ error: "Access denied" }, 403);
  }



  const { error } = await c
    .get("supabase")
    .from("rooms")
    .delete()
    .eq("id", roomId);

  if (error) {
    console.error("Error deleting room:", error);
    return c.json({ error: "Failed to delete room" }, 500);
  }

  invalidateCache("/owner/boarding-houses", currentUser.id);
  invalidateCache("/owner/dashboard-init", currentUser.id);

  return c.json({ success: true });
});

ownerRoutes.get("/notifications", async (c) => {
  const currentUser = c.get("user");
  const { data, error } = await supabaseAdmin
    .from("rental_notifications")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch owner notifications:", error.message);
    // Deploys and database migrations may complete a few minutes apart. Keep
    // the inbox usable until the idempotent notification migration is applied.
    if (error.code === "42P01" || error.code === "PGRST205") {
      return c.json({ data: [], unreadCount: 0 });
    }
    return c.json({ error: "Failed to fetch notifications" }, 500);
  }
  const rows = (data ?? []).map((item: any) => {
    const payload = item.payload || {};
    const type = String(item.event_type || payload.type || "").toLowerCase();
    let href = "/owner/notifications";

    if (type.includes("invoice") || type.includes("payment")) {
      if (payload.invoice_id || payload.invoiceId) {
        href = `/invoices/${payload.invoice_id || payload.invoiceId}`;
      } else if (type.includes("paid")) {
        href = "/invoices?status=paid";
      } else {
        href = "/invoices";
      }
    } else if (type.includes("contract")) {
      if (payload.contract_id || payload.contractId) {
        href = `/contracts/${payload.contract_id || payload.contractId}`;
      } else {
        href = "/contracts";
      }
    } else if (type.includes("repair") || type.includes("feedback")) {
      href = "/owner/feedback";
    }

    return {
      id: item.id,
      eventType: type,
      title: payload.title ?? item.event_type ?? "Thông báo hệ thống",
      body: payload.body ?? payload.message ?? "",
      readAt: item.read_at,
      createdAt: item.created_at,
      href,
      payload,
    };
  });

  return c.json({
    data: rows,
    unreadCount: rows.filter((item) => !item.readAt).length,
  });
});

const notificationPreferencesSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  paymentReceivedEnabled: z.boolean().optional(),
  paymentSentEnabled: z.boolean().optional(),
  paymentReminderEnabled: z.boolean().optional(),
});

ownerRoutes.get("/notification-preferences", async (c) => {
  const currentUser = c.get("user");
  return c.json({ data: await getNotificationPreferences(currentUser.id) });
});

ownerRoutes.patch("/notification-preferences", async (c) => {
  const currentUser = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = notificationPreferencesSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Cài đặt thông báo không hợp lệ" }, 400);
  try {
    return c.json({ data: await saveNotificationPreferences(currentUser.id, parsed.data) });
  } catch (error: any) {
    return c.json({ error: error.message || "Không thể lưu cài đặt thông báo" }, 500);
  }
});

const notificationDeviceSchema = z.object({
  token: z.string().min(10),
  deviceType: z.enum(["ios", "android", "web"]),
  deviceName: z.string().max(100).optional(),
});

ownerRoutes.post("/notification-devices", async (c) => {
  const currentUser = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = notificationDeviceSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Device token không hợp lệ" }, 400);
  const result = await registerFcmToken(
    currentUser.id,
    parsed.data.token,
    parsed.data.deviceType,
    parsed.data.deviceName,
    "owner",
  );
  return result.success ? c.json({ success: true }) : c.json({ error: result.error }, 500);
});

ownerRoutes.delete("/notification-devices", async (c) => {
  const currentUser = c.get("user");
  const body = await c.req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) return c.json({ error: "Device token is required" }, 400);
  const result = await unregisterFcmToken(currentUser.id, token);
  return result.success ? c.json({ success: true }) : c.json({ error: result.error }, 500);
});

ownerRoutes.post("/notifications/:id/read", async (c) => {
  const currentUser = c.get("user");
  const notificationId = c.req.param("id");

  const { data, error } = await supabaseAdmin
    .from("rental_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", currentUser.id)
    .select()
    .single();

  if (error) {
    console.error("Failed to mark owner notification as read:", error.message);
    return c.json({ error: "Failed to mark notification as read" }, 500);
  }
  return c.json({ data });
});

ownerRoutes.post("/notifications/read-all", async (c) => {
  const currentUser = c.get("user");
  await supabaseAdmin
    .from("rental_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", currentUser.id)
    .is("read_at", null);

  return c.json({ success: true });
});


ownerRoutes.get("/audit-logs", async (c) => {
  const currentUser = c.get("user");
  const { data, error } = await c
    .get("supabase")
    .from("rental_audit_logs")
    .select("*")
    .eq("actor_user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return c.json({ error: "Failed to fetch audit logs" }, 500);
  return c.json({
    data: (data ?? []).map((item: any) => ({
      id: String(item.id),
      actor: currentUser.email ?? currentUser.id,
      action: item.action,
      resourceType: item.resource_type,
      resourceId: item.resource_id,
      createdAt: item.created_at,
    })),
  });
});

ownerRoutes.get("/sepay/events", async (c) => {
  const currentUser = c.get("user");
  const db = c.get("supabase");

  // Get user's invoices to retrieve their payment codes
  const { data: userInvoices } = await db
    .from("invoices")
    .select("payment_code")
    .eq("user_id", currentUser.id);

  const paymentCodes = (userInvoices || [])
    .map((inv: any) => inv.payment_code)
    .filter(Boolean);

  let query = db.from("sepay_webhook_events").select("*");
  if (paymentCodes.length > 0) {
    query = query.or(`user_id.eq.${currentUser.id},payment_code.in.(${paymentCodes.map(code => `"${code}"`).join(",")})`);
  } else {
    query = query.eq("user_id", currentUser.id);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: data ?? [] });
});

ownerRoutes.post("/sepay/events/:id/reprocess", async (c) => {
  const user = c.get("user");
  const eventId = c.req.param("id");
  const db = c.get("supabase");

  const { data: event, error: evErr } = await db
    .from("sepay_webhook_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (evErr || !event) return c.json({ error: "Không tìm thấy sự kiện." }, 404);

  // Find invoice: Tier 1 (Map mã payment_code), Tier 2 (Map tiền exact transfer amount)
  let invoice: any = null;
  if (event.payment_code) {
    const invoiceRes = await db.from("invoices").select("*").eq("payment_code", event.payment_code).maybeSingle();
    invoice = invoiceRes.data;
  }

  const transferAmount = Number(event.transfer_amount);

  if (!invoice && Number.isFinite(transferAmount) && transferAmount > 0) {
    const matchRes = await db
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "paid");

    if (matchRes.data && matchRes.data.length > 0) {
      const exactMatches = matchRes.data.filter((inv: any) => {
        const remaining = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
        return Math.abs(remaining - transferAmount) < 1;
      });

      if (exactMatches.length === 1) {
        invoice = exactMatches[0];
      }
    }
  }

  // Verify ownership:
  if (event.user_id && event.user_id !== user.id) {
    return c.json({ error: "Bạn không có quyền xử lý sự kiện này." }, 403);
  }

  if (!["pending_wallet", "unmatched", "error"].includes(event.status)) {
    return c.json({ error: "Sự kiện này không ở trạng thái cần thử lại." }, 400);
  }

  if (!invoice) {
    return c.json({ error: "Không tìm thấy hóa đơn khớp mã thanh toán hoặc khớp chính xác số tiền cần thu." }, 404);
  }

  if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
    return c.json({ error: "Số tiền giao dịch không hợp lệ nên không thể đối soát." }, 400);
  }

  // Find channel (shared resolver keeps webhook + reprocess in sync)
  const { resolveSepayChannel } = await import("../services/sepayReconcile.js");
  const channel = await resolveSepayChannel(supabaseAdmin, { invoice, accountNumber: event.account_number });

  if (!channel) {
    return c.json({ error: "Kênh thanh toán chưa được gán ví hoặc tài khoản ngân hàng chưa được cấu hình. Vui lòng kiểm tra lại thiết lập SePay." }, 400);
  }

  const { applyInvoicePayment } = await import("../services/invoicePayments.js");
  const roomRes = await db.from("rooms").select("name").eq("id", invoice.room_id).eq("user_id", user.id).maybeSingle();

  const paymentRes = await applyInvoicePayment(supabaseAdmin, {
    invoice,
    amount: transferAmount,
    walletId: String(channel.wallet_id),
    source: "sepay",
    date: event.raw_payload?.transactionDate || event.raw_payload?.transaction_date || null,
    externalRef: event.sepay_transaction_id,
    roomName: roomRes.data?.name || null,
    metadata: {
      sepay_transaction_id: event.sepay_transaction_id,
      sepay_reference_code: event.raw_payload?.referenceCode || event.raw_payload?.reference_code || null,
      account_number: event.account_number || null,
      gateway: event.raw_payload?.gateway || null,
      content: event.raw_payload?.content || null,
    },
  });

  if (paymentRes.error || !paymentRes.data) {
    await supabaseAdmin.from("sepay_webhook_events").update({
      status: "error",
      error_message: paymentRes.error || "Thử lại thất bại",
      user_id: user.id, // Update user_id since we now matched it
      invoice_id: invoice.id,
      payment_channel_id: channel.id,
    }).eq("id", eventId);
    return c.json({ error: paymentRes.error || "Thử lại thất bại" }, 400);
  }

  const newStatus = paymentRes.data.overpaidAmount > 0 ? "overpaid" : paymentRes.data.status;
  await supabaseAdmin.from("sepay_webhook_events").update({
    status: newStatus,
    transaction_id: paymentRes.data.transaction.id,
    payment_channel_id: channel.id,
    invoice_id: invoice.id,
    user_id: user.id, // Update user_id since we now matched it
    allocated_amount: paymentRes.data.allocatedAmount,
    overpaid_amount: paymentRes.data.overpaidAmount,
    error_message: null,
  }).eq("id", eventId);

  // Reprocessing must produce the same notifications as a successful live
  // webhook. Notification delivery is best-effort: the reconciled payment must
  // remain successful even when FCM is temporarily unavailable.
  if (!paymentRes.data.idempotent) {
    try {
      await notifyOwnerPaymentReceived(
        String(user.id),
        invoice,
        roomRes.data?.name || null,
        transferAmount,
        paymentRes.data.status,
      );
      const tenantUserId = await getTenantUserIdByInvoiceId(invoice.id);
      if (tenantUserId) {
        await notifyPaymentSuccess(tenantUserId, invoice, transferAmount);
      }
    } catch (notificationError) {
      console.error("Failed to send payment notifications after SePay reprocess:", notificationError);
    }
  }

  return c.json({ ok: true, status: newStatus });
});


ownerRoutes.get("/settings", async (c) => {
  const user = c.get("user");

  const { data, error } = await c
    .get("supabase")
    .from("system_settings")
    .select("*")
    .eq("user_id", user.id)
    .neq("key", "app_secret");
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: data ?? [] });
});

ownerRoutes.post("/settings", async (c) => {
  const user = c.get("user");

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (!body.settings || !Array.isArray(body.settings)) {
    return c.json({ error: "Invalid settings format" }, 400);
  }

  const upsertData = body.settings.map((s: any) => ({
    user_id: user.id,
    key: s.key,
    value: s.value,
    type: s.type,
    category: s.category,
  }));

  const { error } = await c
    .get("supabase")
    .from("system_settings")
    .upsert(upsertData, { onConflict: "user_id, category, key" });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

ownerRoutes.get("/permissions", async (c) => {
  const user = c.get("user");

  // Single join query fetching user's role, role permissions, and user override permissions
  const { data: dbUser, error: userError } = await supabaseAdmin
    .from("users")
    .select(`
      role_id,
      roles (
        id,
        role_permissions (
          permission_key
        )
      ),
      user_permissions (
        permission_key
      )
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (userError || !dbUser) {
    return c.json({ permissions: [] });
  }

  let rolePermissions: any[] = (dbUser.roles as any)?.role_permissions || [];

  // Fallback if role_id or roles is missing (edge case)
  if (!dbUser.role_id || !dbUser.roles) {
    const { data: fallbackRole } = await supabaseAdmin
      .from("roles")
      .select(`
        id,
        role_permissions (
          permission_key
        )
      `)
      .or("name.eq.OWNER_BASIC,name.eq.OWNER")
      .limit(1)
      .maybeSingle();
    
    if (fallbackRole) {
      rolePermissions = (fallbackRole as any).role_permissions || [];
    }
  }

  const roleKeys = rolePermissions.map((p: any) => p.permission_key);
  const userKeys = (dbUser.user_permissions || []).map((p: any) => p.permission_key);

  const combinedKeys = Array.from(new Set([...roleKeys, ...userKeys]));

  return c.json({ permissions: combinedKeys });
});

ownerRoutes.post("/simulate-upgrade", async (c) => {
  const currentUser = c.get("user");
  const { plan } = await c.req.json().catch(() => ({}));

  const targetRoleId = plan === "premium"
    ? await getRoleId("OWNER_PREMIUM")
    : await getRoleId("OWNER_BASIC");

  const planValue = plan === "premium" ? "plan:premium" : "plan:basic";

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      role_id: targetRoleId,
      admin_note: planValue,
      updated_at: new Date().toISOString()
    })
    .eq("id", currentUser.id);

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  // Clear auth caches so permissions are re-fetched correctly
  if (typeof clearAuthCacheForUser === "function") {
    clearAuthCacheForUser(currentUser.id);
  }

  return c.json({ success: true, plan: planValue });
});

ownerRoutes.post("/ocr-cccd", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file as File;
    if (!file) return c.json({ error: "No file uploaded" }, 400);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Preprocess image with sharp for optimal OCR accuracy
    let processedBuffer: Buffer;
    try {
      processedBuffer = await sharp(buffer)
        .resize({ width: 1500, withoutEnlargement: true })
        .grayscale()
        .normalize()
        .sharpen()
        .toBuffer();
    } catch (sharpErr) {
      console.warn("Sharp preprocessing failed, falling back to original buffer:", sharpErr);
      processedBuffer = buffer;
    }

    // Run OCR locally using server-side tesseract.js
    const result = await Tesseract.recognize(
      processedBuffer,
      'eng+vie',
      { logger: (m) => console.log(m) }
    );

    const text = result.data.text;
    console.log("Server OCR raw text:", text);

    // Clean text lines
    const cleanText = text.replace(/\r/g, "");
    
    // 1. Extract 12-digit CCCD (No boundary constraints)
    const cccdMatch = cleanText.match(/\d{12}/);
    const cccd = cccdMatch ? cccdMatch[0] : "";

    // 2. Extract Full name in upper case (Vietnamese names support)
    const lines = cleanText.split("\n").map((l: string) => l.trim());
    let fullName = "";
    
    // Look for names after keywords
    const lowerText = cleanText.toLowerCase();
    const nameKeywords = ["full name", "khai sinh", "họ và tên", "họ tên", "khal sinh"];
    
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      const hasKeyword = nameKeywords.some(kw => lineLower.includes(kw));
      if (hasKeyword) {
        // Search next 4 lines
        for (let j = i + 1; j <= i + 4 && j < lines.length; j++) {
          const candidate = lines[j];
          const cleanCandidate = candidate.replace(/[^A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲÝỴỶỸ\s]/g, "").trim();
          if (cleanCandidate.length > 5 && cleanCandidate === cleanCandidate.toUpperCase() && 
              !cleanCandidate.includes("CỘNG HÒA") && !cleanCandidate.includes("ĐỘC LẬP") && !cleanCandidate.includes("VIỆT NAM") &&
              !cleanCandidate.includes("CĂN CƯỚC") && !cleanCandidate.includes("CAN CƯỚC") && !cleanCandidate.includes("IDENTITY")) {
            fullName = cleanCandidate;
            break;
          }
        }
      }
      if (fullName) break;
    }

    // Fallback: search all lines for any pure uppercase line
    if (!fullName) {
      for (const line of lines) {
        const cleanLine = line.replace(/[^A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲÝỴỶỸ\s]/g, "").trim();
        if (cleanLine.length > 5 && cleanLine === cleanLine.toUpperCase() && 
            !cleanLine.includes("CỘNG HÒA") && !cleanLine.includes("ĐỘC LẬP") && !cleanLine.includes("VIỆT NAM") && 
            !cleanLine.includes("CĂN CƯỚC") && !cleanLine.includes("CỤC TRƯỞNG") && !cleanLine.includes("SOCIALIST") &&
            !cleanLine.includes("IDENTITY")) {
          fullName = cleanLine;
          break;
        }
      }
    }

    // Clean stray single letter at the beginning (OCR artifact e.g. "E NGUYEN...")
    if (fullName) {
      fullName = fullName.replace(/^[A-Z]\s+/, "").trim();
    }

    // 3. Extract Address (Address patterns)
    const addrKeywords = ["thường trú", "thường trú:", "nơi cư trú", "quê quán", "nơi đăng ký hộ khẩu", "nơi thường trú"];
    let address = "";
    for (const kw of addrKeywords) {
      const idx = lowerText.indexOf(kw);
      if (idx !== -1) {
        const subStr = cleanText.substring(idx + kw.length, idx + kw.length + 150);
        const subLines = subStr.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 2);
        if (subLines.length > 0) {
          address = subLines.slice(0, 2).join(", ").replace(/[:,\s]+$/, "").trim();
          break;
        }
      }
    }

    return c.json({
      success: true,
      name: fullName,
      cccd: cccd,
      address: address
    });
  } catch (err: any) {
    console.error("OCR error:", err);
    return c.json({ error: err.message || "Failed to process image" }, 500);
  }
});

export default ownerRoutes;
