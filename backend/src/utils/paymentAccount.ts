// The one place that decides which bank account an invoice is paid into and
// builds its VietQR. The owner invoice screen, the printed receipt, the tenant
// app and Zalo messages all read the result, so they always agree.
//
// Accounts are looked up in this order:
//   1. the invoice's own payment channel, while it is enabled and has an account
//   2. the owner's default enabled channel with an account
//   3. the legacy single bank config ("bank_config")
//   4. the static account typed in Settings → Payment (system_settings)
// There is no hard-coded fallback: with nothing configured, no QR is shown.

type Db = { from: (table: string) => any };

export type PaymentAccount = {
  source: "channel" | "bank_config" | "settings";
  channelId: string | null;
  provider: string | null;
  displayName: string | null;
  bankId: string;
  accountNo: string;
  accountName: string;
  /** The owner's uploaded QR image, used only when no account can be built into a QR. */
  staticQrUrl: string | null;
};

export type InvoicePayment = {
  account: PaymentAccount | null;
  /** Left to pay; 0 for a paid invoice or one whose remainder moved to a later bill. */
  amount: number;
  /** Transfer content; SePay matches payments to the invoice by this code. */
  content: string;
  /** VietQR with the amount and code filled in; null when nothing is left to pay or no account is set. */
  qrUrl: string | null;
};

const clean = (value: unknown) => String(value ?? "").replace(/\s/g, "");

export const invoiceRemaining = (invoice: { total_amount?: unknown; paid_amount?: unknown }) =>
  Math.max(0, Math.round(Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)));

export function vietQrUrl(input: { bankId: string; accountNo: string; accountName?: string | null; amount: number; content: string }) {
  const params = new URLSearchParams({ amount: String(Math.round(input.amount)), addInfo: input.content });
  if (input.accountName) params.set("accountName", input.accountName);
  return `https://img.vietqr.io/image/${clean(input.bankId)}-${clean(input.accountNo)}-compact2.png?${params.toString()}`;
}

const fromChannel = (channel: any): PaymentAccount | null =>
  channel && channel.enabled !== false && clean(channel.bank_id) && clean(channel.account_no)
    ? {
        source: "channel",
        channelId: String(channel.id),
        provider: channel.provider ?? null,
        displayName: channel.display_name ?? null,
        bankId: clean(channel.bank_id),
        accountNo: clean(channel.account_no),
        accountName: String(channel.account_name || "").trim(),
        staticQrUrl: null,
      }
    : null;

/** Resolves the account for an invoice (see the order at the top of this file). */
export async function resolvePaymentAccount(db: Db, userId: string, channelId?: string | null): Promise<PaymentAccount | null> {
  const [ownRes, defaultRes, bankRes, settingsRes] = await Promise.all([
    channelId
      ? db.from("payment_channels").select("*").eq("id", channelId).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from("payment_channels")
      .select("*")
      .eq("user_id", userId)
      .eq("enabled", true)
      .not("bank_id", "is", null)
      .not("account_no", "is", null)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    db.from("bank_config").select("bank_name,account_number,account_name,qr_template").eq("user_id", userId).limit(1).maybeSingle(),
    db
      .from("system_settings")
      .select("key,value")
      .eq("user_id", userId)
      .in("key", ["static_bank_name", "static_bank_account_number", "static_bank_account_name", "bank_qr_static_url"]),
  ]);

  const settings: Record<string, string> = {};
  for (const row of settingsRes?.data ?? []) settings[row.key] = String(row.value ?? "");
  const staticQrUrl = bankRes?.data?.qr_template || settings.bank_qr_static_url || null;

  const channelAccount = fromChannel(ownRes?.data) ?? fromChannel(defaultRes?.data);
  if (channelAccount) return channelAccount;

  const bank = bankRes?.data;
  if (bank && clean(bank.bank_name) && clean(bank.account_number)) {
    return {
      source: "bank_config",
      channelId: null,
      provider: "bank_transfer",
      displayName: null,
      bankId: clean(bank.bank_name),
      accountNo: clean(bank.account_number),
      accountName: String(bank.account_name || "").trim(),
      staticQrUrl,
    };
  }

  if (clean(settings.static_bank_name) && clean(settings.static_bank_account_number)) {
    return {
      source: "settings",
      channelId: null,
      provider: "bank_transfer",
      displayName: null,
      bankId: clean(settings.static_bank_name),
      accountNo: clean(settings.static_bank_account_number),
      accountName: String(settings.static_bank_account_name || "").trim(),
      staticQrUrl,
    };
  }

  return staticQrUrl
    ? { source: "settings", channelId: null, provider: null, displayName: null, bankId: "", accountNo: "", accountName: "", staticQrUrl }
    : null;
}

export function buildInvoicePayment(
  invoice: { total_amount?: unknown; paid_amount?: unknown; payment_code?: unknown },
  account: PaymentAccount | null,
): InvoicePayment {
  const amount = invoiceRemaining(invoice);
  const content = String(invoice.payment_code || "").trim();
  const canBuild = Boolean(account?.bankId && account?.accountNo && content);
  return {
    account,
    amount,
    content,
    qrUrl: amount > 0 && canBuild
      ? vietQrUrl({ bankId: account!.bankId, accountNo: account!.accountNo, accountName: account!.accountName, amount, content })
      : null,
  };
}

/** The account fields safe to show anyone who can see the invoice (tenants included). */
export function publicAccountFields(account: PaymentAccount | null) {
  if (!account) return null;
  return {
    id: account.channelId,
    provider: account.provider,
    displayName: account.displayName,
    display_name: account.displayName,
    bankId: account.bankId,
    bank_id: account.bankId,
    accountNo: account.accountNo,
    account_no: account.accountNo,
    accountName: account.accountName,
    account_name: account.accountName,
  };
}
