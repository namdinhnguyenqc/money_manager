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
  const qrDataUri = await fetchImageAsDataUri(buildInvoiceQrUrl(bundle));
  const rows = [
    { name: "Tiền phòng", detail: "", amount: Number(invoice.room_fee || 0) },
    ...items.map((item) => ({ name: item.name || "Khoản phí", detail: item.detail || "", amount: Number(item.amount || 0) })),
  ].slice(0, 9);

  const itemRows = rows
    .map((item, index) => {
      const y = 468 + index * 72;
      const detail = textLines(item.detail || item.name, 46);
      return `
        <text x="90" y="${y}" class="row-index">${index + 1}</text>
        <text x="150" y="${y}" class="row-title">${escapeXml(item.name)}</text>
        ${detail.map((line, i) => `<text x="150" y="${y + 26 + i * 22}" class="row-detail">${escapeXml(line)}</text>`).join("")}
        <text x="990" y="${y}" text-anchor="end" class="row-money">${money(item.amount)}</text>
        <line x1="72" y1="${y + 42}" x2="1008" y2="${y + 42}" stroke="#E2E8F0" stroke-width="2" />
      `;
    })
    .join("");

  const svg = `
    <svg width="1080" height="1500" viewBox="0 0 1080 1500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="1080" height="1500" fill="#F8FAFC"/>
      <rect x="48" y="48" width="984" height="1404" rx="28" fill="#FFFFFF"/>
      <rect x="48" y="48" width="984" height="1404" rx="28" stroke="#CBD5E1" stroke-width="2"/>
      <style>
        .brand{font:800 34px Inter,Arial,sans-serif;fill:#2563EB}
        .muted{font:600 24px Inter,Arial,sans-serif;fill:#64748B}
        .title{font:900 44px Inter,Arial,sans-serif;fill:#0F172A}
        .label{font:700 24px Inter,Arial,sans-serif;fill:#64748B}
        .value{font:800 30px Inter,Arial,sans-serif;fill:#0F172A}
        .row-index{font:800 24px Inter,Arial,sans-serif;fill:#64748B}
        .row-title{font:800 28px Inter,Arial,sans-serif;fill:#0F172A}
        .row-detail{font:600 21px Inter,Arial,sans-serif;fill:#64748B}
        .row-money{font:900 28px Inter,Arial,sans-serif;fill:#0F172A}
        .total-label{font:800 26px Inter,Arial,sans-serif;fill:#475569}
        .total-money{font:900 44px Inter,Arial,sans-serif;fill:#2563EB}
        .small{font:600 21px Inter,Arial,sans-serif;fill:#64748B}
      </style>
      <text x="86" y="118" class="brand">TrọCare</text>
      <text x="994" y="118" text-anchor="end" class="muted">Hóa đơn #${escapeXml(String(invoice.id).slice(0, 8))}</text>
      <text x="86" y="192" class="title">Hóa đơn tiền phòng T${invoice.month}/${invoice.year}</text>
      <rect x="86" y="238" width="908" height="128" rx="18" fill="#F8FAFC" stroke="#E2E8F0"/>
      <text x="118" y="292" class="label">Khách thuê</text>
      <text x="118" y="334" class="value">${escapeXml(tenant.name || "Khách thuê")}</text>
      <text x="520" y="292" class="label">Phòng</text>
      <text x="520" y="334" class="value">${escapeXml(room?.name || invoice.room_name || "-")}</text>
      <text x="760" y="292" class="label">SĐT</text>
      <text x="760" y="334" class="value">${escapeXml(tenant.phone || "-")}</text>

      <text x="86" y="424" class="label">Chi tiết khoản thu</text>
      ${itemRows}

      <rect x="86" y="1130" width="908" height="190" rx="18" fill="#EEF6FF" stroke="#BFDBFE"/>
      <text x="126" y="1192" class="total-label">Tổng hóa đơn</text>
      <text x="954" y="1192" text-anchor="end" class="total-money">${money(total)}</text>
      <text x="126" y="1246" class="total-label">Đã thu</text>
      <text x="954" y="1246" text-anchor="end" class="row-money">${money(paid)}</text>
      <text x="126" y="1300" class="total-label">Còn phải thanh toán</text>
      <text x="954" y="1300" text-anchor="end" class="total-money">${money(outstanding)}</text>

      <rect x="86" y="1348" width="908" height="72" rx="16" fill="#F8FAFC" stroke="#E2E8F0"/>
      <text x="118" y="1393" class="small">Mã thanh toán: ${escapeXml(invoice.payment_code || "-")}</text>
      ${qrDataUri ? `<image href="${qrDataUri}" x="806" y="1328" width="156" height="156" />` : ""}
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
