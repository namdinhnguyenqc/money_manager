// TrọCare — Demo mode mock data (client-only, never touches DB).
// Served by authFetch when demo mode is active. Shapes mirror the real API
// so every owner page renders without a backend or real account.

const PERIOD = { month: 7, year: 2026 };
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export const DEMO_USER = {
  id: "demo-owner",
  name: "Chủ trọ Demo",
  email: "demo@trocare.app",
  role: "OWNER",
  status: "ACTIVE",
  approvalStatus: "APPROVED",
  isProfileCompleted: true,
  onboardingStep: "DONE",
  avatarUrl: null,
  provider: "demo",
};

const FACILITIES = [
  { id: "f1", name: "Dãy trọ Minh Anh", address: "12 Nguyễn Văn Cừ, Q.5", status: "ACTIVE" },
  { id: "f2", name: "Nhà trọ Bình Minh", address: "88 Lê Lợi, Thủ Đức", status: "ACTIVE" },
];

const ROOMS = [
  { id: "r1", boarding_house_id: "f1", name: "P101", price: 3500000, area: 22, max_people: 3, num_people: 2, status: "occupied", has_ac: true, tenant_name: "Nguyễn Văn An", tenant_phone: "0901234567", contract_id: "c1" },
  { id: "r2", boarding_house_id: "f1", name: "P102", price: 2800000, area: 18, max_people: 2, num_people: 2, status: "occupied", has_ac: false, tenant_name: "Trần Thị Bình", tenant_phone: "0912345678", contract_id: "c2" },
  { id: "r3", boarding_house_id: "f1", name: "P103", price: 3200000, area: 20, max_people: 2, num_people: 0, status: "reserved", has_ac: true, tenant_name: "Đỗ Thị Em", tenant_phone: "0934567890", contract_id: null },
  { id: "r4", boarding_house_id: "f1", name: "P104", price: 2500000, area: 16, max_people: 2, num_people: 1, status: "occupied", has_ac: false, tenant_name: "Lê Văn Cường", tenant_phone: "0923456789", contract_id: "c3" },
  { id: "r5", boarding_house_id: "f1", name: "P105", price: 3000000, area: 20, max_people: 3, num_people: 0, status: "vacant", has_ac: true, tenant_name: null, tenant_phone: null, contract_id: null },
  { id: "r6", boarding_house_id: "f2", name: "P201", price: 4000000, area: 25, max_people: 3, num_people: 3, status: "occupied", has_ac: true, tenant_name: "Phạm Thị Dung", tenant_phone: "0945678901", contract_id: "c4" },
  { id: "r7", boarding_house_id: "f2", name: "P202", price: 3500000, area: 22, max_people: 2, num_people: 0, status: "vacant", has_ac: true, tenant_name: null, tenant_phone: null, contract_id: null },
  { id: "r8", boarding_house_id: "f2", name: "P203", price: 3000000, area: 20, max_people: 2, num_people: 0, status: "maintenance", has_ac: false, tenant_name: null, tenant_phone: null, contract_id: null },
];

const PAYMENT_CHANNEL = { provider: "sepay", bank_id: "ACB", account_no: "252369089", account_name: "NGUYEN DINH HA NAM" };

const mkItems = (elec: number, water: number, wifi = 100000, rac = 20000) => [
  { id: "it-e", name: "Tiền điện", detail: "Theo số đo", amount: elec },
  { id: "it-w", name: "Tiền nước", detail: "Theo số đo", amount: water },
  { id: "it-wifi", name: "Wifi / Mạng", detail: "Cố định", amount: wifi },
  { id: "it-rac", name: "Tiền rác", detail: "Theo phòng", amount: rac },
];

const INVOICES = [
  { id: "inv1", room_id: "r1", contract_id: "c1", room_name: "P101", tenant_name: "Nguyễn Văn An", tenant_phone: "0901234567", month: 7, year: 2026, room_fee: 3500000, total_amount: 3920000, paid_amount: 3920000, status: "paid", elec_old: 1200, elec_new: 1280, water_old: 45, water_new: 51, payment_code: "TROP101", payment_channel: PAYMENT_CHANNEL, items: mkItems(280000, 90000) },
  { id: "inv2", room_id: "r2", contract_id: "c2", room_name: "P102", tenant_name: "Trần Thị Bình", tenant_phone: "0912345678", month: 7, year: 2026, room_fee: 2800000, total_amount: 3080000, paid_amount: 0, status: "sent", elec_old: 800, elec_new: 852, water_old: 30, water_new: 34, payment_code: "TROP102", payment_channel: PAYMENT_CHANNEL, items: mkItems(182000, 60000) },
  { id: "inv3", room_id: "r4", contract_id: "c3", room_name: "P104", tenant_name: "Lê Văn Cường", tenant_phone: "0923456789", month: 7, year: 2026, room_fee: 2500000, total_amount: 2900000, paid_amount: 1000000, status: "partial", elec_old: 600, elec_new: 680, water_old: 20, water_new: 26, payment_code: "TROP104", payment_channel: PAYMENT_CHANNEL, items: mkItems(280000, 90000) },
  { id: "inv4", room_id: "r6", contract_id: "c4", room_name: "P201", tenant_name: "Phạm Thị Dung", tenant_phone: "0945678901", month: 7, year: 2026, room_fee: 4000000, total_amount: 4620000, paid_amount: 0, status: "sent", elec_old: 2000, elec_new: 2120, water_old: 60, water_new: 68, payment_code: "TROP201", payment_channel: PAYMENT_CHANNEL, items: mkItems(420000, 120000) },
  { id: "inv5", room_id: "r2", contract_id: "c2", room_name: "P102", tenant_name: "Trần Thị Bình", tenant_phone: "0912345678", month: 6, year: 2026, room_fee: 2800000, total_amount: 3000000, paid_amount: 0, status: "overdue", elec_old: 750, elec_new: 800, water_old: 26, water_new: 30, payment_code: "TROP102J", payment_channel: PAYMENT_CHANNEL, items: mkItems(175000, 45000, 0, 0) },
  { id: "inv6", room_id: "r4", contract_id: "c3", room_name: "P104", tenant_name: "Lê Văn Cường", tenant_phone: "0923456789", month: 6, year: 2026, room_fee: 2500000, total_amount: 2750000, paid_amount: 0, status: "overdue", elec_old: 540, elec_new: 600, water_old: 15, water_new: 20, payment_code: "TROP104J", payment_channel: PAYMENT_CHANNEL, items: mkItems(210000, 75000, 0, 0) },
];

const WALLETS = [
  { id: "w1", name: "Ví cá nhân", type: "personal", balance: 12500000 },
  { id: "w2", name: "Quỹ nhà trọ", type: "rental", balance: 45800000 },
  { id: "w3", name: "Vốn nhập hàng", type: "trading", balance: 8000000 },
];

const SERVICES = [
  { id: "s1", name: "Tiền điện", type: "metered", unit_price: 3500, unit: "kWh", icon: "⚡", active: true },
  { id: "s2", name: "Tiền nước", type: "metered", unit_price: 15000, unit: "m³", icon: "💧", active: true },
  { id: "s3", name: "Wifi / Mạng", type: "fixed", unit_price: 100000, unit: "tháng", icon: "📶", active: true },
  { id: "s4", name: "Tiền rác", type: "per_room", unit_price: 20000, unit: "phòng", icon: "🗑️", active: true },
];

const CATEGORIES = [
  { id: "cat1", name: "Tiền phòng", icon: "🏠", color: "#2563eb", type: "income", wallet_id: "w2" },
  { id: "cat2", name: "Tiền điện", icon: "⚡", color: "#f59e0b", type: "income", wallet_id: "w2" },
  { id: "cat3", name: "Tiền nước", icon: "💧", color: "#06b6d4", type: "income", wallet_id: "w2" },
  { id: "cat4", name: "Wifi", icon: "📶", color: "#6366f1", type: "income", wallet_id: "w2" },
  { id: "cat5", name: "Sửa chữa", icon: "🔧", color: "#ef4444", type: "expense", wallet_id: "w2" },
  { id: "cat6", name: "Vật tư", icon: "📦", color: "#64748b", type: "expense", wallet_id: "w2" },
];

const CONTRACTS = [
  { id: "c1", room_id: "r1", boarding_house_id: "f1", room_name: "P101", room_price: 3500000, has_ac: true, tenant_name: "Nguyễn Văn An", tenant_phone: "0901234567", start_date: iso(2026, 1, 1), end_date: iso(2026, 12, 31), rent_amount: 3500000, deposit: 3500000, billing_day: 5, num_people: 2, status: "active" },
  { id: "c2", room_id: "r2", boarding_house_id: "f1", room_name: "P102", room_price: 2800000, has_ac: false, tenant_name: "Trần Thị Bình", tenant_phone: "0912345678", start_date: iso(2026, 2, 1), end_date: iso(2026, 8, 1), rent_amount: 2800000, deposit: 2800000, billing_day: 5, num_people: 2, status: "active" },
  { id: "c3", room_id: "r4", boarding_house_id: "f1", room_name: "P104", room_price: 2500000, has_ac: false, tenant_name: "Lê Văn Cường", tenant_phone: "0923456789", start_date: iso(2026, 3, 15), end_date: iso(2027, 3, 15), rent_amount: 2500000, deposit: 2500000, billing_day: 10, num_people: 1, status: "active" },
  { id: "c4", room_id: "r6", boarding_house_id: "f2", room_name: "P201", room_price: 4000000, has_ac: true, tenant_name: "Phạm Thị Dung", tenant_phone: "0945678901", start_date: iso(2026, 4, 1), end_date: iso(2027, 4, 1), rent_amount: 4000000, deposit: 4000000, billing_day: 5, num_people: 3, status: "active" },
];

const DEPOSITS = [
  { id: "d1", room_id: "r3", room_name: "P103", facility_name: "Dãy trọ Minh Anh", tenant_name: "Đỗ Thị Em", tenant_phone: "0934567890", amount: 3200000, deposit_date: iso(2026, 6, 28), status: "held", note: "Cọc giữ phòng, dọn vào 5/7", contract_id: null },
];

const TENANTS = [
  { id: "t1", name: "Nguyễn Văn An", phone: "0901234567", email: "an.nguyen@gmail.com", id_card: "079096012345", address: "Quận 1, TP. Hồ Chí Minh", created_at: iso(2026, 1, 1) },
  { id: "t2", name: "Trần Thị Bình", phone: "0912345678", email: "binh.tran@gmail.com", id_card: "079096054321", address: "Quận 3, TP. Hồ Chí Minh", created_at: iso(2026, 2, 1) },
  { id: "t3", name: "Lê Văn Cường", phone: "0923456789", email: "cuong.le@gmail.com", id_card: "079096098765", address: "Bình Thạnh, TP. Hồ Chí Minh", created_at: iso(2026, 3, 15) },
  { id: "t4", name: "Phạm Thị Dung", phone: "0945678901", email: "dung.pham@gmail.com", id_card: "079096088888", address: "Thủ Đức, TP. Hồ Chí Minh", created_at: iso(2026, 4, 1) }
];

// 6-month transactions (income = rent + utilities, some expenses), utility-tagged.
function buildTransactions() {
  const txs: any[] = [];
  let id = 1;
  const months = [2, 3, 4, 5, 6, 7];
  for (const m of months) {
    const scale = 0.8 + (m - 2) * 0.06;
    txs.push({ id: `tx${id++}`, type: "income", amount: Math.round(12800000 * scale), description: "Tiền phòng các phòng", date: iso(2026, m, 6), wallet_id: "w2", wallet_name: "Quỹ nhà trọ", category_name: "Tiền phòng" });
    txs.push({ id: `tx${id++}`, type: "income", amount: Math.round(2100000 * scale), description: "Thu tiền điện", date: iso(2026, m, 6), wallet_id: "w2", wallet_name: "Quỹ nhà trọ", category_name: "Tiền điện" });
    txs.push({ id: `tx${id++}`, type: "income", amount: Math.round(520000 * scale), description: "Thu tiền nước", date: iso(2026, m, 6), wallet_id: "w2", wallet_name: "Quỹ nhà trọ", category_name: "Tiền nước" });
    txs.push({ id: `tx${id++}`, type: "income", amount: 350000, description: "Thu wifi", date: iso(2026, m, 6), wallet_id: "w2", wallet_name: "Quỹ nhà trọ", category_name: "Wifi" });
    txs.push({ id: `tx${id++}`, type: "expense", amount: Math.round(600000 * scale), description: "Chi phí điện nước đầu nguồn", date: iso(2026, m, 8), wallet_id: "w2", wallet_name: "Quỹ nhà trọ", category_name: "Vật tư" });
    if (m % 2 === 0) txs.push({ id: `tx${id++}`, type: "expense", amount: 450000, description: "Sửa chữa phòng", date: iso(2026, m, 12), wallet_id: "w2", wallet_name: "Quỹ nhà trọ", category_name: "Sửa chữa" });
  }
  return txs.reverse();
}
const TRANSACTIONS = buildTransactions();

const SETTINGS = [
  { key: "bank_name_1", value: "ACB" },
  { key: "bank_account_1", value: "252369089" },
  { key: "bank_owner_1", value: "NGUYEN DINH HA NAM" },
  { key: "bank_qr_static_url", value: "" },
];

const BANK_CONFIG = { bank_id: "ACB", account_no: "252369089", account_name: "NGUYEN DINH HA NAM", qr_uri: null };

const ALL_PERMISSIONS = [
  "invoice.view", "invoice.create", "invoice.delete", "payment.create",
  "room.view", "room.manage", "tenant.view", "contract.view", "contract.manage",
  "transaction.view", "transaction.create", "report.view", "feedback.view", "settings.manage",
];

function dashboardInit() {
  return {
    boardingHouses: FACILITIES,
    rooms: ROOMS,
    wallets: WALLETS,
    transactions: TRANSACTIONS,
    invoices: INVOICES,
    settings: Object.fromEntries(SETTINGS.map((s) => [s.key, s.value])),
  };
}

// Derived from the same mock rows the other screens use, so the dashboard tells
// the same story as the invoice and room lists instead of showing stray numbers.
function dashboardSummary(search: URLSearchParams) {
  const month = Number(search.get("month")) || new Date().getMonth() + 1;
  const year = Number(search.get("year")) || new Date().getFullYear();
  const facilityId = search.get("facilityId");

  const rooms = facilityId ? ROOMS.filter((r) => r.boarding_house_id === facilityId) : ROOMS;
  const roomIds = new Set(rooms.map((r) => r.id));
  const invoices = INVOICES.filter((i) => roomIds.has(i.room_id));

  const billed = invoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
  const collected = invoices.reduce((sum, i) => sum + Number(i.paid_amount || 0), 0);
  const receivable = Math.max(0, billed - collected);
  const overdueInvoices = invoices.filter((i) => i.status !== "paid");
  const overdue = overdueInvoices.reduce(
    (sum, i) => sum + Math.max(0, Number(i.total_amount || 0) - Number(i.paid_amount || 0)),
    0,
  );
  const expense = TRANSACTIONS.filter((t) => t.type === "expense").reduce(
    (sum, t) => sum + Number(t.amount || 0),
    0,
  );
  const profit = collected - expense;

  const occupied = rooms.filter((r) => r.status === "occupied").length;
  const maintenance = rooms.filter((r) => r.status === "maintenance").length;

  return {
    period: { month, year },
    facilities: FACILITIES.map((f) => ({ id: f.id, name: f.name })),
    scope: { facilityId: facilityId || null },
    totals: {
      billed,
      collected,
      receivable,
      overdue,
      notDue: Math.max(0, receivable - overdue),
      expense,
      overdueCount: overdueInvoices.length,
      averageOverdueDays: overdueInvoices.length > 0 ? 14 : 0,
      profit,
      margin: collected > 0 ? profit / collected : 0,
      netCashflow: profit,
      collectionRate: billed > 0 ? collected / billed : 0,
    },
    occupancy: {
      total: rooms.length,
      occupied,
      vacant: rooms.length - occupied - maintenance,
      maintenance,
      expiringContracts: 0,
    },
    facilitiesPerformance: FACILITIES.map((f) => {
      const fRooms = ROOMS.filter((r) => r.boarding_house_id === f.id);
      const fRoomIds = new Set(fRooms.map((r) => r.id));
      const fInvoices = INVOICES.filter((i) => fRoomIds.has(i.room_id));
      const fBilled = fInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
      const fCollected = fInvoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
      const fOccupied = fRooms.filter((r) => r.status === "occupied").length;
      return {
        id: f.id,
        name: f.name,
        occupancyRate: fRooms.length > 0 ? fOccupied / fRooms.length : 0,
        collectedRate: fBilled > 0 ? fCollected / fBilled : 0,
        overdue: Math.max(0, fBilled - fCollected),
        receivable: Math.max(0, fBilled - fCollected),
        billed: fBilled,
        collected: fCollected,
        roomCount: fRooms.length,
        occupied: fOccupied,
      };
    }),
    expenseComposition: [
      { name: "Điện nước", amount: Math.round(expense * 0.45) },
      { name: "Bảo trì", amount: Math.round(expense * 0.3) },
      { name: "Khác", amount: Math.round(expense * 0.25) },
    ],
  };
}

function cashflowSummary(search: URLSearchParams) {
  const months = Math.min(18, Math.max(1, Number(search.get("months")) || 12));
  const now = new Date();
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const income = TRANSACTIONS.filter(
      (t) =>
        t.type === "income" &&
        new Date(t.date).getMonth() === d.getMonth() &&
        new Date(t.date).getFullYear() === d.getFullYear(),
    ).reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = TRANSACTIONS.filter(
      (t) =>
        t.type === "expense" &&
        new Date(t.date).getMonth() === d.getMonth() &&
        new Date(t.date).getFullYear() === d.getFullYear(),
    ).reduce((s, t) => s + Number(t.amount || 0), 0);
    result.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      income,
      expense,
      profit: income - expense,
    });
  }
  return { months: result };
}

let PAYMENT_CHANNELS: any[] = [
  {
    id: "pc1",
    displayName: "VietQR MB Bank (Mặc định)",
    display_name: "VietQR MB Bank (Mặc định)",
    bankName: "MB Bank",
    accountNo: "1234567890",
    accountName: "NGUYEN DINH HA NAM",
    isDefault: true,
    is_default: true,
    enabled: true,
  }
];

// Resolve a mock JSON payload for a given API path. Returns null if unhandled
// (caller falls back to an empty { data: [] }).
export function resolveDemoPayload(pathname: string, method: string, search: URLSearchParams, body?: any): any {
  const p = pathname;
  const isGet = method === "GET";

  if (p === "/auth/me") return DEMO_USER;
  if (p === "/owner/permissions") return { permissions: ALL_PERMISSIONS };
  if (p === "/owner/dashboard-init") return dashboardInit();
  if (p === "/owner/dashboard-summary") return dashboardSummary(search);
  if (p === "/owner/cashflow-summary") return cashflowSummary(search);
  if (p === "/owner/boarding-houses") return { data: FACILITIES };
  if (p.startsWith("/owner/boarding-houses/") && p.endsWith("/rooms")) {
    const parts = p.split("/");
    const bhId = parts[3];
    const rooms = bhId ? ROOMS.filter((r) => r.boarding_house_id === bhId) : ROOMS;
    return { data: rooms };
  }
  if (p === "/owner/rooms" || p === "/rental/rooms") {
    const bh = search.get("buildingId") || search.get("boardingHouseId") || search.get("facility_id") || search.get("facilityId");
    const rooms = bh ? ROOMS.filter((r) => r.boarding_house_id === bh) : ROOMS;
    return { data: rooms };
  }
  if (p === "/rental/services") return { data: SERVICES };
  if (p === "/wallets") return { data: WALLETS };
  if (p === "/categories") return { data: CATEGORIES };
  if (p === "/rental/contracts") return { data: CONTRACTS };
  if (p.startsWith("/rental/contracts/")) {
    const id = p.split("/").pop();
    return { data: CONTRACTS.find((c) => c.id === id) || null };
  }
  if (p === "/rental/deposits") return { data: DEPOSITS };
  if (p === "/rental/tenants") return { data: TENANTS };
  if (p === "/bank-config") return { data: BANK_CONFIG };

  // Payment channels route handlers
  if (p === "/payment-channels") {
    if (method === "GET") {
      return { data: PAYMENT_CHANNELS };
    }
    if (method === "POST") {
      const newChan = {
        id: `pc_${Date.now()}`,
        displayName: body?.displayName || "Kênh thanh toán mới",
        display_name: body?.displayName || "Kênh thanh toán mới",
        bankName: body?.bankName || "MB Bank",
        accountNo: body?.accountNo || "",
        accountName: body?.accountName || "",
        isDefault: body?.isDefault || false,
        is_default: body?.isDefault || false,
        enabled: true,
      };
      if (newChan.isDefault) {
        PAYMENT_CHANNELS.forEach(c => {
          c.isDefault = false;
          c.is_default = false;
        });
      }
      PAYMENT_CHANNELS.push(newChan);
      return { success: true, data: newChan };
    }
  }

  if (p.startsWith("/payment-channels/")) {
    const id = p.split("/").pop();
    if (method === "PATCH" || method === "PUT") {
      const channel = PAYMENT_CHANNELS.find(c => c.id === id);
      if (channel) {
        Object.assign(channel, body);
        if (body.isDefault) {
          PAYMENT_CHANNELS.forEach(c => {
            if (c.id !== id) {
              c.isDefault = false;
              c.is_default = false;
            } else {
              c.isDefault = true;
              c.is_default = true;
            }
          });
        }
        return { success: true, data: channel };
      }
    }
    if (method === "DELETE") {
      PAYMENT_CHANNELS = PAYMENT_CHANNELS.filter(c => c.id !== id);
      return { success: true };
    }
  }

  if (p === "/owner/settings") return { data: SETTINGS };
  if (p === "/owner/feedback") return { data: [] };
  if (p === "/owner/simulate-upgrade") return { success: true };
  if (p === "/me/profile") return { success: true, user: DEMO_USER, profile: null };
  if (p === "/invoices") {
    const month = Number(search.get("month"));
    const year = Number(search.get("year"));
    let list = INVOICES;
    if (month && year) {
      list = INVOICES.filter((i) => (i.month === month && i.year === year) || (i.paid_amount < i.total_amount && (i.year < year || (i.year === year && i.month < month))));
    }
    return { data: list };
  }
  if (p.startsWith("/invoices/history/")) return { data: [] };
  if (p.startsWith("/invoices/")) {
    const id = p.split("/").pop();
    return { data: INVOICES.find((i) => i.id === id) || null };
  }
  if (p === "/transactions") return { data: TRANSACTIONS };

  // Mutations in demo: acknowledge without persisting.
  if (!isGet) return { data: { ok: true, id: `demo-${Date.now()}` }, demo: true };

  return null;
}
