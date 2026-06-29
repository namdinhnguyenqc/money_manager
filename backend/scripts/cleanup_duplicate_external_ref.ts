/**
 * Cleanup duplicate auto-reconciled payment transactions.
 *
 * Before the idempotency guard + UNIQUE(user_id, external_ref) index were added,
 * a retried SePay webhook could create the SAME payment twice — double-crediting
 * the wallet and over-counting invoice.paid_amount. This script finds those
 * duplicates and, for each group, keeps the earliest transaction and reverses
 * the extras (wallet balance + invoice paid_amount/status), then deletes them.
 *
 * Run it BEFORE applying migration 20260630_unique_transaction_external_ref.sql,
 * otherwise the UNIQUE index creation will fail on existing duplicates.
 *
 *   Dry run (default, no writes):   npx tsx scripts/cleanup_duplicate_external_ref.ts
 *   Apply changes:                  npx tsx scripts/cleanup_duplicate_external_ref.ts --apply
 */
import { supabaseAdmin } from "../src/lib/supabase.js";

const APPLY = process.argv.includes("--apply");

type Tx = {
  id: string;
  user_id: string;
  external_ref: string;
  wallet_id: string | null;
  amount: number;
  type: string;
  invoice_id: string | null;
  metadata: any;
  created_at: string;
};

async function main() {
  console.log(`\n=== Cleanup duplicate external_ref transactions (${APPLY ? "APPLY" : "DRY RUN"}) ===\n`);

  // 1. Pull all transactions that carry an external reference.
  const { data: txs, error } = await supabaseAdmin
    .from("transactions")
    .select("id,user_id,external_ref,wallet_id,amount,type,invoice_id,metadata,created_at")
    .not("external_ref", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load transactions:", error.message);
    process.exit(1);
  }

  // 2. Group by (user_id, external_ref).
  const groups = new Map<string, Tx[]>();
  for (const tx of (txs as Tx[]) || []) {
    const key = `${tx.user_id}::${tx.external_ref}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(tx);
  }

  const dupGroups = [...groups.values()].filter((g) => g.length > 1);

  if (dupGroups.length === 0) {
    console.log("✅ No duplicates found. Safe to apply the UNIQUE index migration.\n");
    return;
  }

  console.log(`Found ${dupGroups.length} duplicated reference group(s):\n`);

  let totalToRemove = 0;
  for (const group of dupGroups) {
    // Keep the earliest (already sorted asc by created_at); reverse the rest.
    const [keep, ...extras] = group;
    console.log(`• ref=${keep.external_ref} user=${keep.user_id}`);
    console.log(`  keep   ${keep.id} (${keep.created_at})`);
    for (const dup of extras) {
      totalToRemove++;
      console.log(`  remove ${dup.id} amount=${dup.amount} wallet=${dup.wallet_id} invoice=${dup.invoice_id}`);

      if (!APPLY) continue;

      // 2a. Reverse the wallet credit (these are income payments).
      if (dup.wallet_id && dup.type === "income") {
        const { data: wallet } = await supabaseAdmin
          .from("wallets")
          .select("balance")
          .eq("id", dup.wallet_id)
          .maybeSingle();
        if (wallet) {
          const newBalance = Number(wallet.balance || 0) - Number(dup.amount || 0);
          await supabaseAdmin
            .from("wallets")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("id", dup.wallet_id);
        }
      }

      // 2b. Reverse the invoice paid_amount / status.
      if (dup.invoice_id) {
        const allocated = Number(dup.metadata?.allocated_amount ?? dup.amount ?? 0);
        const { data: inv } = await supabaseAdmin
          .from("invoices")
          .select("total_amount,paid_amount,transaction_id")
          .eq("id", dup.invoice_id)
          .eq("user_id", dup.user_id)
          .maybeSingle();
        if (inv) {
          const nextPaid = Math.max(0, Number(inv.paid_amount || 0) - allocated);
          const total = Number(inv.total_amount || 0);
          const nextStatus = nextPaid <= 0 ? "unpaid" : nextPaid >= total ? "paid" : "partial";
          await supabaseAdmin
            .from("invoices")
            .update({
              paid_amount: nextPaid,
              status: nextStatus,
              // If the invoice pointed at the duplicate, re-link to the kept one.
              transaction_id: inv.transaction_id === dup.id ? keep.id : inv.transaction_id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", dup.invoice_id)
            .eq("user_id", dup.user_id);
        }
      }

      // 2c. Delete the duplicate transaction.
      await supabaseAdmin.from("transactions").delete().eq("id", dup.id);
    }
    console.log("");
  }

  console.log(
    APPLY
      ? `✅ Removed ${totalToRemove} duplicate transaction(s) and reversed their effects.`
      : `ℹ️  ${totalToRemove} duplicate transaction(s) would be removed. Re-run with --apply to execute.`
  );
  console.log("");
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
