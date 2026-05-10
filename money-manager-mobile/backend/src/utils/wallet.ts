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
    // Lấy số dư hiện tại
    const { data: wallet, error: fetchError } = await db
      .from('wallets')
      .select('balance')
      .eq('id', walletId)
      .single();

    if (fetchError || !wallet) {
      console.error(`[Wallet] Không tìm thấy ví ${walletId}:`, fetchError?.message);
      return;
    }

    const currentBalance = Number(wallet.balance || 0);
    const newBalance = type === 'income' 
      ? currentBalance + amount 
      : currentBalance - amount;

    // Cập nhật số dư mới
    const { error: updateError } = await db
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', walletId);

    if (updateError) {
      console.error(`[Wallet] Lỗi cập nhật số dư ví ${walletId}:`, updateError.message);
    } else {
      console.log(`[Wallet] Đã cập nhật số dư ví ${walletId}: ${currentBalance} -> ${newBalance}`);
    }
  } catch (err) {
    console.error(`[Wallet] Lỗi hệ thống khi cập nhật số dư:`, err);
  }
}
