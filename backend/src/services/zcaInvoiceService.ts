import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import sharp from "sharp";
import { supabaseAdmin } from "../lib/supabase.js";
import { decryptToken, encryptToken } from "../utils/crypto.js";

const require = createRequire(import.meta.url);
const TextToSVG = require("text-to-svg");

const ZCA_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0";

type LoginStatus = "pending" | "qr_ready" | "scanned" | "connected" | "expired" | "declined" | "failed";

type PendingLogin = {
  ownerId: string;
  status: LoginStatus;
  qrImage?: string;
  scannedName?: string;
  scannedAvatar?: string;
  accountName?: string;
  accountAvatar?: string;
  error?: string;
  createdAt: string;
  expiresAt: string;
};

type InvoiceBundle = {
  invoice: any;
  tenant: any;
  room: any;
  items: any[];
  paymentChannel: any | null;
};

export type ZcaBulkInvoiceItem = {
  invoiceId: string;
  invoiceCode?: string | null;
  roomName?: string | null;
  tenantName?: string | null;
  phone?: string | null;
  reason?: string;
};

export type ZcaBulkInvoiceResult = {
  selected: number;
  sent: ZcaBulkInvoiceItem[];
  paidSkipped: ZcaBulkInvoiceItem[];
  missingPhone: ZcaBulkInvoiceItem[];
  zaloNotFound: ZcaBulkInvoiceItem[];
  failed: ZcaBulkInvoiceItem[];
};

export type ZcaBulkJobStatus = "queued" | "running" | "completed" | "failed";

export type ZcaBulkInvoiceJob = {
  id: string;
  ownerId: string;
  status: ZcaBulkJobStatus;
  total: number;
  processed: number;
  currentInvoiceId?: string | null;
  currentLabel?: string | null;
  error?: string | null;
  summary: ZcaBulkInvoiceResult;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

type ZcaCredentials = {
  cookie: any[];
  imei: string;
  userAgent: string;
  language?: string;
};

type ZcaApi = {
  findUser: (phoneNumber: string) => Promise<any>;
  sendMessage: (message: any, threadId: string, type?: number) => Promise<any>;
};

type ZcaLoginEvent = {
  type: number;
  data: any;
};

const loginSessions = new Map<string, PendingLogin>();
const apiCache = new Map<string, { api: ZcaApi; cachedAt: number }>();
const bulkJobs = new Map<string, ZcaBulkInvoiceJob>();
const BANK_LABELS: Record<string, string> = {
  "970416": "ACB",
  ACB: "ACB",
  "970436": "Vietcombank",
  "970418": "BIDV",
  "970422": "MB Bank",
  "970407": "Techcombank",
  "970415": "VietinBank",
  "970423": "TPBank",
};
const EMBEDDED_FONT_FILES = [
  { family: "InterEmbed", weight: 400, file: "Inter_400Regular.ttf" },
  { family: "InterEmbed", weight: 600, file: "Inter_600SemiBold.ttf" },
  { family: "InterEmbed", weight: 700, file: "Inter_700Bold.ttf" },
  { family: "InterEmbed", weight: 800, file: "Inter_800ExtraBold.ttf" },
];
const vectorFontCache = new Map<number, any>();

const isMissingSchemaError = (error: any) =>
  ["PGRST205", "42P01", "42703"].includes(String(error?.code || "")) ||
  /Could not find the table|schema cache|does not exist|column .* does not exist/i.test(String(error?.message || ""));

async function loadZcaModule() {
  return await import("zca-js" as any) as any;
}

const imageMetadataGetter = async (filePath: string) => {
  const data = await readFile(filePath);
  const metadata = await sharp(data).metadata();
  return {
    height: metadata.height || 0,
    width: metadata.width || 0,
    size: metadata.size || data.length,
  };
};

const createZalo = () =>
  loadZcaModule().then((mod) =>
    new mod.Zalo({
      imageMetadataGetter,
      logging: false,
      checkUpdate: false,
    }),
  );

const cleanPhone = (value: string) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length === 11) return `0${digits.slice(2)}`;
  return digits;
};

const escapeXml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (value: unknown) =>
  `${new Intl.NumberFormat("vi-VN").format(Math.round(Number(value || 0)))} đ`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_ZALO_INVOICE_MESSAGE =
  "Chào {tenant_name}, TrọCare gửi hóa đơn phòng {room_name} T{month}/{year}.\n" +
  "Số tiền cần thanh toán: {total_amount}.\n" +
  "Hạn thanh toán: {due_date}.\n" +
  "Mã chuyển khoản: {payment_code}.\n" +
  "Vui lòng quét QR trong ảnh để thanh toán. Cảm ơn anh/chị.";

const DEFAULT_ZALO_REMINDER_MESSAGE =
  "Chào {tenant_name}, hóa đơn phòng {room_name} {reminder_status}.\n" +
  "Số tiền còn lại: {amount_due}.\n" +
  "Hạn thanh toán: {due_date}.\n" +
  "Mã chuyển khoản: {payment_code}.\n" +
  "Nếu đã thanh toán, vui lòng bỏ qua tin này. Cảm ơn anh/chị.";

const formatDateVi = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return "Chưa đặt hạn";
  const date = new Date(`${raw.slice(0, 10)}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const fillTemplate = (template: string, values: Record<string, unknown>) =>
  template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => String(values[key] ?? match));

async function getOwnerSettingValue(ownerId: string, key: string) {
  const { data, error } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("user_id", ownerId)
    .eq("key", key)
    .maybeSingle();
  if (error && !isMissingSchemaError(error)) console.warn(`[settings] Unable to load ${key}:`, error.message);
  return typeof data?.value === "string" && data.value.trim() ? data.value : null;
}

const textLines = (value: unknown, max = 36) => {
  const words = String(value || "").split(/\s+/).filter(Boolean);
  const rows: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      rows.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) rows.push(current);
  return rows.slice(0, 2);
};

const oneLine = (value: unknown, max = 28) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
};

const resolveInvoiceFontPath = (file: string) => {
  const candidates = [
    path.resolve(process.cwd(), "assets", "fonts", file),
    path.resolve(process.cwd(), "backend", "assets", "fonts", file),
  ];
  for (const filePath of candidates) {
    try {
      require("node:fs").accessSync(filePath);
      return filePath;
    } catch {
      // Try next candidate.
    }
  }
  return candidates[0];
};

const getVectorFont = (weight: number) => {
  const normalized = weight >= 800 ? 800 : weight >= 700 ? 700 : weight >= 600 ? 600 : 400;
  const cached = vectorFontCache.get(normalized);
  if (cached) return cached;
  const file = EMBEDDED_FONT_FILES.find((font) => font.weight === normalized)?.file || "Inter_400Regular.ttf";
  let font: any;
  try {
    font = TextToSVG.loadSync(resolveInvoiceFontPath(file));
  } catch (error) {
    console.warn(`[zca-invoice-image] Font ${file} is unavailable; falling back to bundled default font.`, error);
    font = TextToSVG.loadSync();
  }
  vectorFontCache.set(normalized, font);
  return font;
};

const vectorText = (
  value: unknown,
  x: number,
  y: number,
  options: {
    size: number;
    weight?: number;
    fill?: string;
    anchor?: "left top" | "center top" | "right top";
    max?: number;
  },
) => {
  const text = options.max ? oneLine(value, options.max) : String(value ?? "");
  if (!text) return "";
  return getVectorFont(options.weight || 400).getPath(text, {
    x,
    y,
    fontSize: options.size,
    anchor: options.anchor || "left top",
    attributes: { fill: options.fill || "#111827" },
  });
};

async function getStoredCredentials(ownerId: string): Promise<ZcaCredentials | null> {
  const { data, error } = await supabaseAdmin
    .from("zca_sessions")
    .select("credentials_encrypted,status")
    .eq("owner_id", ownerId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (error || !data?.credentials_encrypted) return null;
  const raw = decryptToken(data.credentials_encrypted);
  if (!raw) return null;
  return JSON.parse(raw) as ZcaCredentials;
}

async function saveCredentials(ownerId: string, credentials: ZcaCredentials, account?: { name?: string; avatar?: string }) {
  const encrypted = encryptToken(JSON.stringify(credentials));
  const { error } = await supabaseAdmin.from("zca_sessions").upsert(
    {
      owner_id: ownerId,
      credentials_encrypted: encrypted,
      display_name: account?.name || null,
      avatar_url: account?.avatar || null,
      status: "ACTIVE",
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id" },
  );
  if (error) {
    if (isMissingSchemaError(error)) {
      console.warn("[zca] zca_sessions table is not ready; keeping Zalo session in memory only.");
      return false;
    }
    throw new Error(error.message);
  }
  return true;
}

export async function getZcaStatus(ownerId: string) {
  const pending = [...loginSessions.entries()]
    .filter(([, session]) => session.ownerId === ownerId)
    .sort((a, b) => b[1].createdAt.localeCompare(a[1].createdAt))[0];

  const cached = apiCache.get(ownerId);
  const { data, error } = await supabaseAdmin
    .from("zca_sessions")
    .select("display_name,avatar_url,status,connected_at,updated_at,last_error")
    .eq("owner_id", ownerId)
    .maybeSingle();
  const storedAvailable = !error || !isMissingSchemaError(error);

  return {
    connected: data?.status === "ACTIVE" || Boolean(cached),
    account: data
      ? {
          name: data.display_name,
          avatar: data.avatar_url,
          connectedAt: data.connected_at,
          updatedAt: data.updated_at,
          lastError: data.last_error,
        }
      : cached
        ? {
            name: pending?.[1]?.accountName || null,
            avatar: pending?.[1]?.accountAvatar || null,
            connectedAt: new Date(cached.cachedAt).toISOString(),
            updatedAt: new Date(cached.cachedAt).toISOString(),
            lastError: storedAvailable ? null : "Phiên Zalo đang chạy tạm trong bộ nhớ. Cần apply migration để lưu bền vững.",
          }
        : null,
    login: pending
      ? {
          sessionId: pending[0],
          status: pending[1].status,
          qrImage: pending[1].qrImage,
          scannedName: pending[1].scannedName,
          scannedAvatar: pending[1].scannedAvatar,
          error: pending[1].error,
          expiresAt: pending[1].expiresAt,
        }
      : null,
  };
}

export function startZcaQrLogin(ownerId: string) {
  const sessionId = randomUUID();
  const session: PendingLogin = {
    ownerId,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 100_000).toISOString(),
  };
  loginSessions.set(sessionId, session);

  createZalo()
    .then((zalo) => zalo.loginQR({ userAgent: ZCA_USER_AGENT, language: "vi" }, async (event: ZcaLoginEvent) => {
      const current = loginSessions.get(sessionId);
      if (!current) return;

      if (event.type === 0) {
        current.status = "qr_ready";
        current.qrImage = `data:image/png;base64,${event.data.image}`;
        current.expiresAt = new Date(Date.now() + 100_000).toISOString();
      }

      if (event.type === 2) {
        current.status = "scanned";
        current.scannedName = event.data.display_name;
        current.scannedAvatar = event.data.avatar;
      }

      if (event.type === 1) {
        current.status = "expired";
      }

      if (event.type === 3) {
        current.status = "declined";
      }

      if (event.type === 4) {
        const account = {
          name: current.scannedName,
          avatar: current.scannedAvatar,
        };
        await saveCredentials(ownerId, {
          cookie: event.data.cookie,
          imei: event.data.imei,
          userAgent: event.data.userAgent,
          language: "vi",
        }, account);
        current.status = "connected";
        current.accountName = account.name;
        current.accountAvatar = account.avatar;
      }
    }))
    .then((api) => {
      apiCache.set(ownerId, { api, cachedAt: Date.now() });
    })
    .catch((error: any) => {
      const current = loginSessions.get(sessionId);
      if (current && !["expired", "declined"].includes(current.status)) {
        current.status = "failed";
        current.error = error?.message || "Không đăng nhập Zalo được.";
      }
    });

  return { sessionId, status: session.status };
}

export function getZcaLoginSession(ownerId: string, sessionId: string) {
  const session = loginSessions.get(sessionId);
  if (!session || session.ownerId !== ownerId) return null;
  return session;
}

export async function disconnectZca(ownerId: string) {
  apiCache.delete(ownerId);
  for (const [id, session] of loginSessions.entries()) {
    if (session.ownerId === ownerId) loginSessions.delete(id);
  }
  const { error } = await supabaseAdmin.from("zca_sessions").delete().eq("owner_id", ownerId);
  if (error && !isMissingSchemaError(error)) throw new Error(error.message);
}

async function getApi(ownerId: string) {
  const cached = apiCache.get(ownerId);
  if (cached && Date.now() - cached.cachedAt < 30 * 60_000) return cached.api;

  const credentials = await getStoredCredentials(ownerId);
  if (!credentials) {
    throw new Error("Chưa kết nối Zalo. Vào Cài đặt > Cấu hình Zalo để quét QR trước.");
  }

  const api = await (await createZalo()).login(credentials);
  apiCache.set(ownerId, { api, cachedAt: Date.now() });
  return api;
}

async function loadInvoiceBundle(ownerId: string, invoiceId: string): Promise<InvoiceBundle> {
  const db = supabaseAdmin;
  const { data: invoice, error: invoiceError } = await db
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("user_id", ownerId)
    .maybeSingle();
  if (invoiceError || !invoice) throw new Error("Không tìm thấy hóa đơn.");

  const [itemsRes, roomRes, contractRes, channelRes] = await Promise.all([
    db.from("invoice_items").select("*").eq("invoice_id", invoiceId).eq("user_id", ownerId),
    db.from("rooms").select("*").eq("id", invoice.room_id).eq("user_id", ownerId).maybeSingle(),
    db.from("contracts").select("*").eq("id", invoice.contract_id).eq("user_id", ownerId).maybeSingle(),
    invoice.payment_channel_id
      ? db.from("payment_channels").select("*").eq("id", invoice.payment_channel_id).eq("user_id", ownerId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (itemsRes.error) throw new Error(itemsRes.error.message);
  if (roomRes.error) throw new Error(roomRes.error.message);
  if (contractRes.error || !contractRes.data) throw new Error("Không tìm thấy hợp đồng của hóa đơn.");

  const { data: tenant, error: tenantError } = await db
    .from("tenants")
    .select("*")
    .eq("id", contractRes.data.tenant_id)
    .eq("user_id", ownerId)
    .maybeSingle();
  if (tenantError || !tenant) throw new Error("Không tìm thấy khách thuê của hóa đơn.");

  return {
    invoice,
    tenant,
    room: roomRes.data,
    items: itemsRes.data || [],
    paymentChannel: channelRes.data || null,
  };
}

const getInvoiceOutstanding = (invoice: any) =>
  Math.max(0, Math.round(Number(invoice?.total_amount || 0)) - Math.round(Number(invoice?.paid_amount || 0)));

const bundleToBulkItem = (bundle: InvoiceBundle, extra: Partial<ZcaBulkInvoiceItem> = {}): ZcaBulkInvoiceItem => ({
  invoiceId: bundle.invoice.id,
  invoiceCode: bundle.invoice.payment_code || String(bundle.invoice.id || "").slice(0, 8),
  roomName: bundle.room?.name || bundle.invoice.room_name || null,
  tenantName: bundle.tenant?.name || bundle.invoice.tenant_name || null,
  phone: cleanPhone(extra.phone || bundle.tenant?.phone || ""),
  ...extra,
});

const pushFailedByError = (summary: ZcaBulkInvoiceResult, bundle: InvoiceBundle, error: any, phone?: string) => {
  const message = error?.message || "Không gửi được hóa đơn qua Zalo.";
  const item = bundleToBulkItem(bundle, { phone: phone || bundle.tenant?.phone || null, reason: message });
  if (/không tìm thấy tài khoản zalo/i.test(message)) {
    summary.zaloNotFound.push(item);
    return;
  }
  if (/số điện thoại|10 chữ số|chưa cấu hình số điện thoại/i.test(message)) {
    summary.missingPhone.push(item);
    return;
  }
  summary.failed.push(item);
};

const createEmptyBulkSummary = (selected: number): ZcaBulkInvoiceResult => ({
  selected,
  sent: [],
  paidSkipped: [],
  missingPhone: [],
  zaloNotFound: [],
  failed: [],
});

const cloneBulkJob = (job: ZcaBulkInvoiceJob): ZcaBulkInvoiceJob => ({
  ...job,
  summary: {
    selected: job.summary.selected,
    sent: [...job.summary.sent],
    paidSkipped: [...job.summary.paidSkipped],
    missingPhone: [...job.summary.missingPhone],
    zaloNotFound: [...job.summary.zaloNotFound],
    failed: [...job.summary.failed],
  },
});

const cleanupOldBulkJobs = () => {
  const cutoff = Date.now() - 60 * 60_000;
  for (const [id, job] of bulkJobs.entries()) {
    if (new Date(job.updatedAt).getTime() < cutoff) bulkJobs.delete(id);
  }
};

const runBulkJob = async (jobId: string, invoiceIds: string[], phonesMap: Record<string, string>) => {
  const job = bulkJobs.get(jobId);
  if (!job) return;
  job.status = "running";
  job.updatedAt = new Date().toISOString();

  for (const invoiceId of invoiceIds) {
    let bundle: InvoiceBundle | null = null;
    try {
      bundle = await loadInvoiceBundle(job.ownerId, invoiceId);
      const phone = cleanPhone(phonesMap[invoiceId] || bundle.tenant.phone || "");
      job.currentInvoiceId = invoiceId;
      job.currentLabel = `${bundle.room?.name || bundle.invoice.room_name || "Phòng"} · ${bundle.tenant?.name || bundle.invoice.tenant_name || "Khách thuê"}`;
      job.updatedAt = new Date().toISOString();

      if (getInvoiceOutstanding(bundle.invoice) <= 0) {
        job.summary.paidSkipped.push(bundleToBulkItem(bundle, { phone, reason: "Hóa đơn đã thanh toán." }));
        continue;
      }

      if (!/^0\d{9}$/.test(phone)) {
        job.summary.missingPhone.push(bundleToBulkItem(bundle, { phone, reason: "Khách thuê chưa có SĐT hợp lệ." }));
        continue;
      }

      await sendInvoiceImageViaZca(job.ownerId, invoiceId, phone);
      job.summary.sent.push(bundleToBulkItem(bundle, { phone }));
      await sleep(850);
    } catch (error: any) {
      if (bundle) {
        pushFailedByError(job.summary, bundle, error, phonesMap[invoiceId]);
      } else {
        job.summary.failed.push({ invoiceId, reason: error?.message || "Không xử lý được hóa đơn." });
      }
    } finally {
      job.processed += 1;
      job.updatedAt = new Date().toISOString();
    }
  }

  job.status = "completed";
  job.currentInvoiceId = null;
  job.currentLabel = null;
  job.completedAt = new Date().toISOString();
  job.updatedAt = job.completedAt;
};

async function fetchImageAsDataUri(url: string) {
  if (!url) return "";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return "";
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return "";
  }
}

function buildInvoiceQrUrl(bundle: InvoiceBundle) {
  const invoice = bundle.invoice;
  const channel = bundle.paymentChannel;
  const bankId = String(channel?.bank_id || "").replace(/\s/g, "");
  const accountNo = String(channel?.account_no || "").replace(/\s/g, "");
  const paymentCode = invoice.payment_code || "";
  const remaining = Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
  if (!bankId || !accountNo || !paymentCode) return "";
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${Math.round(remaining || Number(invoice.total_amount || 0))}&addInfo=${encodeURIComponent(paymentCode)}`;
}

async function renderInvoicePng(bundle: InvoiceBundle, outputPath: string) {
  const { invoice, tenant, room, items } = bundle;
  const total = Number(invoice.total_amount || 0);
  const paid = Number(invoice.paid_amount || 0);
  const outstanding = Math.max(0, total - paid);
  const previousDebt = Number(invoice.previous_debt || invoice.previousDebt || 0);
  const currentPayable = Math.max(0, total - previousDebt);
  const qrDataUri = await fetchImageAsDataUri(buildInvoiceQrUrl(bundle));
  const status = paid >= total && total > 0 ? "Đã thanh toán" : paid > 0 ? "Còn thiếu" : "Chưa thanh toán";
  const statusColor = paid >= total && total > 0 ? "#047857" : paid > 0 ? "#B45309" : "#DC2626";
  const bankId = String(bundle.paymentChannel?.bank_id || "").trim();
  const bankLabel = BANK_LABELS[bankId] || bankId || "-";
  const accountNo = String(bundle.paymentChannel?.account_no || "").trim();
  const accountName = String(bundle.paymentChannel?.account_name || "").trim();
  const rows = [
    { name: "Phòng", detail: "", amount: Number(invoice.room_fee || 0) },
    ...items.map((item) => ({ name: item.name || "Khoản phí", detail: item.detail || "", amount: Number(item.amount || 0) })),
  ].slice(0, 8);

  const svgWidth = 1200;
  const tableX = 40;
  const tableY = 340;
  const tableW = 1120;
  const sttW = 64;
  const itemW = 145;
  const amountW = 170;
  const detailW = tableW - sttW - itemW - amountW;
  const headerH = 54;
  const rowH = 52;
  const totalH = 54;
  const tableH = headerH + rows.length * rowH + totalH;
  const paymentY = tableY + tableH + 40;
  const footerY = paymentY + 520;
  const svgHeight = Math.max(1220, footerY + 48);
  const accountNameLines = textLines(accountName || "-", 28);

  const itemRows = rows
    .map((item, index) => {
      const y = tableY + headerH + index * rowH;
      const detail = oneLine(item.detail || "", 48);
      return `
        <line x1="${tableX}" y1="${y}" x2="${tableX + tableW}" y2="${y}" class="table-line"/>
        ${vectorText(index + 1, tableX + sttW / 2, y + 16, { size: 19, weight: 500, anchor: "center top" })}
        ${vectorText(item.name, tableX + sttW + 12, y + 16, { size: 19, weight: 500, max: 14 })}
        ${vectorText(detail, tableX + sttW + itemW + 14, y + 16, { size: 19, weight: 500, fill: "#64748B" })}
        ${vectorText(money(item.amount), tableX + tableW - 18, y + 16, { size: 19, weight: 800, anchor: "right top" })}
      `;
    })
    .join("");

  const accountNamePath = accountNameLines
    .map((line, index) => vectorText(line, index === 0 ? 244 : 229, paymentY + 404 + index * 28, { size: 18, weight: 800 }))
    .join("");
  const qrFallback = vectorText("Chưa có QR", 920, paymentY + 228, { size: 24, weight: 500, fill: "#334155", anchor: "center top" });

  const svg = `
    <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="${svgWidth}" height="${svgHeight}" fill="#FFFEFB"/>
      <rect x="6" y="6" width="${svgWidth - 12}" height="${svgHeight - 12}" rx="28" stroke="#CBD5E1" stroke-width="2"/>
      <line x1="6" y1="132" x2="${svgWidth - 6}" y2="132" stroke="#E2E8F0" stroke-width="1"/>
      <style>
        .table-line{stroke:#111827;stroke-width:1.25}
      </style>

      ${vectorText("TROCARE", 600, 32, { size: 22, weight: 800, fill: "#94A3B8", anchor: "center top" })}
      ${vectorText(`THÔNG BÁO TIỀN PHÒNG TRỌ T${invoice.month || ""}/${invoice.year || ""}`, 600, 62, { size: 31, weight: 800, anchor: "center top" })}

      ${vectorText("Kính gửi:", 40, 164, { size: 20, weight: 700, fill: "#334155" })}
      ${vectorText(tenant.name || invoice.tenant_name || "Khách thuê", 40, 194, { size: 25, weight: 800, max: 26 })}
      ${vectorText("Số điện thoại:", 620, 164, { size: 20, weight: 700, fill: "#334155" })}
      ${vectorText(tenant.phone || invoice.tenant_phone || "-", 620, 194, { size: 24, weight: 500, fill: "#334155" })}

      ${vectorText("Ở phòng số:", 40, 252, { size: 20, weight: 700, fill: "#334155" })}
      <rect x="40" y="286" width="76" height="34" rx="4" fill="#D1FAE5"/>
      ${vectorText(room?.name || invoice.room_name || "Phòng", 78, 292, { size: 22, weight: 800, fill: "#047857", anchor: "center top", max: 8 })}
      ${vectorText("Trạng thái:", 620, 252, { size: 20, weight: 700, fill: "#334155" })}
      ${vectorText(status, 620, 286, { size: 25, weight: 800, fill: statusColor })}

      <rect x="${tableX}" y="${tableY}" width="${tableW}" height="${tableH}" fill="#FFFEFB" stroke="#111827" stroke-width="1.4"/>
      <rect x="${tableX}" y="${tableY}" width="${tableW}" height="${headerH}" fill="#F8FAFC"/>
      <line x1="${tableX}" y1="${tableY + headerH}" x2="${tableX + tableW}" y2="${tableY + headerH}" class="table-line"/>
      <line x1="${tableX + sttW}" y1="${tableY}" x2="${tableX + sttW}" y2="${tableY + tableH}" class="table-line"/>
      <line x1="${tableX + sttW + itemW}" y1="${tableY}" x2="${tableX + sttW + itemW}" y2="${tableY + tableH}" class="table-line"/>
      <line x1="${tableX + sttW + itemW + detailW}" y1="${tableY}" x2="${tableX + sttW + itemW + detailW}" y2="${tableY + tableH}" class="table-line"/>
      ${vectorText("STT", tableX + sttW / 2, tableY + 18, { size: 19, weight: 800, anchor: "center top" })}
      ${vectorText("KHOẢN", tableX + sttW + 12, tableY + 18, { size: 19, weight: 800 })}
      ${vectorText("CHI TIẾT", tableX + sttW + itemW + 12, tableY + 18, { size: 19, weight: 800 })}
      ${vectorText("THÀNH TIỀN", tableX + tableW - 22, tableY + 18, { size: 19, weight: 800, anchor: "right top" })}
      ${itemRows}
      <line x1="${tableX}" y1="${tableY + headerH + rows.length * rowH}" x2="${tableX + tableW}" y2="${tableY + headerH + rows.length * rowH}" class="table-line"/>
      ${vectorText(rows.length + 1, tableX + sttW / 2, tableY + headerH + rows.length * rowH + 17, { size: 19, weight: 500, anchor: "center top" })}
      ${vectorText("Cộng:", tableX + sttW + itemW + 12, tableY + headerH + rows.length * rowH + 17, { size: 19, weight: 800 })}
      ${vectorText(money(total), tableX + tableW - 18, tableY + headerH + rows.length * rowH + 17, { size: 19, weight: 800, anchor: "right top" })}

      ${vectorText("Phần Thanh toán:", 40, paymentY, { size: 20, weight: 800 })}
      <line x1="40" y1="${paymentY + 27}" x2="219" y2="${paymentY + 27}" stroke="#111827" stroke-width="1.5"/>
      ${vectorText("- Số tiền còn nợ tháng trước:", 40, paymentY + 42, { size: 19, weight: 500, fill: "#334155" })}
      ${vectorText(money(previousDebt), 640, paymentY + 42, { size: 19, weight: 700, anchor: "right top" })}
      ${vectorText("- Phải trả tháng này:", 40, paymentY + 80, { size: 19, weight: 500, fill: "#334155" })}
      ${vectorText(money(currentPayable), 640, paymentY + 80, { size: 19, weight: 700, anchor: "right top" })}
      ${vectorText("- Trả cọc:", 40, paymentY + 118, { size: 19, weight: 500, fill: "#334155" })}
      ${vectorText("0 đ", 640, paymentY + 118, { size: 19, weight: 700, anchor: "right top" })}
      <line x1="40" y1="${paymentY + 158}" x2="640" y2="${paymentY + 158}" stroke="#CBD5E1" stroke-width="1"/>
      ${vectorText("Thành tiền phải trả:", 40, paymentY + 178, { size: 21, weight: 800 })}
      ${vectorText(money(outstanding), 640, paymentY + 178, { size: 21, weight: 800, anchor: "right top" })}

      <rect x="40" y="${paymentY + 226}" width="610" height="220" rx="14" fill="#FFFFFF" stroke="#CBD5E1"/>
      ${vectorText("Mã QR Code:", 62, paymentY + 258, { size: 18, weight: 600, fill: "#64748B" })}
      ${vectorText(invoice.payment_code || "-", 184, paymentY + 258, { size: 18, weight: 800, max: 22 })}
      <rect x="586" y="${paymentY + 252}" width="38" height="38" rx="7" fill="#F8FAFC" stroke="#CBD5E1"/>
      <path d="M598 ${paymentY + 263}h14v14h-14z M603 ${paymentY + 258}h14v14" fill="none" stroke="#94A3B8" stroke-width="1.8"/>
      ${vectorText("Ngân hàng:", 62, paymentY + 306, { size: 18, weight: 600, fill: "#64748B" })}
      ${vectorText(bankLabel, 165, paymentY + 306, { size: 18, weight: 800, max: 20 })}
      ${vectorText("Số tài khoản:", 62, paymentY + 354, { size: 18, weight: 600, fill: "#64748B" })}
      ${vectorText(accountNo || "-", 188, paymentY + 354, { size: 18, weight: 800, max: 22 })}
      <rect x="586" y="${paymentY + 348}" width="38" height="38" rx="7" fill="#F8FAFC" stroke="#CBD5E1"/>
      <path d="M598 ${paymentY + 359}h14v14h-14z M603 ${paymentY + 354}h14v14" fill="none" stroke="#94A3B8" stroke-width="1.8"/>
      ${vectorText("Người thụ hưởng:", 62, paymentY + 402, { size: 18, weight: 600, fill: "#64748B" })}
      ${accountNamePath}

      <rect x="680" y="${paymentY}" width="480" height="480" rx="14" fill="#FFFFFF" stroke="#CBD5E1"/>
      ${qrDataUri ? `<image href="${qrDataUri}" x="720" y="${paymentY + 25}" width="400" height="400" />` : qrFallback}
      ${vectorText("Quét để thanh toán", 920, paymentY + 492, { size: 17, weight: 500, fill: "#94A3B8", anchor: "center top" })}
    </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

async function buildMessage(bundle: InvoiceBundle) {
  const { invoice, tenant, room } = bundle;
  const outstanding = Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
  const template = await getOwnerSettingValue(bundle.invoice.user_id || "", "zalo_invoice_template") || DEFAULT_ZALO_INVOICE_MESSAGE;
  return fillTemplate(template, {
    tenant_name: tenant.name || invoice.tenant_name || "anh/chị",
    room_name: room?.name || invoice.room_name || "phòng thuê",
    month: invoice.month || "",
    year: invoice.year || "",
    room_amount: money(invoice.room_fee || 0),
    service_amount: money(Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.room_fee || 0))),
    total_amount: money(outstanding || invoice.total_amount),
    amount_due: money(outstanding || invoice.total_amount),
    payment_code: invoice.payment_code || "Chưa có",
    due_date: formatDateVi(invoice.due_date),
    invoice_url: invoice.public_url || "",
  });
}

async function buildReminderMessage(bundle: InvoiceBundle) {
  const { invoice, tenant, room } = bundle;
  const outstanding = getInvoiceOutstanding(invoice);
  const dueDate = String(invoice.due_date || "").slice(0, 10);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const daysUntilDue = dueDate
    ? Math.round((Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
    : null;
  const reminderStatus = daysUntilDue == null
    ? "chưa được thanh toán"
    : daysUntilDue > 0
      ? `sắp đến hạn sau ${daysUntilDue} ngày`
      : daysUntilDue === 0
        ? "đến hạn thanh toán hôm nay"
        : `đã quá hạn ${Math.abs(daysUntilDue)} ngày`;
  const template = await getOwnerSettingValue(bundle.invoice.user_id || "", "zalo_reminder_template") || DEFAULT_ZALO_REMINDER_MESSAGE;

  return fillTemplate(template, {
    tenant_name: tenant.name || invoice.tenant_name || "anh/chị",
    room_name: room?.name || invoice.room_name || "phòng thuê",
    reminder_status: reminderStatus,
    amount_due: money(outstanding),
    total_amount: money(outstanding),
    due_date: formatDateVi(invoice.due_date),
    payment_code: invoice.payment_code || "Chưa có",
  });
}

export async function renderInvoiceImageBuffer(ownerId: string, invoiceId: string) {
  const bundle = await loadInvoiceBundle(ownerId, invoiceId);
  const folder = await mkdtemp(path.join(tmpdir(), "trocare-invoice-image-"));
  const imagePath = path.join(folder, `hoa-don-${invoiceId}.png`);
  try {
    await renderInvoicePng(bundle, imagePath);
    return await readFile(imagePath);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

export function startInvoicesBulkZcaJob(ownerId: string, invoiceIds: string[], phonesMap: Record<string, string> = {}) {
  cleanupOldBulkJobs();
  const uniqueInvoiceIds = [...new Set(invoiceIds.filter(Boolean))];
  const job: ZcaBulkInvoiceJob = {
    id: randomUUID(),
    ownerId,
    status: "queued",
    total: uniqueInvoiceIds.length,
    processed: 0,
    currentInvoiceId: null,
    currentLabel: null,
    error: null,
    summary: createEmptyBulkSummary(uniqueInvoiceIds.length),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };
  bulkJobs.set(job.id, job);

  queueMicrotask(() => {
    runBulkJob(job.id, uniqueInvoiceIds, phonesMap).catch((error: any) => {
      const failedJob = bulkJobs.get(job.id);
      if (!failedJob) return;
      failedJob.status = "failed";
      failedJob.error = error?.message || "Không gửi được hóa đơn qua Zalo.";
      failedJob.updatedAt = new Date().toISOString();
      failedJob.completedAt = failedJob.updatedAt;
    });
  });

  return cloneBulkJob(job);
}

export function getInvoicesBulkZcaJob(ownerId: string, jobId: string) {
  const job = bulkJobs.get(jobId);
  if (!job || job.ownerId !== ownerId) return null;
  return cloneBulkJob(job);
}

export async function sendInvoiceImageViaZca(ownerId: string, invoiceId: string, phoneOverride?: string) {
  const bundle = await loadInvoiceBundle(ownerId, invoiceId);
  const phone = cleanPhone(phoneOverride || bundle.tenant.phone || "");
  if (!/^0\d{9}$/.test(phone)) {
    throw new Error("Số điện thoại khách thuê phải là số Việt Nam 10 chữ số.");
  }

  const api = await getApi(ownerId);
  const user = await api.findUser(phone);
  if (!user?.uid) {
    throw new Error("Không tìm thấy tài khoản Zalo tương ứng với số điện thoại khách thuê.");
  }

  const folder = await mkdtemp(path.join(tmpdir(), "trocare-zalo-"));
  const imagePath = path.join(folder, `hoa-don-${invoiceId}.png`);

  const logBase = {
    invoice_id: invoiceId,
    tenant_id: ownerId,
    recipient_tenant_id: bundle.tenant.id,
    phone_number: phone,
    template_id: "zca_invoice_image_v1",
    message_payload: { uid: user.uid, displayName: user.display_name || user.zalo_name || null },
    send_status: "PENDING",
    retry_count: 0,
    message_type: "invoice_image",
  };

  const { data: log, error: logError } = await supabaseAdmin
    .from("invoice_zalo_notifications")
    .insert(logBase)
    .select("id")
    .maybeSingle();
  if (logError && !isMissingSchemaError(logError)) throw new Error(logError.message);

  try {
    await renderInvoicePng(bundle, imagePath);
    const result = await api.sendMessage(
      {
        msg: await buildMessage(bundle),
        attachments: [imagePath],
      },
      user.uid,
      0,
    );

    if (log?.id) {
      const { error: updateLogError } = await supabaseAdmin
        .from("invoice_zalo_notifications")
        .update({
          send_status: "SENT",
          zalo_message_id: String(result.message?.msgId || result.attachment?.[0]?.msgId || ""),
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", log.id);
      if (updateLogError && !isMissingSchemaError(updateLogError)) console.warn("[zca] Could not update Zalo notification log:", updateLogError.message);
    }

    return {
      success: true,
      recipient: {
        uid: user.uid,
        name: user.display_name || user.zalo_name || "",
        phone,
      },
    };
  } catch (error: any) {
    if (log?.id) {
      const { error: updateLogError } = await supabaseAdmin
        .from("invoice_zalo_notifications")
        .update({
          send_status: "FAILED",
          error_message: error?.message || "Không gửi được ảnh hóa đơn qua Zalo.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", log.id);
      if (updateLogError && !isMissingSchemaError(updateLogError)) console.warn("[zca] Could not update failed Zalo notification log:", updateLogError.message);
    }
    throw error;
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

/** Sends only a payment reminder text. Invoice delivery remains a separate PNG flow. */
export async function sendPaymentReminderViaZca(ownerId: string, invoiceId: string, phoneOverride?: string) {
  const bundle = await loadInvoiceBundle(ownerId, invoiceId);
  const outstanding = getInvoiceOutstanding(bundle.invoice);
  if (outstanding <= 0) throw new Error("Hóa đơn đã thanh toán, không cần nhắc nợ.");

  const phone = cleanPhone(phoneOverride || bundle.tenant.phone || "");
  if (!/^0\d{9}$/.test(phone)) {
    throw new Error("Số điện thoại khách thuê phải là số Việt Nam 10 chữ số.");
  }

  const api = await getApi(ownerId);
  const user = await api.findUser(phone);
  if (!user?.uid) throw new Error("Không tìm thấy tài khoản Zalo tương ứng với số điện thoại khách thuê.");

  const logBase = {
    invoice_id: invoiceId,
    tenant_id: ownerId,
    recipient_tenant_id: bundle.tenant.id,
    phone_number: phone,
    template_id: "zca_payment_reminder_v1",
    message_payload: { uid: user.uid, displayName: user.display_name || user.zalo_name || null, amountDue: outstanding },
    send_status: "PENDING",
    retry_count: 0,
    message_type: "payment_reminder_manual",
  };
  const { data: log, error: logError } = await supabaseAdmin
    .from("invoice_zalo_notifications")
    .insert(logBase)
    .select("id")
    .maybeSingle();
  if (logError && !isMissingSchemaError(logError)) throw new Error(logError.message);

  try {
    const result = await api.sendMessage({ msg: await buildReminderMessage(bundle) }, user.uid, 0);
    if (log?.id) {
      const { error } = await supabaseAdmin.from("invoice_zalo_notifications").update({
        send_status: "SENT",
        zalo_message_id: String(result.message?.msgId || ""),
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", log.id);
      if (error && !isMissingSchemaError(error)) console.warn("[zca] Could not update Zalo reminder log:", error.message);
    }
    return { success: true, recipient: { uid: user.uid, name: user.display_name || user.zalo_name || "", phone } };
  } catch (error: any) {
    if (log?.id) {
      const { error: updateError } = await supabaseAdmin.from("invoice_zalo_notifications").update({
        send_status: "FAILED",
        error_message: error?.message || "Không gửi được nhắc nợ qua Zalo.",
        updated_at: new Date().toISOString(),
      }).eq("id", log.id);
      if (updateError && !isMissingSchemaError(updateError)) console.warn("[zca] Could not update failed Zalo reminder log:", updateError.message);
    }
    throw error;
  }
}

export async function sendInvoicesBulkViaZca(ownerId: string, invoiceIds: string[], phonesMap: Record<string, string> = {}) {
  const uniqueInvoiceIds = [...new Set(invoiceIds.filter(Boolean))];
  const summary: ZcaBulkInvoiceResult = {
    selected: uniqueInvoiceIds.length,
    sent: [],
    paidSkipped: [],
    missingPhone: [],
    zaloNotFound: [],
    failed: [],
  };

  for (const invoiceId of uniqueInvoiceIds) {
    let bundle: InvoiceBundle | null = null;
    try {
      bundle = await loadInvoiceBundle(ownerId, invoiceId);
      const phone = cleanPhone(phonesMap[invoiceId] || bundle.tenant.phone || "");

      if (getInvoiceOutstanding(bundle.invoice) <= 0) {
        summary.paidSkipped.push(bundleToBulkItem(bundle, { phone, reason: "Hóa đơn đã thanh toán." }));
        continue;
      }

      if (!/^0\d{9}$/.test(phone)) {
        summary.missingPhone.push(bundleToBulkItem(bundle, { phone, reason: "Khách thuê chưa có SĐT hợp lệ." }));
        continue;
      }

      await sendInvoiceImageViaZca(ownerId, invoiceId, phone);
      summary.sent.push(bundleToBulkItem(bundle, { phone }));
      await sleep(650);
    } catch (error: any) {
      if (bundle) {
        pushFailedByError(summary, bundle, error, phonesMap[invoiceId]);
      } else {
        summary.failed.push({ invoiceId, reason: error?.message || "Không xử lý được hóa đơn." });
      }
    }
  }

  return summary;
}
