import "dotenv/config";
import { Hono } from "hono";
import { randomUUID } from "crypto";
import adminRoutes from "../src/routes/admin.js";
import { supabaseAdmin } from "../src/lib/supabase.js";
import { generateAccessToken } from "../src/lib/auth.js";

type CheckResult = {
  name: string;
  ok: boolean;
  skipped?: boolean;
  status?: number;
  detail?: string;
  ms?: number;
};

const app = new Hono();
app.route("/admin", adminRoutes);

const runId = randomUUID();
const ids = {
  admin: randomUUID(),
  owner: randomUUID(),
  owner2: randomUUID(),
  tenant: randomUUID(),
  house: randomUUID(),
  room: randomUUID(),
  room2: randomUUID(),
  contract: randomUUID(),
  invoice: randomUUID(),
  invoiceItem: randomUUID(),
  role: randomUUID(),
  permission: randomUUID(),
  notification: "",
};

const email = (name: string) => `smoke-${name}-${runId}@trocare.test`;

let token = "";
const results: CheckResult[] = [];
const tableCache = new Map<string, boolean>();
const columnCache = new Map<string, boolean>();

const tableExists = async (table: string) => {
  if (tableCache.has(table)) return tableCache.get(table)!;
  const { error } = await supabaseAdmin.from(table).select("*").limit(0);
  const exists = !error;
  tableCache.set(table, exists);
  return exists;
};

const columnExists = async (table: string, column: string) => {
  const key = `${table}.${column}`;
  if (columnCache.has(key)) return columnCache.get(key)!;
  if (!(await tableExists(table))) {
    columnCache.set(key, false);
    return false;
  }
  const { error } = await supabaseAdmin.from(table).select(column).limit(0);
  const exists = !error;
  columnCache.set(key, exists);
  return exists;
};

const hasColumns = async (table: string, columns: string[]) => {
  const checks = await Promise.all(columns.map((column) => columnExists(table, column)));
  return checks.every(Boolean);
};

const filterKnownColumns = async (table: string, row: Record<string, any>) => {
  const entries = await Promise.all(
    Object.entries(row).map(async ([key, value]) => ({
      key,
      value,
      exists: await columnExists(table, key),
    })),
  );
  return Object.fromEntries(entries.filter((entry) => entry.exists).map((entry) => [entry.key, entry.value]));
};

const skip = (name: string, detail: string) => {
  results.push({ name, ok: true, skipped: true, detail });
};

const runIf = async (name: string, condition: boolean, detail: string, fn: () => Promise<void>) => {
  if (!condition) {
    skip(name, detail);
    return;
  }
  await fn();
};

const expectOk = async (
  name: string,
  path: string,
  init: RequestInit = {},
  validate?: (body: any) => void | Promise<void>,
) => {
  const started = Date.now();
  const res = await app.request(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const ms = Date.now() - started;
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  try {
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
    }
    if (validate) await validate(body);
    results.push({ name, ok: true, status: res.status, ms });
    return body;
  } catch (error: any) {
    results.push({ name, ok: false, status: res.status, detail: error.message, ms });
    return body;
  }
};

const expectStatus = async (name: string, path: string, status: number, init: RequestInit = {}) => {
  const started = Date.now();
  const res = await app.request(path, {
    ...init,
    headers: {
      ...(init.headers || {}),
    },
  });
  const ms = Date.now() - started;
  const ok = res.status === status;
  results.push({ name, ok, status: res.status, detail: ok ? undefined : `Expected ${status}`, ms });
};

const insert = async (table: string, row: Record<string, any>) => {
  if (!(await tableExists(table))) throw new Error(`Insert ${table} failed: table does not exist`);
  const filtered = await filterKnownColumns(table, row);
  const omitted = Object.keys(row).filter((key) => !(key in filtered));
  if (omitted.length) console.warn(`[WARN] ${table}: omitted missing columns: ${omitted.join(", ")}`);
  const { data, error } = await supabaseAdmin.from(table).insert(filtered).select("*").single();
  if (error) throw new Error(`Insert ${table} failed: ${error.message}`);
  return data;
};

const maybeInsert = async (table: string, row: Record<string, any>) => {
  try {
    if (!(await tableExists(table))) {
      console.warn(`[WARN] Insert ${table} skipped: table does not exist`);
      return null;
    }
    return await insert(table, row);
  } catch (error: any) {
    console.warn(`[WARN] Insert ${table} skipped/failed: ${error.message}`);
    return null;
  }
};

const cleanup = async () => {
  const deletes: Array<[string, string, string]> = [
    ["admin_notification_deliveries", "notification_id", ids.notification],
    ["admin_notifications", "id", ids.notification],
    ["invoice_items", "id", ids.invoiceItem],
    ["invoices", "id", ids.invoice],
    ["contract_services", "contract_id", ids.contract],
    ["contracts", "id", ids.contract],
    ["tenants", "id", ids.tenant],
    ["rooms", "id", ids.room],
    ["rooms", "id", ids.room2],
    ["boarding_houses", "id", ids.house],
    ["role_permissions", "role_id", ids.role],
    ["permissions", "key", `smoke.permission.${runId}`],
    ["roles", "id", ids.role],
    ["admin_system_configs", "key", `smoke_config_${runId}`],
    ["system_settings", "key", `smoke_config_${runId}`],
    ["audit_logs", "user_id", ids.admin],
    ["users", "id", ids.owner],
    ["users", "id", ids.owner2],
    ["users", "id", ids.admin],
  ];
  for (const [table, col, value] of deletes) {
    if (!value || !(await columnExists(table, col))) continue;
    await supabaseAdmin.from(table).delete().eq(col, value);
  }
};

const setup = async () => {
  await cleanup();

  await insert("users", {
    id: ids.admin,
    email: email("admin"),
    name: "Smoke Admin",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    provider: "GOOGLE",
    is_profile_completed: true,
    onboarding_step: "DONE",
  });
  await insert("users", {
    id: ids.owner,
    email: email("owner"),
    name: "Smoke Owner",
    role: "OWNER",
    status: "ACTIVE",
    provider: "GOOGLE",
    is_profile_completed: true,
    onboarding_step: "DONE",
    last_login_at: "2026-04-01T00:00:00Z",
  });
  await insert("users", {
    id: ids.owner2,
    email: email("owner2"),
    name: "Smoke Owner 2",
    role: "OWNER",
    status: "BLOCKED",
    provider: "GOOGLE",
    is_profile_completed: true,
    onboarding_step: "DONE",
  });

  await maybeInsert("roles", { id: ids.role, code: `smoke_role_${runId}`, name: `Smoke Role ${runId}` });
  await maybeInsert("permissions", { id: ids.permission, key: `smoke.permission.${runId}`, module: "smoke", action: "view" });
  await maybeInsert("role_permissions", { role_id: ids.role, permission_key: `smoke.permission.${runId}` });

  await insert("boarding_houses", {
    id: ids.house,
    owner_id: ids.owner,
    name: `Smoke House ${runId}`,
    address: "Smoke Address",
    status: "ACTIVE",
    is_public: true,
  });
  await insert("rooms", {
    id: ids.room,
    user_id: ids.owner,
    boarding_house_id: ids.house,
    name: "Smoke Room 101",
    price: 1000000,
    status: "occupied",
    is_public: true,
  });
  await insert("rooms", {
    id: ids.room2,
    user_id: ids.owner,
    boarding_house_id: ids.house,
    name: "Smoke Room 102",
    price: 900000,
    status: "vacant",
    is_public: false,
  });
  await insert("tenants", {
    id: ids.tenant,
    user_id: ids.owner,
    name: "Smoke Tenant",
    phone: "0900000000",
    email: email("tenant"),
    status: "active",
  });
  await insert("contracts", {
    id: ids.contract,
    user_id: ids.owner,
    room_id: ids.room,
    tenant_id: ids.tenant,
    start_date: "2026-05-01",
    end_date: "2026-06-01",
    deposit: 1000000,
    rent_amount: 1000000,
    status: "active",
  });
  await insert("invoices", {
    id: ids.invoice,
    user_id: ids.owner,
    room_id: ids.room,
    contract_id: ids.contract,
    month: 5,
    year: 2026,
    room_fee: 1000000,
    total_amount: 1200000,
    paid_amount: 0,
    status: "unpaid",
    due_date: "2026-05-01",
  });
  await insert("invoice_items", {
    id: ids.invoiceItem,
    user_id: ids.owner,
    invoice_id: ids.invoice,
    name: "Smoke Rent",
    amount: 1000000,
  });

  token = await generateAccessToken({
    id: ids.admin,
    email: email("admin"),
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    name: "Smoke Admin",
    provider: "GOOGLE",
    isProfileCompleted: true,
    onboardingStep: "DONE",
  });
};

const printSchemaGaps = async () => {
  const required: Record<string, string[]> = {
    users: ["full_name", "phone", "role_id", "locked_at", "locked_by", "locked_reason", "unlocked_at", "unlocked_by", "unlocked_reason", "last_login_at"],
    tenants: ["status", "locked_at", "locked_by", "locked_reason", "admin_note"],
    boarding_houses: ["locked_at", "locked_by", "locked_reason", "admin_note"],
    contracts: ["cancelled_at", "cancelled_by", "cancel_reason"],
    invoices: ["due_date", "cancelled_at", "cancelled_by", "cancel_reason", "paid_at", "paid_by", "payment_method"],
    roles: ["id"],
    permissions: ["key"],
    role_permissions: ["role_id"],
    admin_system_configs: ["key"],
    admin_notifications: ["id"],
  };
  const gaps: string[] = [];
  for (const [table, columns] of Object.entries(required)) {
    if (!(await tableExists(table))) {
      gaps.push(`${table} table`);
      continue;
    }
    for (const column of columns) {
      if (!(await columnExists(table, column))) gaps.push(`${table}.${column}`);
    }
  }
  if (gaps.length) {
    console.warn(`\n[SCHEMA GAPS] Missing admin schema pieces (${gaps.length}):`);
    console.warn(gaps.map((gap) => `  - ${gap}`).join("\n"));
  } else {
    console.log("\n[SCHEMA] Admin schema looks complete for smoke coverage.");
  }
};

const run = async () => {
  const started = Date.now();
  try {
    await setup();
    await printSchemaGaps();

    const canSearchUsers = await hasColumns("users", ["full_name", "phone"]);
    const canSummarizeAccounts = await hasColumns("users", ["user_type", "last_login_at"]);
    const canLockUsers = await hasColumns("users", ["locked_at", "locked_by", "locked_reason", "unlocked_at", "unlocked_by", "unlocked_reason"]);
    const canLockTenants = await hasColumns("tenants", ["status"]);
    const canLockProperties = await hasColumns("boarding_houses", ["status"]);
    const hasRoles = await tableExists("roles");
    const hasSystemConfig = await tableExists("admin_system_configs") || await tableExists("system_settings");
    const hasNotifications = await tableExists("admin_notifications");
    const canCancelContract = await hasColumns("contracts", ["status"]);
    const canPayInvoice = await hasColumns("invoices", ["status", "paid_amount"]);
    const canCancelInvoice = await hasColumns("invoices", ["cancelled_at", "cancelled_by", "cancel_reason"]);
    const canDashboardDates = await hasColumns("users", ["last_login_at"]);

    await expectStatus("auth_missing_returns_401", "/admin/accounts", 401);
    await expectOk("accounts_list", canSearchUsers ? `/admin/accounts?keyword=${encodeURIComponent("Smoke Owner")}` : "/admin/accounts", {}, (body) => {
      if (!Array.isArray(body.data) || body.data.length < 1) throw new Error("Expected accounts data");
    });
    await runIf("accounts_summary", canSummarizeAccounts, "users.user_type/last_login_at missing", async () => {
      await expectOk("accounts_summary", "/admin/accounts/summary", {}, (body) => {
        if (typeof body.total !== "number") throw new Error("Missing total");
      });
    });
    await runIf("account_lock_unlock", canLockUsers, "users lock columns missing", async () => {
      await expectOk("account_lock", `/admin/accounts/${ids.owner}/lock`, {
        method: "POST",
        body: JSON.stringify({ reason: "Smoke lock" }),
      }, (body) => {
        if (body.data.status !== "BLOCKED") throw new Error("Expected BLOCKED status");
      });
      await expectOk("account_unlock", `/admin/accounts/${ids.owner}/unlock`, {
        method: "POST",
        body: JSON.stringify({ reason: "Smoke unlock" }),
      }, (body) => {
        if (body.data.status !== "ACTIVE") throw new Error("Expected ACTIVE status");
      });
    });

    await runIf("audit_logs", await tableExists("audit_logs"), "audit_logs table missing", async () => {
      await expectOk("audit_logs", "/admin/audit-logs", {}, (body) => {
        if (!Array.isArray(body.data)) throw new Error("Missing audit data");
      });
    });
    await expectOk("permissions", "/admin/me/permissions", {}, (body) => {
      if (!Array.isArray(body.permissions)) throw new Error("Missing permissions array");
    });
    await runIf("roles", hasRoles, "roles table missing", async () => {
      await expectOk("roles", "/admin/roles", {}, (body) => {
        if (!Array.isArray(body.data)) throw new Error("Missing roles data");
      });
    });
    await expectOk("admin_users", "/admin/admin-users", {}, (body) => {
      if (!Array.isArray(body.data)) throw new Error("Missing admin users data");
    });

    await expectOk("owners_list", "/admin/owners", {}, (body) => {
      if (!body.data.some((x: any) => x.id === ids.owner)) throw new Error("Missing owner");
    });
    await expectOk("owner_detail", `/admin/owners/${ids.owner}`, {}, (body) => {
      if (body.summary.rooms < 2 || body.summary.properties < 1) throw new Error("Owner summary mismatch");
    });
    await expectOk("tenants_list", `/admin/tenants?ownerId=${ids.owner}`, {}, (body) => {
      if (!body.data.some((x: any) => x.id === ids.tenant)) throw new Error("Missing tenant");
    });
    await expectOk("tenant_detail", `/admin/tenants/${ids.tenant}`, {}, (body) => {
      if (!body.contracts.some((x: any) => x.id === ids.contract)) throw new Error("Missing tenant contract");
    });
    await runIf("tenant_lock_unlock", canLockTenants, "tenants status column missing", async () => {
      await expectOk("tenant_lock", `/admin/tenants/${ids.tenant}/lock`, {
        method: "POST",
        body: JSON.stringify({ reason: "Smoke tenant lock" }),
      });
      await expectOk("tenant_unlock", `/admin/tenants/${ids.tenant}/unlock`, {
        method: "POST",
        body: JSON.stringify({ reason: "Smoke tenant unlock" }),
      });
    });

    await expectOk("properties_list", `/admin/properties?ownerId=${ids.owner}`, {}, (body) => {
      if (!body.data.some((x: any) => x.id === ids.house)) throw new Error("Missing property");
    });
    await expectOk("property_detail", `/admin/properties/${ids.house}`, {}, (body) => {
      if (body.rooms.length !== 2) throw new Error("Property room count mismatch");
    });
    await runIf("property_lock_unlock", canLockProperties, "boarding_houses status column missing", async () => {
      await expectOk("property_lock", `/admin/properties/${ids.house}/lock`, {
        method: "POST",
        body: JSON.stringify({ reason: "Smoke property lock" }),
      });
      await expectOk("property_unlock", `/admin/properties/${ids.house}/unlock`, {
        method: "POST",
        body: JSON.stringify({ reason: "Smoke property unlock" }),
      });
    });
    await expectOk("rooms_list", `/admin/rooms?boardingHouseId=${ids.house}`, {}, (body) => {
      if (!body.data.some((x: any) => x.id === ids.room)) throw new Error("Missing room");
    });

    await expectOk("contracts_list", `/admin/contracts?ownerId=${ids.owner}`, {}, (body) => {
      if (!body.data.some((x: any) => x.id === ids.contract)) throw new Error("Missing contract");
    });
    await expectOk("contract_detail", `/admin/contracts/${ids.contract}`, {}, (body) => {
      if (!body.invoices.some((x: any) => x.id === ids.invoice)) throw new Error("Missing contract invoice");
    });
    await expectOk("invoices_list", `/admin/invoices?ownerId=${ids.owner}`, {}, (body) => {
      if (!body.data.some((x: any) => x.id === ids.invoice)) throw new Error("Missing invoice");
    });
    await expectOk("invoice_detail", `/admin/invoices/${ids.invoice}`, {}, (body) => {
      if (!body.items.some((x: any) => x.id === ids.invoiceItem)) throw new Error("Missing invoice item");
    });
    await runIf("invoice_mark_paid", canPayInvoice, "invoice status/paid_amount columns missing", async () => {
      await expectOk("invoice_mark_paid", `/admin/invoices/${ids.invoice}/mark-paid`, {
        method: "POST",
        body: JSON.stringify({ amount: 1200000, reason: "Smoke paid" }),
      }, (body) => {
        if (body.data.status !== "paid" || Number(body.data.paid_amount) !== 1200000) throw new Error("Invoice paid mismatch");
      });
    });
    await runIf("invoice_cancel", canCancelInvoice, "invoice cancel columns missing", async () => {
      await expectOk("invoice_cancel", `/admin/invoices/${ids.invoice}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "Smoke cancel invoice" }),
      });
    });

    await runIf("dashboard_summary", canDashboardDates, "users.last_login_at column missing", async () => {
      await expectOk("dashboard_summary", "/admin/dashboard/summary", {}, (body) => {
        if (typeof body.totalRooms !== "number" || body.totalDebtAmount < 0) throw new Error("Dashboard summary mismatch");
      });
    });
    await expectOk("dashboard_charts", "/admin/dashboard/charts", {}, (body) => {
      if (!body.roomsByStatus) throw new Error("Missing roomsByStatus");
    });
    await runIf("dashboard_alerts", canDashboardDates, "users.last_login_at column missing", async () => {
      await expectOk("dashboard_alerts", "/admin/dashboard/alerts", {}, (body) => {
        if (!Array.isArray(body.nearExpiryContracts) || !Array.isArray(body.overdueInvoices)) throw new Error("Missing alerts arrays");
      });
    });
    for (const report of ["owners", "tenants", "rooms", "contracts", "invoices"]) {
      await expectOk(`report_${report}`, `/admin/reports/${report}`, {}, (body) => {
        if (!Array.isArray(body.data)) throw new Error("Report data is not array");
      });
    }

    await runIf("system_config", hasSystemConfig, "admin_system_configs table missing", async () => {
      await expectOk("system_config_list", "/admin/system-config", {}, (body) => {
        if (!Array.isArray(body.data)) throw new Error("Missing config data");
      });
      await expectOk("system_config_patch", "/admin/system-config", {
        method: "PATCH",
        body: JSON.stringify({ key: `smoke_config_${runId}`, value: true, reason: "Smoke config" }),
      }, (body) => {
        if (body.data.key !== `smoke_config_${runId}`) throw new Error("Config key mismatch");
      });
    });

    await runIf("notifications", hasNotifications, "admin_notifications table missing", async () => {
      const notification = await expectOk("notification_create", "/admin/notifications", {
        method: "POST",
        body: JSON.stringify({ title: `Smoke ${runId}`, body: "Smoke notification", notificationType: "maintenance" }),
      }, (body) => {
        if (!body.data.id) throw new Error("Missing notification id");
      });
      ids.notification = notification?.data?.id || "";
      await expectOk("notifications_list", "/admin/notifications", {}, (body) => {
        if (!Array.isArray(body.data)) throw new Error("Missing notifications data");
      });
      await expectOk("notification_send", `/admin/notifications/${ids.notification}/send`, { method: "POST" }, (body) => {
        if (body.data.status !== "sent") throw new Error("Notification was not sent");
      });
    });

    await runIf("contract_cancel", canCancelContract, "contracts.status column missing", async () => {
      await expectOk("contract_cancel", `/admin/contracts/${ids.contract}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "Smoke cancel contract" }),
      }, (body) => {
        if (!["cancelled", "terminated"].includes(body.data.status)) throw new Error("Contract cancel mismatch");
      });
    });

    const failed = results.filter((x) => !x.ok);
    console.table(results.map((x) => ({
      name: x.name,
      ok: x.ok,
      skipped: !!x.skipped,
      status: x.status,
      ms: x.ms,
      detail: x.detail || "",
    })));
    console.log(`Smoke admin real API completed in ${Date.now() - started}ms`);
    if (failed.length > 0) process.exitCode = 1;
  } finally {
    await cleanup();
  }
};

run().catch(async (error) => {
  console.error("Smoke admin real API crashed:", error);
  results.push({ name: "crash", ok: false, detail: error.message });
  await cleanup();
  process.exit(1);
});
