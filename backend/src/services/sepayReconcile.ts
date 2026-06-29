import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve the SePay payment channel (with a linked wallet + auto-reconcile enabled)
 * for a given invoice. Falls back to matching by the inbound bank account number.
 *
 * Shared by the webhook handler and the manual reprocess endpoint so the two
 * paths never drift apart.
 */
export async function resolveSepayChannel(
  db: SupabaseClient,
  params: { invoice: any; accountNumber?: string | null }
): Promise<any | null> {
  const { invoice, accountNumber } = params;

  let channel: any = null;
  if (invoice.payment_channel_id) {
    const channelRes = await db
      .from("payment_channels")
      .select("*")
      .eq("id", invoice.payment_channel_id)
      .eq("user_id", invoice.user_id)
      .maybeSingle();
    channel = channelRes.data;
  }

  const usable = (ch: any) => ch?.wallet_id && ch.auto_reconcile_enabled !== false;

  if (!usable(channel) && accountNumber) {
    const channelRes = await db
      .from("payment_channels")
      .select("*")
      .eq("user_id", invoice.user_id)
      .eq("provider", "sepay")
      .eq("account_no", accountNumber)
      .eq("enabled", true)
      .limit(1)
      .maybeSingle();
    if (usable(channelRes.data)) {
      channel = channelRes.data;
    }
  }

  return usable(channel) ? channel : null;
}
