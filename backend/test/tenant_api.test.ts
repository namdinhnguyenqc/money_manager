import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, any>;

const seed = () => ({
  users: [
    { id: "tenant-user-1", email: "tenant@trocare.test", name: "Tenant A", role: "TENANT", status: "ACTIVE", phone: "0901234567", password_hash: "hashed_pass", created_at: "2026-05-01T00:00:00Z" },
    { id: "owner-1", email: "owner@trocare.test", name: "Owner A", role: "OWNER", status: "ACTIVE", created_at: "2026-05-02T00:00:00Z" },
  ],
  tenants: [
    { id: "tenant-1", user_id: "owner-1", name: "Tenant A", phone: "0901234567", status: "active", invite_code: "INVITE12", invite_status: "pending", invite_code_expires_at: "2026-06-30T00:00:00Z" }
  ],
  tenant_accounts: [
    { id: "account-1", user_id: "tenant-user-1", tenant_id: "tenant-1", linked_by: "owner-1", linked_at: "2026-05-05T00:00:00Z", status: "active" }
  ],
  contracts: [
    { id: "contract-1", user_id: "owner-1", room_id: "room-1", tenant_id: "tenant-1", status: "active", start_date: "2026-05-01", end_date: "2026-06-01", deposit: 1000000, rent_amount: 1000000, created_at: "2026-05-08T00:00:00Z" }
  ],
  rooms: [
    { id: "room-1", user_id: "owner-1", name: "Room 101", price: 1000000, status: "occupied", boarding_house_id: "house-1" }
  ],
  boarding_houses: [
    { id: "house-1", owner_id: "owner-1", name: "TroCare House" }
  ],
  invoices: [
    { id: "invoice-1", user_id: "owner-1", room_id: "room-1", contract_id: "contract-1", month: 5, year: 2026, total_amount: 1200000, paid_amount: 0, status: "unpaid", due_date: "2026-06-05", created_at: "2026-05-09T00:00:00Z" }
  ],
  tenant_categories: [
    { id: "cat-1", user_id: "tenant-user-1", name: "Ăn uống", type: "expense", icon: "🍔", color: "#FF5733" }
  ],
  tenant_transactions: [
    { id: "tx-1", user_id: "tenant-user-1", category_id: "cat-1", type: "expense", amount: 50000, description: "Mua cơm", date: "2026-05-30" }
  ],
  notifications: [
    { id: "notif-1", user_id: "tenant-user-1", title: "Hóa đơn mới", body: "Bạn có hóa đơn tháng 5 cần thanh toán", type: "invoice_created", is_read: false, created_at: "2026-05-30T10:00:00Z" }
  ],
  fcm_tokens: [],
  refresh_tokens: []
});

let db: Record<string, Row[]> = seed();

const applyFilter = (rows: Row[], filter: any) => {
  if (filter.op === "eq") return rows.filter((x) => x[filter.col] === filter.value);
  if (filter.op === "neq") return rows.filter((x) => x[filter.col] !== filter.value);
  if (filter.op === "in") return rows.filter((x) => filter.value.includes(x[filter.col]));
  if (filter.op === "gte") return rows.filter((x) => x[filter.col] >= filter.value);
  if (filter.op === "or") {
    return rows.filter((row) => filter.parts.some((part: string) => {
      const [col, op, ...rest] = part.split(".");
      const raw = rest.join(".");
      if (op === "eq") return String(row[col] || "") === raw;
      return false;
    }));
  }
  return rows;
};

class Query {
  table: string;
  filters: any[] = [];
  mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  payload: any = null;
  wantsSingle = false;
  wantsMaybeSingle = false;
  countRequested = false;

  constructor(table: string) {
    this.table = table;
  }
  select(_cols?: string, opts?: { count?: string }) { this.countRequested = Boolean(opts?.count); return this; }
  eq(col: string, value: any) { this.filters.push({ op: "eq", col, value }); return this; }
  neq(col: string, value: any) { this.filters.push({ op: "neq", col, value }); return this; }
  gte(col: string, value: any) { this.filters.push({ op: "gte", col, value }); return this; }
  in(col: string, value: any[]) { this.filters.push({ op: "in", col, value }); return this; }
  or(expr: string) { this.filters.push({ op: "or", parts: expr.split(",") }); return this; }
  order(_col: string, _opts?: any) { return this; }
  limit(_n: number) { return this; }
  single() { this.wantsSingle = true; return this; }
  maybeSingle() { this.wantsMaybeSingle = true; return this; }
  insert(payload: any) { this.mode = "insert"; this.payload = payload; return this; }
  update(payload: any) { this.mode = "update"; this.payload = payload; return this; }
  upsert(payload: any) { this.mode = "upsert"; this.payload = payload; return this; }
  delete() { this.mode = "delete"; return this; }

  async execute() {
    db[this.table] ||= [];
    let rows = [...db[this.table]];
    for (const filter of this.filters) rows = applyFilter(rows, filter);
    const total = rows.length;

    if (this.mode === "insert") {
      const payloads = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = payloads.map((x, index) => ({ id: x.id || `${this.table}-${db[this.table].length + index + 1}`, created_at: x.created_at || new Date().toISOString(), ...x }));
      db[this.table].push(...inserted);
      rows = inserted;
    }
    if (this.mode === "update") {
      db[this.table] = db[this.table].map((row) => (rows.some((x) => x.id === row.id) ? { ...row, ...this.payload } : row));
      rows = db[this.table].filter((row) => rows.some((x) => x.id === row.id));
    }
    if (this.mode === "delete") {
      db[this.table] = db[this.table].filter((row) => !rows.some((x) => x.id === row.id));
      rows = [];
    }

    // Embed joins
    if (this.table === "tenant_accounts") {
      rows = rows.map(ta => ({
        ...ta,
        tenants: db.tenants?.find(t => t.id === ta.tenant_id) || null
      }));
    }

    if (this.table === "contracts") {
      rows = rows.map(c => {
        const room = db.rooms?.find(r => r.id === c.room_id) || null;
        const mappedRoom = room ? {
          ...room,
          boarding_houses: db.boarding_houses?.find(bh => bh.id === room.boarding_house_id) || null
        } : null;
        return {
          ...c,
          rooms: mappedRoom
        };
      });
    }

    if (this.wantsSingle) return rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: "not found" } };
    if (this.wantsMaybeSingle) return { data: rows[0] || null, error: null };
    return { data: rows, error: null, count: this.countRequested ? total : null };
  }
  then(resolve: any, reject: any) { return this.execute().then(resolve, reject); }
}

vi.mock("../src/middleware/auth.js", () => ({
  requireAuth: async (c: any, next: any) => {
    c.set("user", { id: "tenant-user-1", email: "tenant@trocare.test", role: "TENANT", status: "ACTIVE", name: "Tenant A" });
    await next();
  },
  requireTenant: async (c: any, next: any) => {
    const user = c.get("user");
    if (!user || user.role !== "TENANT") return c.json({ error: "Forbidden: tenant access required" }, 403);
    await next();
  },
  requireTenantOrOwner: async (c: any, next: any) => {
    await next();
  },
  getClientIp: () => "127.0.0.1",
  getDeviceInfo: () => "Mock Device"
}));

vi.mock("../src/lib/supabase.js", () => ({
  supabaseAdmin: {
    from: (table: string) => new Query(table),
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: async () => true,
    hash: async () => "hashed_password",
  }
}));

// Mock firebase service
vi.mock("../src/services/firebaseService.js", () => ({
  registerFcmToken: async () => ({ success: true }),
  unregisterFcmToken: async () => ({ success: true })
}));

const buildApp = async () => {
  const tenantAuthRoutes = (await import("../src/routes/tenantAuth.js")).default;
  const tenantApiRoutes = (await import("../src/routes/tenantApi.js")).default;
  const app = new Hono();
  app.route("/tenant-auth", tenantAuthRoutes);
  app.route("/tenant", tenantApiRoutes);
  return app;
};

const authHeaders = () => ({
  authorization: "Bearer tenant-token",
});

const jsonHeaders = () => ({
  ...authHeaders(),
  "content-type": "application/json",
});

describe("Tenant Mobile App APIs", () => {
  beforeEach(() => {
    db = seed();
  });

  describe("Tenant Auth API", () => {
    it("GET /tenant-auth/invite/:code validates landlord invite codes", async () => {
      const app = await buildApp();
      const res = await app.request("/tenant-auth/invite/INVITE12");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ valid: true, tenantName: "Tenant A" });
    });

    it("POST /tenant-auth/login processes login successfully", async () => {
      const app = await buildApp();
      const res = await app.request("/tenant-auth/login", {
        method: "POST",
        body: JSON.stringify({ phone: "0901234567", password: "password123" }),
        headers: { "content-type": "application/json" }
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.id).toBe("tenant-user-1");
      expect(body.accessToken).toBeDefined();
    });

    it("POST /tenant-auth/login automatically registers tenant using phone as password when contract is active", async () => {
      const app = await buildApp();
      // Add a tenant without a user account to the mock DB
      db.tenants.push({
        id: "tenant-new-auto",
        user_id: "owner-1",
        name: "Auto Tenant",
        phone: "0988888888",
        status: "active",
        invite_code: "AUTO12",
        invite_status: "pending"
      });
      db.contracts.push({
        id: "contract-auto",
        user_id: "owner-1",
        room_id: "room-1",
        tenant_id: "tenant-new-auto",
        status: "active",
        startDate: "2026-05-01",
        deposit: 1000000
      });

      const res = await app.request("/tenant-auth/login", {
        method: "POST",
        body: JSON.stringify({ phone: "0988888888", password: "0988888888" }),
        headers: { "content-type": "application/json" }
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.phone).toBe("0988888888");
      expect(body.accessToken).toBeDefined();

      // Check that a user account was automatically created in public.users
      const userExists = db.users.find(u => u.phone === "0988888888");
      expect(userExists).toBeDefined();
      expect(userExists?.role).toBe("TENANT");
    });

    it("POST /tenant-auth/login blocks login if tenant's contract is not active", async () => {
      const app = await buildApp();
      // Add a tenant whose contract is not active (terminated)
      db.tenants.push({
        id: "tenant-checkout",
        user_id: "owner-1",
        name: "Checkout Tenant",
        phone: "0977777777",
        status: "active",
        invite_code: "OUT12",
        invite_status: "pending"
      });
      db.contracts.push({
        id: "contract-checkout",
        user_id: "owner-1",
        room_id: "room-1",
        tenant_id: "tenant-checkout",
        status: "terminated", // Check-out! Not active!
        startDate: "2026-05-01",
        deposit: 1000000
      });

      const res = await app.request("/tenant-auth/login", {
        method: "POST",
        body: JSON.stringify({ phone: "0977777777", password: "0977777777" }),
        headers: { "content-type": "application/json" }
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe("NO_ACTIVE_CONTRACT");
      expect(body.message).toContain("thanh lý");
    });
  });

  describe("Tenant Data API", () => {
    it("GET /tenant/me returns lease contract information", async () => {
      const app = await buildApp();
      const res = await app.request("/tenant/me", { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.name).toBe("Tenant A");
      expect(body.data.contract.deposit).toBe(1000000);
      expect(body.data.contract.room.name).toBe("Room 101");
    });

    it("GET /tenant/dashboard returns dashboard aggregated values", async () => {
      const app = await buildApp();
      const res = await app.request("/tenant/dashboard", { headers: authHeaders() });
      if (res.status !== 200) {
        console.log("DASHBOARD RESPONSE ERROR:", await res.text());
      }
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.unpaidInvoiceCount).toBe(1);
    });

    it("GET /tenant/invoices fetches unpaid and paid invoices", async () => {
      const app = await buildApp();
      const res = await app.request("/tenant/invoices", { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data[0].id).toBe("invoice-1");
    });

    it("GET /tenant/transactions lists personal budget transactions", async () => {
      const app = await buildApp();
      const res = await app.request("/tenant/transactions", { headers: authHeaders() });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data[0].description).toBe("Mua cơm");
    });

    it("POST /tenant/transactions inserts a custom personal expense", async () => {
      const app = await buildApp();
      const res = await app.request("/tenant/transactions", {
        method: "POST",
        body: JSON.stringify({
          amount: 25000,
          type: "expense",
          categoryId: "cat-1",
          description: "Cafe sáng",
          date: "2026-05-31"
        }),
        headers: jsonHeaders()
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.amount).toBe(25000);
    });
  });
});
