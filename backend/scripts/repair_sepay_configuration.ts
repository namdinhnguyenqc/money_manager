import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const normalize = (value: unknown) => String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

const { data: rows, error } = await db
  .from("payment_channels")
  .select("*")
  .eq("provider", "sepay")
  .order("updated_at", { ascending: false });

if (error) throw error;

const channels = rows || [];
const activeGroups = new Map<string, any[]>();
for (const channel of channels) {
  if (channel.enabled === false || !channel.account_no) continue;
  const key = `${channel.user_id}:${normalize(channel.bank_id)}:${normalize(channel.account_no)}`;
  activeGroups.set(key, [...(activeGroups.get(key) || []), channel]);
}

const duplicates: Array<{ duplicate: any; keeper: any }> = [];
for (const group of activeGroups.values()) {
  const sorted = [...group].sort((a, b) => {
    if (Boolean(a.is_default) !== Boolean(b.is_default)) return a.is_default ? -1 : 1;
    return String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at));
  });
  for (const duplicate of sorted.slice(1)) duplicates.push({ duplicate, keeper: sorted[0] });
}

const activeByOwner = new Map<string, any[]>();
for (const channel of channels) {
  if (channel.enabled === false || !channel.wallet_id) continue;
  if (duplicates.some(({ duplicate }) => duplicate.id === channel.id)) continue;
  activeByOwner.set(channel.user_id, [...(activeByOwner.get(channel.user_id) || []), channel]);
}

let normalizedCount = 0;
let invoiceRelinkCount = 0;
let channelUpdateCount = 0;

if (apply) {
  for (const channel of channels) {
    const bankId = normalize(channel.bank_id);
    const accountNo = normalize(channel.account_no);
    if (bankId !== channel.bank_id || accountNo !== channel.account_no) {
      const { error: updateError } = await db.from("payment_channels").update({
        bank_id: bankId || null,
        account_no: accountNo || null,
        updated_at: new Date().toISOString(),
      }).eq("id", channel.id);
      if (updateError) throw updateError;
      normalizedCount += 1;
    }
  }

  for (const { duplicate, keeper } of duplicates) {
    const { data: relinked, error: invoiceError } = await db.from("invoices")
      .update({ payment_channel_id: keeper.id, updated_at: new Date().toISOString() })
      .eq("payment_channel_id", duplicate.id)
      .select("id");
    if (invoiceError) throw invoiceError;
    invoiceRelinkCount += relinked?.length || 0;

    const { error: duplicateError } = await db.from("payment_channels").update({
      enabled: false,
      is_default: false,
      updated_at: new Date().toISOString(),
    }).eq("id", duplicate.id);
    if (duplicateError) throw duplicateError;
    channelUpdateCount += 1;
  }

  for (const [userId, ownerChannels] of activeByOwner) {
    const sorted = [...ownerChannels].sort((a, b) => {
      if (Boolean(a.is_default) !== Boolean(b.is_default)) return a.is_default ? -1 : 1;
      return String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at));
    });
    const keeper = sorted[0];
    for (const channel of sorted) {
      const { error: channelError } = await db.from("payment_channels").update({
        is_default: channel.id === keeper.id,
        auto_reconcile_enabled: true,
        updated_at: new Date().toISOString(),
      }).eq("id", channel.id);
      if (channelError) throw channelError;
      channelUpdateCount += 1;
    }

    const { data: repairedInvoices, error: invoiceError } = await db.from("invoices")
      .update({ payment_channel_id: keeper.id, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .not("payment_code", "is", null)
      .is("payment_channel_id", null)
      .select("id");
    if (invoiceError) throw invoiceError;
    invoiceRelinkCount += repairedInvoices?.length || 0;
  }
}

console.log(JSON.stringify({
  mode: apply ? "applied" : "dry-run",
  sepayChannels: channels.length,
  ownersWithReadyChannel: activeByOwner.size,
  duplicateChannels: duplicates.length,
  normalizedCount,
  channelUpdateCount,
  invoiceRelinkCount,
}, null, 2));
