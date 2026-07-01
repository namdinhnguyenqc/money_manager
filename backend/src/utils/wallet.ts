import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cập nhật số dư ví dựa trên giao dịch mới
 * @param db Supabase Client
 * @param walletId ID của ví
 * @param amount Số tiền (luôn là số dương)
 * @param type Loại giao dịch: 'income' (thu) hoặc 'expense' (chi)
 */
export async function updateWalletBalance(
  db: SupabaseClient,
  walletId: string | number,
  amount: number,
  type: 'income' | 'expense'
) {
  try {
    const isIncome = type === 'income';
    const { error } = await db.rpc('adjust_wallet_balance', {
      wallet_id: walletId,
      amount: amount,
      is_income: isIncome
    });

    if (error) {
      console.error(`[Wallet] Lỗi rpc adjust_wallet_balance cho ví ${walletId}:`, error.message);
      console.warn(`[Wallet] Thử cập nhật không atomic làm phương án dự phòng...`);
      await fallbackUpdateWalletBalance(db, walletId, amount, type);
    } else {
      console.log(`[Wallet] Đã cập nhật atomic số dư ví ${walletId} (${type} ${amount})`);
    }
  } catch (err) {
    console.error(`[Wallet] Lỗi hệ thống khi cập nhật số dư ví ${walletId}:`, err);
  }
}

async function fallbackUpdateWalletBalance(
  db: SupabaseClient,
  walletId: string | number,
  amount: number,
  type: 'income' | 'expense'
) {
  const { data: wallet, error: fetchError } = await db
    .from('wallets')
    .select('balance')
    .eq('id', walletId)
    .single();

  if (fetchError || !wallet) {
    console.error(`[Wallet] Fallback: Không tìm thấy ví ${walletId}:`, fetchError?.message);
    return;
  }

  const currentBalance = Number(wallet.balance || 0);
  const newBalance = type === 'income' ? currentBalance + amount : currentBalance - amount;

  const { error: updateError } = await db
    .from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', walletId);

  if (updateError) {
    console.error(`[Wallet] Fallback: Lỗi cập nhật số dư ví ${walletId}:`, updateError.message);
  } else {
    console.log(`[Wallet] Fallback: Đã cập nhật số dư ví ${walletId}: ${currentBalance} -> ${newBalance}`);
  }
}
