import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { supabaseAdmin } from "../lib/supabase.js";
import { decryptToken, encryptToken } from "../utils/crypto.js";

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
let invoiceFontCssCache: string | null = null;

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

const loadInvoiceFontCss = async () => {
  if (invoiceFontCssCache) return invoiceFontCssCache;
  const cssParts: string[] = [];
  for (const font of EMBEDDED_FONT_FILES) {
    const candidates = [
      path.resolve(process.cwd(), "assets", "fonts", font.file),
      path.resolve(process.cwd(), "backend", "assets", "fonts", font.file),
    ];
    for (const filePath of candidates) {
      try {
        const base64 = (await readFile(filePath)).toString("base64");
        cssParts.push(`@font-face{font-family:${font.family};font-weight:${font.weight};src:url(data:font/truetype;base64,${base64}) format("truetype");}`);
        break;
      } catch {
        // Try the next runtime path. If none exists, the SVG still falls back to
        // system Unicode fonts, but bundled fonts prevent Vietnamese tofu boxes
        // on minimal Linux hosts.
      }
    }
  }
  invoiceFontCssCache = cssParts.join("");
  return invoiceFontCssCache;
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
  const fontCss = await loadInvoiceFontCss();
  const total = Number(invoice.total_amount || 0);
  const paid = Number(invoice.paid_amount || 0);
  const outstanding = Math.max(0, total - paid);
  const previousDebt = Number(invoice.previous_debt || invoice.previousDebt || 0);
  const currentPayable = Math.max(0, total - previousDebt);
  const qrDataUri = await fetchImageAsDataUri(buildInvoiceQrUrl(bundle));
  const status = paid >= total && total > 0 ? "Đã thanh toán" : paid > 0 ? "Còn thiếu" : "Chưa thanh toán";
  const statusColor = paid >= total && total > 0 ? "#059669" : "#B45309";
  const bankId = String(bundle.paymentChannel?.bank_id || "").trim();
  const bankLabel = BANK_LABELS[bankId] || bankId || "-";
  const accountNo = String(bundle.paymentChannel?.account_no || "").trim();
  const accountName = String(bundle.paymentChannel?.account_name || "").trim();
  const rows = [
    { name: "Phòng", detail: "", amount: Number(invoice.room_fee || 0) },
    ...items.map((item) => ({ name: item.name || "Khoản phí", detail: item.detail || "", amount: Number(item.amount || 0) })),
  ].slice(0, 8);

  const svgWidth = 1000;
  const tableX = 40;
  const tableY = 328;
  const tableW = 920;
  const headerH = 78;
  const rowH = 76;
  const totalH = 76;
  const tableH = headerH + rows.length * rowH + totalH;
  const paymentY = tableY + tableH + 56;
  const footerY = paymentY + 520;
  const svgHeight = Math.max(1280, footerY + 48);

  const itemRows = rows
    .map((item, index) => {
      const y = tableY + headerH + index * rowH;
      const cy = y + 47;
      const detail = oneLine(item.detail || "", 30);
      return `
        <line x1="${tableX}" y1="${y}" x2="${tableX + tableW}" y2="${y}" class="table-line"/>
        <text x="${tableX + 48}" y="${cy}" text-anchor="middle" class="td">${index + 1}</text>
        <text x="${tableX + 172}" y="${cy}" text-anchor="middle" class="td">${escapeXml(oneLine(item.name, 14))}</text>
        <text x="${tableX + 506}" y="${cy}" text-anchor="middle" class="td">${escapeXml(detail)}</text>
        <text x="${tableX + tableW - 18}" y="${cy}" text-anchor="end" class="td strong">${money(item.amount)}</text>
      `;
    })
    .join("");

  const svg = `
    <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="${svgWidth}" height="${svgHeight}" fill="#FFFEFB"/>
      <rect x="1" y="1" width="${svgWidth - 2}" height="${svgHeight - 2}" rx="16" stroke="#111827" stroke-opacity=".12" stroke-width="2"/>
      <style>
        ${fontCss}
        .title{font:800 44px InterEmbed,"DejaVu Sans","Noto Sans",Arial,sans-serif;fill:#111827;letter-spacing:-.7px}
        .label{font:700 32px InterEmbed,"DejaVu Sans","Noto Sans",Arial,sans-serif;fill:#111827}
        .value{font:800 34px InterEmbed,"DejaVu Sans","Noto Sans",Arial,sans-serif;fill:#111827}
        .muted{font:400 34px InterEmbed,"DejaVu Sans","Noto Sans",Arial,sans-serif;fill:#374151}
        .chip{font:800 32px InterEmbed,"DejaVu Sans","Noto Sans",Arial,sans-serif;fill:#166534}
        .status{font:800 34px InterEmbed,"DejaVu Sans","Noto Sans",Arial,sans-serif;fill:${statusColor}}
        .th{font:800 27px InterEmbed,"DejaVu Sans","Noto Sans",Arial,sans-serif;fill:#111827}
        .td{font:400 28px InterEmbed,"DejaVu Sans","Noto Sans",Arial,sans-serif;fill:#111827}
        .strong{font-weight:800}
        .payment-title{font:800 35px InterEmbed,"DejaVu Sans","Noto Sans",Arial,sans-serif;fill:#111827;text-decoration:underline}
        .payment-label{font:400 28px InterEmbed,"DejaVu Sans","Noto Sans",Arial,sans-serif;fill:#111827}
        .payment-value{font:400 28px InterEmbed,"DejaVu Sans","Noto Sans",Arial,sans-serif;fill:#111827}
        .payable{font:800 30px InterEmbed,"DejaVu Sans","Noto Sans",Arial,sans-serif;fill:#111827}
        .bank{font:400 28px InterEmbed,"DejaVu Sans","Noto Sans",Arial,sans-serif;fill:#111827}
        .bank-strong{font:800 28px InterEmbed,"DejaVu Sans","Noto Sans",Arial,sans-serif;fill:#111827}
        .table-line{stroke:#111827;stroke-width:2.2}
      </style>

      <text x="500" y="86" text-anchor="middle" class="title">THÔNG BÁO TIỀN PHÒNG TRỌ T${escapeXml(invoice.month || "")}</text>

      <text x="40" y="164" class="label">Kính gửi:</text>
      <text x="40" y="218" class="value">${escapeXml(oneLine(tenant.name || invoice.tenant_name || "Khách thuê", 22))}</text>
      <text x="510" y="164" class="label">Số điện thoại:</text>
      <text x="510" y="218" class="muted">${escapeXml(tenant.phone || invoice.tenant_phone || "-")}</text>

      <text x="40" y="286" class="label">Ở phòng số:</text>
      <rect x="40" y="304" width="158" height="64" rx="6" fill="#BBF7D0"/>
      <text x="119" y="347" text-anchor="middle" class="chip">${escapeXml(oneLine(room?.name || invoice.room_name || "Phòng", 9))}</text>
      <text x="510" y="286" class="label">Trạng thái:</text>
      <text x="510" y="345" class="status">${status}</text>

      <rect x="${tableX}" y="${tableY}" width="${tableW}" height="${tableH}" fill="#FFFEFB" stroke="#111827" stroke-width="1.4"/>
      <rect x="${tableX}" y="${tableY}" width="${tableW}" height="${headerH}" fill="#F8FAFC"/>
      <line x1="${tableX}" y1="${tableY + headerH}" x2="${tableX + tableW}" y2="${tableY + headerH}" class="table-line"/>
      <line x1="${tableX + 96}" y1="${tableY}" x2="${tableX + 96}" y2="${tableY + tableH}" class="table-line"/>
      <line x1="${tableX + 276}" y1="${tableY}" x2="${tableX + 276}" y2="${tableY + tableH}" class="table-line"/>
      <line x1="${tableX + 690}" y1="${tableY}" x2="${tableX + 690}" y2="${tableY + tableH}" class="table-line"/>
      <text x="${tableX + 48}" y="${tableY + 50}" text-anchor="middle" class="th">STT</text>
      <text x="${tableX + 186}" y="${tableY + 50}" text-anchor="middle" class="th">Khoản</text>
      <text x="${tableX + 483}" y="${tableY + 50}" text-anchor="middle" class="th">Chi tiết</text>
      <text x="${tableX + 805}" y="${tableY + 50}" text-anchor="middle" class="th">Thành Tiền</text>
      ${itemRows}
      <line x1="${tableX}" y1="${tableY + headerH + rows.length * rowH}" x2="${tableX + tableW}" y2="${tableY + headerH + rows.length * rowH}" class="table-line"/>
      <text x="${tableX + 48}" y="${tableY + headerH + rows.length * rowH + 48}" text-anchor="middle" class="td">${rows.length + 1}</text>
      <text x="${tableX + 666}" y="${tableY + headerH + rows.length * rowH + 48}" text-anchor="end" class="td strong">Cộng:</text>
      <text x="${tableX + tableW - 18}" y="${tableY + headerH + rows.length * rowH + 48}" text-anchor="end" class="td strong">${money(total)}</text>

      <text x="40" y="${paymentY}" class="payment-title">Phần Thanh toán:</text>
      <text x="40" y="${paymentY + 58}" class="payment-label">- Số tiền còn nợ</text>
      <text x="40" y="${paymentY + 92}" class="payment-label">  tháng trước:</text>
      <text x="560" y="${paymentY + 92}" text-anchor="end" class="payment-value">${money(previousDebt)}</text>
      <text x="40" y="${paymentY + 136}" class="payment-label">- Phải trả tháng này:</text>
      <text x="560" y="${paymentY + 136}" text-anchor="end" class="payment-value">${money(currentPayable)}</text>
      <text x="40" y="${paymentY + 180}" class="payment-label">- Trả cọc:</text>
      <text x="560" y="${paymentY + 180}" text-anchor="end" class="payment-value">0 đ</text>
      <text x="40" y="${paymentY + 234}" class="payable">Thành tiền phải trả:</text>
      <text x="560" y="${paymentY + 234}" text-anchor="end" class="payable">${money(outstanding)}</text>

      <text x="40" y="${paymentY + 318}" class="bank">Mã QR Code: <tspan class="bank-strong">${escapeXml(invoice.payment_code || "-")}</tspan></text>
      <text x="40" y="${paymentY + 366}" class="bank">Ngân hàng: <tspan class="bank-strong">${escapeXml(bankLabel)}</tspan></text>
      <text x="40" y="${paymentY + 414}" class="bank">Số tài khoản: <tspan class="bank-strong">${escapeXml(accountNo || "-")}</tspan></text>
      <text x="40" y="${paymentY + 462}" class="bank">Người thụ hưởng: <tspan class="bank-strong">${escapeXml(oneLine(accountName || "-", 25))}</tspan></text>

      <rect x="680" y="${paymentY + 18}" width="260" height="260" fill="#FFFFFF" stroke="#E5E7EB"/>
      ${qrDataUri ? `<image href="${qrDataUri}" x="695" y="${paymentY + 33}" width="230" height="230" />` : `<text x="810" y="${paymentY + 158}" text-anchor="middle" class="muted">Chưa có QR</text>`}
    </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

function buildMessage(bundle: InvoiceBundle) {
  const { invoice, tenant, room } = bundle;
  const outstanding = Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
  return [
    `TrọCare gửi hóa đơn phòng ${room?.name || invoice.room_name || ""} kỳ T${invoice.month}/${invoice.year}.`,
    `Khách thuê: ${tenant.name || "Anh/chị"}`,
    `Tổng cần thanh toán: ${money(outstanding || invoice.total_amount)}`,
    invoice.payment_code ? `Mã thanh toán: ${invoice.payment_code}` : "",
  ].filter(Boolean).join("\n");
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
        msg: buildMessage(bundle),
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
