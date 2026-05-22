import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, any>;

const seed = () => ({
  users: [
    { id: "admin-1", email: "admin@trocare.test", name: "Admin", role: "SUPER_ADMIN", status: "ACTIVE", created_at: "2026-05-01T00:00:00Z", last_login_at: "2026-05-20T00:00:00Z" },
    { id: "owner-1", email: "owner@trocare.test", name: "Owner", role: "OWNER", status: "ACTIVE", created_at: "2026-05-02T00:00:00Z", last_login_at: "2026-04-01T00:00:00Z" },
    { id: "owner-2", email: "locked@trocare.test", name: "Locked Owner", role: "OWNER", status: "BLOCKED", created_at: "2026-05-03T00:00:00Z", last_login_at: null },
  ],
  login_logs: [],
  roles: [{ id: "role-1", code: "super_admin", name: "Super Admin" }],
  permissions: [{ id: "perm-1", key: "account.view", module: "account", action: "view" }],
  role_permissions: [{ role_id: "role-1", permission_key: "account.view" }],
  audit_logs: [],
  boarding_houses: [{ id: "house-1", owner_id: "owner-1", name: "House A", address: "Saigon", status: "ACTIVE", is_public: true, created_at: "2026-05-04T00:00:00Z" }],
  rooms: [
    { id: "room-1", user_id: "owner-1", boarding_house_id: "house-1", name: "101", price: 1000000, status: "occupied", is_public: true, created_at: "2026-05-05T00:00:00Z" },
    { id: "room-2", user_id: "owner-1", boarding_house_id: "house-1", name: "102", price: 900000, status: "vacant", is_public: false, created_at: "2026-05-06T00:00:00Z" },
  ],
  tenants: [{ id: "tenant-1", user_id: "owner-1", name: "Tenant A", phone: "090", email: "tenant@trocare.test", status: "active", created_at: "2026-05-07T00:00:00Z" }],
  contracts: [{ id: "contract-1", user_id: "owner-1", room_id: "room-1", tenant_id: "tenant-1", status: "active", start_date: "2026-05-01", end_date: "2026-06-01", deposit: 1000000, rent_amount: 1000000, created_at: "2026-05-08T00:00:00Z" }],
  contract_services: [],
  invoices: [{ id: "invoice-1", user_id: "owner-1", room_id: "room-1", contract_id: "contract-1", month: 5, year: 2026, total_amount: 1200000, paid_amount: 0, status: "unpaid", due_date: "2026-05-01", created_at: "2026-05-09T00:00:00Z" }],
  invoice_items: [{ id: "item-1", invoice_id: "invoice-1", name: "Rent", amount: 1000000 }],
  admin_system_configs: [{ id: "cfg-1", key: "contract_expiry_warning_days", value: 30, value_type: "number", created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z" }],
  admin_notifications: [{ id: "notif-1", title: "Hello", body: "World", status: "draft", target_type: "all_owners", target_ids: [], channels: ["in_app"], created_at: "2026-05-01T00:00:00Z" }],
  admin_notification_deliveries: [],
});

let db: Record<string, Row[]> = seed();

const applyFilter = (rows: Row[], filter: any) => {
  if (filter.op === "eq") return rows.filter((x) => x[filter.col] === filter.value);
  if (filter.op === "neq") return rows.filter((x) => x[filter.col] !== filter.value);
  if (filter.op === "lt") return rows.filter((x) => x[filter.col] < filter.value);
  if (filter.op === "lte") return rows.filter((x) => x[filter.col] <= filter.value);
  if (filter.op === "in") return rows.filter((x) => filter.value.includes(x[filter.col]));
  if (filter.op === "ilike") return rows.filter((x) => String(x[filter.col] || "").toLowerCase().includes(String(filter.value).replace(/%/g, "").toLowerCase()));
  if (filter.op === "or") {
    return rows.filter((row) => filter.parts.some((part: string) => {
      const [col, op, ...rest] = part.split(".");
      const raw = rest.join(".");
      if (op === "ilike") return String(row[col] || "").toLowerCase().includes(raw.replace(/%/g, "").toLowerCase());
      if (op === "eq") return String(row[col] || "") === raw;
      return false;
    }));
  }
  return rows;
};

class Query {
  table: string;
  filters: any[] = [];
  rangeValue: [number, number] | null = null;
  orderValue: { col: string; ascending: boolean } | null = null;
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
  lt(col: string, value: any) { this.filters.push({ op: "lt", col, value }); return this; }
  lte(col: string, value: any) { this.filters.push({ op: "lte", col, value }); return this; }
  in(col: string, value: any[]) { this.filters.push({ op: "in", col, value }); return this; }
  ilike(col: string, value: string) { this.filters.push({ op: "ilike", col, value }); return this; }
  or(expr: string) { this.filters.push({ op: "or", parts: expr.split(",") }); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.orderValue = { col, ascending: opts?.ascending ?? true }; return this; }
  range(from: number, to: number) { this.rangeValue = [from, to]; return this; }
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
      db[this.table] = db[this.table].map((row) => (rows.some((x) => x.id === row.id || x.key === row.key) ? { ...row, ...this.payload } : row));
      rows = db[this.table].filter((row) => rows.some((x) => x.id === row.id || x.key === row.key));
    }
    if (this.mode === "delete") {
      db[this.table] = db[this.table].filter((row) => !rows.some((x) => x.id === row.id));
      rows = [];
    }
    if (this.mode === "upsert") {
      const existing = db[this.table].find((row) => row.key && row.key === this.payload.key);
      if (existing) Object.assign(existing, this.payload);
      else db[this.table].push({ id: `${this.table}-${db[this.table].length + 1}`, ...this.payload });
      rows = [existing || db[this.table][db[this.table].length - 1]];
    }

    if (this.orderValue) rows.sort((a, b) => {
      const av = a[this.orderValue!.col];
      const bv = b[this.orderValue!.col];
      return this.orderValue!.ascending ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    if (this.rangeValue) rows = rows.slice(this.rangeValue[0], this.rangeValue[1] + 1);

    if (this.wantsSingle) return rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: "not found" } };
    if (this.wantsMaybeSingle) return { data: rows[0] || null, error: null };
    return { data: rows, error: null, count: this.countRequested ? total : null };
  }
  then(resolve: any, reject: any) { return this.execute().then(resolve, reject); }
}

vi.mock("../src/middleware/auth.js", () => ({
  requireAuth: async (c: any, next: any) => {
    if (!c.req.header("authorization") && !c.req.header("x-test-role")) {
      return c.json({ error: "Missing bearer token" }, 401);
    }
    const role = c.req.header("x-test-role") || "SUPER_ADMIN";
    c.set("user", { id: "admin-1", email: "admin@trocare.test", role, status: "ACTIVE", name: "Admin" });
    await next();
  },
  requireAdmin: async (c: any, next: any) => {
    const user = c.get("user");
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) return c.json({ error: "Forbidden: admin access required" }, 403);
    await next();
  },
  requireSuperAdmin: async (c: any, next: any) => {
    const user = c.get("user");
    if (user.role !== "SUPER_ADMIN") return c.json({ error: "Super admin access required" }, 403);
    await next();
  },
  requireAdminPermission: (permission: string) => async (c: any, next: any) => {
    const user = c.get("user");
    if (user.role === "SUPER_ADMIN") {
      await next();
      return;
    }
    const dbUser = db.users.find((row) => row.id === user.id);
    const allowed = db.role_permissions.some((row) =>
      row.role_id === dbUser?.role_id && row.permission_key === permission
    );
    if (!allowed) return c.json({
      code: "ADMIN_PERMISSION_REQUIRED",
      error: "Admin permission required",
      required_permission: permission,
    }, 403);
    await next();
  },
}));

vi.mock("../src/lib/supabase.js", () => ({
  supabaseAdmin: {
    from: (table: string) => new Query(table),
  },
}));

const buildApp = async () => {
  const adminRoutes = (await import("../src/routes/admin.js")).default;
  const app = new Hono();
  app.route("/admin", adminRoutes);
  return app;
};

const authHeaders = (role = "SUPER_ADMIN") => ({
  authorization: "Bearer test-token",
  "x-test-role": role,
});

const jsonHeaders = (role = "SUPER_ADMIN") => ({
  ...authHeaders(role),
  "content-type": "application/json",
});

describe("admin phase API", () => {
  beforeEach(() => {
    db = seed();
    vi.resetModules();
  });

  it("requires authenticated admin access for phase APIs", async () => {
    const app = await buildApp();
    expect((await app.request("/admin/accounts")).status).toBe(401);

    for (const path of ["/admin/accounts", "/admin/owners", "/admin/tenants", "/admin/properties", "/admin/contracts", "/admin/invoices", "/admin/dashboard/summary"]) {
      const denied = await app.request(path, { headers: authHeaders("OWNER") });
      expect(denied.status, path).toBe(403);
    }
  });

  it("returns the required permission for admin access without a matching grant", async () => {
    const app = await buildApp();
    const denied = await app.request("/admin/accounts", { headers: authHeaders("ADMIN") });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({
      code: "ADMIN_PERMISSION_REQUIRED",
      required_permission: "account.view",
    });
  });

  it("includes blocked users in the default admin user list", async () => {
    const app = await buildApp();
    const list = await app.request("/admin/users", { headers: authHeaders() });

    expect(list.status).toBe(200);
    const body = await list.json();
    expect(body.data.map((user: Row) => user.id)).toContain("owner-2");
    expect(body.data.find((user: Row) => user.id === "owner-2")?.status).toBe("BLOCKED");
  });

  it("returns account list, search results and summary", async () => {
    const app = await buildApp();
    const list = await app.request("/admin/accounts", { headers: authHeaders() });
    expect(list.status).toBe(200);
    const body = await list.json();
    expect(body.data.length).toBe(3);
    expect(body.pagination).toMatchObject({ page: 1, limit: 20, total: 3, totalPages: 1 });

    const filtered = await app.request("/admin/accounts?keyword=owner@", { headers: authHeaders() });
    expect((await filtered.json()).data).toHaveLength(1);

    const summary = await app.request("/admin/accounts/summary", { headers: authHeaders() });
    expect(summary.status).toBe(200);
    expect(await summary.json()).toMatchObject({ total: 3, active: 2, blocked: 1, byRole: { OWNER: 2 } });
  });

  it("locks account and exposes audit log data", async () => {
    const app = await buildApp();
    const res = await app.request("/admin/accounts/owner-1/lock", {
      method: "POST",
      body: JSON.stringify({ reason: "Risk review" }),
      headers: jsonHeaders(),
    });
    expect(res.status).toBe(200);
    expect(db.users.find((x) => x.id === "owner-1")?.status).toBe("BLOCKED");
    expect(db.audit_logs.find((x) => x.action === "account.lock")).toMatchObject({
      resource_type: "account",
      resource_id: "owner-1",
      reason: "Risk review",
      risk_level: "high",
    });

    const auditList = await app.request("/admin/audit-logs?action=account.lock", { headers: authHeaders() });
    expect((await auditList.json()).data[0].action).toBe("account.lock");
  });

  it("returns role, permission and admin-user APIs", async () => {
    const app = await buildApp();
    const permissions = await app.request("/admin/me/permissions", { headers: authHeaders() });
    expect((await permissions.json()).permissions).toContain("*");

    const roles = await app.request("/admin/roles", { headers: authHeaders() });
    expect((await roles.json()).data[0]).toMatchObject({ id: "role-1", code: "super_admin" });

    const roleDetail = await app.request("/admin/roles/role-1", { headers: authHeaders() });
    expect((await roleDetail.json()).data.permissions).toContain("account.view");

    const adminUsers = await app.request("/admin/admin-users", { headers: authHeaders() });
    expect((await adminUsers.json()).data[0].role).toBe("SUPER_ADMIN");
  });

  it("returns list and detail APIs for owner, tenant, property, room, contract and invoice phases", async () => {
    const app = await buildApp();
    for (const path of ["/admin/owners", "/admin/tenants", "/admin/properties", "/admin/rooms", "/admin/contracts", "/admin/invoices"]) {
      const res = await app.request(path, { headers: authHeaders() });
      expect(res.status, path).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination.total).toBeGreaterThanOrEqual(1);
    }

    const ownerDetail = await (await app.request("/admin/owners/owner-1", { headers: authHeaders() })).json();
    expect(ownerDetail.summary)
      .toMatchObject({ properties: 1, rooms: 2, tenants: 1, activeContracts: 1, openInvoices: 1 });
    expect(ownerDetail.rooms).toHaveLength(2);
    expect(ownerDetail.tenants).toHaveLength(1);
    const roomDetail = await (await app.request("/admin/rooms/room-1", { headers: authHeaders() })).json();
    expect(roomDetail.contracts).toHaveLength(1);
    expect((await (await app.request("/admin/tenants/tenant-1", { headers: authHeaders() })).json()).contracts).toHaveLength(1);
    expect((await (await app.request("/admin/properties/house-1", { headers: authHeaders() })).json()).rooms).toHaveLength(2);
    expect((await (await app.request("/admin/contracts/contract-1", { headers: authHeaders() })).json()).invoices).toHaveLength(1);
    expect((await (await app.request("/admin/invoices/invoice-1", { headers: authHeaders() })).json()).items).toHaveLength(1);
  });

  it("returns dashboard, reports, config and notifications with expected totals", async () => {
    const app = await buildApp();
    const summaryBody = await (await app.request("/admin/dashboard/summary", { headers: authHeaders() })).json();
    expect(summaryBody).toMatchObject({ totalOwners: 2, totalRooms: 2, occupiedRooms: 1, vacantRooms: 1, totalDebtAmount: 1200000 });

    const chartsBody = await (await app.request("/admin/dashboard/charts", { headers: authHeaders() })).json();
    expect(chartsBody.roomsByStatus).toMatchObject({ occupied: 1, vacant: 1 });

    const alertsBody = await (await app.request("/admin/dashboard/alerts", { headers: authHeaders() })).json();
    expect(alertsBody.nearExpiryContracts).toHaveLength(1);
    expect(alertsBody.overdueInvoices).toHaveLength(1);

    for (const path of ["/admin/reports/owners", "/admin/reports/tenants", "/admin/reports/rooms", "/admin/reports/contracts", "/admin/reports/invoices", "/admin/system-config", "/admin/notifications"]) {
      const res = await app.request(path, { headers: authHeaders() });
      expect(res.status, path).toBe(200);
      expect(Array.isArray((await res.json()).data)).toBe(true);
    }

    const invoiceReport = await (await app.request("/admin/reports/invoices", { headers: authHeaders() })).json();
    expect(invoiceReport).toMatchObject({ total: 1, totalAmount: 1200000, paidAmount: 0, debtAmount: 1200000 });
  });

  it("marks invoice paid with reason and records audit", async () => {
    const app = await buildApp();
    const res = await app.request("/admin/invoices/invoice-1/mark-paid", {
      method: "POST",
      body: JSON.stringify({ amount: 1200000, reason: "Bank transfer confirmed" }),
      headers: jsonHeaders(),
    });
    expect(res.status).toBe(200);
    const invoice = db.invoices.find((x) => x.id === "invoice-1");
    expect(invoice).toMatchObject({ status: "paid", paid_amount: 1200000, paid_by: "admin-1" });
    expect(invoice?.paid_at).toBeTruthy();
    expect(db.audit_logs.find((x) => x.action === "invoice.mark_paid")).toMatchObject({
      resource_type: "invoice",
      resource_id: "invoice-1",
      reason: "Bank transfer confirmed",
    });
  });

  it("locks tenants and cancels invoices with audit reasons", async () => {
    const app = await buildApp();

    const tenantLock = await app.request("/admin/tenants/tenant-1/lock", {
      method: "POST",
      body: JSON.stringify({ reason: "Identity review" }),
      headers: jsonHeaders(),
    });
    expect(tenantLock.status).toBe(200);
    expect(db.tenants.find((x) => x.id === "tenant-1")).toMatchObject({
      status: "locked",
      locked_by: "admin-1",
      locked_reason: "Identity review",
    });

    const tenantUnlock = await app.request("/admin/tenants/tenant-1/unlock", {
      method: "POST",
      body: JSON.stringify({ reason: "Review cleared" }),
      headers: jsonHeaders(),
    });
    expect(tenantUnlock.status).toBe(200);
    expect(db.tenants.find((x) => x.id === "tenant-1")).toMatchObject({
      status: "active",
      locked_reason: null,
    });

    const invoiceCancel = await app.request("/admin/invoices/invoice-1/cancel", {
      method: "POST",
      body: JSON.stringify({ reason: "Duplicate invoice" }),
      headers: jsonHeaders(),
    });
    expect(invoiceCancel.status).toBe(200);
    expect(db.invoices.find((x) => x.id === "invoice-1")).toMatchObject({
      status: "cancelled",
      cancelled_by: "admin-1",
      cancel_reason: "Duplicate invoice",
    });
    expect(db.audit_logs.find((x) => x.action === "invoice.cancel")).toMatchObject({
      resource_type: "invoice",
      resource_id: "invoice-1",
      reason: "Duplicate invoice",
    });
  });

  it("handles contract, config and notification mutations", async () => {
    const app = await buildApp();
    const cancelContract = await app.request("/admin/contracts/contract-1/cancel", {
      method: "POST",
      body: JSON.stringify({ reason: "Invalid contract" }),
      headers: jsonHeaders(),
    });
    expect(cancelContract.status).toBe(200);
    expect(db.contracts.find((x) => x.id === "contract-1")?.status).toBe("cancelled");

    const configByAdmin = await app.request("/admin/system-config", {
      method: "PATCH",
      body: JSON.stringify({ key: "allow_edit_paid_invoice", value: true, reason: "Policy update" }),
      headers: jsonHeaders("ADMIN"),
    });
    expect(configByAdmin.status).toBe(403);

    const configBySuper = await app.request("/admin/system-config", {
      method: "PATCH",
      body: JSON.stringify({ key: "allow_edit_paid_invoice", value: true, reason: "Policy update" }),
      headers: jsonHeaders(),
    });
    expect(configBySuper.status).toBe(200);
    expect(db.admin_system_configs.find((x) => x.key === "allow_edit_paid_invoice")?.value).toBe(true);

    const createNotification = await app.request("/admin/notifications", {
      method: "POST",
      body: JSON.stringify({ title: "Maintenance", body: "Tonight", notificationType: "maintenance" }),
      headers: jsonHeaders(),
    });
    expect(createNotification.status).toBe(201);
    const created = await createNotification.json();

    const send = await app.request(`/admin/notifications/${created.data.id}/send`, {
      method: "POST",
      headers: authHeaders(),
    });
    expect(send.status).toBe(200);
    expect((await send.json()).deliveriesCreated).toBe(2);
    expect(db.admin_notifications.find((x) => x.id === created.data.id)?.status).toBe("sent");
    expect(db.admin_notification_deliveries.filter((x) => x.notification_id === created.data.id)).toHaveLength(2);

    const cancelSent = await app.request(`/admin/notifications/${created.data.id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: "Too late" }),
      headers: jsonHeaders(),
    });
    expect(cancelSent.status).toBe(400);
  });
});
